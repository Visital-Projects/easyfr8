'use client';

import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { Enquiry } from '../../../lib/store';
import { EnquiryService } from '../../../services/api';
import Pagination from '../../../components/Pagination';
import { exportToCSV, parseCSV } from '../../../lib/csvUtils';

const ROWS_PER_PAGE = 5;

export default function EnquiriesPage() {
  const { enquiries, addEnquiry, updateEnquiry, deleteEnquiry, bulkDeleteEnquiries, bulkUpdateEnquiryStatus, users, showToast } = useData();

  // ── Filters ───────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | Enquiry['status']>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // ── Bulk selection ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<Enquiry['status']>('In Progress');

  // ── Detail Drawer ─────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEnq, setSelectedEnq] = useState<Enquiry | null>(null);
  const [noteText, setNoteText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<Enquiry['status']>('New');
  const [assignedTo, setAssignedTo] = useState('');

  // ── Create Enquiry Modal ──────────────────────────────────────────────────
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createSubject, setCreateSubject] = useState('');
  const [createSource, setCreateSource] = useState('Web Form');

  // ── CSV Import Drawer ─────────────────────────────────────────────────────
  const [csvDrawerOpen, setCsvDrawerOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvFileName, setCsvFileName] = useState('');

  // ── Filtered & Paginated ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return enquiries.filter((item) => {
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
      const matchesSearch = searchQuery.trim() === '' ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFrom = !dateFrom || item.date >= dateFrom;
      const matchesTo = !dateTo || item.date <= dateTo;
      return matchesStatus && matchesSearch && matchesFrom && matchesTo;
    });
  }, [enquiries, statusFilter, searchQuery, dateFrom, dateTo]);

  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const handlePageChange = (p: number) => { setCurrentPage(p); setSelectedIds([]); };

  // ── Drawer handlers ───────────────────────────────────────────────────────
  const handleOpenDrawer = (enq: Enquiry) => {
    setSelectedEnq(enq);
    setNoteText(enq.notes);
    setSelectedStatus(enq.status);
    setAssignedTo(enq.assignedTo || '');
    setDrawerOpen(true);
  };

  const handleSaveEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnq) return;
    try {
      await EnquiryService.update(selectedEnq.id, { status: selectedStatus, notes: noteText, assignedTo });
      updateEnquiry(selectedEnq.id, { status: selectedStatus, notes: noteText, assignedTo });
      showToast('Enquiry updated successfully.', 'success');
      setDrawerOpen(false);
    } catch {
      showToast('Failed to update enquiry.', 'danger');
    }
  };

  const handleDeleteSingle = async (id: string) => {
    if (!confirm(`Delete enquiry ${id}?`)) return;
    try {
      await EnquiryService.delete(id);
      deleteEnquiry(id);
      showToast('Enquiry deleted.', 'success');
    } catch {
      showToast('Failed to delete enquiry.', 'danger');
    }
  };

  // ── Bulk ──────────────────────────────────────────────────────────────────
  const toggleSelectAll = () => {
    if (selectedIds.length === paginated.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginated.map((e) => e.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleBulkStatusChange = () => {
    if (selectedIds.length === 0) { showToast('Select at least one enquiry.', 'warning'); return; }
    bulkUpdateEnquiryStatus(selectedIds, bulkStatus);
    showToast(`${selectedIds.length} enquiries updated to "${bulkStatus}".`, 'success');
    setSelectedIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) { showToast('Select at least one enquiry.', 'warning'); return; }
    if (!confirm(`Delete ${selectedIds.length} selected enquiries?`)) return;
    bulkDeleteEnquiries(selectedIds);
    showToast(`${selectedIds.length} enquiries deleted.`, 'success');
    setSelectedIds([]);
  };

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName || !createEmail || !createSubject) { showToast('All fields required.', 'danger'); return; }
    addEnquiry({ name: createName, email: createEmail, subject: createSubject, status: 'New', notes: '', assignedTo: '', source: createSource });
    showToast('Enquiry created.', 'success');
    setCreateModalOpen(false);
    setCreateName(''); setCreateEmail(''); setCreateSubject('');
  };

  // ── CSV Export ────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Service Type', 'Message', 'Status', 'Created Date'];
    const rows = filtered.map(item => [
      item.name,
      item.email,
      item.phone || '',
      item.subject || '', // Subject maps to Service Type
      item.notes || '',   // Notes maps to Message
      item.status,
      item.date
    ]);
    
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
      const escapedRow = row.map(val => {
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      });
      csvContent += escapedRow.join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enquiries_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`Exported ${filtered.length} enquiries to CSV.`, 'success');
  };

  const handleExportExcel = () => {
    const headers = ['Name', 'Email', 'Phone', 'Service Type', 'Message', 'Status', 'Created Date'];
    const rows = filtered.map(item => [
      item.name,
      item.email,
      item.phone || '',
      item.subject || '', 
      item.notes || '',   
      item.status,
      item.date
    ]);

    let xml = '<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Enquiries"><Table>';
    
    xml += '<Row>';
    headers.forEach(h => {
      xml += `<Cell><Data ss:Type="String">${h}</Data></Cell>`;
    });
    xml += '</Row>';

    rows.forEach(r => {
      xml += '<Row>';
      r.forEach(val => {
        xml += `<Cell><Data ss:Type="String">${val}</Data></Cell>`;
      });
      xml += '</Row>';
    });

    xml += '</Table></Worksheet></Workbook>';

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enquiries_export.xls';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`Exported ${filtered.length} enquiries to Excel.`, 'success');
  };

  // ── CSV Import ────────────────────────────────────────────────────────────
  const handleCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        const rows = parseCSV(evt.target.result as string);
        setCsvRows(rows);
      }
    };
    reader.readAsText(file);
  };

  const handleImportCSV = () => {
    if (csvRows.length === 0) { showToast('No valid rows found in CSV.', 'warning'); return; }
    let imported = 0;
    csvRows.forEach((row) => {
      if (row['Name'] && row['Email'] && row['Subject']) {
        addEnquiry({
          name: row['Name'],
          email: row['Email'],
          subject: row['Subject'],
          status: (row['Status'] as Enquiry['status']) || 'New',
          notes: row['Notes'] || '',
          assignedTo: row['Assigned To'] || '',
          source: row['Source'] || 'CSV Import',
        });
        imported++;
      }
    });
    showToast(`Imported ${imported} enquiries.`, 'success');
    setCsvDrawerOpen(false);
    setCsvRows([]);
    setCsvFileName('');
  };

  const statusBadge = (status: Enquiry['status']) => {
    const map: Record<string, string> = {
      'New': 'status-info',
      'In Progress': 'status-warning',
      'Responded': 'status-active',
      'Closed': 'status-inactive',
    };
    return <span className={`status-pill ${map[status] ?? ''}`}>{status}</span>;
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Enquiry Management</h1>
          <p className="page-subtitle">View, manage, and respond to customer freight enquiries.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary" onClick={() => setCsvDrawerOpen(true)}>Import CSV</button>
          <button className="btn btn-secondary" onClick={handleExportCSV}>Export CSV</button>
          <button className="btn btn-secondary" onClick={handleExportExcel}>Export Excel</button>
          <button className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>+ New Enquiry</button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="chart-card" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Search</label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '6px 10px', background: 'var(--bg-primary)' }}>
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ width: '14px', height: '14px', color: 'var(--text-muted)', flexShrink: 0 }}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Search by name, email, subject..." style={{ border: 'none', background: 'none', outline: 'none', fontSize: '0.85rem', marginLeft: '8px', width: '100%' }} />
            </div>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Status</label>
            <select className="form-control" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setCurrentPage(1); }} style={{ width: 'auto' }}>
              <option value="All">All</option>
              <option value="New">New</option>
              <option value="In Progress">In Progress</option>
              <option value="Responded">Responded</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Date From</label>
            <input type="date" className="form-control" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }} style={{ width: 'auto' }} />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Date To</label>
            <input type="date" className="form-control" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }} style={{ width: 'auto' }} />
          </div>
          {(dateFrom || dateTo || searchQuery || statusFilter !== 'All') && (
            <button className="btn btn-secondary" onClick={() => { setDateFrom(''); setDateTo(''); setSearchQuery(''); setStatusFilter('All'); setCurrentPage(1); }}>Clear Filters</button>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'var(--color-primary-soft, rgba(59,130,246,0.08))', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{selectedIds.length} selected</span>
          <select className="form-control" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as Enquiry['status'])} style={{ width: 'auto' }}>
            <option value="New">New</option>
            <option value="In Progress">In Progress</option>
            <option value="Responded">Responded</option>
            <option value="Closed">Closed</option>
          </select>
          <button className="btn btn-secondary" onClick={handleBulkStatusChange}>Update Status</button>
          <button className="btn btn-danger" onClick={handleBulkDelete}>Delete Selected</button>
          <button className="btn btn-secondary" onClick={() => setSelectedIds([])}>Deselect All</button>
        </div>
      )}

      {/* Table */}
      <div className="chart-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '36px' }}>
                  <input type="checkbox" checked={selectedIds.length === paginated.length && paginated.length > 0} onChange={toggleSelectAll} />
                </th>
                <th>ID</th>
                <th>Customer</th>
                <th>Subject</th>
                <th>Date</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>No enquiries match your filters.</td></tr>
              ) : paginated.map((item) => (
                <tr key={item.id} style={{ background: selectedIds.includes(item.id) ? 'var(--bg-secondary)' : undefined }}>
                  <td>
                    <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelectOne(item.id)} />
                  </td>
                  <td style={{ fontWeight: 600, fontSize: '0.8rem' }}>{item.id}</td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.email}</div>
                  </td>
                  <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{item.subject}</td>
                  <td style={{ fontSize: '0.8rem' }}>{item.date}</td>
                  <td>{statusBadge(item.status)}</td>
                  <td style={{ fontSize: '0.8rem', color: item.assignedTo ? 'var(--text-primary)' : 'var(--text-muted)' }}>{item.assignedTo || '—'}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn btn-secondary" onClick={() => handleOpenDrawer(item)} style={{ padding: '4px 10px', fontSize: '0.75rem', marginRight: 'var(--space-2)' }}>View</button>
                    <button className="btn btn-danger" onClick={() => handleDeleteSingle(item.id)} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} totalRows={filtered.length} rowsPerPage={ROWS_PER_PAGE} onPageChange={handlePageChange} />
      </div>

      {/* Detail Drawer */}
      {drawerOpen && selectedEnq && (
        <div className="drawer-overlay active" style={{ display: 'flex' }}>
          <div className="drawer-container">
            <div className="drawer-header">
              <div>
                <h3>Enquiry Detail — {selectedEnq.id}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>{selectedEnq.name} · {selectedEnq.email}</p>
              </div>
              <button className="drawer-close" onClick={() => setDrawerOpen(false)}>
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSaveEnquiry}>
              <div className="drawer-body">
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input type="text" className="form-control" value={selectedEnq.subject} readOnly style={{ background: 'var(--bg-secondary)' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Date Received</label>
                  <input type="text" className="form-control" value={selectedEnq.date} readOnly style={{ background: 'var(--bg-secondary)' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Source</label>
                  <input type="text" className="form-control" value={selectedEnq.source || 'Web Form'} readOnly style={{ background: 'var(--bg-secondary)' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Update Status</label>
                  <select className="form-control" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as Enquiry['status'])}>
                    <option value="New">New</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Responded">Responded</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Assign To</label>
                  <select className="form-control" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                    <option value="">— Unassigned —</option>
                    {users.map((u) => <option key={u.id} value={u.name}>{u.name} ({u.role})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Internal Notes</label>
                  <textarea className="form-control" value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={5}></textarea>
                </div>
              </div>
              <div className="drawer-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setDrawerOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Enquiry Modal */}
      {createModalOpen && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="modal-container">
            <div className="modal-header">
              <h3>Create New Enquiry</h3>
              <button className="modal-close" onClick={() => setCreateModalOpen(false)}>
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Customer Name *</label><input type="text" className="form-control" value={createName} onChange={(e) => setCreateName(e.target.value)} required /></div>
                <div className="form-group"><label className="form-label">Email Address *</label><input type="email" className="form-control" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} required /></div>
                <div className="form-group"><label className="form-label">Subject / Request *</label><input type="text" className="form-control" value={createSubject} onChange={(e) => setCreateSubject(e.target.value)} required /></div>
                <div className="form-group">
                  <label className="form-label">Source</label>
                  <select className="form-control" value={createSource} onChange={(e) => setCreateSource(e.target.value)}>
                    <option value="Web Form">Web Form</option>
                    <option value="Email">Email</option>
                    <option value="Phone">Phone</option>
                    <option value="Walk-in">Walk-in</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCreateModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Enquiry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Drawer */}
      {csvDrawerOpen && (
        <div className="drawer-overlay active" style={{ display: 'flex' }}>
          <div className="drawer-container">
            <div className="drawer-header">
              <h3>Import Enquiries from CSV</h3>
              <button className="drawer-close" onClick={() => { setCsvDrawerOpen(false); setCsvRows([]); setCsvFileName(''); }}>
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="drawer-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                CSV must have columns: <code>Name, Email, Subject, Status, Notes, Assigned To, Source</code>
              </p>
              <div style={{ position: 'relative', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', textAlign: 'center', cursor: 'pointer' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '28px', height: '28px', margin: '0 auto var(--space-2)' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                <p style={{ fontSize: '0.85rem', margin: 0 }}>{csvFileName || 'Click to select a CSV file'}</p>
                <input type="file" accept=".csv" onChange={handleCSVFile} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
              </div>
              {csvRows.length > 0 && (
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Preview ({csvRows.length} rows):</p>
                  <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <table className="data-table" style={{ fontSize: '0.75rem' }}>
                      <thead><tr>{Object.keys(csvRows[0]).map((k) => <th key={k}>{k}</th>)}</tr></thead>
                      <tbody>{csvRows.slice(0, 5).map((row, i) => <tr key={i}>{Object.values(row).map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="drawer-footer">
              <button type="button" className="btn btn-secondary" onClick={() => { setCsvDrawerOpen(false); setCsvRows([]); setCsvFileName(''); }}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleImportCSV} disabled={csvRows.length === 0}>Import {csvRows.length > 0 ? `(${csvRows.length} rows)` : ''}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
