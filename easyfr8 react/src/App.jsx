import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CmsProvider, useCms } from './context/CmsContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import About from './pages/About'
import Contact from './pages/Contact'
import Tools from './pages/Tools'
import ServiceDetail from './pages/services/ServiceDetail'
import VolumetricWeightCalculator from './pages/tools/VolumetricWeightCalculator'
import Incoterms from './pages/tools/Incoterms'
import BlogSingle from './pages/BlogSingle'
import Booking from './pages/Booking'
import Rates from './pages/Rates'

/**
 * Preloader — mirrors the original jQuery behaviour:
 *   $('.preloader').delay(200).fadeOut(500)
 *
 * - Shows the logo preloader on mount (position:fixed, z-index:999999)
 * - After 200 ms starts a CSS opacity/fade transition over 500 ms
 * - After the fade completes (700 ms total) the element is removed from DOM
 */
function Preloader() {
  const { loading } = useCms()
  // 'visible' → 'fading' → 'done'
  const [phase, setPhase] = useState('visible')
  const [minTimePassed, setMinTimePassed] = useState(false)

  // Trigger minimum 3.5-second timer on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimePassed(true)
    }, 3500) // 3.5 seconds minimum display time
    return () => clearTimeout(timer)
  }, [])

  // Transition phase when both loading is false and minimum time has passed
  useEffect(() => {
    if (!loading && minTimePassed && phase === 'visible') {
      setPhase('fading')
      const timer = setTimeout(() => {
        setPhase('done')
      }, 500) // 500ms transition fadeOut delay
      return () => clearTimeout(timer)
    }
  }, [loading, minTimePassed, phase])

  if (phase === 'done') return null

  return (
    <div
      className="preloader"
      style={{
        transition: 'opacity 0.5s ease',
        opacity: phase === 'fading' ? 0 : 1,
        pointerEvents: 'none',
      }}
    />
  )
}

function AppLayout({ children }) {
  return (
    <div id="page" className="header-transparent header-sticky">
      <div id="page-top"></div>
      {/* React-controlled preloader — replaces jQuery window.on('load') */}
      <Preloader />
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <CmsProvider>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/blog/:slugOrId" element={<BlogSingle />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/rates" element={<Rates />} />

            {/* Dynamic Services Routing */}
            <Route path="/services/:slug" element={<ServiceDetail />} />

            {/* Legacy Backward Compatibility Service Routes */}
            <Route path="/ocean-freight-forwarding" element={<ServiceDetail />} />
            <Route path="/air-freight-forwarding" element={<ServiceDetail />} />
            <Route path="/road-freight-forwarding" element={<ServiceDetail />} />
            <Route path="/warehousing" element={<ServiceDetail />} />
            <Route path="/door-to-door-delivery" element={<ServiceDetail />} />
            <Route path="/packaging-storage" element={<ServiceDetail />} />
            <Route path="/contract-handling" element={<ServiceDetail />} />
            <Route path="/cargo-insurance" element={<ServiceDetail />} />
            
            <Route path="/tools/volumetric-weight-calculator" element={<VolumetricWeightCalculator />} />
            <Route path="/tools/incoterms" element={<Incoterms />} />
            {/* Fallback */}
            <Route path="*" element={<Home />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </CmsProvider>
  )
}

