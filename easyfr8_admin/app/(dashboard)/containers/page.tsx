'use client';

import React, { useState, useEffect } from 'react';

interface ContainerType {
  id: string;
  name: string;
  description: string;
  size: string;
  status: 'active' | 'inactive';
}

export default function ContainersPage() {
  const [containers, setContainers] = useState<ContainerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingContainerId, setEditingContainerId] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSize, setFormSize] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');

  const fetchContainers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/containers');
      const data = await res.json();
      if (Array.isArray(data)) {
        setContainers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContainers();
  }, []);

  const handleOpenAddModal = () => {
    setModalMode('create');
    setEditingContainerId(null);
    setFormName('');
    setFormDescription('');
    setFormSize('');
    setFormStatus('active');
    setModalOpen(true);
  };

  const handleOpenEditModal = (c: ContainerType) => {
    setModalMode('edit');
    setEditingContainerId(c.id);
    setFormName(c.name);
    setFormDescription(c.description);
    setFormSize(c.size || '');
    setFormStatus(c.status);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) return;

    try {
      const payload = {
        name: formName,
        description: formDescription,
        size: formSize,
        status: formStatus,
      };

      if (modalMode === 'create') {
        const id = `container-${Math.floor(100 + Math.random() * 900)}`;
        const res = await fetch('/api/containers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...payload }),
        });
        if (res.ok) {
          fetchContainers();
          setModalOpen(false);
        }
      } else {
        const res = await fetch(`/api/containers/${editingContainerId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          fetchContainers();
          setModalOpen(false);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(`Are you sure you want to permanently delete Container ${id}?`)) {
      try {
        const res = await fetch(`/api/containers/${id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          fetchContainers();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredContainers = containers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Containers</h1>
          <p className="page-subtitle">Configure container sizes like 20 GP, 40 HC, 40 Open Top, etc.</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={handleOpenAddModal}>+ Add Container</button>
        </div>
      </div>

      <div className="table-filter-panel" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
        <div style={{ width: '100%', maxWidth: '320px' }}>
          <input
            type="text"
            className="form-control"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, name or description..."
            style={{ height: '36px' }}
          />
        </div>
      </div>

      <div className="chart-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Container ID</th>
                <th>Name</th>
                <th>Description</th>
                <th>Size</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>Loading...</td>
                </tr>
              ) : filteredContainers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>No containers found.</td>
                </tr>
              ) : (
                filteredContainers.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.id}</td>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td>{c.description || '—'}</td>
                    <td>{c.size || '—'}</td>
                    <td>
                      <span className={`status-pill ${c.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" onClick={() => handleOpenEditModal(c)} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Edit</button>
                        <button className="btn btn-secondary" onClick={() => handleDelete(c.id)} style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'red' }}>Delete</button>
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
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>{modalMode === 'create' ? 'Add Container' : 'Edit Container'}</h3>
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="e.g. 40 HC"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Description</label>
                <input
                  type="text"
                  className="form-control"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. 40ft High Cube Container"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Size</label>
                <input
                  type="text"
                  className="form-control"
                  value={formSize}
                  onChange={(e) => setFormSize(e.target.value)}
                  placeholder="e.g. 40ft"
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
