'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Port {
  id: string;
  port_code: string;
  port_name: string;
  country: string;
  freight_type: string;
  status: 'active' | 'inactive';
}

interface FreightType {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  sort_order: number;
}

interface ImportRow {
  rowNumber: number;
  port_code: string;
  port_name: string;
  country: string;
  freight_type: string;
  status: 'active' | 'inactive' | '';
  rowStatus: 'valid' | 'invalid' | 'duplicate';
  reason: string;
}

interface ImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  skippedRows: number;
}

interface ImportError {
  row: number;
  port_code: string;
  reason: string;
}

interface ImportPreviewData {
  summary: ImportSummary;
  rows: ImportRow[];
  errors: ImportError[];
}

export default function PortsPage() {
  const [ports, setPorts] = useState<Port[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [freightTypeFilter, setFreightTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPorts, setTotalPorts] = useState(0);

  // Dynamic Freight Types state from Freight Types module
  const [freightTypes, setFreightTypes] = useState<FreightType[]>([]);
  const [freightTypesLoading, setFreightTypesLoading] = useState(true);
  const [freightTypesError, setFreightTypesError] = useState<string | null>(null);

  // CRUD Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingPortId, setEditingPortId] = useState<string | null>(null);

  // CRUD Form fields
  const [formPortCode, setFormPortCode] = useState('');
  const [formPortName, setFormPortName] = useState('');
  const [formCountry, setFormCountry] = useState('');
  const [formFreightType, setFormFreightType] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');

  // Checkbox Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Import / Export Modals state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Import flow state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importPreview, setImportPreview] = useState<ImportPreviewData | null>(null);
  const [importSuccessResult, setImportSuccessResult] = useState<any | null>(null);

  // Toast Notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'danger' | 'warning' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'danger' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchFreightTypes = async () => {
    try {
      setFreightTypesLoading(true);
      setFreightTypesError(null);
      const res = await fetch('/api/freight-types');
      const data = await res.json();
      if (Array.isArray(data)) {
        setFreightTypes(data);
      } else {
        setFreightTypesError('Failed to load freight types');
      }
    } catch (err: any) {
      console.error('Failed to load freight types:', err);
      setFreightTypesError(err.message || 'Failed to load freight types');
    } finally {
      setFreightTypesLoading(false);
    }
  };

  useEffect(() => {
    fetchFreightTypes();
  }, []);

  const fetchPorts = async (targetPage = page) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(targetPage));
      params.append('limit', '50');
      if (searchQuery) params.append('search', searchQuery);
      if (freightTypeFilter) params.append('freight_type', freightTypeFilter);

      const res = await fetch(`/api/ports?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.ports)) {
        setPorts(data.ports);
        if (data.pagination) {
          setPage(data.pagination.page);
          setTotalPages(data.pagination.totalPages);
          setTotalPorts(data.pagination.total);
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to fetch ports list.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchPorts(1);
  }, [searchQuery, freightTypeFilter]);

  const handleOpenAddModal = () => {
    fetchFreightTypes();
    setModalMode('create');
    setEditingPortId(null);
    setFormPortCode('');
    setFormPortName('');
    setFormCountry('');
    const active = freightTypes.filter(ft => ft.status === 'active');
    setFormFreightType(active[0]?.name || '');
    setFormStatus('active');
    setModalOpen(true);
  };

  // Sync default freight type when modal opens or freight types finish loading
  useEffect(() => {
    if (modalOpen && modalMode === 'create' && !formFreightType && freightTypes.length > 0) {
      const active = freightTypes.filter(ft => ft.status === 'active');
      if (active.length > 0) {
        setFormFreightType(active[0].name);
      }
    }
  }, [modalOpen, modalMode, formFreightType, freightTypes]);

  const handleOpenEditModal = (p: Port) => {
    fetchFreightTypes();
    setModalMode('edit');
    setEditingPortId(p.id);
    setFormPortCode(p.port_code);
    setFormPortName(p.port_name);
    setFormCountry(p.country);

    // Match existing port's freight_type to configured freight types (by name, id, or legacy equivalent)
    const matching = freightTypes.find(ft => 
      ft.name.toLowerCase() === p.freight_type?.toLowerCase() ||
      ft.id.toLowerCase() === p.freight_type?.toLowerCase() ||
      (p.freight_type?.toLowerCase() === 'ocean' && ft.name.toLowerCase().includes('ocean')) ||
      (p.freight_type?.toLowerCase() === 'air' && ft.name.toLowerCase().includes('air')) ||
      (p.freight_type?.toLowerCase() === 'road' && ft.name.toLowerCase().includes('road'))
    );
    setFormFreightType(matching ? matching.name : (p.freight_type || ''));
    setFormStatus(p.status);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPortCode || !formPortName || !formCountry) return;

    try {
      const payload = {
        port_code: formPortCode,
        port_name: formPortName,
        country: formCountry,
        freight_type: formFreightType,
        status: formStatus
      };

      const token = typeof window !== 'undefined' ? localStorage.getItem('easyfr8_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      if (modalMode === 'create') {
        const cleanCode = formPortCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        const id = `port-${cleanCode}-${Math.floor(100 + Math.random() * 900)}`;
        const res = await fetch('/api/ports', {
          method: 'POST',
          headers,
          body: JSON.stringify({ id, ...payload }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          await fetchPorts(1);
          setModalOpen(false);
          showToast('Port created successfully.', 'success');
        } else {
          showToast(data.error || 'Failed to create port in database.', 'danger');
        }
      } else {
        const res = await fetch(`/api/ports/${editingPortId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          await fetchPorts(page);
          setModalOpen(false);
          showToast('Port updated successfully.', 'success');
        } else {
          showToast(data.error || 'Failed to update port in database.', 'danger');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('An error occurred while saving to database.', 'danger');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(`Are you sure you want to permanently delete Port ${id}?`)) {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('easyfr8_token') : null;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api/ports/${id}`, {
          method: 'DELETE',
          headers,
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          await fetchPorts(page);
          showToast('Port deleted successfully.', 'success');
        } else {
          showToast(data.error || 'Failed to delete port from database.', 'danger');
        }
      } catch (err) {
        console.error(err);
        showToast('An error occurred while deleting port from database.', 'danger');
      }
    }
  };

  // Bulk Actions
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredPorts.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Download Template
  const handleDownloadTemplate = async () => {
    try {
      showToast('Generating import template...', 'success');
      const response = await fetch('/api/ports/template');
      if (!response.ok) throw new Error('Failed to generate template');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Ports_Import_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      showToast(err.message || 'Error downloading template.', 'danger');
    }
  };

  // Export File
  const handleExport = async (format: 'xlsx' | 'csv', scope: 'all' | 'selected' | 'filtered') => {
    try {
      showToast(`Generating export file (${format.toUpperCase()})...`, 'success');
      const params = new URLSearchParams();
      params.append('type', format);

      if (scope === 'selected') {
        if (selectedIds.length === 0) {
          showToast('No records selected for export.', 'warning');
          return;
        }
        params.append('ids', selectedIds.join(','));
      } else if (scope === 'filtered') {
        if (searchQuery) params.append('search', searchQuery);
        if (freightTypeFilter) params.append('freight_type', freightTypeFilter);
      }

      const response = await fetch(`/api/ports/export?${params.toString()}`);
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      a.download = `ports_${dateStr}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setExportModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Export failed.', 'danger');
    }
  };

  // Import - Drag & Drop Upload
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'csv') {
      showToast('Unsupported file format. Please upload .xlsx or .csv files.', 'danger');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('File size exceeds the 10 MB limit.', 'danger');
      return;
    }

    setImportFile(file);
    showToast(`File "${file.name}" loaded. Ready for preview.`, 'success');
  };

  // Import Preview Request
  const handleUploadPreview = async () => {
    if (!importFile) return;

    try {
      setImportLoading(true);
      setImportProgress(20);
      
      const formData = new FormData();
      formData.append('file', importFile);

      setImportProgress(50);
      const res = await fetch('/api/ports/import?preview=true', {
        method: 'POST',
        body: formData
      });

      setImportProgress(80);
      const data = await res.json();
      setImportProgress(100);

      if (data.success) {
        setImportPreview(data);
      } else {
        showToast(data.error || 'Failed to parse file.', 'danger');
      }
    } catch (err: any) {
      showToast('Import parsing failed.', 'danger');
    } finally {
      setImportLoading(false);
      setImportProgress(0);
    }
  };

  // Commit Valid Import Rows
  const handleCommitImport = async () => {
    if (!importFile || !importPreview) return;

    try {
      setImportLoading(true);
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await fetch('/api/ports/import?commit=true', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        setImportSuccessResult(data.summary);
        fetchPorts();
        showToast('Valid records imported successfully.', 'success');
      } else {
        showToast(data.error || 'Import commit failed.', 'danger');
      }
    } catch (err) {
      showToast('Import execution failed.', 'danger');
    } finally {
      setImportLoading(false);
    }
  };

  // Download Error Report
  const handleDownloadErrorReport = async () => {
    if (!importPreview || importPreview.errors.length === 0) return;

    try {
      showToast('Generating error report...', 'success');
      const res = await fetch('/api/ports/import?error_report=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors: importPreview.errors })
      });

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Import_Error_Report.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      showToast('Failed to download error report.', 'danger');
    }
  };

  const filteredPorts = ports.filter((p) =>
    p.port_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.port_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Toast Notification Banner */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toast.type === 'success' ? '#16a34a' : toast.type === 'danger' ? '#dc2626' : '#d97706',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '6px',
          zIndex: 100000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontWeight: 500,
          transition: 'all 0.3s ease'
        }}>
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 className="page-title">Ports Manager</h1>
          <p className="page-subtitle">Configure ports and airport codes for autocomplete dropdowns.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleDownloadTemplate} style={{ border: '1px solid #ccc', color: '#555', background: '#fff' }}>
            Download Template
          </button>
          <button className="btn btn-secondary" onClick={() => setImportModalOpen(true)} style={{ border: '1px solid #ccc', color: '#555', background: '#fff' }}>
            Import
          </button>
          <button className="btn btn-secondary" onClick={() => setExportModalOpen(true)} style={{ border: '1px solid #ccc', color: '#555', background: '#fff' }}>
            Export
          </button>
          <button className="btn btn-primary" onClick={handleOpenAddModal}>+ Add Port</button>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="table-filter-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {selectedIds.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '4px 12px', background: 'var(--color-primary-soft)', borderRadius: '4px', border: '1px solid var(--color-primary)' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                {selectedIds.length} Selected
              </span>
              <button 
                className="btn btn-secondary" 
                onClick={() => handleExport('xlsx', 'selected')} 
                style={{ padding: '2px 8px', fontSize: '0.75rem', background: '#fff', border: '1px solid #ccc' }}
              >
                Export Selected
              </button>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '480px', justifyContent: 'flex-end' }}>
          <select 
            className="form-control" 
            value={freightTypeFilter} 
            onChange={(e) => setFreightTypeFilter(e.target.value)}
            style={{ width: '150px', height: '36px', padding: '0 8px', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="">All Modes</option>
            {freightTypes
              .filter(ft => ft.status === 'active')
              .map((ft) => (
                <option key={ft.id} value={ft.name}>
                  {ft.name}
                </option>
              ))}
          </select>
          <input
            type="text"
            className="form-control"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, code or country..."
            style={{ height: '36px', width: '100%', maxWidth: '300px' }}
          />
        </div>
      </div>

      {/* Ports Table */}
      <div className="chart-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={filteredPorts.length > 0 && selectedIds.length === filteredPorts.length}
                    onChange={handleSelectAll} 
                  />
                </th>
                <th>Port ID</th>
                <th>Port Code</th>
                <th>Port Name</th>
                <th>Country</th>
                <th>Freight Type</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>Loading...</td>
                </tr>
              ) : filteredPorts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>No ports found.</td>
                </tr>
              ) : (
                filteredPorts.map((p) => (
                  <tr key={p.id}>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(p.id)} 
                        onChange={() => handleSelectRow(p.id)} 
                      />
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.id}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{p.port_code}</td>
                    <td style={{ fontWeight: 500 }}>{p.port_name}</td>
                    <td>{p.country}</td>
                    <td>{p.freight_type}</td>
                    <td>
                      <span className={`status-pill ${p.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" onClick={() => handleOpenEditModal(p)} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Edit</button>
                        <button className="btn btn-secondary" onClick={() => handleDelete(p.id)} style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'red' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #eee', background: '#fafafa', borderRadius: '0 0 8px 8px' }}>
          <span style={{ fontSize: '0.85rem', color: '#666' }}>
            Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalPorts} ports total)
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              disabled={page <= 1 || loading}
              onClick={() => { const p = Math.max(1, page - 1); setPage(p); fetchPorts(p); }}
              style={{ padding: '6px 14px', fontSize: '0.85rem', background: '#fff', border: '1px solid #ccc' }}
            >
              Previous
            </button>
            <button
              className="btn btn-secondary"
              disabled={page >= totalPages || loading}
              onClick={() => { const p = page + 1; setPage(p); fetchPorts(p); }}
              style={{ padding: '6px 14px', fontSize: '0.85rem', background: '#fff', border: '1px solid #ccc' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* CRUD Add/Edit Modal */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '100%', maxWidth: '450px', color: '#333' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>{modalMode === 'create' ? 'Add Port' : 'Edit Port'}</h3>
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Port Code</label>
                <input
                  type="text"
                  className="form-control"
                  value={formPortCode}
                  onChange={(e) => setFormPortCode(e.target.value)}
                  required
                  placeholder="e.g. INMUN"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Port Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={formPortName}
                  onChange={(e) => setFormPortName(e.target.value)}
                  required
                  placeholder="e.g. Mumbai"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Country</label>
                <input
                  type="text"
                  className="form-control"
                  value={formCountry}
                  onChange={(e) => setFormCountry(e.target.value)}
                  required
                  placeholder="e.g. India"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Freight Type</label>
                <select
                  className="form-control"
                  value={formFreightType}
                  onChange={(e) => setFormFreightType(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                  disabled={freightTypesLoading}
                  required
                >
                  {freightTypesLoading ? (
                    <option value="">Loading freight types...</option>
                  ) : freightTypesError ? (
                    <option value="">Error loading freight types</option>
                  ) : freightTypes.filter(ft => ft.status === 'active').length === 0 ? (
                    <option value="">No freight types available</option>
                  ) : (
                    <>
                      {formFreightType && !freightTypes.some(ft => ft.status === 'active' && ft.name === formFreightType) && (
                        <option value={formFreightType}>{formFreightType}</option>
                      )}
                      {freightTypes
                        .filter(ft => ft.status === 'active')
                        .map((ft) => (
                          <option key={ft.id} value={ft.name}>
                            {ft.name}
                          </option>
                        ))}
                    </>
                  )}
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Status</label>
                <select
                  className="form-control"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Selection Modal */}
      {exportModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '100%', maxWidth: '400px', color: '#333' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>Export Ports Data</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>1. Select File Format</label>
              <div style={{ display: 'flex', gap: '15px' }}>
                <button className="btn btn-secondary" onClick={() => handleExport('xlsx', 'all')} style={{ flex: 1, padding: '10px', background: '#f8fafc', border: '1px solid #ccc' }}>
                  Excel (.xlsx)
                </button>
                <button className="btn btn-secondary" onClick={() => handleExport('csv', 'all')} style={{ flex: 1, padding: '10px', background: '#f8fafc', border: '1px solid #ccc' }}>
                  CSV (.csv)
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>2. Advanced Export Scope</label>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>
                  <button className="btn btn-secondary" onClick={() => handleExport('xlsx', 'all')} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '0.85rem' }}>
                    Export All Records ({ports.length})
                  </button>
                </li>
                <li>
                  <button className="btn btn-secondary" onClick={() => handleExport('xlsx', 'filtered')} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '0.85rem' }} disabled={!searchQuery && !freightTypeFilter}>
                    Export Current Search Results ({filteredPorts.length})
                  </button>
                </li>
                <li>
                  <button className="btn btn-secondary" onClick={() => handleExport('xlsx', 'selected')} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '0.85rem' }} disabled={selectedIds.length === 0}>
                    Export Selected Records ({selectedIds.length})
                  </button>
                </li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setExportModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', color: '#333' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>Bulk Import Ports Manager</h3>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '20px' }}>
              Upload your Excel (.xlsx) or CSV (.csv) file to review and import ports in bulk. Download the template for formatting guidelines.
            </p>

            {/* Step 1: Upload File */}
            {!importPreview && !importSuccessResult && (
              <div>
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: dragOver ? '2px dashed var(--color-primary)' : '2px dashed #ccc',
                    borderRadius: '8px',
                    padding: '40px 20px',
                    textAlign: 'center',
                    background: dragOver ? 'var(--color-primary-soft)' : '#f8fafc',
                    cursor: 'pointer',
                    marginBottom: '20px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept=".xlsx,.csv" 
                    style={{ display: 'none' }} 
                  />
                  <div style={{ fontSize: '24px', marginBottom: '10px' }}>📁</div>
                  <p style={{ fontWeight: 600, margin: '0 0 5px 0' }}>Drag & Drop file here or click to browse</p>
                  <p style={{ fontSize: '0.75rem', color: '#777', margin: 0 }}>Supports .xlsx and .csv files up to 10 MB</p>
                </div>

                {importFile && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', background: '#e0f2fe', borderRadius: '4px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#0369a1' }}>📄 {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)</span>
                    <button className="btn btn-secondary" onClick={() => setImportFile(null)} style={{ padding: '2px 8px', fontSize: '0.75rem', color: 'red' }}>Remove</button>
                  </div>
                )}

                {importLoading && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '5px' }}>Parsing file progress: {importProgress}%</div>
                    <div style={{ width: '100%', height: '8px', background: '#eee', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${importProgress}%`, height: '100%', background: 'var(--color-primary)', transition: 'width 0.2s ease' }}></div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => { setImportModalOpen(false); setImportFile(null); }}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleUploadPreview} disabled={!importFile || importLoading}>
                    {importLoading ? 'Uploading...' : 'Upload & Preview'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Import Preview Grid */}
            {importPreview && !importSuccessResult && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '15px' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ padding: '4px 10px', background: '#f1f5f9', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Total: {importPreview.summary.totalRows}</span>
                    <span style={{ padding: '4px 10px', background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Valid: {importPreview.summary.validRows}</span>
                    <span style={{ padding: '4px 10px', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Errors: {importPreview.summary.invalidRows}</span>
                    <span style={{ padding: '4px 10px', background: 'rgba(217, 119, 6, 0.1)', color: '#d97706', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Duplicates: {importPreview.summary.duplicateRows}</span>
                  </div>
                  {importPreview.errors.length > 0 && (
                    <button className="btn btn-secondary" onClick={handleDownloadErrorReport} style={{ color: 'red', border: '1px solid red', padding: '4px 12px', fontSize: '0.8rem' }}>
                      Download Error Report
                    </button>
                  )}
                </div>

                <div style={{ border: '1px solid #eee', borderRadius: '6px', maxHeight: '350px', overflowY: 'auto', marginBottom: '20px' }}>
                  <table className="data-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>Row</th>
                        <th>Status</th>
                        <th>Port Code</th>
                        <th>Port Name</th>
                        <th>Country</th>
                        <th>Freight Type</th>
                        <th>Status</th>
                        <th>Reason / Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.map((row, idx) => {
                        let bg = '#ffffff';
                        let badgeColor = '#666';
                        let badgeBg = '#f1f5f9';
                        if (row.rowStatus === 'valid') {
                          bg = 'rgba(22, 163, 74, 0.05)';
                          badgeColor = '#16a34a';
                          badgeBg = 'rgba(22, 163, 74, 0.1)';
                        } else if (row.rowStatus === 'invalid') {
                          bg = 'rgba(220, 38, 38, 0.05)';
                          badgeColor = '#dc2626';
                          badgeBg = 'rgba(220, 38, 38, 0.1)';
                        } else if (row.rowStatus === 'duplicate') {
                          bg = 'rgba(217, 119, 6, 0.05)';
                          badgeColor = '#d97706';
                          badgeBg = 'rgba(217, 119, 6, 0.1)';
                        }

                        return (
                          <tr key={idx} style={{ background: bg }}>
                            <td>{row.rowNumber}</td>
                            <td>
                              <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: badgeColor, backgroundColor: badgeBg }}>
                                {row.rowStatus.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600 }}>{row.port_code || 'N/A'}</td>
                            <td>{row.port_name || 'N/A'}</td>
                            <td>{row.country || 'N/A'}</td>
                            <td>{row.freight_type || 'N/A'}</td>
                            <td>{row.status || 'N/A'}</td>
                            <td style={{ fontSize: '0.8rem', color: row.rowStatus !== 'valid' ? '#dc2626' : '#555' }}>
                              {row.reason || 'OK'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => { setImportPreview(null); setImportFile(null); }}>Back</button>
                  <button className="btn btn-primary" onClick={handleCommitImport} disabled={importPreview.summary.validRows === 0 || importLoading}>
                    {importLoading ? 'Importing...' : `Import ${importPreview.summary.validRows} Valid Rows`}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Success Import Summary */}
            {importSuccessResult && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎉</div>
                <h4 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>Import Completed Successfully</h4>
                <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '20px' }}>
                  Your data has been processed. Here is the import summary.
                </p>

                <div style={{ display: 'inline-flex', gap: '15px', background: '#f8fafc', padding: '20px 40px', borderRadius: '8px', border: '1px solid #eee', marginBottom: '30px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#16a34a' }}>{importSuccessResult.imported}</div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>Imported</div>
                  </div>
                  <div style={{ width: '1px', background: '#ccc' }}></div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#d97706' }}>{importSuccessResult.duplicates}</div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>Duplicates</div>
                  </div>
                  <div style={{ width: '1px', background: '#ccc' }}></div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>{importSuccessResult.failed}</div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>Failed</div>
                  </div>
                </div>

                <div>
                  <button className="btn btn-primary" onClick={() => {
                    setImportModalOpen(false);
                    setImportPreview(null);
                    setImportFile(null);
                    setImportSuccessResult(null);
                  }}>
                    Close Manager
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
