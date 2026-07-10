'use client';

import React, { useState, useEffect } from 'react';

interface Port {
  id: string;
  port_code: string;
  port_name: string;
  country: string;
  freight_type: string;
  status: 'active' | 'inactive';
}

export default function PortsPage() {
  const [ports, setPorts] = useState<Port[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingPortId, setEditingPortId] = useState<string | null>(null);

  // Form fields
  const [formPortCode, setFormPortCode] = useState('');
  const [formPortName, setFormPortName] = useState('');
  const [formCountry, setFormCountry] = useState('');
  const [formFreightType, setFormFreightType] = useState('Ocean');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');

  const fetchPorts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ports');
      const data = await res.json();
      if (data.success && Array.isArray(data.ports)) {
        setPorts(data.ports);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPorts();
  }, []);

  const handleOpenAddModal = () => {
    setModalMode('create');
    setEditingPortId(null);
    setFormPortCode('');
    setFormPortName('');
    setFormCountry('');
    setFormFreightType('Ocean');
    setFormStatus('active');
    setModalOpen(true);
  };

  const handleOpenEditModal = (p: Port) => {
    setModalMode('edit');
    setEditingPortId(p.id);
    setFormPortCode(p.port_code);
    setFormPortName(p.port_name);
    setFormCountry(p.country);
    setFormFreightType(p.freight_type);
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

      if (modalMode === 'create') {
        const id = `port-${Math.floor(100 + Math.random() * 900)}`;
        const res = await fetch('/api/ports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...payload }),
        });
        if (res.ok) {
          fetchPorts();
          setModalOpen(false);
        }
      } else {
        const res = await fetch(`/api/ports/${editingPortId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          fetchPorts();
          setModalOpen(false);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(`Are you sure you want to permanently delete Port ${id}?`)) {
      try {
        const res = await fetch(`/api/ports/${id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          fetchPorts();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredPorts = ports.filter((p) =>
    p.port_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.port_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Ports Manager</h1>
          <p className="page-subtitle">Configure ports and airport codes for autocomplete dropdowns.</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={handleOpenAddModal}>+ Add Port</button>
        </div>
      </div>

      <div className="table-filter-panel" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
        <div style={{ width: '100%', maxWidth: '320px' }}>
          <input
            type="text"
            className="form-control"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, code or country..."
            style={{ height: '36px' }}
          />
        </div>
      </div>

      <div className="chart-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
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
                  <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>Loading...</td>
                </tr>
              ) : filteredPorts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>No ports found.</td>
                </tr>
              ) : (
                filteredPorts.map((p) => (
                  <tr key={p.id}>
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
      </div>

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
                >
                  <option value="Ocean">Ocean</option>
                  <option value="Air">Air</option>
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
    </>
  );
}
