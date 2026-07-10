import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { AppSettings } from '@/lib/store';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ section: string }> }
) {
  try {
    const { section } = await params;
    const body = await req.json();
    const db = await readDb();
    
    if (!(section in db.appSettings)) {
      return NextResponse.json({ success: false, error: 'Invalid settings section' }, { status: 400 });
    }
    
    // Update settings section
    db.appSettings = {
      ...db.appSettings,
      [section]: {
        ...(db.appSettings[section as keyof AppSettings] as object),
        ...body
      }
    };
    
    await writeDb(db);
    
    return NextResponse.json(db.appSettings);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
