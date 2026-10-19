'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import ImportRatesModal from '@/components/ImportRatesModal';
import { exportToCSV, exportToExcel } from '@/lib/csvUtils';
import Pagination from '@/components/Pagination';

interface FreightMode {
  id: string;
  name: string;
  status?: 'active' | 'inactive' | string;
  sort_order?: number;
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
  freight_type?: string;
  status?: string;
}

interface ContainerType {
  id: string;
  name: string;
  status?: 'active' | 'inactive' | string;
}

interface FreightRate {
  id: string;
  freight_mode_id: string;
  shipment_type_id: string;
  origin_id: string;
  destination_id: string;
  transhipment_id?: string | null;
  container_id: string | null;
  price: number;
  currency: string;
  transit_time: number;
  carrier: string | null;
  status: 'active' | 'inactive';
  local_thc?: number;
  documentation_fee?: number;
  customs_clearance?: number;
  other_charges?: number;
  mode_name?: string;
  shipment_name?: string;
  origin_code?: string;
  origin_name?: string;
  origin_country?: string;
  destination_code?: string;
  destination_name?: string;
  destination_country?: string;
  transhipment_code?: string;
  transhipment_name?: string;
  transhipment_country?: string;
  container_name?: string | null;
}

/** Normalizes freight mode string (id or name or alias) to match available modes */
function getNormalizedModeId(raw: string | undefined | null, availableModes: FreightMode[]): string {
  if (!raw) return availableModes[0]?.id || '';
  const trimmed = String(raw).trim();
  
  // 1. Direct ID match
  const direct = availableModes.find((m) => m.id === trimmed);
  if (direct) return direct.id;

  // 2. Case-insensitive Name match
  const byName = availableModes.find((m) => m.name.toLowerCase() === trimmed.toLowerCase());
  if (byName) return byName.id;

  // 3. Known aliases
  const lower = trimmed.toLowerCase();
  if (lower.includes('ocean') || lower === 'mode-ocean' || lower === 'ocean-freight' || lower === 'sea') {
    const ocean = availableModes.find(
      (m) => m.id === 'ocean-freight' || m.id === 'mode-ocean' || m.name.toLowerCase().includes('ocean')
    );
    if (ocean) return ocean.id;
  }
  if (lower.includes('air') || lower === 'mode-air' || lower === 'air-freight') {
    const air = availableModes.find(
      (m) => m.id === 'mode-air' || m.id === 'air-freight' || m.name.toLowerCase().includes('air')
    );
    if (air) return air.id;
  }
  if (lower.includes('road') || lower === 'ftype-190' || lower === 'mode-road') {
    const road = availableModes.find(
      (m) => m.id === 'ftype-190' || m.name.toLowerCase().includes('road')
    );
    if (road) return road.id;
  }

  return trimmed;
}

/**
 * Generic matcher determining if a port matches a freight mode.
 * Dynamically compares the port's freight_type with the mode's name / ID
 * without hardcoding mode or port names.
 */
function isPortCompatibleWithMode(
  port: Location | undefined | null,
  mode: FreightMode | undefined | null
): boolean {
  if (!port || !port.freight_type || !mode) return false;

  const pType = port.freight_type.trim().toLowerCase();
  const mName = (mode.name || '').trim().toLowerCase();
  const mId = (mode.id || '').trim().toLowerCase();

  // 1. Direct match with mode name or ID
  if (pType === mName || pType === mId) return true;

  // 2. Strip standard suffixes like "freight", "mode", "cargo", "transport"
  // e.g. "Air Freight" -> "air", "Ocean Freight" -> "ocean", "mode-air" -> "air"
  const normalize = (str: string) =>
    str
      .replace(/^(mode[-_]|ftype[-_])/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b(freight|cargo|transport|mode)\b/gi, '')
      .trim()
      .toLowerCase();

  const normPType = normalize(pType);
  const normMName = normalize(mName);
  const normMId = normalize(mId);

  if (normPType && (normPType === normMName || normPType === normMId)) {
    return true;
  }

  // 3. Substring inclusion if non-empty
  if (normPType && (normMName.includes(normPType) || normPType.includes(normMName))) {
    return true;
  }

  return false;
}

// Centralized page size for port dropdown pagination
const PAGE_SIZE = 100;

/** Lightweight searchable dropdown component for Origin & Destination ports with 100-port pagination */
interface PortSearchSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  ports: Location[];
  placeholder?: string;
  required?: boolean;
}

