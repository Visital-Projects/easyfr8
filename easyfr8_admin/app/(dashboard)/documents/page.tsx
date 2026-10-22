'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';

interface KYCDocument {
  id: string;
  user: string;
  userName?: string;
  userId?: string;
  name: string;
  type: string;
  date: string;
  status: 'Pending Review' | 'Approved' | 'Rejected';
  remarks: string;
  fileUrl: string;
  fileType: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function DocumentVerificationPage() {
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending Review' | 'Approved' | 'Rejected'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Preview Modal States
  const [previewDoc, setPreviewDoc] = useState<KYCDocument | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string>('');
  const [previewWarning, setPreviewWarning] = useState<string>('');
  const [previewError, setPreviewError] = useState<string>('');
  const activeBlobUrlsRef = useRef<Set<string>>(new Set());

  // Review Modal States
  const [reviewDoc, setReviewDoc] = useState<KYCDocument | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'Approved' | 'Rejected'>('Approved');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      activeBlobUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
      activeBlobUrlsRef.current.clear();
    };
  }, []);

  // Fetch documents from MySQL API
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/documents');
      if (!res.ok) {
        throw new Error(`Failed to load documents (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setDocuments(data);
      } else {
        setDocuments([]);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading verification documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Show auto-dismiss toast
  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  // Safe file decoding matching client-side decoder
  const parseDocumentContent = (doc: KYCDocument) => {
    const fileUrl = doc?.fileUrl;
    if (!fileUrl || fileUrl === '#' || !fileUrl.trim()) {
      return { error: 'No attached file content exists for this document.' };
    }

    if (/^https?:\/\//i.test(fileUrl)) {
      return { type: 'external', url: fileUrl };
    }

    let rawBase64 = fileUrl;
    let declaredMime = '';

    if (fileUrl.startsWith('data:')) {
      const commaIdx = fileUrl.indexOf(',');
      if (commaIdx === -1) {
        return { error: 'Malformed Data URL: missing base64 separator.' };
      }
      const header = fileUrl.slice(0, commaIdx);
      rawBase64 = fileUrl.slice(commaIdx + 1);
      const match = header.match(/^data:([^;]+)/);
      if (match) declaredMime = match[1].toLowerCase().trim();
    }

    if (!rawBase64 || !rawBase64.trim()) {
      return { error: 'The document file buffer is empty.' };
    }

    let cleanBase64 = rawBase64.replace(/\s+/g, '');
    const remainder = cleanBase64.length % 4;
    if (remainder === 2) cleanBase64 += '==';
    else if (remainder === 3) cleanBase64 += '=';
    else if (remainder === 1) cleanBase64 = cleanBase64.slice(0, -1);

    let binaryStr: string;
    try {
      binaryStr = atob(cleanBase64);
    } catch (e: any) {
      return { error: `Decoding failed: ${e.message}` };
    }

    const len = binaryStr.length;
    if (len === 0) return { error: 'Decoded document contains 0 bytes.' };

    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Magic bytes detection
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

    const fallbackMime = doc.fileType?.toLowerCase() === 'pdf' ? 'application/pdf' : 'image/png';
    const effectiveMime = detectedMime || declaredMime || fallbackMime;

    let warning = '';
    if (fileUrl.length === 65535) {
      warning = 'Note: File payload was truncated at 65,535 bytes due to database column limit.';
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

  const handleOpenPreview = (doc: KYCDocument) => {
    setPreviewError('');
    setPreviewWarning('');
    const result = parseDocumentContent(doc);

    if (result.error) {
      setPreviewDoc(doc);
      setPreviewBlobUrl(null);
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
      setPreviewBlobUrl(result.blobUrl || null);
      setPreviewMime(result.mime || '');
      setPreviewWarning(result.warning || '');
    }
  };

  const handleClosePreview = () => {
    if (previewBlobUrl && previewBlobUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(previewBlobUrl);
        activeBlobUrlsRef.current.delete(previewBlobUrl);
      } catch {
        // ignore
      }
    }
    setPreviewDoc(null);
    setPreviewBlobUrl(null);
    setPreviewMime('');
    setPreviewError('');
    setPreviewWarning('');
  };

  const handleOpenReview = (doc: KYCDocument) => {
    setReviewDoc(doc);
    setReviewStatus(doc.status === 'Rejected' ? 'Rejected' : 'Approved');
    setReviewRemarks(doc.remarks || '');
    setReviewError(null);
    setShowConfirmDialog(false);
  };

  const handleCloseReview = () => {
    setReviewDoc(null);
    setReviewRemarks('');
    setReviewError(null);
    setShowConfirmDialog(false);
    setIsSubmittingReview(false);
  };

  // Submit review status change
  const handleSubmitReview = async () => {
    if (!reviewDoc) return;

    if (reviewStatus === 'Rejected' && !reviewRemarks.trim()) {
      setReviewError('A specific reason or remark is mandatory when rejecting a document.');
      setShowConfirmDialog(false);
      return;
    }

    try {
      setIsSubmittingReview(true);
      setReviewError(null);

      const res = await fetch(`/api/documents/${reviewDoc.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: reviewStatus,
          remarks: reviewRemarks.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update document review status.');
      }

      triggerToast(`Document ${reviewDoc.id} successfully marked as ${reviewStatus}.`);
      handleCloseReview();
      await fetchDocuments();
    } catch (err: any) {
      setReviewError(err.message || 'Error occurred while saving review decision.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Category options derived from existing documents
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => {
      if (d.type) set.add(d.type);
    });
    return Array.from(set);
  }, [documents]);

  // Document counts
  const stats = useMemo(() => {
    const total = documents.length;
    const pending = documents.filter((d) => d.status === 'Pending Review' || (d.status as string) === 'Pending').length;
    const approved = documents.filter((d) => d.status === 'Approved').length;
    const rejected = documents.filter((d) => d.status === 'Rejected').length;
    return { total, pending, approved, rejected };
  }, [documents]);

  // Filtered list
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Status filter
      if (statusFilter !== 'All') {
        const docStatus = doc.status === 'Pending Review' || (doc.status as string) === 'Pending' ? 'Pending Review' : doc.status;
        if (docStatus !== statusFilter) return false;
      }

      // Category filter
      if (categoryFilter !== 'All') {
        if (doc.type !== categoryFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = doc.id?.toLowerCase().includes(q);
        const matchName = doc.name?.toLowerCase().includes(q);
        const matchType = doc.type?.toLowerCase().includes(q);
        const matchUser = doc.user?.toLowerCase().includes(q);
        const matchUserName = doc.userName?.toLowerCase().includes(q);
        const matchRemarks = doc.remarks?.toLowerCase().includes(q);

        if (!matchId && !matchName && !matchType && !matchUser && !matchUserName && !matchRemarks) {
          return false;
        }
      }

      return true;
    });
  }, [documents, statusFilter, categoryFilter, searchQuery]);

  return (
    <>
      {/* Toast Alert */}
      {successToast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: '#10b981',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600,
            fontSize: '14px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{successToast}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-4)' }}>
        <div>
          <h1 className="page-title">User Document Verification</h1>
          <p className="page-subtitle">
            Review, approve, or reject regulatory KYC documents and shipping files submitted by shipper accounts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchDocuments}
            title="Refresh documents list"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* KPI / Status Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div
          data-testid="kpi-total"
          onClick={() => setStatusFilter('All')}
          style={{
            backgroundColor: 'var(--surface-card)',
            border: statusFilter === 'All' ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Submissions
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            All KYC &amp; shipping records
          </div>
        </div>

        <div
          data-testid="kpi-pending"
          onClick={() => setStatusFilter('Pending Review')}
          style={{
            backgroundColor: 'var(--surface-card)',
            border: statusFilter === 'Pending Review' ? '2px solid var(--color-warning)' : '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-warning)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-warning)' }}></span>
            Pending Review
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-warning)', marginTop: '4px' }}>
            {stats.pending}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {stats.pending > 0 ? 'Requires administrative action' : 'All caught up!'}
          </div>
        </div>

        <div
          data-testid="kpi-approved"
          onClick={() => setStatusFilter('Approved')}
          style={{
            backgroundColor: 'var(--surface-card)',
            border: statusFilter === 'Approved' ? '2px solid var(--color-success)' : '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }}></span>
            Verified / Approved
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-success)', marginTop: '4px' }}>
            {stats.approved}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Compliant accounts
          </div>
        </div>

        <div
          data-testid="kpi-rejected"
          onClick={() => setStatusFilter('Rejected')}
          style={{
            backgroundColor: 'var(--surface-card)',
            border: statusFilter === 'Rejected' ? '2px solid var(--color-danger)' : '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-danger)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-danger)' }}></span>
            Rejected Documents
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-danger)', marginTop: '4px' }}>
            {stats.rejected}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Requires re-upload by shipper
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="table-filter-panel"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: 'var(--space-4)',
        }}
      >
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(['All', 'Pending Review', 'Approved', 'Rejected'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`btn btn-sm ${statusFilter === tab ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(tab)}
              style={{ fontWeight: 600 }}
            >
              {tab === 'All' ? 'All Documents' : tab}
              {tab === 'Pending Review' && stats.pending > 0 && (
                <span
                  style={{
                    marginLeft: '6px',
                    backgroundColor: statusFilter === tab ? '#ffffff' : 'var(--color-warning)',
                    color: statusFilter === tab ? 'var(--color-primary)' : '#ffffff',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontSize: '11px',
                  }}
                >
                  {stats.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Category & Search Input */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', maxWidth: '580px', width: '100%' }}>
          <select
            className="form-control"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ width: '170px', height: '36px', fontSize: '13px' }}
          >
            <option value="All">All Categories</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <input
              type="text"
              className="form-control"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, shipper, email, doc name..."
              style={{ height: '36px', width: '100%', fontSize: '13px', paddingLeft: '32px' }}
            />
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text-muted)' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Documents Table Card */}
      <div className="chart-card">
        {error && (
          <div style={{ padding: '16px 20px', backgroundColor: 'var(--color-danger-soft)', color: 'var(--color-danger)', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '150px' }}>Document ID</th>
                <th>Shipper / Account</th>
                <th>Document Details</th>
                <th>Category</th>
                <th>Upload Date</th>
                <th>Review Status</th>
                <th>Remarks / Reason</th>
                <th style={{ textAlign: 'right', minWidth: '170px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                      <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      <span>Loading documents from database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '50px 20px' }}>
                    <div style={{ maxWidth: '420px', margin: '0 auto', color: 'var(--text-muted)' }}>
                      <svg viewBox="0 0 24 24" width="44" height="44" stroke="currentColor" strokeWidth="1.5" fill="none" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.6 }}>
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                        {statusFilter === 'Pending Review'
                          ? 'No Documents Pending Review'
                          : 'No Documents Found Matching Filter'}
                      </h4>
                      <p style={{ fontSize: '13px', margin: 0, color: 'var(--text-secondary)' }}>
                        {statusFilter === 'Pending Review'
                          ? 'Great job! All shipper compliance documents and KYC certificates have been reviewed.'
                          : 'Try modifying your search term or switching to "All Documents" view.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => {
                  const isPending = doc.status === 'Pending Review' || (doc.status as string) === 'Pending';
                  const isApproved = doc.status === 'Approved';
                  const isRejected = doc.status === 'Rejected';

                  return (
                    <tr key={doc.id}>
                      {/* Document ID */}
                      <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-primary)' }}>
                        {doc.id}
                      </td>

                      {/* Shipper details */}
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}>
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          {doc.userName || 'Shipper'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {doc.user}
                        </div>
                      </td>

                      {/* Document Name */}
                      <td>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {doc.fileType?.toLowerCase() === 'pdf' ? (
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ef4444" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" y1="13" x2="8" y2="13" />
                              <line x1="16" y1="17" x2="8" y2="17" />
                              <polyline points="10 9 9 9 8 9" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#3b82f6" strokeWidth="2">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                          )}
                          <span>{doc.name}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'uppercase' }}>
                          Format: {doc.fileType || 'file'}
                        </div>
                      </td>

                      {/* Category */}
                      <td>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {doc.type}
                        </span>
                      </td>

                      {/* Upload Date */}
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {doc.date || 'N/A'}
                      </td>

                      {/* Review Status */}
                      <td>
                        {isPending && (
                          <span className="badge badge-pending">
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            Pending Review
                          </span>
                        )}
                        {isApproved && (
                          <span className="badge badge-approved">
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Approved
                          </span>
                        )}
                        {isRejected && (
                          <span className="badge badge-rejected">
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            Rejected
                          </span>
                        )}
                      </td>

                      {/* Remarks */}
                      <td style={{ maxWidth: '240px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {doc.remarks ? (
                          <span title={doc.remarks} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {doc.remarks}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No reviewer remarks</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenPreview(doc)}
                            title="Preview uploaded document file"
                            style={{ padding: '0 8px', height: '30px' }}
                          >
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            View
                          </button>

                          <button
                            type="button"
                            className={`btn btn-sm ${isPending ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => handleOpenReview(doc)}
                            title="Review and update verification status"
                            style={{ padding: '0 10px', height: '30px' }}
                          >
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M9 11l3 3L22 4" />
                              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                            </svg>
                            Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Document Viewer & Preview Modal ── */}
      {previewDoc && (
        <div className="modal-overlay active" style={{ zIndex: 1200 }}>
          <div className="modal-container" style={{ maxWidth: '880px', width: '95%' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  {previewDoc.name}
                </h3>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>ID: {previewDoc.id}</span>
                  <span>&bull;</span>
                  <span>Shipper: {previewDoc.userName || previewDoc.user}</span>
                  <span>&bull;</span>
                  <span>Status: <strong>{previewDoc.status}</strong></span>
                  {previewMime && (
                    <>
                      <span>&bull;</span>
                      <span style={{ backgroundColor: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                        {previewMime}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={handleClosePreview}
                title="Close Viewer"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              {previewError && (
                <div style={{ padding: '14px', backgroundColor: 'var(--color-danger-soft)', color: 'var(--color-danger)', borderRadius: '6px', marginBottom: '16px' }}>
                  <strong>Unable to display document</strong>
                  <div style={{ marginTop: '4px', fontSize: '13px' }}>{previewError}</div>
                </div>
              )}

              {previewWarning && (
                <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-warning-soft)', color: 'var(--color-warning)', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
                  {previewWarning}
                </div>
              )}

              {previewBlobUrl && (
                <div style={{ minHeight: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  {previewMime === 'application/pdf' ? (
                    <object
                      data={previewBlobUrl}
                      type="application/pdf"
                      width="100%"
                      height="540px"
                      style={{ border: '1px solid var(--border-color)', borderRadius: '8px' }}
                    >
                      <iframe
                        src={previewBlobUrl}
                        width="100%"
                        height="540px"
                        style={{ border: 'none' }}
                        title={previewDoc.name}
                      >
                        <p style={{ padding: '20px', textAlign: 'center' }}>
                          Your browser does not support embedded PDF viewing.{' '}
                          <a href={previewBlobUrl} target="_blank" rel="noopener noreferrer">
                            Open PDF in a new tab
                          </a>.
                        </p>
                      </iframe>
                    </object>
                  ) : previewMime.startsWith('image/') ? (
                    <div
                      style={{
                        width: '100%',
                        maxHeight: '540px',
                        overflow: 'auto',
                        textAlign: 'center',
                        backgroundColor: '#0f172a',
                        padding: '16px',
                        borderRadius: '8px',
                      }}
                    >
                      <img
                        src={previewBlobUrl}
                        alt={previewDoc.name}
                        style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
                        onError={() => setPreviewError('Image payload is corrupt or truncated.')}
                      />
                    </div>
                  ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <h5>File Format: {previewMime}</h5>
                      <p>Use the download button below to inspect this document.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Submission Date: {previewDoc.date || 'N/A'}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleClosePreview}>
                  Close
                </button>
                {previewBlobUrl && (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => window.open(previewBlobUrl, '_blank')}
                      title="Open file in separate browser tab"
                    >
                      Open in New Tab
                    </button>
                    <a
                      href={previewBlobUrl}
                      download={`${previewDoc.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.${previewDoc.fileType || (previewMime.includes('pdf') ? 'pdf' : 'jpg')}`}
                      className="btn btn-primary btn-sm"
                      style={{ textDecoration: 'none' }}
                    >
                      Download
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Document Review & Status Action Modal ── */}
      {reviewDoc && (
        <div className="modal-overlay active" style={{ zIndex: 1250 }}>
          <div className="modal-container" style={{ maxWidth: '560px', width: '95%' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Review Shipper Document</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  ID: <span style={{ fontFamily: 'monospace' }}>{reviewDoc.id}</span> &bull; {reviewDoc.type}
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={handleCloseReview}
                title="Cancel Review"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="modal-body" style={{ padding: '24px' }}>
              {reviewError && (
                <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-danger-soft)', color: 'var(--color-danger)', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
                  {reviewError}
                </div>
              )}

              {/* Shipper Information Summary */}
              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Shipper Name:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{reviewDoc.userName || 'Shipper'}</span>

                  <span style={{ color: 'var(--text-muted)' }}>Email Account:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{reviewDoc.user}</span>

                  <span style={{ color: 'var(--text-muted)' }}>Document Title:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{reviewDoc.name}</span>

                  <span style={{ color: 'var(--text-muted)' }}>Upload Date:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{reviewDoc.date || 'N/A'}</span>

                  <span style={{ color: 'var(--text-muted)' }}>Current Status:</span>
                  <span>
                    <strong style={{
                      color: reviewDoc.status === 'Approved' ? 'var(--color-success)' : reviewDoc.status === 'Rejected' ? 'var(--color-danger)' : 'var(--color-warning)'
                    }}>
                      {reviewDoc.status}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Decision Options */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
                  Select Verification Decision <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setReviewStatus('Approved');
                      setShowConfirmDialog(false);
                      if (reviewRemarks.includes('Rejected') || !reviewRemarks.trim()) {
                        setReviewRemarks('Document verified and approved.');
                      }
                    }}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      border: reviewStatus === 'Approved' ? '2px solid var(--color-success)' : '1px solid var(--border-color)',
                      backgroundColor: reviewStatus === 'Approved' ? 'var(--color-success-soft)' : 'var(--surface-card)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Approve &amp; Verify
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Mark KYC compliant
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReviewStatus('Rejected');
                      setShowConfirmDialog(false);
                      if (reviewRemarks.includes('approved') || !reviewRemarks.trim()) {
                        setReviewRemarks('');
                      }
                    }}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      border: reviewStatus === 'Rejected' ? '2px solid var(--color-danger)' : '1px solid var(--border-color)',
                      backgroundColor: reviewStatus === 'Rejected' ? 'var(--color-danger-soft)' : 'var(--surface-card)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--color-danger)', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Reject Document
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Require correction
                    </div>
                  </button>
                </div>
              </div>

              {/* Reviewer Remarks */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Reviewer Remarks &amp; Feedback{' '}
                  {reviewStatus === 'Rejected' ? (
                    <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}>* (Required for Rejection)</span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional note)</span>
                  )}
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  placeholder={
                    reviewStatus === 'Rejected'
                      ? 'Specify why this document is rejected (e.g. Incomplete copy, illegible name, expired certificate)...'
                      : 'Optional remark (e.g. Verified against GST portal)...'
                  }
                  style={{ width: '100%', fontSize: '13px', resize: 'vertical' }}
                  required={reviewStatus === 'Rejected'}
                />
              </div>

              {/* Confirmation Step */}
              {showConfirmDialog && (
                <div
                  style={{
                    backgroundColor: reviewStatus === 'Approved' ? 'var(--color-success-soft)' : 'var(--color-danger-soft)',
                    border: `1px solid ${reviewStatus === 'Approved' ? 'var(--color-success)' : 'var(--color-danger)'}`,
                    borderRadius: '8px',
                    padding: '14px',
                    marginBottom: '10px',
                    animation: 'fadeIn 0.15s ease',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '14px', color: reviewStatus === 'Approved' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    Confirm Decision
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px' }}>
                    Are you sure you want to mark this document as <strong>{reviewStatus}</strong>? This status will be saved to the database and will immediately be visible to the shipper.
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseReview}
                disabled={isSubmittingReview}
              >
                Cancel
              </button>

              <div>
                {!showConfirmDialog ? (
                  <button
                    type="button"
                    className={`btn ${reviewStatus === 'Approved' ? 'btn-success' : 'btn-danger'}`}
                    onClick={() => {
                      if (reviewStatus === 'Rejected' && !reviewRemarks.trim()) {
                        setReviewError('Please specify the rejection reason before proceeding.');
                        return;
                      }
                      setShowConfirmDialog(true);
                    }}
                  >
                    Proceed to {reviewStatus === 'Approved' ? 'Approve' : 'Reject'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`btn ${reviewStatus === 'Approved' ? 'btn-success' : 'btn-danger'}`}
                    onClick={handleSubmitReview}
                    disabled={isSubmittingReview}
                  >
                    {isSubmittingReview ? (
                      <>
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        Saving...
                      </>
                    ) : (
                      `Confirm & Mark ${reviewStatus}`
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
