import { NextResponse } from 'next/server';
import { query, logAuditEvent } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email address is required.' }, { status: 400 });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const rows = await query<any>('SELECT id, name, email FROM users WHERE LOWER(email) = ?', [trimmedEmail]);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No registered shipper found with this email.' }, { status: 404 });
    }

    const user = rows[0];
    await logAuditEvent(
      user.email,
      user.name,
      `Requested credential reset for email: ${user.email}`
    );

    return NextResponse.json({
      success: true,
      message: `Password reset instructions have been dispatched to ${user.email}. Please check your inbox.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
