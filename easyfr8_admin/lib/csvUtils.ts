/**
 * CSV Utilities — export and import helpers used across all list pages.
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