function PortSearchSelect({
  label,
  value,
  onChange,
  ports,
  placeholder,
  required,
}: PortSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Reset page and search when ports prop changes (e.g. freight mode change)
  useEffect(() => {
    setCurrentPage(1);
    setSearchTerm('');
  }, [ports]);

  const selectedPort = ports.find(
    (p) => p.id === value || p.port_code === value || p.name === value
  );

  const displayLabel = selectedPort
    ? `${selectedPort.name} (${selectedPort.port_code})${selectedPort.country ? ` — ${selectedPort.country}` : ''}`
    : value
    ? value
    : '';

  // 1. Filter ports by search query first
  const query = searchTerm.trim().toLowerCase();
  const filteredPorts = useMemo(() => {
    if (!query) return ports;
    return ports.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(query)) ||
        (p.port_code && p.port_code.toLowerCase().includes(query)) ||
        (p.country && p.country.toLowerCase().includes(query))
    );
  }, [ports, query]);

  // When opening dropdown with an existing selected port and no active search,
  // jump to the page containing that port so it is immediately visible and selected
  useEffect(() => {
    if (isOpen && value && !searchTerm) {
      const idx = filteredPorts.findIndex(
        (p) => p.id === value || p.port_code === value || p.name === value
      );
      if (idx >= 0) {
        setCurrentPage(Math.floor(idx / PAGE_SIZE) + 1);
      }
    }
  }, [isOpen]);

  // 2. Paginate filtered ports into pages of PAGE_SIZE (100)
  const totalMatching = filteredPorts.length;
  const totalPages = Math.ceil(totalMatching / PAGE_SIZE) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visiblePorts = useMemo(() => {
    return filteredPorts.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredPorts, startIndex]);

  const startRow = totalMatching === 0 ? 0 : startIndex + 1;
  const endRow = Math.min(startIndex + PAGE_SIZE, totalMatching);

  // Search input change resets pagination to page 1
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleSelect = (port: Location) => {
    onChange(port.id);
    setIsOpen(false);
    setSearchTerm('');
    setCurrentPage(1);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>
        {label} {required && <span style={{ color: 'red' }}>*</span>}
      </label>
      <div
        tabIndex={0}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          backgroundColor: '#fff',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none',
          minHeight: '38px',
          boxSizing: 'border-box',
        }}
      >
        <span
          style={{
            color: displayLabel ? '#111827' : '#9ca3af',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '0.9rem',
          }}
        >
          {displayLabel || placeholder || 'Search ports... ▼'}
        </span>
        <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '8px' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {/* Hidden input for HTML form validation */}
      {required && (
        <input
          type="text"
          value={value}
          required
          tabIndex={-1}
          aria-hidden="true"
          style={{
            opacity: 0,
            height: 0,
            width: 0,
            position: 'absolute',
            pointerEvents: 'none',
          }}
          onChange={() => {}}
        />
      )}

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: '#fff',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 1100,
            maxHeight: '340px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb', flexShrink: 0 }}>
            <input
              ref={searchInputRef}
              type="text"
              className="form-control"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by name, code (e.g. DKAAR), or country..."
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '0.85rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div ref={listRef} style={{ overflowY: 'auto', flexGrow: 1, maxHeight: '220px' }}>
            {filteredPorts.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280', fontSize: '0.85rem' }}>
                No matching ports found.
              </div>
            ) : (
              visiblePorts.map((port) => {
                const isSelected = port.id === value || port.port_code === value;
                return (
                  <div
                    key={port.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(port);
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                      color: isSelected ? '#1d4ed8' : '#374151',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600 }}>{port.name}</span>{' '}
                      <span style={{ color: '#6b7280' }}>({port.port_code})</span>
                      {port.country && (
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: '6px' }}>
                          — {port.country}
                        </span>
                      )}
                    </div>
                    {isSelected && <span style={{ color: '#2563eb', fontWeight: 'bold' }}>✓</span>}
                  </div>
                );
              })
            )}
          </div>

          {/* Sticky Pagination Footer */}
          {totalMatching > 0 && (
            <div
              style={{
                padding: '8px 12px',
                borderTop: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'center' }}>
                Showing {startRow}–{endRow} of {totalMatching} matching ports.
              </div>
              {totalPages > 1 && (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', width: '100%' }}>
                  {currentPage > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentPage((p) => Math.max(1, p - 1));
                        listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        backgroundColor: '#fff',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: '#374151',
                      }}
                    >
                      ← Previous 100
                    </button>
                  )}
                  {currentPage < totalPages && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                        listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        backgroundColor: '#fff',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: '#374151',
                      }}
                    >
                      Next 100 →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


