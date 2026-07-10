import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const [result] = await db.query('SELECT NOW() as time');
    return NextResponse.json({
      success: true,
      message: 'XAMPP MySQL Connected'
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: 'XAMPP MySQL Connection Failed',
        error: err.message
      },
      { status: 500 }
    );
  }
}
