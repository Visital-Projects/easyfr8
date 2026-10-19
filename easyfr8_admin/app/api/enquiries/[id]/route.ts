import { NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = authenticateRequest(req, ['Administrator', 'Manager']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = await req.json();

    const existing: any = await query('SELECT * FROM enquiries WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Enquiry not found' }, { status: 404 });
    }

    const current = existing[0];
    const name = body.name !== undefined ? body.name : current.name;
    const email = body.email !== undefined ? body.email : current.email;
    const phone = body.phone !== undefined ? body.phone : current.phone;
    const subject = body.subject !== undefined ? body.subject : current.subject;
    const notes = body.notes !== undefined ? body.notes : current.notes;
    const assignedTo = body.assignedTo !== undefined ? body.assignedTo : current.assigned_to;
    const status = body.status !== undefined ? body.status : current.status;
    const source = body.source !== undefined ? body.source : current.source;

    await execute(`
      UPDATE enquiries
      SET name = ?, email = ?, phone = ?, subject = ?, notes = ?, assigned_to = ?, status = ?, source = ?, updated_at = NOW()
      WHERE id = ?
    `, [name, email, phone, subject, notes, assignedTo, status, source, id]);

    return NextResponse.json({
      success: true,
      enquiry: {
        id,
        name,
        email,
        phone,
        subject,
        notes,
        assignedTo,
        status,
        source,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = authenticateRequest(req, ['Administrator', 'Manager']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    await execute('DELETE FROM enquiries WHERE id = ?', [id]);
    return NextResponse.json({
      success: true,
      message: 'Enquiry deleted successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
