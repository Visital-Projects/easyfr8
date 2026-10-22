import { NextResponse } from 'next/server';
import { execute, getPool, logAuditEvent } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

function formatDate(dateVal: any): string {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ── GET /api/documents/[id] — retrieve a single KYC document ──────────────────
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = authenticateRequest(req);
    const pool = getPool();

    const [rows]: any = await pool.query(
      `SELECT d.*, u.name as user_name, u.id as user_id, u.email as user_email
       FROM kyc_documents d
       LEFT JOIN users u ON LOWER(d.user) = LOWER(u.email)
       WHERE d.id = ?`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const r = rows[0];

    // Role isolation: authentication is strictly required to view documents
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication token is required to view document.' },
        { status: 401 }
      );
    }

    const role = (auth.user.role || '').toLowerCase().trim();
    if (role !== 'administrator' && role !== 'manager') {
      const callerEmail = (auth.user.email || '').toLowerCase().trim();
      if ((r.user || '').toLowerCase().trim() !== callerEmail) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Cannot access another shipper\'s document.' },
          { status: 403 }
        );
      }
    }

    const doc = {
      id: r.id,
      user: r.user ?? '',
      userName: r.user_name || r.user || 'Shipper',
      userId: r.user_id || '',
      name: r.name ?? '',
      type: r.type ?? '',
      date: formatDate(r.date),
      status: r.status ?? 'Pending Review',
      remarks: r.remarks ?? '',
      fileUrl: r.file_url ?? '#',
      fileType: r.file_type ?? 'pdf',
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };

    return NextResponse.json(doc);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ── PUT /api/documents/[id] — update a KYC document record in MySQL ───────────
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = authenticateRequest(req);
    const body = await req.json();

    // Verify authentication and authorization
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication token is required to review document.' },
        { status: 401 }
      );
    }

    const role = (auth.user.role || '').toLowerCase().trim();
    if (role !== 'administrator' && role !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only administrators and managers can review documents.' },
        { status: 403 }
      );
    }

    // Verify document exists
    const pool = getPool();
    const [existing]: any = await pool.query('SELECT * FROM kyc_documents WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const currentDoc = existing[0];

    // Rejection validation: remarks are mandatory when rejecting a document
    if (body.status === 'Rejected') {
      const reason = (body.remarks || '').trim();
      if (!reason) {
        return NextResponse.json(
          { success: false, error: 'A specific reason/remark is mandatory when rejecting a document.' },
          { status: 400 }
        );
      }
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
    const [rows]: any = await pool.query(
      `SELECT d.*, u.name as user_name, u.id as user_id, u.email as user_email
       FROM kyc_documents d
       LEFT JOIN users u ON LOWER(d.user) = LOWER(u.email)
       WHERE d.id = ?`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Document not found after update' }, { status: 404 });
    }

    const r = rows[0];
    const updated = {
      id: r.id,
      user: r.user ?? '',
      userName: r.user_name || r.user || 'Shipper',
      userId: r.user_id || '',
      name: r.name ?? '',
      type: r.type ?? '',
      date: formatDate(r.date),
      status: r.status ?? 'Pending Review',
      remarks: r.remarks ?? '',
      fileUrl: r.file_url ?? '#',
      fileType: r.file_type ?? 'pdf',
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };

    // Log the verification / review action to audit_logs
    const actorId = auth.authenticated && auth.user?.id ? auth.user.id : 'ADMIN';
    const actorName = auth.authenticated && auth.user?.name ? auth.user.name : (auth.user?.email || 'Administrator');
    const actionDesc = `Document ${id} (${currentDoc.name}) status changed from "${currentDoc.status}" to "${updated.status}"${updated.remarks ? ' [Remarks: ' + updated.remarks + ']' : ''}`;
    try {
      await logAuditEvent(actorId, actorName, actionDesc);
    } catch (auditErr) {
      console.warn('Failed to record audit log for document verification:', auditErr);
    }

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
