import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const CmsContext = createContext(undefined);

// Standalone default fallbacks to ensure client UI never breaks if API is unreachable
const defaultCMS = {
  homepage: {
    heroTitle: 'Connecting Global Markets Seamlessly',
    heroSubtitle: 'Your trusted freight forwarding partner with instant digital rate booking and automated compliance tracking.',
    heroImage: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Get Instant Quote',
    ctaLink: '/quote',
    testimonials: [
      { id: 1, author: 'Marcus Aurelius', company: 'Rome Logistics Ltd', text: 'EasyFr8 transformed our freight procurement cycle. We get instant rate transparency and complete visibility.', logo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=80&h=80', rating: 5 },
      { id: 2, author: 'Sarah Jenkins', company: 'Apex Global Trade', text: 'The CSV rate upload and compliance tracking saved our operations team hundreds of administrative hours per month.', logo: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=80&h=80', rating: 5 }
    ],
    featuredServices: [
      { id: 1, title: 'Lightning Speed Results', desc: 'Instant rates and bookings in seconds, replacing traditional 1-2 day lead times with AI-powered real-time processing.', sortOrder: 1 },
      { id: 2, title: 'Complete Visibility', desc: 'AI & ML-driven services and rate comparisons across all available options, bringing unprecedented transparency to freight decisions.', sortOrder: 2 },
      { id: 3, title: 'Unified Platform', desc: 'Multimodal logistics solutions under one roof – ocean, air, road, and rail options accessible with a single click.', sortOrder: 3 },
      { id: 4, title: 'Value-Added Services', desc: 'Door-to-door delivery, insurance, and cost liability management integrated seamlessly into our platform.', sortOrder: 4 },
      { id: 5, title: 'Knowledge Bank', desc: 'Buyer-seller discovery tools and comprehensive trade-related reports to support strategic decision-making.', sortOrder: 5 }
    ]
  },
  aboutUs: {
    overview: 'EasyFr8 is a pioneer in digital freight forwarding, founded in 2024 to simplify complex global trade supply chains.',
    mission: 'To simplify Logistics for MSMEs for bringing efficiencies thereby increasing productivity.',
    vision: 'To make competitive rates and services accessible to MSMEs through an online Supply Chain Solutions platform.',
    coreValues: 'Integrity, Innovation, Intelligence.'
  },
  services: [
    { id: 1, title: 'Ocean Freight Forwarding', slug: 'ocean-freight-forwarding', category: 'core', icon: 'anchor', desc: 'Global container shipping with flexible contract rates.', active: true, sortOrder: 1 },
    { id: 2, title: 'Air Freight Forwarding', slug: 'air-freight-forwarding', category: 'core', icon: 'plane', desc: 'Next-flight-out express delivery for urgent cargo.', active: true, sortOrder: 2 },
    { id: 3, title: 'Road Freight Forwarding', slug: 'road-freight-forwarding', category: 'core', icon: 'truck', desc: 'Reliable domestic port-to-warehouse drayage transport.', active: true, sortOrder: 3 },
    { id: 4, title: 'Warehousing', slug: 'warehousing', category: 'core', icon: 'package', desc: 'Secure storage and rapid distributions.', active: true, sortOrder: 4 },
    { id: 5, title: 'Custom Clearance', slug: 'custom-clearance', category: 'value-added', icon: 'shield', desc: 'Automated compliance clearing and duty payments.', active: true, sortOrder: 5 },
    { id: 6, title: 'CFS', slug: 'cfs', category: 'value-added', icon: 'box', desc: 'Container Freight Station handling and consolidation.', active: true, sortOrder: 6 },
    { id: 7, title: 'Contract Handling', slug: 'contract-handling', category: 'value-added', icon: 'briefcase', desc: 'Enterprise logistics contract execution and planning.', active: true, sortOrder: 7 },
    { id: 8, title: 'Cargo Insurance', slug: 'cargo-insurance', category: 'value-added', icon: 'umbrella', desc: 'Comprehensive cargo transit liability coverage.', active: true, sortOrder: 8 }
  ],
  contact: {
    phones: ['+91 7011 874 347', '+91 8076 466 266'],
    emails: ['info@easyfr8.com', 'support@easyfr8.com'],
    officeAddress: 'Value Envision India Pvt Ltd, Bank More, Dhanbad, Jharkhand - 826001',
    socialLinks: {
      twitter: 'https://twitter.com/easyfr8',
      linkedin: 'https://linkedin.com/company/easyfr8',
      facebook: 'https://facebook.com/easyfr8',
      instagram: '',
      youtube: '',
      whatsapp: '',
      googleMapsEmbed: ''
    },
    copyright: 'Copyright @ 2025 vnvision, All Right Reserved',
    logoImage: '',
    footerAbout: 'EasyFr8 simplifies global trade supply chains through instant digital freight rate booking and automated compliance tracking.',
  }
};

const defaultSlides = [
  {
    id: 'slide-1',
    title: 'Connecting Global Markets Seamlessly',
    subtitle: 'Lightning Speed Results',
    description: 'Your trusted freight forwarding partner with instant digital rate booking and automated compliance tracking.',
    button_text: 'Get Instant Quote',
    button_url: '/quote',
    image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80',
    status: 'active',
  },
  {
    id: 'slide-2',
    title: 'COMPLETE VISIBILITY',
    subtitle: 'TRANSPARENT TRACKING',
    description: 'Buyer-seller discovery tools and comprehensive trade-related reports to support strategic business growth.',
    button_text: 'View Rates',
    button_url: '/rates',
    image: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=1200&q=80',
    status: 'active',
  },
  {
    id: 'slide-3',
    title: 'UNIFIED PLATFORM',
    subtitle: 'MULTIMODAL LOGISTICS',
    description: 'Multimodal logistics solutions under one roof - ocean, air and road options in a single click.',
    button_text: 'Learn More',
    button_url: '/about',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
    status: 'active',
  }
];

// Default partner fallbacks — used only if API is unreachable
const defaultPartners = [
  { id: 'partner-1', name: 'LX Pantos', logo: '/uploads/partners/Picture1.png', websiteUrl: '#', status: 'active', sort_order: 1 },
  { id: 'partner-2', name: 'Saatvik', logo: '/uploads/partners/Picture2.jpg', websiteUrl: '#', status: 'active', sort_order: 2 },
  { id: 'partner-3', name: 'Bircher', logo: '/uploads/partners/Picture3.png', websiteUrl: '#', status: 'active', sort_order: 3 },
  { id: 'partner-4', name: 'Hyundai Glovis', logo: '/uploads/partners/Picture4.png', websiteUrl: '#', status: 'active', sort_order: 4 },
  { id: 'partner-5', name: 'Elite Green', logo: '/uploads/partners/Picture5.png', websiteUrl: '#', status: 'active', sort_order: 5 },
  { id: 'partner-6', name: 'Cargo Logistics', logo: '/uploads/partners/Picture6.png', websiteUrl: '#', status: 'active', sort_order: 6 },
];

// Default statistics fallbacks — used only if API is unreachable
const defaultStatistics = [
  { id: 'stat-1', label: 'Projects Completed', value: '1500+', icon: 'flaticon-transport-9', status: 'active', sort_order: 1 },
  { id: 'stat-2', label: 'Clients Served', value: '120+', icon: 'flaticon-people', status: 'active', sort_order: 2 },
  { id: 'stat-3', label: 'Global Shipments', value: '5000+', icon: 'flaticon-route', status: 'active', sort_order: 3 },
  { id: 'stat-4', label: 'Countries Connected', value: '50+', icon: 'flaticon-international-delivery', status: 'active', sort_order: 4 },
];

// Default industries fallbacks — used only if API is unreachable
const defaultIndustries = [
  { id: 'ind-1', title: 'Machinery And Equipment', desc: 'Heavy machinery and industrial equipment transport', icon: 'flaticon-cogwheel', status: 'active', sort_order: 1 },
  { id: 'ind-2', title: 'Automotive', desc: 'Comprehensive logistics for vehicle components, assembly lines, and finished car distribution.', icon: 'flaticon-delivery-truck', status: 'active', sort_order: 2 },
  { id: 'ind-3', title: 'Electronic', desc: 'Handling high-value, fragile electronic components with climate-controlled transport.', icon: 'flaticon-technology', status: 'active', sort_order: 3 },
  { id: 'ind-4', title: 'Chemicals', desc: 'Safe handling of hazardous & non-hazardous chemicals with specialized documentation.', icon: 'flaticon-science-1', status: 'active', sort_order: 4 },
  { id: 'ind-5', title: 'Construction', desc: 'Delivery of construction materials, heavy machinery, and oversized loads.', icon: 'flaticon-brickwall', status: 'active', sort_order: 5 },
  { id: 'ind-6', title: 'Food & Beverage', desc: 'Advanced temperature-controlled logistics solutions for safely transporting perishable goods.', icon: 'flaticon-transport-9', status: 'active', sort_order: 6 },
  { id: 'ind-7', title: 'Manufacturing', desc: 'From raw material sourcing to finished product distribution.', icon: 'flaticon-leaf', status: 'active', sort_order: 7 },
  { id: 'ind-8', title: 'Agricultural Products', desc: 'Fresh produce and agricultural commodity shipping.', icon: 'flaticon-farmer', status: 'active', sort_order: 8 },
  { id: 'ind-9', title: 'Textiles & Garments', desc: 'Fashion and textile industry logistics.', icon: 'flaticon-clothes', status: 'active', sort_order: 9 },
];

export function CmsProvider({ children }) {
  const [cms, setCms] = useState(defaultCMS);
  const [blogs, setBlogs] = useState([]);
  const [rates, setRates] = useState([]);
  const [slides, setSlides] = useState(defaultSlides);
  const [partners, setPartners] = useState(defaultPartners);
  const [statistics, setStatistics] = useState(defaultStatistics);
  const [industries, setIndustries] = useState(defaultIndustries);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [cmsData, blogsData, ratesData, slidesData, partnersData, statisticsData, industriesData] = await Promise.all([
          api.get(`/cms?t=${Date.now()}`),
          api.get(`/blogs?t=${Date.now()}`),
          api.get(`/rates?t=${Date.now()}`),
          api.get(`/cms/hero-slides?t=${Date.now()}`),
          api.get(`/partners?t=${Date.now()}`),
          api.get(`/statistics?t=${Date.now()}`),
          api.get(`/industries?t=${Date.now()}`),
        ]);
        
        if (cmsData && typeof cmsData === 'object' && cmsData.contact) {
          setCms(cmsData);
        }
        if (Array.isArray(blogsData)) {
          setBlogs(blogsData.filter(b => b.status === 'Published'));
        } else {
          setBlogs([]);
        }
        if (Array.isArray(ratesData)) {
          setRates(ratesData);
        } else {
          setRates([]);
        }
        if (Array.isArray(slidesData)) {
          setSlides(slidesData);
        }
        if (Array.isArray(partnersData)) setPartners(partnersData);
        if (Array.isArray(statisticsData)) setStatistics(statisticsData);
        if (Array.isArray(industriesData)) setIndustries(industriesData);
        setError(null);
      } catch (err) {
        console.error('Failed to load CMS data from backend:', err);
        setError(err.message);
        // Fallback defaults are already loaded as initial state
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const submitEnquiry = async (formData) => {
    try {
      const response = await api.post('/enquiries', formData);
      return response.success;
    } catch (err) {
      console.error('Failed to submit enquiry:', err);
      throw err;
    }
  };

  return (
    <CmsContext.Provider value={{ cms, blogs, rates, slides, partners, statistics, industries, loading, error, submitEnquiry }}>
      {children}
    </CmsContext.Provider>
  );
}

export function useCms() {
  const context = useContext(CmsContext);
  if (!context) {
    throw new Error('useCms must be used within a CmsProvider');
  }
  return context;
}
