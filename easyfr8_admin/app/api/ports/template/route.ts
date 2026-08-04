import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function GET() {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EasyFr8 ERP';
    workbook.lastModifiedBy = 'EasyFr8 ERP';
    workbook.created = new Date();
    workbook.modified = new Date();

    // 1. Ports Worksheet
    const portsSheet = workbook.addWorksheet('Ports');
    
    // Column Headers
    portsSheet.columns = [
      { header: 'Port Code *', key: 'port_code', width: 15 },
      { header: 'Port Name *', key: 'port_name', width: 25 },
      { header: 'Country *', key: 'country', width: 20 },
      { header: 'Freight Type *', key: 'freight_type', width: 15 },
      { header: 'Status *', key: 'status', width: 15 }
    ];

    // Style Header Row
    const headerRow = portsSheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF6B00' } // ERP Orange
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
    portsSheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Enable Autofilter
    portsSheet.autoFilter = 'A1:E1';

    // Add Sample Rows
    const samples = [
      { port_code: 'INMUN', port_name: 'Mumbai', country: 'India', freight_type: 'Ocean', status: 'Active' },
      { port_code: 'SGPIN', port_name: 'Singapore', country: 'Singapore', freight_type: 'Ocean', status: 'Active' },
      { port_code: 'AMS', port_name: 'Amsterdam Schiphol', country: 'Netherlands', freight_type: 'Air', status: 'Active' }
    ];

    samples.forEach(sample => portsSheet.addRow(sample));

    // Align all sample cells left
    for (let r = 2; r <= 5; r++) {
      const row = portsSheet.getRow(r);
      row.alignment = { vertical: 'middle', horizontal: 'left' };
    }

    // Add dropdown validations
    (portsSheet as any).dataValidations.add('D2:D1000', {
      type: 'list',
      allowBlank: true,
      formulae: ['"Air,Ocean,Road,Rail"'],
      showErrorMessage: true,
      errorTitle: 'Invalid Freight Type',
      error: 'Please select a value from the dropdown: Air, Ocean, Road, or Rail.'
    });

    (portsSheet as any).dataValidations.add('E2:E1000', {
      type: 'list',
      allowBlank: true,
      formulae: ['"Active,Inactive"'],
      showErrorMessage: true,
      errorTitle: 'Invalid Status',
      error: 'Please select a value from the dropdown: Active or Inactive.'
    });

    // 2. Instructions Worksheet
    const instructionsSheet = workbook.addWorksheet('Instructions');
    instructionsSheet.columns = [
      { header: 'Instruction / Rule', key: 'rule', width: 30 },
      { header: 'Details', key: 'details', width: 60 }
    ];

    const instHeader = instructionsSheet.getRow(1);
    instHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    instHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF333333' }
    };

    instructionsSheet.addRows([
      { rule: 'Required Fields (*)', details: 'Port Code, Port Name, Country, Freight Type, Status must be filled.' },
      { rule: 'Freight Type values', details: 'Must be one of: Air, Ocean, Road, Rail (case-sensitive during validation).' },
      { rule: 'Status values', details: 'Must be one of: Active, Inactive (case-sensitive during validation).' },
      { rule: 'Duplicate Policy', details: 'Duplicate Port Codes inside the file or existing in the database will be highlighted and skipped/failed.' },
      { rule: 'File Size Limit', details: 'Upload file must not exceed 10 MB.' },
      { rule: 'Supported Formats', details: 'Microsoft Excel (.xlsx) and CSV (.csv).' }
    ]);

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Ports_Import_Template.xlsx"'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
