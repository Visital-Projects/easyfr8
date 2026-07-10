import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCms } from '../context/CmsContext'

export default function Rates() {
  const { submitEnquiry } = useCms()
  const location = useLocation()
  const navigate = useNavigate()
  
  // Parse query parameters
  const query = new URLSearchParams(location.search)
  const mode_id = query.get('mode_id') || ''
  const shipment_type_id = query.get('shipment_type_id') || ''
  const origin_id = query.get('origin_id') || ''
  const destination_id = query.get('destination_id') || ''
  const container_id = query.get('container_id') || ''
  const weight = query.get('weight') || ''
  const weightUnit = query.get('weightUnit') || 'KG'

  // Master collections for label resolution
  const [modes, setModes] = useState([])
  const [shipmentTypes, setShipmentTypes] = useState([])
  const [locations, setLocations] = useState([])
  const [containers, setContainers] = useState([])
  const [matchedRates, setMatchedRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Booking Enquiry form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true)
        const [resRates, resModes, resShipmentTypes, resLocations, resContainers] = await Promise.all([
          fetch(`/api/freight-rates?mode_id=${mode_id}&shipment_type_id=${shipment_type_id}&origin_id=${origin_id}&destination_id=${destination_id}&container_id=${container_id || ''}`),
          fetch('/api/freight/modes'),
          fetch('/api/shipment-types'),
          fetch('/api/locations'),
          fetch('/api/containers')
        ])

        const [dataRates, dataModes, dataShipmentTypes, dataLocations, dataContainers] = await Promise.all([
          resRates.json(),
          resModes.json(),
          resShipmentTypes.json(),
          resLocations.json(),
          resContainers.json()
        ])

        if (Array.isArray(dataRates)) setMatchedRates(dataRates)
        if (Array.isArray(dataModes)) setModes(dataModes)
        if (Array.isArray(dataShipmentTypes)) setShipmentTypes(dataShipmentTypes)
        if (Array.isArray(dataLocations)) setLocations(dataLocations)
        if (Array.isArray(dataContainers)) setContainers(dataContainers)
      } catch (err) {
        console.error(err)
        setError('Failed to fetch search results from server.')
      } finally {
        setLoading(false)
      }
    }
    
    if (mode_id && shipment_type_id && origin_id && destination_id) {
      fetchAllData()
    } else {
      setError('Invalid search parameters.')
      setLoading(false)
    }
  }, [mode_id, shipment_type_id, origin_id, destination_id, container_id])

  // Resolve metadata labels
  const modeName = modes.find(m => m.id === mode_id)?.name || 'Freight Mode'
  const shipmentName = shipmentTypes.find(t => t.id === shipment_type_id)?.name || 'Shipment'
  
  const originLoc = locations.find(l => l.id === origin_id)
  const originLabel = originLoc ? `${originLoc.name} (${originLoc.port_code}) - ${originLoc.country}` : 'Origin'
  
  const destLoc = locations.find(l => l.id === destination_id)
  const destLabel = destLoc ? `${destLoc.name} (${destLoc.port_code}) - ${destLoc.country}` : 'Destination'
  
  const containerName = containers.find(c => c.id === container_id)?.name || 'Container'

  const handleEnquirySubmit = async (e) => {
    e.preventDefault()
    if (!name || !email) {
      alert('Name and Email are required fields.')
      return
    }
    
    setSubmitting(true)
    setSubmitError(null)
    
    const selectedRate = matchedRates[0]
    const rateDetails = selectedRate 
      ? `Rate ID: ${selectedRate.id}\nCarrier: ${selectedRate.carrier}\nCost: $${selectedRate.price}\nTransit: ${selectedRate.transit_time} days`
      : 'Custom Quote Requested (No direct rates matched)'

    const subject = `Booking Inquiry: ${modeName} (${shipmentName}) from ${originLoc?.name} to ${destLoc?.name}`
    const messageDetails = `
=== Booking Details ===
Freight Mode: ${modeName}
Shipment Type: ${shipmentName}
Origin: ${originLabel}
Destination: ${destLabel}
${container_id ? `Container Type: ${containerName}\n` : ''}${weight ? `Weight: ${weight} ${weightUnit}\n` : ''}
=== Pricing Quote ===
${rateDetails}

=== Additional Notes ===
${notes}
`
    try {
      const success = await submitEnquiry({
        name,
        email,
        phone,
        subject,
        notes: messageDetails,
        source: 'Freight Search Form'
      })
      if (success) {
        setSubmitted(true)
      } else {
        throw new Error('Enquiry submission returned false status.')
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit enquiry. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div id="page">
      {/* Page Header */}
      <div className="page-header title-area">
        <div className="header-title">
          <div className="container">
            <div className="row">
              <div className="col-md-12 col-sm-12 col-xs-12">
                <h1 className="page-title">Freight Rates & Booking</h1>
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
                  <span>Dynamic Search Results</span>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="secpadd">
        <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="row">
            
            {/* Left Column: Search details & rate results */}
            <div className="col-md-7 col-sm-12">
              <div style={{ background: '#fff', padding: '25px', boxShadow: '0 4px 10px rgba(0,0,0,0.08)', borderRadius: '4px', marginBottom: '30px' }}>
                <h3 style={{ borderBottom: '2px solid #d64238', paddingBottom: '10px', marginBottom: '20px', color: '#111', fontSize: '20px', fontWeight: 700 }}>
                  Search Query Details
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px 30px', fontSize: '14px', color: '#555', marginBottom: '25px' }}>
                  <div>
                    <strong style={{ color: '#222' }}>Freight Mode:</strong>
                    <div style={{ marginTop: '3px' }}>{modeName}</div>
                  </div>
                  <div>
                    <strong style={{ color: '#222' }}>Shipment Type:</strong>
                    <div style={{ marginTop: '3px' }}>{shipmentName}</div>
                  </div>
                  {container_id && (
                    <div>
                      <strong style={{ color: '#222' }}>Container Type:</strong>
                      <div style={{ marginTop: '3px' }}>{containerName}</div>
                    </div>
                  )}
                  {weight && (
                    <div>
                      <strong style={{ color: '#222' }}>Weight:</strong>
                      <div style={{ marginTop: '3px' }}>{weight} {weightUnit}</div>
                    </div>
                  )}
                  <div style={{ gridColumn: 'span 2' }}>
                    <strong style={{ color: '#222' }}>Origin:</strong>
                    <div style={{ marginTop: '3px' }}>{originLabel}</div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <strong style={{ color: '#222' }}>Destination:</strong>
                    <div style={{ marginTop: '3px' }}>{destLabel}</div>
                  </div>
                </div>

                <h3 style={{ borderBottom: '2px solid #d64238', paddingBottom: '10px', marginBottom: '20px', color: '#111', fontSize: '20px', fontWeight: 700 }}>
                  Available Rates
                </h3>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: '#666' }}>Searching rates...</div>
                ) : error ? (
                  <div style={{ background: '#fdf7f7', color: '#d64238', padding: '15px', borderRadius: '4px' }}>{error}</div>
                ) : matchedRates.length > 0 ? (
                  matchedRates.map((rate, idx) => (
                    <div key={rate.id || idx} style={{ background: '#fcfcfc', border: '1px solid #e6e6e6', borderRadius: '4px', padding: '20px', marginBottom: '15px', position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '12px', background: '#e8d4d4', color: '#d64238', padding: '3px 8px', borderRadius: '3px', display: 'inline-block', fontWeight: 600, textTransform: 'uppercase', marginBottom: '10px' }}>
                            Carrier: {rate.carrier}
                          </div>
                          <h4 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: 700, color: '#333' }}>
                            {rate.origin_name} → {rate.destination_name}
                          </h4>
                          <div style={{ fontSize: '13px', color: '#666' }}>
                            {rate.container_name ? `Container: ${rate.container_name} · ` : ''}Transit: {rate.transit_time} Days
                          </div>
                          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                            Rate ID: {rate.id}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '28px', fontWeight: 800, color: '#d64238' }}>
                            ${rate.price}
                          </span>
                          <div style={{ fontSize: '11px', color: '#999' }}>USD Freight Charge</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ background: '#fdf7f7', borderLeft: '4px solid #d64238', padding: '15px', borderRadius: '0 4px 4px 0', color: '#721c24' }}>
                    <strong>No direct matching rate found in our database.</strong>
                    <div style={{ fontSize: '13px', marginTop: '5px' }}>
                      Don't worry! You can submit a custom quotation request using the form on the right, and our freight operations desk will send you a personalized quote within 2 hours.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Enquiry Form */}
            <div className="col-md-5 col-sm-12">
              <div style={{ background: '#fff', padding: '25px', boxShadow: '0 4px 10px rgba(0,0,0,0.08)', borderRadius: '4px' }}>
                <h3 style={{ borderBottom: '2px solid #d64238', paddingBottom: '10px', marginBottom: '20px', color: '#111', fontSize: '20px', fontWeight: 700 }}>
                  Book / Request Quote
                </h3>

                {submitted ? (
                  <div style={{ textAlign: 'center', padding: '40px 10px' }}>
                    <div style={{ fontSize: '48px', color: '#28a745', marginBottom: '15px' }}>✓</div>
                    <h4 style={{ fontWeight: 700, color: '#333', marginBottom: '10px' }}>Inquiry Submitted!</h4>
                    <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.5' }}>
                      Your inquiry has been successfully sent to the EasyFr8 bookings desk. We have recorded your query and will contact you via email shortly.
                    </p>
                    <button 
                      onClick={() => navigate('/')} 
                      className="btn" 
                      style={{ background: '#d64238', color: 'white', border: 'none', padding: '10px 20px', fontWeight: 600, marginTop: '20px', cursor: 'pointer' }}
                    >
                      Back to Homepage
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleEnquirySubmit}>
                    {submitError && (
                      <div style={{ background: '#fdf7f7', border: '1px solid #f5c6cb', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '13px' }}>
                        {submitError}
                      </div>
                    )}
                    <div className="form-group" style={{ marginBottom: '15px' }}>
                      <label style={{ fontWeight: 600, fontSize: '13px', color: '#333', display: 'block', marginBottom: '5px' }}>
                        Your Full Name <span style={{ color: '#d64238' }}>*</span>
                      </label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        required 
                        placeholder="e.g. John Doe"
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '15px' }}>
                      <label style={{ fontWeight: 600, fontSize: '13px', color: '#333', display: 'block', marginBottom: '5px' }}>
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

                    <div className="form-group" style={{ marginBottom: '15px' }}>
                      <label style={{ fontWeight: 600, fontSize: '13px', color: '#333', display: 'block', marginBottom: '5px' }}>
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

                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label style={{ fontWeight: 600, fontSize: '13px', color: '#333', display: 'block', marginBottom: '5px' }}>
                        Remarks / Cargo Details
                      </label>
                      <textarea 
                        className="form-control" 
                        value={notes} 
                        onChange={e => setNotes(e.target.value)} 
                        placeholder="Type any specific requests, preferred carriers, commodity type, or packaging details..."
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', minHeight: '80px', resize: 'vertical' }}
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="btn" 
                      disabled={submitting}
                      style={{ 
                        width: '100%', 
                        background: '#d64238', 
                        color: 'white', 
                        border: 'none', 
                        padding: '12px', 
                        fontWeight: 600, 
                        fontSize: '15px', 
                        borderRadius: '4px',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        opacity: submitting ? 0.8 : 1
                      }}
                    >
                      {submitting ? 'Submitting...' : matchedRates.length > 0 ? 'Proceed with Booking' : 'Request Custom Quote'}
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  )
}
