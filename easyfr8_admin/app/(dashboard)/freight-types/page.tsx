'use client';

import React, { useState, useEffect } from 'react';

interface FreightType {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  sort_order: number;
}

export default function FreightTypesPage() {
  const [types, setTypes] = useState<FreightType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formSortOrder, setFormSortOrder] = useState(0);

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/freight-types');
      const data = await res.json();
      if (Array.isArray(data)) {
        setTypes(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleOpenAddModal = () => {
    setModalMode('create');
    setEditingTypeId(null);
    setFormName('');
    setFormStatus('active');
    setFormSortOrder(0);
    setModalOpen(true);
  };

  const handleOpenEditModal = (t: FreightType) => {
    setModalMode('edit');
    setEditingTypeId(t.id);
    setFormName(t.name);
    setFormStatus(t.status);
    setFormSortOrder(t.sort_order);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) return;

    try {
      const payload = {
        name: formName,
        status: formStatus,
        sort_order: formSortOrder
      };

      if (modalMode === 'create') {
        const id = `ftype-${Math.floor(100 + Math.random() * 900)}`;
        const res = await fetch('/api/freight-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...payload }),
        });
        if (res.ok) {
          fetchTypes();
          setModalOpen(false);
        }
      } else {
        const res = await fetch(`/api/freight-types/${editingTypeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          fetchTypes();
          setModalOpen(false);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(`Are you sure you want to permanently delete Freight Type ${id}?`)) {
      try {
        const res = await fetch(`/api/freight-types/${id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          fetchTypes();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredTypes = types.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Freight Types</h1>
          <p className="page-subtitle">Configure major freight models like Ocean Freight and Air Freight.</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={handleOpenAddModal}>+ Add Freight Type</button>
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
                <th>Type ID</th>
                <th>Name</th>
                <th>Sort Order</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>Loading...</td>
                </tr>
              ) : filteredTypes.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>No freight types found.</td>
                </tr>
              ) : (
                filteredTypes.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.id}</td>
                    <td style={{ fontWeight: 500 }}>{t.name}</td>
                    <td>{t.sort_order}</td>
                    <td>
                      <span className={`status-pill ${t.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" onClick={() => handleOpenEditModal(t)} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Edit</button>
                        <button className="btn btn-secondary" onClick={() => handleDelete(t.id)} style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'red' }}>Delete</button>
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
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>{modalMode === 'create' ? 'Add Freight Type' : 'Edit Freight Type'}</h3>
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
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Sort Order</label>
                <input
                  type="number"
                  className="form-control"
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(Number(e.target.value))}
                  required
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
