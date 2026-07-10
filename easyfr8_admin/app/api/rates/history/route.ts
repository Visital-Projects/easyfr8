import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const rows = await query('SELECT * FROM rate_activity_logs ORDER BY created_at DESC');
    const mapped = rows.map((r: any) => ({
      id: r.id,
      rateId: r.rate_id,
      actionType: r.action_type,
      oldValue: r.old_value ? JSON.parse(r.old_value) : null,
      newValue: r.new_value ? JSON.parse(r.new_value) : null,
      updatedBy: r.updated_by,
      createdAt: r.created_at
    }));
    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
