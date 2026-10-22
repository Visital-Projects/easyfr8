import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCms } from '../context/CmsContext'
import { getImageUrl, getServiceIconClass } from '../services/api'
import RouteEnquiryModal from '../components/RouteEnquiryModal'

// Slider background overlay
import slide3 from '../assets/images/main-slider/slide3.jpg'
import slideBg from '../assets/images/main-slider/slide-bg.png'



// Default freight modes shown when API is unavailable
const DEFAULT_MODES = [
  { id: 'ocean', name: 'Ocean Freight' },
  { id: 'air',   name: 'Air Freight'  },
]

// Default shipment types — shown when API is unavailable
const DEFAULT_SHIPMENT_TYPES = [
  { id: 'fcl', name: 'FCL', freight_type_id: 'ocean' },
  { id: 'lcl', name: 'LCL', freight_type_id: 'ocean' },
]

export default function Home() {
  const { cms, blogs, slides, partners, statistics, industries, loading } = useCms()
  // Do NOT return null on loading — always render the page

  // Filter and sort partners deterministically for the logo carousel.
  // Guarantees: valid object, valid id, active status, valid non-empty logo, deduplicated.
  const validPartners = useMemo(() => {
    if (!Array.isArray(partners)) return []
    const seen = new Set()
    return partners
      .filter((p) => {
        if (!p || typeof p !== 'object' || !p.id) return false
        if (seen.has(p.id)) return false
        seen.add(p.id)
        const isActive = p.status === 'active' || p.status === undefined
        const hasLogo = typeof p.logo === 'string' && p.logo.trim() !== ''
        const notTest = !String(p.name || '').toLowerCase().includes('test partner')
        return isActive && hasLogo && notTest
      })
      .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.id).localeCompare(String(b.id)))
  }, [partners])

  const navigate = useNavigate()
  const [currentSlide, setCurrentSlide] = useState(0)
  
  // Dynamic Freight Search State — pre-loaded with defaults so tabs always show
  const [modes, setModes] = useState(DEFAULT_MODES)
  const [selectedModeId, setSelectedModeId] = useState(DEFAULT_MODES[0].id)
  const [shipmentTypes, setShipmentTypes] = useState(DEFAULT_SHIPMENT_TYPES)
  const [selectedShipmentTypeId, setSelectedShipmentTypeId] = useState(DEFAULT_SHIPMENT_TYPES[0].id)
  const [containersList, setContainersList] = useState([])
  const [selectedContainerId, setSelectedContainerId] = useState('')

  // Search input and location ID states
  const [originText, setOriginText] = useState('')
  const [originId, setOriginId] = useState('')
  const [destinationText, setDestinationText] = useState('')
  const [destinationId, setDestinationId] = useState('')
  const [weight, setWeight] = useState('')
  const [weightUnit, setWeightUnit] = useState('KG')

  // Available Routes and Container Pricing states
  const [availableRoutes, setAvailableRoutes] = useState([])
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [activeContainers, setActiveContainers] = useState([])
  const [containersLoading, setContainersLoading] = useState(false)
  const [noRoutesFound, setNoRoutesFound] = useState(false)

  // Dropdown suggestions state
  const [locationResults, setLocationResults] = useState({ origin: [], destination: [] })
  const [showDropdown, setShowDropdown] = useState({ origin: false, destination: false })
  const [noMatchFound, setNoMatchFound] = useState({ origin: false, destination: false })
  const [selectedPortObjects, setSelectedPortObjects] = useState({ origin: null, destination: null })

  // Search availability & enquiry workflow states
  const [searchChecking, setSearchChecking] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [searchValidationMsg, setSearchValidationMsg] = useState(null)
  const [searchUnavailable, setSearchUnavailable] = useState(null)
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false)
  const [enquiryContext, setEnquiryContext] = useState(null)
  const [enquiryToast, setEnquiryToast] = useState(null)

  const searchTimers = useRef({})

  // Fetch modes and containers list
  // Use VITE_API_URL for absolute URL so production build works correctly
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    fetch(`${API_URL}/freight-types`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const active = data.filter(m => m.status === 'active')
          // Only override defaults if API returns real data
          if (active.length > 0) {
            setModes(active)
            const oceanMode = active.find(m => m.id === 'ocean-freight' || (m.name && m.name.toLowerCase().includes('ocean')))
            setSelectedModeId(oceanMode ? oceanMode.id : active[0].id)
          }
        }
      })
      .catch(() => {
        // API unavailable — keep DEFAULT_MODES already set as initial state
      })

    fetch(`${API_URL}/containers?status=active`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setContainersList(data.filter(c => c.status === 'active'))
        }
      })
      .catch(console.error)
  }, [])

  // Fetch shipment types when selected mode changes
  useEffect(() => {
    if (!selectedModeId) return
    fetch(`${API_URL}/shipment-types?freight_type_id=${selectedModeId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const active = data.filter(t => t.status === 'active')
          if (active.length > 0) {
            setShipmentTypes(active)
            const defaultShip = active.find(t => t.id === 'shiptype-fcl' || (t.name && t.name.toUpperCase().includes('FCL'))) || active[0]
            setSelectedShipmentTypeId(defaultShip.id)
            if (originText.trim() && destinationText.trim()) {
              executeRouteSearch(selectedModeId, defaultShip.id)
            }
          }
        }
        // else keep DEFAULT_SHIPMENT_TYPES
      })
      .catch(() => {
        // Keep defaults on error
      })
    
    // Clear previous search results and container selection when changing mode
    setSelectedPortObjects({ origin: null, destination: null })
    setLocationResults({ origin: [], destination: [] })
    setShowDropdown({ origin: false, destination: false })
    setNoMatchFound({ origin: false, destination: false })
    setAvailableRoutes([])
    setSelectedRoute(null)
    setActiveContainers([])
    setNoRoutesFound(false)
    setSearchUnavailable(null)
    setSearchError(null)
    setSearchValidationMsg(null)
  }, [selectedModeId])

  // Preload all hero images
  useEffect(() => {
    if (slides && slides.length > 0) {
      slides.forEach(slide => {
        if (slide.image) {
          const img = new Image();
          img.src = getImageUrl(slide.image);
        }
      });
    }
  }, [slides]);

  // Slider auto-advance with timing sync
  useEffect(() => {
    if (!slides.length) return
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [slides.length, currentSlide])

  // Owl Carousel initializations for partners and blogs
  useEffect(() => {
    const $ = window.jQuery
    let partnerCarousel, newsCarousel

    const initCarousels = () => {
      if ($) {
        if ($('.slide-partener').length && typeof $.fn.owlCarousel === 'function' && validPartners.length > 0) {
          partnerCarousel = $('.slide-partener').owlCarousel({
            loop: true,
            margin: 30,
            nav: true,
            smartSpeed: 500,
            autoplay: 4000,
            dots: false,
            navText: [ '<span class="fa fa-angle-left"></span>', '<span class="fa fa-angle-right"></span>' ],
            responsive: {
              0: { items: 2, margin: 0 },
              768: { items: 3 },
              992: { items: 5 },
              1200: { items: 5 }
            }
          })
        }

        if ($('.news-slide').length && typeof $.fn.owlCarousel === 'function' && blogs.length > 0) {
          newsCarousel = $('.news-slide').owlCarousel({
            loop: true,
            margin: 0,
            nav: false,
            smartSpeed: 500,
            autoplay: 4000,
            dots: false,
            responsive: {
              0: { items: 1 },
              600: { items: 2 },
              800: { items: 2 },
              1024: { items: 3 },
              1200: { items: 3 }
            }
          })
        }
      }
    }

    // Small delay to ensure React DOM is fully painted
    const timer = setTimeout(initCarousels, 250)

    return () => {
      clearTimeout(timer)
      if ($) {
        if (partnerCarousel && typeof partnerCarousel.trigger === 'function') {
          partnerCarousel.trigger('destroy.owl.carousel')
        }
        if (newsCarousel && typeof newsCarousel.trigger === 'function') {
          newsCarousel.trigger('destroy.owl.carousel')
        }
      }
    }
  }, [blogs, validPartners])

  // Location Search (dynamic)
  const searchLocations = async (term, field) => {
    if (term.length < 2) {
      setLocationResults(prev => ({ ...prev, [field]: [] }))
      setShowDropdown(prev => ({ ...prev, [field]: false }))
      setNoMatchFound(prev => ({ ...prev, [field]: false }))
      return
    }
    
    // Determine type based on selected mode
    const selectedMode = modes.find(m => m.id === selectedModeId)
    const modeType = selectedMode?.name || selectedMode?.id || 'Ocean Freight'
    
    try {
      // 1. Search ports with freight_type filter for the active mode
      let res = await fetch(`${API_URL}/ports?search=${encodeURIComponent(term)}&freight_type=${encodeURIComponent(modeType)}&status=active`)
      let data = await res.json()
      let portsList = (data.success && Array.isArray(data.ports)) ? data.ports : []

      // Fallback: If mode-specific search returned nothing, search all active ports
      if (portsList.length === 0) {
        res = await fetch(`${API_URL}/ports?search=${encodeURIComponent(term)}&status=active`)
        data = await res.json()
        portsList = (data.success && Array.isArray(data.ports)) ? data.ports : []
      }

      setLocationResults(prev => ({ ...prev, [field]: portsList }))
      setNoMatchFound(prev => ({ ...prev, [field]: portsList.length === 0 }))
      setShowDropdown(prev => ({ ...prev, [field]: true }))
    } catch (e) {
      setLocationResults(prev => ({ ...prev, [field]: [] }))
      setNoMatchFound(prev => ({ ...prev, [field]: false }))
    }
  }

  const handleLocationInput = (val, field) => {
    if (field === 'origin') {
      setOriginText(val)
      setOriginId('')
      setSelectedPortObjects(prev => ({ ...prev, origin: null }))
    } else if (field === 'destination') {
      setDestinationText(val)
      setDestinationId('')
      setSelectedPortObjects(prev => ({ ...prev, destination: null }))
    }
    setAvailableRoutes([])
    setSelectedRoute(null)
    setActiveContainers([])
    setNoRoutesFound(false)
    setSearchUnavailable(null)
    setSearchValidationMsg(null)
    setSearchError(null)
    clearTimeout(searchTimers.current[field])
    searchTimers.current[field] = setTimeout(() => searchLocations(val, field), 300)
  }

  const selectLocation = (item, field) => {
    const text = `${item.port_name} (${item.port_code}) - ${item.country}`
    if (field === 'origin') {
      setOriginText(text)
      setOriginId(item.id)
      setSelectedPortObjects(prev => ({ ...prev, origin: item }))
    } else if (field === 'destination') {
      setDestinationText(text)
      setDestinationId(item.id)
      setSelectedPortObjects(prev => ({ ...prev, destination: item }))
    }
    setShowDropdown(prev => ({ ...prev, [field]: false }))
    setNoMatchFound(prev => ({ ...prev, [field]: false }))
    setAvailableRoutes([])
    setSelectedRoute(null)
    setActiveContainers([])
    setNoRoutesFound(false)
    setSearchUnavailable(null)
    setSearchValidationMsg(null)
  }

  const handleOpenDropdownEnquiry = (field) => {
    setShowDropdown(prev => ({ ...prev, [field]: false }))
    const currentMode = modes.find(m => m.id === selectedModeId)
    const currentShipment = shipmentTypes.find(t => t.id === selectedShipmentTypeId)
    
    setEnquiryContext({
      originText: originText.trim(),
      destinationText: destinationText.trim(),
      transhipmentText: '',
      modeName: currentMode?.name || 'Ocean Freight',
      shipmentTypeName: currentShipment?.name || '',
      containerName: '',
      weight,
      weightUnit,
      reason: field === 'origin' ? 'origin_not_found' : 'destination_not_found'
    })
    setIsEnquiryModalOpen(true)
  }

  const renderTransportIcon = (modeIdOrName, customStyle = {}) => {
    const m = (modeIdOrName || '').toLowerCase()
    if (m.includes('air') || m.includes('plane') || m === 'mode-air') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#d64238', fontSize: '15px', ...customStyle }} title="Air Freight">
          <i className="fa fa-plane" aria-hidden="true" />
        </span>
      )
    }
    if (m.includes('road') || m.includes('truck') || m.includes('ftype-190')) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#d64238', fontSize: '15px', ...customStyle }} title="Road Freight">
          <i className="fa fa-truck" aria-hidden="true" />
        </span>
      )
    }
    // Default: Ocean Freight -> Ship icon
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#d64238', fontSize: '15px', ...customStyle }} title="Ocean Freight">
        <i className="fa fa-ship" aria-hidden="true" />
      </span>
    )
  }

  const executeRouteSearch = async (targetModeId = selectedModeId, targetShipmentTypeId = selectedShipmentTypeId) => {
    setSearchError(null)
    setSearchValidationMsg(null)
    setSearchUnavailable(null)
    setNoRoutesFound(false)
    setAvailableRoutes([])
    setSelectedRoute(null)
    setActiveContainers([])

    const trimmedOrigin = originText.trim()
    const trimmedDest = destinationText.trim()

    // 1. Validation check
    if (!trimmedOrigin || !trimmedDest) {
      setSearchValidationMsg('Please enter both origin and destination ports to search rates.')
      return
    }

    setSearchChecking(true)

    const selectedMode = (modes.length > 0 ? modes : DEFAULT_MODES).find(m => m.id === targetModeId)
    const modeType = selectedMode?.name || selectedMode?.id || 'Ocean Freight'
    const shipmentTypeObj = (shipmentTypes.length > 0 ? shipmentTypes : DEFAULT_SHIPMENT_TYPES).find(t => t.id === targetShipmentTypeId)

    try {
      // 2. Check Origin Port in Database
      let resolvedOrigin = selectedPortObjects.origin
      if (!resolvedOrigin || (resolvedOrigin.id !== originId && resolvedOrigin.port_code !== originId)) {
        let resO = await fetch(`${API_URL}/ports?search=${encodeURIComponent(trimmedOrigin)}&freight_type=${encodeURIComponent(modeType)}&status=active`)
        let dataO = await resO.json()
        let portsO = (dataO.success && Array.isArray(dataO.ports)) ? dataO.ports : []

        if (portsO.length === 0) {
          resO = await fetch(`${API_URL}/ports?search=${encodeURIComponent(trimmedOrigin)}&status=active`)
          dataO = await resO.json()
          portsO = (dataO.success && Array.isArray(dataO.ports)) ? dataO.ports : []
        }

        if (portsO.length === 0) {
          setSearchChecking(false)
          setSearchUnavailable({
            type: 'origin',
            title: 'Origin Port Not Found in Database',
            description: `We couldn't find origin port "${trimmedOrigin}" in our global ports database.`,
            originText: trimmedOrigin,
            destinationText: trimmedDest,
            transhipmentText: '',
            modeName: selectedMode?.name || 'Ocean Freight',
            shipmentTypeName: shipmentTypeObj?.name || '',
            reason: 'origin_not_found'
          })
          return
        }
        resolvedOrigin = portsO[0]
      }

      // 3. Check Destination Port in Database
      let resolvedDest = selectedPortObjects.destination
      if (!resolvedDest || (resolvedDest.id !== destinationId && resolvedDest.port_code !== destinationId)) {
        let resD = await fetch(`${API_URL}/ports?search=${encodeURIComponent(trimmedDest)}&freight_type=${encodeURIComponent(modeType)}&status=active`)
        let dataD = await resD.json()
        let portsD = (dataD.success && Array.isArray(dataD.ports)) ? dataD.ports : []

        if (portsD.length === 0) {
          resD = await fetch(`${API_URL}/ports?search=${encodeURIComponent(trimmedDest)}&status=active`)
          dataD = await resD.json()
          portsD = (dataD.success && Array.isArray(dataD.ports)) ? dataD.ports : []
        }

        if (portsD.length === 0) {
          setSearchChecking(false)
          setSearchUnavailable({
            type: 'destination',
            title: 'Destination Port Not Found in Database',
            description: `We couldn't find destination port "${trimmedDest}" in our global ports database.`,
            originText: resolvedOrigin.port_name || resolvedOrigin.port_code || trimmedOrigin,
            destinationText: trimmedDest,
            transhipmentText: '',
            modeName: selectedMode?.name || 'Ocean Freight',
            shipmentTypeName: shipmentTypeObj?.name || '',
            reason: 'destination_not_found'
          })
          return
        }
        resolvedDest = portsD[0]
      }

      setSelectedPortObjects({ origin: resolvedOrigin, destination: resolvedDest })

      // 4. Fetch matching freight rates from database with authoritative mode and shipment filters
      const originQueryParam = resolvedOrigin.id || resolvedOrigin.port_code || trimmedOrigin
      const destQueryParam = resolvedDest.id || resolvedDest.port_code || trimmedDest
      
      const rateQueryParams = new URLSearchParams({
        origin_id: originQueryParam,
        destination_id: destQueryParam,
        status: 'active'
      })
      if (targetModeId) rateQueryParams.set('mode_id', targetModeId)
      if (targetShipmentTypeId) rateQueryParams.set('shipment_type_id', targetShipmentTypeId)

      const resRates = await fetch(`${API_URL}/freight-rates?${rateQueryParams.toString()}`)
      const ratesData = await resRates.json()
      const activeRates = Array.isArray(ratesData) ? ratesData.filter(r => r.status === 'active') : []

      // Authoritative mode and FCL/LCL strict filtering
      const isTargetFCL = (targetShipmentTypeId && targetShipmentTypeId.toLowerCase().includes('fcl')) ||
        (shipmentTypeObj?.name && shipmentTypeObj.name.toUpperCase().includes('FCL'))
      const isTargetLCL = (targetShipmentTypeId && targetShipmentTypeId.toLowerCase().includes('lcl')) ||
        (shipmentTypeObj?.name && shipmentTypeObj.name.toUpperCase().includes('LCL'))

      const isAirMode = targetModeId === 'air' || targetModeId === 'mode-air' || (selectedMode?.name && selectedMode.name.toLowerCase().includes('air'))
      const isRoadMode = targetModeId === 'road' || targetModeId === 'ftype-190' || (selectedMode?.name && selectedMode.name.toLowerCase().includes('road'))
      const isOceanMode = !isAirMode && !isRoadMode

      const strictlyFilteredRates = activeRates.filter(r => {
        // Mode match
        const rIsAir = r.freight_mode_id === 'mode-air' || (r.mode_name && r.mode_name.toLowerCase().includes('air'))
        const rIsRoad = r.freight_mode_id === 'ftype-190' || (r.mode_name && r.mode_name.toLowerCase().includes('road'))
        const rIsOcean = !rIsAir && !rIsRoad

        if (isAirMode && !rIsAir) return false
        if (isRoadMode && !rIsRoad) return false
        if (isOceanMode && !rIsOcean) return false

        // Shipment Type match (FCL vs LCL)
        if (isTargetFCL) {
          const isFCL = (r.shipment_type_id && r.shipment_type_id.toLowerCase().includes('fcl')) ||
            (r.shipment_name && r.shipment_name.toUpperCase().includes('FCL'))
          if (!isFCL) return false
        } else if (isTargetLCL) {
          const isLCL = (r.shipment_type_id && r.shipment_type_id.toLowerCase().includes('lcl')) ||
            (r.shipment_name && r.shipment_name.toUpperCase().includes('LCL'))
          if (!isLCL) return false
        } else if (targetShipmentTypeId) {
          if (r.shipment_type_id && r.shipment_type_id !== targetShipmentTypeId) return false
        }

        return true
      })

      // Fetch active containers in parallel
      try {
        const resC = await fetch(`${API_URL}/containers?status=active`)
        const dataC = await resC.json()
        if (Array.isArray(dataC)) {
          setActiveContainers(dataC.filter(c => c.status === 'active'))
        }
      } catch (e) {
        console.error('Error fetching containers:', e)
      }

      // Group matching rates into distinct Available Routes
      const routeMap = new Map()
      strictlyFilteredRates.forEach(rate => {
        const transKey = rate.transhipment_code || rate.transhipment_id || 'direct'
        const carrierKey = (rate.carrier || '').trim().toLowerCase() || 'std'
        const transitKey = rate.transit_time || 0
        const modeKey = (rate.freight_mode_id || '').trim().toLowerCase()
        const shipKey = (rate.shipment_type_id || '').trim().toLowerCase()
        const key = `${rate.origin_code || rate.origin_id}__${rate.destination_code || rate.destination_id}__${transKey}__${carrierKey}__${transitKey}__${modeKey}__${shipKey}`

        if (!routeMap.has(key)) {
          routeMap.set(key, {
            routeKey: key,
            routeId: rate.id,
            origin: {
              id: rate.origin_id,
              code: rate.origin_code || resolvedOrigin.port_code,
              name: rate.origin_name || resolvedOrigin.port_name,
              country: rate.origin_country || resolvedOrigin.country,
            },
            destination: {
              id: rate.destination_id,
              code: rate.destination_code || resolvedDest.port_code,
              name: rate.destination_name || resolvedDest.port_name,
              country: rate.destination_country || resolvedDest.country,
            },
            isTranshipment: Boolean(rate.transhipment_code || rate.transhipment_id),
            transhipment: (rate.transhipment_code || rate.transhipment_id) ? {
              id: rate.transhipment_id,
              code: rate.transhipment_code,
              name: rate.transhipment_name || rate.transhipment_code,
              country: rate.transhipment_country,
            } : null,
            carrier: (rate.carrier && rate.carrier.trim()) ? rate.carrier.trim() : 'Standard Line',
            transitTime: rate.transit_time || 0,
            freightModeId: rate.freight_mode_id || targetModeId,
            modeName: rate.mode_name || selectedMode?.name || (isAirMode ? 'Air Freight' : isRoadMode ? 'Road Freight' : 'Ocean Freight'),
            shipmentTypeId: rate.shipment_type_id || targetShipmentTypeId,
            shipmentName: isTargetFCL ? 'FCL' : isTargetLCL ? 'LCL' : (rate.shipment_name || shipmentTypeObj?.name || 'FCL'),
            rates: []
          })
        }
        routeMap.get(key).rates.push(rate)
      })

      const routes = Array.from(routeMap.values())
      setSearchChecking(false)

      if (routes.length === 0) {
        setAvailableRoutes([])
        setSelectedRoute(null)
        setNoRoutesFound(true)
      } else {
        setAvailableRoutes(routes)
        setSelectedRoute(null)
        setNoRoutesFound(false)
      }
    } catch (err) {
      console.error('[Route Search] Query error:', err)
      setSearchChecking(false)
      setAvailableRoutes([])
      setSelectedRoute(null)
      setSearchError('Unable to connect to the freight rate server. Please check your connection and try again.')
    }
  }

  const handleSearchSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault()
    executeRouteSearch(selectedModeId, selectedShipmentTypeId)
  }

  const handleShipmentTypeChange = (newShipmentTypeId) => {
    setSelectedShipmentTypeId(newShipmentTypeId)
    setSelectedRoute(null)
    setSearchUnavailable(null)
    setSearchError(null)
    if (originText.trim() && destinationText.trim()) {
      executeRouteSearch(selectedModeId, newShipmentTypeId)
    }
  }

  const handleModeChange = (newModeId) => {
    if (newModeId === selectedModeId) return
    setSelectedModeId(newModeId)
    setSelectedRoute(null)
    setAvailableRoutes([])
    setNoRoutesFound(false)
    setSearchUnavailable(null)
    setSearchError(null)
    setSelectedPortObjects({ origin: null, destination: null })
  }

  const handleSelectRoute = async (route) => {
    setSelectedRoute(route)
    setContainersLoading(true)
    try {
      const res = await fetch(`${API_URL}/containers?status=active`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setActiveContainers(data.filter(c => c.status === 'active'))
      }
    } catch (err) {
      console.error('Failed to load active containers:', err)
    } finally {
      setContainersLoading(false)
    }

    setTimeout(() => {
      const el = document.querySelector('.container-pricing-section')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 60)
  }

  const resolveContainerPrice = (route, container) => {
    if (!route || !route.rates || !Array.isArray(route.rates)) return null
    return route.rates.find(r => {
      const idMatch = r.container_id && (r.container_id === container.id || r.container_id === container.name)
      const nameMatch = r.container_name && container.name && r.container_name.toLowerCase().trim() === container.name.toLowerCase().trim()
      const isRateActive = r.status === 'active'
      const hasPrice = Number(r.price) > 0
      return (idMatch || nameMatch) && isRateActive && hasPrice
    })
  }

  const handleBookRate = (route, container, rate) => {
    const selectedMode = modes.find(m => m.id === selectedModeId)

    const fromPort = route.origin?.code || rate.origin_code || route.origin?.id || originText.trim()
    const toPort = route.destination?.code || rate.destination_code || route.destination?.id || destinationText.trim()
    const containerType = container?.name || rate.container_name || ''
    const freightType = route.shipmentName 
      ? route.shipmentName.toLowerCase() 
      : (selectedMode?.name?.toLowerCase().includes('air') ? 'air' : 'fcl')
    const transVal = route.transhipment?.code || rate.transhipment_code || route.transhipment?.name || rate.transhipment_name || ''

    const params = new URLSearchParams({
      fromPort,
      toPort,
      containerType,
      freight_type: freightType,
      rate_id: rate.id,
      rateId: rate.id
    })
    if (transVal) {
      params.set('transhipment', transVal)
    }

    const statePayload = {
      route,
      container: {
        id: container?.id || rate.container_id || '',
        name: containerType,
        size: container?.size || ''
      },
      rate: {
        ...rate,
        origin_code: route.origin?.code || rate.origin_code,
        origin_name: route.origin?.name || rate.origin_name,
        destination_code: route.destination?.code || rate.destination_code,
        destination_name: route.destination?.name || rate.destination_name,
        transhipment_code: transVal,
        transhipment_name: route.transhipment?.name || rate.transhipment_name || transVal,
        container_name: containerType,
        container_id: container?.id || rate.container_id,
        carrier: route.carrier || rate.carrier || 'Standard Line',
        transit_time: route.transitTime || rate.transit_time || 0
      },
      fromPort,
      toPort,
      transhipment: transVal,
      containerType,
      freight_type: freightType,
      carrier: route.carrier || rate.carrier || 'Standard Line',
      pricing: {
        price: rate.price,
        currency: rate.currency || 'USD',
        local_thc: rate.local_thc,
        other_charges: rate.other_charges,
        transit_time: route.transitTime || rate.transit_time || 0
      }
    }

    navigate('/booking?' + params.toString(), { state: statePayload })
  }

  const handleOpenContainerEnquiry = (route, container) => {
    const oLabel = `${route.origin?.name || route.origin?.code} (${route.origin?.code})`
    const dLabel = `${route.destination?.name || route.destination?.code} (${route.destination?.code})`
    const tLabel = route.transhipment ? `${route.transhipment.name || route.transhipment.code} (${route.transhipment.code})` : ''

    setEnquiryContext({
      originText: oLabel,
      destinationText: dLabel,
      transhipmentText: tLabel,
      routeId: route.routeId || '',
      carrier: route.carrier || '',
      transitTime: route.transitTime || '',
      containerId: container.id,
      containerName: container.name,
      containerSize: container.size,
      modeName: route.modeName || 'Ocean Freight',
      shipmentTypeName: route.shipmentName || 'FCL',
      quantity: 1,
      reason: 'container_rate_unavailable'
    })
    setIsEnquiryModalOpen(true)
  }

  const handleOpenRouteEnquiry = () => {
    const selMode = modes.find(m => m.id === selectedModeId)
    const selShipment = shipmentTypes.find(t => t.id === selectedShipmentTypeId)
    const oLabel = selectedPortObjects.origin 
      ? `${selectedPortObjects.origin.port_name} (${selectedPortObjects.origin.port_code})` 
      : originText.trim()
    const dLabel = selectedPortObjects.destination 
      ? `${selectedPortObjects.destination.port_name} (${selectedPortObjects.destination.port_code})` 
      : destinationText.trim()

    setEnquiryContext({
      originText: oLabel,
      destinationText: dLabel,
      transhipmentText: '',
      routeId: '',
      modeName: selMode?.name || 'Ocean Freight',
      shipmentTypeName: selShipment?.name || '',
      reason: 'route_not_found'
    })
    setIsEnquiryModalOpen(true)
  }

  const searchStyle = {
    position: 'absolute', top: '100%', left: 0, right: 0, background: 'white',
    border: '1px solid #e0e0e0', borderTop: 'none', maxHeight: '300px', overflowY: 'auto',
    zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  }
  const searchItemStyle = { padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }
  const inputStyle = { width: '100%', padding: '14px 16px', border: '1px solid #e0e0e0', fontSize: '14px', background: 'white', boxSizing: 'border-box', fontFamily: 'inherit', color: '#666' }
  const btnStyle = { background: '#d64238', color: 'white', border: 'none', padding: '14px 32px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', transition: 'all 0.3s', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px' }

  return (
    <div id="page">
      {/* Responsive Slide Styles */}
      <style dangerouslySetInnerHTML={{__html: `        .hero-slider-wrap {
          position: relative;
          height: 780px;
          overflow: hidden;
        }
        .hero-content {
          position: absolute;
          right: 7%;
          left: auto;
          top: 54%;
          transform: translateY(-50%);
          z-index: 10;
        }
        .hero-content-box {
          width: 580px;
          min-height: 280px;
          padding: 35px 45px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: rgba(0,0,0,0.32);
          box-sizing: border-box;
          border-radius: 4px;
          transition: opacity 0.5s;
        }
        .hero-title {
          color: white;
          font-size: 52px;
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: -1px;
          text-transform: uppercase;
          margin-bottom: 15px;
        }
        .hero-sub-heading {
          color: white;
          font-size: 24px;
          line-height: 1.3;
          font-weight: 700;
          margin-bottom: 10px;
          margin-top: 0;
        }
        .hero-description {
          color: #eee;
          font-size: 18px;
          line-height: 1.5;
          max-width: 520px;
          margin-top: 0;
        }
        .hero-btn {
          width: max-content;
          font-size: 16px;
          font-weight: 700;
          padding: 16px 38px !important;
          margin-top: 30px;
          background: #d64238;
          color: white;
          border: none;
          text-transform: uppercase;
          border-radius: 4px;
          display: inline-block;
          text-decoration: none;
          transition: background 0.3s ease;
        }
        .hero-btn:hover {
          background: #b53229;
          color: white;
        }
        .hero-text-box .tp-caption {
          position: relative !important;
        }
        .hero-overlay {
          position: absolute;
          inset: 0;
          background: rgba(10, 18, 45, 0.15);
          z-index: 1;
          pointer-events: none;
        }
        .hero-bg img, .hero-image {
          filter: brightness(1.12) contrast(1.1) saturate(1.3);
        }
        @media (max-width: 1200px) {
          .hero-content {
            width: 560px;
            min-height: 300px;
          }
          .hero-title {
            font-size: 46px;
          }
        }
        @media (max-width: 768px) {
          .hero-content {
            width: 90%;
            min-height: auto;
            padding: 30px;
            left: 5%;
            right: 5%;
          }
          .hero-title {
            font-size: 34px;
          }
        }

        .services-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 30px;
          align-items: stretch;
        }
        .service-card {
          height: 100%;
          margin: 0;
        }
        @media (max-width: 991px) {
          .services-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 767px) {
          .services-row {
            grid-template-columns: 1fr;
          }
        }

        /* ── Exact CSS Layout Styles for Booking Widget ── */
        .booking-outer-sec {
          background: #02083b !important;
          padding: 40px 0;
          box-sizing: border-box;
        }
        .booking-card-container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 15px;
          box-sizing: border-box;
        }
        .booking-card {
          background: #fff;
          padding: 35px 40px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.18);
          box-sizing: border-box;
          overflow: visible !important;
        }
        .booking-mode-tabs {
          display: flex;
          gap: 20px;
          justify-content: center;
          margin-bottom: 15px;
          box-sizing: border-box;
        }
        .booking-mode-btn {
          height: 42px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.25s;
          letter-spacing: 0.2px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          border-radius: 0;
        }
        .booking-mode-btn.active {
          background: #fdecea !important;
          color: #e53935 !important;
          border: 2px solid #e53935 !important;
        }
        .booking-mode-btn.inactive {
          background: #fff !important;
          color: #888 !important;
          border: 1px solid #d8d8d8 !important;
        }
        .booking-mode-btn.mode-ocean {
          width: 190px;
        }
        .booking-mode-btn.mode-air {
          width: 160px;
        }

        .booking-shipment-tabs {
          display: flex;
          gap: 12px;
          margin-bottom: 15px;
          justify-content: flex-start;
          box-sizing: border-box;
        }
        .booking-shipment-btn {
          height: 38px;
          width: 72px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.25s;
          border-radius: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .booking-shipment-btn.active {
          background: #fdecea !important;
          color: #e53935 !important;
          border: 2px solid #e53935 !important;
        }
        .booking-shipment-btn.inactive {
          background: #fff !important;
          color: #555 !important;
          border: 1px solid #d8d8d8 !important;
        }

        .booking-form-row {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
          width: 100%;
          box-sizing: border-box;
        }
        .booking-input-field {
          height: 42px !important;
          font-size: 14px;
          font-family: inherit;
          box-sizing: border-box;
          border: 1px solid #e0e0e0;
          padding: 10px 14px;
          width: 100%;
          background: white;
          color: #333;
        }
        .booking-input-col {
          position: relative;
          box-sizing: border-box;
        }
        .booking-btn-submit {
          background: #d64238 !important;
          color: white !important;
          border: none !important;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s;
          white-space: nowrap;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100% !important;
          height: 42px !important;
          box-sizing: border-box;
          padding: 0 14px !important;
        }

        @media (min-width: 992px) {
          .booking-input-origin {
            flex: 1 1 0% !important;
            min-width: 200px;
          }
          .booking-input-destination {
            flex: 1 1 0% !important;
            min-width: 200px;
          }
          .booking-input-weight {
            flex: 0 0 180px !important;
            min-width: 160px;
          }
          .booking-input-button {
            flex: 0 0 160px !important;
            width: 160px !important;
            max-width: 160px !important;
            flex-shrink: 0 !important;
          }
          .booking-form-row {
            flex-wrap: nowrap !important;
            justify-content: space-between !important;
            gap: 12px !important;
          }
        }

        @media (max-width: 991px) and (min-width: 768px) {
          .booking-card-container {
            width: 92%;
          }
          .booking-input-origin,
          .booking-input-destination {
            flex: 1 1 calc(50% - 6px) !important;
            min-width: 200px;
          }
          .booking-input-weight {
            flex: 1 1 100% !important;
          }
          .booking-input-button {
            flex: 1 1 100% !important;
            min-width: 130px;
          }
        }

        @media (max-width: 767px) {
          .booking-card-container {
            width: 95%;
          }
          .booking-card {
            padding: 25px 16px;
          }
          .booking-mode-tabs {
            flex-direction: row;
            gap: 10px;
          }
          .booking-mode-btn.mode-ocean {
            width: 50%;
          }
          .booking-mode-btn.mode-air {
            width: 50%;
          }
          .booking-form-row {
            gap: 10px;
          }
          .booking-input-col {
            flex: 1 1 100% !important;
            min-width: 0 !important;
          }
          .booking-input-button {
            flex: 1 1 100% !important;
            width: 100% !important;
          }
        }

        /* ── Available Routes & Container Pricing Styles ── */
        .route-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 22px 26px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          cursor: pointer;
          user-select: none;
          text-align: left;
          outline: none;
        }
        .route-card:hover {
          border-color: #d64238;
          box-shadow: 0 8px 24px rgba(214, 66, 56, 0.14);
          transform: translateY(-2px);
          background: #fffdfd;
        }
        .route-card:focus-visible {
          border-color: #d64238;
          box-shadow: 0 0 0 3px rgba(214, 66, 56, 0.25), 0 8px 24px rgba(214, 66, 56, 0.14);
          outline: none;
        }
        .route-card:active {
          transform: translateY(0);
          box-shadow: 0 3px 10px rgba(214, 66, 56, 0.12);
        }
        .route-card.selected {
          border: 2px solid #d64238;
          box-shadow: 0 6px 20px rgba(214, 66, 56, 0.15);
          background: #fffafa;
        }
        .route-card-cta {
          color: #d64238;
          font-weight: 700;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: transform 0.2s ease, color 0.2s ease;
        }
        .route-card:hover .route-card-cta {
          transform: translateX(4px);
          color: #b53229;
        }
        .badge-direct {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
          padding: 4px 12px;
          border-radius: 14px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .badge-transhipment {
          background: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
          padding: 4px 12px;
          border-radius: 14px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.3px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .container-list-wrapper {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          width: 100% !important;
          gap: 16px !important;
        }
        .container-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 18px 24px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
          transition: all 0.25s ease;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
        .container-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
        }
        .container-card.has-price {
          border-left: 4px solid #10b981;
        }
        .container-card.no-price {
          border-left: 4px solid #f59e0b;
        }
        @media (max-width: 768px) {
          .container-card {
            flex-direction: column;
            align-items: stretch;
            padding: 16px;
          }
          .container-card-actions {
            width: 100%;
            justify-content: space-between !important;
            padding-top: 14px;
            border-top: 1px solid #f1f5f9;
          }
          .container-card-actions > div:first-child {
            text-align: left !important;
            align-items: flex-start !important;
          }
        }
      `}} />

      {/* Main Slider */}
      <section className="rev_slider_wrapper">
        <div className="hero-slider-wrap">
          
          <div className="hero-container" style={{ position: 'relative', height: '100%', width: '100%', maxWidth: 'none', padding: 0 }}>
            {slides.map((slide, i) => (
              <div 
                key={slide.id || i} 
                className="hero-slide-item"
                style={{ 
                  opacity: i === currentSlide ? 1 : 0, 
                  pointerEvents: i === currentSlide ? 'auto' : 'none',
                  transition: 'opacity 0.8s ease',
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '10%'
                }}
              >
                 {/* Background image for this slide */}
                 <img 
                   src={slide.image ? getImageUrl(slide.image) : slide3} 
                   alt="Slide Background" 
                   className="hero-image"
                   style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', position: 'absolute', top: 0, left: 0, zIndex: 0 }} 
                 />
                 <div className="hero-overlay" />
                
                <div className="hero-content hero-text-box hero-content-box" style={{ color: 'white' }}>
                  <div className="tp-caption hero-title tp-resizeme">{slide.title}</div>
                  <div className="tp-caption hero-sub-heading tp-resizeme">{slide.subtitle}</div>
                  {slide.description && <div className="tp-caption hero-description tp-resizeme">{slide.description}</div>}
                  
                  {/* CTA Button */}
                  {slide.button_text && 
                    !['view rates', 'learn more', 'get instant quote', 'get instant quoat'].includes(slide.button_text.toLowerCase().trim()) && (
                    <div style={{ marginTop: '25px' }}>
                      <a 
                        href={slide.button_url || '#'} 
                        className="hero-btn"
                      >
                        {slide.button_text}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Slide nav dots */}
          <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 20 }}>
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrentSlide(i)} style={{ width: '12px', height: '12px', borderRadius: '50%', border: 'none', background: i === currentSlide ? '#d64238' : 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 0 }} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Freight Booking Widget ─────────────────────────────────────────── */}
      <section className="booking-outer-sec">
        <div className="container booking-card-container">
          <div className="booking-card">

            {/* ── Row 1: Freight Mode Tabs (centred) ── */}
            <div className="booking-mode-tabs">
              {(modes.length > 0 ? modes : DEFAULT_MODES).map(mode => {
                const active = selectedModeId === mode.id
                return (
                  <button
                    key={mode.id}
                    onClick={() => handleModeChange(mode.id)}
                    className={`booking-mode-btn ${active ? 'active' : 'inactive'} ${mode.id === 'air' || mode.id === 'mode-air' ? 'mode-air' : 'mode-ocean'}`}
                  >
                    {mode.name}
                  </button>
                )
              })}
            </div>

            {/* ── Row 2: Shipment Sub-tabs (FCL / LCL) — always visible ── */}
            <div className="booking-shipment-tabs">
              {(shipmentTypes.length > 0 ? shipmentTypes : DEFAULT_SHIPMENT_TYPES).map(type => {
                const active = selectedShipmentTypeId === type.id
                const shortCode = type.code || type.shortName || type.short_name || (type.name ? (type.name.toUpperCase().includes('FCL') ? 'FCL' : type.name.toUpperCase().includes('LCL') ? 'LCL' : type.name.match(/^[A-Za-z0-9]+/)?.[0].toUpperCase()) : '') || type.name
                return (
                  <button
                    key={type.id}
                    onClick={() => handleShipmentTypeChange(type.id)}
                    className={`booking-shipment-btn ${active ? 'active' : 'inactive'}`}
                  >
                    {shortCode}
                  </button>
                )
              })}
            </div>

            {/* ── Row 3: Form — Origin | Destination | Container | Button ── */}
            <form onSubmit={handleSearchSubmit} className="booking-form-row">
              {/* Origin port input */}
              <div className="booking-input-col booking-input-origin">
                <input
                  type="text"
                  value={originText}
                  onChange={e => handleLocationInput(e.target.value, 'origin')}
                  onBlur={() => setTimeout(() => setShowDropdown(p => ({ ...p, origin: false })), 200)}
                  placeholder="Search Origin Port..."
                  autoComplete="off"
                  className="booking-input-field"
                />
                {showDropdown.origin && (
                  <div style={searchStyle}>
                    {locationResults.origin?.length > 0 ? (
                      locationResults.origin.map((l, i) => (
                        <div
                          key={i}
                          style={searchItemStyle}
                          onMouseDown={() => selectLocation(l, 'origin')}
                        >
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>
                            {l.port_code} ({l.port_name})
                          </div>
                          <div style={{ fontSize: '11px', color: '#888' }}>{l.country}</div>
                        </div>
                      ))
                    ) : noMatchFound.origin ? (
                      <div style={{ padding: '16px', background: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
                          <span>⚠️</span> Port Not Found in Database
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                          We couldn't find "{originText}" in our 6,000+ ports directory.
                        </div>
                        <button
                          type="button"
                          onMouseDown={() => handleOpenDropdownEnquiry('origin')}
                          style={{
                            background: '#d64238',
                            color: 'white',
                            border: 'none',
                            padding: '7px 14px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Send Enquiry for this Port →
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Destination port input */}
              <div className="booking-input-col booking-input-destination">
                <input
                  type="text"
                  value={destinationText}
                  onChange={e => handleLocationInput(e.target.value, 'destination')}
                  onBlur={() => setTimeout(() => setShowDropdown(p => ({ ...p, destination: false })), 200)}
                  placeholder="Search Destination Port..."
                  autoComplete="off"
                  className="booking-input-field"
                />
                {showDropdown.destination && (
                  <div style={searchStyle}>
                    {locationResults.destination?.length > 0 ? (
                      locationResults.destination.map((l, i) => (
                        <div
                          key={i}
                          style={searchItemStyle}
                          onMouseDown={() => selectLocation(l, 'destination')}
                        >
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>
                            {l.port_code} ({l.port_name})
                          </div>
                          <div style={{ fontSize: '11px', color: '#888' }}>{l.country}</div>
                        </div>
                      ))
                    ) : noMatchFound.destination ? (
                      <div style={{ padding: '16px', background: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
                          <span>⚠️</span> Port Not Found in Database
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                          We couldn't find "{destinationText}" in our 6,000+ ports directory.
                        </div>
                        <button
                          type="button"
                          onMouseDown={() => handleOpenDropdownEnquiry('destination')}
                          style={{
                            background: '#d64238',
                            color: 'white',
                            border: 'none',
                            padding: '7px 14px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Send Enquiry for this Port →
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Air Freight Weight input (when Air mode is selected) */}
              {(() => {
                const selMode = (modes.length > 0 ? modes : DEFAULT_MODES).find(m => m.id === selectedModeId)
                const isAir   = selMode?.name?.toLowerCase().includes('air')
                if (!isAir) return null
                return (
                  <div className="booking-input-col booking-input-weight" style={{ display: 'flex', gap: '0' }}>
                    <input
                      type="number"
                      value={weight}
                      onChange={e => setWeight(e.target.value)}
                      placeholder="Weight"
                      className="booking-input-field"
                      style={{ borderRight: 'none', flex: 2, height: '42px' }}
                      min="0" step="0.1"
                    />
                    <select
                      value={weightUnit}
                      onChange={e => setWeightUnit(e.target.value)}
                      style={{ width: '68px', padding: '0 6px', border: '1px solid #ddd', fontSize: '13px', background: '#fafafa', height: '42px' }}
                    >
                      <option value="KG">KG</option>
                      <option value="LBS">LBS</option>
                    </select>
                  </div>
                )
              })()}


              {/* Check Rates button */}
              <div className="booking-input-button">
                <button type="submit" className="booking-btn-submit" disabled={searchChecking}>
                  {searchChecking ? 'Checking...' : 'Check Rates'}
                </button>
              </div>
            </form>

            {/* Validation Message */}
            {searchValidationMsg && (
              <div style={{
                marginTop: '15px',
                padding: '10px 16px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '4px',
                color: '#92400e',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>ℹ️</span> {searchValidationMsg}
              </div>
            )}

            {/* Server / Network Error Message */}
            {searchError && (
              <div style={{
                marginTop: '15px',
                padding: '12px 16px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '4px',
                color: '#991b1b',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>⚠️</span> {searchError}
              </div>
            )}

            {/* Loading Indicator */}
            {searchChecking && (
              <div style={{
                marginTop: '20px',
                padding: '16px',
                textAlign: 'center',
                color: '#475569',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid #d64238',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                Checking global ports &amp; live freight rates...
              </div>
            )}

            {/* Success Toast Notification */}
            {enquiryToast && (
              <div style={{
                marginTop: '16px',
                padding: '14px 20px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderLeft: '4px solid #10b981',
                borderRadius: '4px',
                color: '#065f46',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px', color: '#10b981', fontWeight: 'bold' }}>✓</span>
                  <span>{enquiryToast}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEnquiryToast(null)}
                  style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontSize: '16px' }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* 1. Available Routes Section (Shown when routes match and no single route is actively drilled into) */}
            {availableRoutes.length > 0 && !selectedRoute && (
              <div className="available-routes-section" style={{
                marginTop: '28px',
                padding: '24px 28px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                  gap: '12px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      {renderTransportIcon(selectedModeId, { fontSize: '20px' })}
                      <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 700, color: '#1e293b' }}>
                        Available Routes
                      </h3>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                      Select a verified route below to view live container availability and carrier contract pricing.
                    </p>
                  </div>

                  <span style={{
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #bfdbfe',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 700
                  }}>
                    {availableRoutes.length} route{availableRoutes.length > 1 ? 's' : ''} available
                  </span>
                </div>

                {/* List of Available Routes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {availableRoutes.map((route, idx) => {
                    const originLabel = route.origin.name || route.origin.code
                    const destLabel = route.destination.name || route.destination.code
                    const cardLabel = `Select route ${route.routeId} from ${originLabel} to ${destLabel}`

                    return (
                      <div
                        key={route.routeKey || route.routeId || idx}
                        className="route-card"
                        role="button"
                        tabIndex={0}
                        aria-label={cardLabel}
                        onClick={() => handleSelectRoute(route)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleSelectRoute(route)
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{
                              background: '#fee2e2',
                              color: '#d64238',
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '3px 9px',
                              borderRadius: '4px',
                              letterSpacing: '0.4px'
                            }}>
                              Carrier: {route.carrier || 'Standard Line'}
                            </span>
                            <span style={{
                              background: '#f1f5f9',
                              color: '#475569',
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}>
                              {renderTransportIcon(route.freightModeId || route.modeName, { fontSize: '11px' })}
                              <span>{route.modeName || 'Ocean Freight'}</span>
                            </span>
                            <span style={{
                              background: route.shipmentName === 'FCL' ? '#eff6ff' : '#fef3c7',
                              color: route.shipmentName === 'FCL' ? '#1d4ed8' : '#92400e',
                              border: route.shipmentName === 'FCL' ? '1px solid #bfdbfe' : '1px solid #fde68a',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '4px'
                            }}>
                              {route.shipmentName || 'FCL'}
                            </span>
                          </div>

                          <div>
                            {route.isTranshipment ? (
                              <span className="badge-transhipment">
                                <span>⇄</span>
                                <span>Transhipment: {route.transhipment?.name || route.transhipment?.code} ({route.transhipment?.code})</span>
                              </span>
                            ) : (
                              <span className="badge-direct">
                                <span>✓</span>
                                <span>Direct Route</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Route Path Display */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '16px',
                          marginBottom: '16px',
                          background: '#f8fafc',
                          padding: '16px 20px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0'
                        }}>
                          {/* Origin Port */}
                          <div style={{ flex: '1 1 200px' }}>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
                              Origin Port
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                              {route.origin.name || route.origin.code}
                            </div>
                            <div style={{ fontSize: '12px', color: '#d64238', fontWeight: 700 }}>
                              {route.origin.code} {route.origin.country ? `• ${route.origin.country}` : ''}
                            </div>
                          </div>

                          {/* Transit / Path Arrow */}
                          <div style={{ textAlign: 'center', padding: '0 12px', flex: '0 0 auto' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>
                              ⏱️ {route.transitTime} Days
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                              <span style={{ height: '2px', width: '32px', background: '#cbd5e1', display: 'inline-block' }}></span>
                              {renderTransportIcon(route.freightModeId || route.modeName, { fontSize: '15px' })}
                              <span style={{ height: '2px', width: '32px', background: '#cbd5e1', display: 'inline-block' }}></span>
                            </div>
                            {route.isTranshipment && (
                              <div style={{ fontSize: '11px', color: '#1e40af', marginTop: '2px', fontWeight: 600 }}>
                                Via {route.transhipment?.code}
                              </div>
                            )}
                          </div>

                          {/* Destination Port */}
                          <div style={{ flex: '1 1 200px', textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
                              Destination Port
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                              {route.destination.name || route.destination.code}
                            </div>
                            <div style={{ fontSize: '12px', color: '#d64238', fontWeight: 700 }}>
                              {route.destination.code} {route.destination.country ? `• ${route.destination.country}` : ''}
                            </div>
                          </div>
                        </div>

                        {/* Bottom action row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            Route ID: <code style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', color: '#1e293b', fontWeight: 600 }}>{route.routeId}</code>
                          </span>

                          <span className="route-card-cta">
                            <span>View Container Pricing</span>
                            <span style={{ fontSize: '15px' }}>→</span>
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 2. Route Selected → All Active Containers & Pricing View */}
            {selectedRoute && (
              <div className="container-pricing-section" style={{
                marginTop: '28px',
                padding: '24px 28px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)'
              }}>
                {/* Header bar: Back button + Route details pill */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                  gap: '12px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <button
                    type="button"
                    onClick={() => setSelectedRoute(null)}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      color: '#334155',
                      padding: '8px 18px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.background = '#f1f5f9'
                      e.currentTarget.style.borderColor = '#94a3b8'
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = '#f8fafc'
                      e.currentTarget.style.borderColor = '#cbd5e1'
                    }}
                  >
                    <span style={{ fontSize: '15px' }}>←</span>
                    <span>Back to Available Routes</span>
                  </button>

                  {/* Route summary pill */}
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}>
                    <strong style={{ color: '#0f172a' }}>{selectedRoute.origin.name || selectedRoute.origin.code} ({selectedRoute.origin.code})</strong>
                    {selectedRoute.isTranshipment ? (
                      <span style={{ color: '#d64238' }}>→ Via {selectedRoute.transhipment?.name || selectedRoute.transhipment?.code} ({selectedRoute.transhipment?.code}) →</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>→</span>
                    )}
                    <strong style={{ color: '#0f172a' }}>{selectedRoute.destination.name || selectedRoute.destination.code} ({selectedRoute.destination.code})</strong>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    <span>Route ID: <strong style={{ color: '#d64238' }}>{selectedRoute.routeId}</strong></span>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    <span>Carrier: <strong>{selectedRoute.carrier}</strong></span>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Mode: <strong>{renderTransportIcon(selectedRoute.freightModeId || selectedRoute.modeName, { fontSize: '13px', marginRight: '3px' })}{selectedRoute.modeName}</strong>
                    </span>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    <span>Type: <strong style={{ color: selectedRoute.shipmentName === 'FCL' ? '#1d4ed8' : '#d64238' }}>{selectedRoute.shipmentName || 'FCL'}</strong></span>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    <span>Transit: <strong>{selectedRoute.transitTime} Days</strong></span>
                  </div>
                </div>

                {/* Section Title */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '18px',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '20px' }}>📦</span>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                        Active Containers &amp; Route Pricing
                      </h3>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                      Displaying all active containers. Valid database contract prices are shown; containers without published rates can be requested via enquiry.
                    </p>
                  </div>

                  <span style={{
                    background: '#ecfdf5',
                    color: '#065f46',
                    border: '1px solid #a7f3d0',
                    padding: '5px 12px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: 700
                  }}>
                    {activeContainers.length} Active Container{activeContainers.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Containers Loading indicator */}
                {containersLoading && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '14px' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '20px',
                      height: '20px',
                      border: '2px solid #cbd5e1',
                      borderTopColor: '#d64238',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                      marginRight: '8px',
                      verticalAlign: 'middle'
                    }} />
                    Loading active container pricing...
                  </div>
                )}

                {/* Containers Grid */}
                {!containersLoading && (
                  <div
                    className="container-list-wrapper"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr)',
                      width: '100%',
                      gap: '16px'
                    }}
                  >
                    {activeContainers.map(container => {
                      const rateObj = resolveContainerPrice(selectedRoute, container)
                      const hasPrice = Boolean(rateObj && Number(rateObj.price) > 0)

                      return (
                        <div
                          key={container.id}
                          className={`container-card ${hasPrice ? 'has-price' : 'no-price'}`}
                          style={{
                            width: '100%',
                            minWidth: 0,
                            boxSizing: 'border-box'
                          }}
                        >
                          {/* Left Column: Container Information */}
                          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                                {container.name} {container.size && !container.name.includes(container.size) ? `(${container.size})` : ''}
                              </h4>
                            </div>

                            {container.description && (
                              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', lineHeight: 1.4 }}>
                                {container.description}
                              </div>
                            )}

                            <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                              <span>Container ID: <code style={{ color: '#334155', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{container.id}</code></span>
                              {container.size && <span>Size: <strong style={{ color: '#1e293b' }}>{container.size}</strong></span>}
                            </div>
                          </div>

                          {/* Right Column: Price, Status & Action */}
                          <div
                            className="container-card-actions"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '20px',
                              flexWrap: 'wrap',
                              flexShrink: 0
                            }}
                          >
                            <div style={{
                              textAlign: 'right',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-end',
                              gap: '3px'
                            }}>
                              {hasPrice ? (
                                <>
                                  <span style={{
                                    background: '#ecfdf5',
                                    color: '#065f46',
                                    border: '1px solid #a7f3d0',
                                    padding: '3px 8px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap'
                                  }}>
                                    ✓ Rate Available
                                  </span>
                                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#d64238', lineHeight: 1.1, marginTop: '2px' }}>
                                    ${rateObj.price}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                                    {rateObj.currency || 'USD'} Freight Rate
                                  </div>
                                  {(Number(rateObj.local_thc) > 0 || Number(rateObj.other_charges) > 0) && (
                                    <div style={{
                                      fontSize: '11px',
                                      color: '#64748b',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'flex-end',
                                      gap: '1px'
                                    }}>
                                      {Number(rateObj.local_thc) > 0 && <span>Local THC: <strong>${Number(rateObj.local_thc).toFixed(2)}</strong></span>}
                                      {Number(rateObj.other_charges) > 0 && <span>Other: <strong>${Number(rateObj.other_charges).toFixed(2)}</strong></span>}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  <span style={{
                                    background: '#fffbeb',
                                    color: '#b45309',
                                    border: '1px solid #fde68a',
                                    padding: '3px 8px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap'
                                  }}>
                                    Rate Upon Request
                                  </span>
                                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#b45309', marginTop: '2px' }}>
                                    Price not published
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                    Custom quote upon request
                                  </div>
                                </>
                              )}
                            </div>

                            <div>
                              {hasPrice ? (
                                <button
                                  type="button"
                                  onClick={() => handleBookRate(selectedRoute, container, rateObj)}
                                  style={{
                                    background: '#d64238',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 22px',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 6px rgba(214, 66, 56, 0.25)',
                                    transition: 'all 0.2s ease',
                                    whiteSpace: 'nowrap'
                                  }}
                                  onMouseOver={e => e.currentTarget.style.background = '#b53229'}
                                  onMouseOut={e => e.currentTarget.style.background = '#d64238'}
                                >
                                  <span>Booking</span>
                                  <span>→</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenContainerEnquiry(selectedRoute, container)}
                                  style={{
                                    background: '#f8fafc',
                                    color: '#b45309',
                                    border: '1px solid #f59e0b',
                                    padding: '9px 18px',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s ease',
                                    whiteSpace: 'nowrap'
                                  }}
                                  onMouseOver={e => {
                                    e.currentTarget.style.background = '#fef3c7'
                                  }}
                                  onMouseOut={e => {
                                    e.currentTarget.style.background = '#f8fafc'
                                  }}
                                >
                                  <span>Send Enquiry</span>
                                  <span>→</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3. No Routes Found Card */}
            {noRoutesFound && availableRoutes.length === 0 && !searchUnavailable && (
              <div className="no-routes-found-card" style={{
                marginTop: '24px',
                padding: '24px 28px',
                backgroundColor: '#fff8f7',
                border: '1px solid #fed7d7',
                borderLeft: '4px solid #d64238',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '20px',
                boxShadow: '0 2px 8px rgba(214, 66, 56, 0.08)'
              }}>
                <div style={{ flex: '1 1 450px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: '#fee2e2',
                      color: '#d64238',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}>
                      !
                    </span>
                    <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1f2937' }}>
                      No routes available for this selection
                    </h4>
                  </div>
                  <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#4b5563', lineHeight: '1.5' }}>
                    There are currently no published scheduled routes connecting <strong>{selectedPortObjects.origin?.port_name || originText}</strong> to <strong>{selectedPortObjects.destination?.port_name || destinationText}</strong>.
                  </p>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    Submit an enquiry and our specialized freight chartering team will source direct carrier alternatives and custom quotes for you.
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleOpenRouteEnquiry}
                    style={{
                      background: '#d64238',
                      color: 'white',
                      border: 'none',
                      padding: '12px 28px',
                      fontWeight: 700,
                      fontSize: '14px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 4px rgba(214, 66, 56, 0.25)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>Send Route Enquiry</span>
                    <span style={{ fontSize: '15px' }}>→</span>
                  </button>
                </div>
              </div>
            )}

            {/* 4. Port Not Found in Database Card */}
            {searchUnavailable && (
              <div className="port-unavailable-card" style={{
                marginTop: '24px',
                padding: '24px 28px',
                backgroundColor: '#fff8f7',
                border: '1px solid #fed7d7',
                borderLeft: '4px solid #d64238',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '20px',
                boxShadow: '0 2px 8px rgba(214, 66, 56, 0.08)'
              }}>
                <div style={{ flex: '1 1 450px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: '#fee2e2',
                      color: '#d64238',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}>
                      !
                    </span>
                    <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1f2937' }}>
                      {searchUnavailable.title}
                    </h4>
                  </div>
                  <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#4b5563', lineHeight: '1.5' }}>
                    {searchUnavailable.description}
                  </p>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    Need help with this port or location? Submit an enquiry and our freight operations team will assist you with custom routing and pricing.
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setEnquiryContext(searchUnavailable)
                      setIsEnquiryModalOpen(true)
                    }}
                    style={{
                      background: '#d64238',
                      color: 'white',
                      border: 'none',
                      padding: '12px 28px',
                      fontWeight: 700,
                      fontSize: '14px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 4px rgba(214, 66, 56, 0.25)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>Send Enquiry</span>
                    <span style={{ fontSize: '15px' }}>→</span>
                  </button>
                </div>
              </div>
            )}

          </div>{/* /white card */}
        </div>{/* /container */}
      </section>

      {/* Welcome Section */}
      <div className="welcomesec secpadd">
        <div className="container">
          <div className="fh-section-title clearfix text-center version-dark paddbtm20">
            <h2>WELCOME TO EASYFR<span style={{ color: '#d64238' }}>8</span></h2>
          </div>
          <p className="haeadingpara text-center paddbtm40">
            Easyfr8 is more than just Rates. It uses AI, ML and other tools to bring best and desired results for you, be it rates, alternatives, comparisons, reports, trends, news, trade leads and so forth.
          </p>

          {/* Services Grid Container */}
          {(() => {
            const serviceMapping = {
              'ocean freight forwarding': { title: 'Sea Freight', icon: 'anchor', order: 2 },
              'air freight forwarding': { title: 'Air Freight', icon: 'plane', order: 1 },
              'road freight forwarding': { title: 'Road Transport', icon: 'truck', order: 3 },
              'warehousing': { title: 'Warehousing', icon: 'package', order: 4 },
              'custom clearance': { title: 'Custom Clearance', icon: 'shield', order: 5 },
              'cfs': { title: 'CFS', icon: 'box', order: 6 },
              'contract handling': { title: 'Contract Handling', icon: 'briefcase', order: 7 },
              'cargo insurance': { title: 'Cargo Insurance', icon: 'umbrella', order: 8 }
            };
            const processedServices = (cms.services || [])
              .filter(s => {
                if (!s.active) return false;
                if (s.show_on_homepage !== undefined) {
                  return s.show_on_homepage;
                }
                const key = (s.title || '').toLowerCase().trim();
                return !!serviceMapping[key];
              })
              .map(s => {
                const key = (s.title || '').toLowerCase().trim();
                const mapping = serviceMapping[key] || { title: s.title, icon: s.icon, order: s.sortOrder || 99 };
                const iconClass = getServiceIconClass(s.icon || mapping.icon);
                return {
                  ...s,
                  title: mapping.title || s.title,
                  iconClass,
                  order: s.sortOrder !== undefined ? s.sortOrder : mapping.order
                };
              })
              .sort((a, b) => (a.order || 0) - (b.order || 0));

            return (
              <div className="services-grid-container">
                {processedServices.map(service => {
                  const path = service.slug ? `/services/${service.slug}` : `/services/${service.id}`;
                  return (
                    <Link key={service.id} to={path} className="service-card-item">
                      <span className="fh-icon"><i className={service.iconClass}></i></span>
                      <h4 className="box-title"><span>{service.title}</span></h4>
                    </Link>
                  );
                })}
              </div>
            );
          })()}

          <div className="extra-menu-item menu-item-button-link" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', marginTop: '30px' }}>
            <Link to="/services" className="fh-btn btn">Know More</Link>
          </div>
        </div>
      </div>

      {/* Industries Served */}
      <section id="indser" className="special_services bluebg secpadd">
        <div className="container">
          <div className="row paddbtm40">
            <div className="col-md-4 col-sm-12">
              <div className="fh-section-title clearfix text-left version-light">
                <h2 style={{ borderLeft: '2px solid #d64238', paddingLeft: '20px', width: '400px' }}>Industries Served</h2>
              </div>
            </div>
          </div>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap' }}>
            {(industries || []).filter(i => i.status === 'active').sort((a, b) => a.sort_order - b.sort_order).map((item) => (
              <div key={item.id} className="col-md-4 col-sm-6">
                <div className="fh-service-box icon-type-theme_icon style-1">
                  <span className="fh-icon"><i className={item.icon}></i></span>
                  <h4 className="service-title"><a href="#" className="link">{item.title}</a></h4>
                  <div className="desc"><p>{item.desc}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="homecounts">
        <div className="container">
          <h2 className="count-title">Easyfr<span style={{ color: '#d64238' }}>8</span> {cms.homepage.countersTitle || 'Connecting Global Markets Seamlessly'}</h2>
          <h4 style={{ color: 'white', display: 'flex', justifyContent: 'center', fontSize: '14px' }}>{cms.homepage.countersSubtitle || 'Delivering better outcomes through innovative and Technology driven logistics solutions'}</h4>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="whychoos-3 secpadd">
        <div className="container">
          <div className="fh-section-title clearfix text-center version-dark paddbtm30">
            <h2>Why Choose Us</h2>
          </div>
          <div className="row">
            {(cms.homepage.featuredServices || []).map((item, i) => {
              const defaultIcons = [
                'flaticon-international-delivery',
                'flaticon-people',
                'flaticon-route',
                'flaticon-open-cardboard-box',
                'flaticon-alarm-clock'
              ]
              const icon = defaultIcons[i % defaultIcons.length]
              return (
                <div key={item.id || i} className={`col-md-4 col-sm-6${i === 3 ? ' col-md-offset-2' : ''}`}>
                  <div className="fh-icon-box style-2 version-dark icon-center">
                    <span className="fh-icon"><i className={icon}></i></span>
                    <h4 className="box-title"><span>{item.title}</span></h4>
                    <div className="desc"><p>{item.desc}</p></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Partners — dynamic from CMS */}
      <section className="partener-1 bluebg">
        <div className="container">
          <div className="fh-partner clearfix">
            {!loading && validPartners.length > 0 && (
              <div key={validPartners.map(p => p.id).join('-')} className="list-item slide-partener owl-carousel">
                {validPartners.map((partner) => (
                  <div key={partner.id} className="partner-item">
                    <div className="partner-content">
                      <a href={partner.websiteUrl || '#'} target="_blank" rel="noopener noreferrer">
                        <img
                          alt={partner.name || 'Partner'}
                          src={getImageUrl(partner.logo)}
                          style={{ maxHeight: '60px', objectFit: 'contain' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Blogs */}
      <section className="testmonial-1 secpadd">
        <div className="container">
          <div className="fh-section-title clearfix text-left version-dark paddbtm40">
            <h2>BLOGS</h2>
          </div>
          <div className="fh-latest-post carousel">
            {!loading && (
              <div key={blogs.map(b => b.id).join('-')} className="post-list news-slide owl-carousel">
                {blogs.length === 0 ? (
                  <div style={{ textAlign: 'center', width: '100%', padding: '20px', color: '#999' }}>
                    No published articles found.
                  </div>
                ) : (
                  blogs.map((blog) => {
                    const blogDate = new Date(blog.date || blog.publishedAt || Date.now());
                    const dayStr = String(blogDate.getDate()).padStart(2, '0');
                    const monthStr = blogDate.toLocaleString('default', { month: 'short' });
                    return (
                      <div key={blog.id} className="item-latest-post clearfix">
                        <div className="entry-thumbnail">
                          <Link to={`/blogs/${encodeURIComponent(blog.slug || blog.id)}`}><img src={getImageUrl(blog.image)} alt={blog.title} style={{ width: '100%', height: '240px', objectFit: 'cover' }} /></Link>
                          <div className="entry-time">
                            <span className="day">{dayStr}</span>
                            <span className="month">{monthStr}</span>
                          </div>
                        </div>
                        <div className="entry-summary">
                          <div className="entry-meta clearfix">
                            <span className="meta author">by <span>{blog.author || 'easyfr8'}</span></span>
                            <span className="meta cat-links"><Link to={`/blogs/${encodeURIComponent(blog.slug || blog.id)}`}>{blog.category}</Link></span>
                          </div>
                          <h2 className="entry-title"><Link to={`/blogs/${encodeURIComponent(blog.slug || blog.id)}`}>{blog.title}</Link></h2>
                          <div className="entry-footer"><Link to={`/blogs/${encodeURIComponent(blog.slug || blog.id)}`}>Read More...</Link></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Route Enquiry Modal (Port/Rate Not Available workflow) */}
      <RouteEnquiryModal
        isOpen={isEnquiryModalOpen}
        onClose={() => setIsEnquiryModalOpen(false)}
        searchContext={enquiryContext}
        onSuccess={() => {
          setEnquiryToast('Your enquiry has been sent successfully. Our team will get back to you shortly.')
          setIsEnquiryModalOpen(false)
          setSearchUnavailable(null)
        }}
      />
    </div>
  )
}
