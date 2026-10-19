import { NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const auth = authenticateRequest(req, ['Administrator']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    await execute('DELETE FROM audit_logs');
    
    // Log the clear action as the first new record in the audit trail
    const operator = auth.user?.name || auth.user?.email || 'Administrator';
    await execute(
      'INSERT INTO audit_logs (user_id, user_name, action, created_at) VALUES (?, ?, ?, NOW())',
      [auth.user?.id || null, operator, `Audit logs cleared by ${operator}`]
    );

    return NextResponse.json({ success: true, message: 'Audit logs cleared successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
