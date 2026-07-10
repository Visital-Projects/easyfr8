import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function Booking() {
  const location = useLocation()
  const navigate = useNavigate()

  // Parse URL query parameters
  const query = new URLSearchParams(location.search)
  const queryFromPort = query.get('fromPort') || ''
  const queryToPort = query.get('toPort') || ''
  const queryContainerType = query.get('containerType') || ''
  const queryFreightType = query.get('freight_type') || '' // fcl, lcl, air

  // Master collections fetched from DB
  const [freightTypes, setFreightTypes] = useState([])
  const [shipmentTypes, setShipmentTypes] = useState([])
  const [terms, setTerms] = useState([])
  const [ports, setPorts] = useState([])
  const [containers, setContainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Selected parameters / form state
  const [selectedFreightTypeId, setSelectedFreightTypeId] = useState('')
  const [selectedShipmentTypeId, setSelectedShipmentTypeId] = useState('')
  const [selectedTermId, setSelectedTermId] = useState('')
  const [selectedLoadingPortId, setSelectedLoadingPortId] = useState('')
  const [selectedDischargePortId, setSelectedDischargePortId] = useState('')
  const [finalDelivery, setFinalDelivery] = useState('')
  const [selectedContainerId, setSelectedContainerId] = useState('')
  const [cargoDetails, setCargoDetails] = useState('')

  // Customer Information
  const [userName, setUserName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // Submit flow states
  const [submitting, setSubmitting] = useState(false)
  const [bookingNo, setBookingNo] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Fetch all dynamic options on mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoading(true)
        const [resFt, resSt, resTerms, resPorts, resCont] = await Promise.all([
          fetch('/api/freight-types'),
          fetch('/api/shipment-types'),
          fetch('/api/terms'),
          fetch('/api/ports'),
          fetch('/api/containers')
        ])

        const dataFt = await resFt.json()
        const dataSt = await resSt.json()
        const dataTerms = await resTerms.json()
        const dataPorts = await resPorts.json()
        const dataCont = await resCont.json()

        setFreightTypes(Array.isArray(dataFt) ? dataFt.filter(f => f.status === 'active') : [])
        setShipmentTypes(Array.isArray(dataSt) ? dataSt.filter(s => s.status === 'active') : [])
        setTerms(Array.isArray(dataTerms) ? dataTerms.filter(t => t.status === 'active') : [])
        
        const activePorts = dataPorts.success && Array.isArray(dataPorts.ports) 
          ? dataPorts.ports.filter(p => p.status === 'active')
          : []
        setPorts(activePorts)

        const activeContainers = Array.isArray(dataCont) ? dataCont.filter(c => c.status === 'active') : []
        setContainers(activeContainers)

        // Resolve defaults based on parsed URL query parameters
        let resolvedFtId = ''
        let resolvedStId = ''
        let resolvedLoadingPortId = ''
        let resolvedDischargePortId = ''
        let resolvedContainerId = ''

        // 1. Resolve Freight type & Shipment Type from query param
        if (queryFreightType) {
          const matchedSt = dataSt.find(st => st.name.toLowerCase() === queryFreightType.toLowerCase())
          if (matchedSt) {
            resolvedStId = matchedSt.id
            resolvedFtId = matchedSt.freight_type_id
          } else if (queryFreightType.toLowerCase() === 'air') {
            const airSt = dataSt.find(st => st.freight_type_id === 'air-freight')
            if (airSt) {
              resolvedStId = airSt.id
              resolvedFtId = 'air-freight'
            }
          }
        }

        if (!resolvedFtId && Array.isArray(dataFt) && dataFt.length > 0) {
          resolvedFtId = dataFt[0].id
        }

        // 2. Resolve loading and discharge ports
        if (queryFromPort) {
          const matchPort = activePorts.find(p => p.port_code.toUpperCase() === queryFromPort.toUpperCase())
          if (matchPort) resolvedLoadingPortId = matchPort.id
        }
        if (queryToPort) {
          const matchPort = activePorts.find(p => p.port_code.toUpperCase() === queryToPort.toUpperCase())
          if (matchPort) resolvedDischargePortId = matchPort.id
        }

        // 3. Resolve container type
        if (queryContainerType) {
          // Normalize both for comparison (e.g. 40OpenTop vs 40 Open Top)
          const normQuery = queryContainerType.toLowerCase().replace(/[^a-z0-9]/g, '')
          const matchCont = activeContainers.find(c => c.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normQuery)
          if (matchCont) resolvedContainerId = matchCont.id
        }

        // Set state values
        setSelectedFreightTypeId(resolvedFtId)
        
        if (resolvedStId) {
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
        setError('Failed to load booking master data.')
      } finally {
        setLoading(false)
      }
    }

    fetchOptions()
  }, [queryFromPort, queryToPort, queryContainerType, queryFreightType])

  // Handle Tab Switch (Ocean / Air)
  const handleFreightTypeTabChange = (ftId) => {
    setSelectedFreightTypeId(ftId)
    // Automatically select the first shipment type of this new mode
    const modeSts = shipmentTypes.filter(st => st.freight_type_id === ftId)
    if (modeSts.length > 0) {
      setSelectedShipmentTypeId(modeSts[0].id)
    } else {
      setSelectedShipmentTypeId('')
    }
  }

  // Filter Ports by mode selection
  const currentFreightTypeName = freightTypes.find(ft => ft.id === selectedFreightTypeId)?.name || ''
  const isAirMode = currentFreightTypeName.toLowerCase().includes('air')
  const filteredPorts = ports.filter(p => isAirMode ? p.freight_type === 'Air' : p.freight_type === 'Ocean')

  // Check if current selected shipment type is FCL to render Container dropdown conditional
  const currentShipmentTypeName = shipmentTypes.find(st => st.id === selectedShipmentTypeId)?.name || ''
  const isFCL = currentShipmentTypeName.toUpperCase() === 'FCL'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!userName || !email || !selectedTermId || !selectedLoadingPortId || !selectedDischargePortId) {
      alert('Please fill out all required fields.')
      return
    }

    setSubmitting(true)
    setError(null)

    const payload = {
      user_name: userName,
      email,
      phone,
      freight_type_id: selectedFreightTypeId,
      shipment_type_id: selectedShipmentTypeId,
      term_id: selectedTermId,
      loading_port_id: selectedLoadingPortId,
      discharge_port_id: selectedDischargePortId,
      container_id: isFCL ? selectedContainerId : null,
      cargo_details: `Final Delivery Place: ${finalDelivery}\nCargo: ${cargoDetails}`
    }

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (res.ok && data.success) {
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
        <div className="container" style={{ maxWidth: '850px', margin: '0 auto' }}>
          
          {submitSuccess ? (
            <div style={{ background: '#fff', padding: '50px 30px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', color: '#28a745', marginBottom: '20px' }}>✓</div>
              <h2 style={{ fontWeight: 700, color: '#333', fontSize: '26px', marginBottom: '15px' }}>Booking Created Successfully!</h2>
              <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.6', maxWidth: '600px', margin: '0 auto 25px auto' }}>
                Your freight shipment request has been recorded. Our customer operations desk will finalize documentation and reach out to you within 2 hours.
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
            <div style={{ background: '#fff', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', borderRadius: '6px', overflow: 'hidden' }}>
              
              {/* Dynamic Header Tabs */}
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

              {/* Booking Checkout Form */}
              <form onSubmit={handleSubmit} style={{ padding: '35px' }}>
                {error && (
                  <div style={{ background: '#fdf7f7', border: '1px solid #f5c6cb', color: '#721c24', padding: '12px', borderRadius: '4px', marginBottom: '25px', fontSize: '14px' }}>
                    {error}
                  </div>
                )}

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
                              textAlign: 'center'
                            }}
                          >
                            <input 
                              type="radio" 
                              name="shipment_type" 
                              value={st.id} 
                              checked={isSelected}
                              onChange={() => setSelectedShipmentTypeId(st.id)}
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
                </div>

                {/* 2. Form Fields Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                  
                  {/* Incoterms (Terms) */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#333', marginBottom: '6px' }}>
                      Incoterms (Terms) <span style={{ color: '#d64238' }}>*</span>
                    </label>
                    <select
                      className="form-control"
                      value={selectedTermId}
                      onChange={e => setSelectedTermId(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', height: '42px' }}
                    >
                      <option value="">-- Choose Incoterm --</option>
                      {terms.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Loading Port */}
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#333', marginBottom: '6px' }}>
                      {isAirMode ? 'Airport of Departure *' : 'Port of Loading *'}
                    </label>
                    <select
                      className="form-control"
                      value={selectedLoadingPortId}
                      onChange={e => setSelectedLoadingPortId(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', height: '42px' }}
                    >
                      <option value="">-- Select Departure --</option>
                      {filteredPorts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.port_name} ({p.port_code}) - {p.country}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Discharge Port */}
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#333', marginBottom: '6px' }}>
                      {isAirMode ? 'Airport of Arrival *' : 'Port of Discharge *'}
                    </label>
                    <select
                      className="form-control"
                      value={selectedDischargePortId}
                      onChange={e => setSelectedDischargePortId(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', height: '42px' }}
                    >
                      <option value="">-- Select Arrival --</option>
                      {filteredPorts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.port_name} ({p.port_code}) - {p.country}
                        </option>
                      ))}
                    </select>
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

                  {/* Container Selection (rendered conditionally only for FCL ocean) */}
                  {isFCL && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#333', marginBottom: '6px' }}>
                        Container Type
                      </label>
                      <select
                        className="form-control"
                        value={selectedContainerId}
                        onChange={e => setSelectedContainerId(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', height: '42px' }}
                      >
                        <option value="">-- Select Container --</option>
                        {containers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.description ? `(${c.description})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Cargo Details */}
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

                </div>

                {/* 3. Customer Info Section */}
                <h3 style={{ borderBottom: '1px solid #eaeaea', paddingBottom: '10px', margin: '30px 0 20px 0', fontSize: '16px', fontWeight: 700, color: '#333' }}>
                  Customer Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '35px' }}>
                  
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#333', marginBottom: '6px' }}>
                      Your Full Name <span style={{ color: '#d64238' }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={userName}
                      onChange={e => setUserName(e.target.value)}
                      required
                      placeholder="e.g. John Doe"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#333', marginBottom: '6px' }}>
                      Email Address <span style={{ color: '#d64238' }}>*</span>
                    </label>
                    <input 
                      type="email" 
                      className="form-control"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="e.g. john@company.com"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#333', marginBottom: '6px' }}>
                      Phone Number
                    </label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="e.g. +1 555-0199"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px' }}
                    />
                  </div>

                </div>

                {/* Submit action */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn"
                  style={{
                    width: '100%',
                    background: '#d64238',
                    color: 'white',
                    border: 'none',
                    padding: '14px',
                    fontWeight: 700,
                    fontSize: '15px',
                    borderRadius: '4px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.8 : 1,
                    textTransform: 'uppercase'
                  }}
                >
                  {submitting ? 'Creating Booking...' : 'Submit / Continue Booking'}
                </button>

              </form>

            </div>
          )}

        </div>
      </section>
    </div>
  )
}
