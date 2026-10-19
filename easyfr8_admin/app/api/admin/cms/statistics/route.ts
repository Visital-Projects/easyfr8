import { NextResponse } from 'next/server';
import { execute, query, getStatistics } from '@/lib/db';
import { Statistic } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const allStats = await getStatistics();
    const statistics = allStats.sort((a, b) => a.sort_order - b.sort_order);
    return NextResponse.json(statistics, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const [countRows]: any = await query('SELECT COUNT(*) as count FROM statistics');
    const newId = `stat-${Date.now()}`;
    const sortOrder = typeof body.sort_order === 'number' ? body.sort_order : ((countRows[0]?.count || 0) + 1);
    const label = body.label || '';
    const value = body.value || '';
    const icon = body.icon || 'flaticon-transport-9';
    const status = body.status || 'active';

    await execute(`
      INSERT INTO statistics (id, label, value, icon, status, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [newId, label, value, icon, status, sortOrder]);

    const newStat: Statistic = {
      id: newId,
      label,
      value,
      icon,
      status: status as 'active' | 'inactive',
      sort_order: sortOrder,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json(newStat, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
