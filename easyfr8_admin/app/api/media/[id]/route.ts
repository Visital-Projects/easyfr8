import { NextResponse } from 'next/server';
import { execute, query, logAuditEvent } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rows = await query(
      'SELECT file_name, file_url, file_type, file_size, uploaded_at, updated_at FROM media WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }
    
    const row = rows[0];
    const url = new URL(req.url);
    const format = url.searchParams.get('format');
    
    // Explicit JSON request: returns metadata + raw base64 data
    if (format === 'json') {
      return NextResponse.json({
        id,
        fileName: row.file_name,
        fileUrl: row.file_url,
        fileType: row.file_type,
        fileSize: row.file_size,
        uploadedAt: row.uploaded_at,
        updatedAt: row.updated_at
      });
    }

    // Direct image/file streaming: decode Base64 data URI to binary buffer
    if (row.file_url && row.file_url.startsWith('data:')) {
      const commaIdx = row.file_url.indexOf(',');
      if (commaIdx !== -1) {
        const header = row.file_url.substring(0, commaIdx);
        const base64Data = row.file_url.substring(commaIdx + 1);
        const mimeMatch = header.match(/^data:([^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : (row.file_type || 'application/octet-stream');
        const buffer = Buffer.from(base64Data, 'base64');
        
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Length': String(buffer.length),
            'Content-Disposition': `inline; filename="${encodeURIComponent(row.file_name)}"`,
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          },
        });
      }
    }

    // If external URL, redirect
    if (row.file_url && (row.file_url.startsWith('http://') || row.file_url.startsWith('https://'))) {
      return NextResponse.redirect(row.file_url);
    }

    return NextResponse.json({ success: false, error: 'Invalid media format' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticateRequest(req, ['Administrator', 'Manager']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const { fileName, fileUrl, fileType, fileSize, userEmail, userName } = await req.json();
    
    if (!fileName || !fileUrl) {
      return NextResponse.json({ success: false, error: 'File name and content are required' }, { status: 400 });
    }
    
    const now = new Date();
    await execute(
      'UPDATE media SET file_name = ?, file_url = ?, file_type = ?, file_size = ? WHERE id = ?',
      [fileName, fileUrl, fileType || 'image/png', fileSize || '0 KB', id]
    );
    
    await logAuditEvent(
      auth.user?.email || userEmail || 'admin',
      auth.user?.name || userName || 'Administrator',
      `Replaced media file: ${fileName}`
    );
    
    return NextResponse.json({
      success: true,
      media: {
        id,
        fileName,
        fileUrl: `/api/media/${id}?v=${now.getTime()}`,
        fileType,
        fileSize,
        uploadedAt: now.toISOString()
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticateRequest(req, ['Administrator', 'Manager']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    
    // Find the file name first for auditing
    const rows = await query('SELECT file_name FROM media WHERE id = ?', [id]);
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }
    
    const fileName = rows[0].file_name;
    
    await execute('DELETE FROM media WHERE id = ?', [id]);
    
    await logAuditEvent(
      auth.user?.email || 'admin',
      auth.user?.name || 'Administrator',
      `Deleted media file: ${fileName}`
    );
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
