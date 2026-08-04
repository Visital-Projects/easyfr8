import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import ExcelJS from 'exceljs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'xlsx';
    const ids = searchParams.get('ids') || '';
    const search = searchParams.get('search') || '';
    const freightType = searchParams.get('freight_type') || '';

    const pool = getPool();
    let query = 'SELECT * FROM ports WHERE 1=1';
    const params: any[] = [];

    // Filter by Selected IDs
    if (ids) {
      const idList = ids.split(',').map(id => id.trim()).filter(Boolean);
      if (idList.length > 0) {
        query += ` AND id IN (${idList.map(() => '?').join(',')})`;
        params.push(...idList);
      }
    } else {
      // Filter by Search Query
      if (search) {
        query += ' AND (port_name LIKE ? OR port_code LIKE ? OR country LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      // Filter by Freight Type
      if (freightType) {
        query += ' AND freight_type = ?';
        params.push(freightType);
      }
    }

    query += ' ORDER BY port_name ASC';
    const [rows]: any = await pool.query(query, params);

    const formatLocalDateTime = (dateInput: any) => {
      if (!dateInput) return '';
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString('en-US', { hour12: false }).replace(',', '');
    };

    const now = new Date();
    const timestamp = now.toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-').slice(0, 16);
    const filename = `ports_${timestamp}`;

    // Export as CSV
    if (type === 'csv') {
      const headers = ['Port Code', 'Port Name', 'Country', 'Freight Type', 'Status', 'Created Date', 'Updated Date'];
      let csvContent = headers.join(',') + '\n';
      
      rows.forEach((row: any) => {
        const line = [
          `"${(row.port_code || '').replace(/"/g, '""')}"`,
          `"${(row.port_name || '').replace(/"/g, '""')}"`,
          `"${(row.country || '').replace(/"/g, '""')}"`,
          `"${(row.freight_type || '').replace(/"/g, '""')}"`,
          `"${(row.status || '').replace(/"/g, '""')}"`,
          `"${formatLocalDateTime(row.created_at)}"`,
          `"${formatLocalDateTime(row.updated_at)}"`
        ];
        csvContent += line.join(',') + '\n';
      });

      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
    }

    // Export as XLSX using ExcelJS
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Ports');

    sheet.columns = [
      { header: 'Port Code', key: 'port_code', width: 15 },
      { header: 'Port Name', key: 'port_name', width: 25 },
      { header: 'Country', key: 'country', width: 20 },
      { header: 'Freight Type', key: 'freight_type', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Created Date', key: 'created_at', width: 22 },
      { header: 'Updated Date', key: 'updated_at', width: 22 }
    ];

    // Format Header Row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF6B00' } // ERP Orange
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = 'A1:G1';

    // Add Rows
    rows.forEach((row: any) => {
      sheet.addRow({
        port_code: row.port_code,
        port_name: row.port_name,
        country: row.country,
        freight_type: row.freight_type,
        status: row.status,
        created_at: formatLocalDateTime(row.created_at),
        updated_at: formatLocalDateTime(row.updated_at)
      });
    });

    // Left align all data rows
    for (let r = 2; r <= rows.length + 1; r++) {
      sheet.getRow(r).alignment = { vertical: 'middle', horizontal: 'left' };
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
