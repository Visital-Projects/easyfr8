import { NextResponse } from 'next/server';
import { execute, getEnquiries } from '@/lib/db';
import { Enquiry } from '@/lib/store';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const auth = authenticateRequest(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const allEnquiries = await getEnquiries();

    // Administrator and Manager can see all enquiries
    const role = (auth.user.role || '').toLowerCase().trim();
    if (role === 'administrator' || role === 'manager') {
      return NextResponse.json(allEnquiries);
    }

    // Customer (shipper) sees only enquiries submitted with their account email
    const userEmail = (auth.user.email || '').toLowerCase().trim();
    const filtered = allEnquiries.filter((enq) => (enq.email || '').toLowerCase().trim() === userEmail);
    return NextResponse.json(filtered);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ── Backend Validation ──────────────────────────────────────────────────
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';

    if (!name || name.length < 2) {
      return NextResponse.json({ success: false, error: 'Full name is required (minimum 2 characters).' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'A valid email address is required.' }, { status: 400 });
    }

    // Determine subject
    let subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    if (!subject) {
      if (body.origin || body.destination) {
        subject = `Route Enquiry — ${body.origin || 'Unknown'} to ${body.destination || 'Unknown'}`;
      } else {
        subject = body.service || 'Freight Rate Enquiry';
      }
    }

    // Compose formatted notes with route context if available
    let notes = '';
    const hasRouteContext = body.origin || body.destination || body.freight_type || body.container_type;
    if (hasRouteContext) {
      const parts: string[] = ['=== Route & Shipment Details ==='];
      if (body.origin) parts.push(`Origin: ${body.origin}`);
      if (body.destination) parts.push(`Destination: ${body.destination}`);
      if (body.freight_type) parts.push(`Freight Mode: ${body.freight_type}`);
      if (body.shipment_type) parts.push(`Shipment Type: ${body.shipment_type}`);
      if (body.container_type) parts.push(`Container / Load: ${body.container_type}`);
      if (body.weight) parts.push(`Weight: ${body.weight}`);
      parts.push('================================');
      const userMessage = body.message || body.notes || '';
      if (userMessage) {
        parts.push(`Customer Message:\n${userMessage}`);
      }
      notes = parts.join('\n');
    } else {
      notes = body.message || body.notes || '';
    }

    const id = `ENQ-${Date.now()}`;
    const source = body.source || 'Port Enquiry';
    const status = 'New';
    const assignedTo = '';

    await execute(`
      INSERT INTO enquiries (id, name, email, phone, subject, notes, assigned_to, source, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [id, name, email, phone, subject, notes, assignedTo, source, status]);

    const newEnq: Enquiry = {
      id,
      name,
      email,
      phone,
      subject,
      date: new Date().toISOString().split('T')[0],
      status: 'New',
      notes,
      assignedTo: '',
      source,
    };

    return NextResponse.json({ success: true, enquiry: newEnq }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
