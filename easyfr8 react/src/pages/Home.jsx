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
  const [isTranshipmentEnabled, setIsTranshipmentEnabled] = useState(false)
  const [transhipmentText, setTranshipmentText] = useState('')
  const [transhipmentId, setTranshipmentId] = useState('')
  const [weight, setWeight] = useState('')
  const [weightUnit, setWeightUnit] = useState('KG')

  // Container Selection and Rate Proceed states
  const [availableContainers, setAvailableContainers] = useState([])
  const [selectedContainer, setSelectedContainer] = useState(null)
  const [showContainersSection, setShowContainersSection] = useState(false)
  const [showRateResult, setShowRateResult] = useState(false)
  const [rateChecking, setRateChecking] = useState(false)

  // Dropdown suggestions state
  const [locationResults, setLocationResults] = useState({ origin: [], destination: [], transhipment: [] })
  const [showDropdown, setShowDropdown] = useState({ origin: false, destination: false, transhipment: false })
  const [noMatchFound, setNoMatchFound] = useState({ origin: false, destination: false, transhipment: false })
  const [selectedPortObjects, setSelectedPortObjects] = useState({ origin: null, destination: null, transhipment: null })

  // Search availability & enquiry workflow states
  const [searchChecking, setSearchChecking] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [searchValidationMsg, setSearchValidationMsg] = useState(null)
  const [searchUnavailable, setSearchUnavailable] = useState(null)
  const [availableRates, setAvailableRates] = useState([])
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
            setSelectedModeId(active[0].id)
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
            setSelectedShipmentTypeId(active[0].id)
          }
        }
        // else keep DEFAULT_SHIPMENT_TYPES
      })
      .catch(() => {
        // Keep defaults on error
      })
    
    // Clear port inputs, transhipment, and previous search results when changing mode
    setOriginText('')
    setOriginId('')
    setDestinationText('')
    setDestinationId('')
    setTranshipmentText('')
    setTranshipmentId('')
    setIsTranshipmentEnabled(false)
    setSelectedPortObjects({ origin: null, destination: null, transhipment: null })
    setLocationResults({ origin: [], destination: [], transhipment: [] })
    setShowDropdown({ origin: false, destination: false, transhipment: false })
    setNoMatchFound({ origin: false, destination: false, transhipment: false })
    setAvailableContainers([])
    setSelectedContainer(null)
    setShowContainersSection(false)
    setShowRateResult(false)
    setAvailableRates([])
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
      // 1. Search ports strictly with freight_type filter for the active mode
      const res = await fetch(`${API_URL}/ports?search=${encodeURIComponent(term)}&freight_type=${encodeURIComponent(modeType)}&status=active`)
      const data = await res.json()
      const portsList = (data.success && Array.isArray(data.ports)) ? data.ports : []

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
    } else if (field === 'transhipment') {
      setTranshipmentText(val)
      setTranshipmentId('')
      setSelectedPortObjects(prev => ({ ...prev, transhipment: null }))
    }
    setAvailableRates([])
    setAvailableContainers([])
    setSelectedContainer(null)
    setShowContainersSection(false)
    setShowRateResult(false)
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
    } else if (field === 'transhipment') {
      setTranshipmentText(text)
      setTranshipmentId(item.id)
      setSelectedPortObjects(prev => ({ ...prev, transhipment: item }))
    }
    setShowDropdown(prev => ({ ...prev, [field]: false }))
    setNoMatchFound(prev => ({ ...prev, [field]: false }))
    setAvailableRates([])
    setAvailableContainers([])
    setSelectedContainer(null)
    setShowContainersSection(false)
    setShowRateResult(false)
    setSearchUnavailable(null)
    setSearchValidationMsg(null)
  }

  const handleTranshipmentToggle = (checked) => {
    setIsTranshipmentEnabled(checked)
    if (!checked) {
      setTranshipmentText('')
      setTranshipmentId('')
      setSelectedPortObjects(prev => ({ ...prev, transhipment: null }))
      setShowDropdown(prev => ({ ...prev, transhipment: false }))
      setNoMatchFound(prev => ({ ...prev, transhipment: false }))
    }
    setShowContainersSection(false)
    setShowRateResult(false)
    setSelectedContainer(null)
    setAvailableRates([])
    setSearchUnavailable(null)
    setSearchValidationMsg(null)
  }

  const handleOpenDropdownEnquiry = (field) => {
    setShowDropdown(prev => ({ ...prev, [field]: false }))
    const currentMode = modes.find(m => m.id === selectedModeId)
    const currentShipment = shipmentTypes.find(t => t.id === selectedShipmentTypeId)
    const containerObj = selectedContainer || containersList.find(c => c.id === selectedContainerId)
    
    setEnquiryContext({
      originText: originText.trim(),
      destinationText: destinationText.trim(),
      transhipmentText: isTranshipmentEnabled ? transhipmentText.trim() : '',
      modeName: currentMode?.name || 'Ocean Freight',
      shipmentTypeName: currentShipment?.name || '',
      containerName: containerObj?.name || '',
      weight,
      weightUnit,
      reason: field === 'origin' ? 'origin_not_found' : field === 'destination' ? 'destination_not_found' : 'transhipment_not_found'
    })
    setIsEnquiryModalOpen(true)
  }

  const handleSearchSubmit = async (e) => {
    e.preventDefault()
    setSearchError(null)
    setSearchValidationMsg(null)
    setSearchUnavailable(null)
    setShowContainersSection(false)
    setShowRateResult(false)
    setSelectedContainer(null)
    setAvailableRates([])

    const trimmedOrigin = originText.trim()
    const trimmedDest = destinationText.trim()
    const trimmedTrans = isTranshipmentEnabled ? transhipmentText.trim() : ''

    // 1. Validation check
    if (!trimmedOrigin || !trimmedDest) {
      setSearchValidationMsg('Please enter both origin and destination ports to search rates.')
      return
    }

    if (isTranshipmentEnabled && !trimmedTrans) {
      setSearchValidationMsg('Please enter a transhipment port or uncheck the transhipment option.')
      return
    }

    setSearchChecking(true)

    const selectedMode = modes.find(m => m.id === selectedModeId)
    const modeType = selectedMode?.name || selectedMode?.id || 'Ocean Freight'
    const shipmentTypeObj = shipmentTypes.find(t => t.id === selectedShipmentTypeId)

    try {
      // 2. Check Origin Port in Database
      let resolvedOrigin = selectedPortObjects.origin
      if (!resolvedOrigin || (resolvedOrigin.id !== originId && resolvedOrigin.port_code !== originId)) {
        const resO = await fetch(`${API_URL}/ports?search=${encodeURIComponent(trimmedOrigin)}&freight_type=${encodeURIComponent(modeType)}&status=active`)
        const dataO = await resO.json()
        const portsO = (dataO.success && Array.isArray(dataO.ports)) ? dataO.ports : []

        if (portsO.length === 0) {
          setSearchChecking(false)
          setSearchUnavailable({
            type: 'origin',
            title: 'Port Not Available in Database',
            description: `We couldn't find origin port "${trimmedOrigin}" in our global ports database.`,
            originText: trimmedOrigin,
            destinationText: trimmedDest,
            transhipmentText: trimmedTrans,
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
        const resD = await fetch(`${API_URL}/ports?search=${encodeURIComponent(trimmedDest)}&freight_type=${encodeURIComponent(modeType)}&status=active`)
        const dataD = await resD.json()
        const portsD = (dataD.success && Array.isArray(dataD.ports)) ? dataD.ports : []

        if (portsD.length === 0) {
          setSearchChecking(false)
          setSearchUnavailable({
            type: 'destination',
            title: 'Port Not Available in Database',
            description: `We couldn't find destination port "${trimmedDest}" in our global ports database.`,
            originText: resolvedOrigin.port_name || resolvedOrigin.port_code || trimmedOrigin,
            destinationText: trimmedDest,
            transhipmentText: trimmedTrans,
            modeName: selectedMode?.name || 'Ocean Freight',
            shipmentTypeName: shipmentTypeObj?.name || '',
            reason: 'destination_not_found'
          })
          return
        }
        resolvedDest = portsD[0]
      }

      // 4. Check Transhipment Port in Database (if enabled)
      let resolvedTrans = null
      if (isTranshipmentEnabled) {
        resolvedTrans = selectedPortObjects.transhipment
        if (!resolvedTrans || (resolvedTrans.id !== transhipmentId && resolvedTrans.port_code !== transhipmentId)) {
          const resT = await fetch(`${API_URL}/ports?search=${encodeURIComponent(trimmedTrans)}&freight_type=${encodeURIComponent(modeType)}&status=active`)
          const dataT = await resT.json()
          const portsT = (dataT.success && Array.isArray(dataT.ports)) ? dataT.ports : []

          if (portsT.length === 0) {
            setSearchChecking(false)
            setSearchUnavailable({
              type: 'transhipment',
              title: 'Transhipment Port Not Available in Database',
              description: `We couldn't find transhipment port "${trimmedTrans}" in our global ports database.`,
              originText: resolvedOrigin.port_name || resolvedOrigin.port_code || trimmedOrigin,
              destinationText: resolvedDest.port_name || resolvedDest.port_code || trimmedDest,
              transhipmentText: trimmedTrans,
              modeName: selectedMode?.name || 'Ocean Freight',
              shipmentTypeName: shipmentTypeObj?.name || '',
              reason: 'transhipment_not_found'
            })
            return
          }
          resolvedTrans = portsT[0]
        }
      }

      // Store resolved port objects in state
      setSelectedPortObjects({ origin: resolvedOrigin, destination: resolvedDest, transhipment: resolvedTrans })

      // Check if mode uses containers
      const isAir = selectedMode?.name?.toLowerCase().includes('air')

      if (isAir) {
        // Direct rate query for Air freight (does not use containers)
        const originQueryParam = resolvedOrigin.port_code || resolvedOrigin.id
        const destQueryParam = resolvedDest.port_code || resolvedDest.id
        const resRates = await fetch(
          `${API_URL}/freight-rates?mode_id=${selectedModeId}&shipment_type_id=${selectedShipmentTypeId}&origin_id=${encodeURIComponent(originQueryParam)}&destination_id=${encodeURIComponent(destQueryParam)}${isTranshipmentEnabled && resolvedTrans ? `&transhipment_id=${encodeURIComponent(resolvedTrans.port_code || resolvedTrans.id)}` : ''}&status=active`
        )
        const ratesData = await resRates.json()
        const activeRates = Array.isArray(ratesData) ? ratesData.filter(r => r.status === 'active') : []
        setSearchChecking(false)

        if (activeRates.length > 0) {
          setAvailableRates(activeRates)
          setSearchUnavailable(null)
        } else {
          setAvailableRates([])
          const originLabel = `${resolvedOrigin.port_name || resolvedOrigin.port_code} (${resolvedOrigin.port_code})`
          const destLabel = `${resolvedDest.port_name || resolvedDest.port_code} (${resolvedDest.port_code})`
          const transLabel = (isTranshipmentEnabled && resolvedTrans) ? `${resolvedTrans.port_name || resolvedTrans.port_code} (${resolvedTrans.port_code})` : ''
          const fullRoute = transLabel ? `${originLabel} → Via ${transLabel} → ${destLabel}` : `${originLabel} → ${destLabel}`
          setSearchUnavailable({
            type: 'rate',
            title: 'No freight rates are currently available for your selected route.',
            description: `We couldn't find direct contract rates for ${fullRoute} in our current database.`,
            originText: originLabel,
            destinationText: destLabel,
            transhipmentText: transLabel,
            modeName: selectedMode?.name || 'Air Freight',
            shipmentTypeName: shipmentTypeObj?.name || '',
            weight,
            weightUnit,
            reason: 'rate_not_found'
          })
        }
        return
      }

      // For Ocean Freight / containerized modes:
      // Fetch fresh active containers from database
      let containers = []
      try {
        const resC = await fetch(`${API_URL}/containers?status=active`)
        const dataC = await resC.json()
        if (Array.isArray(dataC)) {
          containers = dataC.filter(c => c.status === 'active')
          setContainersList(containers)
        }
      } catch (e) {
        containers = containersList.filter(c => c.status === 'active')
      }

      // Display all and only active container types from admin-managed data source
      const activeContainers = containers.filter(c => c.status === 'active')

      setSearchChecking(false)

      if (activeContainers.length === 0) {
        const originLabel = `${resolvedOrigin.port_name || resolvedOrigin.port_code} (${resolvedOrigin.port_code})`
        const destLabel = `${resolvedDest.port_name || resolvedDest.port_code} (${resolvedDest.port_code})`
        const transLabel = (isTranshipmentEnabled && resolvedTrans) ? `${resolvedTrans.port_name || resolvedTrans.port_code} (${resolvedTrans.port_code})` : ''
        setSearchUnavailable({
          type: 'container',
          title: 'No Container Types Available',
          description: `No applicable container specifications are configured in the system for this route.`,
          originText: originLabel,
          destinationText: destLabel,
          transhipmentText: transLabel,
          modeName: selectedMode?.name || 'Ocean Freight',
          shipmentTypeName: shipmentTypeObj?.name || '',
          reason: 'no_containers_available'
        })
        setShowContainersSection(false)
        return
      }

      // Show container options for user to select
      setAvailableContainers(activeContainers)
      setSelectedContainer(null)
      setShowContainersSection(true)
      setAvailableRates([])
      setSearchUnavailable(null)
    } catch (err) {
      console.error('[Rate Search] Query error:', err)
      setSearchChecking(false)
      setAvailableRates([])
      setShowContainersSection(false)
      setSearchError('Unable to connect to the freight rate server. Please check your connection and try again.')
    }
  }

  const handleProceedWithContainer = async () => {
    if (!selectedContainer) return

    setRateChecking(true)
    setSearchError(null)
    setAvailableRates([])
    setSearchUnavailable(null)
    setShowRateResult(false)

    const selectedMode = modes.find(m => m.id === selectedModeId)
    const shipmentTypeObj = shipmentTypes.find(t => t.id === selectedShipmentTypeId)
    const resolvedOrigin = selectedPortObjects.origin || {}
    const resolvedDest = selectedPortObjects.destination || {}
    const resolvedTrans = isTranshipmentEnabled ? (selectedPortObjects.transhipment || {}) : null

    const originQueryParam = resolvedOrigin.port_code || resolvedOrigin.id || originText.trim()
    const destQueryParam = resolvedDest.port_code || resolvedDest.id || destinationText.trim()
    const transQueryParam = resolvedTrans ? (resolvedTrans.port_code || resolvedTrans.id || transhipmentText.trim()) : ''
    const containerQueryParam = selectedContainer.id || selectedContainer.name

    try {
      let queryUrl = `${API_URL}/freight-rates?mode_id=${selectedModeId}&shipment_type_id=${selectedShipmentTypeId}&origin_id=${encodeURIComponent(originQueryParam)}&destination_id=${encodeURIComponent(destQueryParam)}&container_id=${encodeURIComponent(containerQueryParam)}&status=active`
      if (isTranshipmentEnabled && transQueryParam) {
        queryUrl += `&transhipment_id=${encodeURIComponent(transQueryParam)}`
      }

      const resRates = await fetch(queryUrl)
      const ratesData = await resRates.json()
      const activeRates = Array.isArray(ratesData) ? ratesData.filter(r => r.status === 'active') : []

      setRateChecking(false)

      const originLabel = `${resolvedOrigin.port_name || resolvedOrigin.port_code || originQueryParam} (${resolvedOrigin.port_code || originQueryParam})`
      const destLabel = `${resolvedDest.port_name || resolvedDest.port_code || destQueryParam} (${resolvedDest.port_code || destQueryParam})`
      const transLabel = (isTranshipmentEnabled && transQueryParam)
        ? `${resolvedTrans?.port_name || resolvedTrans?.port_code || transQueryParam} (${resolvedTrans?.port_code || transQueryParam})`
        : ''
      const fullRoute = transLabel ? `${originLabel} → Via ${transLabel} → ${destLabel}` : `${originLabel} → ${destLabel}`

      // If transhipment is enabled, ensure rate lookup respects full route (or proceeds to enquiry)
      const matchingRates = isTranshipmentEnabled
        ? activeRates.filter(r => (r.transhipment_id && (r.transhipment_id === transQueryParam || r.transhipment_code === transQueryParam)) || (r.transhipment && (r.transhipment === transQueryParam || r.transhipment === transLabel)))
        : activeRates

      if (matchingRates.length > 0) {
        setAvailableRates(matchingRates)
        setSearchUnavailable(null)
        setShowRateResult(true)
      } else {
        // No matching rate for this route + container + transhipment combination -> proceed to enquiry
        setAvailableRates([])
        setSearchUnavailable({
          type: 'rate',
          title: 'No freight rates are currently available for your selected route.',
          description: `We couldn't find direct contract rates for ${fullRoute} with ${selectedContainer.name} in our current database.`,
          originText: originLabel,
          destinationText: destLabel,
          transhipmentText: transLabel,
          modeName: selectedMode?.name || 'Ocean Freight',
          shipmentTypeName: shipmentTypeObj?.name || '',
          containerName: selectedContainer.name,
          weight,
          weightUnit,
          reason: 'rate_not_found'
        })
        setShowRateResult(true)
      }
    } catch (err) {
      console.error('[Rate Proceed] Query error:', err)
      setRateChecking(false)
      setAvailableRates([])
      setShowRateResult(false)
      setSearchError('Unable to connect to the freight rate server. Please check your connection and try again.')
    }
  }

  const handleBookRate = (rate) => {
    const selectedMode = modes.find(m => m.id === selectedModeId)
    const shipmentTypeObj = shipmentTypes.find(t => t.id === selectedShipmentTypeId)
    const containerObj = selectedContainer || containersList.find(c => c.id === selectedContainerId)
    const resolvedOrigin = selectedPortObjects.origin || {}
    const resolvedDest = selectedPortObjects.destination || {}

    const params = new URLSearchParams({
      fromPort: rate.origin_code || resolvedOrigin.port_code || resolvedOrigin.id || originText.trim(),
      toPort: rate.destination_code || resolvedDest.port_code || resolvedDest.id || destinationText.trim(),
      containerType: rate.container_name || (containerObj ? containerObj.name : ''),
      freight_type: shipmentTypeObj ? shipmentTypeObj.name.toLowerCase() : (selectedMode?.name?.toLowerCase().includes('air') ? 'air' : 'fcl'),
      rate_id: rate.id,
      rateId: rate.id
    })
    const transVal = rate.transhipment_code || rate.transhipment_name || rate.transhipment_id || (isTranshipmentEnabled ? transhipmentText.trim() : '')
    if (transVal) {
      params.set('transhipment', transVal)
    }
    navigate('/booking?' + params.toString())
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

        /* Specific styles for Transhipment control and 9px checkbox */
        .booking-transhipment-label {
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          height: 42px !important;
          padding: 0 12px !important;
          background: #ffffff !important;
          border: 1px solid #e0e0e0 !important;
          cursor: pointer !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          user-select: none !important;
          white-space: nowrap !important;
        }

        .booking-transhipment-checkbox {
          width: 9px !important;
          height: 9px !important;
          min-width: 9px !important;
          min-height: 9px !important;
          max-width: 9px !important;
          max-height: 9px !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          padding: 0 !important;
          appearance: none !important;
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          border: 1px solid #767676 !important;
          border-radius: 2px !important;
          background-color: #ffffff !important;
          cursor: pointer !important;
          display: inline-block !important;
          align-self: center !important;
          vertical-align: middle !important;
          flex-shrink: 0 !important;
          outline: none !important;
          line-height: 1 !important;
          transform: none !important;
        }

        .booking-transhipment-checkbox:checked {
          background-color: #d64238 !important;
          border: 1px solid #d64238 !important;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 10 10' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 5.2L4 7.2L8 2.8' stroke='white' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") !important;
          background-repeat: no-repeat !important;
          background-position: center !important;
          background-size: 7px 7px !important;
          transform: none !important;
        }

        .booking-transhipment-checkbox:focus {
          outline: none !important;
        }

        .booking-transhipment-text {
          font-size: 13px !important;
          font-weight: 500 !important;
          color: #555555 !important;
          line-height: 1 !important;
          user-select: none !important;
          display: inline-flex !important;
          align-items: center !important;
        }

        @media (min-width: 992px) {
          .booking-input-origin {
            flex: 1 1 0% !important;
            min-width: 160px;
          }
          .booking-input-destination {
            flex: 1 1 0% !important;
            min-width: 160px;
          }
          .booking-input-transhipment {
            flex: 1 1 0% !important;
            min-width: 160px;
          }
          .booking-input-weight {
            flex: 1 1 0% !important;
            min-width: 160px;
          }
          .booking-input-transhipment-check {
            flex: 0 0 auto !important;
          }
          .booking-input-button {
            flex: 0 0 120px !important;
            width: 120px !important;
            max-width: 120px !important;
            flex-shrink: 0 !important;
          }
          .booking-form-row {
            flex-wrap: nowrap !important;
            justify-content: space-between !important;
          }
        }

        @media (max-width: 991px) and (min-width: 768px) {
          .booking-card-container {
            width: 92%;
          }
          .booking-input-origin,
          .booking-input-destination,
          .booking-input-transhipment {
            flex: 1 1 calc(50% - 6px) !important;
            min-width: 200px;
          }
          .booking-input-transhipment-check {
            flex: 0 0 auto !important;
          }
          .booking-input-button {
            flex: 1 1 auto !important;
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
          .booking-input-transhipment-check {
            flex: 1 1 100% !important;
          }
          .booking-input-button {
            flex: 1 1 100% !important;
            width: 100% !important;
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
                    onClick={() => setSelectedModeId(mode.id)}
                    className={`booking-mode-btn ${active ? 'active' : 'inactive'} ${mode.id === 'air' ? 'mode-air' : 'mode-ocean'}`}
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
                    onClick={() => {
                      setSelectedShipmentTypeId(type.id)
                      setAvailableRates([])
                      setSearchUnavailable(null)
                      setSearchError(null)
                    }}
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

              {/* Conditional Transhipment Port input */}
              {isTranshipmentEnabled && (
                <div className="booking-input-col booking-input-transhipment">
                  <input
                    type="text"
                    value={transhipmentText}
                    onChange={e => handleLocationInput(e.target.value, 'transhipment')}
                    onBlur={() => setTimeout(() => setShowDropdown(p => ({ ...p, transhipment: false })), 200)}
                    placeholder="Transhipment"
                    autoComplete="off"
                    className="booking-input-field"
                  />
                  {showDropdown.transhipment && (
                    <div style={searchStyle}>
                      {locationResults.transhipment?.length > 0 ? (
                        locationResults.transhipment.map((l, i) => (
                          <div
                            key={i}
                            style={searchItemStyle}
                            onMouseDown={() => selectLocation(l, 'transhipment')}
                          >
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>
                              {l.port_code} ({l.port_name})
                            </div>
                            <div style={{ fontSize: '11px', color: '#888' }}>{l.country}</div>
                          </div>
                        ))
                      ) : noMatchFound.transhipment ? (
                        <div style={{ padding: '16px', background: '#fff' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
                            <span>⚠️</span> Port Not Found in Database
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                            We couldn't find "{transhipmentText}" in our 6,000+ ports directory.
                          </div>
                          <button
                            type="button"
                            onMouseDown={() => handleOpenDropdownEnquiry('transhipment')}
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
              )}

              {/* Transhipment Checkbox */}
              <div className="booking-input-col booking-input-transhipment-check">
                <label className="booking-transhipment-label">
                  <input
                    type="checkbox"
                    className="booking-transhipment-checkbox"
                    checked={isTranshipmentEnabled}
                    onChange={e => handleTranshipmentToggle(e.target.checked)}
                  />
                  <span className="booking-transhipment-text">
                    Transhipment
                  </span>
                </label>
              </div>

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

            {/* Container Selection Section (Shown before Proceed) */}
            {showContainersSection && availableContainers.length > 0 && !showRateResult && (
              <div className="available-containers-selection-section" style={{
                marginTop: '28px',
                padding: '24px 28px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '18px',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px'
                    }}>
                      <span style={{ fontSize: '20px' }}>📦</span>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                        Available Container Options
                      </h3>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                      Select a container specification below to calculate and check live freight rates.
                    </p>
                  </div>

                  {/* Route pill */}
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
                    gap: '6px'
                  }}>
                    <span>{selectedPortObjects.origin?.port_code || originText}</span>
                    {isTranshipmentEnabled && (selectedPortObjects.transhipment?.port_code || transhipmentText) ? (
                      <>
                        <span style={{ color: '#d64238' }}>→ Via {selectedPortObjects.transhipment?.port_code || transhipmentText} →</span>
                      </>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>→</span>
                    )}
                    <span>{selectedPortObjects.destination?.port_code || destinationText}</span>
                  </div>
                </div>

                {/* Container Options Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '14px',
                  marginBottom: '22px'
                }}>
                  {availableContainers.map(container => {
                    const isSelected = selectedContainer?.id === container.id
                    return (
                      <div
                        key={container.id}
                        onClick={() => {
                          setSelectedContainer(container)
                          setAvailableRates([])
                          setSearchUnavailable(null)
                          setShowRateResult(false)
                        }}
                        style={{
                          padding: '16px 18px',
                          background: isSelected ? '#fff8f7' : '#ffffff',
                          border: `2px solid ${isSelected ? '#d64238' : '#e2e8f0'}`,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          boxShadow: isSelected ? '0 4px 12px rgba(214, 66, 56, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {/* Radio indicator */}
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: `2px solid ${isSelected ? '#d64238' : '#cbd5e1'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          background: '#ffffff'
                        }}>
                          {isSelected && (
                            <div style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: '#d64238'
                            }} />
                          )}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: 700,
                            fontSize: '14px',
                            color: isSelected ? '#d64238' : '#1e293b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {container.name} {container.size && !container.name.includes(container.size) ? `(${container.size})` : ''}
                          </div>
                          {container.description && (
                            <div style={{
                              fontSize: '12px',
                              color: '#64748b',
                              marginTop: '2px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {container.description}
                            </div>
                          )}
                        </div>

                        {isSelected && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#d64238',
                            background: '#fee2e2',
                            padding: '2px 8px',
                            borderRadius: '12px'
                          }}>
                            Selected
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Proceed Action Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '14px',
                  paddingTop: '16px',
                  borderTop: '1px solid #e2e8f0'
                }}>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    {selectedContainer ? (
                      <span>Selected: <strong style={{ color: '#1e293b' }}>{selectedContainer.name}</strong></span>
                    ) : (
                      <span style={{ color: '#d64238', fontWeight: 600 }}>* Please select a container type above to continue</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleProceedWithContainer}
                    disabled={!selectedContainer || rateChecking}
                    style={{
                      background: selectedContainer ? '#d64238' : '#cbd5e1',
                      color: 'white',
                      border: 'none',
                      padding: '12px 32px',
                      fontWeight: 700,
                      fontSize: '14px',
                      borderRadius: '4px',
                      cursor: selectedContainer && !rateChecking ? 'pointer' : 'not-allowed',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: selectedContainer ? '0 2px 6px rgba(214, 66, 56, 0.3)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {rateChecking ? (
                      <>
                        <span style={{
                          display: 'inline-block',
                          width: '14px',
                          height: '14px',
                          border: '2px solid white',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite'
                        }} />
                        Checking Rate...
                      </>
                    ) : (
                      <>
                        <span>Proceed</span>
                        <span>→</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Rate Result Display Section (Replaces Container Options after Proceed) */}
            {showContainersSection && showRateResult && (
              <div className="rate-result-display-section" style={{
                marginTop: '28px',
                padding: '24px 28px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)'
              }}>
                {/* Navigation Bar: "Change Container" action & Route summary pill */}
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
                    onClick={() => {
                      setShowRateResult(false)
                      setAvailableRates([])
                      setSearchUnavailable(null)
                    }}
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
                    <span>Change Container</span>
                  </button>

                  {/* Route pill indicator */}
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
                    gap: '6px'
                  }}>
                    <span>{selectedPortObjects.origin?.port_code || originText}</span>
                    {isTranshipmentEnabled && (selectedPortObjects.transhipment?.port_code || transhipmentText) ? (
                      <span style={{ color: '#d64238' }}>→ Via {selectedPortObjects.transhipment?.port_code || transhipmentText} →</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>→</span>
                    )}
                    <span>{selectedPortObjects.destination?.port_code || destinationText}</span>
                    {selectedContainer && (
                      <span style={{
                        marginLeft: '6px',
                        paddingLeft: '8px',
                        borderLeft: '1px solid #cbd5e1',
                        color: '#1e293b'
                      }}>
                        📦 {selectedContainer.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Matching Freight Rate Result */}
                {availableRates && availableRates.length > 0 && (
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '16px',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#d64238', fontSize: '20px' }}>⚓</span>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                          Matching Freight Rate
                        </h3>
                      </div>
                      <span style={{
                        background: '#ecfdf5',
                        color: '#065f46',
                        border: '1px solid #a7f3d0',
                        padding: '4px 12px',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: 700
                      }}>
                        {availableRates.length} active rate{availableRates.length > 1 ? 's' : ''} available
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {availableRates.map((rate, idx) => (
                        <div key={rate.id || idx} style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '20px 24px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '20px'
                        }}>
                          <div style={{ flex: '1 1 350px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                              <span style={{
                                background: '#fee2e2',
                                color: '#d64238',
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '3px 8px',
                                borderRadius: '3px',
                                letterSpacing: '0.5px'
                              }}>
                                Carrier: {rate.carrier || 'Standard Line'}
                              </span>
                              <span style={{
                                background: '#f1f5f9',
                                color: '#475569',
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: '3px'
                              }}>
                                {rate.mode_name || 'Ocean Freight'}
                              </span>
                              <span style={{
                                background: '#f1f5f9',
                                color: '#475569',
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: '3px'
                              }}>
                                {rate.shipment_name || 'FCL'}
                              </span>
                            </div>

                            <h4 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                              {rate.origin_name || rate.origin_code} ({rate.origin_code})
                              {rate.transhipment_code ? ` → Via ${rate.transhipment_name || rate.transhipment_code} (${rate.transhipment_code}) → ` : ' → '}
                              {rate.destination_name || rate.destination_code} ({rate.destination_code})
                            </h4>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: '#64748b' }}>
                              <span>
                                <strong style={{ color: '#334155' }}>Container:</strong> {rate.container_name || selectedContainer?.name || 'Standard'}
                              </span>
                              <span>
                                <strong style={{ color: '#334155' }}>Transit:</strong> {rate.transit_time} Days
                              </span>
                              <span>
                                <strong style={{ color: '#334155' }}>Transshipment Port:</strong>{' '}
                                {rate.transhipment_code ? (
                                  <span style={{ color: '#0f172a', fontWeight: 600 }}>
                                    {rate.transhipment_name || rate.transhipment_code} ({rate.transhipment_code})
                                  </span>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No transshipment</span>
                                )}
                              </span>
                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                Rate ID: {rate.id}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '30px', fontWeight: 800, color: '#d64238', lineHeight: 1 }}>
                                ${rate.price}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                                {rate.currency || 'USD'} Freight Charge
                              </div>
                              {(Number(rate.local_thc) > 0 || Number(rate.other_charges) > 0) && (
                                <div style={{
                                  marginTop: '6px',
                                  paddingTop: '6px',
                                  borderTop: '1px dashed #e2e8f0',
                                  fontSize: '11px',
                                  color: '#64748b',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px',
                                  textAlign: 'right'
                                }}>
                                  <div>Local THC: <strong style={{ color: '#0f172a' }}>${Number(rate.local_thc || 0).toFixed(2)}</strong></div>
                                  <div>Other Charges: <strong style={{ color: '#0f172a' }}>${Number(rate.other_charges || 0).toFixed(2)}</strong></div>
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleBookRate(rate)}
                              style={{
                                background: '#d64238',
                                color: '#ffffff',
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
                                transition: 'background 0.2s ease'
                              }}
                              onMouseOver={e => e.currentTarget.style.background = '#c0352c'}
                              onMouseOut={e => e.currentTarget.style.background = '#d64238'}
                            >
                              <span>Booking</span>
                              <span style={{ fontSize: '16px' }}>→</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* If No Matching Rate Exists (Enquiry Flow) */}
                {searchUnavailable && (
                  <div className="port-unavailable-card" style={{
                    padding: '20px 24px',
                    backgroundColor: '#fff8f7',
                    border: '1px solid #fed7d7',
                    borderLeft: '4px solid #d64238',
                    borderRadius: '4px',
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
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: '#fee2e2',
                          color: '#d64238',
                          fontSize: '13px',
                          fontWeight: 'bold'
                        }}>
                          !
                        </span>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1f2937' }}>
                          {searchUnavailable.title}
                        </h4>
                      </div>
                      <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#4b5563', lineHeight: '1.5' }}>
                        {searchUnavailable.description}
                      </p>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Need help with this route? Submit an enquiry and our freight operations team will assist you with custom availability and pricing.
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
                          fontWeight: 600,
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
              </div>
            )}

            {/* Step 4 — Visual Enquiry Card when port or rate is not available (for Air or initial port errors) */}
            {searchUnavailable && !showContainersSection && (
              <div className="port-unavailable-card" style={{
                marginTop: '24px',
                padding: '24px 28px',
                backgroundColor: '#fff8f7',
                border: '1px solid #fed7d7',
                borderLeft: '4px solid #d64238',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '20px',
                boxShadow: '0 2px 8px rgba(214, 66, 56, 0.08)'
              }}>
                <div style={{ flex: '1 1 500px' }}>
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
                      fontSize: '13px',
                      fontWeight: 'bold'
                    }}>
                      !
                    </span>
                    <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1f2937' }}>
                      {searchUnavailable.title}
                    </h4>
                  </div>
                  <p style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#4b5563', lineHeight: '1.5' }}>
                    {searchUnavailable.description}
                  </p>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    Need help with this route? Submit an enquiry and our freight operations team will assist you with custom availability and pricing.
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
                      fontWeight: 600,
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

            {/* Available Freight Rates Result Section (for Air mode or direct searches) */}
            {availableRates && availableRates.length > 0 && !showContainersSection && (
              <div className="available-rates-results-section" style={{
                marginTop: '28px',
                paddingTop: '24px',
                borderTop: '2px dashed #e2e8f0'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '18px',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <h3 style={{
                      margin: 0,
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#1e293b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ color: '#d64238' }}>⚓</span> Available Freight Rates
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                      Verified contract freight rates matching your exact route and container specifications.
                    </p>
                  </div>
                  <span style={{
                    background: '#ecfdf5',
                    color: '#065f46',
                    border: '1px solid #a7f3d0',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 700
                  }}>
                    {availableRates.length} active rate{availableRates.length > 1 ? 's' : ''} available
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {availableRates.map((rate, idx) => (
                    <div key={rate.id || idx} style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '20px 24px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '20px'
                    }}>
                      <div style={{ flex: '1 1 350px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            background: '#fee2e2',
                            color: '#d64238',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '3px 8px',
                            borderRadius: '3px',
                            letterSpacing: '0.5px'
                          }}>
                            Carrier: {rate.carrier || 'Standard Line'}
                          </span>
                          <span style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '3px'
                          }}>
                            {rate.mode_name || 'Ocean Freight'}
                          </span>
                          <span style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '3px'
                          }}>
                            {rate.shipment_name || 'FCL'}
                          </span>
                        </div>

                        <h4 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                          {rate.origin_name || rate.origin_code} ({rate.origin_code})
                          {rate.transhipment_code ? (
                            <span style={{ color: '#d64238' }}> → Via {rate.transhipment_name || rate.transhipment_code} ({rate.transhipment_code}) → </span>
                          ) : ' → '}
                          {rate.destination_name || rate.destination_code} ({rate.destination_code})
                        </h4>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: '#64748b' }}>
                          <span>
                            <strong style={{ color: '#334155' }}>Container:</strong> {rate.container_name || 'Standard'}
                          </span>
                          <span>
                            <strong style={{ color: '#334155' }}>Transit:</strong> {rate.transit_time} Days
                          </span>
                          <span>
                            <strong style={{ color: '#334155' }}>Transshipment Port:</strong>{' '}
                            {rate.transhipment_code ? (
                              <span style={{ color: '#0f172a', fontWeight: 600 }}>
                                {rate.transhipment_name || rate.transhipment_code} ({rate.transhipment_code})
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No transshipment</span>
                            )}
                          </span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            Rate ID: {rate.id}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '30px', fontWeight: 800, color: '#d64238', lineHeight: 1 }}>
                            ${rate.price}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                            {rate.currency || 'USD'} Freight Charge
                          </div>
                          {(Number(rate.local_thc) > 0 || Number(rate.other_charges) > 0) && (
                            <div style={{
                              marginTop: '6px',
                              paddingTop: '6px',
                              borderTop: '1px dashed #e2e8f0',
                              fontSize: '11px',
                              color: '#64748b',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                              textAlign: 'right'
                            }}>
                              <div>Local THC: <strong style={{ color: '#0f172a' }}>${Number(rate.local_thc || 0).toFixed(2)}</strong></div>
                              <div>Other Charges: <strong style={{ color: '#0f172a' }}>${Number(rate.other_charges || 0).toFixed(2)}</strong></div>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleBookRate(rate)}
                          style={{
                            background: '#d64238',
                            color: '#ffffff',
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
                            transition: 'background 0.2s ease'
                          }}
                          onMouseOver={e => e.currentTarget.style.background = '#c0352c'}
                          onMouseOut={e => e.currentTarget.style.background = '#d64238'}
                        >
                          <span>Booking</span>
                          <span style={{ fontSize: '16px' }}>→</span>
                        </button>
                      </div>
                    </div>
                  ))}
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
