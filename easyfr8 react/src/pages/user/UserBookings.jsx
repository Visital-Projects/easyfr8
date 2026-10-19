import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { parseBookingCargoDetails, formatDimensions } from '../../utils/bookingUtils';
import './user-portal.css';

export default function UserBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedBookingId, setExpandedBookingId] = useState(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/bookings');
      setBookings(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err.message || 'Failed to retrieve bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filteredBookings = bookings.filter((b) => {
    const matchesStatus =
      statusFilter === 'All' || (b.status || '').toLowerCase() === statusFilter.toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      b.booking_no?.toLowerCase().includes(q) ||
      b.loading_port_name?.toLowerCase().includes(q) ||
      b.loading_port_code?.toLowerCase().includes(q) ||
      b.discharge_port_name?.toLowerCase().includes(q) ||
      b.discharge_port_code?.toLowerCase().includes(q) ||
      b.container_name?.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  return (
    <div>
      {/* Header Card */}
      <div className="portal-card" style={{ background: 'linear-gradient(to right, #ffffff, #f8fafc)', marginBottom: '25px' }}>
        <div className="portal-card-body" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#0f2042' }}>
                <i className="fa fa-ship" style={{ color: '#0284c7', marginRight: '8px' }}></i>
                My Freight Bookings
              </h3>
              <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#64748b' }}>
                Track your ocean and air freight bookings, container specifications, and shipment status.
              </p>
            </div>
            <Link to="/booking" className="portal-btn-quote">
              <i className="fa fa-plus-circle"></i> Create New Booking
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="portal-alert error" style={{ marginBottom: '20px' }}>
          <i className="fa fa-exclamation-triangle"></i>
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchBookings}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: '1px solid #f87171',
              color: '#b91c1c',
              padding: '2px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="portal-card" style={{ marginBottom: '20px' }}>
        <div className="portal-card-body" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['All', 'Pending', 'Confirmed', 'Completed'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: statusFilter === st ? '1px solid #0284c7' : '1px solid #e2e8f0',
                    background: statusFilter === st ? '#eff6ff' : '#ffffff',
                    color: statusFilter === st ? '#1d4ed8' : '#64748b',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', minWidth: '240px' }}>
              <input
                type="text"
                placeholder="Search booking ref, port..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
              <i
                className="fa fa-search"
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  fontSize: '13px',
                }}
              ></i>
            </div>
          </div>
        </div>
      </div>

      {/* Bookings Table Card */}
      <div className="portal-card">
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 className="portal-card-title">
            <i className="fa fa-list"></i> All Bookings ({filteredBookings.length})
          </h4>
        </div>

        <div className="portal-table-wrap">
          {loading ? (
            <div style={{ padding: '50px', textAlign: 'center' }}>
              <i className="fa fa-spinner fa-spin fa-2x" style={{ color: '#0284c7' }}></i>
              <p style={{ marginTop: '10px', fontSize: '13px', color: '#64748b' }}>Loading bookings...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="portal-empty-state" style={{ padding: '50px 20px' }}>
              <i className="fa fa-ship" style={{ fontSize: '48px', color: '#cbd5e1' }}></i>
              <h5 style={{ margin: '14px 0 6px 0', fontSize: '16px' }}>No Bookings Match Criteria</h5>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                {searchQuery || statusFilter !== 'All'
                  ? 'Try adjusting your filters or search keywords.'
                  : 'You have not submitted any freight bookings yet.'}
              </p>
              <Link to="/booking" className="portal-btn-primary" style={{ padding: '9px 20px', fontSize: '13px' }}>
                <i className="fa fa-plus"></i> Book a Freight Shipment
              </Link>
            </div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Booking Ref / Date</th>
                  <th>Route &amp; Mode</th>
                  <th>Container / Dimensions</th>
                  <th>Incoterms</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => {
                  const specs = parseBookingCargoDetails(b.cargo_details, b.container_name);
                  const isExpanded = expandedBookingId === b.id;
                  const st = (b.status || '').toLowerCase();
                  const badgeClass = st === 'confirmed' ? 'confirmed' : st === 'completed' ? 'completed' : 'pending';
                  const dateStr = b.created_at
                    ? new Date(b.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                    : 'N/A';

                  return (
                    <React.Fragment key={b.id}>
                      <tr>
                        <td>
                          <strong style={{ color: '#0f2042', display: 'block', fontSize: '13px' }}>
                            {b.booking_no}
                          </strong>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>{dateStr}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px' }}>
                            {b.loading_port_name || b.loading_port_code || 'Origin'} → {b.discharge_port_name || b.discharge_port_code || 'Destination'}
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {b.freight_type_name || 'Ocean Freight'} • {b.shipment_type_name || 'FCL'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: '13px', color: '#1e293b' }}>
                            <strong>{b.container_name || specs.containers[0]?.equipment || 'Container'}</strong>
                            {specs.containers[0]?.quantity && ` × ${specs.containers[0]?.quantity}`}
                          </div>
                          {specs.dimensions && (
                            <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '2px' }}>
                              <i className="fa fa-arrows-alt" style={{ fontSize: '10px' }}></i> {formatDimensions(specs.dimensions)}
                            </div>
                          )}
                          {specs.weight && (
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              Weight: {specs.weight}
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                            {b.term_name || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: '#0f2042', fontSize: '14px' }}>
                            {b.price != null ? `$${parseFloat(b.price).toFixed(2)}` : 'N/A'}
                          </strong>
                          <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>
                            {b.currency || 'USD'}
                          </span>
                        </td>
                        <td>
                          <span className={`portal-badge ${badgeClass}`}>
                            {b.status}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => setExpandedBookingId(isExpanded ? null : b.id)}
                            style={{
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              padding: '5px 10px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>{isExpanded ? 'Hide' : 'View'}</span>
                            <i className={`fa fa-chevron-${isExpanded ? 'up' : 'down'}`} style={{ fontSize: '10px' }}></i>
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={7} style={{ background: '#f8fafc', padding: '18px 22px', borderTop: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                              <div>
                                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                                  Container Details
                                </span>
                                {specs.containers.length > 0 ? (
                                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '16px', fontSize: '12px', color: '#334155' }}>
                                    {specs.containers.map((c, i) => (
                                      <li key={i} style={{ marginBottom: '4px' }}>
                                        <strong>Container #{c.index}:</strong> {c.equipment} | Qty: {c.quantity} | Weight: {c.weight || 'N/A'}
                                        {c.dimensions && (
                                          <div>
                                            Dimensions: <strong>{formatDimensions(c.dimensions)}</strong>
                                          </div>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
                                    {b.container_name || 'Standard Equipment'}
                                  </div>
                                )}
                              </div>

                              <div>
                                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                                  Routing &amp; Ports
                                </span>
                                <div style={{ fontSize: '12px', color: '#334155', marginTop: '6px', lineHeight: '1.6' }}>
                                  <div>Port of Loading: <strong>{b.loading_port_name} ({b.loading_port_code})</strong></div>
                                  {b.transhipment_port_code ? (
                                    <div>Transshipment Port: <strong style={{ color: '#d64238' }}>{b.transhipment_port_name} ({b.transhipment_port_code})</strong></div>
                                  ) : null}
                                  <div>Port of Discharge: <strong>{b.discharge_port_name} ({b.discharge_port_code})</strong></div>
                                  {specs.finalDelivery && <div>Final Delivery: <strong>{specs.finalDelivery}</strong></div>}
                                  {b.transit_time && <div>Transit Time: <strong>{b.transit_time} Days</strong></div>}
                                </div>
                              </div>

                              <div>
                                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                                  Instructions &amp; Commercial Terms
                                </span>
                                <div style={{ fontSize: '12px', color: '#334155', marginTop: '6px', lineHeight: '1.6' }}>
                                  <div>Incoterms: <strong>{b.term_name || 'N/A'}</strong></div>
                                  <div>Remarks: {specs.remarks || 'None'}</div>
                                  <div>Special Instructions: {specs.specialInstructions || 'None'}</div>
                                  {b.freight_rate_id && (
                                    <div>
                                      Rate ID: <strong>{b.freight_rate_id}</strong>
                                      {(Number(b.freight_rate_local_thc) > 0 || Number(b.freight_rate_other_charges) > 0) && (
                                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                          Local THC: ${parseFloat(b.freight_rate_local_thc || 0).toFixed(2)} | Other Charges: ${parseFloat(b.freight_rate_other_charges || 0).toFixed(2)}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
