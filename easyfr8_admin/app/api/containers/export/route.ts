import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import ExcelJS from 'exceljs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const exportType = searchParams.get('type') || 'xlsx';
    const ids = searchParams.get('ids');
    const search = searchParams.get('search');

    const pool = getPool();
    let query = 'SELECT * FROM containers';
    const params: any[] = [];

    // Apply Filter Scope
    if (ids) {
      const idList = ids.split(',').map(item => item.trim());
      const placeholders = idList.map(() => '?').join(', ');
      query += ` WHERE id IN (${placeholders})`;
      params.push(...idList);
    } else if (search) {
      query += ' WHERE id LIKE ? OR name LIKE ? OR description LIKE ?';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY name ASC';
    const [rows]: any = await pool.query(query, params);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Containers');

    // Freeze first row and enable gridlines
    sheet.views = [
      { state: 'frozen', ySplit: 1, activeCell: 'A2', showGridLines: true }
    ];

    sheet.columns = [
      { header: 'Container ID', key: 'id', width: 20 },
      { header: 'Container Name', key: 'name', width: 25 },
      { header: 'Description', key: 'description', width: 35 },
      { header: 'Size', key: 'size', width: 15 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    // Format header row (Bold, Orange background, White text)
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF15A24' } // Primary Orange (#f15a24)
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
    headerRow.height = 26;

    sheet.autoFilter = 'A1:E1';

    rows.forEach((c: any) => {
      sheet.addRow({
        id: c.id,
        name: c.name,
        description: c.description || '',
        size: c.size || '',
        status: c.status || 'active'
      });
    });

    // Left align all data rows
    for (let r = 2; r <= rows.length + 1; r++) {
      sheet.getRow(r).alignment = { vertical: 'middle', horizontal: 'left' };
    }

    if (exportType === 'csv') {
      const stream = require('stream');
      const readable = new stream.Readable();
      readable._read = () => {};
      const bufferPromise = new Promise<Buffer>((resolve, reject) => {
        const chunks: any[] = [];
        const writableStream = new stream.Writable({
          write(chunk: any, encoding: any, callback: any) {
            chunks.push(chunk);
            callback();
          },
          final(callback: any) {
            resolve(Buffer.concat(chunks));
            callback();
          }
        });
        workbook.csv.write(writableStream).catch(reject);
      });

      const buffer = await bufferPromise;
      return new Response(buffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="containers.csv"'
        }
      });
    }

    // Default: xlsx
    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="containers.xlsx"'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
