// ─── CMS Models ──────────────────────────────────────────────────────────────

export interface Testimonial {
  id: number;
  author: string;
  company: string;
  text: string;
  logo: string;
  rating: number; // 1-5
  sortOrder: number;
}

export interface FeaturedService {
  id: number;
  title: string;
  desc: string;
  sortOrder: number;
}

export interface TeamMember {
  id: number;
  name: string;
  role: string;
  avatar: string;
  linkedInUrl: string;
  sortOrder: number;
}

export interface Service {
  id: number;
  title: string;
  slug: string;
  category: 'core' | 'value-added';
  icon: string;
  desc: string;
  active: boolean;
  show_on_homepage?: boolean;
  details?: string;
  image?: string;
  bannerImage?: string;
  sortOrder?: number;
}

export interface Partner {
  id: string;
  name: string;
  logo: string; // Base64 or URL path
  websiteUrl?: string;
  status: 'active' | 'inactive';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Statistic {
  id: string;
  label: string; // e.g. "Projects Completed", "Clients", "Shipments", "Countries"
  value: string; // e.g. "1500+", "120+"
  icon: string; // flaticon class
  status: 'active' | 'inactive';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Industry {
  id: string;
  title: string;
  desc: string;
  icon: string; // flaticon class
  status: 'active' | 'inactive';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FAQ {
  id: number;
  category: string;
  question: string;
  answer: string;
  published: boolean;
  sort_order?: number;
  sortOrder?: number;
}

export interface ContactInfo {
  phones: string[];
  emails: string[];
  officeAddress: string;
  socialLinks: {
    twitter: string;
    linkedin: string;
    facebook: string;
    instagram: string;
    youtube: string;
    whatsapp: string;
    googleMapsEmbed: string;
  };
  copyright?: string;
  logoImage?: string;
  footerAbout?: string;
}

export interface StaticPage {
  content: string;
  published: boolean;
  lastUpdated: string;
}

export interface StaticPages {
  privacyPolicy: StaticPage;
  termsConditions: StaticPage;
  refundPolicy: StaticPage;
  disclaimer: StaticPage;
}

export interface MediaAsset {
  id: number;
  name: string;
  type: string;
  size: string;
  url: string;
}

export interface SeoSettings {
  homeMetaTitle: string;
  homeMetaDesc: string;
  homeMetaKeywords: string;
  homeOgImage: string;
  aboutMetaTitle: string;
  aboutMetaDesc: string;
  servicesMetaTitle: string;
  servicesMetaDesc: string;
}

export interface CMSData {
  homepage: {
    heroTitle: string;
    heroSubtitle: string;
    heroImage: string;
    ctaText: string;
    ctaLink: string;
    welcomeTitle?: string;
    welcomeDesc?: string;
    countersTitle?: string;
    countersSubtitle?: string;
    testimonials: Testimonial[];
    featuredServices: FeaturedService[];
  };
  aboutUs: {
    overview: string;
    mission: string;
    vision: string;
    overviewImage?: string;
    coreValues?: string;
    team: TeamMember[];
  };
  services: Service[];
  faqs: FAQ[];
  contact: ContactInfo;
  staticPages: StaticPages;
  media: MediaAsset[];
  seo: SeoSettings;
}

// ─── Operations Models ────────────────────────────────────────────────────────

export interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  date: string;
  status: 'New' | 'In Progress' | 'Responded' | 'Closed';
  notes: string;
  assignedTo: string;
  source: string;
}

export interface FreightRate {
  id: string;
  origin: string;
  destination: string;
  container: string;
  cost: number;
  transit: number;
  validity: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Administrator' | 'Manager' | 'Content Moderator' | 'Customer';
  status: 'Active' | 'Inactive';
  regDate: string;
  lastLogin: string;
  avatar: string;
}

export interface KYCDocument {
  id: string;
  user: string;
  name: string;
  type: string;
  date: string;
  status: 'Pending Review' | 'Approved' | 'Rejected';
  remarks: string;
  fileUrl: string;
  fileType: string;
}

export interface AuditLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}

export interface CurrentUser {
  name: string;
  email: string;
  role: string;
  avatar: string;
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  button_text: string;
  button_url: string;
  image: string;
  status: 'active' | 'inactive';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Blog {
  id: string;
  title: string;
  slug: string;
  body: string;
  category: string;
  tags: string;
  status: 'Published' | 'Draft';
  image: string;
  date: string;
  author: string;
  seoTitle: string;
  seoDesc: string;
  metaKeywords: string;
  publishedAt: string;
  readingTime: number;
}

// ─── Settings Models ──────────────────────────────────────────────────────────

export interface SiteSettings {
  siteName: string;
  companyName: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  faviconUrl: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
}

export interface SiteConfigSettings {
  siteUrl: string;
  maintenanceMode: boolean;
  googleAnalyticsId: string;
  googleTagManagerId: string;
  googleMapsKey: string;
  reCaptchaSiteKey: string;
  reCaptchaSecretKey: string;
  cookieBannerEnabled: boolean;
  robotsTxt: string;
  seoDefaultTitle: string;
  seoDefaultDesc: string;
}

export interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  encryption: 'TLS' | 'SSL' | 'None';
  senderName: string;
  senderEmail: string;
  enabled: boolean;
  notifyNewEnquiry: boolean;
  notifyDocumentUpload: boolean;
  notifyNewUser: boolean;
}

export interface SmsSettings {
  provider: 'MSG91' | 'Twilio' | 'None';
  apiKey: string;
  apiSecret: string;
  senderId: string;
  enabled: boolean;
  notifyNewEnquiry: boolean;
  notifyStatusChange: boolean;
}

export interface PaymentGatewayConfig {
  enabled: boolean;
  apiKey: string;
  apiSecret: string;
  webhookUrl: string;
  mode: 'test' | 'live';
}

export interface PaymentSettings {
  razorpay: PaymentGatewayConfig;
  stripe: PaymentGatewayConfig;
  paypal: { enabled: boolean; clientId: string; clientSecret: string; mode: 'test' | 'live'; webhookUrl: string };
  cashEnabled: boolean;
}

export interface TaxSettings {
  gstEnabled: boolean;
  gstRate: number;
  vatEnabled: boolean;
  vatRate: number;
  defaultTaxLabel: string;
  taxInclusive: boolean;
}

export interface CurrencySettings {
  defaultCurrency: string;
  currencySymbol: string;
  symbolPosition: 'before' | 'after';
  decimalPrecision: number;
  thousandsSeparator: string;
}

export interface LanguageSettings {
  defaultLanguage: string;
  enabledLanguages: string[];
  rtlEnabled: boolean;
}

export interface RolesSettings {
  rolesList: string[];
  permissionsMatrix: Record<string, Record<string, boolean>>;
}

export interface AppSettings {
  site: SiteSettings;
  siteConfig: SiteConfigSettings;
  smtp: SmtpSettings;
  sms: SmsSettings;
  payment: PaymentSettings;
  tax: TaxSettings;
  currency: CurrencySettings;
  language: LanguageSettings;
  roles?: RolesSettings;
}

// ─── Default Data ─────────────────────────────────────────────────────────────

const NOW = new Date().toISOString().split('T')[0];

export const defaultCMSData: CMSData = {
  homepage: {
    heroTitle: 'Connecting Global Markets Seamlessly',
    heroSubtitle:
      'Your trusted freight forwarding partner with instant digital rate booking and automated compliance tracking.',
    heroImage:
      'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Get Instant Quote',
    ctaLink: '/quote',
    testimonials: [
      {
        id: 1,
        author: 'Marcus Aurelius',
        company: 'Rome Logistics Ltd',
        text: 'EasyFr8 transformed our freight procurement cycle. We get instant rate transparency and complete visibility.',
        logo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=80&h=80',
        rating: 5,
        sortOrder: 1,
      },
      {
        id: 2,
        author: 'Sarah Jenkins',
        company: 'Apex Global Trade',
        text: 'The CSV rate upload and compliance tracking saved our operations team hundreds of administrative hours per month.',
        logo: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=80&h=80',
        rating: 5,
        sortOrder: 2,
      },
    ],
    featuredServices: [
      { id: 1, title: 'Lightning Speed Results', desc: 'Instant rates and bookings in seconds, replacing traditional 1-2 day lead times with AI-powered real-time processing.', sortOrder: 1 },
      { id: 2, title: 'Complete Visibility', desc: 'AI & ML-driven services and rate comparisons across all available options, bringing unprecedented transparency to freight decisions.', sortOrder: 2 },
      { id: 3, title: 'Unified Platform', desc: 'Multimodal logistics solutions under one roof – ocean, air, road, and rail options accessible with a single click.', sortOrder: 3 },
      { id: 4, title: 'Value-Added Services', desc: 'Door-to-door delivery, insurance, and cost liability management integrated seamlessly into our platform.', sortOrder: 4 },
      { id: 5, title: 'Knowledge Bank', desc: 'Buyer-seller discovery tools and comprehensive trade-related reports to support strategic decision-making.', sortOrder: 5 }
    ],
  },
  aboutUs: {
    overview:
      'EasyFr8 is a pioneer in digital freight forwarding, founded in 2024 to simplify complex global trade supply chains.',
    mission:
      'To empower SMEs and global enterprises with real-time digital rates, instant customs approval, and robust tracking mechanics.',
    vision:
      'To be the most trusted digital freight platform connecting every port in the world by 2030.',
    overviewImage: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80',
    coreValues: 'Integrity, Innovation, Intelligence.',
    team: [
      { id: 1, name: 'Alexander Pierce', role: 'Co-Founder & CEO', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150', linkedInUrl: 'https://linkedin.com/in/alexander-pierce', sortOrder: 1 },
      { id: 2, name: 'Jane Montgomery', role: 'VP Ocean Operations', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150', linkedInUrl: 'https://linkedin.com/in/jane-montgomery', sortOrder: 2 },
    ],
  },
  services: [
    {
      id: 1,
      title: 'Ocean Freight Forwarding',
      slug: 'ocean-freight-forwarding',
      category: 'core',
      icon: 'anchor',
      desc: 'Global container shipping with flexible contract rates.',
      active: true,
      image: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=1200&q=80',
      bannerImage: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80',
      sortOrder: 1,
      details: 'Our Sea Freight solutions are designed for both import and export cargo, backed by a leadership team with deep specialization in ocean logistics. We offer flexible shipping options through Main Line Operators, Feeders, NVOCCs, and Bulk & Breakbulk carriers, ensuring cost-efficient and scalable solutions for diverse cargo requirements.\n\nAdvantages:\n- Comprehensive import and export coverage across global trade lanes, thereby, providing solutions to varied requests under one roof.\n- Multiple carrier options for cost and transit comparisons.\n- Expertise in handling containerized, bulk, and breakbulk cargo.\n- Reliable planning and execution for long-haul shipments.'
    },
    {
      id: 2,
      title: 'Air Freight Forwarding',
      slug: 'air-freight-forwarding',
      category: 'core',
      icon: 'plane',
      desc: 'Next-flight-out express delivery for urgent cargo.',
      active: true,
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
      bannerImage: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80',
      sortOrder: 2,
      details: 'Our Air Freight services provide reliable and cost-effective domestic and international cargo movement through strategic contracts with leading airlines and a wide network of IATA-certified agents. By leveraging multiple carrier options, we ensure optimal routing, competitive pricing, and timely delivery for shipments of all sizes across the globe.\n\nAdvantages:\n- Access to competitive rates through multiple domestic and international carriers.\n- Transit times comparison to select best airline and route selection as per your requirement.\n- Global coverage under one roof.\n- Professional handling as certified, experienced and well equipped partners.'
    },
    {
      id: 3,
      title: 'Road Freight Forwarding',
      slug: 'road-freight-forwarding',
      category: 'core',
      icon: 'truck',
      desc: 'Reliable domestic port-to-warehouse drayage transport.',
      active: true,
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
      bannerImage: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80',
      sortOrder: 3,
      details: 'End-to-end road transportation PAN India basis. supported by a readily available fleet for all container types. Whether Trucks all sizes, Trailers all sizes, standard, reefer, flatbed containers etc, our road transport solutions are structured to ensure quick deployment, safe handling, and on-time delivery along with real time tracking.\n\nAdvantages:\n- Access to thousands of trucking companies, thereby, fulfilling your requirement within minutes.\n- Faster vehicle placement with optimised routing.\n- Seamless point to point movement.\n- Transparent and ready rate structures with instant booking.'
    },
    {
      id: 4,
      title: 'Warehousing',
      slug: 'warehousing',
      category: 'core',
      icon: 'package',
      desc: 'Secure storage and rapid distributions.',
      active: true,
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
      bannerImage: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80',
      sortOrder: 4,
      details: 'Need a modern warehousing space for your requirement no matter how much space. ASK US!! With Plethora of space available all across the nation, we take your burden to find and provide warehouse space even for as low as 1000 Sq. Ft. to as much as you want. From Basic to Advanced to Green warehousing space.\n\nAdvantages:\n- Our secure warehouse facilities provide a safe and climate-controlled environment for storing goods.\n- We offer flexible storage solutions, including inventory management and cargo handling services.\n- Our warehouses are equipped with state-of-the-art security systems and surveillance cameras.'
    },
    {
      id: 5,
      title: 'Custom Clearance',
      slug: 'custom-clearance',
      category: 'value-added',
      icon: 'shield',
      desc: 'Automated compliance clearing and duty payments.',
      active: true,
      image: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=1200&q=80',
      bannerImage: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80',
      sortOrder: 5,
      details: 'Customs compliance shouldn\'t block your supply chain. Our certified brokerage team handles document preparation, tariff classification, duty valuation, and electronic processing for all import/export entries. We ensure rapid clearance times and prevent unexpected port delays or compliance penalty issues.\n\nAdvantages:\n- Quick customs declaration preparation.\n- Document compliance pre-verification.\n- Direct connections with local port authorities.\n- Safe cargo handling and storage inside customs area.'
    },
    {
      id: 6,
      title: 'CFS',
      slug: 'cfs',
      category: 'value-added',
      icon: 'box',
      desc: 'Container Freight Station handling and consolidation.',
      active: true,
      image: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=1200&q=80',
      bannerImage: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80',
      sortOrder: 6,
      details: 'Our specialized Container Freight Station (CFS) operations handle efficient cargo consolidation and deconsolidation. We coordinate container stuffing and stripping for LCL shipments, safe transfer of heavy items, and cross-border manifest preparation to ensure streamlined transit operations at every port.\n\nAdvantages:\n- Efficient FCL/LCL consolidation services.\n- Safe and secure container stuffing and stripping.\n- Real-time container movement tracking.\n- Bonded and non-bonded warehouse storage areas.'
    },
    {
      id: 7,
      title: 'Contract Handling',
      slug: 'contract-handling',
      category: 'value-added',
      icon: 'briefcase',
      desc: 'Enterprise logistics contract execution and planning.',
      active: true,
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
      bannerImage: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80',
      sortOrder: 7,
      details: 'Manage complex logistics projects and supply chain setups under dedicated SLA contracts. We design custom handling routines, verify safety audits, and dedicate specialized machinery/teams to guarantee high-performance cargo routing and contract compliance.\n\nAdvantages:\n- Custom logistics solution design.\n- Dedicated equipment and expert operations teams.\n- Full supply chain audit compliance.\n- Strategic routing optimization.'
    },
    {
      id: 8,
      title: 'Cargo Insurance',
      slug: 'cargo-insurance',
      category: 'value-added',
      icon: 'umbrella',
      desc: 'Comprehensive cargo transit liability coverage.',
      active: true,
      image: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=1200&q=80',
      bannerImage: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80',
      sortOrder: 8,
      details: 'Protect your transit investments with complete cargo insurance options. We offer comprehensive liability coverage against physical damage, theft, or unforeseen cargo loss during marine, air, or road transportation. Instant certificate issuance and simplified claims processing keep your business protected.\n\nAdvantages:\n- All-risk coverage for global shipments.\n- Flexible policies adjusted for cargo valuation.\n- Direct integration with top global underwriters.\n- Rapid online claims submission and processing.'
    }
  ],
  faqs: [
    { id: 1, category: 'Rates', question: 'How are freight rates calculated?', answer: 'Rates are based on weight/volume, route, fuel surcharges, and current port handling tariffs.', published: true },
    { id: 2, category: 'Compliance', question: 'What documents are required for customs clearance?', answer: 'Standard clearance requires a Commercial Invoice, Packing List, Bill of Lading, and Certificate of Origin.', published: true },
    { id: 3, category: 'Booking', question: 'Can I cancel a scheduled container booking?', answer: 'Yes, bookings can be cancelled free of charge up to 72 hours prior to cargo cut-off time.', published: false },
  ],
  contact: {
    phones: ['+91 7011 874 347', '+91 8076 466 266'],
    emails: ['info@easyfr8.com', 'support@easyfr8.com'],
    officeAddress: 'Value Envision India Pvt Ltd, Bank More, Dhanbad, Jharkhand - 826001',
    socialLinks: {
      twitter: 'https://twitter.com/easyfr8',
      linkedin: 'https://linkedin.com/company/easyfr8',
      facebook: '',
      instagram: '',
      youtube: '',
      whatsapp: '',
      googleMapsEmbed: '',
    },
    copyright: 'Copyright @ 2025 vnvision, All Right Reserved',
    logoImage: '',
    footerAbout: 'EasyFr8 simplifies global trade supply chains through instant digital freight rate booking and automated compliance tracking.',
  },
  staticPages: {
    privacyPolicy: { content: 'EasyFr8 respects your privacy. All user freight manifest information is encrypted under SSL standard transfers.', published: true, lastUpdated: NOW },
    termsConditions: { content: 'Use of EasyFr8 rate booking platform is subject to international ocean carrier terms and liability limitations.', published: true, lastUpdated: NOW },
    refundPolicy: { content: 'Cancellations inside 48 hours of cut-off are subject to a fee of 15% booking value.', published: true, lastUpdated: NOW },
    disclaimer: { content: 'Rates provided are subject to carrier blank sailings and surcharge fluctuations at time of sailing.', published: true, lastUpdated: NOW },
  },
  media: [
    { id: 1, name: 'hero_banner.jpg', type: 'image', size: '320 KB', url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=150&h=150' },
    { id: 2, name: 'predefined_rate_template.csv', type: 'document', size: '18 KB', url: '#' },
    { id: 3, name: 'company_logo.png', type: 'image', size: '45 KB', url: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=150&h=150' },
  ],
  seo: {
    homeMetaTitle: 'EasyFr8 — Digital Freight Forwarding Platform',
    homeMetaDesc: 'Get instant freight rates, book containers, and track shipments worldwide with EasyFr8.',
    homeMetaKeywords: 'freight, shipping, logistics, container, ocean freight, air cargo',
    homeOgImage: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80',
    aboutMetaTitle: 'About Us — EasyFr8',
    aboutMetaDesc: 'Learn about EasyFr8, the pioneering digital freight forwarding company.',
    servicesMetaTitle: 'Freight Services — EasyFr8',
    servicesMetaDesc: 'Explore our comprehensive freight services including ocean, air, and road haulage.',
  },
};

export const defaultEnquiries: Enquiry[] = [
  { id: 'ENQ-1001', name: 'David Miller', email: 'david@apex.com', subject: 'FCL Rate query for Nhava Sheva to Rotterdam', date: '2026-07-02', status: 'New', notes: 'First time customer. Prefers Maersk schedules.', assignedTo: '', source: 'Web Form' },
  { id: 'ENQ-1002', name: 'Hiroshi Tanaka', email: 'tanaka@osaka-imports.jp', subject: 'Air Cargo rate for 200kg medical devices', date: '2026-07-01', status: 'In Progress', notes: 'Urgent shipment. Checking cargo flight space.', assignedTo: 'Anish Kumar', source: 'Email' },
  { id: 'ENQ-1003', name: 'Elena Rostova', email: 'e.rostova@baltic-wood.ru', subject: 'LCL Booking schedule verification', date: '2026-06-28', status: 'Responded', notes: 'Sent rates sheet. Awaiting packing list approval.', assignedTo: 'Anish Kumar', source: 'Web Form' },
  { id: 'ENQ-1004', name: 'John Doe', email: 'john@doe-retail.us', subject: 'Drayage cost from LAX Port to Ontario Warehouse', date: '2026-06-25', status: 'Closed', notes: 'Rate accepted. Booking finalized under invoice #89283.', assignedTo: '', source: 'Phone' },
];

export const defaultRates: FreightRate[] = [
  { id: 'RTE-301', origin: 'INNSV (Nhava Sheva)', destination: 'NLRTM (Rotterdam)', container: '40ft HC', cost: 2450, transit: 25, validity: '2026-08-15' },
  { id: 'RTE-302', origin: 'CNSHA (Shanghai)', destination: 'USLAX (Los Angeles)', container: '40ft GP', cost: 3800, transit: 16, validity: '2026-07-31' },
  { id: 'RTE-303', origin: 'SGPIN (Singapore)', destination: 'INBOM (Mumbai)', container: '20ft GP', cost: 1200, transit: 8, validity: '2026-08-05' },
  { id: 'RTE-304', origin: 'USNYC (New York)', destination: 'GBFXT (Felixstowe)', container: '40ft HC', cost: 2100, transit: 12, validity: '2026-08-30' },
  { id: 'RTE-305', origin: 'DEHAM (Hamburg)', destination: 'AEJEA (Jebel Ali)', container: '20ft GP', cost: 1650, transit: 22, validity: '2026-07-25' },
  { id: 'RTE-306', origin: 'VNSGN (Saigon)', destination: 'USOAK (Oakland)', container: '40ft GP', cost: 3400, transit: 18, validity: '2026-08-10' },
];

export const defaultUsers: UserAccount[] = [
  { id: 'USR-081', name: 'Biswajit Shaw', email: 'biswa@easyfr8.com', phone: '+91 7011 874 347', role: 'Administrator', status: 'Active', regDate: '2026-01-10', lastLogin: '2026-07-04', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150' },
  { id: 'USR-082', name: 'Anish Kumar', email: 'anish@easyfr8.com', phone: '+91 8076 466 266', role: 'Manager', status: 'Active', regDate: '2026-02-15', lastLogin: '2026-07-03', avatar: '' },
  { id: 'USR-083', name: 'Amit Sharma', email: 'amit@easyfr8.com', phone: '', role: 'Content Moderator', status: 'Active', regDate: '2026-03-01', lastLogin: '2026-07-02', avatar: '' },
  { id: 'USR-084', name: 'Vikas Verma', email: 'vikas@logistics-broker.com', phone: '+91 9900 112 233', role: 'Customer', status: 'Inactive', regDate: '2026-05-20', lastLogin: '2026-06-01', avatar: '' },
];

export const defaultDocuments: KYCDocument[] = [
  { id: 'DOC-201', user: 'Vikas Verma', name: 'Import_Export_License.pdf', type: 'IEC License', date: '2026-06-30', status: 'Pending Review', remarks: '', fileUrl: '#', fileType: 'pdf' },
  { id: 'DOC-202', user: 'Biswajit Shaw', name: 'Company_PAN_Card.pdf', type: 'Tax ID', date: '2026-06-25', status: 'Approved', remarks: 'Verified via national tax registry.', fileUrl: '#', fileType: 'pdf' },
  { id: 'DOC-203', user: 'Anish Kumar', name: 'GST_Registration.pdf', type: 'VAT registration', date: '2026-06-22', status: 'Approved', remarks: 'All information matches enterprise filings.', fileUrl: '#', fileType: 'pdf' },
  { id: 'DOC-204', user: 'Vikas Verma', name: 'Utility_Bill_Electricity.pdf', type: 'Address Proof', date: '2026-06-21', status: 'Rejected', remarks: 'Billing document is outdated (older than 3 months).', fileUrl: '#', fileType: 'pdf' },
];

export const defaultBlogs: Blog[] = [
  {
    id: 'BLG-401',
    title: 'Navigating Blank Sailings in Q3 2026',
    slug: 'navigating-blank-sailings-q3-2026',
    body: 'Blank sailings have become a recurring challenge for shippers worldwide. In Q3 2026, major carriers have announced multiple schedule omissions on transpacific and Asia-Europe trades...\n\nWhat are blank sailings? Blank sailings occur when a carrier omits a scheduled port call or cancels an entire voyage. This directly impacts supply chains that depend on regular departure windows.\n\nHow to prepare: 1) Build buffer inventory. 2) Use multiple carrier contracts. 3) Monitor carrier advisories weekly.',
    category: 'Industry Updates',
    tags: 'blank sailings, ocean freight, carriers, Q3 2026',
    status: 'Published',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=400&h=250',
    date: '2026-07-02',
    author: 'easyfr8',
    seoTitle: 'Navigating Blank Sailings Q3 2026 | EasyFr8',
    seoDesc: 'Learn how to navigate blank sailings disruptions in Q3 2026 with EasyFr8 expert guidance.',
    metaKeywords: 'blank sailings, ocean freight, Q3 2026, shipping disruptions',
    publishedAt: '2026-07-02',
    readingTime: 4,
  },
  {
    id: 'BLG-402',
    title: 'Essential Guide to Customs Bond Clearances',
    slug: 'essential-guide-customs-bond-clearances',
    body: 'Customs bond clearances are mandatory for commercial imports into the United States exceeding $2,500 in value. Understanding the types of bonds can save your company significant delays and penalties...',
    category: 'Compliance Guides',
    tags: 'customs, compliance, bond, import, clearance',
    status: 'Published',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=400&h=250',
    date: '2026-06-28',
    author: 'Anish Kumar',
    seoTitle: 'Customs Bond Clearance Guide | EasyFr8',
    seoDesc: 'Complete guide to customs bond clearances for freight importers.',
    metaKeywords: 'customs bond, clearance, compliance, US imports',
    publishedAt: '2026-06-28',
    readingTime: 5,
  },
  {
    id: 'BLG-403',
    title: 'Carbon Emission Regulations in Marine Shipping',
    slug: 'carbon-emission-regulations-marine-shipping',
    body: 'Draft post — IMO 2030 regulations and CII ratings explained.',
    category: 'Regulations',
    tags: 'carbon, emissions, IMO, shipping, sustainability',
    status: 'Draft',
    image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=400&h=250',
    date: '2026-06-20',
    author: 'Amit Sharma',
    seoTitle: 'Carbon Emissions Marine Shipping 2026 | EasyFr8',
    seoDesc: 'Understanding new carbon emission regulations for marine shipping in 2026.',
    metaKeywords: 'carbon emissions, IMO 2030, marine shipping, sustainability',
    publishedAt: '',
    readingTime: 3,
  },
];

export const defaultAuditLogs: AuditLog[] = [
  { id: 'LOG-501', user: 'biswa@easyfr8.com', action: 'Bulk updated 6 Freight Rates via CSV', timestamp: '2026-07-02 14:32:11' },
  { id: 'LOG-502', user: 'biswa@easyfr8.com', action: 'Approved Document (DOC-202) for Biswajit Shaw', timestamp: '2026-07-02 11:20:00' },
  { id: 'LOG-503', user: 'anish@easyfr8.com', action: 'Updated Enquiry status (ENQ-1002) to In Progress', timestamp: '2026-07-02 09:15:33' },
  { id: 'LOG-504', user: 'amit@easyfr8.com', action: "Published Blog Post 'Navigating Blank Sailings in Q3 2026'", timestamp: '2026-07-02 08:30:15' },
  { id: 'LOG-505', user: 'biswa@easyfr8.com', action: 'Modified Homepage Hero banner tagline text', timestamp: '2026-07-01 17:45:00' },
  { id: 'LOG-506', user: 'anish@easyfr8.com', action: "Added new FAQ: 'What documents are required for customs clearance?'", timestamp: '2026-07-01 13:10:44' },
  { id: 'LOG-507', user: 'biswa@easyfr8.com', action: 'Deactivated User Account (USR-084) for Vikas Verma', timestamp: '2026-06-30 16:22:18' },
  { id: 'LOG-508', user: 'amit@easyfr8.com', action: "Created Draft Blog Post 'Carbon Emission Regulations'", timestamp: '2026-06-30 10:05:00' },
];

export const defaultCurrentUser: CurrentUser = {
  name: 'Biswajit Shaw',
  email: 'biswa@easyfr8.com',
  role: 'Administrator',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150',
};

export const defaultRolesPermissions: Record<string, string[]> = {
  Administrator: ['manage_all', 'edit_cms', 'manage_rates', 'manage_enquiries', 'manage_users', 'manage_documents', 'manage_blogs', 'view_audit_logs'],
  Manager: ['edit_cms', 'manage_rates', 'manage_enquiries', 'manage_documents', 'manage_blogs'],
  'Content Moderator': ['edit_cms', 'manage_blogs'],
};

export const defaultAppSettings: AppSettings = {
  site: {
    siteName: 'EasyFr8 Admin',
    companyName: 'Value Envision India Pvt Ltd',
    address: 'Bank More, Dhanbad, Jharkhand - 826001',
    phone: '+91 7011 874 347',
    email: 'admin@easyfr8.com',
    logoUrl: '',
    faviconUrl: '',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
  },
  siteConfig: {
    siteUrl: 'https://easyfr8.com',
    maintenanceMode: false,
    googleAnalyticsId: '',
    googleTagManagerId: '',
    googleMapsKey: '',
    reCaptchaSiteKey: '',
    reCaptchaSecretKey: '',
    cookieBannerEnabled: true,
    robotsTxt: 'User-agent: *\nAllow: /\nDisallow: /admin/',
    seoDefaultTitle: 'EasyFr8 — Digital Freight Platform',
    seoDefaultDesc: 'Instant freight rates and shipment booking worldwide.',
  },
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    username: '',
    password: '',
    encryption: 'TLS',
    senderName: 'EasyFr8 Admin',
    senderEmail: 'noreply@easyfr8.com',
    enabled: false,
    notifyNewEnquiry: true,
    notifyDocumentUpload: true,
    notifyNewUser: false,
  },
  sms: {
    provider: 'None',
    apiKey: '',
    apiSecret: '',
    senderId: 'EASYFR8',
    enabled: false,
    notifyNewEnquiry: false,
    notifyStatusChange: false,
  },
  payment: {
    razorpay: { enabled: false, apiKey: '', apiSecret: '', webhookUrl: '', mode: 'test' },
    stripe: { enabled: false, apiKey: '', apiSecret: '', webhookUrl: '', mode: 'test' },
    paypal: { enabled: false, clientId: '', clientSecret: '', mode: 'test', webhookUrl: '' },
    cashEnabled: true,
  },
  tax: {
    gstEnabled: true,
    gstRate: 18,
    vatEnabled: false,
    vatRate: 20,
    defaultTaxLabel: 'GST',
    taxInclusive: false,
  },
  currency: {
    defaultCurrency: 'USD',
    currencySymbol: '$',
    symbolPosition: 'before',
    decimalPrecision: 2,
    thousandsSeparator: ',',
  },
  language: {
    defaultLanguage: 'en',
    enabledLanguages: ['en'],
    rtlEnabled: false,
  },
  roles: {
    rolesList: ['Manager', 'Content Moderator'],
    permissionsMatrix: {
      'Manager': { edit_cms: true, manage_rates: true, manage_enquiries: true, manage_blogs: true, view_audit_logs: false, manage_users: false },
      'Content Moderator': { edit_cms: true, manage_rates: false, manage_enquiries: false, manage_blogs: true, view_audit_logs: false, manage_users: false },
    },
  },
};

export const defaultHeroSlides: HeroSlide[] = [
  {
    id: 'slide-1',
    title: 'Connecting Global Markets Seamlessly',
    subtitle: 'Lightning Speed Results',
    description: 'Your trusted freight forwarding partner with instant digital rate booking and automated compliance tracking.',
    button_text: 'Get Instant Quote',
    button_url: '/quote',
    image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80',
    status: 'active',
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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
    sort_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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
    sort_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export const defaultPartners: Partner[] = [
  { id: 'partner-1', name: 'LX Pantos', logo: '/uploads/partners/Picture1.png', websiteUrl: 'https://pantos.com', status: 'active', sort_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'partner-2', name: 'Saatvik', logo: '/uploads/partners/Picture2.jpg', websiteUrl: 'https://saatvik.com', status: 'active', sort_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'partner-3', name: 'Bircher', logo: '/uploads/partners/Picture3.png', websiteUrl: 'https://bircher.com', status: 'active', sort_order: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'partner-4', name: 'Hyundai Glovis', logo: '/uploads/partners/Picture4.png', websiteUrl: 'https://glovis.co.kr', status: 'active', sort_order: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'partner-5', name: 'Elite Green', logo: '/uploads/partners/Picture5.png', websiteUrl: 'https://elitegreen.com', status: 'active', sort_order: 5, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'partner-6', name: 'Cargo Logistics', logo: '/uploads/partners/Picture6.png', websiteUrl: '#', status: 'active', sort_order: 6, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

export const defaultStatistics: Statistic[] = [
  { id: 'stat-1', label: 'Projects Completed', value: '1500+', icon: 'flaticon-transport-9', status: 'active', sort_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'stat-2', label: 'Clients Served', value: '120+', icon: 'flaticon-people', status: 'active', sort_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'stat-3', label: 'Global Shipments', value: '5000+', icon: 'flaticon-route', status: 'active', sort_order: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'stat-4', label: 'Countries Connected', value: '50+', icon: 'flaticon-international-delivery', status: 'active', sort_order: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

export const defaultIndustries: Industry[] = [
  { id: 'ind-1', title: 'Machinery And Equipment', desc: 'Heavy machinery and industrial equipment transport', icon: 'flaticon-cogwheel', status: 'active', sort_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'ind-2', title: 'Automotive', desc: 'Comprehensive logistics for vehicle components, assembly lines, and finished car distribution.', icon: 'flaticon-delivery-truck', status: 'active', sort_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'ind-3', title: 'Electronic', desc: 'Handling high-value, fragile electronic components with climate-controlled transport.', icon: 'flaticon-technology', status: 'active', sort_order: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'ind-4', title: 'Chemicals', desc: 'Safe handling of hazardous & non-hazardous chemicals with specialized documentation.', icon: 'flaticon-science-1', status: 'active', sort_order: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'ind-5', title: 'Construction', desc: 'Delivery of construction materials, heavy machinery, and oversized loads.', icon: 'flaticon-brickwall', status: 'active', sort_order: 5, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'ind-6', title: 'Food & Beverage', desc: 'Advanced temperature-controlled logistics solutions for safely transporting perishable goods.', icon: 'flaticon-transport-9', status: 'active', sort_order: 6, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'ind-7', title: 'Manufacturing', desc: 'From raw material sourcing to finished product distribution.', icon: 'flaticon-leaf', status: 'active', sort_order: 7, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'ind-8', title: 'Agricultural Products', desc: 'Fresh produce and agricultural commodity shipping.', icon: 'flaticon-farmer', status: 'active', sort_order: 8, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'ind-9', title: 'Textiles & Garments', desc: 'Fashion and textile industry logistics.', icon: 'flaticon-clothes', status: 'active', sort_order: 9, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

