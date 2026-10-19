import React, { useState, useEffect } from 'react';
import { useUserAuth } from './UserAuthContext';
import api from '../../services/api';
import RouteEnquiryModal from '../../components/RouteEnquiryModal';
import './user-portal.css';

export default function UserEnquiries() {
  const { user } = useUserAuth();

  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Received' | 'In Progress' | 'Responded'

  // Modal / Detail States
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/enquiries');
      setEnquiries(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err.message || 'Failed to retrieve enquiries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  // Map backend status to exact documented status indicators
  const getDisplayStatus = (status) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'responded') return 'Responded';
    if (s === 'in progress') return 'In Progress';
    return 'Received'; // default or 'new'
  };

  const getBadgeClass = (displayStatus) => {
    if (displayStatus === 'Responded') return 'responded';
    if (displayStatus === 'In Progress') return 'inprogress';
    return 'received';
  };

  // Filtered list
  const filteredEnquiries = enquiries.filter((enq) => {
    const dispStatus = getDisplayStatus(enq.status);
    const matchesStatus = statusFilter === 'All' || dispStatus === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      enq.id?.toLowerCase().includes(q) ||
      enq.subject?.toLowerCase().includes(q) ||
      enq.notes?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  // Generate downloadable official PDF quotation
  const handleDownloadQuotationPDF = (enq) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked. Please allow pop-ups to view the quotation document.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>EasyFr8 Official Quotation - ${enq.id}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 40px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f2042; padding-bottom: 20px; }
          .logo { font-size: 26px; font-weight: 800; color: #0f2042; }
          .logo span { color: #e5a93c; }
          .badge { background: #ecfdf5; color: #047857; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; border: 1px solid #a7f3d0; }
          .section { margin-top: 30px; }
          .section-title { font-size: 15px; font-weight: 700; color: #0f2042; text-transform: uppercase; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px; }
          .grid div strong { color: #475569; display: block; font-size: 12px; text-transform: uppercase; }
          .notes-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-top: 15px; font-size: 14px; line-height: 1.6; white-space: pre-line; }
          .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #94a3b8; text-align: center; }
          @media print {
            .no-print { display: none; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="background: #0f2042; color: white; border: none; padding: 10px 20px; font-weight: 600; border-radius: 6px; cursor: pointer;">
            Print / Save as PDF
          </button>
        </div>
        <div class="header">
          <div class="logo">Easy<span>Fr8</span><br><span style="font-size: 13px; font-weight: 500; color: #64748b;">Global Logistics & Freight Solutions</span></div>
          <div>
            <span class="badge">OFFICIAL FREIGHT QUOTATION</span>
            <div style="font-size: 12px; color: #64748b; margin-top: 6px; text-align: right;">Date: ${enq.date || new Date().toISOString().split('T')[0]}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Enquiry & Shipper Details</div>
          <div class="grid">
            <div>
              <strong>Enquiry Reference</strong>
              <span>${enq.id}</span>
            </div>
            <div>
              <strong>Subject / Route</strong>
              <span>${enq.subject || 'Freight Quotation Request'}</span>
            </div>
            <div>
              <strong>Shipper Name</strong>
              <span>${enq.name || user?.name || 'Registered Shipper'}</span>
            </div>
            <div>
              <strong>Email Address</strong>
              <span>${enq.email || user?.email || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Official Administrator Notes & Pricing Response</div>
          <div class="notes-box">
            ${enq.notes || 'Official pricing response verified by EasyFr8 operations desk.'}
          </div>
        </div>

        <div class="footer">
          EasyFr8 Logistics Platform &bull; Value Envision India Pvt Ltd &bull; Email: support@easyfr8.com &bull; Confidential
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div>
      {/* Header & Controls */}
      <div className="portal-card">
        <div className="portal-card-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f2042' }}>
              <i className="fa fa-exchange text-primary"></i> Enquiry Tracker &amp; Communication
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Track lifecycle updates, read administrative notes, and download official PDF quotation documents.
            </p>
          </div>
          <button
            type="button"
            className="portal-btn-quote"
            onClick={() => setIsQuoteModalOpen(true)}
          >
            <i className="fa fa-plus-circle"></i> New Shipment Enquiry
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px',
          }}
        >
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['All', 'Received', 'In Progress', 'Responded'].map((st) => (
              <button
                key={st}
                type="button"
                className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-default'}`}
                onClick={() => setStatusFilter(st)}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ minWidth: '240px' }}>
            <input
              type="text"
              className="portal-form-control"
              placeholder="Search by ID, route, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '13px' }}
            />
          </div>
        </div>

        {error && (
          <div style={{ margin: '20px' }} className="portal-alert error">
            <i className="fa fa-exclamation-triangle"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Enquiries Table */}
        <div className="portal-table-wrap">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <i className="fa fa-spinner fa-spin fa-2x" style={{ color: '#0f2042' }}></i>
              <p style={{ marginTop: '10px', color: '#64748b' }}>Loading active enquiries...</p>
            </div>
          ) : filteredEnquiries.length === 0 ? (
            <div className="portal-empty-state">
              <i className="fa fa-inbox"></i>
              <h5>No Enquiries Found</h5>
              <p>You have no shipment enquiries matching this criteria.</p>
              <button
                type="button"
                className="portal-btn-primary"
                style={{ marginTop: '15px' }}
                onClick={() => setIsQuoteModalOpen(true)}
              >
                <i className="fa fa-paper-plane"></i> Submit New Quote Request
              </button>
            </div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Enquiry Ref</th>
                  <th>Subject / Route Context</th>
                  <th>Created Date</th>
                  <th>Status Indicator</th>
                  <th>Admin Updates</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEnquiries.map((enq) => {
                  const dispStatus = getDisplayStatus(enq.status);
                  const badgeClass = getBadgeClass(dispStatus);

                  return (
                    <tr key={enq.id}>
                      <td>
                        <strong style={{ color: '#0f2042', fontFamily: 'monospace' }}>{enq.id}</strong>
                      </td>
                      <td style={{ maxWidth: '320px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {enq.subject || 'Freight Rate Request'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {enq.notes ? enq.notes.split('\n')[0] : 'No initial notes'}
                        </div>
                      </td>
                      <td>{enq.date || new Date().toISOString().split('T')[0]}</td>
                      <td>
                        <span className={`portal-badge ${badgeClass}`}>
                          <i
                            className={
                              dispStatus === 'Responded'
                                ? 'fa fa-check-circle'
                                : dispStatus === 'In Progress'
                                ? 'fa fa-hourglass-half'
                                : 'fa fa-envelope-o'
                            }
                          ></i>{' '}
                          {dispStatus}
                        </span>
                      </td>
                      <td>
                        {dispStatus === 'Responded' ? (
                          <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                            <i className="fa fa-file-pdf-o"></i> Quotation Issued
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {enq.assignedTo ? `Assigned to ${enq.assignedTo}` : 'In queue'}
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-xs btn-primary"
                          onClick={() => setSelectedEnquiry(enq)}
                          style={{ marginRight: '6px' }}
                        >
                          <i className="fa fa-eye"></i> View Details
                        </button>
                        {dispStatus === 'Responded' && (
                          <button
                            type="button"
                            className="btn btn-xs btn-success"
                            onClick={() => handleDownloadQuotationPDF(enq)}
                            title="Download official PDF quotation"
                          >
                            <i className="fa fa-download"></i> PDF
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Enquiry Detail & Communication Drawer/Modal */}
      {selectedEnquiry && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-dialog">
            <div className="portal-modal-header">
              <div>
                <h4 style={{ margin: 0 }}>
                  Enquiry Details &bull; <span style={{ color: '#0f2042' }}>{selectedEnquiry.id}</span>
                </h4>
                <span className={`portal-badge ${getBadgeClass(getDisplayStatus(selectedEnquiry.status))}`} style={{ marginTop: '6px' }}>
                  Status: {getDisplayStatus(selectedEnquiry.status)}
                </span>
              </div>
              <button
                type="button"
                className="portal-modal-close"
                onClick={() => setSelectedEnquiry(null)}
              >
                &times;
              </button>
            </div>
            <div className="portal-modal-body">
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ display: 'block', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                  Subject / Route
                </strong>
                <h5 style={{ margin: '4px 0 0 0', fontSize: '16px', color: '#0f2042' }}>
                  {selectedEnquiry.subject || 'Freight Rate Request'}
                </h5>
              </div>

              {/* Quotation Download Banner if Responded */}
              {getDisplayStatus(selectedEnquiry.status) === 'Responded' && (
                <div className="portal-quotation-box">
                  <div className="portal-quotation-info">
                    <h5>
                      <i className="fa fa-file-pdf-o"></i> Official Quotation Document Ready
                    </h5>
                    <p>
                      The EasyFr8 administration team has issued official pricing response and tariff schedule for this enquiry.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="portal-btn-download"
                    onClick={() => handleDownloadQuotationPDF(selectedEnquiry)}
                  >
                    <i className="fa fa-download"></i> Download Official PDF
                  </button>
                </div>
              )}

              {/* Administrator Messaging & Responses */}
              <div style={{ marginTop: '20px' }}>
                <strong style={{ display: 'block', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                  <i className="fa fa-comments-o"></i> Administrator Responses, Notes &amp; Updates
                </strong>
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    color: '#1e293b',
                    whiteSpace: 'pre-line',
                    maxHeight: '260px',
                    overflowY: 'auto',
                  }}
                >
                  {selectedEnquiry.notes || 'No administrative notes have been logged for this enquiry yet.'}
                </div>
              </div>
            </div>
            <div className="portal-modal-footer">
              {getDisplayStatus(selectedEnquiry.status) === 'Responded' && (
                <button
                  type="button"
                  className="portal-btn-download"
                  onClick={() => handleDownloadQuotationPDF(selectedEnquiry)}
                >
                  <i className="fa fa-download"></i> Download PDF Quotation
                </button>
              )}
              <button
                type="button"
                className="btn btn-default"
                onClick={() => setSelectedEnquiry(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quote Submission Modal */}
      <RouteEnquiryModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        searchContext={{
          reason: 'enquiry_tracker_request',
          modeName: 'Ocean Freight',
          originText: 'Custom Port / Origin',
          destinationText: 'Custom Port / Destination',
        }}
        onSuccess={() => {
          setIsQuoteModalOpen(false);
          fetchEnquiries();
        }}
      />
    </div>
  );
}
