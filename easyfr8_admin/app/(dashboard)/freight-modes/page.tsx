'use client';

import React, { useState, useEffect } from 'react';

interface FreightMode {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

export default function FreightModesPage() {
  const [modes, setModes] = useState<FreightMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingModeId, setEditingModeId] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');

  const fetchModes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/freight/modes');
      const data = await res.json();
      if (Array.isArray(data)) {
        setModes(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModes();
  }, []);

  const handleOpenAddModal = () => {
    setModalMode('create');
    setEditingModeId(null);
    setFormName('');
    setFormStatus('active');
    setModalOpen(true);
  };

  const handleOpenEditModal = (mode: FreightMode) => {
    setModalMode('edit');
    setEditingModeId(mode.id);
    setFormName(mode.name);
    setFormStatus(mode.status);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) return;

    try {
      if (modalMode === 'create') {
        const id = `mode-${Math.floor(100 + Math.random() * 900)}`;
        const res = await fetch('/api/freight/modes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, name: formName, status: formStatus }),
        });
        if (res.ok) {
          fetchModes();
          setModalOpen(false);
        }
      } else {
        const res = await fetch(`/api/freight/modes/${editingModeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName, status: formStatus }),
        });
        if (res.ok) {
          fetchModes();
          setModalOpen(false);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(`Are you sure you want to permanently delete Freight Mode ${id}?`)) {
      try {
        const res = await fetch(`/api/freight/modes/${id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          fetchModes();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredModes = modes.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Freight Modes</h1>
          <p className="page-subtitle">Configure major transportation models like Ocean Freight, Air Freight, etc.</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={handleOpenAddModal}>+ Add Freight Mode</button>
        </div>
      </div>

      <div className="table-filter-panel" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
        <div style={{ width: '100%', maxWidth: '320px' }}>
          <input
            type="text"
            className="form-control"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID or name..."
            style={{ height: '36px' }}
          />
        </div>
      </div>

      <div className="chart-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mode ID</th>
                <th>Name</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>Loading...</td>
                </tr>
              ) : filteredModes.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>No freight modes found.</td>
                </tr>
              ) : (
                filteredModes.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.id}</td>
                    <td style={{ fontWeight: 500 }}>{m.name}</td>
                    <td>
                      <span className={`status-pill ${m.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" onClick={() => handleOpenEditModal(m)} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Edit</button>
                        <button className="btn btn-secondary" onClick={() => handleDelete(m.id)} style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'red' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '100%', maxWidth: '450px', color: '#333' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>{modalMode === 'create' ? 'Add Freight Mode' : 'Edit Freight Mode'}</h3>
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="e.g. Ocean Freight"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
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
    </>
  );
}
