import { NextResponse } from 'next/server';
import { getAppSettings, execute } from '@/lib/db';
import { AppSettings } from '@/lib/store';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ section: string }> }
) {
  try {
    const auth = authenticateRequest(req, ['Administrator']);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { section } = await params;
    const body = await req.json();
    const appSettings = await getAppSettings();
    
    const validSections = ['site', 'siteConfig', 'smtp', 'sms', 'payment', 'tax', 'currency', 'language', 'roles'];
    if (!validSections.includes(section) && !(section in appSettings)) {
      return NextResponse.json({ success: false, error: 'Invalid settings section' }, { status: 400 });
    }

    // Preserve existing sensitive password if frontend sent back the masked '********' placeholder
    const currentSectionData = (appSettings[section as keyof AppSettings] as any) || {};
    const sanitizedBody = { ...body };
    if (section === 'smtp' && sanitizedBody.password === '********') {
      sanitizedBody.password = currentSectionData.password || '';
    }
    
    const updatedSettings = {
      ...appSettings,
      [section]: {
        ...currentSectionData,
        ...sanitizedBody,
      }
    };
    
    await execute(
      'INSERT INTO app_settings (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
      [JSON.stringify(updatedSettings)]
    );
    
    // Return masked settings in response
    const safeResponse = {
      ...updatedSettings,
      smtp: updatedSettings.smtp ? {
        ...updatedSettings.smtp,
        password: updatedSettings.smtp.password ? '********' : ''
      } : undefined
    };

    return NextResponse.json(safeResponse);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
