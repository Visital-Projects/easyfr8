import React, { useState, useEffect, useRef } from 'react';
import { useUserAuth } from './UserAuthContext';
import api from '../../services/api';
import './user-portal.css';

const DOCUMENT_CATEGORIES = [
  { group: 'KYC Documentation', types: ['PAN Certificate', 'GST Certificate'] },
  { group: 'Shipping Documentation', types: ['Commercial Invoice', 'Bill of Lading (BL)', 'Packing List'] },
];

export default function UserDocuments() {
  const { user } = useUserAuth();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All'); // 'All' | 'KYC' | 'Shipping'

  // Upload Form States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('KYC Documentation');
  const [selectedType, setSelectedType] = useState('PAN Certificate');
  const [customDocName, setCustomDocName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileBase64, setFileBase64] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Document Preview / Viewer States
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewMime, setPreviewMime] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [previewWarning, setPreviewWarning] = useState('');
  const activeBlobUrlsRef = useRef(new Set());

  // Clean up all allocated object URLs on component unmount
  useEffect(() => {
    return () => {
      activeBlobUrlsRef.current.forEach((blobUrl) => {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch {
          // ignore
        }
      });
      activeBlobUrlsRef.current.clear();
    };
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/documents');
      setDocuments(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err.message || 'Failed to load documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const parseDocumentContent = (doc) => {
    const fileUrl = doc?.fileUrl;
    if (!fileUrl || fileUrl === '#' || !fileUrl.trim()) {
      return { error: 'No file content is attached to this document record.' };
    }

    // 1. External URL (http / https)
    if (/^https?:\/\//i.test(fileUrl)) {
      return { type: 'external', url: fileUrl };
    }

    // 2. Data URL or Base64 string
    let rawBase64 = fileUrl;
    let declaredMime = '';

    if (fileUrl.startsWith('data:')) {
      const commaIndex = fileUrl.indexOf(',');
      if (commaIndex === -1) {
        return { error: 'Malformed data URL: missing payload separator.' };
      }
      const header = fileUrl.slice(0, commaIndex);
      rawBase64 = fileUrl.slice(commaIndex + 1);
      const mimeMatch = header.match(/^data:([^;]+)/);
      if (mimeMatch) {
        declaredMime = mimeMatch[1].toLowerCase().trim();
      }
    }

    if (!rawBase64 || !rawBase64.trim()) {
      return { error: 'Document file data is empty.' };
    }

    // Sanitize whitespace
    let cleanBase64 = rawBase64.replace(/\s+/g, '');

    // Normalize padding if truncated mid-chunk
    const remainder = cleanBase64.length % 4;
    if (remainder === 2) {
      cleanBase64 += '==';
    } else if (remainder === 3) {
      cleanBase64 += '=';
    } else if (remainder === 1) {
      cleanBase64 = cleanBase64.slice(0, -1);
    }

    let binaryString;
    try {
      binaryString = atob(cleanBase64);
    } catch (err) {
      return { error: `Failed to decode document content: ${err.message}` };
    }

    const len = binaryString.length;
    if (len === 0) {
      return { error: 'Decoded document content contains 0 bytes.' };
    }

    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Magic byte inspection for true format
    let detectedMime = null;
    if (len >= 4) {
      if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
        detectedMime = 'application/pdf';
      } else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        detectedMime = 'image/jpeg';
      } else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
        detectedMime = 'image/png';
      } else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
        detectedMime = 'image/gif';
      }
    }

    const fallbackMime = doc.fileType === 'pdf' ? 'application/pdf' : 'application/octet-stream';
    const effectiveMime = detectedMime || declaredMime || fallbackMime;

    let warning = null;
    if (effectiveMime === 'application/pdf' && len < 100) {
      warning = 'This record contains a minimal test PDF signature rather than a full multi-page document.';
    }
    if (fileUrl.length === 65535) {
      warning = (warning ? warning + ' ' : '') + 'Note: File payload was truncated at 65,535 bytes (MySQL TEXT column limit).';
    }

    const blob = new Blob([bytes], { type: effectiveMime });
    const blobUrl = URL.createObjectURL(blob);
    activeBlobUrlsRef.current.add(blobUrl);

    return {
      type: 'blob',
      blobUrl,
      mime: effectiveMime,
      size: len,
      warning,
    };
  };

  const handleViewDocument = (doc) => {
    setPreviewError('');
    setPreviewWarning('');

    const result = parseDocumentContent(doc);

    if (result.error) {
      setPreviewDoc(doc);
      setPreviewUrl(null);
      setPreviewMime('');
      setPreviewError(result.error);
      return;
    }

    if (result.type === 'external') {
      window.open(result.url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (result.type === 'blob') {
      setPreviewDoc(doc);
      setPreviewUrl(result.blobUrl);
      setPreviewMime(result.mime);
      setPreviewWarning(result.warning || '');

      // Open new tab with Blob URL (safe same-origin top-level navigation)
      window.open(result.blobUrl, '_blank');
    }
  };

  const handleClosePreview = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
      activeBlobUrlsRef.current.delete(previewUrl);
    }
    setPreviewDoc(null);
    setPreviewUrl(null);
    setPreviewMime('');
    setPreviewError('');
    setPreviewWarning('');
  };

  const handleGroupChange = (group) => {
    setSelectedGroup(group);
    const cat = DOCUMENT_CATEGORIES.find((c) => c.group === group);
    if (cat && cat.types.length > 0) {
      setSelectedType(cat.types[0]);
    }
  };

  const handleFileChange = (e) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File exceeds maximum allowed size of 10 MB.');
      setSelectedFile(null);
      setFileBase64('');
      return;
    }

    setSelectedFile(file);
    if (!customDocName) {
      setCustomDocName(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result);
    };
    reader.onerror = () => {
      setUploadError('Failed to read file.');
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadError('');
    setUploadSuccess('');

    if (!selectedFile || !fileBase64) {
      setUploadError('Please select a file to upload.');
      return;
    }

    const docName = (customDocName.trim() || selectedFile.name).trim();
    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || 'pdf';

    try {
      setUploading(true);
      const payload = {
        name: docName,
        type: selectedType,
        user: user?.email || '',
        fileUrl: fileBase64,
        fileType: ext,
        status: 'Pending Review',
        remarks: `Uploaded by ${user?.name || 'Shipper'} on ${new Date().toLocaleDateString()}`,
      };

      const res = await api.post('/documents', payload);
      if (res.success || res.document) {
        setUploadSuccess('Document successfully uploaded and queued for administrative review.');
        setCustomDocName('');
        setSelectedFile(null);
        setFileBase64('');
        await fetchDocuments();
        setTimeout(() => {
          setShowUploadModal(false);
          setUploadSuccess('');
        }, 1500);
      } else {
        throw new Error(res.error || 'Upload failed');
      }
    } catch (err) {
      setUploadError(err.message || 'Failed to complete document upload.');
    } finally {
      setUploading(false);
    }
  };

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'KYC') {
      return doc.type === 'PAN Certificate' || doc.type === 'GST Certificate';
    }
    if (activeFilter === 'Shipping') {
      return (
        doc.type === 'Commercial Invoice' ||
        doc.type === 'Bill of Lading (BL)' ||
        doc.type === 'Packing List' ||
        doc.type?.toLowerCase().includes('invoice') ||
        doc.type?.toLowerCase().includes('lading') ||
        doc.type?.toLowerCase().includes('packing')
      );
    }
    return true;
  });

  return (
    <div>
      {/* Page Title & Upload Trigger */}
      <div className="portal-card">
        <div className="portal-card-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f2042' }}>
              <i className="fa fa-folder-open text-primary"></i> Document Management &amp; Compliance
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Upload regulatory KYC and shipping files, and monitor administrative review statuses in real time.
            </p>
          </div>
          <button
            type="button"
            className="portal-btn-primary"
            onClick={() => {
              setShowUploadModal(true);
              setUploadError('');
              setUploadSuccess('');
            }}
          >
            <i className="fa fa-cloud-upload"></i> Upload Document
          </button>
        </div>

        {/* Filter Navigation Tabs */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '10px', backgroundColor: '#ffffff' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeFilter === 'All' ? 'btn-primary' : 'btn-default'}`}
            onClick={() => setActiveFilter('All')}
          >
            All Documents ({documents.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeFilter === 'KYC' ? 'btn-primary' : 'btn-default'}`}
            onClick={() => setActiveFilter('KYC')}
          >
            KYC Compliance
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeFilter === 'Shipping' ? 'btn-primary' : 'btn-default'}`}
            onClick={() => setActiveFilter('Shipping')}
          >
            Shipping Documentation
          </button>
        </div>

        {error && (
          <div style={{ margin: '20px' }} className="portal-alert error">
            <i className="fa fa-exclamation-triangle"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Documents Table */}
        <div className="portal-table-wrap">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <i className="fa fa-spinner fa-spin fa-2x" style={{ color: '#0f2042' }}></i>
              <p style={{ marginTop: '10px', color: '#64748b' }}>Loading verified documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="portal-empty-state">
              <i className="fa fa-file-text-o"></i>
              <h5>No Documents Found in this View</h5>
              <p>Upload regulatory KYC certificates or logistics-related shipping files.</p>
              <button
                type="button"
                className="portal-btn-primary"
                style={{ marginTop: '15px' }}
                onClick={() => setShowUploadModal(true)}
              >
                <i className="fa fa-upload"></i> Upload Your First Document
              </button>
            </div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Category / Type</th>
                  <th>Uploaded Date</th>
                  <th>Review Status</th>
                  <th>Remarks / Notes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => {
                  let badgeClass = 'pending';
                  let statusLabel = 'Pending';
                  if (doc.status === 'Approved') {
                    badgeClass = 'approved';
                    statusLabel = 'Approved';
                  } else if (doc.status === 'Rejected') {
                    badgeClass = 'rejected';
                    statusLabel = 'Rejected';
                  }

                  return (
                    <tr key={doc.id}>
                      <td>
                        <strong style={{ color: '#0f2042', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <i
                            className={
                              doc.fileType === 'pdf'
                                ? 'fa fa-file-pdf-o text-danger'
                                : 'fa fa-file-image-o text-info'
                            }
                          ></i>
                          {doc.name}
                        </strong>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {doc.id}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{doc.type}</span>
                      </td>
                      <td>{doc.date || 'N/A'}</td>
                      <td>
                        <span className={`portal-badge ${badgeClass}`}>
                          <i
                            className={
                              statusLabel === 'Approved'
                                ? 'fa fa-check'
                                : statusLabel === 'Rejected'
                                ? 'fa fa-times'
                                : 'fa fa-clock-o'
                            }
                          ></i>{' '}
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ maxWidth: '240px', fontSize: '12px', color: '#64748b' }}>
                        {doc.remarks || 'Under administrative verification'}
                      </td>
                      <td>
                        {doc.fileUrl && doc.fileUrl !== '#' ? (
                          <button
                            type="button"
                            className="btn btn-xs btn-default"
                            style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            onClick={() => handleViewDocument(doc)}
                            title={`View ${doc.name}`}
                          >
                            <i className="fa fa-eye text-primary"></i> View File
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>Stored Securely</span>
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

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-dialog">
            <div className="portal-modal-header">
              <h4>
                <i className="fa fa-cloud-upload" style={{ color: '#0f2042' }}></i> Upload Compliance or Shipping Document
              </h4>
              <button
                type="button"
                className="portal-modal-close"
                onClick={() => setShowUploadModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleUploadSubmit}>
              <div className="portal-modal-body">
                {uploadError && (
                  <div className="portal-alert error">
                    <i className="fa fa-exclamation-circle"></i>
                    <span>{uploadError}</span>
                  </div>
                )}
                {uploadSuccess && (
                  <div className="portal-alert success">
                    <i className="fa fa-check-circle"></i>
                    <span>{uploadSuccess}</span>
                  </div>
                )}

                {/* Category Selection */}
                <div className="portal-form-group">
                  <label className="portal-form-label">
                    Document Category <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="portal-form-select"
                    value={selectedGroup}
                    onChange={(e) => handleGroupChange(e.target.value)}
                  >
                    {DOCUMENT_CATEGORIES.map((c) => (
                      <option key={c.group} value={c.group}>
                        {c.group}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sub-type Selection */}
                <div className="portal-form-group">
                  <label className="portal-form-label">
                    Specific Document Type <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="portal-form-select"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                  >
                    {DOCUMENT_CATEGORIES.find((c) => c.group === selectedGroup)?.types.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Label / Description */}
                <div className="portal-form-group">
                  <label className="portal-form-label">Document Title / Reference</label>
                  <input
                    type="text"
                    className="portal-form-control"
                    placeholder="e.g. GST Registration Certificate - Mumbai Unit"
                    value={customDocName}
                    onChange={(e) => setCustomDocName(e.target.value)}
                  />
                </div>

                {/* File Input */}
                <div className="portal-form-group">
                  <label className="portal-form-label">
                    Select File (PDF, PNG, JPG - Max 10MB) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="file"
                    className="portal-form-control"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    required
                  />
                  {selectedFile && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#059669' }}>
                      <i className="fa fa-check"></i> Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>
              </div>

              <div className="portal-modal-footer">
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="portal-btn-primary"
                  disabled={uploading || !selectedFile}
                >
                  {uploading ? (
                    <>
                      <i className="fa fa-spinner fa-spin"></i> Uploading File...
                    </>
                  ) : (
                    <>
                      <i className="fa fa-upload"></i> Submit for Review
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Document Viewer & Preview Modal ── */}
      {previewDoc && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-dialog" style={{ maxWidth: '880px', width: '95%' }}>
            <div className="portal-modal-header" style={{ alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <i
                    className={
                      previewMime.startsWith('image/')
                        ? 'fa fa-file-image-o text-info'
                        : 'fa fa-file-pdf-o text-danger'
                    }
                  ></i>
                  {previewDoc.name}
                </h4>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '12px', color: '#64748b', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span><strong>ID:</strong> {previewDoc.id}</span>
                  <span>&bull;</span>
                  <span><strong>Category:</strong> {previewDoc.type}</span>
                  <span>&bull;</span>
                  <span><strong>Status:</strong> {previewDoc.status}</span>
                  {previewMime && (
                    <>
                      <span>&bull;</span>
                      <span style={{ backgroundColor: '#e2e8f0', color: '#334155', fontWeight: 600, padding: '2px 8px', borderRadius: '4px' }}>
                        {previewMime}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="portal-modal-close"
                onClick={handleClosePreview}
                title="Close Viewer"
              >
                &times;
              </button>
            </div>

            <div className="portal-modal-body" style={{ padding: '20px' }}>
              {previewError && (
                <div className="portal-alert error" style={{ marginBottom: '16px' }}>
                  <i className="fa fa-exclamation-triangle"></i>
                  <div>
                    <strong>Unable to display document</strong>
                    <div style={{ marginTop: '4px' }}>{previewError}</div>
                  </div>
                </div>
              )}

              {previewWarning && (
                <div
                  className="portal-alert"
                  style={{
                    backgroundColor: '#fffbeb',
                    color: '#92400e',
                    border: '1px solid #fde68a',
                    marginBottom: '16px',
                  }}
                >
                  <i className="fa fa-info-circle"></i>
                  <span>{previewWarning}</span>
                </div>
              )}

              {previewUrl && (
                <div style={{ minHeight: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  {previewMime === 'application/pdf' ? (
                    <object
                      data={previewUrl}
                      type="application/pdf"
                      width="100%"
                      height="540px"
                      style={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    >
                      <iframe
                        src={previewUrl}
                        width="100%"
                        height="540px"
                        style={{ border: 'none' }}
                        title={previewDoc.name}
                      >
                        <p style={{ padding: '20px', textAlign: 'center' }}>
                          Your browser does not support embedded PDF viewing.{' '}
                          <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                            Click here to open the PDF directly
                          </a>.
                        </p>
                      </iframe>
                    </object>
                  ) : previewMime.startsWith('image/') ? (
                    <div
                      style={{
                        width: '100%',
                        maxHeight: '560px',
                        overflow: 'auto',
                        textAlign: 'center',
                        backgroundColor: '#0f172a',
                        padding: '16px',
                        borderRadius: '8px',
                      }}
                    >
                      <img
                        src={previewUrl}
                        alt={previewDoc.name}
                        style={{ maxWidth: '100%', maxHeight: '520px', objectFit: 'contain' }}
                        onError={() => setPreviewError('Image content is corrupted or truncated.')}
                      />
                    </div>
                  ) : (
                    <div className="portal-empty-state">
                      <i className="fa fa-file-o"></i>
                      <h5>File Format: {previewMime}</h5>
                      <p>Use the action buttons below to open or download this file.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="portal-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                {previewDoc.date && <span>Uploaded on {previewDoc.date}</span>}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={handleClosePreview}
                >
                  Close
                </button>
                {previewUrl && (
                  <>
                    <button
                      type="button"
                      className="btn btn-default"
                      onClick={() => window.open(previewUrl, '_blank')}
                      title="Open in a dedicated browser tab"
                    >
                      <i className="fa fa-external-link"></i> Open in New Tab
                    </button>
                    <a
                      href={previewUrl}
                      download={`${previewDoc.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.${previewDoc.fileType || (previewMime.includes('pdf') ? 'pdf' : 'jpg')}`}
                      className="portal-btn-primary"
                      style={{ textDecoration: 'none' }}
                    >
                      <i className="fa fa-download"></i> Download File
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
