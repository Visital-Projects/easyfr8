import { NextResponse } from 'next/server';
import { execute, getPool } from '@/lib/db';

function formatDate(dateVal: any): string {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ── PUT /api/documents/[id]  — update a KYC document record in MySQL ─────────
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Verify document exists
    const pool = getPool();
    const [existing]: any = await pool.query('SELECT id FROM kyc_documents WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // Build dynamic SET clause from allowed fields
    const allowedFields: Record<string, string> = {
      user: 'user',
      name: 'name',
      type: 'type',
      date: 'date',
      status: 'status',
      remarks: 'remarks',
      fileUrl: 'file_url',
      fileType: 'file_type',
    };

    const setClauses: string[] = [];
    const values: any[] = [];

    for (const [jsKey, dbCol] of Object.entries(allowedFields)) {
      if (jsKey in body) {
        setClauses.push(`\`${dbCol}\` = ?`);
        values.push(body[jsKey]);
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    setClauses.push('updated_at = NOW()');
    values.push(id);

    await execute(
      `UPDATE kyc_documents SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    // Read-after-write: confirm the update persisted
    const [rows]: any = await pool.query('SELECT * FROM kyc_documents WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Document not found after update' }, { status: 404 });
    }

    const r = rows[0];
    const updated = {
      id: r.id,
      user: r.user ?? '',
      name: r.name ?? '',
      type: r.type ?? '',
      date: formatDate(r.date),
      status: r.status ?? 'Pending Review',
      remarks: r.remarks ?? '',
      fileUrl: r.file_url ?? '#',
      fileType: r.file_type ?? 'pdf',
    };

    return NextResponse.json({ success: true, document: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH delegates to PUT
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(req, { params });
}

// ── DELETE /api/documents/[id]  — remove KYC document from MySQL ─────────────
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pool = getPool();

    // Verify it exists first
    const [existing]: any = await pool.query('SELECT id FROM kyc_documents WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const [result]: any = await pool.query('DELETE FROM kyc_documents WHERE id = ?', [id]);

    if (!result || result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Delete operation affected 0 rows' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully.',
      affectedRows: result.affectedRows,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
