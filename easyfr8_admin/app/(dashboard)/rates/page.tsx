'use client';

import React, { useState, useEffect } from 'react';

interface FreightMode {
  id: string;
  name: string;
}

interface ShipmentType {
  id: string;
  freight_type_id: string;
  name: string;
}

interface Location {
  id: string;
  port_code: string;
  name: string;
  country: string;
}

interface ContainerType {
  id: string;
  name: string;
}

interface FreightRate {
  id: string;
  freight_mode_id: string;
  shipment_type_id: string;
  origin_id: string;
  destination_id: string;
  container_id: string | null;
  price: number;
  currency: string;
  transit_time: number;
  carrier: string;
  status: 'active' | 'inactive';
  mode_name?: string;
  shipment_name?: string;
  origin_code?: string;
  origin_name?: string;
  origin_country?: string;
  destination_code?: string;
  destination_name?: string;
  destination_country?: string;
  container_name?: string | null;
}

export default function RatesPage() {
  const [rates, setRates] = useState<FreightRate[]>([]);
  const [modes, setModes] = useState<FreightMode[]>([]);
  const [shipmentTypes, setShipmentTypes] = useState<ShipmentType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [containers, setContainers] = useState<ContainerType[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [rateHistory, setRateHistory] = useState<any[]>([]);

  // Form fields
  const [formModeId, setFormModeId] = useState('');
  const [formShipmentTypeId, setFormShipmentTypeId] = useState('');
  const [formOriginId, setFormOriginId] = useState('');
  const [formDestinationId, setFormDestinationId] = useState('');
  const [formContainerId, setFormContainerId] = useState('');
  const [formPrice, setFormPrice] = useState(0);
  const [formTransitTime, setFormTransitTime] = useState(0);
  const [formCarrier, setFormCarrier] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resRates, resModes, resShipmentTypes, resPorts, resContainers, resHistory] = await Promise.all([
        fetch('/api/freight-rates'),
        fetch('/api/freight-types'),
        fetch('/api/shipment-types'),
        fetch('/api/ports'),
        fetch('/api/containers'),
        fetch('/api/rates/history'),
      ]);
      
      const [dataRates, dataModes, dataShipmentTypes, dataPorts, dataContainers, dataHistory] = await Promise.all([
        resRates.json(),
        resModes.json(),
        resShipmentTypes.json(),
        resPorts.json(),
        resContainers.json(),
        resHistory.json(),
      ]);

      if (Array.isArray(dataRates)) setRates(dataRates);
      if (Array.isArray(dataModes)) setModes(dataModes);
      if (Array.isArray(dataShipmentTypes)) setShipmentTypes(dataShipmentTypes);
      if (Array.isArray(dataHistory)) setRateHistory(dataHistory);
      
      if (dataPorts && dataPorts.success && Array.isArray(dataPorts.ports)) {
        setLocations(dataPorts.ports.map((p: any) => ({
          id: p.id,
          port_code: p.port_code,
          name: p.port_name,
          country: p.country
        })));
      }
      
      if (Array.isArray(dataContainers)) setContainers(dataContainers);
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
    setEditingRateId(null);
    const defaultModeId = modes[0]?.id || '';
    setFormModeId(defaultModeId);
    const modeSts = shipmentTypes.filter(s => s.freight_type_id === defaultModeId);
    setFormShipmentTypeId(modeSts.length > 0 ? modeSts[0].id : '');
    setFormOriginId(locations[0]?.id || '');
    setFormDestinationId(locations[1]?.id || locations[0]?.id || '');
    setFormContainerId('');
    setFormPrice(100);
    setFormTransitTime(5);
    setFormCarrier('');
    setFormStatus('active');
    setModalOpen(true);
  };

  const handleOpenEditModal = (rate: FreightRate) => {
    setModalMode('edit');
    setEditingRateId(rate.id);
    setFormModeId(rate.freight_mode_id);
    setFormShipmentTypeId(rate.shipment_type_id);
    setFormOriginId(rate.origin_id);
    setFormDestinationId(rate.destination_id);
    setFormContainerId(rate.container_id || '');
    setFormPrice(Number(rate.price));
    setFormTransitTime(rate.transit_time);
    setFormCarrier(rate.carrier);
    setFormStatus(rate.status);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formModeId || !formShipmentTypeId || !formOriginId || !formDestinationId || !formCarrier) return;

    try {
      const payload = {
        freight_mode_id: formModeId,
        shipment_type_id: formShipmentTypeId,
        origin_id: formOriginId,
        destination_id: formDestinationId,
        container_id: formContainerId || null,
        price: formPrice,
        currency: 'USD',
        transit_time: formTransitTime,
        carrier: formCarrier,
        status: formStatus,
      };

      if (modalMode === 'create') {
        const id = `frate-${Math.floor(100 + Math.random() * 900)}`;
        const res = await fetch('/api/freight-rates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...payload }),
        });
        if (res.ok) {
          fetchData();
          setModalOpen(false);
        }
      } else {
        const res = await fetch(`/api/freight-rates/${editingRateId}`, {
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
    if (confirm(`Are you sure you want to permanently delete Freight Rate ${id}?`)) {
      try {
        const res = await fetch(`/api/freight-rates/${id}`, {
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

  // Filter shipment types based on selected mode
  const filteredShipmentTypes = shipmentTypes.filter(s => s.freight_type_id === formModeId);

  // Set default shipment type when mode changes
  useEffect(() => {
    if (filteredShipmentTypes.length > 0 && !formShipmentTypeId) {
      setFormShipmentTypeId(filteredShipmentTypes[0].id);
    }
  }, [formModeId, filteredShipmentTypes]);

  const filteredRates = rates.filter((r) =>
    r.carrier.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.origin_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.destination_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Freight Rates</h1>
          <p className="page-subtitle">Configure prices, carrier lines, and transit times for dynamic matching.</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={handleOpenAddModal}>+ Add Freight Rate</button>
        </div>
      </div>

      <div className="table-filter-panel" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
        <div style={{ width: '100%', maxWidth: '320px' }}>
          <input
            type="text"
            className="form-control"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by carrier, origin or destination..."
            style={{ height: '36px' }}
          />
        </div>
      </div>

      <div className="chart-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rate ID</th>
                <th>Mode</th>
                <th>Shipment</th>
                <th>Origin</th>
                <th>Destination</th>
                <th>Container</th>
                <th>Transit</th>
                <th>Price</th>
                <th>Carrier</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>Loading...</td>
                </tr>
              ) : filteredRates.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>No freight rates found.</td>
                </tr>
              ) : (
                filteredRates.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.id}</td>
                    <td>{r.mode_name}</td>
                    <td>{r.shipment_name}</td>
                    <td>{r.origin_name} ({r.origin_code})</td>
                    <td>{r.destination_name} ({r.destination_code})</td>
                    <td>{r.container_name || '—'}</td>
                    <td>{r.transit_time} Days</td>
                    <td style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>${r.price} {r.currency}</td>
                    <td>{r.carrier}</td>
                    <td>
                      <span className={`status-pill ${r.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" onClick={() => handleOpenEditModal(r)} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Edit</button>
                        <button className="btn btn-secondary" onClick={() => handleDelete(r.id)} style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'red' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rate History Log Panel */}
      <div className="chart-card" style={{ marginTop: 'var(--space-6)' }}>
        <div className="chart-card-header" style={{ marginBottom: 'var(--space-4)' }}>
          <h3 className="chart-card-title">Rate Activity Logs</h3>
        </div>
        
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Action</th>
                <th>Operator</th>
                <th>Details</th>
                <th>Date &amp; Time</th>
              </tr>
            </thead>
            <tbody>
              {rateHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No rate modification activities logged yet.
                  </td>
                </tr>
              ) : (
                rateHistory.slice(0, 10).map((log) => {
                  let details = '';
                  if (log.actionType === 'create' && log.newValue) {
                    details = `Created route: ${log.newValue.origin} → ${log.newValue.destination} ($${log.newValue.price})`;
                  } else if (log.actionType === 'update' && log.newValue) {
                    details = `Updated route: ${log.newValue.origin} → ${log.newValue.destination} ($${log.newValue.price})`;
                  } else if (log.actionType === 'delete' && log.oldValue) {
                    details = `Deleted route: ${log.oldValue.origin} → ${log.oldValue.destination} ($${log.oldValue.price})`;
                  } else {
                    details = 'Route Modification';
                  }

                  return (
                    <tr key={log.id}>
                      <td>
                        <span className={`status-pill ${
                          log.actionType === 'create' ? 'status-info' : log.actionType === 'update' ? 'status-warning' : 'status-inactive'
                        }`} style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
                          {log.actionType}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{log.updatedBy}</td>
                      <td style={{ fontSize: '0.85rem' }}>{details}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(log.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '100%', maxWidth: '500px', color: '#333', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>{modalMode === 'create' ? 'Add Freight Rate' : 'Edit Freight Rate'}</h3>
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Freight Mode</label>
                <select
                  className="form-control"
                  value={formModeId}
                  onChange={(e) => { 
                    const newModeId = e.target.value; 
                    setFormModeId(newModeId); 
                    const modeSts = shipmentTypes.filter(s => s.freight_type_id === newModeId);
                    setFormShipmentTypeId(modeSts.length > 0 ? modeSts[0].id : '');
                  }}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  {modes.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Shipment Type</label>
                <select
                  className="form-control"
                  value={formShipmentTypeId}
                  onChange={(e) => setFormShipmentTypeId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  {filteredShipmentTypes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Origin Location</label>
                <select
                  className="form-control"
                  value={formOriginId}
                  onChange={(e) => setFormOriginId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.port_code})</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Destination Location</label>
                <select
                  className="form-control"
                  value={formDestinationId}
                  onChange={(e) => setFormDestinationId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.port_code})</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Container (Optional)</label>
                <select
                  className="form-control"
                  value={formContainerId}
                  onChange={(e) => setFormContainerId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  <option value="">None (LCL / Air)</option>
                  {containers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Price (USD)</label>
                <input
                  type="number"
                  className="form-control"
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
                  required
                  min="0"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Transit Time (Days)</label>
                <input
                  type="number"
                  className="form-control"
                  value={formTransitTime}
                  onChange={(e) => setFormTransitTime(Number(e.target.value))}
                  required
                  min="0"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Carrier</label>
                <input
                  type="text"
                  className="form-control"
                  value={formCarrier}
                  onChange={(e) => setFormCarrier(e.target.value)}
                  required
                  placeholder="e.g. Maersk Line"
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
