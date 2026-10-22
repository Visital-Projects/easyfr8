import React, { useState, useEffect } from 'react'
import { useCms } from '../context/CmsContext'

export default function RouteEnquiryModal({ isOpen, onClose, searchContext, onSuccess }) {
  const { submitEnquiry } = useCms()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [submittedEnquiry, setSubmittedEnquiry] = useState(null)
  const [shipperUserId, setShipperUserId] = useState('')

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (!isOpen) {
      setSuccess(false)
      setError(null)
      setSubmittedEnquiry(null)
      return
    }

    // Attempt to prefill from logged-in customer session
    let defaultName = ''
    let defaultEmail = ''
    let defaultPhone = ''
    let defaultUid = ''
    try {
      const stored = localStorage.getItem('easyfr8_user')
      if (stored) {
        const u = JSON.parse(stored)
        defaultName = u.name || ''
        defaultEmail = u.email || ''
        defaultPhone = u.phone || ''
        defaultUid = u.id || u.user_id || u._id || ''
      }
    } catch (e) {
      // ignore parse error
    }
    setName(defaultName)
    setEmail(defaultEmail)
    setPhone(defaultPhone)
    setShipperUserId(defaultUid)
    setQuantity(searchContext?.quantity || 1)

    const origin = searchContext?.originText || 'Origin'
    const dest = searchContext?.destinationText || 'Destination'
    const transhipment = searchContext?.transhipmentText || ''
    const mode = searchContext?.modeName || 'Ocean Freight'
    const shipment = searchContext?.shipmentTypeName || ''
    const container = searchContext?.containerName || ''
    const weight = searchContext?.weight ? `${searchContext.weight} ${searchContext.weightUnit || 'KG'}` : ''

    const routeDisplay = transhipment 
      ? `${origin} → Via ${transhipment} → ${dest}` 
      : `${origin} → ${dest}`

    // Dynamic intelligent subject
    if (searchContext?.containerId || searchContext?.containerName) {
      setSubject(`Container Rate Enquiry — ${origin} to ${dest} (${container})`)
    } else if (searchContext?.reason === 'origin_not_found') {
      setSubject(`Port Enquiry — Availability for ${origin}`)
    } else if (searchContext?.reason === 'destination_not_found') {
      setSubject(`Port Enquiry — Availability for ${dest}`)
    } else if (searchContext?.reason === 'transhipment_not_found') {
      setSubject(`Transhipment Port Enquiry — Availability for ${transhipment}`)
    } else {
      setSubject(`Rate Enquiry — ${routeDisplay}`)
    }

    // Dynamic helpful pre-filled message
    let defaultMsg = `I am requesting freight rate pricing for the following shipment:\n\n`
    defaultMsg += `Shipment Details:\n`
    defaultMsg += `• Route: ${routeDisplay}\n`
    if (searchContext?.routeId) defaultMsg += `• Route Reference ID: ${searchContext.routeId}\n`
    if (searchContext?.carrier) defaultMsg += `• Preferred Carrier: ${searchContext.carrier}\n`
    defaultMsg += `• Freight Mode: ${mode}${shipment ? ` (${shipment})` : ''}\n`
    if (transhipment) defaultMsg += `• Transshipment Port: ${transhipment}\n`
    if (container) defaultMsg += `• Container Specification: ${container}${searchContext?.containerId ? ` (ID: ${searchContext.containerId})` : ''}\n`
    if (weight) defaultMsg += `• Cargo Weight: ${weight}\n`
    defaultMsg += `\nPlease provide contract availability, transit schedule, and competitive freight pricing.`

    setMessage(defaultMsg)
    setError(null)
    setSuccess(false)
    setSubmittedEnquiry(null)
  }, [isOpen, searchContext])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    if (!name.trim() || name.trim().length < 2) {
      setError('Please provide your full name (at least 2 characters).')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1)

    setSubmitting(true)
    setError(null)

    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      subject: subject.trim(),
      message: message.trim(),
      origin: searchContext?.originText || '',
      destination: searchContext?.destinationText || '',
      transhipment: searchContext?.transhipmentText || '',
      route_id: searchContext?.routeId || '',
      carrier: searchContext?.carrier || '',
      transit_time: searchContext?.transitTime || '',
      container_id: searchContext?.containerId || '',
      container_type: searchContext?.containerName || '',
      quantity: qty,
      user_id: shipperUserId || searchContext?.userId || '',
      freight_type: searchContext?.modeName || 'Ocean Freight',
      shipment_type: searchContext?.shipmentTypeName || '',
      weight: searchContext?.weight ? `${searchContext.weight} ${searchContext.weightUnit || 'KG'}` : '',
      source: searchContext?.containerId ? 'Container Pricing Enquiry' : 'Route Search Enquiry'
    }

    try {
      const res = await submitEnquiry(payload)
      if (res && (res.success || res.enquiry)) {
        const saved = res.enquiry || payload
        setSubmittedEnquiry(saved)
        setSuccess(true)
        if (onSuccess) onSuccess(saved)
      } else {
        throw new Error('Server returned an unexpected response. Please try again.')
      }
    } catch (err) {
      console.error('[Enquiry] Submission error:', err)
      setError(err.message || 'Failed to send enquiry. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(2, 8, 59, 0.7)',
        backdropFilter: 'blur(3px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose()
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '620px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          animation: 'fadeInModal 0.2s ease-out'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            backgroundColor: '#02083b',
            color: '#ffffff',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '3px solid #d64238'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#d64238' }}>✦</span> Route &amp; Rate Enquiry
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#cbd5e1' }}>
              We'll check custom schedules and rates with our global partner network.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '22px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              lineHeight: 1,
              padding: '4px 8px',
              opacity: 0.8
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* Route & Container Context Pill */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderLeft: '4px solid #d64238',
              borderRadius: '6px',
              padding: '14px 18px',
              marginBottom: '20px',
              fontSize: '13px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
              <div>
                <strong style={{ color: '#0f172a' }}>Requested Route:</strong>{' '}
                <span style={{ color: '#d64238', fontWeight: 700 }}>
                  {searchContext?.originText || 'Origin'} → {searchContext?.transhipmentText ? `Via ${searchContext.transhipmentText} → ` : ''}{searchContext?.destinationText || 'Destination'}
                </span>
              </div>
              {searchContext?.routeId && (
                <span style={{ fontSize: '11px', background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  Route ID: {searchContext.routeId}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12px', color: '#64748b' }}>
              {searchContext?.containerName && (
                <span>
                  <strong style={{ color: '#334155' }}>Container:</strong>{' '}
                  <span style={{ color: '#d64238', fontWeight: 600 }}>
                    {searchContext.containerName}
                  </span>
                  {searchContext?.containerId && ` (${searchContext.containerId})`}
                </span>
              )}
              {searchContext?.carrier && (
                <span>
                  <strong style={{ color: '#334155' }}>Carrier:</strong> {searchContext.carrier}
                </span>
              )}
              {searchContext?.transitTime && (
                <span>
                  <strong style={{ color: '#334155' }}>Transit:</strong> {searchContext.transitTime} Days
                </span>
              )}
              <span>
                <strong style={{ color: '#334155' }}>Mode:</strong> {searchContext?.modeName || 'Ocean Freight'} {searchContext?.shipmentTypeName ? `(${searchContext.shipmentTypeName})` : ''}
              </span>
            </div>
          </div>

          {success ? (
            <div style={{ textAlign: 'center', padding: '24px 12px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  margin: '0 auto 16px',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.2)'
                }}
              >
                ✓
              </div>
              <h4 style={{ fontSize: '20px', fontWeight: 700, color: '#166534', margin: '0 0 8px' }}>
                Enquiry Submitted Successfully!
              </h4>
              {submittedEnquiry?.id && (
                <div style={{
                  display: 'inline-block',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '13px',
                  fontWeight: 700,
                  padding: '4px 14px',
                  borderRadius: '16px',
                  marginBottom: '16px'
                }}>
                  Enquiry Reference: <span style={{ color: '#d64238' }}>{submittedEnquiry.id}</span>
                </div>
              )}
              <p style={{ color: '#4b5563', fontSize: '14px', lineHeight: '1.6', maxWidth: '480px', margin: '0 auto 20px' }}>
                Your freight enquiry has been securely saved to our database. Our commercial operations team will review route availability and email customized contract rates to <strong>{submittedEnquiry?.email || email}</strong> shortly.
              </p>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '14px',
                maxWidth: '460px',
                margin: '0 auto 24px',
                textAlign: 'left',
                fontSize: '12px',
                color: '#475569'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '6px', rowGap: '6px' }}>
                  <span style={{ fontWeight: 600 }}>Route:</span>
                  <span>{searchContext?.originText} → {searchContext?.destinationText}</span>
                  {searchContext?.containerName && (
                    <>
                      <span style={{ fontWeight: 600 }}>Container:</span>
                      <span>{searchContext.containerName}</span>
                    </>
                  )}
                  <span style={{ fontWeight: 600 }}>Quantity:</span>
                  <span>{quantity} container(s)</span>
                  <span style={{ fontWeight: 600 }}>Contact:</span>
                  <span>{name} ({email})</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: '#d64238',
                  color: 'white',
                  border: 'none',
                  padding: '10px 32px',
                  fontWeight: 600,
                  fontSize: '14px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(214, 66, 56, 0.3)'
                }}
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    padding: '12px 16px',
                    borderRadius: '4px',
                    marginBottom: '18px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Full Name <span style={{ color: '#d64238' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Rahul Sharma"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Email Address <span style={{ color: '#d64238' }}>*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="e.g. rahul@company.com"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Required Quantity (Units)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="1"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Subject <span style={{ color: '#d64238' }}>*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Enquiry Message &amp; Shipment Requirements <span style={{ color: '#d64238' }}>*</span>
                </label>
                <textarea
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: '#d64238',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 26px',
                    fontSize: '14px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.75 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {submitting ? (
                    <>
                      <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      Sending Enquiry...
                    </>
                  ) : (
                    'Submit Enquiry'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeInModal {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
