/**
 * CSV & Data Export Utilities — export and import helpers used across all list pages.
 */

/**
 * Converts an array of objects to a CSV string and triggers browser download.
 */
export function exportToCSV<T>(
  rows: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
): void {
  if (rows.length === 0) return;

  const cols = columns ?? (Object.keys(rows[0] as any) as (keyof T)[]).map((k) => ({ key: k, label: String(k) }));

  const header = cols.map((c) => `"${c.label}"`).join(',');
  const body = rows
    .map((row) =>
      cols
        .map((c) => {
          const val = row[c.key];
          const str = val === null || val === undefined ? '' : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(',')
    )
    .join('\n');

  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports data to an XML-based Excel Spreadsheet (.xls / .xlsx formatted document)
 */
export function exportToExcel<T>(
  rows: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
): void {
  if (rows.length === 0) return;

  const cols = columns ?? (Object.keys(rows[0] as any) as (keyof T)[]).map((k) => ({ key: k, label: String(k) }));

  // Create XML-based Excel Spreadsheet format
  let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
 <Style ss:ID="HeaderStyle">
  <Font ss:Bold="1" ss:Color="#FFFFFF"/>
  <Interior ss:Color="#F15A24" ss:Pattern="Solid"/>
  <Alignment ss:Horizontal="Center"/>
 </Style>
</Styles>
<Worksheet ss:Name="Sheet1">
<Table>`;

  xml += '\n<Row ss:StyleID="HeaderStyle">';
  cols.forEach((c) => {
    xml += `<Cell><Data ss:Type="String">${escapeXml(c.label)}</Data></Cell>`;
  });
  xml += '</Row>';

  rows.forEach((row) => {
    xml += '\n<Row>';
    cols.forEach((c) => {
      const val = row[c.key];
      const str = val === null || val === undefined ? '' : String(val);
      const isNum = !isNaN(Number(str)) && str.trim() !== '';
      xml += `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${escapeXml(str)}</Data></Cell>`;
    });
    xml += '</Row>';
  });

  xml += '\n</Table>\n</Worksheet>\n</Workbook>';

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const name = filename.replace(/\.(csv|xlsx|xls)$/i, '');
  link.setAttribute('download', `${name}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Downloads a sample Freight Rates CSV template file.
 */
export function downloadRatesSampleCSV(): void {
  const headers = ['Rate ID', 'Mode', 'Shipment Type', 'Origin', 'Destination', 'Container', 'Carrier', 'Transit Time', 'Price', 'Currency', 'Status'];
  const sampleRow1 = ['frate-801', 'Ocean Freight', 'FCL (Full Container Load)', 'USLAX', 'CNSHA', '40ft Standard Dry (40GP)', 'Maersk', '18', '2450.00', 'USD', 'active'];
  const sampleRow2 = ['frate-802', 'Air Freight', 'Air Freight Standard', 'SGPIN', 'INBOM', '', 'Emirates SkyCargo', '3', '3800.00', 'USD', 'active'];

  const csvContent = [
    headers.map((h) => `"${h}"`).join(','),
    sampleRow1.map((v) => `"${v}"`).join(','),
    sampleRow2.map((v) => `"${v}"`).join(','),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'easyfr8_rates_template_sample.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a sample Freight Rates Excel template file (.xls format).
 */
export function downloadRatesSampleExcel(): void {
  const sampleData = [
    {
      'Rate ID': 'frate-801',
      'Mode': 'Ocean Freight',
      'Shipment Type': 'FCL (Full Container Load)',
      'Origin': 'USLAX',
      'Destination': 'CNSHA',
      'Container': '40ft Standard Dry (40GP)',
      'Carrier': 'Maersk Line',
      'Transit Time': 18,
      'Price': 2450.00,
      'Currency': 'USD',
      'Status': 'active',
    },
    {
      'Rate ID': 'frate-802',
      'Mode': 'Air Freight',
      'Shipment Type': 'Air Freight Standard',
      'Origin': 'SGPIN',
      'Destination': 'INBOM',
      'Container': '',
      'Carrier': 'Emirates SkyCargo',
      'Transit Time': 3,
      'Price': 3800.00,
      'Currency': 'USD',
      'Status': 'active',
    },
  ];

  exportToExcel(sampleData, 'easyfr8_rates_template_sample.xls');
}

/**
 * Parses a CSV string into an array of objects using the first row as headers.
 */
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());

  return lines.slice(1).map((line) => {
    // Handle quoted fields containing commas
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current.trim());

    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (values[idx] ?? '').replace(/^"|"$/g, '');
    });
    return obj;
  });
}

/**
 * Generates a slug from a title string.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Estimates reading time in minutes from a body text (200 words per minute).
 */
export function estimateReadingTime(body: string): number {
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}
