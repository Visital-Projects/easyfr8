'use client';

import React, { useState, useEffect } from 'react';

interface FreightType {
  id: string;
  name: string;
}

interface ShipmentType {
  id: string;
  freight_type_id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  freight_type_name?: string;
}

export default function ShipmentTypesPage() {
  const [shipmentTypes, setShipmentTypes] = useState<ShipmentType[]>([]);
  const [freightTypes, setFreightTypes] = useState<FreightType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);

  // Form fields
  const [formFreightTypeId, setFormFreightTypeId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resShip, resFreight] = await Promise.all([
        fetch('/api/shipment-types'),
        fetch('/api/freight-types'),
      ]);
      const [dataShip, dataFreight] = await Promise.all([
        resShip.json(),
        resFreight.json(),
      ]);

      if (Array.isArray(dataShip)) setShipmentTypes(dataShip);
      if (Array.isArray(dataFreight)) {
        setFreightTypes(dataFreight);
        if (dataFreight.length > 0) {
          setFormFreightTypeId(dataFreight[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddModal = () => {
    setModalMode('create');
    setEditingTypeId(null);
    setFormFreightTypeId(freightTypes[0]?.id || '');
    setFormName('');
    setFormDescription('');
    setFormStatus('active');
    setModalOpen(true);
  };

  const handleOpenEditModal = (st: ShipmentType) => {
    setModalMode('edit');
    setEditingTypeId(st.id);
    setFormFreightTypeId(st.freight_type_id);
    setFormName(st.name);
    setFormDescription(st.description || '');
    setFormStatus(st.status);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFreightTypeId || !formName) return;

    try {
      const payload = {
        freight_type_id: formFreightTypeId,
        name: formName,
        description: formDescription,
        status: formStatus
      };

      if (modalMode === 'create') {
        const id = `shipment-${Math.floor(100 + Math.random() * 900)}`;
        const res = await fetch('/api/shipment-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...payload }),
        });
        if (res.ok) {
          fetchData();
          setModalOpen(false);
        }
      } else {
        const res = await fetch(`/api/shipment-types/${editingTypeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          fetchData();
          setModalOpen(false);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(`Are you sure you want to permanently delete Shipment Type ${id}?`)) {
      try {
        const res = await fetch(`/api/shipment-types/${id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          fetchData();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredTypes = shipmentTypes.filter((st) =>
    st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (st.freight_type_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Shipment Types</h1>
          <p className="page-subtitle">Configure shipment categories like FCL and LCL under Ocean Freight.</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={handleOpenAddModal}>+ Add Shipment Type</button>
        </div>
      </div>

      <div className="table-filter-panel" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
        <div style={{ width: '100%', maxWidth: '320px' }}>
          <input
            type="text"
            className="form-control"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or freight type..."
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
                <th>Freight Type</th>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>Loading...</td>
                </tr>
              ) : filteredTypes.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>No shipment types found.</td>
                </tr>
              ) : (
                filteredTypes.map((st) => (
                  <tr key={st.id}>
                    <td style={{ fontWeight: 600 }}>{st.id}</td>
                    <td>{st.freight_type_name}</td>
                    <td style={{ fontWeight: 500 }}>{st.name}</td>
                    <td>{st.description || '—'}</td>
                    <td>
                      <span className={`status-pill ${st.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                        {st.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" onClick={() => handleOpenEditModal(st)} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Edit</button>
                        <button className="btn btn-secondary" onClick={() => handleDelete(st.id)} style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'red' }}>Delete</button>
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
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>{modalMode === 'create' ? 'Add Shipment Type' : 'Edit Shipment Type'}</h3>
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Freight Type</label>
                <select
                  className="form-control"
                  value={formFreightTypeId}
                  onChange={(e) => setFormFreightTypeId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  {freightTypes.map(ft => (
                    <option key={ft.id} value={ft.id}>{ft.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="e.g. FCL"
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
                  placeholder="e.g. Full Container Load"
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
