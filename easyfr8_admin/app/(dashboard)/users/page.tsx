'use client';

import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { UserAccount } from '../../../lib/store';
import { UserService } from '../../../services/api';
import Pagination from '../../../components/Pagination';
import { exportToCSV, parseCSV } from '../../../lib/csvUtils';

const ROWS_PER_PAGE = 5;

function compressImageBase64(file: File, maxWidth = 500, maxHeight = 500, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(event.target?.result as string);
    };
    reader.onerror = (error) => reject(error);
  });
}

export default function UsersPage() {
  const { users, addUser, updateUser, deleteUser, showToast } = useData();

  // Search & Role filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | UserAccount['role']>('All');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals / Drawer Control
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<UserAccount['role']>('Manager');
  const [formAvatar, setFormAvatar] = useState('');

  // CSV Import Drawer
  const [csvDrawerOpen, setCsvDrawerOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvFileName, setCsvFileName] = useState('');

  // User Details Drawer
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);

  // Filtered & Paginated List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === 'All' || u.role === roleFilter;
      const matchesSearch = searchQuery.trim() === '' ||
        u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, searchQuery]);

  const totalPages = Math.ceil(filteredUsers.length / ROWS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const handlePageChange = (p: number) => {
    setCurrentPage(p);
  };

  // Add/Edit Actions
  const handleOpenAddModal = () => {
    setModalMode('create');
    setEditingUserId(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormRole('Manager');
    setFormAvatar('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (user: UserAccount) => {
    setModalMode('edit');
    setEditingUserId(user.id);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPhone(user.phone || '');
    setFormRole(user.role);
    setFormAvatar(user.avatar || '');
    setModalOpen(true);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageBase64(file, 400, 400, 0.85);
        setFormAvatar(compressed);
      } catch (err) {
        console.error('Failed to compress avatar:', err);
        const reader = new FileReader();
        reader.onload = (evt) => {
          if (evt.target?.result) {
            setFormAvatar(evt.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      showToast('Name and Email are required fields.', 'danger');
      return;
    }

    if (modalMode === 'create') {
      const newUser: UserAccount = {
        id: `USR-${Math.floor(100 + Math.random() * 900)}`,
        name: formName,
        email: formEmail,
        phone: formPhone,
        role: formRole,
        status: 'Active',
        regDate: new Date().toISOString().split('T')[0],
        lastLogin: '—',
        avatar: formAvatar,
      };

      try {
        await UserService.create(newUser);
        addUser(newUser);
        showToast(`User account for ${formName} registered successfully!`, 'success');
        setModalOpen(false);
      } catch {
        showToast('Failed to create user account.', 'danger');
      }
    } else if (modalMode === 'edit' && editingUserId) {
      try {
        await UserService.update(editingUserId, { name: formName, email: formEmail, phone: formPhone, role: formRole, avatar: formAvatar });
        updateUser(editingUserId, { name: formName, email: formEmail, phone: formPhone, role: formRole, avatar: formAvatar });
        showToast('User account parameters modified.', 'success');
        setModalOpen(false);
      } catch {
        showToast('Failed to edit user.', 'danger');
      }
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: 'Active' | 'Inactive') => {
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      await UserService.update(id, { status: nextStatus });
      updateUser(id, { status: nextStatus });
      showToast(`User account status set to ${nextStatus}.`, 'success');
    } catch {
      showToast('Failed to modify status.', 'danger');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm(`Are you sure you want to permanently delete User Account ${id}?`)) {
      try {
        await deleteUser(id);
      } catch {
        // Error toast is handled inside deleteUser
      }
    }
  };

  const handleResetPassword = async (id: string, name: string) => {
    try {
      await UserService.resetPassword(id);
      showToast(`Password reset notification email dispatched to ${name}.`, 'info');
    } catch {
      showToast('Failed to trigger password reset link.', 'danger');
    }
  };

  // CSV Operations
  const handleExportCSV = () => {
    exportToCSV(filteredUsers, 'users_export.csv', [
      { key: 'id', label: 'User ID' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'role', label: 'Role' },
      { key: 'status', label: 'Status' },
      { key: 'regDate', label: 'Registration Date' },
      { key: 'lastLogin', label: 'Last Login' },
    ]);
    showToast(`Exported ${filteredUsers.length} user records to CSV.`, 'success');
  };

  const handleCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        const parsed = parseCSV(evt.target.result as string);
        setCsvRows(parsed);
      }
    };
    reader.readAsText(file);
  };

  const handleImportCSV = () => {
    if (csvRows.length === 0) {
      showToast('No valid CSV rows loaded.', 'warning');
      return;
    }

    let count = 0;
    csvRows.forEach((row) => {
      if (row['Name'] && row['Email']) {
        const newUser: UserAccount = {
          id: `USR-${Math.floor(100 + Math.random() * 900)}`,
          name: row['Name'],
          email: row['Email'],
          phone: row['Phone'] || '',
          role: (row['Role'] as UserAccount['role']) || 'Customer',
          status: (row['Status'] as UserAccount['status']) || 'Active',
          regDate: row['Registration Date'] || new Date().toISOString().split('T')[0],
          lastLogin: '—',
          avatar: '',
        };
        addUser(newUser);
        count++;
      }
    });

    showToast(`Bulk imported ${count} users successfully.`, 'success');
    setCsvDrawerOpen(false);
    setCsvRows([]);
    setCsvFileName('');
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Accounts Control Desk</h1>
          <p className="page-subtitle">Configure administrative login access, system manager accounts, and client details.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary" onClick={() => setCsvDrawerOpen(true)}>Import CSV</button>
          <button className="btn btn-secondary" onClick={handleExportCSV}>Export CSV</button>
          <button className="btn btn-primary" onClick={handleOpenAddModal}>+ Register User</button>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="table-filter-panel" style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {(['All', 'Administrator', 'Manager', 'Content Moderator', 'Customer'] as const).map((r) => (
            <button
              key={r}
              className={`btn ${roleFilter === r ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setRoleFilter(r); setCurrentPage(1); }}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              {r === 'All' ? 'All Roles' : r}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, maxWidth: '320px' }}>
          <input
            type="text"
            className="form-control"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search by ID, name, email or phone..."
            style={{ height: '36px' }}
          />
        </div>
      </div>

      {/* USERS DATA TABLE */}
      <div className="chart-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Full Name</th>
                <th>Email Address</th>
                <th>Phone</th>
                <th>Access Role</th>
                <th>Last Login</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>
                    No users matching criteria found.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.id}</td>
                    <td style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=40&h=40'}
                        alt=""
                        style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <span>{u.name}</span>
                    </td>
                    <td>{u.email}</td>
                    <td>{u.phone || '—'}</td>
                    <td>
                      <span style={{ fontSize: '0.8rem', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                        {u.role}
                      </span>
                    </td>
                    <td>{u.lastLogin}</td>
                    <td>
                      <span className={`status-pill ${u.status === 'Active' ? 'status-active' : 'status-inactive'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => { setSelectedUser(u); setDetailsDrawerOpen(true); }}
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          Details
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleOpenEditModal(u)}
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          Edit
                        </button>
                        <button
                          className={`btn ${u.status === 'Active' ? 'btn-secondary' : 'btn-primary'}`}
                          onClick={() => handleToggleStatus(u.id, u.status)}
                          style={{ padding: '4px 10px', fontSize: '0.75rem', minWidth: '80px' }}
                        >
                          {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleResetPassword(u.id, u.name)}
                          title="Trigger Password Reset"
                          style={{ padding: '4px 8px' }}
                        >
                          🔒
                        </button>
                        <button
                          className="btn btn-secondary btn-icon"
                          onClick={() => handleDeleteUser(u.id)}
                          title="Delete User"
                        >
                          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" style={{ width: '14px', height: '14px', color: 'var(--color-danger)' }}>
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} totalRows={filteredUsers.length} rowsPerPage={ROWS_PER_PAGE} onPageChange={handlePageChange} />
      </div>

      {/* REGISTER / EDIT USER MODAL */}
      {modalOpen && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="modal-container" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>{modalMode === 'create' ? 'Register Account Profile' : 'Modify User Details'}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input type="text" className="form-control" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Vikas Verma" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input type="email" className="form-control" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="e.g. vikas@broker.com" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="text" className="form-control" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="e.g. +91 99001 12233" />
                </div>
                <div className="form-group">
                  <label className="form-label">Access Control Role</label>
                  <select
                    className="form-control"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as any)}
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Manager">Manager</option>
                    <option value="Content Moderator">Content Moderator</option>
                    <option value="Customer">Customer</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Avatar Profile Image</span>
                    {formAvatar && (
                      <button
                        type="button"
                        onClick={() => setFormAvatar('')}
                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
                      >
                        ✕ Remove Avatar
                      </button>
                    )}
                  </label>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{
                      position: 'relative',
                      border: '1px dashed var(--border-color)',
                      padding: '12px 16px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      flex: 1,
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      display: 'block'
                    }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                        {formAvatar ? '🔄 Replace Avatar from Computer' : '📁 Upload Avatar from Computer'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                      />
                    </label>
                    {formAvatar && (
                      <div style={{ position: 'relative' }}>
                        <img
                          src={formAvatar}
                          alt="Avatar preview"
                          style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #3b82f6', display: 'block' }}
                        />
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Or enter image URL / media path..."
                    value={formAvatar.startsWith('data:') ? '(Image file uploaded)' : formAvatar}
                    onChange={(e) => setFormAvatar(e.target.value)}
                    style={{ fontSize: '0.8rem', color: formAvatar.startsWith('data:') ? 'var(--text-muted)' : 'inherit' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{modalMode === 'create' ? 'Create User Account' : 'Save Details'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER DETAILS DRAWER */}
      {detailsDrawerOpen && selectedUser && (
        <div className="drawer-overlay active" style={{ display: 'flex' }}>
          <div className="drawer-container">
            <div className="drawer-header">
              <h3>Account Profile Details</h3>
              <button className="drawer-close" onClick={() => setDetailsDrawerOpen(false)}>
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="drawer-body" style={{ textAlign: 'center' }}>
              <img
                src={selectedUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150'}
                alt=""
                style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-primary)', margin: 'var(--space-4) auto' }}
              />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedUser.name}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-6)' }}>Role: <b>{selectedUser.role}</b></p>
              
              <div style={{ textAlign: 'left', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
                <div style={{ marginBottom: '12px' }}><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>User ID</span><div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{selectedUser.id}</div></div>
                <div style={{ marginBottom: '12px' }}><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email Address</span><div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{selectedUser.email}</div></div>
                <div style={{ marginBottom: '12px' }}><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phone Number</span><div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{selectedUser.phone || '—'}</div></div>
                <div style={{ marginBottom: '12px' }}><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</span><div><span className={`status-pill ${selectedUser.status === 'Active' ? 'status-active' : 'status-inactive'}`}>{selectedUser.status}</span></div></div>
                <div style={{ marginBottom: '12px' }}><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registration Date</span><div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{selectedUser.regDate}</div></div>
                <div><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last Active Session</span><div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{selectedUser.lastLogin}</div></div>
              </div>
            </div>
            <div className="drawer-footer">
              <button className="btn btn-secondary" onClick={() => setDetailsDrawerOpen(false)}>Close Window</button>
            </div>
          </div>
        </div>
      )}

      {/* CSV IMPORT DRAWER */}
      {csvDrawerOpen && (
        <div className="drawer-overlay active" style={{ display: 'flex' }}>
          <div className="drawer-container">
            <div className="drawer-header">
              <h3>Bulk Import Administrative Users</h3>
              <button className="drawer-close" onClick={() => { setCsvDrawerOpen(false); setCsvRows([]); setCsvFileName(''); }}>
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="drawer-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                Import users template requires: <code>Name, Email, Phone, Role, Status, Registration Date</code> columns.
              </p>
              <div style={{ position: 'relative', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', textAlign: 'center', cursor: 'pointer' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '28px', height: '28px', margin: '0 auto var(--space-2)' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                <p style={{ fontSize: '0.85rem', margin: 0 }}>{csvFileName || 'Drag and drop user lists template'}</p>
                <input type="file" accept=".csv" onChange={handleCSVFile} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
              </div>
              {csvRows.length > 0 && (
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Rows found: {csvRows.length}</p>
                </div>
              )}
            </div>
            <div className="drawer-footer">
              <button type="button" className="btn btn-secondary" onClick={() => { setCsvDrawerOpen(false); setCsvRows([]); setCsvFileName(''); }}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleImportCSV} disabled={csvRows.length === 0}>Import Users</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
