import { NextResponse } from 'next/server';
import { execute, query, logAuditEvent } from '@/lib/db';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { fileName, fileUrl, fileType, fileSize, userEmail, userName } = await req.json();
    
    if (!fileName || !fileUrl) {
      return NextResponse.json({ success: false, error: 'File name and content are required' }, { status: 400 });
    }
    
    await execute(
      'UPDATE media SET file_name = ?, file_url = ?, file_type = ?, file_size = ? WHERE id = ?',
      [fileName, fileUrl, fileType || 'image/png', fileSize || '0 KB', id]
    );
    
    await logAuditEvent(
      userEmail || 'admin',
      userName || 'Administrator',
      `Replaced media file: ${fileName}`
    );
    
    return NextResponse.json({
      success: true,
      media: {
        id,
        fileName,
        fileUrl,
        fileType,
        fileSize,
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Find the file name first for auditing
    const rows = await query('SELECT file_name FROM media WHERE id = ?', [id]);
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }
    
    const fileName = rows[0].file_name;
    
    await execute('DELETE FROM media WHERE id = ?', [id]);
    
    const url = new URL(req.url);
    const userEmail = url.searchParams.get('userEmail') || 'admin';
    const userName = url.searchParams.get('userName') || 'Administrator';
    
    await logAuditEvent(
      userEmail,
      userName,
      `Deleted media file: ${fileName}`
    );
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
