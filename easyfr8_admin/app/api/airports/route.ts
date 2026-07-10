import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    
    const pool = getPool();
    const [rows]: any = await pool.query(
      'SELECT city_airport, iata_code, country FROM iata_codes WHERE city_airport LIKE ? OR iata_code LIKE ? OR country LIKE ? LIMIT 10',
      [`%${search}%`, `%${search}%`, `%${search}%`]
    );
    
    return NextResponse.json({ success: true, airports: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
