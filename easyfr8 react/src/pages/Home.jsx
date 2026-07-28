import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCms } from '../context/CmsContext'
import { getImageUrl } from '../services/api'

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

  // Dropdown suggestions state
  const [locationResults, setLocationResults] = useState({ origin: [], destination: [] })
  const [showDropdown, setShowDropdown] = useState({ origin: false, destination: false })
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

    fetch(`${API_URL}/containers`)
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
    
    // Clear port inputs when changing mode
    setOriginText('')
    setOriginId('')
    setDestinationText('')
    setDestinationId('')
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
        if ($('.slide-partener').length && typeof $.fn.owlCarousel === 'function') {
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
  }, [blogs, partners])

  // Location Search (dynamic)
  const searchLocations = async (term, field) => {
    if (term.length < 2) {
      setLocationResults(prev => ({ ...prev, [field]: [] }))
      setShowDropdown(prev => ({ ...prev, [field]: false }))
      return
    }
    
    // Determine type based on selected mode
    const selectedMode = modes.find(m => m.id === selectedModeId)
    const modeType = selectedMode?.name.toLowerCase().includes('air') ? 'Air' : 'Ocean'
    
    try {
      const res = await fetch(`${API_URL}/ports?search=${encodeURIComponent(term)}&freight_type=${modeType}`)
      const data = await res.json()
      if (data.success && Array.isArray(data.ports)) {
        setLocationResults(prev => ({ ...prev, [field]: data.ports }))
        setShowDropdown(prev => ({ ...prev, [field]: true }))
      }
    } catch (e) {
      setLocationResults(prev => ({ ...prev, [field]: [] }))
    }
  }

  const handleLocationInput = (val, field) => {
    if (field === 'origin') {
      setOriginText(val)
      setOriginId('')
    } else {
      setDestinationText(val)
      setDestinationId('')
    }
    clearTimeout(searchTimers.current[field])
    searchTimers.current[field] = setTimeout(() => searchLocations(val, field), 300)
  }

  const selectLocation = (item, field) => {
    const text = `${item.port_name} (${item.port_code}) - ${item.country}`
    if (field === 'origin') {
      setOriginText(text)
      setOriginId(item.id)
    } else {
      setDestinationText(text)
      setDestinationId(item.id)
    }
    setShowDropdown(prev => ({ ...prev, [field]: false }))
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (!originId || !destinationId) {
      alert('Please select valid locations from the suggestions list.')
      return
    }
    const originPort = locationResults.origin.find(p => p.id === originId) || { port_code: originId }
    const destPort = locationResults.destination.find(p => p.id === destinationId) || { port_code: destinationId }
    const containerObj = containersList.find(c => c.id === selectedContainerId)
    const shipmentTypeObj = shipmentTypes.find(t => t.id === selectedShipmentTypeId)

    const params = new URLSearchParams({
      fromPort: originPort.port_code,
      toPort: destPort.port_code,
      containerType: containerObj ? containerObj.name : '',
      freight_type: shipmentTypeObj ? shipmentTypeObj.name.toLowerCase() : ''
    })
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
          gap: 18px;
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
          padding: 10px 16px;
          width: 100%;
          background: white;
          color: #666;
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
        }

        @media (min-width: 1200px) {
          .booking-input-origin {
            flex: 32 1 32% !important;
            max-width: 32% !important;
          }
          .booking-input-destination {
            flex: 32 1 32% !important;
            max-width: 32% !important;
          }
          .booking-input-container {
            flex: 26 1 26% !important;
            max-width: 26% !important;
          }
          .booking-input-button {
            flex: 0 0 130px !important;
            width: 130px !important;
            max-width: 130px !important;
            flex-shrink: 0 !important;
          }
          .booking-form-row {
            flex-wrap: nowrap !important;
            justify-content: center !important;
          }
        }

        @media (max-width: 1199px) {
          .booking-card-container {
            width: 90%;
          }
          .booking-input-col {
            flex: 1 1 calc(50% - 9px) !important;
            min-width: 250px;
          }
          .booking-input-button {
            flex: 1 1 100% !important;
          }
        }

        @media (max-width: 767px) {
          .booking-card-container {
            width: 95%;
          }
          .booking-card {
            padding: 25px 20px;
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
          .booking-input-col {
            flex: 1 1 100% !important;
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
                    onClick={() => setSelectedShipmentTypeId(type.id)}
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
                {showDropdown.origin && locationResults.origin?.length > 0 && (
                  <div style={searchStyle}>
                    {locationResults.origin.map((l, i) => (
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
                    ))}
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
                {showDropdown.destination && locationResults.destination?.length > 0 && (
                  <div style={searchStyle}>
                    {locationResults.destination.map((l, i) => (
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
                    ))}
                  </div>
                )}
              </div>

              {/* Container dropdown — always shown for Ocean; weight for Air */}
              {(() => {
                const selMode = (modes.length > 0 ? modes : DEFAULT_MODES).find(m => m.id === selectedModeId)
                const isAir   = selMode?.name?.toLowerCase().includes('air')
                if (isAir) {
                  return (
                    <div className="booking-input-col booking-input-container" style={{ display: 'flex', gap: '0' }}>
                      <input
                        type="number"
                        value={weight}
                        onChange={e => setWeight(e.target.value)}
                        placeholder="Weight"
                        className="booking-input-field"
                        style={{ borderRight: 'none', flex: 2, height: '58px' }}
                        min="0" step="0.1"
                      />
                      <select
                        value={weightUnit}
                        onChange={e => setWeightUnit(e.target.value)}
                        style={{ width: '68px', padding: '0 6px', border: '1px solid #ddd', fontSize: '13px', background: '#fafafa', height: '58px' }}
                      >
                        <option value="KG">KG</option>
                        <option value="LBS">LBS</option>
                      </select>
                    </div>
                  )
                }
                // Ocean — always show container dropdown
                return (
                  <div className="booking-input-col booking-input-container">
                    <select
                      value={selectedContainerId}
                      onChange={e => setSelectedContainerId(e.target.value)}
                      className="booking-input-field"
                    >
                      <option value="">Container Type</option>
                      {containersList.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )
              })()}

              {/* Check Rates button */}
              <div className="booking-input-button">
                <button type="submit" className="booking-btn-submit">
                  Check Rates
                </button>
              </div>
            </form>

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
              'ocean freight forwarding': { title: 'Sea Freight', icon: 'flaticon-transport-4', order: 2 },
              'air freight forwarding': { title: 'Air Freight', icon: 'flaticon-transport-3', order: 1 },
              'road freight forwarding': { title: 'Road Transport', icon: 'flaticon-transport-5', order: 3 },
              'warehousing': { title: 'Warehousing', icon: 'flaticon-transport-7', order: 4 },
              'custom clearance': { title: 'Custom Clearance', icon: 'flaticon-transport-1', order: 5 },
              'cfs': { title: 'CFS', icon: 'flaticon-transport-10', order: 6 },
              'contract handling': { title: 'Contract Handling', icon: 'flaticon-business', order: 7 },
              'cargo insurance': { title: 'Cargo Insurance', icon: 'flaticon-interface-1', order: 8 }
            };
            const processedServices = (cms.services || [])
              .filter(s => s.active)
              .map(s => {
                const key = s.title.toLowerCase().trim();
                const mapping = serviceMapping[key] || { title: s.title, icon: s.icon, order: 99 };
                return { ...s, title: mapping.title, icon: mapping.icon, order: mapping.order };
              })
              .sort((a, b) => a.order - b.order);

            return (
              <div className="services-grid-container">
                {processedServices.map(service => {
                  const path = service.slug ? `/services/${service.slug}` : '/services';
                  return (
                    <a key={service.id} href={path} className="service-card-item">
                      <span className="fh-icon"><i className={service.icon}></i></span>
                      <h4 className="box-title"><span>{service.title}</span></h4>
                    </a>
                  );
                })}
              </div>
            );
          })()}

          <div className="extra-menu-item menu-item-button-link" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', marginTop: '30px' }}>
            <a href="#" className="fh-btn btn">Know More</a>
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
            {!loading && (
              <div key={partners.filter(p => p.status === 'active').map(p => p.id).join('-')} className="list-item slide-partener owl-carousel">
                {partners.filter(p => p.status === 'active').map((partner) => (
                  <div key={partner.id} className="partner-item">
                    <div className="partner-content">
                      <a href={partner.websiteUrl || '#'} target="_blank" rel="noopener noreferrer">
                        <img alt={partner.name} src={getImageUrl(partner.logo)} style={{ maxHeight: '60px', objectFit: 'contain' }} />
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
                          <a href={`/blog/${blog.slug || blog.id}`}><img src={getImageUrl(blog.image)} alt={blog.title} style={{ width: '100%', height: '240px', objectFit: 'cover' }} /></a>
                          <div className="entry-time">
                            <span className="day">{dayStr}</span>
                            <span className="month">{monthStr}</span>
                          </div>
                        </div>
                        <div className="entry-summary">
                          <div className="entry-meta clearfix">
                            <span className="meta author">by <a href="">{blog.author || 'easyfr8'}</a></span>
                            <span className="meta cat-links"><a href={`/blog/${blog.slug || blog.id}`}>{blog.category}</a></span>
                          </div>
                          <h2 className="entry-title"><a href={`/blog/${blog.slug || blog.id}`}>{blog.title}</a></h2>
                          <div className="entry-footer"><a href={`/blog/${blog.slug || blog.id}`}>Read More...</a></div>
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
    </div>
  )
}
