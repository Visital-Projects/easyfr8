import { NextResponse } from 'next/server';
import { getStatistics } from '@/lib/db';

export async function GET() {
  try {
    const allStats = await getStatistics();
    // Return only active statistics sorted by sort_order
    const statistics = allStats
      .filter((s) => s.status === 'active')
      .sort((a, b) => a.sort_order - b.sort_order);

    return NextResponse.json(statistics);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