export default function RatesPage() {
  const { showToast } = useData();

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

  // Import / Export states & dropdown controls
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importDropdownOpen, setImportDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // Form fields
  const [formModeId, setFormModeId] = useState('');
  const [formShipmentTypeId, setFormShipmentTypeId] = useState('');
  const [formOriginId, setFormOriginId] = useState('');
  const [formDestinationId, setFormDestinationId] = useState('');
  const [isTranshipmentEnabled, setIsTranshipmentEnabled] = useState(false);
  const [formTranshipmentId, setFormTranshipmentId] = useState('');
  const [formContainerId, setFormContainerId] = useState('');
  const [formPrice, setFormPrice] = useState(0);
  const [isAdditionalChargesOpen, setIsAdditionalChargesOpen] = useState(false);
  const [formLocalThc, setFormLocalThc] = useState<number | string>(0);
  const [formOtherCharges, setFormOtherCharges] = useState<number | string>(0);
  const [chargeErrors, setChargeErrors] = useState<{ [key: string]: string }>({});
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
        fetch('/api/ports?all=true'),
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
          country: p.country,
          freight_type: p.freight_type || '',
          status: p.status || 'active',
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

  const handleOpenAddModal = async () => {
    setModalMode('create');
    setEditingRateId(null);
    let currentModes = modes;
    try {
      const res = await fetch('/api/freight-types');
      const data = await res.json();
      if (Array.isArray(data)) {
        currentModes = data;
        setModes(data);
      }
    } catch (e) {
      // Use existing modes on error
    }

    const currentActiveModes = currentModes.filter(
      (m) => String(m.status).toLowerCase() === 'active'
    );
    const defaultModeId = currentActiveModes[0]?.id || '';
    setFormModeId(defaultModeId);
    const modeSts = shipmentTypes.filter((s) => 
      s.freight_type_id === defaultModeId ||
      (defaultModeId === 'ocean-freight' && s.freight_type_id === 'mode-ocean') ||
      (defaultModeId === 'mode-ocean' && s.freight_type_id === 'ocean-freight')
    );
    setFormShipmentTypeId(modeSts.length > 0 ? modeSts[0].id : '');
    setFormOriginId('');
    setFormDestinationId('');
    setIsTranshipmentEnabled(false);
    setFormTranshipmentId('');
    setFormContainerId('');
    setFormPrice(100);
    setIsAdditionalChargesOpen(false);
    setFormLocalThc(0);
    setFormOtherCharges(0);
    setChargeErrors({});
    setFormTransitTime(5);
    setFormCarrier('');
    setFormStatus('active');
    setModalOpen(true);
  };

  const handleOpenEditModal = async (rate: FreightRate) => {
    setModalMode('edit');
    setEditingRateId(rate.id);
    let currentModes = modes;
    try {
      const res = await fetch('/api/freight-types');
      const data = await res.json();
      if (Array.isArray(data)) {
        currentModes = data;
        setModes(data);
      }
    } catch (e) {
      // Use existing modes on error
    }

    const targetModeId = getNormalizedModeId(
      rate.freight_mode_id || (rate as any).mode_id || rate.mode_name,
      currentModes
    );
    setFormModeId(targetModeId);
    setFormShipmentTypeId(rate.shipment_type_id);
    setFormOriginId(rate.origin_id);
    setFormDestinationId(rate.destination_id);
    const hasTrans = !!rate.transhipment_id;
    setIsTranshipmentEnabled(hasTrans);
    setFormTranshipmentId(rate.transhipment_id || '');
    setFormContainerId(rate.container_id || '');
    setFormPrice(Number(rate.price));
    setFormTransitTime(rate.transit_time);
    setFormCarrier(rate.carrier || '');
    setFormStatus(rate.status);
    let latestRate = rate;
    try {
      const resRate = await fetch(`/api/freight-rates/${rate.id}`);
      if (resRate.ok) {
        const rateData = await resRate.json();
        const r = rateData.rate || rateData;
        if (r) latestRate = { ...rate, ...r };
      }
    } catch (e) {
      // Use existing values
    }

    setIsAdditionalChargesOpen(false);
    setFormLocalThc(latestRate.local_thc !== undefined && latestRate.local_thc !== null ? Number(latestRate.local_thc) : 0);
    setFormOtherCharges(latestRate.other_charges !== undefined && latestRate.other_charges !== null ? Number(latestRate.other_charges) : 0);
    setChargeErrors({});
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isAirMode = formModeId === 'mode-air' || formModeId === 'air-freight' || modes.find(m => m.id === formModeId)?.name?.toLowerCase().includes('air');
    if (!formModeId || !formShipmentTypeId || !formOriginId || !formDestinationId || (!isAirMode && !formContainerId)) {
      showToast('Please fill in all required fields.', 'danger');
      return;
    }

    // Validate Additional Charges (must be non-negative numbers)
    const newErrors: { [key: string]: string } = {};
    const parseField = (val: number | string, name: string) => {
      if (val === '' || val === null || val === undefined) return 0;
      const num = Number(val);
      if (isNaN(num) || num < 0) {
        newErrors[name] = 'Amount must be 0 or a positive number.';
        return null;
      }
      return Number(num.toFixed(2));
    };

    const parsedLocalThc = parseField(formLocalThc, 'local_thc');
    const parsedOther = parseField(formOtherCharges, 'other_charges');

    if (Object.keys(newErrors).length > 0) {
      setChargeErrors(newErrors);
      setIsAdditionalChargesOpen(true);
      showToast('Please correct invalid Additional Charges amounts.', 'danger');
      return;
    }
    setChargeErrors({});

    const currentMode = modes.find((m) => m.id === formModeId);
    const originPort = locations.find((p) => p.id === formOriginId || p.port_code === formOriginId);
    const destPort = locations.find((p) => p.id === formDestinationId || p.port_code === formDestinationId);
    if (originPort && !isPortCompatibleWithMode(originPort, currentMode)) {
      showToast('Selected Origin location is incompatible with the selected Freight Mode.', 'danger');
      return;
    }
    if (destPort && !isPortCompatibleWithMode(destPort, currentMode)) {
      showToast('Selected Destination location is incompatible with the selected Freight Mode.', 'danger');
      return;
    }

    if (isTranshipmentEnabled) {
      if (!formTranshipmentId) {
        showToast('Please select a Transhipment port.', 'danger');
        return;
      }
      if (formTranshipmentId === formOriginId) {
        showToast('Transhipment Port cannot be identical to Origin Port.', 'danger');
        return;
      }
      if (formTranshipmentId === formDestinationId) {
        showToast('Transhipment Port cannot be identical to Destination Port.', 'danger');
        return;
      }
      const transPort = locations.find((p) => p.id === formTranshipmentId || p.port_code === formTranshipmentId);
      if (transPort && !isPortCompatibleWithMode(transPort, currentMode)) {
        showToast('Selected Transhipment location is incompatible with the selected Freight Mode.', 'danger');
        return;
      }
    }

    try {
      const payload = {
        freight_mode_id: formModeId,
        shipment_type_id: formShipmentTypeId,
        origin_id: formOriginId,
        destination_id: formDestinationId,
        transhipment_id: isTranshipmentEnabled && formTranshipmentId ? formTranshipmentId : null,
        container_id: formContainerId || null,
        price: formPrice,
        currency: 'USD',
        transit_time: formTransitTime,
        carrier: formCarrier ? formCarrier.trim() : '',
        status: formStatus,
        local_thc: parsedLocalThc ?? 0,
        other_charges: parsedOther ?? 0,
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
          showToast('New freight rate route added successfully.', 'success');
        } else {
          const errData = await res.json().catch(() => ({}));
          showToast(errData.error || 'Failed to add freight rate.', 'danger');
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
          showToast('Freight rate route updated successfully.', 'success');
        } else {
          const errData = await res.json().catch(() => ({}));
          showToast(errData.error || 'Failed to update freight rate.', 'danger');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to save freight rate.', 'danger');
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
          showToast('Freight rate route deleted.', 'success');
        } else {
          const errData = await res.json().catch(() => ({}));
          showToast(errData.error || 'Failed to delete freight rate.', 'danger');
        }
      } catch (err) {
        console.error(err);
        showToast('Failed to delete freight rate.', 'danger');
      }
    }
  };

  useEffect(() => {
    if (modalOpen || importModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalOpen, importModalOpen]);

  // Filter shipment types based on selected mode
  const filteredShipmentTypes = shipmentTypes.filter((s) => 
    s.freight_type_id === formModeId ||
    (formModeId === 'ocean-freight' && s.freight_type_id === 'mode-ocean') ||
    (formModeId === 'mode-ocean' && s.freight_type_id === 'ocean-freight')
  );

  // Filter active freight modes for new rates; preserve currently assigned mode when editing existing records
  const activeModes = modes.filter(
    (m) => String(m.status).toLowerCase() === 'active'
  );

  const currentInactiveMode =
    modalMode === 'edit' && formModeId && !activeModes.some((m) => m.id === formModeId)
      ? modes.find((m) => m.id === formModeId) || {
          id: formModeId,
          name: rates.find((r) => r.id === editingRateId)?.mode_name || formModeId,
          status: 'inactive' as const,
        }
      : null;

  const displayedModes = currentInactiveMode
    ? [...activeModes, currentInactiveMode]
    : activeModes;

  // Filter active containers for new rates; preserve currently assigned container when editing existing records
  const activeContainers = containers.filter(
    (c) => String(c.status).toLowerCase() === 'active'
  );

  const currentInactiveContainer =
    modalMode === 'edit' && formContainerId && !activeContainers.some((c) => c.id === formContainerId)
      ? containers.find((c) => c.id === formContainerId) || {
          id: formContainerId,
          name: rates.find((r) => r.id === editingRateId)?.container_name || formContainerId,
          status: 'inactive' as const,
        }
      : null;

  const availableContainers = currentInactiveContainer
    ? [...activeContainers, currentInactiveContainer]
    : activeContainers;

  useEffect(() => {
    if (modalOpen && filteredShipmentTypes.length > 0) {
      if (!formShipmentTypeId || !filteredShipmentTypes.some((s) => s.id === formShipmentTypeId)) {
        setFormShipmentTypeId(filteredShipmentTypes[0].id);
      }
    }
  }, [formModeId, filteredShipmentTypes, modalOpen]);

  // Selected freight mode object
  const selectedMode = useMemo(() => {
    return modes.find((m) => m.id === formModeId) || null;
  }, [modes, formModeId]);

  // Active ports compatible with selected freight mode
  const modePorts = useMemo(() => {
    if (!selectedMode) return [];
    return locations.filter((port) => {
      const isActive = String(port.status || 'active').toLowerCase() === 'active';
      return isActive && isPortCompatibleWithMode(port, selectedMode);
    });
  }, [locations, selectedMode]);

  // Origin ports: in edit mode, ensure existing stored port is safely preserved in dropdown
  const originPorts = useMemo(() => {
    if (modalMode === 'edit' && formOriginId) {
      const existing = locations.find((p) => p.id === formOriginId || p.port_code === formOriginId);
      if (existing && !modePorts.some((p) => p.id === existing.id)) {
        return [existing, ...modePorts];
      }
    }
    return modePorts;
  }, [modePorts, modalMode, formOriginId, locations]);

  // Destination ports: in edit mode, ensure existing stored port is safely preserved in dropdown
  const destinationPorts = useMemo(() => {
    if (modalMode === 'edit' && formDestinationId) {
      const existing = locations.find((p) => p.id === formDestinationId || p.port_code === formDestinationId);
      if (existing && !modePorts.some((p) => p.id === existing.id)) {
        return [existing, ...modePorts];
      }
    }
    return modePorts;
  }, [modePorts, modalMode, formDestinationId, locations]);

  // Transhipment ports: in edit mode, ensure existing stored port is safely preserved in dropdown
  const transhipmentPorts = useMemo(() => {
    if (modalMode === 'edit' && formTranshipmentId) {
      const existing = locations.find((p) => p.id === formTranshipmentId || p.port_code === formTranshipmentId);
      if (existing && !modePorts.some((p) => p.id === existing.id)) {
        return [existing, ...modePorts];
      }
    }
    return modePorts;
  }, [modePorts, modalMode, formTranshipmentId, locations]);

  const ROWS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // Search filter covering all visible columns
  const query = (searchQuery ?? '').trim().toLowerCase();
  const filteredRates = useMemo(() => {
    if (!query) return rates;
    return rates.filter((r) =>
      (r.id ?? '').toLowerCase().includes(query) ||
      (r.mode_name ?? '').toLowerCase().includes(query) ||
      (r.shipment_name ?? '').toLowerCase().includes(query) ||
      (r.origin_name ?? '').toLowerCase().includes(query) ||
      (r.origin_code ?? '').toLowerCase().includes(query) ||
      (r.origin_country ?? '').toLowerCase().includes(query) ||
      (r.destination_name ?? '').toLowerCase().includes(query) ||
      (r.destination_code ?? '').toLowerCase().includes(query) ||
      (r.destination_country ?? '').toLowerCase().includes(query) ||
      (r.transhipment_name ?? '').toLowerCase().includes(query) ||
      (r.transhipment_code ?? '').toLowerCase().includes(query) ||
      (r.transhipment_country ?? '').toLowerCase().includes(query) ||
      (r.container_name ?? '').toLowerCase().includes(query) ||
      (r.carrier ?? '').toLowerCase().includes(query) ||
      (r.status ?? '').toLowerCase().includes(query)
    );
  }, [rates, query]);

  const totalPages = Math.ceil(filteredRates.length / ROWS_PER_PAGE) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedRates = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredRates.slice(start, start + ROWS_PER_PAGE);
  }, [filteredRates, currentPage, ROWS_PER_PAGE]);

  // Helper for displaying origin/destination with fallback lookup
  const getPortDisplay = (portId: string, portName?: string, portCode?: string) => {
    if (portName && portCode) return `${portName} (${portCode})`;
    if (portName) return portName;
    if (portCode) return portCode;
    const found = locations.find((l) => l.id === portId || l.port_code === portId);
    if (found) return `${found.name} (${found.port_code})`;
    return portId || '—';
  };

  // Export column mapping
  const exportColumns = [
    { key: 'id' as const, label: 'Rate ID' },
    { key: 'mode_name' as const, label: 'Mode' },
    { key: 'shipment_name' as const, label: 'Shipment Type' },
    { key: 'origin_code' as const, label: 'Origin Code' },
    { key: 'origin_name' as const, label: 'Origin Name' },
    { key: 'transhipment_code' as const, label: 'Transhipment Code' },
    { key: 'transhipment_name' as const, label: 'Transhipment Name' },
    { key: 'destination_code' as const, label: 'Destination Code' },
    { key: 'destination_name' as const, label: 'Destination Name' },
    { key: 'container_name' as const, label: 'Container' },
    { key: 'carrier' as const, label: 'Carrier' },
    { key: 'transit_time' as const, label: 'Transit Days' },
    { key: 'price' as const, label: 'Price ($)' },
    { key: 'local_thc' as const, label: 'Local THC (USD)' },
    { key: 'other_charges' as const, label: 'Other Charges (USD)' },
    { key: 'currency' as const, label: 'Currency' },
    { key: 'status' as const, label: 'Status' },
  ];

  const handleExportCSV = (exportAll = false) => {
    const listToExport = exportAll ? rates : filteredRates;
    if (listToExport.length === 0) {
      showToast('No records available to export.', 'warning');
      return;
    }
    exportToCSV(listToExport, `easyfr8_rates_export_${new Date().toISOString().split('T')[0]}.csv`, exportColumns);
    showToast(`Exported ${listToExport.length} rates to CSV file.`, 'success');
    setExportDropdownOpen(false);
  };

  const handleExportExcel = (exportAll = false) => {
    const listToExport = exportAll ? rates : filteredRates;
    if (listToExport.length === 0) {
      showToast('No records available to export.', 'warning');
      return;
    }
    exportToExcel(listToExport, `easyfr8_rates_export_${new Date().toISOString().split('T')[0]}.xls`, exportColumns);
    showToast(`Exported ${listToExport.length} rates to Excel spreadsheet.`, 'success');
    setExportDropdownOpen(false);
  };

  return (
    <>
      {/* Page Header Toolbar */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 className="page-title">Freight Rates</h1>
          <p className="page-subtitle">Configure prices, carrier lines, and transit times for dynamic matching.</p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', position: 'relative' }}>
          
          {/* Import Dropdown Menu */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setImportDropdownOpen(!importDropdownOpen); setExportDropdownOpen(false); }}
            >
              📥 Import Rates ▼
            </button>
            {importDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                width: '200px',
                backgroundColor: 'var(--surface-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                zIndex: 50,
                padding: '4px 0'
              }}>
                <button
                  type="button"
                  style={{ width: '100%', textAlign: 'left', padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                  onClick={() => { setImportModalOpen(true); setImportDropdownOpen(false); }}
                >
                  📁 Upload CSV / Excel
                </button>
              </div>
            )}
          </div>

          {/* Export Dropdown Menu */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setExportDropdownOpen(!exportDropdownOpen); setImportDropdownOpen(false); }}
            >
              📤 Export Rates ▼
            </button>
            {exportDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                width: '220px',
                backgroundColor: 'var(--surface-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                zIndex: 50,
                padding: '4px 0'
              }}>
                <button
                  type="button"
                  style={{ width: '100%', textAlign: 'left', padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                  onClick={() => handleExportCSV(false)}
                >
                  📄 Export Filtered to CSV
                </button>
                <button
                  type="button"
                  style={{ width: '100%', textAlign: 'left', padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                  onClick={() => handleExportExcel(false)}
                >
                  📊 Export Filtered to Excel
                </button>
                <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />
                <button
                  type="button"
                  style={{ width: '100%', textAlign: 'left', padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                  onClick={() => handleExportCSV(true)}
                >
                  🌐 Export All Records (CSV)
                </button>
                <button
                  type="button"
                  style={{ width: '100%', textAlign: 'left', padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                  onClick={() => handleExportExcel(true)}
                >
                  📈 Export All Records (Excel)
                </button>
              </div>
            )}
          </div>

          {/* Add Freight Rate Primary Button */}
          <button className="btn btn-primary" onClick={handleOpenAddModal}>+ Add Freight Rate</button>
        </div>
      </div>

      {/* Search Filter Panel */}
      <div className="table-filter-panel" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
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

      {/* Main Rates Data Table */}
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
                <th>Transhipment Port</th>
                <th>Container</th>
                <th>Transit</th>
                <th>Price</th>
                <th>Local THC (USD)</th>
                <th>Other Charges (USD)</th>
                <th>Carrier</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={14} style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>Loading...</td>
                </tr>
              ) : paginatedRates.length === 0 ? (
                <tr>
                  <td colSpan={14} style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>No freight rates found.</td>
                </tr>
              ) : (
                paginatedRates.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.id}</td>
                    <td>{r.mode_name}</td>
                    <td>{r.shipment_name}</td>
                    <td>{getPortDisplay(r.origin_id, r.origin_name, r.origin_code)}</td>
                    <td>{getPortDisplay(r.destination_id, r.destination_name, r.destination_code)}</td>
                    <td>{r.transhipment_id ? getPortDisplay(r.transhipment_id, r.transhipment_name, r.transhipment_code) : '—'}</td>
                    <td>{r.container_name || '—'}</td>
                    <td>{r.transit_time} Days</td>
                    <td style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>${r.price} {r.currency}</td>
                    <td>${Number(r.local_thc ?? 0).toFixed(2)}</td>
                    <td>${Number(r.other_charges ?? 0).toFixed(2)}</td>
                    <td>{r.carrier || '—'}</td>
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
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRows={filteredRates.length}
          rowsPerPage={ROWS_PER_PAGE}
          onPageChange={(p) => setCurrentPage(p)}
        />
      </div>

      {/* Rate Activity Logs Section */}
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
                        <span className={`badge ${log.actionType === 'create' ? 'badge-approved' : log.actionType === 'delete' ? 'badge-rejected' : 'badge-progress'}`}>
                          {(log.actionType ?? '').toUpperCase()}
                        </span>
                      </td>
                      <td>{log.operator || 'Admin'}</td>
                      <td>{details}</td>
                      <td>{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Modal */}
      <ImportRatesModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => { fetchData(); setImportModalOpen(false); }}
        showToast={showToast}
      />

      {/* Create / Edit Freight Rate Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            width: '500px',
            maxWidth: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 20px 15px 20px',
              borderBottom: '1px solid #eee',
              flexShrink: 0
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                {modalMode === 'create' ? 'Add Freight Rate' : `Edit Freight Rate: ${editingRateId}`}
              </h2>
            </div>
            
            {/* Modal Body - Scrollable */}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
              <div style={{
                padding: '20px',
                overflowY: 'auto',
                flexGrow: 1,
                WebkitOverflowScrolling: 'touch'
              }}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Freight Mode</label>
                  <select
                    className="form-control"
                    value={formModeId}
                    onChange={(e) => {
                      const newModeId = e.target.value;
                      setFormModeId(newModeId);
                      const targetMode = modes.find((m) => m.id === newModeId);

                      // Automatically reset Origin if incompatible with the newly selected mode
                      if (formOriginId) {
                        const curOrigin = locations.find((p) => p.id === formOriginId || p.port_code === formOriginId);
                        if (!curOrigin || !isPortCompatibleWithMode(curOrigin, targetMode)) {
                          setFormOriginId('');
                        }
                      }

                      // Automatically reset Destination if incompatible with the newly selected mode
                      if (formDestinationId) {
                        const curDest = locations.find((p) => p.id === formDestinationId || p.port_code === formDestinationId);
                        if (!curDest || !isPortCompatibleWithMode(curDest, targetMode)) {
                          setFormDestinationId('');
                        }
                      }

                      // Automatically reset Transhipment if incompatible with the newly selected mode
                      if (formTranshipmentId) {
                        const curTrans = locations.find((p) => p.id === formTranshipmentId || p.port_code === formTranshipmentId);
                        if (!curTrans || !isPortCompatibleWithMode(curTrans, targetMode)) {
                          setFormTranshipmentId('');
                        }
                      }

                      const matchingSts = shipmentTypes.filter((s) => 
                        s.freight_type_id === newModeId ||
                        (newModeId === 'ocean-freight' && s.freight_type_id === 'mode-ocean') ||
                        (newModeId === 'mode-ocean' && s.freight_type_id === 'ocean-freight')
                      );
                      setFormShipmentTypeId(matchingSts.length > 0 ? matchingSts[0].id : '');
                      const isAir = newModeId === 'mode-air' || newModeId === 'air-freight' || targetMode?.name?.toLowerCase().includes('air');
                      if (isAir) {
                        setFormContainerId('');
                      }
                    }}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                    required
                  >
                    {displayedModes.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}{modalMode === 'edit' && String(m.status).toLowerCase() === 'inactive' ? ' (Inactive)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>Shipment Type</label>
                  <select
                    className="form-control"
                    value={formShipmentTypeId}
                    onChange={(e) => setFormShipmentTypeId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                    required
                  >
                    {filteredShipmentTypes.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <PortSearchSelect
                    label="Origin Location"
                    value={formOriginId}
                    onChange={setFormOriginId}
                    ports={originPorts}
                    placeholder="Search ports... ▼"
                    required
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <PortSearchSelect
                    label="Destination Location"
                    value={formDestinationId}
                    onChange={setFormDestinationId}
                    ports={destinationPorts}
                    placeholder="Search ports... ▼"
                    required
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={isTranshipmentEnabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsTranshipmentEnabled(checked);
                        if (!checked) {
                          setFormTranshipmentId('');
                        }
                      }}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    Transhipment
                  </label>
                </div>

                {isTranshipmentEnabled && (
                  <div style={{ marginBottom: '15px' }}>
                    <PortSearchSelect
                      label="Transhipment Port"
                      value={formTranshipmentId}
                      onChange={setFormTranshipmentId}
                      ports={transhipmentPorts}
                      placeholder="Transhipment"
                      required={isTranshipmentEnabled}
                    />
                  </div>
                )}

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '5px' }}>
                    Container {(formModeId === 'mode-air' || formModeId === 'air-freight' || modes.find(m => m.id === formModeId)?.name?.toLowerCase().includes('air')) ? '(Optional for Air Freight)' : '*'}
                  </label>
                  <select
                    className="form-control"
                    value={formContainerId}
                    onChange={(e) => setFormContainerId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                    required={!(formModeId === 'mode-air' || formModeId === 'air-freight' || modes.find(m => m.id === formModeId)?.name?.toLowerCase().includes('air'))}
                  >
                    <option value="">{(formModeId === 'mode-air' || formModeId === 'air-freight' || modes.find(m => m.id === formModeId)?.name?.toLowerCase().includes('air')) ? 'None (N/A for Air Cargo)' : 'Select Container'}</option>
                    {availableContainers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}{modalMode === 'edit' && String(c.status).toLowerCase() === 'inactive' ? ' (Inactive)' : ''}
                      </option>
                    ))}
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

                {/* Additional Charges — expandable dropdown/accordion */}
                <div style={{
                  marginBottom: '15px',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--surface-ground, #f8fafc)',
                  overflow: 'hidden'
                }}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setIsAdditionalChargesOpen(!isAdditionalChargesOpen)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsAdditionalChargesOpen(!isAdditionalChargesOpen);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      color: 'var(--text-primary, #1e293b)',
                      userSelect: 'none'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Additional Charges</span>
                      {(Number(formLocalThc) > 0 || Number(formOtherCharges) > 0) && (
                        <span style={{
                          fontSize: '0.75rem',
                          backgroundColor: 'var(--color-primary, #e11d48)',
                          color: '#fff',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 500
                        }}>
                          Applied
                        </span>
                      )}
                    </span>
                    <span style={{
                      transform: isAdditionalChargesOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary, #64748b)'
                    }}>
                      ▼
                    </span>
                  </div>

                  {isAdditionalChargesOpen && (
                    <div style={{
                      padding: '14px',
                      borderTop: '1px solid var(--border-color, #e2e8f0)',
                      backgroundColor: 'var(--surface-card, #ffffff)'
                    }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '12px'
                      }}>
                        {/* Local THC */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '5px', color: 'var(--text-secondary, #475569)' }}>
                            Local THC (USD)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="form-control"
                            value={formLocalThc}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormLocalThc(val === '' ? '' : Number(val));
                              if (chargeErrors.local_thc) {
                                setChargeErrors(prev => ({ ...prev, local_thc: '' }));
                              }
                            }}
                            placeholder="0.00"
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              border: chargeErrors.local_thc ? '1px solid #ef4444' : '1px solid #ccc',
                              borderRadius: '4px',
                              fontSize: '0.88rem'
                            }}
                          />
                          {chargeErrors.local_thc && (
                            <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '3px', display: 'block' }}>
                              {chargeErrors.local_thc}
                            </span>
                          )}
                        </div>

                        {/* Other Charges */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '5px', color: 'var(--text-secondary, #475569)' }}>
                            Other Charges (USD)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="form-control"
                            value={formOtherCharges}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormOtherCharges(val === '' ? '' : Number(val));
                              if (chargeErrors.other_charges) {
                                setChargeErrors(prev => ({ ...prev, other_charges: '' }));
                              }
                            }}
                            placeholder="0.00"
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              border: chargeErrors.other_charges ? '1px solid #ef4444' : '1px solid #ccc',
                              borderRadius: '4px',
                              fontSize: '0.88rem'
                            }}
                          />
                          {chargeErrors.other_charges && (
                            <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '3px', display: 'block' }}>
                              {chargeErrors.other_charges}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
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
                    placeholder="e.g. Maersk Line (Optional)"
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
              </div>

              {/* Modal Footer - Fixed */}
              <div style={{
                padding: '15px 20px',
                borderTop: '1px solid #eee',
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end',
                flexShrink: 0,
                backgroundColor: '#fff'
              }}>
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
