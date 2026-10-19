const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Parse image dimensions from common image format buffers
function getImageDimensions(buffer) {
  try {
    if (!buffer || buffer.length < 24) return null;

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { format: 'png', width, height, mime: 'image/png' };
    }

    // GIF: "GIF87a" or "GIF89a"
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      const width = buffer.readUInt16LE(6);
      const height = buffer.readUInt16LE(8);
      return { format: 'gif', width, height, mime: 'image/gif' };
    }

    // JPEG: 0xFF 0xD8
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xFF) break;
        const marker = buffer[offset + 1];
        // SOF markers: 0xC0 to 0xC3, 0xC5 to 0xC7, 0xC9 to 0xCB, 0xCD to 0xCF
        if (
          (marker >= 0xC0 && marker <= 0xC3) ||
          (marker >= 0xC5 && marker <= 0xC7) ||
          (marker >= 0xC9 && marker <= 0xCB) ||
          (marker >= 0xCD && marker <= 0xCF)
        ) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { format: 'jpeg', width, height, mime: 'image/jpeg' };
        }
        const len = buffer.readUInt16BE(offset + 2);
        offset += 2 + len;
      }
      return { format: 'jpeg', width: null, height: null, mime: 'image/jpeg' };
    }

    // WebP: RIFF ... WEBP
    if (
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    ) {
      // VP8
      if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x20) {
        const width = buffer.readUInt16LE(26) & 0x3fff;
        const height = buffer.readUInt16LE(28) & 0x3fff;
        return { format: 'webp', width, height, mime: 'image/webp' };
      }
      // VP8X
      if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x58) {
        const width = (buffer.readUInt32LE(24) & 0x00FFFFFF) + 1;
        const height = (buffer.readUInt32LE(27) & 0x00FFFFFF) + 1;
        return { format: 'webp', width, height, mime: 'image/webp' };
      }
      return { format: 'webp', width: null, height: null, mime: 'image/webp' };
    }
  } catch (err) {
    // ignore
  }
  return null;
}

