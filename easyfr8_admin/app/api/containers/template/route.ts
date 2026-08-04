import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function GET() {
  try {
    const workbook = new ExcelJS.Workbook();

    // 1. Containers Sheet
    const containersSheet = workbook.addWorksheet('Containers');

    // Freeze first row and enable gridlines
    containersSheet.views = [
      { state: 'frozen', ySplit: 1, activeCell: 'A2', showGridLines: true }
    ];

    // Define columns
    containersSheet.columns = [
      { header: 'Container ID *', key: 'id', width: 20 },
      { header: 'Container Name *', key: 'name', width: 25 },
      { header: 'Description', key: 'description', width: 35 },
      { header: 'Size *', key: 'size', width: 15 },
      { header: 'Status *', key: 'status', width: 15 }
    ];

    // Format header row (Bold, Orange background, White text)
    const headerRow = containersSheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF15A24' } // Primary Orange (#f15a24)
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
    headerRow.height = 26;

    // Enable Auto Filter
    containersSheet.autoFilter = 'A1:E1';

    // Add dropdown validations
    (containersSheet as any).dataValidations.add('D2:D1000', {
      type: 'list',
      allowBlank: true,
      formulae: ['"20ft,40ft,45ft"'],
      showErrorMessage: true,
      errorTitle: 'Invalid Size',
      error: 'Please select a value from the dropdown: 20ft, 40ft, or 45ft.'
    });

    (containersSheet as any).dataValidations.add('E2:E1000', {
      type: 'list',
      allowBlank: true,
      formulae: ['"active,inactive"'],
      showErrorMessage: true,
      errorTitle: 'Invalid Status',
      error: 'Please select a value from the dropdown: active or inactive.'
    });

    // Add Sample Row
    containersSheet.addRow({
      id: 'cont-20gp',
      name: '20 GP',
      description: "20' Dry Standard Container",
      size: '20ft',
      status: 'active'
    });

    // Left align all cells in data rows
    for (let r = 2; r <= 10; r++) {
      const row = containersSheet.getRow(r);
      row.alignment = { vertical: 'middle', horizontal: 'left' };
    }

    // 2. Instructions Sheet
    const instructionsSheet = workbook.addWorksheet('Instructions');
    instructionsSheet.views = [{ showGridLines: true }];

    instructionsSheet.columns = [
      { header: 'Field Name', key: 'field', width: 25 },
      { header: 'Required', key: 'required', width: 15 },
      { header: 'Type / Allowed Values', key: 'rules', width: 45 },
      { header: 'Description', key: 'desc', width: 50 }
    ];

    const instHeaderRow = instructionsSheet.getRow(1);
    instHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    instHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF334155' } // Dark gray (#334155)
    };
    instHeaderRow.alignment = { vertical: 'middle', horizontal: 'left' };
    instHeaderRow.height = 26;

    instructionsSheet.addRows([
      {
        field: 'Container ID',
        required: 'Yes',
        rules: 'Alphanumeric, max 64 chars',
        desc: 'Unique identifier for the container type. Must be unique.'
      },
      {
        field: 'Container Name',
        required: 'Yes',
        rules: 'String, max 255 chars',
        desc: 'Display name of the container type (e.g. 40 HC).'
      },
      {
        field: 'Description',
        required: 'No',
        rules: 'String',
        desc: 'Optional details describing the container type.'
      },
      {
        field: 'Size',
        required: 'Yes',
        rules: 'Dropdown: 20ft, 40ft, 45ft',
        desc: 'Length category of the container.'
      },
      {
        field: 'Status',
        required: 'Yes',
        rules: 'Dropdown: active, inactive',
        desc: 'Status of the container in the system.'
      }
    ]);

    for (let r = 2; r <= 7; r++) {
      const row = instructionsSheet.getRow(r);
      row.alignment = { vertical: 'middle', horizontal: 'left' };
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Container_Import_Template.xlsx"'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
