import { NextResponse } from 'next/server';
import { getAppSettings } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const settings = await getAppSettings();
    const auth = authenticateRequest(req, ['Administrator', 'Manager']);

    if (auth.authenticated) {
      // Authenticated admin/manager: Return full settings, masking sensitive passwords
      const safeAdminSettings = {
        ...settings,
        smtp: settings.smtp
          ? {
              ...settings.smtp,
              password: settings.smtp.password ? '********' : '',
            }
          : undefined,
      };
      return NextResponse.json(safeAdminSettings);
    }

    // Public / Unauthenticated callers: Return only safe public configuration
    const publicSettings = {
      site: settings.site || {},
      siteConfig: settings.siteConfig || {},
      currency: settings.currency || 'USD',
      language: settings.language || 'English',
      tax: settings.tax || {},
    };

    return NextResponse.json(publicSettings);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