async function runFullInspection() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'easyfr8',
  });

  const inspectionDir = path.join(__dirname, '..', 'db-image-inspection');
  if (!fs.existsSync(inspectionDir)) {
    fs.mkdirSync(inspectionDir, { recursive: true });
  }

  const results = {
    overview: {},
    tables: {},
    imageColumns: [],
    decodedImages: [],
    cmsContent: {},
    duplicateContent: [],
  };

  // 1. Overview
  const [dbTables] = await pool.query(
    'SELECT TABLE_NAME, TABLE_TYPE, ENGINE, TABLE_ROWS, CREATE_TIME, UPDATE_TIME FROM information_schema.TABLES WHERE TABLE_SCHEMA = "easyfr8" ORDER BY TABLE_NAME'
  );
  results.overview.totalTables = dbTables.length;
  results.overview.tables = dbTables;

  // 2. Full Table Structure for all 26 tables
  for (const t of dbTables) {
    const tableName = t.TABLE_NAME;
    const [cols] = await pool.query(`DESCRIBE \`${tableName}\``);
    const [createRes] = await pool.query(`SHOW CREATE TABLE \`${tableName}\``);
    const [indexes] = await pool.query(`SHOW INDEX FROM \`${tableName}\``);

    results.tables[tableName] = {
      columns: cols,
      createTable: createRes[0]['Create Table'],
      indexes: indexes.map(i => ({
        keyName: i.Key_name,
        columnName: i.Column_name,
        nonUnique: i.Non_unique,
        seq: i.Seq_in_index,
      })),
      rowCount: t.TABLE_ROWS,
    };
  }

  // 3. Scan for image/media columns & inspect
  const imageColumnKeywords = [
    'image', 'img', 'photo', 'picture', 'thumbnail', 'avatar', 'logo',
    'banner', 'media', 'file', 'file_url', 'image_url', 'image_data',
    'blob', 'content', 'attachment'
  ];

  for (const [tableName, tableData] of Object.entries(results.tables)) {
    for (const col of tableData.columns) {
      const colNameLower = col.Field.toLowerCase();
      const colTypeLower = col.Type.toLowerCase();
      const isKeyword = imageColumnKeywords.some(kw => colNameLower.includes(kw));
      const isBlobOrText = colTypeLower.includes('blob') || colTypeLower.includes('binary') || colTypeLower.includes('longtext');

      if (isKeyword || isBlobOrText) {
        // Query rows for this column
        const [rows] = await pool.query(`SELECT id, \`${col.Field}\` as val FROM \`${tableName}\` LIMIT 100`);
        for (const r of rows) {
          const val = r.val;
          if (val && typeof val === 'string' && val.length > 5) {
            let storageType = 'unknown';
            let mimeType = 'unknown';
            let length = val.length;

            if (val.startsWith('data:image/')) {
              storageType = 'Base64 data URI';
              const match = val.match(/^data:([^;]+);base64,(.+)$/s);
              if (match) {
                mimeType = match[1];
                const base64Str = match[2];
                const buf = Buffer.from(base64Str, 'base64');
                const dims = getImageDimensions(buf);

                // Save to inspection dir
                const ext = mimeType.split('/')[1] || 'bin';
                const safeId = String(r.id).replace(/[^a-zA-Z0-9_-]/g, '_');
                const fileName = `${tableName}_${col.Field}_${safeId}.${ext}`;
                const filePath = path.join(inspectionDir, fileName);
                fs.writeFileSync(filePath, buf);

                results.decodedImages.push({
                  table: tableName,
                  column: col.Field,
                  rowId: r.id,
                  fileName,
                  filePath,
                  storageType,
                  mimeType,
                  fileSize: buf.length,
                  charLength: length,
                  dimensions: dims ? `${dims.width}x${dims.height}` : 'unknown',
                  aspectRatio: dims && dims.width && dims.height ? (dims.width / dims.height).toFixed(2) : 'unknown',
                });
              }
            } else if (val.startsWith('http://') || val.startsWith('https://')) {
              storageType = 'External URL';
              if (val.includes('.jpg') || val.includes('.jpeg')) mimeType = 'image/jpeg';
              else if (val.includes('.png')) mimeType = 'image/png';
              else if (val.includes('.svg')) mimeType = 'image/svg+xml';
              else if (val.includes('.webp')) mimeType = 'image/webp';
            } else if (val.startsWith('/api/')) {
              storageType = 'API Streaming URL';
            } else if (val.startsWith('/') || val.includes('.')) {
              storageType = 'Relative Path / Local Asset';
            }

            results.imageColumns.push({
              table: tableName,
              column: col.Field,
              rowId: r.id,
              storageType,
              mimeType,
              length,
              preview: val.length > 90 ? val.slice(0, 90) + '...' : val,
            });
          }
        }
      }
    }
  }

  // 4. Detailed rows of content / CMS tables
  const cmsTables = [
    'hero_slides', 'services', 'faqs', 'industries', 'partners',
    'statistics', 'blogs', 'media', 'app_settings'
  ];

  for (const t of cmsTables) {
    const [rows] = await pool.query(`SELECT * FROM \`${t}\` LIMIT 100`);
    results.cmsContent[t] = rows.map(row => {
      const sanitized = { ...row };
      for (const [k, v] of Object.entries(sanitized)) {
        if (typeof v === 'string' && v.startsWith('data:image/')) {
          sanitized[k] = `[BASE64 IMAGE — ${v.length} characters]`;
        }
      }
      return sanitized;
    });
  }

  // 5. cms_data JSON parsing
  const [cmsDataRows] = await pool.query('SELECT * FROM cms_data WHERE id = 1');
  if (cmsDataRows.length > 0) {
    try {
      const parsed = JSON.parse(cmsDataRows[0].data);
      results.cmsDataParsed = {
        topLevelKeys: Object.keys(parsed),
        homepage: parsed.homepage,
        aboutUs: parsed.aboutUs,
        contact: parsed.contact,
        seo: parsed.seo,
        staticPagesCount: parsed.staticPages ? Object.keys(parsed.staticPages).length : 0,
        servicesCountInJson: parsed.services?.length,
        faqsCountInJson: parsed.faqs?.length,
        mediaCountInJson: parsed.media?.length,
      };
    } catch (e) {
      results.cmsDataParsed = { error: e.message };
    }
  }

  // Generate visual HTML contact sheet in inspectionDir
  let html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>EasyFr8 Database Images Contact Sheet</title>';
  html += '<style>body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#f8fafc;padding:30px;line-height:1.5;} table{width:100%;border-collapse:collapse;margin-top:20px;} th,td{padding:12px;border:1px solid #334155;text-align:left;vertical-align:middle;} th{background:#1e293b;} tr:nth-child(even){background:#1e293b55;} img{max-width:180px;max-height:100px;object-fit:cover;border-radius:4px;border:1px solid #475569;} .badge{background:#0369a1;color:white;padding:3px 8px;border-radius:4px;font-size:12px;} code{background:#334155;padding:2px 6px;border-radius:4px;}</style></head><body>';
  html += '<h1>EasyFr8 Database Image Contact Sheet (Read-Only Inspection)</h1>';
  html += '<p>Generated from decoded Base64 database payloads into temporary inspection directory <code>db-image-inspection/</code>.</p>';
  html += '<table><thead><tr><th>#</th><th>Table</th><th>Column</th><th>Row ID</th><th>Thumbnail</th><th>Filename</th><th>Dimensions</th><th>MIME</th><th>Filesize</th><th>Storage Type</th></tr></thead><tbody>';

  results.decodedImages.forEach((img, i) => {
    html += '<tr>';
    html += `<td>${i + 1}</td>`;
    html += `<td><b>${img.table}</b></td>`;
    html += `<td><code>${img.column}</code></td>`;
    html += `<td><code>${img.rowId}</code></td>`;
    html += `<td><img src="${img.fileName}" alt="thumb" /></td>`;
    html += `<td><code>${img.fileName}</code></td>`;
    html += `<td>${img.dimensions} (ratio: ${img.aspectRatio})</td>`;
    html += `<td>${img.mimeType}</td>`;
    html += `<td>${(img.fileSize / 1024).toFixed(1)} KB</td>`;
    html += `<td><span class="badge">${img.storageType}</span></td>`;
    html += '</tr>';
  });

  html += '</tbody></table></body></html>';
  fs.writeFileSync(path.join(inspectionDir, 'index.html'), html);
  console.log('Contact sheet saved to:', path.join(inspectionDir, 'index.html'));

  // Write full inspection JSON artifact
  const outJsonPath = path.join(inspectionDir, 'inspection_summary.json');
  fs.writeFileSync(outJsonPath, JSON.stringify(results, null, 2));
  console.log('Inspection complete. Summary saved to:', outJsonPath);
  console.log('Decoded images count:', results.decodedImages.length);

  await pool.end();
}

runFullInspection().catch(console.error);
