import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUserAuth } from './user/UserAuthContext'

/**
 * Container equipment classification helpers
 */

function isReeferEquipment(eq) {
  if (!eq) return false
  const str = String(eq).toLowerCase()
  return str.includes('reefer') || str.includes('refrigerated')
}

function isOpenTopEquipment(eq) {
  if (!eq) return false
  const str = String(eq).toLowerCase()
  return str.includes('open top') || str.includes('flat')
}

/**
 * Helper to format port display label according to EasyFr8 UI conventions:
 * "Port Name (PORTCODE) - Country"
 */
function formatPortDisplay(port) {
  if (!port) return ''
  if (typeof port === 'string') return port
  const name = port.port_name || port.portname || port.name || ''
  const code = port.port_code || port.portcode || port.code || ''
  const country = port.country || ''
  if (name && code && country) return `${name} (${code}) - ${country}`
  if (name && code) return `${name} (${code})`
  return name || code || ''
}

/**
 * Reusable searchable port selector component for Departure / Arrival.
 * Allows user to type and search across all 6,010 ports with server-side debounce,
 * without loading the entire ports dataset into browser memory.
 */
function PortSearchSelect({
  label,
  value,
  selectedPort = null,
  onChange,
  placeholder,
  freightType,
  disabled,
  required = true
}) {
  const [queryText, setQueryText] = useState(() => formatPortDisplay(selectedPort))
  const [results, setResults] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef(null)
  const timerRef = useRef(null)
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

  // Sync display text when selectedPort or value changes from outside (e.g. URL query resolved or rate resolved)
  useEffect(() => {
    if (selectedPort) {
      setQueryText(formatPortDisplay(selectedPort))
      return
    }
    if (!value) {
      setQueryText('')
      return
    }
    // Fetch port info if not already loaded or if displayed text doesn't match
    let isCancelled = false
    const fetchSelectedPort = async () => {
      try {
        // Backend /api/ports searches port_name, port_code, country.
        // It does not search on the id column.
        // If value is a port ID (e.g. "port-ESLCG-578" or "loc-inbom"), extract the code.
        let searchTerm = String(value).trim()
        if (searchTerm.startsWith('port-') || searchTerm.startsWith('loc-')) {
          const extracted = searchTerm.replace(/^(port|loc)-/, '').replace(/-\d+$/, '')
          if (extracted) searchTerm = extracted
        }

        const res = await fetch(`${API_URL}/ports?search=${encodeURIComponent(searchTerm)}&limit=10`)
        const data = await res.json()
        if (!isCancelled && data.success && Array.isArray(data.ports) && data.ports.length > 0) {
          const match = data.ports.find(p => 
            p.id === value || 
            p.port_code?.toUpperCase() === value.toUpperCase() || 
            p.port_code?.toUpperCase() === searchTerm.toUpperCase()
          ) || data.ports[0]
          setQueryText(formatPortDisplay(match))
          if (onChange) onChange(match.id, match)
        }
      } catch (e) {
        // ignore
      }
    }
    fetchSelectedPort()
    return () => { isCancelled = true }
  }, [value, selectedPort, API_URL])

  // Close on outside click and restore valid selected port label
  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        if (selectedPort) {
          setQueryText(formatPortDisplay(selectedPort))
        } else if (!value) {
          setQueryText('')
        }
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [selectedPort, value])

  const handleSearch = (term) => {
    setQueryText(term)
    if (!isOpen) setIsOpen(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (term) params.append('search', term)
        if (freightType) params.append('freight_type', freightType)
        params.append('limit', '25')

        const res = await fetch(`${API_URL}/ports?${params.toString()}`)
        const data = await res.json()
        if (data.success && Array.isArray(data.ports)) {
          setResults(data.ports)
        }
      } catch (e) {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
  }

  const handleSelect = (port) => {
    setQueryText(formatPortDisplay(port))
    setIsOpen(false)
    onChange(port.id, port)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#333', marginBottom: '6px' }}>
        {label} {required && <span style={{ color: '#d64238' }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          className="form-control"
          value={queryText}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true)
              if (results.length === 0) handleSearch(queryText)
            }
          }}
          required={required && !value}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px',
            height: '42px',
            backgroundColor: disabled ? '#f8f9fa' : '#fff',
            cursor: disabled ? 'not-allowed' : 'text'
          }}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={() => {
              setQueryText('')
              onChange('', null)
            }}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#999',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            title="Clear selection"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 1000,
          background: '#fff',
          border: '1px solid #cbd5e1',
          borderRadius: '4px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.12)',
          maxHeight: '220px',
          overflowY: 'auto',
          marginTop: '2px'
        }}>
          {loading && (
            <div style={{ padding: '10px 14px', fontSize: '13px', color: '#888' }}>
              Searching ports...
            </div>
          )}
          {!loading && results.length === 0 && (
            <div style={{ padding: '10px 14px', fontSize: '13px', color: '#888' }}>
              No matching ports found. Type to search.
            </div>
          )}
          {!loading && results.map(p => (
            <div
              key={p.id}
              onClick={() => handleSelect(p)}
              style={{
                padding: '9px 14px',
                fontSize: '13px',
                cursor: 'pointer',
                borderBottom: '1px solid #f1f5f9',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
            >
              <strong>{p.port_name}</strong> <span style={{ color: '#d64238', fontWeight: 600 }}>({p.port_code})</span> — <span style={{ color: '#64748b' }}>{p.country}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Booking() {
  const location = useLocation()
  const navigate = useNavigate()

  // Parse URL query parameters
  const query = new URLSearchParams(location.search)
  const queryFromPort = query.get('fromPort') || ''
  const queryToPort = query.get('toPort') || ''
  const queryContainerType = query.get('containerType') || ''
  const queryFreightType = query.get('freight_type') || '' // fcl, lcl, air
  const queryRateId = query.get('rate_id') || query.get('rateId') || ''
  const queryTranshipment = query.get('transhipment') || query.get('transhipmentPort') || query.get('transshipment') || ''

  const { isAuthenticated, user, token } = useUserAuth()

  // Master collections fetched from DB
  const [freightTypes, setFreightTypes] = useState([])
  const [shipmentTypes, setShipmentTypes] = useState([])
  const [terms, setTerms] = useState([])
  const [containers, setContainers] = useState([])
  const [containersLoading, setContainersLoading] = useState(true)
  const [containersError, setContainersError] = useState(null)
  const [selectedRate, setSelectedRate] = useState(null)
  const [selectedTranshipmentPort, setSelectedTranshipmentPort] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Two-Step Booking Flow State
  // Step 1: Shipment Details + Container Details
  // Step 2: Customer Information
  const [currentStep, setCurrentStep] = useState(1)
  const [stepErrors, setStepErrors] = useState({})
  const [showAuthModal, setShowAuthModal] = useState(false)

  // Step 1: Shipment Parameters
  const [selectedFreightTypeId, setSelectedFreightTypeId] = useState('')
  const [selectedShipmentTypeId, setSelectedShipmentTypeId] = useState('')
  const [selectedTermId, setSelectedTermId] = useState('')
  const [selectedLoadingPortId, setSelectedLoadingPortId] = useState('')
  const [selectedLoadingPort, setSelectedLoadingPort] = useState(null)
  const [selectedDischargePortId, setSelectedDischargePortId] = useState('')
  const [selectedDischargePort, setSelectedDischargePort] = useState(null)
  const [portWarning, setPortWarning] = useState('')
  const [finalDelivery, setFinalDelivery] = useState('')
  const [selectedContainerId, setSelectedContainerId] = useState('')
  const [cargoDetails, setCargoDetails] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')

  // Container Details State (Multiple container entries)
  const createEmptyContainer = (id = 1, equipment = '', container_id = '') => ({
    id,
    equipment: equipment || '',
    container_id: container_id || '',
    quantity: 1,
    weight: '',
    weight_unit: 'KG',
    temperature: '',
    temp_unit: 'Celsius',
    dimensions: { length: '', width: '', height: '' },
    gauge_type: '',
    special_instructions: ''
  })

  const [containersList, setContainersList] = useState([createEmptyContainer(1)])

  // Step 2: Customer Information
  const [userName, setUserName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // Submit Flow States
  const [submitting, setSubmitting] = useState(false)
  const [bookingNo, setBookingNo] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Sync Customer Info with authenticated user profile
  useEffect(() => {
    if (user) {
      setUserName(prev => (prev ? prev : (user.name || user.full_name || '')))
      setEmail(prev => (prev ? prev : (user.email || '')))
      setPhone(prev => (prev ? prev : (user.phone || '')))
    }
  }, [user])

  // Restore any pending booking saved prior to login redirect
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('easyfr8_pending_booking')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.currentStep) setCurrentStep(parsed.currentStep)
        if (Array.isArray(parsed.containersList) && parsed.containersList.length > 0) {
          setContainersList(parsed.containersList)
        }
        if (parsed.finalDelivery) setFinalDelivery(parsed.finalDelivery)
        if (parsed.cargoDetails) setCargoDetails(parsed.cargoDetails)
        if (parsed.specialInstructions) setSpecialInstructions(parsed.specialInstructions)
        if (parsed.userName) setUserName(parsed.userName)
        if (parsed.email) setEmail(parsed.email)
        if (parsed.phone) setPhone(parsed.phone)
      }
    } catch (e) {
      console.warn('Could not restore pending booking from sessionStorage', e)
    }
  }, [])

  // Helper to persist pending booking state in sessionStorage
  const saveBookingToSession = (targetStep = 1) => {
    try {
      const stateToSave = {
        currentStep: targetStep,
        selectedFreightTypeId,
        selectedShipmentTypeId,
        selectedTermId,
        selectedLoadingPortId,
        selectedDischargePortId,
        selectedContainerId,
        finalDelivery,
        cargoDetails,
        specialInstructions,
        containersList,
        userName,
        email,
        phone
      }
      sessionStorage.setItem('easyfr8_pending_booking', JSON.stringify(stateToSave))
    } catch (e) {
      console.warn('Could not save pending booking to sessionStorage', e)
    }
  }

  // Fetch all dynamic options on mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoading(true)
        setContainersLoading(true)
        setContainersError(null)
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
        const requests = [
          fetch(`${API_URL}/freight-types`),
          fetch(`${API_URL}/shipment-types`),
          fetch(`${API_URL}/terms`),
          fetch(`${API_URL}/containers?status=active`)
        ]

        if (queryRateId) {
          requests.push(fetch(`${API_URL}/freight-rates/${encodeURIComponent(queryRateId)}`))
        }

        const responses = await Promise.all(requests)
        const [resFt, resSt, resTerms, resCont] = responses

        const dataFt = await resFt.json()
        const dataSt = await resSt.json()
        const dataTerms = await resTerms.json()
        
        let activeContainers = []
        if (resCont.ok) {
          const dataCont = await resCont.json()
          activeContainers = Array.isArray(dataCont) ? dataCont.filter(c => c.status === 'active') : []
          setContainers(activeContainers)
          setContainersLoading(false)
        } else {
          setContainersLoading(false)
          setContainersError('Failed to load container equipment options.')
        }

        let rateData = null
        if (queryRateId && responses[4]) {
          try {
            const parsedRateRes = await responses[4].json()
            if (parsedRateRes.success && parsedRateRes.rate) {
              rateData = parsedRateRes.rate
              setSelectedRate(rateData)
            }
          } catch (e) {
            console.warn('Could not parse rate info', e)
          }
        }

        setFreightTypes(Array.isArray(dataFt) ? dataFt.filter(f => f.status === 'active') : [])
        setShipmentTypes(Array.isArray(dataSt) ? dataSt.filter(s => s.status === 'active') : [])
        setTerms(Array.isArray(dataTerms) ? dataTerms.filter(t => t.status === 'active') : [])

        // Resolve defaults based on parsed URL query parameters and selected rate
        let resolvedFtId = ''
        let resolvedStId = ''
        let resolvedLoadingPortId = ''
        let resolvedDischargePortId = ''
        let resolvedContainerId = ''

        // 1. Resolve Freight type & Shipment Type from query param or rate
        const targetFreightType = rateData ? (rateData.mode_name || rateData.freight_mode_id) : queryFreightType
        if (targetFreightType) {
          const normTarget = targetFreightType.toLowerCase().trim()
          const matchedSt = dataSt.find(st => st.name.toLowerCase() === normTarget || st.id === normTarget)
          if (matchedSt) {
            resolvedStId = matchedSt.id
            resolvedFtId = matchedSt.freight_type_id
          } else if (normTarget.includes('air')) {
            const airSt = dataSt.find(st => st.freight_type_id === 'air-freight')
            if (airSt) {
              resolvedStId = airSt.id
              resolvedFtId = 'air-freight'
            }
          } else if (normTarget.includes('ocean') || normTarget.includes('sea')) {
            const oceanSt = dataSt.find(st => st.freight_type_id === 'ocean-freight')
            if (oceanSt) {
              resolvedStId = oceanSt.id
              resolvedFtId = 'ocean-freight'
            }
          }
        }

        if (rateData?.shipment_name || rateData?.shipment_type_id) {
          const normShipment = (rateData.shipment_name || rateData.shipment_type_id).toLowerCase().trim()
          const matchedSt = dataSt.find(st => st.name.toLowerCase() === normShipment || st.id === normShipment)
          if (matchedSt) {
            resolvedStId = matchedSt.id
            resolvedFtId = matchedSt.freight_type_id
          }
        }

        if (!resolvedFtId && Array.isArray(dataFt) && dataFt.length > 0) {
          resolvedFtId = dataFt[0].id
        }

        // 2. Resolve loading and discharge ports from rate or query parameters
        const resolvePortRecord = async (lookupTerm, ratePortInfo = null) => {
          if (ratePortInfo && ratePortInfo.id && ratePortInfo.port_code && (ratePortInfo.port_name || ratePortInfo.name)) {
            return {
              id: ratePortInfo.id,
              port_code: ratePortInfo.port_code,
              port_name: ratePortInfo.port_name || ratePortInfo.name,
              country: ratePortInfo.country || '',
              freight_type: ratePortInfo.freight_type || 'Ocean'
            }
          }
          if (!lookupTerm) return ratePortInfo || null

          const raw = String(lookupTerm).trim()
          let searchCode = raw
          if (raw.startsWith('port-') || raw.startsWith('loc-')) {
            const extracted = raw.replace(/^(port|loc)-/, '').replace(/-\d+$/, '')
            if (extracted) searchCode = extracted
          }

          try {
            const pRes = await fetch(`${API_URL}/ports?search=${encodeURIComponent(searchCode)}&limit=10`)
            const pData = await pRes.json()
            if (pData.success && Array.isArray(pData.ports) && pData.ports.length > 0) {
              const match = pData.ports.find(p => 
                p.id === raw ||
                p.port_code?.toUpperCase() === raw.toUpperCase() ||
                p.port_code?.toUpperCase() === searchCode.toUpperCase() ||
                (p.port_name && p.port_name.toLowerCase() === raw.toLowerCase())
              ) || pData.ports[0]
              return match
            }
          } catch (e) {
            console.error('Error resolving port for term:', raw, e)
          }

          return ratePortInfo || null
        }

        const rateOriginInfo = (rateData?.origin_code || rateData?.origin_id) ? {
          id: rateData.origin_id || `port-${rateData.origin_code}`,
          port_code: rateData.origin_code || '',
          port_name: rateData.origin_name || rateData.origin_code || '',
          country: rateData.origin_country || '',
          freight_type: rateData.mode_name || 'Ocean'
        } : null

        const fromLookup = rateData?.origin_code || queryFromPort || rateData?.origin_id
        const resolvedOrigin = await resolvePortRecord(fromLookup, rateOriginInfo)

        const rateDestInfo = (rateData?.destination_code || rateData?.destination_id) ? {
          id: rateData.destination_id || `port-${rateData.destination_code}`,
          port_code: rateData.destination_code || '',
          port_name: rateData.destination_name || rateData.destination_code || '',
          country: rateData.destination_country || '',
          freight_type: rateData.mode_name || 'Ocean'
        } : null

        const toLookup = rateData?.destination_code || queryToPort || rateData?.destination_id
        const resolvedDest = await resolvePortRecord(toLookup, rateDestInfo)

        // Resolve transshipment port from rate or query parameters
        const rateTransInfo = (rateData?.transhipment_code || rateData?.transhipment_id || rateData?.transhipment_name) ? {
          id: rateData.transhipment_id || `port-${rateData.transhipment_code}`,
          port_code: rateData.transhipment_code || '',
          port_name: rateData.transhipment_name || rateData.transhipment_code || '',
          country: rateData.transhipment_country || '',
          freight_type: rateData.mode_name || 'Ocean'
        } : null

        const transLookup = rateData?.transhipment_code || rateData?.transhipment_name || queryTranshipment || rateData?.transhipment_id
        if (transLookup) {
          const resolvedTrans = await resolvePortRecord(transLookup, rateTransInfo)
          if (resolvedTrans) {
            setSelectedTranshipmentPort(resolvedTrans)
          } else if (rateTransInfo) {
            setSelectedTranshipmentPort(rateTransInfo)
          }
        }

        const warnings = []
        if (resolvedOrigin) {
          resolvedLoadingPortId = resolvedOrigin.id
          setSelectedLoadingPortId(resolvedOrigin.id)
          setSelectedLoadingPort(resolvedOrigin)
        } else if (fromLookup) {
          warnings.push(`Port of Loading "${fromLookup}" could not be resolved from ports dataset.`)
        }

        if (resolvedDest) {
          resolvedDischargePortId = resolvedDest.id
          setSelectedDischargePortId(resolvedDest.id)
          setSelectedDischargePort(resolvedDest)
        } else if (toLookup) {
          warnings.push(`Port of Discharge "${toLookup}" could not be resolved from ports dataset.`)
        }

        if (warnings.length > 0) {
          setPortWarning(warnings.join(' '))
        }

        // Set freight type default if not already set by query or rate
        if (!resolvedFtId) {
          const portFt = (resolvedOrigin?.freight_type || resolvedDest?.freight_type || '').toLowerCase()
          if (portFt.includes('air')) {
            resolvedFtId = dataFt.find(f => f.id === 'mode-air' || f.name.toLowerCase().includes('air'))?.id
          } else if (portFt.includes('ocean')) {
            resolvedFtId = dataFt.find(f => f.id === 'ocean-freight' || f.name.toLowerCase().includes('ocean'))?.id
          }
          if (!resolvedFtId) {
            resolvedFtId = dataFt.find(f => f.id === 'ocean-freight' || f.name.toLowerCase().includes('ocean'))?.id || (dataFt[0] ? dataFt[0].id : '')
          }
        }

        // 3. Resolve container type
        const contLookup = rateData?.container_name || rateData?.container_id || queryContainerType
        if (contLookup) {
          const normQuery = contLookup.toLowerCase().replace(/[^a-z0-9]/g, '')
          const matchCont = activeContainers.find(c => c.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normQuery || c.id === contLookup)
          if (matchCont) {
            resolvedContainerId = matchCont.id
            setContainersList(prev => {
              if (prev.length === 1 && (!prev[0].equipment || !prev[0].container_id)) {
                return [{ ...prev[0], equipment: matchCont.name, container_id: matchCont.id }]
              }
              return prev
            })
          } else {
            console.warn(`[Container Resolution] Container "${contLookup}" referenced by rate or query is inactive or unavailable.`)
            setStepErrors(prev => ({
              ...prev,
              container_0_equipment: `The container "${contLookup}" associated with this rate is inactive or unavailable. Please select an active container.`
            }))
          }
        }

        // Set state values
        setSelectedFreightTypeId(resolvedFtId)
        
        const fclDefault = dataSt.find(s => (s.freight_type_id === resolvedFtId || s.freight_type_id === 'ocean-freight') && (s.id === 'shiptype-fcl' || s.name.toUpperCase().includes('FCL')))
        if (resolvedStId && resolvedStId !== 'shiptype-lcl') {
          setSelectedShipmentTypeId(resolvedStId)
        } else if (fclDefault) {
          setSelectedShipmentTypeId(fclDefault.id)
        } else if (resolvedStId) {
          setSelectedShipmentTypeId(resolvedStId)
        } else {
          const firstSt = dataSt.find(s => s.freight_type_id === resolvedFtId)
          setSelectedShipmentTypeId(firstSt ? firstSt.id : '')
        }

        if (resolvedLoadingPortId) setSelectedLoadingPortId(resolvedLoadingPortId)
        if (resolvedDischargePortId) setSelectedDischargePortId(resolvedDischargePortId)
        if (resolvedContainerId) setSelectedContainerId(resolvedContainerId)

        // Set default terms
        if (Array.isArray(dataTerms) && dataTerms.length > 0) {
          setSelectedTermId(dataTerms[0].id)
        }

      } catch (err) {
        console.error(err)
        setContainersLoading(false)
        setContainersError('Failed to load container master data.')
        setError('Failed to load booking master data.')
      } finally {
        setLoading(false)
      }
    }

    fetchOptions()
  }, [queryFromPort, queryToPort, queryContainerType, queryFreightType, queryRateId])

  // Handle Tab Switch (Ocean / Air)
  const handleFreightTypeTabChange = (ftId) => {
    setSelectedFreightTypeId(ftId)
    const modeSts = shipmentTypes.filter(st => st.freight_type_id === ftId)
    if (modeSts.length > 0) {
      const fcl = modeSts.find(st => st.id === 'shiptype-fcl' || st.name.toUpperCase().includes('FCL'))
      setSelectedShipmentTypeId(fcl ? fcl.id : modeSts[0].id)
    } else {
      setSelectedShipmentTypeId('')
    }
  }

  const currentFreightTypeName = freightTypes.find(ft => ft.id === selectedFreightTypeId)?.name || ''
  const isAirMode = currentFreightTypeName.toLowerCase().includes('air')

  const currentShipmentTypeName = shipmentTypes.find(st => st.id === selectedShipmentTypeId)?.name || ''
  const isFCL = !selectedShipmentTypeId ||
    selectedShipmentTypeId === 'shiptype-fcl' ||
    currentShipmentTypeName.toUpperCase().includes('FCL') ||
    currentShipmentTypeName.toLowerCase().includes('full') ||
    !isAirMode

  // Container list manipulation handlers
  const handleAddContainer = () => {
    const nextId = containersList.length > 0 ? Math.max(...containersList.map(c => c.id || 0)) + 1 : 1
    const defaultCont = containers.find(c => c.id === containersList[0]?.container_id || c.name === containersList[0]?.equipment) || containers[0]
    setContainersList([...containersList, createEmptyContainer(nextId, defaultCont?.name || '', defaultCont?.id || '')])
  }

  const handleRemoveContainer = (index) => {
    if (containersList.length <= 1) return
    const updated = containersList.filter((_, i) => i !== index)
    setContainersList(updated)
  }

  const handleContainerChange = (index, field, value) => {
    const updated = [...containersList]
    updated[index] = { ...updated[index], [field]: value }
    setContainersList(updated)

    // Clear specific field validation error when edited
    const errKey = `container_${index}_${field}`
    if (stepErrors[errKey]) {
      setStepErrors(prev => {
        const next = { ...prev }
        delete next[errKey]
        return next
      })
    }
  }

  // Step 1 Validation & Proceed to Booking
  const handleProceedToBooking = () => {
    const errors = {}

    if (!selectedShipmentTypeId) {
      errors.shipment_type = 'Please select a Shipment Type.'
    }
    if (!selectedTermId) {
      errors.term = 'Please select an Incoterm.'
    }
    if (!selectedLoadingPortId) {
      errors.loading_port = isAirMode ? 'Please select Airport of Departure.' : 'Please select Port of Loading.'
    }
    if (!selectedDischargePortId) {
      errors.discharge_port = isAirMode ? 'Please select Airport of Arrival.' : 'Please select Port of Discharge.'
    }

    // Validate Container Details if FCL
    if (isFCL) {
      if (!containersList || containersList.length === 0) {
        errors.containers = 'At least one container entry is required for FCL shipments.'
      } else {
        containersList.forEach((cont, idx) => {
          if (!cont.equipment || !cont.equipment.trim()) {
            errors[`container_${idx}_equipment`] = `Container #${idx + 1}: Size and Type of Equipment is required.`
          }
          const qty = parseInt(cont.quantity, 10)
          if (isNaN(qty) || qty < 1) {
            errors[`container_${idx}_quantity`] = `Container #${idx + 1}: Number of containers must be at least 1.`
          }
          const wt = parseFloat(cont.weight)
          if (isNaN(wt) || wt <= 0) {
            errors[`container_${idx}_weight`] = `Container #${idx + 1}: Positive weight value is required.`
          }
          if (isReeferEquipment(cont.equipment)) {
            if (cont.temperature === '' || cont.temperature === null || isNaN(parseFloat(cont.temperature))) {
              errors[`container_${idx}_temperature`] = `Container #${idx + 1}: Temperature is required for Reefer equipment.`
            }
          }
          if (cont.dimensions) {
            const l = parseFloat(cont.dimensions.length)
            const w = parseFloat(cont.dimensions.width)
            const h = parseFloat(cont.dimensions.height)
            if (!isNaN(l) && l < 0) {
              errors[`container_${idx}_dimensions`] = `Container #${idx + 1}: Length cannot be negative.`
            } else if (!isNaN(w) && w < 0) {
              errors[`container_${idx}_dimensions`] = `Container #${idx + 1}: Width cannot be negative.`
            } else if (!isNaN(h) && h < 0) {
              errors[`container_${idx}_dimensions`] = `Container #${idx + 1}: Height cannot be negative.`
            }
          }
        })
      }
    }

    if (Object.keys(errors).length > 0) {
      setStepErrors(errors)
      window.scrollTo({ top: 350, behavior: 'smooth' })
      return
    }

    // Step 1 is valid: hide Step 1 and proceed to Step 2
    setStepErrors({})
    saveBookingToSession(2)
    setCurrentStep(2)
    window.scrollTo({ top: 300, behavior: 'smooth' })
  }

  // Handle Return to Step 1
  const handleBackToStep1 = () => {
    saveBookingToSession(1)
    setCurrentStep(1)
    setStepErrors({})
    window.scrollTo({ top: 300, behavior: 'smooth' })
  }

  // Step 2 Submission
  const handleSubmitBooking = async (e) => {
    if (e && e.preventDefault) e.preventDefault()

    const errors = {}
    if (!userName || !userName.trim()) {
      errors.userName = 'Full Name is required.'
    }
    if (!email || !email.trim()) {
      errors.email = 'Email Address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please provide a valid email address.'
    }
    if (!phone || !phone.trim()) {
      errors.phone = 'Phone Number is required.'
    }

    if (Object.keys(errors).length > 0) {
      setStepErrors(errors)
      return
    }

    setStepErrors({})

    // Case B: User is not authenticated -> Do not create booking, display login modal
    if (!isAuthenticated) {
      saveBookingToSession(2)
      setShowAuthModal(true)
      return
    }

    // Case A: User is authenticated -> submit booking with server authentication
    setSubmitting(true)
    setError(null)

    // Format structured multi-container details to ensure Admin Console persistence
    let containerBreakdownText = ''
    if (isFCL && containersList.length > 0) {
      containerBreakdownText = '[Containers]:\n' + containersList.map((c, i) => {
        let line = `- Container #${i + 1}: ${c.equipment} | Qty: ${c.quantity} | Weight: ${c.weight} ${c.weight_unit}`
        if (isReeferEquipment(c.equipment) && c.temperature !== '') {
          line += ` | Temp: ${c.temperature} ${c.temp_unit}`
        }
        if (c.dimensions && (c.dimensions.length || c.dimensions.width || c.dimensions.height)) {
          line += ` | Dim: ${c.dimensions.length || 0}x${c.dimensions.width || 0}x${c.dimensions.height || 0}mm`
        }
        if (c.gauge_type) {
          line += ` | Gauge: ${c.gauge_type}`
        }
        if (c.special_instructions) {
          line += ` | Special: ${c.special_instructions}`
        }
        return line
      }).join('\n')
    }

    const transText = (selectedRate?.transhipment_code || selectedTranshipmentPort?.port_code)
      ? ` | Transshipment: ${selectedRate?.transhipment_name || selectedTranshipmentPort?.port_name || ''} (${selectedRate?.transhipment_code || selectedTranshipmentPort?.port_code})`
      : ' | Transshipment: None'

    const chargesText = selectedRate
      ? ` | Local THC: $${Number(selectedRate.local_thc || 0).toFixed(2)} | Other Charges: $${Number(selectedRate.other_charges || 0).toFixed(2)}`
      : ''

    const rateNote = selectedRate 
      ? `\n[Selected Rate: ${selectedRate.id} | Carrier: ${selectedRate.carrier || 'Standard'} | Price: $${selectedRate.price} ${selectedRate.currency || 'USD'}${transText}${chargesText} | Transit: ${selectedRate.transit_time} Days]`
      : (queryRateId ? `\n[Selected Rate ID: ${queryRateId}]` : '')

    const specialNote = specialInstructions ? `\nSpecial Instructions: ${specialInstructions}` : ''

    const comprehensiveCargoDetails = [
      containerBreakdownText,
      finalDelivery ? `Final Delivery Place: ${finalDelivery}` : '',
      cargoDetails ? `Cargo Remarks: ${cargoDetails}` : '',
      specialNote,
      rateNote
    ].filter(Boolean).join('\n')

    // Find matching primary container ID for foreign key constraint
    let containerIdToSave = null
    if (isFCL && containersList.length > 0) {
      const primary = containersList[0]
      containerIdToSave = primary.container_id || (containers.find(c => c.id === primary.equipment || c.name === primary.equipment)?.id) || selectedContainerId || containers[0]?.id || null
    }

    const payload = {
      user_name: userName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      freight_type_id: selectedFreightTypeId,
      shipment_type_id: selectedShipmentTypeId,
      term_id: selectedTermId,
      loading_port_id: selectedLoadingPortId,
      discharge_port_id: selectedDischargePortId,
      container_id: containerIdToSave,
      freight_rate_id: selectedRate?.id || queryRateId || null,
      cargo_details: comprehensiveCargoDetails,
      containers: containersList
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
      const headers = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })
      const data = await res.json()

      if (res.ok && data.success) {
        sessionStorage.removeItem('easyfr8_pending_booking')
        setBookingNo(data.booking_no)
        setSubmitSuccess(true)
      } else {
        throw new Error(data.error || 'Failed to submit booking request.')
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'An error occurred during booking submission.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Login to User Portal button in Auth Modal
  const handleLoginToUserPortal = () => {
    saveBookingToSession(2)
    setShowAuthModal(false)
    const currentDestination = location.pathname + location.search
    navigate(`/user/login?redirect=${encodeURIComponent(currentDestination)}`, {
      state: { from: currentDestination }
    })
  }

  if (loading) {
    return (
      <div id="page">
        <div style={{ textAlign: 'center', padding: '100px 0', color: '#666', fontSize: '16px' }}>
          Loading dynamic booking options...
        </div>
      </div>
    )
  }

  return (
    <div id="page">
      {/* Page Header */}
      <div className="page-header title-area">
        <div className="header-title">
          <div className="container">
            <div className="row">
              <div className="col-md-12 col-sm-12 col-xs-12">
                <h1 className="page-title">Booking Checkout</h1>
              </div>
            </div>
          </div>
        </div>
        <div className="breadcrumb-area">
          <div className="container">
            <div className="row">
              <div className="col-md-8 col-sm-12 col-xs-12 site-breadcrumb">
                <nav className="breadcrumb">
                  <a className="home" href="/"><span>Home</span></a>
                  <i className="fa fa-angle-right" aria-hidden="true"></i>
                  <span>Booking</span>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="secpadd" style={{ padding: '60px 0', background: '#f9f9f9' }}>
        <div className="container" style={{ maxWidth: '880px', margin: '0 auto' }}>
          
          {submitSuccess ? (
            <div style={{ background: '#fff', padding: '50px 30px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', color: '#28a745', marginBottom: '20px' }}>✓</div>
              <h2 style={{ fontWeight: 700, color: '#333', fontSize: '26px', marginBottom: '15px' }}>Booking Created Successfully!</h2>
              <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.6', maxWidth: '600px', margin: '0 auto 25px auto' }}>
                Your freight shipment request has been recorded and submitted to operations. Our team will review the container specifications and contact you shortly.
              </p>
              <div style={{ display: 'inline-block', background: '#f5f5f5', padding: '15px 30px', borderRadius: '4px', border: '1px dashed #d64238', marginBottom: '35px' }}>
                <span style={{ fontSize: '13px', color: '#666', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Your Booking reference number</span>
                <strong style={{ fontSize: '22px', color: '#d64238', letterSpacing: '1px', display: 'block', marginTop: '5px' }}>{bookingNo}</strong>
              </div>
              <div>
                <button 
                  onClick={() => navigate('/')} 
                  className="btn" 
                  style={{ background: '#d64238', color: 'white', border: 'none', padding: '12px 30px', fontWeight: 600, fontSize: '15px', cursor: 'pointer', borderRadius: '4px' }}
                >
                  Return to Home
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', borderRadius: '8px', overflow: 'hidden' }}>
              
              {/* Stepper Progress Bar */}
              <div style={{
                display: 'flex',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                padding: '16px 24px',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: currentStep === 1 ? '#d64238' : '#10b981',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '14px'
                  }}>
                    {currentStep > 1 ? '✓' : '1'}
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', display: 'block' }}>Step 1</span>
                    <strong style={{ fontSize: '14px', color: currentStep === 1 ? '#0f172a' : '#10b981' }}>Shipment & Containers</strong>
                  </div>
                </div>

                <div style={{ flex: '1', height: '2px', background: currentStep >= 2 ? '#d64238' : '#e2e8f0', margin: '0 15px', minWidth: '40px' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: currentStep === 2 ? '#d64238' : '#cbd5e1',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '14px'
                  }}>
                    2
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', display: 'block' }}>Step 2</span>
                    <strong style={{ fontSize: '14px', color: currentStep === 2 ? '#0f172a' : '#94a3b8' }}>Customer Information</strong>
                  </div>
                </div>
              </div>

              {/* Dynamic Freight Mode Header Tabs (Only in Step 1) */}
              {currentStep === 1 && (
                <div style={{ display: 'flex', borderBottom: '2px solid #eaeaea', background: '#fcfcfc' }}>
                  {freightTypes.map(ft => {
                    const isActive = selectedFreightTypeId === ft.id
                    return (
                      <button
                        key={ft.id}
                        type="button"
                        onClick={() => handleFreightTypeTabChange(ft.id)}
                        style={{
                          flex: 1,
                          padding: '18px 10px',
                          border: 'none',
                          borderBottom: isActive ? '3px solid #d64238' : 'none',
                          background: isActive ? '#fff' : 'transparent',
                          color: isActive ? '#d64238' : '#666',
                          fontWeight: 700,
                          fontSize: '15px',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textAlign: 'center'
                        }}
                      >
                        {ft.name}
                      </button>
                    )
                  })}
                </div>
              )}

              <div style={{ padding: '35px' }}>
                {/* Selected Rate Context Banner (Compact reference across both steps) */}
                {selectedRate && (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderLeft: '4px solid #d64238',
                    borderRadius: '4px',
                    padding: '16px 20px',
                    marginBottom: '25px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '15px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{
                          background: '#ecfdf5',
                          color: '#065f46',
                          border: '1px solid #a7f3d0',
                          padding: '2px 8px',
                          borderRadius: '3px',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase'
                        }}>
                          ✓ Rate Locked
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          Carrier: <strong style={{ color: '#1e293b' }}>{selectedRate.carrier || 'Standard'}</strong> · Rate ID: {selectedRate.id}
                        </span>
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                        {selectedRate.origin_name || selectedRate.origin_code} ({selectedRate.origin_code})
                        {(selectedRate.transhipment_code || selectedTranshipmentPort?.port_code) ? (
                          <span style={{ color: '#d64238' }}> → Via {selectedRate.transhipment_name || selectedTranshipmentPort?.port_name || selectedRate.transhipment_code || selectedTranshipmentPort?.port_code} ({selectedRate.transhipment_code || selectedTranshipmentPort?.port_code}) → </span>
                        ) : ' → '}
                        {selectedRate.destination_name || selectedRate.destination_code} ({selectedRate.destination_code})
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        {selectedRate.container_name ? `Container: ${selectedRate.container_name} · ` : ''}Transit Time: {selectedRate.transit_time} Days
                        {' · '}
                        <strong style={{ color: '#334155' }}>Transshipment Port:</strong>{' '}
                        {(selectedRate.transhipment_code || selectedTranshipmentPort?.port_code) ? (
                          <strong style={{ color: '#0f172a' }}>
                            {selectedRate.transhipment_name || selectedTranshipmentPort?.port_name || selectedRate.transhipment_code || selectedTranshipmentPort?.port_code} ({selectedRate.transhipment_code || selectedTranshipmentPort?.port_code})
                          </strong>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No transshipment</span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#d64238' }}>
                        ${selectedRate.price}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                        {selectedRate.currency || 'USD'} Freight Charge
                      </div>
                      {(Number(selectedRate.local_thc) > 0 || Number(selectedRate.other_charges) > 0) && (
                        <div style={{
                          marginTop: '6px',
                          paddingTop: '6px',
                          borderTop: '1px dashed #cbd5e1',
                          fontSize: '11px',
                          color: '#64748b',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          textAlign: 'right'
                        }}>
                          <div>Local THC: <strong style={{ color: '#0f172a' }}>${Number(selectedRate.local_thc || 0).toFixed(2)}</strong></div>
                          <div>Other Charges: <strong style={{ color: '#0f172a' }}>${Number(selectedRate.other_charges || 0).toFixed(2)}</strong></div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {error && (
                  <div style={{ background: '#fdf7f7', border: '1px solid #f5c6cb', color: '#721c24', padding: '12px 16px', borderRadius: '4px', marginBottom: '25px', fontSize: '14px' }}>
                    {error}
                  </div>
                )}

                {/* ========================================================================= */}
                {/* STEP 1: SHIPMENT DETAILS + CONTAINER DETAILS                               */}
                {/* ========================================================================= */}
                {currentStep === 1 && (
                  <div>
                    {/* 1. Shipment Type selection (FCL vs LCL etc) */}
                    <div style={{ marginBottom: '25px' }}>
                      <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', color: '#333', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                        Shipment Type <span style={{ color: '#d64238' }}>*</span>
                      </label>
                      <div style={{ display: 'flex', gap: '15px' }}>
                        {shipmentTypes
                          .filter(st => st.freight_type_id === selectedFreightTypeId)
                          .map(st => {
                            const isSelected = selectedShipmentTypeId === st.id
                            return (
                              <label 
                                key={st.id} 
                                style={{
                                  flex: 1,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  padding: '12px 15px',
                                  border: isSelected ? '2px solid #d64238' : '1px solid #ddd',
                                  borderRadius: '4px',
                                  background: isSelected ? '#fef8f7' : '#fff',
                                  cursor: 'pointer',
                                  textAlign: 'center',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <input 
                                  type="radio" 
                                  name="shipment_type" 
                                  value={st.id} 
                                  checked={isSelected}
                                  onChange={() => {
                                    setSelectedShipmentTypeId(st.id)
                                    if (stepErrors.shipment_type) {
                                      setStepErrors(prev => {
                                        const next = { ...prev }
                                        delete next.shipment_type
                                        return next
                                      })
                                    }
                                  }}
                                  style={{ display: 'none' }}
                                />
                                <span style={{ fontWeight: 700, fontSize: '14px', color: isSelected ? '#d64238' : '#333' }}>
                                  {st.name}
                                </span>
                                <span style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>
                                  {st.description}
                                </span>
                              </label>
                            )
                          })}
                      </div>
                      {stepErrors.shipment_type && (
                        <div style={{ color: '#d64238', fontSize: '12px', marginTop: '6px' }}>
                          {stepErrors.shipment_type}
                        </div>
                      )}
                    </div>

                    {/* 2. Incoterms and Ports Fields Grid (Upper Shipment Details) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                      
                      {/* Incoterms (Terms) */}
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#333', marginBottom: '6px' }}>
                          Incoterms (Terms) <span style={{ color: '#d64238' }}>*</span>
                        </label>
                        <select
                          className="form-control"
                          value={selectedTermId}
                          onChange={e => {
                            setSelectedTermId(e.target.value)
                            if (stepErrors.term) {
                              setStepErrors(prev => {
                                const next = { ...prev }
                                delete next.term
                                return next
                              })
                            }
                          }}
                          required
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: stepErrors.term ? '1px solid #d64238' : '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '14px',
                            height: '42px'
                          }}
                        >
                          <option value="">-- Choose Incoterm --</option>
                          {terms.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        {stepErrors.term && (
                          <div style={{ color: '#d64238', fontSize: '12px', marginTop: '4px' }}>
                            {stepErrors.term}
                          </div>
                        )}
                      </div>

                      {portWarning && (
                        <div style={{
                          gridColumn: 'span 2',
                          background: '#fffbf0',
                          border: '1px solid #ffeeba',
                          color: '#856404',
                          padding: '10px 14px',
                          borderRadius: '4px',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span style={{ fontSize: '16px' }}>⚠️</span>
                          <span>{portWarning} Please search and select a valid port.</span>
                        </div>
                      )}

                      {/* Loading Port — Async Server Autocomplete */}
                      <div>
                        <PortSearchSelect
                          label={isAirMode ? 'Airport of Departure' : 'Port of Loading'}
                          placeholder={isAirMode ? 'Search departure airport...' : 'Search departure port...'}
                          value={selectedLoadingPortId}
                          selectedPort={selectedLoadingPort}
                          onChange={(id, port) => {
                            setSelectedLoadingPortId(id)
                            setSelectedLoadingPort(port)
                            if (stepErrors.loading_port) {
                              setStepErrors(prev => {
                                const next = { ...prev }
                                delete next.loading_port
                                return next
                              })
                            }
                          }}
                          freightType={isAirMode ? 'Air' : 'Ocean'}
                          disabled={Boolean(selectedRate)}
                          required={true}
                        />
                        {stepErrors.loading_port && (
                          <div style={{ color: '#d64238', fontSize: '12px', marginTop: '4px' }}>
                            {stepErrors.loading_port}
                          </div>
                        )}
                      </div>

                      {/* Discharge Port — Async Server Autocomplete */}
                      <div>
                        <PortSearchSelect
                          label={isAirMode ? 'Airport of Arrival' : 'Port of Discharge'}
                          placeholder={isAirMode ? 'Search arrival airport...' : 'Search arrival port...'}
                          value={selectedDischargePortId}
                          selectedPort={selectedDischargePort}
                          onChange={(id, port) => {
                            setSelectedDischargePortId(id)
                            setSelectedDischargePort(port)
                            if (stepErrors.discharge_port) {
                              setStepErrors(prev => {
                                const next = { ...prev }
                                delete next.discharge_port
                                return next
                              })
                            }
                          }}
                          freightType={isAirMode ? 'Air' : 'Ocean'}
                          disabled={Boolean(selectedRate)}
                          required={true}
                        />
                        {stepErrors.discharge_port && (
                          <div style={{ color: '#d64238', fontSize: '12px', marginTop: '4px' }}>
                            {stepErrors.discharge_port}
                          </div>
                        )}
                      </div>

                      {/* Transshipment Port (Via) */}
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#333', marginBottom: '6px' }}>
                          Transshipment Port (Via)
                        </label>
                        <input 
                          type="text" 
                          className="form-control"
                          readOnly
                          value={
                            (selectedRate?.transhipment_code || selectedTranshipmentPort?.port_code)
                              ? `${selectedRate?.transhipment_name || selectedTranshipmentPort?.port_name || ''} (${selectedRate?.transhipment_code || selectedTranshipmentPort?.port_code})${selectedRate?.transhipment_country || selectedTranshipmentPort?.country ? ` - ${selectedRate?.transhipment_country || selectedTranshipmentPort?.country}` : ''}`
                              : 'No transshipment'
                          }
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            fontSize: '14px',
                            background: '#f8fafc',
                            color: (selectedRate?.transhipment_code || selectedTranshipmentPort?.port_code) ? '#0f172a' : '#64748b',
                            fontWeight: (selectedRate?.transhipment_code || selectedTranshipmentPort?.port_code) ? 600 : 400
                          }}
                        />
                      </div>

                      {/* Final Place of Delivery */}
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#333', marginBottom: '6px' }}>
                          Final Place of Delivery
                        </label>
                        <input 
                          type="text" 
                          className="form-control"
                          value={finalDelivery}
                          onChange={e => setFinalDelivery(e.target.value)}
                          placeholder="e.g. Warehouse 4, Mumbai, India"
                          style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px' }}
                        />
                      </div>

                      {/* Cargo Details & Remarks */}
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#333', marginBottom: '6px' }}>
                          Cargo Details & Remarks
                        </label>
                        <textarea 
                          className="form-control"
                          value={cargoDetails}
                          onChange={e => setCargoDetails(e.target.value)}
                          placeholder="Specify details: e.g. weight, volume, number of boxes, dangerous goods status, commodity type..."
                          style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', minHeight: '80px', resize: 'vertical' }}
                        />
                      </div>

                      {/* Any Special Instructions */}
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#333', marginBottom: '6px' }}>
                          Any Special Instructions
                        </label>
                        <textarea 
                          className="form-control"
                          value={specialInstructions}
                          onChange={e => setSpecialInstructions(e.target.value)}
                          placeholder="Enter any special instructions or requirements for this shipment"
                          style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', minHeight: '60px', resize: 'vertical' }}
                        />
                      </div>

                    </div>

                    {/* 3. CONTAINER DETAILS SECTION (Lower Section - Matching Legacy Reference Design) */}
                    {isFCL && (
                      <div style={{ marginBottom: '30px' }}>
                        <h4 style={{ margin: '25px 0 15px', color: '#333', fontSize: '18px', fontWeight: 700 }}>
                          Container Details
                        </h4>
                        
                        <button
                          type="button"
                          className="fcl-add-container-btn"
                          onClick={handleAddContainer}
                        >
                          + Add Container
                        </button>

                        {/* List of Containers */}
                        <div id="fclContainersWrapper">
                          {containersList.map((container, idx) => {
                            const isReefer = isReeferEquipment(container.equipment)
                            const isOpenTop = isOpenTopEquipment(container.equipment)

                            return (
                              <div
                                key={container.id || idx}
                                className="fcl-container-item"
                              >
                                <div className="fcl-container-header">
                                  <h4>Container #{idx + 1}</h4>
                                  {containersList.length > 1 && (
                                    <button
                                      type="button"
                                      className="fcl-remove-container"
                                      onClick={() => handleRemoveContainer(idx)}
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>

                                {/* Row 1: Equipment and Quantity */}
                                <div className="fcl-form-row">
                                  <div className="fcl-form-group">
                                    <label>
                                      Size and Type of Equipment <span className="require">*</span>
                                    </label>
                                    <select
                                      className="fcl-select"
                                      value={container.container_id || containers.find(c => c.name === container.equipment)?.id || ''}
                                      onChange={e => {
                                        const selectedId = e.target.value
                                        const matched = containers.find(c => c.id === selectedId)
                                        const updated = [...containersList]
                                        updated[idx] = {
                                          ...updated[idx],
                                          container_id: selectedId,
                                          equipment: matched ? matched.name : selectedId
                                        }
                                        setContainersList(updated)
                                        const errKey = `container_${idx}_equipment`
                                        if (stepErrors[errKey]) {
                                          setStepErrors(prev => {
                                            const next = { ...prev }
                                            delete next[errKey]
                                            return next
                                          })
                                        }
                                      }}
                                      disabled={containersLoading || containers.length === 0}
                                      style={stepErrors[`container_${idx}_equipment`] ? { borderColor: '#d64238' } : {}}
                                    >
                                      {containersLoading ? (
                                        <option value="">Loading containers...</option>
                                      ) : containersError ? (
                                        <option value="">Error loading containers</option>
                                      ) : containers.length === 0 ? (
                                        <option value="">No active containers available</option>
                                      ) : (
                                        <>
                                          <option value="">Select Container Type</option>
                                          {containers.map(c => (
                                            <option key={c.id} value={c.id}>
                                              {c.name} {c.size && !c.name.includes(c.size) ? `(${c.size})` : ''}
                                            </option>
                                          ))}
                                        </>
                                      )}
                                    </select>
                                    {containersError && (
                                      <div style={{ color: '#d64238', fontSize: '11px', marginTop: '4px' }}>
                                        {containersError}
                                      </div>
                                    )}
                                    {stepErrors[`container_${idx}_equipment`] && (
                                      <div style={{ color: '#d64238', fontSize: '11px', marginTop: '4px' }}>
                                        {stepErrors[`container_${idx}_equipment`]}
                                      </div>
                                    )}
                                  </div>

                                  <div className="fcl-form-group">
                                    <label>
                                      No. of Containers <span className="require">*</span>
                                    </label>
                                    <input
                                      type="number"
                                      className="fcl-input"
                                      min="1"
                                      value={container.quantity}
                                      onChange={e => handleContainerChange(idx, 'quantity', e.target.value)}
                                      placeholder="Enter quantity"
                                      style={stepErrors[`container_${idx}_quantity`] ? { borderColor: '#d64238' } : {}}
                                    />
                                    {stepErrors[`container_${idx}_quantity`] && (
                                      <div style={{ color: '#d64238', fontSize: '11px', marginTop: '4px' }}>
                                        {stepErrors[`container_${idx}_quantity`]}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Open Top Gauge Selection */}
                                {isOpenTop && (
                                  <div className="fcl-form-row">
                                    <div className="fcl-form-group full-width">
                                      <label>
                                        Gauge Type <span className="require">*</span>
                                      </label>
                                      <select
                                        className="fcl-select"
                                        value={container.gauge_type}
                                        onChange={e => handleContainerChange(idx, 'gauge_type', e.target.value)}
                                      >
                                        <option value="">Select Gauge Type</option>
                                        <option value="outgauge">Outgauge</option>
                                        <option value="inguage">Inguage</option>
                                      </select>
                                    </div>
                                  </div>
                                )}

                                {/* Row 2: Cargo Dimensions (mm) */}
                                <div className="fcl-form-row">
                                  <div className="fcl-form-group full-width">
                                    <label>Cargo Dimensions (mm)</label>
                                    <div className="fcl-dimension-group">
                                      <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        placeholder="Length"
                                        value={container.dimensions?.length ?? ''}
                                        onChange={e => {
                                          const val = e.target.value
                                          if (val !== '' && parseFloat(val) < 0) return
                                          handleContainerChange(idx, 'dimensions', {
                                            ...container.dimensions,
                                            length: val
                                          })
                                        }}
                                      />
                                      <span>×</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        placeholder="Width"
                                        value={container.dimensions?.width ?? ''}
                                        onChange={e => {
                                          const val = e.target.value
                                          if (val !== '' && parseFloat(val) < 0) return
                                          handleContainerChange(idx, 'dimensions', {
                                            ...container.dimensions,
                                            width: val
                                          })
                                        }}
                                      />
                                      <span>×</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        placeholder="Height"
                                        value={container.dimensions?.height ?? ''}
                                        onChange={e => {
                                          const val = e.target.value
                                          if (val !== '' && parseFloat(val) < 0) return
                                          handleContainerChange(idx, 'dimensions', {
                                            ...container.dimensions,
                                            height: val
                                          })
                                        }}
                                      />
                                    </div>
                                    {stepErrors[`container_${idx}_dimensions`] && (
                                      <div style={{ color: '#d64238', fontSize: '11px', marginTop: '4px' }}>
                                        {stepErrors[`container_${idx}_dimensions`]}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Weight and Temperature */}
                                <div className="fcl-form-row" style={{ marginBottom: 0 }}>
                                  <div className="fcl-form-group">
                                    <label>
                                      Weight <span className="require">*</span>
                                    </label>
                                    <div className="fcl-weight-input-group">
                                      <input
                                        type="number"
                                        min="1"
                                        step="any"
                                        value={container.weight}
                                        onChange={e => handleContainerChange(idx, 'weight', e.target.value)}
                                        placeholder="Enter weight"
                                        style={stepErrors[`container_${idx}_weight`] ? { borderColor: '#d64238' } : {}}
                                      />
                                      <select
                                        value={container.weight_unit}
                                        onChange={e => handleContainerChange(idx, 'weight_unit', e.target.value)}
                                      >
                                        <option value="KG">KG</option>
                                        <option value="LBS">LBS</option>
                                      </select>
                                    </div>
                                    {stepErrors[`container_${idx}_weight`] && (
                                      <div style={{ color: '#d64238', fontSize: '11px', marginTop: '4px' }}>
                                        {stepErrors[`container_${idx}_weight`]}
                                      </div>
                                    )}
                                  </div>

                                  {isReefer && (
                                    <div className="fcl-form-group">
                                      <label>
                                        Temperature (for Reefer) <span className="require">*</span>
                                      </label>
                                      <div className="fcl-temp-input-group">
                                        <input
                                          type="number"
                                          step="any"
                                          value={container.temperature}
                                          onChange={e => handleContainerChange(idx, 'temperature', e.target.value)}
                                          placeholder="Temperature"
                                          style={stepErrors[`container_${idx}_temperature`] ? { borderColor: '#d64238' } : {}}
                                        />
                                        <select
                                          value={container.temp_unit}
                                          onChange={e => handleContainerChange(idx, 'temp_unit', e.target.value)}
                                        >
                                          <option value="Celsius">Celsius</option>
                                          <option value="Fahrenheit">Fahrenheit</option>
                                        </select>
                                      </div>
                                      {stepErrors[`container_${idx}_temperature`] && (
                                        <div style={{ color: '#d64238', fontSize: '11px', marginTop: '4px' }}>
                                          {stepErrors[`container_${idx}_temperature`]}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Step 1 Action Button: Proceed to Booking */}
                    <div style={{ marginTop: '30px' }}>
                      <button
                        type="button"
                        onClick={handleProceedToBooking}
                        style={{
                          width: '100%',
                          background: '#d64238',
                          color: '#fff',
                          border: 'none',
                          padding: '16px',
                          fontWeight: 700,
                          fontSize: '16px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          boxShadow: '0 4px 12px rgba(214, 66, 56, 0.25)',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#c0382f'}
                        onMouseLeave={e => e.currentTarget.style.background = '#d64238'}
                      >
                        Proceed to Booking →
                      </button>
                    </div>
                  </div>
                )}

                {/* ========================================================================= */}
                {/* STEP 2: CUSTOMER INFORMATION                                              */}
                {/* ========================================================================= */}
                {currentStep === 2 && (
                  <div>
                    {/* Compact Shipment Summary Reference Box */}
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '18px 20px',
                      marginBottom: '28px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Shipment Summary
                        </span>
                        <button
                          type="button"
                          onClick={handleBackToStep1}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#d64238',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          Edit Shipment Details
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '13px' }}>
                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Route</span>
                          <strong style={{ color: '#0f172a' }}>
                            {selectedLoadingPort?.port_name || 'Origin'} ({selectedLoadingPort?.port_code || 'POL'})
                            {(selectedRate?.transhipment_code || selectedTranshipmentPort?.port_code) ? (
                              <span style={{ color: '#d64238' }}> → Via {selectedRate?.transhipment_name || selectedTranshipmentPort?.port_name || selectedRate?.transhipment_code || selectedTranshipmentPort?.port_code} ({selectedRate?.transhipment_code || selectedTranshipmentPort?.port_code}) → </span>
                            ) : ' → '}
                            {selectedDischargePort?.port_name || 'Destination'} ({selectedDischargePort?.port_code || 'POD'})
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Transshipment Port</span>
                          {(selectedRate?.transhipment_code || selectedTranshipmentPort?.port_code) ? (
                            <strong style={{ color: '#0f172a' }}>
                              {selectedRate?.transhipment_name || selectedTranshipmentPort?.port_name || selectedRate?.transhipment_code || selectedTranshipmentPort?.port_code} ({selectedRate?.transhipment_code || selectedTranshipmentPort?.port_code})
                            </strong>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No transshipment</span>
                          )}
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Shipment / Term</span>
                          <strong style={{ color: '#0f172a' }}>
                            {currentShipmentTypeName} · {terms.find(t => t.id === selectedTermId)?.name || 'N/A'}
                          </strong>
                        </div>
                        {isFCL && (
                          <div style={{ gridColumn: 'span 2' }}>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Containers ({containersList.length})</span>
                            <div style={{ color: '#0f172a', fontWeight: 600 }}>
                              {containersList.map((c, i) => (
                                <span key={i} style={{ display: 'inline-block', background: '#fff', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '4px', marginRight: '6px', marginTop: '4px', fontSize: '12px' }}>
                                  {c.quantity}x {c.equipment || 'Container'} ({c.weight} {c.weight_unit})
                                  {isReeferEquipment(c.equipment) && ` [${c.temperature}°]`}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedRate && (
                          <div style={{ gridColumn: 'span 2', borderTop: '1px dashed #cbd5e1', paddingTop: '10px', marginTop: '6px' }}>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Freight Rate Price Breakdown (Rate ID: {selectedRate.id})</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', marginTop: '4px', fontSize: '13px' }}>
                              <div>
                                Main Freight: <strong style={{ color: '#d64238', fontSize: '14px' }}>${selectedRate.price} {selectedRate.currency || 'USD'}</strong>
                              </div>
                              {(Number(selectedRate.local_thc) > 0 || Number(selectedRate.other_charges) > 0) && (
                                <>
                                  <div style={{ color: '#475569' }}>
                                    Local THC: <strong style={{ color: '#0f172a' }}>${Number(selectedRate.local_thc || 0).toFixed(2)}</strong>
                                  </div>
                                  <div style={{ color: '#475569' }}>
                                    Other Charges: <strong style={{ color: '#0f172a' }}>${Number(selectedRate.other_charges || 0).toFixed(2)}</strong>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Customer Information Form Card */}
                    <div style={{
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '24px',
                      marginBottom: '30px'
                    }}>
                      <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                        Customer Information
                      </h3>
                      <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b' }}>
                        Please provide the primary contact details for this freight reservation.
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        {/* Full Name */}
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#333', marginBottom: '6px' }}>
                            Your Full Name <span style={{ color: '#d64238' }}>*</span>
                          </label>
                          <input 
                            type="text" 
                            className="form-control"
                            value={userName}
                            onChange={e => {
                              setUserName(e.target.value)
                              if (stepErrors.userName) {
                                setStepErrors(prev => {
                                  const next = { ...prev }
                                  delete next.userName
                                  return next
                                })
                              }
                            }}
                            required
                            placeholder="e.g. John Doe"
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: stepErrors.userName ? '1px solid #d64238' : '1px solid #ccc',
                              borderRadius: '4px',
                              fontSize: '14px'
                            }}
                          />
                          {stepErrors.userName && (
                            <div style={{ color: '#d64238', fontSize: '12px', marginTop: '4px' }}>
                              {stepErrors.userName}
                            </div>
                          )}
                        </div>

                        {/* Email Address */}
                        <div>
                          <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#333', marginBottom: '6px' }}>
                            Email Address <span style={{ color: '#d64238' }}>*</span>
                          </label>
                          <input 
                            type="email" 
                            className="form-control"
                            value={email}
                            onChange={e => {
                              setEmail(e.target.value)
                              if (stepErrors.email) {
                                setStepErrors(prev => {
                                  const next = { ...prev }
                                  delete next.email
                                  return next
                                })
                              }
                            }}
                            required
                            placeholder="e.g. john@company.com"
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: stepErrors.email ? '1px solid #d64238' : '1px solid #ccc',
                              borderRadius: '4px',
                              fontSize: '14px'
                            }}
                          />
                          {stepErrors.email && (
                            <div style={{ color: '#d64238', fontSize: '12px', marginTop: '4px' }}>
                              {stepErrors.email}
                            </div>
                          )}
                        </div>

                        {/* Phone Number */}
                        <div>
                          <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#333', marginBottom: '6px' }}>
                            Phone Number <span style={{ color: '#d64238' }}>*</span>
                          </label>
                          <input 
                            type="text" 
                            className="form-control"
                            value={phone}
                            onChange={e => {
                              setPhone(e.target.value)
                              if (stepErrors.phone) {
                                setStepErrors(prev => {
                                  const next = { ...prev }
                                  delete next.phone
                                  return next
                                })
                              }
                            }}
                            required
                            placeholder="e.g. +1 555-0199"
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: stepErrors.phone ? '1px solid #d64238' : '1px solid #ccc',
                              borderRadius: '4px',
                              fontSize: '14px'
                            }}
                          />
                          {stepErrors.phone && (
                            <div style={{ color: '#d64238', fontSize: '12px', marginTop: '4px' }}>
                              {stepErrors.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Step 2 Actions */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={handleBackToStep1}
                        style={{
                          flex: 1,
                          background: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          padding: '14px',
                          fontWeight: 700,
                          fontSize: '15px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                          transition: 'all 0.15s'
                        }}
                      >
                        ← Back / Edit Shipment
                      </button>

                      <button
                        type="button"
                        disabled={submitting}
                        onClick={handleSubmitBooking}
                        style={{
                          flex: 2,
                          background: '#d64238',
                          color: '#fff',
                          border: 'none',
                          padding: '14px',
                          fontWeight: 700,
                          fontSize: '15px',
                          borderRadius: '6px',
                          cursor: submitting ? 'not-allowed' : 'pointer',
                          opacity: submitting ? 0.8 : 1,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          boxShadow: '0 4px 12px rgba(214, 66, 56, 0.25)'
                        }}
                      >
                        {submitting ? 'Creating Booking...' : 'Submit Booking'}
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}

        </div>
      </section>

      {/* ========================================================================= */}
      {/* USER PORTAL AUTHENTICATION MODAL (Case B: Visitor is not authenticated)    */}
      {/* ========================================================================= */}
      {showAuthModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            maxWidth: '460px',
            width: '100%',
            padding: '32px 28px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#d64238',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              margin: '0 auto 18px auto'
            }}>
              🔒
            </div>

            <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
              Authentication Required
            </h3>

            <p style={{ margin: '0 0 24px 0', fontSize: '15px', color: '#475569', lineHeight: '1.6' }}>
              Please log in to the User Portal first to submit your booking.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={handleLoginToUserPortal}
                style={{
                  width: '100%',
                  background: '#d64238',
                  color: '#fff',
                  border: 'none',
                  padding: '13px 20px',
                  borderRadius: '6px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(214, 66, 56, 0.3)',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#c0382f'}
                onMouseLeave={e => e.currentTarget.style.background = '#d64238'}
              >
                Login to User Portal
              </button>

              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                style={{
                  width: '100%',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '11px 20px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel / Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
