'use client';

import React, { useState, useEffect } from 'react';

interface Booking {
  id: string;
  booking_no: string;
  user_name: string;
  email: string;
  phone: string;
  freight_type_id: string;
  shipment_type_id: string;
  term_id: string;
  loading_port_id: string;
  discharge_port_id: string;
  container_id: string;
  cargo_details: string;
  status: 'Pending' | 'Confirmed' | 'Completed';
  created_at: string;
  freight_type_name?: string;
  shipment_type_name?: string;
  term_name?: string;
  loading_port_name?: string;
  loading_port_code?: string;
  discharge_port_name?: string;
  discharge_port_code?: string;
  container_name?: string;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bookings');
      const data = await res.json();
      if (Array.isArray(data)) {
        setBookings(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleStatusChange = async (id: string, newStatus: 'Pending' | 'Confirmed' | 'Completed') => {
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchBookings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(`Are you sure you want to permanently delete Booking ${id}?`)) {
      try {
        const res = await fetch(`/api/bookings/${id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          fetchBookings();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredBookings = bookings.filter((b) =>
    b.booking_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Freight Bookings</h1>
          <p className="page-subtitle">Manage client shipments, change booking status, and view cargo details.</p>
        </div>
      </div>

      <div className="table-filter-panel" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
        <div style={{ width: '100%', maxWidth: '320px' }}>
          <input
            type="text"
            className="form-control"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by booking no, name or email..."
            style={{ height: '36px' }}
          />
        </div>
      </div>

      <div className="chart-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking No</th>
                <th>Client</th>
                <th>Route</th>
                <th>Mode / Type</th>
                <th>Container & Incoterm</th>
                <th>Cargo Details</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>Loading...</td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>No bookings found.</td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                      <div>{b.booking_no}</div>
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '3px' }}>
                        {new Date(b.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{b.user_name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{b.email}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{b.phone}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>
                        {b.loading_port_name} ({b.loading_port_code})
                      </div>
                      <div style={{ fontSize: '12px', color: '#888' }}>to</div>
                      <div style={{ fontWeight: 500 }}>
                        {b.discharge_port_name} ({b.discharge_port_code})
                      </div>
                    </td>
                    <td>
                      <div>{b.freight_type_name}</div>
                      <div style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>{b.shipment_type_name}</div>
                    </td>
                    <td>
                      <div>{b.container_name || 'LCL/Air Cargo'}</div>
                      <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>Incoterm: {b.term_name || 'N/A'}</div>
                    </td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'normal', fontSize: '12px', color: '#555' }}>
                      {b.cargo_details || '—'}
                    </td>
                    <td>
                      <select
                        value={b.status}
                        onChange={(e) => handleStatusChange(b.id, e.target.value as any)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid #ccc',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: b.status === 'Completed' ? '#d4edda' : b.status === 'Confirmed' ? '#cce5ff' : '#fff3cd',
                          color: b.status === 'Completed' ? '#155724' : b.status === 'Confirmed' ? '#004085' : '#856404'
                        }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => handleDelete(b.id)} 
                        style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'red' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
