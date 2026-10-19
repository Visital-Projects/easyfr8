import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import { authenticateRequest } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const auth = authenticateRequest(req, ['Administrator', 'Manager']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const isErrorReport = searchParams.get('error_report') === 'true';
    const isPreview = searchParams.get('preview') === 'true';
    const isCommit = searchParams.get('commit') === 'true';

    // 1. Handle Error Report Generation
    if (isErrorReport) {
      const body = await req.json();
      const { errors } = body;

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Error Report');

      sheet.columns = [
        { header: 'Row Number', key: 'row', width: 15 },
        { header: 'Port Code', key: 'port_code', width: 20 },
        { header: 'Failure Reason', key: 'reason', width: 50 }
      ];

      // Format Header Row
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF0000' } // Red background
      };

      if (Array.isArray(errors)) {
        errors.forEach(err => {
          sheet.addRow({
            row: err.row,
            port_code: err.port_code || 'N/A',
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
          'Content-Disposition': 'attachment; filename="Import_Error_Report.xlsx"'
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

    // Query existing Port Codes from DB to prevent duplicate key violations
    const pool = getPool();
    const [existingPorts]: any = await pool.query('SELECT port_code FROM ports');
    const dbCodes = new Set(existingPorts.map((p: any) => p.port_code.toUpperCase().trim()));

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

      const portCodeRaw = getVal(1);
      const portNameRaw = getVal(2);
      const countryRaw = getVal(3);
      const freightTypeRaw = getVal(4);
      const statusRaw = getVal(5);

      // Check if row is completely blank
      if (!portCodeRaw && !portNameRaw && !countryRaw && !freightTypeRaw && !statusRaw) {
        skippedCount++;
        return;
      }

      totalRows++;

      const port_code = portCodeRaw.toUpperCase();
      const port_name = portNameRaw;
      const country = countryRaw;
      
      // Standardize values
      let freight_type = freightTypeRaw;
      if (freightTypeRaw) {
        const normalizedFT = freightTypeRaw.toLowerCase();
        if (normalizedFT === 'ocean') freight_type = 'Ocean';
        else if (normalizedFT === 'air') freight_type = 'Air';
        else if (normalizedFT === 'road') freight_type = 'Road';
        else if (normalizedFT === 'rail') freight_type = 'Rail';
      }

      let status = statusRaw.toLowerCase() === 'active' ? 'active' : statusRaw.toLowerCase() === 'inactive' ? 'inactive' : '';

      const rowReasons: string[] = [];

      // Validations
      if (!portCodeRaw) {
        rowReasons.push('Port Code is required');
      } else if (portCodeRaw.length > 10) {
        rowReasons.push('Port Code cannot exceed 10 characters');
      }

      if (!portNameRaw) {
        rowReasons.push('Port Name is required');
      }

      if (!countryRaw) {
        rowReasons.push('Country is required');
      }

      const validFreightTypes = ['Air', 'Ocean', 'Road', 'Rail'];
      if (!freightTypeRaw) {
        rowReasons.push('Freight Type is required');
      } else if (!validFreightTypes.includes(freight_type)) {
        rowReasons.push('Freight Type must be one of: Air, Ocean, Road, Rail');
      }

      if (!statusRaw) {
        rowReasons.push('Status is required');
      } else if (status !== 'active' && status !== 'inactive') {
        rowReasons.push('Status must be one of: Active, Inactive');
      }

      let rowStatus: 'valid' | 'invalid' | 'duplicate' = 'valid';

      if (rowReasons.length > 0) {
        rowStatus = 'invalid';
        invalidCount++;
        errors.push({ row: rowNumber, port_code: portCodeRaw, reason: rowReasons.join(', ') });
      } else if (seenInFile.has(port_code)) {
        rowStatus = 'duplicate';
        duplicateCount++;
        rowReasons.push('Duplicate Port Code inside the uploaded file');
        errors.push({ row: rowNumber, port_code: portCodeRaw, reason: 'Duplicate Port Code inside uploaded file' });
      } else if (dbCodes.has(port_code)) {
        rowStatus = 'duplicate';
        duplicateCount++;
        rowReasons.push('Port Code already exists in database');
        errors.push({ row: rowNumber, port_code: portCodeRaw, reason: 'Port Code already exists in database' });
      } else {
        validCount++;
        seenInFile.add(port_code);
      }

      rows.push({
        rowNumber,
        port_code,
        port_name,
        country,
        freight_type,
        status,
        rowStatus,
        reason: rowReasons.join(', ')
      });
    });

    // 3. Commit Mode — write valid rows to the database
    if (isCommit) {
      const validRows = rows.filter(r => r.rowStatus === 'valid');
      if (validRows.length > 0) {
        // Bulk INSERT using promise connection
        const values: any[] = [];
        const placeholders: string[] = [];

        validRows.forEach(r => {
          const id = `port-${r.port_code}-${Math.floor(100 + Math.random() * 900)}`;
          placeholders.push('(?, ?, ?, ?, ?, ?)');
          values.push(id, r.port_code, r.port_name, r.country, r.freight_type, r.status);
        });

        const insertQuery = `INSERT INTO ports (id, port_code, port_name, country, freight_type, status) VALUES ${placeholders.join(', ')}`;
        await pool.query(insertQuery, values);
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
