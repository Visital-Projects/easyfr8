import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import ExcelJS from 'exceljs';
import { Readable } from 'stream';

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const isErrorReport = searchParams.get('error_report') === 'true';
    const isPreview = searchParams.get('preview') === 'true';
    const isCommit = searchParams.get('commit') === 'true';

    // 1. Handle Error/Import Report Generation
    if (isErrorReport) {
      const body = await req.json();
      const { errors } = body;

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Import Report');

      sheet.columns = [
        { header: 'Row Number', key: 'row', width: 15 },
        { header: 'Container ID', key: 'container_id', width: 25 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Reason', key: 'reason', width: 50 }
      ];

      // Format Header Row
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF0000' } // Red background
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
      headerRow.height = 26;

      if (Array.isArray(errors)) {
        errors.forEach(err => {
          sheet.addRow({
            row: err.row,
            container_id: err.container_id || 'N/A',
            status: err.status || 'failed',
            reason: err.reason
          });
        });
      }

      // Left align all data rows
      for (let r = 2; r <= (errors?.length || 0) + 1; r++) {
        sheet.getRow(r).alignment = { vertical: 'middle', horizontal: 'left' };
      }

      const buffer = await workbook.xlsx.writeBuffer();
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="Import_Report.xlsx"'
        }
      });
    }

    // 2. Parse Multipart File Upload
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded.' }, { status: 400 });
    }

    // Max 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File size exceeds 10 MB limit.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();

    if (file.name.endsWith('.csv')) {
      const stream = new Readable();
      stream._read = () => {};
      stream.push(buffer as any);
      stream.push(null);
      await workbook.csv.read(stream);
    } else {
      await workbook.xlsx.load(buffer as any);
    }

    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) {
      return NextResponse.json({ success: false, error: 'The uploaded file is empty or missing headers.' }, { status: 400 });
    }

    // Query existing Container IDs from DB
    const pool = getPool();
    const [existingContainers]: any = await pool.query('SELECT id FROM containers');
    const dbCodes = new Set(existingContainers.map((c: any) => c.id.toLowerCase().trim()));

    const seenInFile = new Set<string>();
    const rows: any[] = [];
    const errors: any[] = [];

    let totalRows = 0;
    let validCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;

    sheet.eachRow((row, rowNumber) => {
      // Skip Header Row
      if (rowNumber === 1) return;

      const getVal = (col: number) => {
        const val = row.getCell(col).value;
        if (val === null || val === undefined) return '';
        if (typeof val === 'object' && 'text' in val) return String(val.text).trim();
        return String(val).trim();
      };

      const containerIdRaw = getVal(1);
      const containerNameRaw = getVal(2);
      const descriptionRaw = getVal(3);
      const sizeRaw = getVal(4);
      const statusRaw = getVal(5);

      // Check if row is completely blank
      if (!containerIdRaw && !containerNameRaw && !descriptionRaw && !sizeRaw && !statusRaw) {
        skippedCount++;
        return;
      }

      totalRows++;

      const container_id = containerIdRaw.toLowerCase().trim();
      const container_name = containerNameRaw;
      const description = descriptionRaw;
      
      // Standardize size
      let size = sizeRaw.toLowerCase().trim();
      if (size === '20ft' || size === '20 ft' || size === '20') size = '20ft';
      else if (size === '40ft' || size === '40 ft' || size === '40') size = '40ft';
      else if (size === '45ft' || size === '45 ft' || size === '45') size = '45ft';

      let status = statusRaw.toLowerCase().trim() === 'active' ? 'active' : statusRaw.toLowerCase().trim() === 'inactive' ? 'inactive' : '';

      const rowReasons: string[] = [];

      // Validations
      if (!containerIdRaw) {
        rowReasons.push('Container ID is required');
      } else if (containerIdRaw.length > 64) {
        rowReasons.push('Container ID cannot exceed 64 characters');
      }

      if (!containerNameRaw) {
        rowReasons.push('Container Name is required');
      }

      const validSizes = ['20ft', '40ft', '45ft'];
      if (!sizeRaw) {
        rowReasons.push('Size is required');
      } else if (!validSizes.includes(size)) {
        rowReasons.push('Size must be one of: 20ft, 40ft, 45ft');
      }

      if (!statusRaw) {
        rowReasons.push('Status is required');
      } else if (status !== 'active' && status !== 'inactive') {
        rowReasons.push('Status must be one of: active, inactive');
      }

      let rowStatus: 'valid' | 'invalid' | 'duplicate' = 'valid';

      if (rowReasons.length > 0) {
        rowStatus = 'invalid';
        invalidCount++;
        errors.push({ row: rowNumber, container_id: containerIdRaw, status: 'failed', reason: rowReasons.join(', ') });
      } else if (seenInFile.has(container_id)) {
        rowStatus = 'duplicate';
        duplicateCount++;
        rowReasons.push('Duplicate Container ID inside the uploaded file');
        errors.push({ row: rowNumber, container_id: containerIdRaw, status: 'skipped', reason: 'Duplicate Container ID inside uploaded file' });
      } else if (dbCodes.has(container_id)) {
        rowStatus = 'duplicate';
        duplicateCount++;
        rowReasons.push('Container ID already exists in database');
        errors.push({ row: rowNumber, container_id: containerIdRaw, status: 'skipped', reason: 'Container ID already exists in database' });
      } else {
        validCount++;
        seenInFile.add(container_id);
      }

      rows.push({
        rowNumber,
        container_id: containerIdRaw, // Preserve original casing for visual display
        name: container_name,
        description,
        size,
        status,
        rowStatus,
        reason: rowReasons.join(', ')
      });
    });

    // 3. Commit Mode — write valid rows to the database
    if (isCommit) {
      const validRows = rows.filter(r => r.rowStatus === 'valid');
      if (validRows.length > 0) {
        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();

          for (const r of validRows) {
            await connection.query(
              'INSERT INTO containers (id, name, description, size, status) VALUES (?, ?, ?, ?, ?)',
              [r.container_id, r.name, r.description, r.size, r.status]
            );
          }

          await connection.commit();
        } catch (txnError: any) {
          await connection.rollback();
          throw txnError;
        } finally {
          connection.release();
        }
      }

      return NextResponse.json({
        success: true,
        summary: {
          totalRows,
          imported: validRows.length,
          skipped: skippedCount,
          duplicates: duplicateCount,
          failed: invalidCount
        },
        errors
      });
    }

    // 4. Preview Mode — return rows validation summary
    return NextResponse.json({
      success: true,
      summary: {
        totalRows,
        validRows: validCount,
        invalidRows: invalidCount,
        duplicateRows: duplicateCount,
        skippedRows: skippedCount
      },
      rows,
      errors
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
