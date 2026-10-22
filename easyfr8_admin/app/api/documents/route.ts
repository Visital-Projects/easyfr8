import { NextResponse } from 'next/server';
import { execute, query, getPool } from '@/lib/db';
import { KYCDocument } from '@/lib/store';
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

// ── GET /api/documents  — list KYC documents from MySQL with role isolation ──
export async function GET(req: Request) {
  try {
    const auth = authenticateRequest(req);
    let rows: any[] = [];
    const baseQuery = `
      SELECT d.*, u.name as user_name, u.id as user_id, u.email as user_email
      FROM kyc_documents d
      LEFT JOIN users u ON LOWER(d.user) = LOWER(u.email)
    `;

    if (auth.authenticated && auth.user) {
      const role = (auth.user.role || '').toLowerCase().trim();
      if (role === 'administrator' || role === 'manager') {
        rows = await query<any>(`${baseQuery} ORDER BY d.created_at DESC`);
      } else {
        const userEmail = (auth.user.email || '').toLowerCase().trim();
        rows = await query<any>(
          `${baseQuery} WHERE LOWER(d.user) = LOWER(?) ORDER BY d.created_at DESC`,
          [userEmail]
        );
      }
    } else {
      // Fallback for unauthenticated admin access or legacy callers
      rows = await query<any>(`${baseQuery} ORDER BY d.created_at DESC`);
    }

    const documents = rows.map((r: any) => ({
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
    }));
    return NextResponse.json(documents);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ── POST /api/documents  — create a new KYC document record in MySQL ──────────
export async function POST(req: Request) {
  try {
    const auth = authenticateRequest(req);
    const doc: KYCDocument = await req.json();

    if (!doc.id) {
      doc.id = `DOC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    }
    if (!doc.date) {
      doc.date = new Date().toISOString().split('T')[0];
    }
    if (!doc.user && auth.authenticated && auth.user?.email) {
      doc.user = auth.user.email;
    }

    await execute(
      `INSERT INTO kyc_documents (id, \`user\`, name, type, date, status, remarks, file_url, file_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        doc.id,
        doc.user || '',
        doc.name || '',
        doc.type || '',
        doc.date,
        doc.status || 'Pending Review',
        doc.remarks || '',
        doc.fileUrl || '#',
        doc.fileType || 'pdf',
      ]
    );

    // Re-fetch from MySQL to confirm persistence
    const pool = getPool();
    const [rows]: any = await pool.query('SELECT * FROM kyc_documents WHERE id = ?', [doc.id]);
    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Document was not saved to database' }, { status: 500 });
    }

    return NextResponse.json({ success: true, document: doc }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
