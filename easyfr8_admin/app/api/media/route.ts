import { NextResponse } from 'next/server';
import { execute, query, logAuditEvent } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function GET() {
  try {
    const rows = await query(
      'SELECT id, file_name, file_type, file_size, uploaded_at, updated_at FROM media ORDER BY uploaded_at DESC'
    );
    const mapped = rows.map((r: any) => ({
      id: r.id,
      fileName: r.file_name,
      fileUrl: `/api/media/${r.id}?v=${new Date(r.updated_at || r.uploaded_at).getTime()}`,
      fileType: r.file_type,
      fileSize: r.file_size,
      uploadedAt: r.uploaded_at,
      updatedAt: r.updated_at
    }));
    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = authenticateRequest(req, ['Administrator', 'Manager']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { fileName, fileUrl, fileType, fileSize, userEmail, userName } = await req.json();
    
    if (!fileName || !fileUrl) {
      return NextResponse.json({ success: false, error: 'File name and content are required' }, { status: 400 });
    }
    
    const id = `MED-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date();
    
    await execute(
      'INSERT INTO media (id, file_name, file_url, file_type, file_size) VALUES (?, ?, ?, ?, ?)',
      [id, fileName, fileUrl, fileType || 'image/png', fileSize || '0 KB']
    );
    
    await logAuditEvent(
      userEmail || 'admin',
      userName || 'Administrator',
      `Uploaded media file: ${fileName}`
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
