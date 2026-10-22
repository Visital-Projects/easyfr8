import { NextResponse } from 'next/server';
import { execute, getEnquiries, getPool } from '@/lib/db';
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

    const pool = getPool();

    // Verify container exists if container_id provided
    let containerRecord: any = null;
    if (body.container_id) {
      const [cRows]: any = await pool.query(
        'SELECT id, name, size FROM containers WHERE id = ? OR name = ?',
        [body.container_id, body.container_id]
      );
      if (cRows.length > 0) {
        containerRecord = cRows[0];
      } else {
        return NextResponse.json(
          { success: false, error: `Referenced container '${body.container_id}' was not found in the database.` },
          { status: 400 }
        );
      }
    }

    // Verify route exists if route_id provided
    if (body.route_id) {
      const [rRows]: any = await pool.query(
        'SELECT id FROM freight_rates WHERE id = ?',
        [body.route_id]
      );
      // Log for audit; if route_id is a valid freight_rates ID, we record it
    }

    // Capture authenticated shipper details if token provided
    const auth = authenticateRequest(req);
    const authenticatedUserId = auth.authenticated && auth.user ? auth.user.id : (body.user_id || body.accountId || '');

    // Determine subject
    let subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    if (!subject) {
      if (body.origin || body.destination) {
        const contSuffix = (containerRecord?.name || body.container_type) ? ` — ${containerRecord?.name || body.container_type}` : '';
        subject = `Route Enquiry — ${body.origin || 'Unknown'} to ${body.destination || 'Unknown'}${contSuffix}`;
      } else {
        subject = body.service || 'Freight Rate Enquiry';
      }
    }

    // Compose formatted notes with route, container, and user context
    let notes = '';
    const hasRouteContext = body.origin || body.destination || body.freight_type || body.container_type || body.container_id;
    if (hasRouteContext) {
      const parts: string[] = ['=== Route & Shipment Details ==='];
      if (body.origin) parts.push(`Origin: ${body.origin}`);
      if (body.destination) parts.push(`Destination: ${body.destination}`);
      if (body.transhipment) parts.push(`Transshipment: ${body.transhipment}`);
      if (body.route_id) parts.push(`Route ID: ${body.route_id}`);
      if (body.carrier) parts.push(`Carrier: ${body.carrier}`);
      if (body.transit_time) parts.push(`Transit Time: ${body.transit_time} Days`);
      if (body.freight_type) parts.push(`Freight Mode: ${body.freight_type}`);
      if (body.shipment_type) parts.push(`Shipment Type: ${body.shipment_type}`);
      if (body.container_id || body.container_type || containerRecord) {
        const contLabel = containerRecord ? `${containerRecord.name} (ID: ${containerRecord.id})` : `${body.container_type || ''} (ID: ${body.container_id || 'N/A'})`;
        parts.push(`Container: ${contLabel}`);
      }
      if (body.quantity) parts.push(`Required Quantity: ${body.quantity}`);
      if (authenticatedUserId) parts.push(`Shipper User ID: ${authenticatedUserId}`);
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

    await pool.query(`
      INSERT INTO enquiries (id, name, email, phone, subject, notes, assigned_to, source, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [id, name, email, phone, subject, notes, assignedTo, source, status]);

    // Confirm persistence by retrieving the saved enquiry directly from MySQL
    const [savedRows]: any = await pool.query('SELECT * FROM enquiries WHERE id = ?', [id]);
    if (!savedRows || savedRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Database persistence could not be verified.' }, { status: 500 });
    }

    const saved = savedRows[0];
    const newEnq: Enquiry = {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      phone: saved.phone,
      subject: saved.subject,
      date: new Date(saved.created_at).toISOString().split('T')[0],
      status: saved.status,
      notes: saved.notes,
      assignedTo: saved.assigned_to || '',
      source: saved.source,
    };

    return NextResponse.json({ success: true, enquiry: newEnq }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
