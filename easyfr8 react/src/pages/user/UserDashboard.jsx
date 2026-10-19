import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserAuth } from './UserAuthContext';
import api from '../../services/api';
import { parseBookingCargoDetails, formatDimensions } from '../../utils/bookingUtils';
import RouteEnquiryModal from '../../components/RouteEnquiryModal';
import './user-portal.css';

export default function UserDashboard() {
  const { user } = useUserAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingsError, setBookingsError] = useState(null);
  const [expandedBookingId, setExpandedBookingId] = useState(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      setBookingsError(null);

      // Concurrent fetch for real shipper data including bookings
      const [enqRes, docRes, bkgRes] = await Promise.all([
        api.get('/enquiries').catch((err) => {
          console.warn('Failed to load enquiries:', err);
          return [];
        }),
        api.get('/documents').catch((err) => {
          console.warn('Failed to load documents:', err);
          return [];
        }),
        api.get('/bookings').catch((err) => {
          console.error('Failed to load bookings:', err);
          setBookingsError(err.message || 'Failed to retrieve bookings.');
          return null;
        }),
      ]);

      setEnquiries(Array.isArray(enqRes) ? enqRes : []);
      setDocuments(Array.isArray(docRes) ? docRes : []);
      if (Array.isArray(bkgRes)) {
        setBookings(bkgRes);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve operational metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute operational metrics strictly from real data
  const totalEnquiries = enquiries.length;
  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter((b) => (b.status || '').toLowerCase() === 'pending').length;
  const confirmedBookings = bookings.filter((b) => (b.status || '').toLowerCase() === 'confirmed').length;

  // Pending Actions:
  // 1. Documents pending administrative review (status === 'Pending Review' or 'Pending')
  // 2. Documents rejected needing re-upload (status === 'Rejected')
  // 3. Enquiries waiting in active progress without quote (status === 'In Progress' or 'New'/'Received')
  const pendingDocs = documents.filter(
    (d) => d.status === 'Pending Review' || d.status === 'Pending'
  ).length;

  const rejectedDocs = documents.filter((d) => d.status === 'Rejected').length;

  const activeEnquiries = enquiries.filter(
    (e) => e.status !== 'Closed' && e.status !== 'Responded'
  ).length;

  const respondedEnquiries = enquiries.filter((e) => e.status === 'Responded').length;

  const totalPendingActions = pendingDocs + rejectedDocs + activeEnquiries + pendingBookings;

  const shipperName = user?.name || 'Shipper';

  return (
    <div>
      {/* Welcome Section */}
      <div className="portal-card" style={{ background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
        <div className="portal-card-body" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#0f2042' }}>
                Welcome, {shipperName}!
              </h3>
              <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#64748b' }}>
                Here is your operational shipment summary and active compliance overview.
              </p>
            </div>
            <button
              type="button"
              className="portal-btn-quote"
              onClick={() => setIsQuoteModalOpen(true)}
            >
              <i className="fa fa-paper-plane"></i> Submit New Quote Request
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="portal-alert error">
          <i className="fa fa-exclamation-triangle"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Operational Metrics Cards */}
      <div className="portal-metrics-grid">
        <div className="portal-metric-card">
          <div className="portal-metric-info">
            <h4>Total Enquiries Submitted</h4>
            <div className="value">{loading ? '...' : totalEnquiries}</div>
            <div className="subtext">Lifetime freight quote requests</div>
          </div>
          <div className="portal-metric-icon blue">
            <i className="fa fa-cubes"></i>
          </div>
        </div>

        <div className="portal-metric-card">
          <div className="portal-metric-info">
            <h4>Pending Actions</h4>
            <div className="value" style={{ color: totalPendingActions > 0 ? '#d97706' : '#0f2042' }}>
              {loading ? '...' : totalPendingActions}
            </div>
            <div className="subtext">
              {pendingDocs} doc{pendingDocs !== 1 ? 's' : ''} in review &bull; {activeEnquiries} active enquir{activeEnquiries !== 1 ? 'ies' : 'y'}
            </div>
          </div>
          <div className="portal-metric-icon amber">
            <i className="fa fa-clock-o"></i>
          </div>
        </div>

        <div className="portal-metric-card">
          <div className="portal-metric-info">
            <h4>Quotation Responses</h4>
            <div className="value" style={{ color: '#059669' }}>
              {loading ? '...' : respondedEnquiries}
            </div>
            <div className="subtext">Ready for review &amp; PDF download</div>
          </div>
          <div className="portal-metric-icon green">
            <i className="fa fa-file-pdf-o"></i>
          </div>
        </div>

        <div className="portal-metric-card">
          <div className="portal-metric-info">
            <h4>Uploaded Compliance Docs</h4>
            <div className="value">{loading ? '...' : documents.length}</div>
            <div className="subtext">KYC &amp; shipping documentation</div>
          </div>
          <div className="portal-metric-icon purple">
            <i className="fa fa-shield"></i>
          </div>
        </div>
        <div className="portal-metric-card">
          <div className="portal-metric-info">
            <h4>My Freight Bookings</h4>
            <div className="value" style={{ color: '#0284c7' }}>{loading ? '...' : totalBookings}</div>
            <div className="subtext">
              {pendingBookings} pending &bull; {confirmedBookings} confirmed
            </div>
          </div>
          <div className="portal-metric-icon blue">
            <i className="fa fa-ship"></i>
          </div>
        </div>
      </div>

      {/* Quick Action Links */}
      <div className="portal-card">
        <div className="portal-card-header">
          <h4 className="portal-card-title">
            <i className="fa fa-bolt" style={{ color: '#e5a93c' }}></i> Quick Actions
          </h4>
        </div>
        <div className="portal-card-body">
          <div className="portal-quick-actions">
            <Link to="/user/bookings" className="portal-action-btn">
              <div className="portal-action-btn-icon" style={{ backgroundColor: '#f0fdf4', color: '#059669' }}>
                <i className="fa fa-ship"></i>
              </div>
              <div className="portal-action-btn-text">
                <h5>My Freight Bookings</h5>
                <p>Track container shipments, dimensions &amp; booking status</p>
              </div>
            </Link>

            <Link to="/user/documents" className="portal-action-btn">
              <div className="portal-action-btn-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                <i className="fa fa-cloud-upload"></i>
              </div>
              <div className="portal-action-btn-text">
                <h5>Upload Key Documents</h5>
                <p>Upload PAN, GST certificates, Commercial Invoices &amp; BL</p>
              </div>
            </Link>

            <Link to="/user/enquiries" className="portal-action-btn">
              <div className="portal-action-btn-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
                <i className="fa fa-search"></i>
              </div>
              <div className="portal-action-btn-text">
                <h5>Check Enquiry Status</h5>
                <p>Track responses, admin notes, and download official quotations</p>
              </div>
            </Link>

            <div
              className="portal-action-btn"
              onClick={() => setIsQuoteModalOpen(true)}
              role="button"
              tabIndex={0}
            >
              <div className="portal-action-btn-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                <i className="fa fa-calculator"></i>
              </div>
              <div className="portal-action-btn-text">
                <h5>Submit New Quote Request</h5>
                <p>Request instant pricing for Ocean, Air, or Multimodal routes</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── My Freight Bookings Section ── */}
      <div className="portal-card" style={{ marginBottom: '25px' }}>
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 className="portal-card-title">
              <i className="fa fa-ship" style={{ color: '#0284c7' }}></i> My Freight Bookings
            </h4>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Confirmed rate bookings &amp; active container shipments
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link
              to="/user/bookings"
              style={{ fontSize: '13px', fontWeight: 600, color: '#0284c7', textDecoration: 'none' }}
            >
              View All Bookings &rarr;
            </Link>
            <Link
              to="/booking"
              className="portal-btn-quote"
              style={{ padding: '6px 14px', fontSize: '12px' }}
            >
              <i className="fa fa-plus"></i> New Booking
            </Link>
          </div>
        </div>

        {bookingsError && (
          <div className="portal-alert error" style={{ margin: '15px 20px 0' }}>
            <i className="fa fa-exclamation-circle"></i>
            <span>{bookingsError}</span>
            <button
              type="button"
              onClick={fetchData}
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

        <div className="portal-table-wrap">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <i className="fa fa-spinner fa-spin fa-2x" style={{ color: '#0284c7' }}></i>
              <p style={{ marginTop: '10px', fontSize: '13px', color: '#64748b' }}>Loading your bookings...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="portal-empty-state" style={{ padding: '40px 20px' }}>
              <i className="fa fa-ship" style={{ fontSize: '42px', color: '#cbd5e1' }}></i>
              <h5 style={{ margin: '12px 0 6px 0', fontSize: '16px' }}>No Freight Bookings Found</h5>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                You have not submitted any freight bookings yet.
              </p>
              <Link to="/booking" className="portal-btn-primary" style={{ padding: '9px 18px', fontSize: '13px' }}>
                <i className="fa fa-plus"></i> Create Your First Booking
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
                {bookings.map((b) => {
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
                          <td colSpan={7} style={{ background: '#f8fafc', padding: '16px 20px', borderTop: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
                              <div>
                                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                                  Container Breakdown
                                </span>
                                {specs.containers.length > 0 ? (
                                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', fontSize: '12px', color: '#334155' }}>
                                    {specs.containers.map((c, i) => (
                                      <li key={i} style={{ marginBottom: '4px' }}>
                                        <strong>Container #{c.index}:</strong> {c.equipment} | Qty: {c.quantity} | Weight: {c.weight || 'N/A'}
                                        {c.dimensions && (
                                          <div>Dimensions: <strong>{formatDimensions(c.dimensions)}</strong></div>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div style={{ fontSize: '12px', color: '#334155' }}>{b.container_name || 'Standard Equipment'}</div>
                                )}
                              </div>

                              <div>
                                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                                  Routing &amp; Ports
                                </span>
                                <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
                                  <div>Port of Loading: <strong>{b.loading_port_name} ({b.loading_port_code})</strong></div>
                                  <div>Port of Discharge: <strong>{b.discharge_port_name} ({b.discharge_port_code})</strong></div>
                                  {specs.finalDelivery && <div>Final Place: <strong>{specs.finalDelivery}</strong></div>}
                                  {b.transit_time && <div>Transit Time: <strong>{b.transit_time} Days</strong></div>}
                                </div>
                              </div>

                              <div>
                                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                                  Instructions &amp; Commercial Terms
                                </span>
                                <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
                                  <div>Incoterms: <strong>{b.term_name || 'N/A'}</strong></div>
                                  <div>Remarks: {specs.remarks || 'None'}</div>
                                  <div>Special Instructions: {specs.specialInstructions || 'None'}</div>
                                  {b.freight_rate_id && <div>Rate ID: {b.freight_rate_id}</div>}
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

      {/* Recent Enquiries & Compliance Overview Split */}
      <div className="row">
        <div className="col-md-7">
          <div className="portal-card">
            <div className="portal-card-header">
              <h4 className="portal-card-title">
                <i className="fa fa-history"></i> Recent Shipment Enquiries
              </h4>
              <Link to="/user/enquiries" style={{ fontSize: '13px', fontWeight: 600, color: '#0f2042' }}>
                View All &rarr;
              </Link>
            </div>
            <div className="portal-table-wrap">
              {loading ? (
                <div style={{ padding: '30px', textAlign: 'center' }}>
                  <i className="fa fa-spinner fa-spin fa-2x"></i>
                </div>
              ) : enquiries.length === 0 ? (
                <div className="portal-empty-state">
                  <i className="fa fa-folder-open-o"></i>
                  <h5>No Enquiries Submitted Yet</h5>
                  <p>Submit your first freight enquiry to view real-time tracking.</p>
                </div>
              ) : (
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Ref ID</th>
                      <th>Subject / Route</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enquiries.slice(0, 5).map((enq) => {
                      let badgeClass = 'received';
                      let statusText = 'Received';
                      const st = (enq.status || '').toLowerCase();
                      if (st === 'responded') {
                        badgeClass = 'responded';
                        statusText = 'Responded';
                      } else if (st === 'in progress') {
                        badgeClass = 'inprogress';
                        statusText = 'In Progress';
                      }

                      return (
                        <tr key={enq.id}>
                          <td>
                            <strong style={{ color: '#0f2042' }}>{enq.id}</strong>
                          </td>
                          <td>{enq.subject || 'Freight Rate Request'}</td>
                          <td>
                            <span className={`portal-badge ${badgeClass}`}>
                              {statusText}
                            </span>
                          </td>
                          <td>{enq.date || new Date().toISOString().split('T')[0]}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-5">
          <div className="portal-card">
            <div className="portal-card-header">
              <h4 className="portal-card-title">
                <i className="fa fa-check-square-o"></i> Compliance Review Status
              </h4>
              <Link to="/user/documents" style={{ fontSize: '13px', fontWeight: 600, color: '#0f2042' }}>
                Manage Docs &rarr;
              </Link>
            </div>
            <div className="portal-card-body">
              {loading ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <i className="fa fa-spinner fa-spin"></i>
                </div>
              ) : documents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '15px' }}>
                  <i className="fa fa-id-card-o" style={{ fontSize: '36px', color: '#cbd5e1' }}></i>
                  <h5 style={{ margin: '10px 0 4px 0', fontSize: '14px', fontWeight: 600 }}>No Documents Uploaded</h5>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 15px 0' }}>
                    Upload PAN and GST certificates to complete shipper compliance.
                  </p>
                  <Link to="/user/documents" className="portal-btn-primary" style={{ fontSize: '12px', padding: '8px 14px' }}>
                    <i className="fa fa-upload"></i> Upload KYC Now
                  </Link>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {documents.slice(0, 4).map((doc) => {
                      let badgeClass = 'pending';
                      let statusText = 'Pending';
                      if (doc.status === 'Approved') {
                        badgeClass = 'approved';
                        statusText = 'Approved';
                      } else if (doc.status === 'Rejected') {
                        badgeClass = 'rejected';
                        statusText = 'Rejected';
                      }

                      return (
                        <div
                          key={doc.id}
                          style={{
                            padding: '10px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: '13px', color: '#0f2042', display: 'block' }}>
                              {doc.name}
                            </strong>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>{doc.type}</span>
                          </div>
                          <span className={`portal-badge ${badgeClass}`}>{statusText}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quote Modal */}
      <RouteEnquiryModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        searchContext={{
          reason: 'dashboard_quote_request',
          modeName: 'Ocean Freight',
          originText: 'Origin Port',
          destinationText: 'Destination Port',
        }}
        onSuccess={() => {
          setIsQuoteModalOpen(false);
          fetchData();
        }}
      />
    </div>
  );
}
