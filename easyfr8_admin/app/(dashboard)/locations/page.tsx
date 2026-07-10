'use client';

import React, { useState, useEffect } from 'react';

interface Location {
  id: string;
  port_code: string;
  name: string;
  country: string;
  type: string;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);

  // Form fields
  const [formPortCode, setFormPortCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCountry, setFormCountry] = useState('');
  const [formType, setFormType] = useState('Ocean');

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/locations');
      const data = await res.json();
      if (Array.isArray(data)) {
        setLocations(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleOpenAddModal = () => {
    setModalMode('create');
    setEditingLocationId(null);
    setFormPortCode('');
    setFormName('');
    setFormCountry('');
    setFormType('Ocean');
    setModalOpen(true);
  };

  const handleOpenEditModal = (loc: Location) => {
    setModalMode('edit');
    setEditingLocationId(loc.id);
    setFormPortCode(loc.port_code);
    setFormName(loc.name);
    setFormCountry(loc.country);
    setFormType(loc.type);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPortCode || !formName || !formCountry) return;

    try {
      const payload = {
        port_code: formPortCode,
        name: formName,
        country: formCountry,
        type: formType,
      };

      if (modalMode === 'create') {
        const id = `loc-${Math.floor(100 + Math.random() * 900)}`;
        const res = await fetch('/api/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...payload }),
        });
        if (res.ok) {
          fetchLocations();
          setModalOpen(false);
        }
      } else {
        const res = await fetch(`/api/locations/${editingLocationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          fetchLocations();
          setModalOpen(false);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(`Are you sure you want to permanently delete Location ${id}?`)) {
      try {
        const res = await fetch(`/api/locations/${id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          fetchLocations();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredLocations = locations.filter((l) =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.port_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Ports & Locations</h1>
          <p className="page-subtitle">Configure maritime ports and IATA airport terminals globally.</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={handleOpenAddModal}>+ Add Location</button>
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
                <th>Location ID</th>
                <th>Port Code</th>
                <th>Name</th>
                <th>Country</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>Loading...</td>
                </tr>
              ) : filteredLocations.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>No locations found.</td>
                </tr>
              ) : (
                filteredLocations.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{l.id}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{l.port_code}</td>
                    <td style={{ fontWeight: 500 }}>{l.name}</td>
                    <td>{l.country}</td>
                    <td>
                      <span style={{ fontSize: '0.8rem', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                        {l.type}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" onClick={() => handleOpenEditModal(l)} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Edit</button>
                        <button className="btn btn-secondary" onClick={() => handleDelete(l.id)} style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'red' }}>Delete</button>
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
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>{modalMode === 'create' ? 'Add Location' : 'Edit Location'}</h3>
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Port / Location Code</label>
                <input
                  type="text"
                  className="form-control"
                  value={formPortCode}
                  onChange={(e) => setFormPortCode(e.target.value)}
                  required
                  placeholder="e.g. SGPIN"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Port / Location Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="e.g. Singapore"
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
                  placeholder="e.g. Singapore"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Type</label>
                <select
                  className="form-control"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  <option value="Ocean">Ocean</option>
                  <option value="Air">Air</option>
                  <option value="Road">Road</option>
                  <option value="Rail">Rail</option>
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
