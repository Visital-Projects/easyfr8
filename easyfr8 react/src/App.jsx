import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { CmsProvider, useCms } from './context/CmsContext'
import { UserAuthProvider } from './pages/user/UserAuthContext'
import ProtectedRoute from './pages/user/ProtectedRoute'
import UserPortalLayout from './pages/user/UserPortalLayout'
import UserLogin from './pages/user/UserLogin'
import UserDashboard from './pages/user/UserDashboard'
import UserBookings from './pages/user/UserBookings'
import UserDocuments from './pages/user/UserDocuments'
import UserEnquiries from './pages/user/UserEnquiries'
import UserProfile from './pages/user/UserProfile'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import About from './pages/About'
import Contact from './pages/Contact'
import Tools from './pages/Tools'
import ServiceDetail from './pages/services/ServiceDetail'
import ServiceCategory from './pages/services/ServiceCategory'
import VolumetricWeightCalculator from './pages/tools/VolumetricWeightCalculator'
import Incoterms from './pages/tools/Incoterms'
import BlogSingle from './pages/BlogSingle'
import Blogs from './pages/Blogs'
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

/**
 * PublicLayout — Shared layout strictly for the public marketing website
 * Contains the public contact bar, main navbar, and public website footer.
 */
function PublicLayout() {
  return (
    <div id="page" className="header-transparent header-sticky">
      <div id="page-top"></div>
      <Preloader />
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <CmsProvider>
      <UserAuthProvider>
        <BrowserRouter>
          <Routes>
            {/* ── Standalone User Portal Auth (Zero Public Navbar / Footer) ── */}
            <Route path="/user/login" element={<UserLogin />} />
            <Route path="/user/register" element={<UserLogin />} />
            <Route path="/user/forgot-password" element={<UserLogin />} />
            <Route path="/user/reset-password" element={<UserLogin />} />

            {/* ── Dedicated User Portal Workspace (Protected, Portal Layout Only) ── */}
            <Route
              path="/user"
              element={
                <ProtectedRoute>
                  <UserPortalLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/user/dashboard" replace />} />
              <Route path="dashboard" element={<UserDashboard />} />
              <Route path="bookings" element={<UserBookings />} />
              <Route path="documents" element={<UserDocuments />} />
              <Route path="enquiries" element={<UserEnquiries />} />
              <Route path="profile" element={<UserProfile />} />
            </Route>

            {/* ── Public Website Routes (Shared Public Layout with Navbar & Footer) ── */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/tools" element={<Tools />} />
              <Route path="/blogs" element={<Blogs />} />
              <Route path="/blogs/:slugOrId" element={<BlogSingle />} />
              <Route path="/blog/:slugOrId" element={<BlogSingle />} />
              <Route path="/booking" element={<Booking />} />
              <Route path="/rates" element={<Rates />} />

              {/* Services Page and Category Services Routing */}
              <Route path="/services" element={<ServiceCategory />} />
              <Route path="/services/core-services" element={<ServiceCategory category="core" />} />
              <Route path="/services/core_services" element={<ServiceCategory category="core" />} />
              <Route path="/services/value-added-services" element={<ServiceCategory category="value-added" />} />
              <Route path="/services/value_added_services" element={<ServiceCategory category="value-added" />} />

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
            </Route>
          </Routes>
        </BrowserRouter>
      </UserAuthProvider>
    </CmsProvider>
  )
}
