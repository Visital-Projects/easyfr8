import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const pool = getPool();
    const [rows]: any = await pool.query(`
      SELECT 
        b.*,
        ft.name AS freight_type_name,
        st.name AS shipment_type_name,
        t.name AS term_name,
        p_load.port_name AS loading_port_name,
        p_load.port_code AS loading_port_code,
        p_dis.port_name AS discharge_port_name,
        p_dis.port_code AS discharge_port_code,
        c.name AS container_name
      FROM bookings b
      LEFT JOIN freight_types ft ON b.freight_type_id = ft.id
      LEFT JOIN shipment_types st ON b.shipment_type_id = st.id
      LEFT JOIN terms t ON b.term_id = t.id
      LEFT JOIN ports p_load ON b.loading_port_id = p_load.id
      LEFT JOIN ports p_dis ON b.discharge_port_id = p_dis.id
      LEFT JOIN containers c ON b.container_id = c.id
      ORDER BY b.created_at DESC
    `);
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      user_name, 
      email, 
      phone, 
      freight_type_id, 
      shipment_type_id, 
      term_id, 
      loading_port_id, 
      discharge_port_id, 
      container_id, 
      cargo_details 
    } = body;
    
    const pool = getPool();
    
    // Generate a unique booking number
    const booking_no = `BK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const id = `bk-${Math.floor(100000 + Math.random() * 900000)}`;
    
    await pool.query(
      `INSERT INTO bookings 
        (id, booking_no, user_name, email, phone, freight_type_id, shipment_type_id, 
         term_id, loading_port_id, discharge_port_id, container_id, cargo_details, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [
        id,
        booking_no,
        user_name,
        email,
        phone || '',
        freight_type_id,
        shipment_type_id,
        term_id,
        loading_port_id,
        discharge_port_id,
        container_id || null,
        cargo_details || '',
      ]
    );
    
    return NextResponse.json({ success: true, booking_no });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
