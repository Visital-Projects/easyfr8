import { NextResponse } from 'next/server';
import { getIndustries } from '@/lib/db';

export async function GET() {
  try {
    const allIndustries = await getIndustries();
    const active = allIndustries
      .filter((i) => i.status === 'active')
      .sort((a, b) => a.sort_order - b.sort_order);
    return NextResponse.json(active);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
