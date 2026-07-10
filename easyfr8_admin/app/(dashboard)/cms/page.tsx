'use client';

import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { CMSData, FAQ, Testimonial, FeaturedService, TeamMember, Service, MediaAsset, HeroSlide, Partner, Statistic, Industry } from '../../../lib/store';
import { CMSService } from '../../../services/api';

function compressImageBase64(file: File, maxWidth = 1920, maxHeight = 1080, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      const fallbackReader = new FileReader();
      fallbackReader.onload = (e) => resolve(e.target?.result as string);
      fallbackReader.readAsDataURL(file);
    };
    reader.readAsDataURL(file);
  });
}

export default function CMSPage() {
  const { cms, updateCMS, showToast, heroSlides, addHeroSlide, updateHeroSlide, deleteHeroSlide, partners, addPartner, updatePartner, deletePartner, statistics, addStatistic, updateStatistic, deleteStatistic, industries, addIndustry, updateIndustry, deleteIndustry } = useData();

  // Tab State
  const [activeTab, setActiveTab] = useState<'homepage' | 'about' | 'services' | 'faq' | 'contact' | 'static' | 'media' | 'seo' | 'partners' | 'statistics' | 'industries'>('homepage');

  // Homepage Hero Form States
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroCtaText, setHeroCtaText] = useState('');
  const [heroCtaLink, setHeroCtaLink] = useState('');
  const [heroImage, setHeroImage] = useState('');

  // Welcome & Counters Section States
  const [welcomeTitle, setWelcomeTitle] = useState('');
  const [welcomeDesc, setWelcomeDesc] = useState('');
  const [countersTitle, setCountersTitle] = useState('');
  const [countersSubtitle, setCountersSubtitle] = useState('');


  // About Us States
  const [aboutOverview, setAboutOverview] = useState('');
  const [aboutMission, setAboutMission] = useState('');
  const [aboutVision, setAboutVision] = useState('');
  const [aboutOverviewImage, setAboutOverviewImage] = useState('');
  const [aboutCoreValues, setAboutCoreValues] = useState('');

  // Contact Info States
  const [contactPhone1, setContactPhone1] = useState('');
  const [contactPhone2, setContactPhone2] = useState('');
  const [contactEmail1, setContactEmail1] = useState('');
  const [contactEmail2, setContactEmail2] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [contactTwitter, setContactTwitter] = useState('');
  const [contactLinkedin, setContactLinkedin] = useState('');
  const [contactFacebook, setContactFacebook] = useState('');
  const [contactInstagram, setContactInstagram] = useState('');
  const [contactYoutube, setContactYoutube] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [contactGoogleMaps, setContactGoogleMaps] = useState('');
  const [contactCopyright, setContactCopyright] = useState('');
  const [contactLogoImage, setContactLogoImage] = useState('');
  const [contactFooterAbout, setContactFooterAbout] = useState('');

  // Static Pages States
  const [staticPrivacy, setStaticPrivacy] = useState('');
  const [staticPrivacyPub, setStaticPrivacyPub] = useState(true);
  const [staticTerms, setStaticTerms] = useState('');
  const [staticTermsPub, setStaticTermsPub] = useState(true);
  const [staticRefund, setStaticRefund] = useState('');
  const [staticRefundPub, setStaticRefundPub] = useState(true);
  const [staticDisclaimer, setStaticDisclaimer] = useState('');
  const [staticDisclaimerPub, setStaticDisclaimerPub] = useState(true);

  // SEO Page States
  const [seoHomeTitle, setSeoHomeTitle] = useState('');
  const [seoHomeDesc, setSeoHomeDesc] = useState('');
  const [seoHomeKeywords, setSeoHomeKeywords] = useState('');
  const [seoHomeOgImage, setSeoHomeOgImage] = useState('');
  const [seoAboutTitle, setSeoAboutTitle] = useState('');
  const [seoAboutDesc, setSeoAboutDesc] = useState('');
  const [seoServicesTitle, setSeoServicesTitle] = useState('');
  const [seoServicesDesc, setSeoServicesDesc] = useState('');

  // Hero Slider Local States & Actions
  const [slideModalOpen, setSlideModalOpen] = useState(false);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [slideTitle, setSlideTitle] = useState('');
  const [slideSubtitle, setSlideSubtitle] = useState('');
  const [slideDescription, setSlideDescription] = useState('');
  const [slideButtonText, setSlideButtonText] = useState('');
  const [slideButtonUrl, setSlideButtonUrl] = useState('');
  const [slideImage, setSlideImage] = useState('');
  const [slideStatus, setSlideStatus] = useState<'active' | 'inactive'>('active');

  // Service Local States & Actions
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceSlug, setServiceSlug] = useState('');
  const [serviceCategory, setServiceCategory] = useState<'core' | 'value-added'>('core');
  const [serviceIcon, setServiceIcon] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [serviceDetails, setServiceDetails] = useState('');
  const [serviceImage, setServiceImage] = useState('');
  const [serviceBannerImage, setServiceBannerImage] = useState('');
  const [serviceActive, setServiceActive] = useState(true);
  const [serviceSortOrder, setServiceSortOrder] = useState(1);

  // Partners States & Actions
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState('');
  const [partnerLogo, setPartnerLogo] = useState('');
  const [partnerWebsiteUrl, setPartnerWebsiteUrl] = useState('');
  const [partnerStatus, setPartnerStatus] = useState<'active' | 'inactive'>('active');

  const handleOpenAddPartner = () => {
    setEditingPartnerId(null);
    setPartnerName('');
    setPartnerLogo('');
    setPartnerWebsiteUrl('');
    setPartnerStatus('active');
    setPartnerModalOpen(true);
  };

  const handleOpenEditPartner = (partner: Partner) => {
    setEditingPartnerId(partner.id);
    setPartnerName(partner.name);
    setPartnerLogo(partner.logo);
    setPartnerWebsiteUrl(partner.websiteUrl || '');
    setPartnerStatus(partner.status);
    setPartnerModalOpen(true);
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        name: partnerName,
        logo: partnerLogo,
        websiteUrl: partnerWebsiteUrl,
        status: partnerStatus,
        sort_order: partners.length + 1,
      };
      if (editingPartnerId) {
        await updatePartner(editingPartnerId, data);
      } else {
        await addPartner(data);
      }
      setPartnerModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePartnerLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImageBase64(file, 400, 400, 0.8);
      setPartnerLogo(compressed);
    }
  };

  // Statistics States & Actions
  const [statModalOpen, setStatModalOpen] = useState(false);
  const [editingStatId, setEditingStatId] = useState<string | null>(null);
  const [statLabel, setStatLabel] = useState('');
  const [statValue, setStatValue] = useState('');
  const [statIcon, setStatIcon] = useState('flaticon-transport-9');
  const [statStatus, setStatStatus] = useState<'active' | 'inactive'>('active');

  // Industries States & Actions
  const [indModalOpen, setIndModalOpen] = useState(false);
  const [editingIndId, setEditingIndId] = useState<string | null>(null);
  const [indTitle, setIndTitle] = useState('');
  const [indDesc, setIndDesc] = useState('');
  const [indIcon, setIndIcon] = useState('flaticon-transport-1');
  const [indStatus, setIndStatus] = useState<'active' | 'inactive'>('active');

  const handleOpenAddInd = () => {
    setEditingIndId(null);
    setIndTitle('');
    setIndDesc('');
    setIndIcon('flaticon-transport-1');
    setIndStatus('active');
    setIndModalOpen(true);
  };

  const handleOpenEditInd = (ind: Industry) => {
    setEditingIndId(ind.id);
    setIndTitle(ind.title);
    setIndDesc(ind.desc);
    setIndIcon(ind.icon);
    setIndStatus(ind.status);
    setIndModalOpen(true);
  };

  const handleSaveInd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        title: indTitle,
        desc: indDesc,
        icon: indIcon,
        status: indStatus,
        sort_order: industries.length + 1,
      };
      if (editingIndId) {
        await updateIndustry(editingIndId, data);
      } else {
        await addIndustry(data);
      }
      setIndModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAddStat = () => {
    setEditingStatId(null);
    setStatLabel('');
    setStatValue('');
    setStatIcon('flaticon-transport-9');
    setStatStatus('active');
    setStatModalOpen(true);
  };

  const handleOpenEditStat = (stat: Statistic) => {
    setEditingStatId(stat.id);
    setStatLabel(stat.label);
    setStatValue(stat.value);
    setStatIcon(stat.icon);
    setStatStatus(stat.status);
    setStatModalOpen(true);
  };

  const handleSaveStat = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        label: statLabel,
        value: statValue,
        icon: statIcon,
        status: statStatus,
        sort_order: statistics.length + 1,
      };
      if (editingStatId) {
        await updateStatistic(editingStatId, data);
      } else {
        await addStatistic(data);
      }
      setStatModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAddSlide = () => {
    setEditingSlideId(null);
    setSlideTitle('');
    setSlideSubtitle('');
    setSlideDescription('');
    setSlideButtonText('');
    setSlideButtonUrl('');
    setSlideImage('');
    setSlideStatus('active');
    setSlideModalOpen(true);
  };

  const handleOpenEditSlide = (slide: HeroSlide) => {
    setEditingSlideId(slide.id);
    setSlideTitle(slide.title);
    setSlideSubtitle(slide.subtitle);
    setSlideDescription(slide.description);
    setSlideButtonText(slide.button_text);
    setSlideButtonUrl(slide.button_url);
    setSlideImage(slide.image);
    setSlideStatus(slide.status);
    setSlideModalOpen(true);
  };

  const handleSaveSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const slideData = {
        title: slideTitle,
        subtitle: slideSubtitle,
        description: slideDescription,
        button_text: slideButtonText,
        button_url: slideButtonUrl,
        image: slideImage,
        status: slideStatus,
        sort_order: 1, // backend assigns or we swap it
      };

      if (editingSlideId) {
        await updateHeroSlide(editingSlideId, slideData);
      } else {
        await addHeroSlide(slideData);
      }
      setSlideModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSlideImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImageBase64(file, 1920, 1080, 0.75);
      setSlideImage(compressed);
    }
  };

  const handleMoveSlide = async (index: number, direction: 'up' | 'down') => {
    const sorted = [...heroSlides].sort((a, b) => a.sort_order - b.sort_order);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < sorted.length) {
      const tempOrder = sorted[index].sort_order;
      const otherSlide = sorted[targetIndex];
      
      // Swap sort_order
      await updateHeroSlide(sorted[index].id, { sort_order: otherSlide.sort_order });
      await updateHeroSlide(otherSlide.id, { sort_order: tempOrder });
    }
  };

  // Modal Control States
  const [activeModal, setActiveModal] = useState<'faq' | 'testimonial' | 'highlight' | 'team' | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // FAQ Modal fields
  const [faqId, setFaqId] = useState<number | null>(null);
  const [faqFormCategory, setFaqFormCategory] = useState('Rates');
  const [faqFormQuestion, setFaqFormQuestion] = useState('');
  const [faqFormAnswer, setFaqFormAnswer] = useState('');
  const [faqFormPublished, setFaqFormPublished] = useState(true);

  // Testimonial Modal fields
  const [testimonialId, setTestimonialId] = useState<number | null>(null);
  const [testimonialAuthor, setTestimonialAuthor] = useState('');
  const [testimonialCompany, setTestimonialCompany] = useState('');
  const [testimonialText, setTestimonialText] = useState('');
  const [testimonialRating, setTestimonialRating] = useState(5);
  const [testimonialSort, setTestimonialSort] = useState(1);

  // Highlight Modal fields
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [highlightTitle, setHighlightTitle] = useState('');
  const [highlightDesc, setHighlightDesc] = useState('');
  const [highlightSort, setHighlightSort] = useState(1);

  // Team Modal fields
  const [teamMemberId, setTeamMemberId] = useState<number | null>(null);
  const [teamMemberName, setTeamMemberName] = useState('');
  const [teamMemberRole, setTeamMemberRole] = useState('');
  const [teamMemberAvatar, setTeamMemberAvatar] = useState('');
  const [teamMemberLinkedIn, setTeamMemberLinkedIn] = useState('');
  const [teamMemberSort, setTeamMemberSort] = useState(1);

  // FAQ Tab Search & Pagination States
  const [faqSearchQuery, setFaqSearchQuery] = useState('');
  const [faqCurrentPage, setFaqCurrentPage] = useState(1);
  const faqRowsPerPage = 3;

  // Media Library Search & Filter States
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'image' | 'document'>('all');

  // Fetch CMS data directly from backend
  const fetchCmsData = async () => {
    try {
      const data = await CMSService.getHomepage();
      
      setHeroTitle(data.homepage.heroTitle || '');
      setHeroSubtitle(data.homepage.heroSubtitle || '');
      setHeroCtaText(data.homepage.ctaText || '');
      setHeroCtaLink(data.homepage.ctaLink || '');
      setHeroImage(data.homepage.heroImage || '');
      setWelcomeTitle(data.homepage.welcomeTitle || '');
      setWelcomeDesc(data.homepage.welcomeDesc || '');
      setCountersTitle(data.homepage.countersTitle || '');
      setCountersSubtitle(data.homepage.countersSubtitle || '');

      setAboutOverview(data.aboutUs.overview || '');
      setAboutMission(data.aboutUs.mission || '');
      setAboutVision(data.aboutUs.vision || '');
      setAboutOverviewImage(data.aboutUs.overviewImage || '');
      setAboutCoreValues(data.aboutUs.coreValues || '');

      setContactPhone1(data.contact.phones[0] || '');
      setContactPhone2(data.contact.phones[1] || '');
      setContactEmail1(data.contact.emails[0] || '');
      setContactEmail2(data.contact.emails[1] || '');
      setContactAddress(data.contact.officeAddress || '');
      setContactTwitter(data.contact.socialLinks.twitter || '');
      setContactLinkedin(data.contact.socialLinks.linkedin || '');
      setContactFacebook(data.contact.socialLinks.facebook || '');
      setContactInstagram(data.contact.socialLinks.instagram || '');
      setContactYoutube(data.contact.socialLinks.youtube || '');
      setContactWhatsapp(data.contact.socialLinks.whatsapp || '');
      setContactGoogleMaps(data.contact.socialLinks.googleMapsEmbed || '');
      setContactCopyright(data.contact.copyright || '');
      setContactLogoImage(data.contact.logoImage || '');
      setContactFooterAbout(data.contact.footerAbout || '');

      setStaticPrivacy(data.staticPages.privacyPolicy?.content || '');
      setStaticPrivacyPub(data.staticPages.privacyPolicy?.published ?? true);
      setStaticTerms(data.staticPages.termsConditions?.content || '');
      setStaticTermsPub(data.staticPages.termsConditions?.published ?? true);
      setStaticRefund(data.staticPages.refundPolicy?.content || '');
      setStaticRefundPub(data.staticPages.refundPolicy?.published ?? true);
      setStaticDisclaimer(data.staticPages.disclaimer?.content || '');
      setStaticDisclaimerPub(data.staticPages.disclaimer?.published ?? true);

      setSeoHomeTitle(data.seo?.homeMetaTitle || '');
      setSeoHomeDesc(data.seo?.homeMetaDesc || '');
      setSeoHomeKeywords(data.seo?.homeMetaKeywords || '');
      setSeoHomeOgImage(data.seo?.homeOgImage || '');
      setSeoAboutTitle(data.seo?.aboutMetaTitle || '');
      setSeoAboutDesc(data.seo?.aboutMetaDesc || '');
      setSeoServicesTitle(data.seo?.servicesMetaTitle || '');
      setSeoServicesDesc(data.seo?.servicesMetaDesc || '');
    } catch (err) {
      console.error('Failed to load CMS data:', err);
    }
  };

  // Mount hook to load saved backend CMS data
  React.useEffect(() => {
    fetchCmsData();
  }, []);

  // Save Homepage Hero and refresh
  const handleSaveHero = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CMSData = {
      ...cms,
      homepage: {
        ...cms.homepage,
        heroTitle,
        heroSubtitle,
        ctaText: heroCtaText,
        ctaLink: heroCtaLink,
        heroImage,
      },
    };
    
    // Save to context
    updateCMS(updated);

    try {
      // Save directly to API and wait for it
      await CMSService.updateCMSData(updated);
      showToast('Homepage Hero Banner updated successfully!', 'success');
      // Force reload saved data from the database to synchronize form fields
      await fetchCmsData();
    } catch (err: any) {
      console.error(err);
      showToast('Failed to save Hero section to backend', 'danger');
    }
  };

  const handleHeroBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImageBase64(file, 1920, 1080, 0.75);
      setHeroImage(compressed);
      const updated: CMSData = {
        ...cms,
        homepage: {
          ...cms.homepage,
          heroImage: compressed,
        },
      };
      updateCMS(updated);
      showToast('Hero Banner Image uploaded successfully!', 'success');
    }
  };

  // Testimonials Actions
  const handleOpenAddTestimonial = () => {
    setModalMode('create');
    setTestimonialId(null);
    setTestimonialAuthor('');
    setTestimonialCompany('');
    setTestimonialText('');
    setTestimonialRating(5);
    setTestimonialSort(cms.homepage.testimonials.length + 1);
    setActiveModal('testimonial');
  };

  const handleOpenEditTestimonial = (item: Testimonial) => {
    setModalMode('edit');
    setTestimonialId(item.id);
    setTestimonialAuthor(item.author);
    setTestimonialCompany(item.company);
    setTestimonialText(item.text);
    setTestimonialRating(item.rating || 5);
    setTestimonialSort(item.sortOrder || 1);
    setActiveModal('testimonial');
  };

  const handleSaveTestimonial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testimonialAuthor || !testimonialCompany || !testimonialText) {
      showToast('All testimonial fields are required.', 'danger');
      return;
    }

    let updatedTestiList = [...cms.homepage.testimonials];

    if (modalMode === 'create') {
      const newTesti: Testimonial = {
        id: Date.now(),
        author: testimonialAuthor,
        company: testimonialCompany,
        text: testimonialText,
        logo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=80&h=80',
        rating: testimonialRating,
        sortOrder: testimonialSort,
      };
      updatedTestiList.push(newTesti);
      showToast('Testimonial added.', 'success');
    } else if (modalMode === 'edit' && testimonialId !== null) {
      updatedTestiList = updatedTestiList.map((t) =>
        t.id === testimonialId
          ? { ...t, author: testimonialAuthor, company: testimonialCompany, text: testimonialText, rating: testimonialRating, sortOrder: testimonialSort }
          : t
      );
      showToast('Testimonial updated.', 'success');
    }

    // Sort by sortOrder ascending
    updatedTestiList.sort((a, b) => a.sortOrder - b.sortOrder);

    const updated: CMSData = {
      ...cms,
      homepage: {
        ...cms.homepage,
        testimonials: updatedTestiList,
      },
    };
    updateCMS(updated);
    setActiveModal(null);
  };

  const handleDeleteTestimonial = (id: number) => {
    if (confirm('Are you sure you want to delete this testimonial?')) {
      const updated: CMSData = {
        ...cms,
        homepage: {
          ...cms.homepage,
          testimonials: cms.homepage.testimonials.filter((t) => t.id !== id),
        },
      };
      updateCMS(updated);
      showToast('Testimonial removed.', 'success');
    }
  };

  // Highlights Actions
  const handleOpenAddHighlight = () => {
    setModalMode('create');
    setHighlightId(null);
    setHighlightTitle('');
    setHighlightDesc('');
    setHighlightSort(cms.homepage.featuredServices.length + 1);
    setActiveModal('highlight');
  };

  const handleOpenEditHighlight = (item: FeaturedService) => {
    setModalMode('edit');
    setHighlightId(item.id);
    setHighlightTitle(item.title);
    setHighlightDesc(item.desc);
    setHighlightSort(item.sortOrder || 1);
    setActiveModal('highlight');
  };

  const handleSaveHighlight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!highlightTitle || !highlightDesc) {
      showToast('All fields are required.', 'danger');
      return;
    }

    let updatedList = [...cms.homepage.featuredServices];

    if (modalMode === 'create') {
      const newHighlight: FeaturedService = {
        id: Date.now(),
        title: highlightTitle,
        desc: highlightDesc,
        sortOrder: highlightSort,
      };
      updatedList.push(newHighlight);
      showToast('Highlight added.', 'success');
    } else if (modalMode === 'edit' && highlightId !== null) {
      updatedList = updatedList.map((h) =>
        h.id === highlightId
          ? { ...h, title: highlightTitle, desc: highlightDesc, sortOrder: highlightSort }
          : h
      );
      showToast('Highlight updated.', 'success');
    }

    updatedList.sort((a, b) => a.sortOrder - b.sortOrder);

    const updated: CMSData = {
      ...cms,
      homepage: {
        ...cms.homepage,
        featuredServices: updatedList,
      },
    };
    updateCMS(updated);
    setActiveModal(null);
  };

  const handleDeleteHighlight = (id: number) => {
    if (confirm('Are you sure you want to delete this featured service highlight?')) {
      const updated: CMSData = {
        ...cms,
        homepage: {
          ...cms.homepage,
          featuredServices: cms.homepage.featuredServices.filter((h) => h.id !== id),
        },
      };
      updateCMS(updated);
      showToast('Highlight removed.', 'success');
    }
  };

  // Save About Us — posts ONLY to /api/cms/about so footer/contact data is never touched
  const handleSaveAbout = async (e: React.FormEvent) => {
    e.preventDefault();
    const aboutPayload = {
      overview: aboutOverview,
      mission: aboutMission,
      vision: aboutVision,
      overviewImage: aboutOverviewImage,
      coreValues: aboutCoreValues,
      // preserve existing team members
      team: cms.aboutUs.team,
    };
    try {
      const res = await fetch('/api/cms/about', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aboutPayload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Sync context so other parts of admin see the updated aboutUs
      const data = await res.json();
      if (data.success && data.aboutUs) {
        updateCMS({ ...cms, aboutUs: data.aboutUs });
      }
      showToast('About Us profile details saved!', 'success');
      await fetchCmsData();
    } catch (err: any) {
      console.error('handleSaveAbout error:', err);
      showToast('Failed to save About Us section to backend', 'danger');
    }
  };

  const handleAboutImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImageBase64(file, 1000, 800, 0.75);
      setAboutOverviewImage(compressed);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImageBase64(file, 400, 400, 0.85);
      setContactLogoImage(compressed);
    }
  };

  // Team Actions
  const handleOpenAddTeam = () => {
    setModalMode('create');
    setTeamMemberId(null);
    setTeamMemberName('');
    setTeamMemberRole('');
    setTeamMemberAvatar('');
    setTeamMemberLinkedIn('');
    setTeamMemberSort(cms.aboutUs.team.length + 1);
    setActiveModal('team');
  };

  const handleOpenEditTeam = (item: TeamMember) => {
    setModalMode('edit');
    setTeamMemberId(item.id);
    setTeamMemberName(item.name);
    setTeamMemberRole(item.role);
    setTeamMemberAvatar(item.avatar);
    setTeamMemberLinkedIn(item.linkedInUrl || '');
    setTeamMemberSort(item.sortOrder || 1);
    setActiveModal('team');
  };

  const handleTeamAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImageBase64(file, 400, 400, 0.85);
      setTeamMemberAvatar(compressed);
    }
  };

  const handleSaveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamMemberName || !teamMemberRole) {
      showToast('Name and Designation/Role are required.', 'danger');
      return;
    }

    let updatedList = [...cms.aboutUs.team];

    if (modalMode === 'create') {
      const newMember: TeamMember = {
        id: Date.now(),
        name: teamMemberName,
        role: teamMemberRole,
        avatar: teamMemberAvatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150',
        linkedInUrl: teamMemberLinkedIn,
        sortOrder: teamMemberSort,
      };
      updatedList.push(newMember);
      showToast('Team member registered.', 'success');
    } else if (modalMode === 'edit' && teamMemberId !== null) {
      updatedList = updatedList.map((t) =>
        t.id === teamMemberId
          ? { ...t, name: teamMemberName, role: teamMemberRole, avatar: teamMemberAvatar, linkedInUrl: teamMemberLinkedIn, sortOrder: teamMemberSort }
          : t
      );
      showToast('Team member information modified.', 'success');
    }

    updatedList.sort((a, b) => a.sortOrder - b.sortOrder);

    const updated: CMSData = {
      ...cms,
      aboutUs: {
        ...cms.aboutUs,
        team: updatedList,
      },
    };
    updateCMS(updated);
    setActiveModal(null);
  };

  const handleDeleteTeam = (id: number) => {
    if (confirm('Are you sure you want to remove this corporate team member?')) {
      const updated: CMSData = {
        ...cms,
        aboutUs: {
          ...cms.aboutUs,
          team: cms.aboutUs.team.filter((t) => t.id !== id),
        },
      };
      updateCMS(updated);
      showToast('Team member removed.', 'success');
    }
  };

  // Services Toggle
  const handleToggleService = (idx: number, active: boolean) => {
    const updatedList = [...cms.services];
    updatedList[idx].active = active;
    const updated: CMSData = {
      ...cms,
      services: updatedList,
    };
    updateCMS(updated);
    showToast(`Service active status updated.`, 'success');
  };

  const handleDeleteService = (idx: number, title: string) => {
    if (confirm(`Remove the service offering '${title}'?`)) {
      const updatedList = [...cms.services];
      updatedList.splice(idx, 1);
      const updated: CMSData = {
        ...cms,
        services: updatedList,
      };
      updateCMS(updated);
      showToast('Service removed.', 'success');
    }
  };

  const handleOpenAddService = () => {
    setEditingServiceId(null);
    setServiceTitle('');
    setServiceSlug('');
    setServiceCategory('core');
    setServiceIcon('anchor');
    setServiceDesc('');
    setServiceDetails('');
    setServiceImage('');
    setServiceBannerImage('');
    setServiceActive(true);
    setServiceSortOrder((cms.services?.length || 0) + 1);
    setServiceModalOpen(true);
  };

  const handleOpenEditService = (service: Service) => {
    setEditingServiceId(service.id);
    setServiceTitle(service.title);
    setServiceSlug(service.slug || '');
    setServiceCategory(service.category || 'core');
    setServiceIcon(service.icon || 'anchor');
    setServiceDesc(service.desc || '');
    setServiceDetails(service.details || '');
    setServiceImage(service.image || '');
    setServiceBannerImage(service.bannerImage || '');
    setServiceActive(service.active);
    setServiceSortOrder(service.sortOrder || 1);
    setServiceModalOpen(true);
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceTitle || !serviceSlug || !serviceDesc) {
      showToast('Title, Slug, and Description are required.', 'danger');
      return;
    }

    let updatedList = [...(cms.services || [])];

    if (editingServiceId !== null) {
      updatedList = updatedList.map((s) =>
        s.id === editingServiceId
          ? {
              ...s,
              title: serviceTitle,
              slug: serviceSlug,
              category: serviceCategory,
              icon: serviceIcon,
              desc: serviceDesc,
              details: serviceDetails,
              image: serviceImage,
              bannerImage: serviceBannerImage,
              active: serviceActive,
              sortOrder: serviceSortOrder
            }
          : s
      );
      showToast('Service updated successfully.', 'success');
    } else {
      const newSvc: Service = {
        id: Date.now(),
        title: serviceTitle,
        slug: serviceSlug,
        category: serviceCategory,
        icon: serviceIcon,
        desc: serviceDesc,
        details: serviceDetails,
        image: serviceImage,
        bannerImage: serviceBannerImage,
        active: serviceActive,
        sortOrder: serviceSortOrder
      };
      updatedList.push(newSvc);
      showToast('New service added successfully.', 'success');
    }

    updatedList.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    const updated: CMSData = {
      ...cms,
      services: updatedList,
    };
    updateCMS(updated);
    setServiceModalOpen(false);
  };

  const handleServiceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImageBase64(file, 1200, 800, 0.75);
      setServiceImage(compressed);
    }
  };

  const handleServiceBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImageBase64(file, 1920, 1080, 0.75);
      setServiceBannerImage(compressed);
    }
  };

  // FAQ CRUD Actions
  const handleOpenAddFAQ = () => {
    setFaqId(null);
    setFaqFormCategory('Rates');
    setFaqFormQuestion('');
    setFaqFormAnswer('');
    setFaqFormPublished(true);
    setActiveModal('faq');
  };

  const handleOpenEditFAQ = (faq: FAQ) => {
    setFaqId(faq.id);
    setFaqFormCategory(faq.category);
    setFaqFormQuestion(faq.question);
    setFaqFormAnswer(faq.answer);
    setFaqFormPublished(faq.published);
    setActiveModal('faq');
  };

  const handleSaveFAQ = (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqFormQuestion || !faqFormAnswer) {
      showToast('Question and Answer are required.', 'danger');
      return;
    }

    let updatedList = [...cms.faqs];
    if (faqId !== null) {
      updatedList = updatedList.map((f) =>
        f.id === faqId
          ? { ...f, category: faqFormCategory, question: faqFormQuestion, answer: faqFormAnswer, published: faqFormPublished }
          : f
      );
      showToast('FAQ entry modified.', 'success');
    } else {
      const newFAQ: FAQ = {
        id: Date.now(),
        category: faqFormCategory,
        question: faqFormQuestion,
        answer: faqFormAnswer,
        published: faqFormPublished,
      };
      updatedList.push(newFAQ);
      showToast('New FAQ added.', 'success');
    }

    const updated: CMSData = {
      ...cms,
      faqs: updatedList,
    };
    updateCMS(updated);
    setActiveModal(null);
  };

  const handleDeleteFAQ = (id: number) => {
    if (confirm('Are you sure you want to permanently delete this FAQ?')) {
      const updated: CMSData = {
        ...cms,
        faqs: cms.faqs.filter((f) => f.id !== id),
      };
      updateCMS(updated);
      showToast('FAQ entry deleted.', 'success');
    }
  };

  // FAQ Filter
  const filteredFAQs = cms.faqs.filter((f) =>
    f.question.toLowerCase().includes(faqSearchQuery.toLowerCase()) ||
    f.category.toLowerCase().includes(faqSearchQuery.toLowerCase())
  );

  const totalFaqRows = filteredFAQs.length;
  const totalFaqPages = Math.ceil(totalFaqRows / faqRowsPerPage);
  const paginatedFAQs = filteredFAQs.slice((faqCurrentPage - 1) * faqRowsPerPage, faqCurrentPage * faqRowsPerPage);

  // Save Contact / Footer — posts ONLY to /api/cms/footer so aboutUs data is never touched
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const contactPayload = {
      phones: [contactPhone1, contactPhone2].filter(Boolean),
      emails: [contactEmail1, contactEmail2].filter(Boolean),
      officeAddress: contactAddress,
      socialLinks: {
        twitter: contactTwitter,
        linkedin: contactLinkedin,
        facebook: contactFacebook,
        instagram: contactInstagram,
        youtube: contactYoutube,
        whatsapp: contactWhatsapp,
        googleMapsEmbed: contactGoogleMaps,
      },
      copyright: contactCopyright,
      logoImage: contactLogoImage,
      footerAbout: contactFooterAbout,
    };
    try {
      const res = await fetch('/api/cms/footer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactPayload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Sync context so other parts of admin see the updated contact
      const data = await res.json();
      if (data.success && data.contact) {
        updateCMS({ ...cms, contact: data.contact });
      }
      showToast('Contact & Footer details updated.', 'success');
      await fetchCmsData();
    } catch (err: any) {
      console.error('handleSaveContact error:', err);
      showToast('Failed to save Contact/Footer section to backend', 'danger');
    }
  };

  // Save Static Pages
  const handleSaveStatic = (e: React.FormEvent) => {
    e.preventDefault();
    const nowStr = new Date().toISOString().split('T')[0];
    const updated: CMSData = {
      ...cms,
      staticPages: {
        privacyPolicy: { content: staticPrivacy, published: staticPrivacyPub, lastUpdated: nowStr },
        termsConditions: { content: staticTerms, published: staticTermsPub, lastUpdated: nowStr },
        refundPolicy: { content: staticRefund, published: staticRefundPub, lastUpdated: nowStr },
        disclaimer: { content: staticDisclaimer, published: staticDisclaimerPub, lastUpdated: nowStr },
      },
    };
    updateCMS(updated);
    showToast('Static legal copies saved.', 'success');
  };

  // Save SEO defaults
  const handleSaveSEO = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CMSData = {
      ...cms,
      seo: {
        homeMetaTitle: seoHomeTitle,
        homeMetaDesc: seoHomeDesc,
        homeMetaKeywords: seoHomeKeywords,
        homeOgImage: seoHomeOgImage,
        aboutMetaTitle: seoAboutTitle,
        aboutMetaDesc: seoAboutDesc,
        servicesMetaTitle: seoServicesTitle,
        servicesMetaDesc: seoServicesDesc,
      },
    };
    updateCMS(updated);
    showToast('SEO default metadata values saved.', 'success');
  };

  // Media Library Actions
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImageBase64(file, 1920, 1080, 0.75);
      const newAsset: MediaAsset = {
        id: Date.now(),
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'document',
        size: (compressed.length * 0.75 / 1024).toFixed(1) + ' KB',
        url: file.type.startsWith('image/') ? compressed : '#',
      };
      const updated: CMSData = {
        ...cms,
        media: [...cms.media, newAsset],
      };
      updateCMS(updated);
      showToast(`Uploaded asset '${file.name}'`, 'success');
    }
  };

  const handleDeleteMedia = (id: number, name: string) => {
    if (confirm(`Are you sure you want to permanently delete the asset '${name}'?`)) {
      const updated: CMSData = {
        ...cms,
        media: cms.media.filter((m) => m.id !== id),
      };
      updateCMS(updated);
      showToast('Asset deleted from library.', 'success');
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('Asset URL copied to clipboard.', 'info');
  };

  // Filter Media Library
  const filteredMedia = cms.media.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(mediaSearch.toLowerCase());
    const matchesType = mediaTypeFilter === 'all' || m.type === mediaTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Website Content Management (CMS)</h1>
          <p className="page-subtitle">Configure homepage layouts, team info, FAQ tables, and resource media folders.</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-navigation" style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: 'var(--space-6)', overflowX: 'auto', flexWrap: 'nowrap', gap: '0' }}>
        {(['homepage', 'about', 'services', 'faq', 'contact', 'static', 'media', 'seo', 'partners', 'statistics', 'industries'] as const).map((tab) => (
          <button
            key={tab}
            className={`tab-link ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 16px',
              borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : 'none',
              fontWeight: activeTab === tab ? 600 : 500,
              textTransform: 'capitalize'
            }}
          >
            {tab === 'seo' ? 'SEO Defaults' : tab === 'faq' ? 'FAQ' : tab}
          </button>
        ))}
      </div>

      {/* TAB 1: HOMEPAGE */}
      {activeTab === 'homepage' && (
        <div className="tab-pane active" id="tab-homepage">
          <div className="cms-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-6)' }}>
            <div className="chart-card">
              <div className="table-header-actions" style={{ marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="chart-card-title" style={{ margin: 0 }}>Homepage Hero Banner Slider</h3>
                <button type="button" className="btn btn-primary" onClick={handleOpenAddSlide}>Add New Slide</button>
              </div>
              
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Sort</th>
                      <th style={{ width: '120px' }}>Image</th>
                      <th>Title / Subtitle</th>
                      <th style={{ width: '150px' }}>CTA Link</th>
                      <th style={{ width: '100px' }}>Status</th>
                      <th style={{ width: '220px' }} className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...heroSlides].sort((a, b) => a.sort_order - b.sort_order).map((slide, idx, arr) => (
                      <tr key={slide.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '32px' }}>
                            <button
                              type="button"
                              className="btn btn-icon btn-sm"
                              disabled={idx === 0}
                              onClick={() => handleMoveSlide(idx, 'up')}
                              title="Move Up"
                              style={{ padding: '2px', fontSize: '10px' }}
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              className="btn btn-icon btn-sm"
                              disabled={idx === arr.length - 1}
                              onClick={() => handleMoveSlide(idx, 'down')}
                              title="Move Down"
                              style={{ padding: '2px', fontSize: '10px' }}
                            >
                              ▼
                            </button>
                          </div>
                        </td>
                        <td>
                          {slide.image ? (
                            <img src={slide.image} alt={slide.title} style={{ width: '100px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                          ) : (
                            <div style={{ width: '100px', height: '50px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>No Image</div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{slide.title}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{slide.subtitle}</div>
                          <div style={{ fontSize: '0.75rem', marginTop: '4px', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slide.description}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem' }}>{slide.button_text}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{slide.button_url}</div>
                        </td>
                        <td>
                          <span
                            className={`badge badge-${slide.status === 'active' ? 'success' : 'secondary'}`}
                            style={{ cursor: 'pointer', display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}
                            onClick={() => updateHeroSlide(slide.id, { status: slide.status === 'active' ? 'inactive' : 'active' })}
                          >
                            {slide.status}
                          </span>
                        </td>
                        <td className="text-right">
                          <button type="button" className="btn btn-secondary btn-sm" style={{ marginRight: '8px' }} onClick={() => handleOpenEditSlide(slide)}>Edit</button>
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => { if(confirm('Are you sure you want to delete this slide?')) deleteHeroSlide(slide.id); }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                    {heroSlides.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center" style={{ padding: '30px', color: 'var(--text-muted)' }}>
                          No slides found. Click "Add New Slide" to create one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="chart-card">
              <h3 className="chart-card-title" style={{ marginBottom: 'var(--space-4)' }}>Welcome Section &amp; Counters Text</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const updated: CMSData = {
                  ...cms,
                  homepage: {
                    ...cms.homepage,
                    welcomeTitle,
                    welcomeDesc,
                    countersTitle,
                    countersSubtitle
                  }
                };
                updateCMS(updated);
                try {
                  await CMSService.updateCMSData(updated);
                  showToast('Welcome & Counters text saved!', 'success');
                } catch {
                  showToast('Failed to save welcome & counters data', 'danger');
                }
              }}>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Welcome Title</label>
                  <input type="text" className="form-control" value={welcomeTitle} onChange={(e) => setWelcomeTitle(e.target.value)} placeholder="e.g. Welcome to Easyfr8" />
                </div>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Welcome Description</label>
                  <textarea className="form-control" rows={3} value={welcomeDesc} onChange={(e) => setWelcomeDesc(e.target.value)} placeholder="e.g. Easyfr8 is more than just Rates..." />
                </div>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Counters Title</label>
                  <input type="text" className="form-control" value={countersTitle} onChange={(e) => setCountersTitle(e.target.value)} placeholder="e.g. Connecting Global Markets Seamlessly" />
                </div>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Counters Subtitle</label>
                  <input type="text" className="form-control" value={countersSubtitle} onChange={(e) => setCountersSubtitle(e.target.value)} placeholder="e.g. Delivering better outcomes..." />
                </div>
                <button type="submit" className="btn btn-primary">Save Welcome &amp; Counters</button>
              </form>
            </div>

            <div className="chart-card" style={{ gridColumn: 'span 2' }}>
              <div className="table-header-actions" style={{ marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="chart-card-title" style={{ margin: 0 }}>Client Testimonials & Brand Logos</h3>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenAddTestimonial}>Add Testimonial</button>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sort</th>
                      <th>Author</th>
                      <th>Company</th>
                      <th>Quote Statement</th>
                      <th>Stars</th>
                      <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cms.homepage.testimonials.map((item) => (
                      <tr key={item.id}>
                        <td>{item.sortOrder}</td>
                        <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.author}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.company}</td>
                        <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{item.text}</td>
                        <td style={{ color: 'var(--color-warning)' }}>{'★'.repeat(item.rating || 5)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button type="button" className="btn btn-secondary" onClick={() => handleOpenEditTestimonial(item)} style={{ padding: '2px 8px', fontSize: '0.75rem', marginRight: '4px' }}>Edit</button>
                          <button type="button" className="btn btn-danger" onClick={() => handleDeleteTestimonial(item.id)} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="chart-card" style={{ gridColumn: 'span 2' }}>
              <div className="table-header-actions" style={{ marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="chart-card-title" style={{ margin: 0 }}>Featured Services & Highlights</h3>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenAddHighlight}>Add Highlight</button>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sort</th>
                      <th>Highlight Title</th>
                      <th>Description</th>
                      <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cms.homepage.featuredServices.map((item) => (
                      <tr key={item.id}>
                        <td>{item.sortOrder}</td>
                        <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.title}</td>
                        <td style={{ maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.desc}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button type="button" className="btn btn-secondary" onClick={() => handleOpenEditHighlight(item)} style={{ padding: '2px 8px', fontSize: '0.75rem', marginRight: '4px' }}>Edit</button>
                          <button type="button" className="btn btn-danger" onClick={() => handleDeleteHighlight(item.id)} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ABOUT US */}
      {activeTab === 'about' && (
        <div className="tab-pane active" id="tab-about">
          <div className="cms-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--space-6)' }}>
            <div className="chart-card">
              <h3 className="chart-card-title" style={{ marginBottom: 'var(--space-4)' }}>About Us Profile Blocks</h3>
              <form onSubmit={handleSaveAbout}>
                <div className="form-group">
                  <label className="form-label">Company Overview Paragraph</label>
                  <textarea className="form-control" value={aboutOverview} onChange={(e) => setAboutOverview(e.target.value)} rows={4} required></textarea>
                </div>
                <div className="form-group">
                  <label className="form-label">Mission Statement</label>
                  <textarea className="form-control" value={aboutMission} onChange={(e) => setAboutMission(e.target.value)} rows={3} required></textarea>
                </div>
                <div className="form-group">
                  <label className="form-label">Vision Statement</label>
                  <textarea className="form-control" value={aboutVision} onChange={(e) => setAboutVision(e.target.value)} rows={3} placeholder="Enter company long-term vision..."></textarea>
                </div>
                <div className="form-group">
                  <label className="form-label">Core Values</label>
                  <textarea className="form-control" value={aboutCoreValues} onChange={(e) => setAboutCoreValues(e.target.value)} rows={2} placeholder="e.g. Integrity, Innovation, Intelligence."></textarea>
                </div>
                <div className="form-group">
                  <label className="form-label">Overview Section Image</label>
                  <div style={{ position: 'relative', border: '1px dashed var(--border-color)', padding: '12px', borderRadius: '4px', textAlign: 'center', cursor: 'pointer', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.85rem' }}>Upload Overview Image</span>
                    <input type="file" accept="image/*" onChange={handleAboutImageUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                  </div>
                  {aboutOverviewImage && (
                    <div style={{ marginTop: '8px' }}>
                      <img src={aboutOverviewImage} alt="Overview Preview" style={{ width: '100%', maxHeight: '150px', objectFit: 'cover', borderRadius: '4px' }} />
                    </div>
                  )}
                </div>
                <button type="submit" className="btn btn-primary">Save About Us Statements</button>
              </form>
            </div>

            <div className="chart-card">
              <div className="table-header-actions" style={{ marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="chart-card-title" style={{ margin: 0 }}>Corporate Team Members</h3>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenAddTeam}>Add Member</button>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sort</th>
                      <th>Name</th>
                      <th>Role / Position</th>
                      <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cms.aboutUs.team.map((item) => (
                      <tr key={item.id}>
                        <td>{item.sortOrder}</td>
                        <td style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontWeight: 600, fontSize: '0.85rem' }}>
                          <img src={item.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&h=80'} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} alt={item.name} />
                          <span>{item.name}</span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.role}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button type="button" className="btn btn-secondary" onClick={() => handleOpenEditTeam(item)} style={{ padding: '2px 8px', fontSize: '0.75rem', marginRight: '4px' }}>Edit</button>
                          <button type="button" className="btn btn-danger" onClick={() => handleDeleteTeam(item.id)} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SERVICES */}
      {activeTab === 'services' && (
        <div className="tab-pane active" id="tab-services">
          <div className="chart-card">
            <div className="table-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 className="chart-card-title" style={{ margin: 0 }}>Service Offerings</h3>
              <button className="btn btn-primary btn-sm" onClick={handleOpenAddService}>Add Service</button>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sort</th>
                    <th>Service Name</th>
                    <th>Slug</th>
                    <th>Category</th>
                    <th>Icon Type</th>
                    <th>Description</th>
                    <th>Active Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cms.services.map((service, index) => (
                    <tr key={service.id}>
                      <td>{service.sortOrder || index + 1}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{service.title}</td>
                      <td><span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{service.slug || '-'}</span></td>
                      <td>
                        <span className={`status-pill ${service.category === 'core' ? 'status-active' : 'status-inactive'}`} style={{ textTransform: 'capitalize' }}>
                          {service.category || 'core'}
                        </span>
                      </td>
                      <td><span style={{ fontFamily: 'monospace', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '4px' }}>{service.icon}</span></td>
                      <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={service.desc}>{service.desc}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label className="switch">
                            <input type="checkbox" checked={service.active} onChange={(e) => handleToggleService(index, e.target.checked)} />
                            <span className="slider"></span>
                          </label>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{service.active ? 'Active' : 'Disabled'}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEditService(service)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteService(index, service.title)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FAQ */}
      {activeTab === 'faq' && (
        <div className="tab-pane active" id="tab-faq">
          <div className="chart-card">
            <div className="table-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '4px 12px', background: 'var(--bg-primary)', width: '100%', maxWidth: '280px' }}>
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <input type="text" className="table-search" value={faqSearchQuery} onChange={(e) => { setFaqSearchQuery(e.target.value); setFaqCurrentPage(1); }} placeholder="Search FAQ question..." style={{ border: 'none', background: 'none', outline: 'none', fontSize: '0.85rem', width: '100%' }} />
              </div>
              <button className="btn btn-primary" onClick={handleOpenAddFAQ}>Add FAQ</button>
            </div>
            
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Question</th>
                    <th>Answer</th>
                    <th>Publish Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedFAQs.map((faq) => (
                    <tr key={faq.id}>
                      <td style={{ fontWeight: 600 }}>{faq.category}</td>
                      <td style={{ maxWidth: '220px', textWrap: 'wrap', fontWeight: 500 }}>{faq.question}</td>
                      <td style={{ maxWidth: '300px', textWrap: 'wrap', color: 'var(--text-secondary)' }}>{faq.answer}</td>
                      <td>
                        <span className={`status-pill ${faq.published ? 'status-active' : 'status-inactive'}`}>
                          {faq.published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary" onClick={() => handleOpenEditFAQ(faq)} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>Edit</button>
                          <button className="btn btn-danger" onClick={() => handleDeleteFAQ(faq.id)} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredFAQs.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-4)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Showing {paginatedFAQs.length} of {totalFaqRows} FAQs</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setFaqCurrentPage(faqCurrentPage - 1)} disabled={faqCurrentPage === 1}>Prev</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setFaqCurrentPage(faqCurrentPage + 1)} disabled={faqCurrentPage === totalFaqPages}>Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: CONTACT INFO */}
      {activeTab === 'contact' && (
        <div className="tab-pane active" id="tab-contact">
          <div className="chart-card" style={{ maxWidth: '720px' }}>
            <h3 className="chart-card-title" style={{ marginBottom: 'var(--space-4)' }}>Corporate Contact & Social Coordinates</h3>
            <form onSubmit={handleSaveContact}>
              <div className="form-row" style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Phone Primary</label>
                  <input type="text" className="form-control" value={contactPhone1} onChange={(e) => setContactPhone1(e.target.value)} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Phone Support</label>
                  <input type="text" className="form-control" value={contactPhone2} onChange={(e) => setContactPhone2(e.target.value)} />
                </div>
              </div>
              <div className="form-row" style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Email Primary</label>
                  <input type="email" className="form-control" value={contactEmail1} onChange={(e) => setContactEmail1(e.target.value)} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Email Support</label>
                  <input type="email" className="form-control" value={contactEmail2} onChange={(e) => setContactEmail2(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Corporate Office Address</label>
                <input type="text" className="form-control" value={contactAddress} onChange={(e) => setContactAddress(e.target.value)} required />
              </div>
              <div className="form-row" style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: '1 1 200px' }}>
                  <label className="form-label">Twitter / X URL</label>
                  <input type="text" className="form-control" value={contactTwitter} onChange={(e) => setContactTwitter(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: '1 1 200px' }}>
                  <label className="form-label">LinkedIn Page URL</label>
                  <input type="text" className="form-control" value={contactLinkedin} onChange={(e) => setContactLinkedin(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: '1 1 200px' }}>
                  <label className="form-label">Facebook Page URL</label>
                  <input type="text" className="form-control" value={contactFacebook} onChange={(e) => setContactFacebook(e.target.value)} />
                </div>
              </div>
              <div className="form-row" style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: '1 1 200px' }}>
                  <label className="form-label">Instagram Page URL</label>
                  <input type="text" className="form-control" value={contactInstagram} onChange={(e) => setContactInstagram(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: '1 1 200px' }}>
                  <label className="form-label">YouTube Channel URL</label>
                  <input type="text" className="form-control" value={contactYoutube} onChange={(e) => setContactYoutube(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: '1 1 200px' }}>
                  <label className="form-label">WhatsApp Business Link</label>
                  <input type="text" className="form-control" value={contactWhatsapp} onChange={(e) => setContactWhatsapp(e.target.value)} placeholder="e.g. +917011874347" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Google Maps Embed Script/Code</label>
                <textarea className="form-control" value={contactGoogleMaps} onChange={(e) => setContactGoogleMaps(e.target.value)} rows={3} placeholder="Paste iframe source link..."></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">Footer About Text <span style={{ color: 'var(--accent-primary)', fontSize: '0.75rem', marginLeft: '6px' }}>(Appears in footer ABOUT EASYFR8 section)</span></label>
                <textarea className="form-control" value={contactFooterAbout} onChange={(e) => setContactFooterAbout(e.target.value)} rows={4} placeholder="Enter company brief description for footer About section..."></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">Copyright Text</label>
                <input type="text" className="form-control" value={contactCopyright} onChange={(e) => setContactCopyright(e.target.value)} placeholder="e.g. Copyright @ 2025 vnvision, All Right Reserved" />
              </div>
              <div className="form-group">
                <label className="form-label">Corporate Logo Image</label>
                <div style={{ position: 'relative', border: '1px dashed var(--border-color)', padding: '12px', borderRadius: '4px', textAlign: 'center', cursor: 'pointer', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.85rem' }}>Upload Logo Image</span>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                </div>
                {contactLogoImage && (
                  <div style={{ marginTop: '8px' }}>
                    <img src={contactLogoImage} alt="Logo Preview" style={{ maxHeight: '60px', objectFit: 'contain', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', padding: '4px' }} />
                  </div>
                )}
              </div>
              <button type="submit" className="btn btn-primary">Save Contacts</button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 6: STATIC PAGES */}
      {activeTab === 'static' && (
        <div className="tab-pane active" id="tab-static">
          <div className="chart-card" style={{ maxWidth: '800px' }}>
            <h3 className="chart-card-title" style={{ marginBottom: 'var(--space-4)' }}>Static Page Legal Copies</h3>
            <form onSubmit={handleSaveStatic}>
              
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Privacy Policy Markdown content</label>
                  <label className="switch">
                    <input type="checkbox" checked={staticPrivacyPub} onChange={(e) => setStaticPrivacyPub(e.target.checked)} />
                    <span className="slider"></span>
                  </label>
                </div>
                <textarea className="form-control" value={staticPrivacy} onChange={(e) => setStaticPrivacy(e.target.value)} rows={3}></textarea>
              </div>

              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Terms and Conditions content</label>
                  <label className="switch">
                    <input type="checkbox" checked={staticTermsPub} onChange={(e) => setStaticTermsPub(e.target.checked)} />
                    <span className="slider"></span>
                  </label>
                </div>
                <textarea className="form-control" value={staticTerms} onChange={(e) => setStaticTerms(e.target.value)} rows={3}></textarea>
              </div>

              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Refund Policy Statement</label>
                  <label className="switch">
                    <input type="checkbox" checked={staticRefundPub} onChange={(e) => setStaticRefundPub(e.target.checked)} />
                    <span className="slider"></span>
                  </label>
                </div>
                <textarea className="form-control" value={staticRefund} onChange={(e) => setStaticRefund(e.target.value)} rows={3}></textarea>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Legal Liability Disclaimer</label>
                  <label className="switch">
                    <input type="checkbox" checked={staticDisclaimerPub} onChange={(e) => setStaticDisclaimerPub(e.target.checked)} />
                    <span className="slider"></span>
                  </label>
                </div>
                <textarea className="form-control" value={staticDisclaimer} onChange={(e) => setStaticDisclaimer(e.target.value)} rows={3}></textarea>
              </div>

              <button type="submit" className="btn btn-primary">Save Pages</button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 7: MEDIA LIBRARY */}
      {activeTab === 'media' && (
        <div className="tab-pane active" id="tab-media">
          <div className="chart-card">
            <div className="chart-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <h3 className="chart-card-title" style={{ margin: 0 }}>Assets File Repository</h3>
                <input type="text" className="form-control" value={mediaSearch} onChange={(e) => setMediaSearch(e.target.value)} placeholder="Search files..." style={{ width: '160px', height: '28px', fontSize: '0.75rem' }} />
                <select className="form-control" value={mediaTypeFilter} onChange={(e) => setMediaTypeFilter(e.target.value as any)} style={{ width: '120px', height: '28px', fontSize: '0.75rem', padding: '0 4px' }}>
                  <option value="all">All Files</option>
                  <option value="image">Images</option>
                  <option value="document">Documents</option>
                </select>
              </div>
              <div style={{ position: 'relative' }}>
                <button className="btn btn-primary btn-sm">Upload New Asset</button>
                <input type="file" onChange={handleMediaUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
              {filteredMedia.map((media) => (
                <div key={media.id} style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden', padding: '10px', background: 'var(--bg-secondary)', position: 'relative' }}>
                  {media.type === 'image' ? (
                    <img src={media.url} alt={media.name} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px' }} />
                  ) : (
                    <div style={{ height: '100px', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>📄</div>
                  )}
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={media.name}>{media.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{media.size}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleCopyUrl(media.url)} style={{ padding: '2px 4px', fontSize: '0.65rem' }}>Link</button>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDeleteMedia(media.id, media.name)} style={{ padding: '2px 4px', fontSize: '0.65rem' }}>Del</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: SEO DEFAULTS */}
      {activeTab === 'seo' && (
        <div className="tab-pane active" id="tab-seo">
          <div className="chart-card" style={{ maxWidth: '700px' }}>
            <h3 className="chart-card-title" style={{ marginBottom: 'var(--space-4)' }}>Meta & OpenGraph Tags</h3>
            <form onSubmit={handleSaveSEO}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '12px' }}>Homepage SEO</h4>
              <div className="form-group">
                <label className="form-label">Meta Title *</label>
                <input type="text" className="form-control" value={seoHomeTitle} onChange={(e) => setSeoHomeTitle(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Meta Description *</label>
                <textarea className="form-control" value={seoHomeDesc} onChange={(e) => setSeoHomeDesc(e.target.value)} rows={2} required></textarea>
              </div>
              <div className="form-row" style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Meta Keywords</label>
                  <input type="text" className="form-control" value={seoHomeKeywords} onChange={(e) => setSeoHomeKeywords(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">OG Share Image Link</label>
                  <input type="text" className="form-control" value={seoHomeOgImage} onChange={(e) => setSeoHomeOgImage(e.target.value)} />
                </div>
              </div>

              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '12px', marginTop: '20px' }}>About Us Page SEO</h4>
              <div className="form-row" style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Meta Title</label>
                  <input type="text" className="form-control" value={seoAboutTitle} onChange={(e) => setSeoAboutTitle(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Meta Description</label>
                  <input type="text" className="form-control" value={seoAboutDesc} onChange={(e) => setSeoAboutDesc(e.target.value)} />
                </div>
              </div>

              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '12px', marginTop: '20px' }}>Services Page SEO</h4>
              <div className="form-row" style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Meta Title</label>
                  <input type="text" className="form-control" value={seoServicesTitle} onChange={(e) => setSeoServicesTitle(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Meta Description</label>
                  <input type="text" className="form-control" value={seoServicesDesc} onChange={(e) => setSeoServicesDesc(e.target.value)} />
                </div>
              </div>

              <button type="submit" className="btn btn-primary">Save SEO Configurations</button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 9: PARTNERS */}
      {activeTab === 'partners' && (
        <div className="tab-pane active" id="tab-partners">
          <div className="chart-card">
            <div className="table-header-actions" style={{ marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="chart-card-title" style={{ margin: 0 }}>Partner Logos</h3>
              <button type="button" className="btn btn-primary" onClick={handleOpenAddPartner}>Add New Partner</button>
            </div>
            
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Sort Order</th>
                    <th style={{ width: '120px' }}>Logo</th>
                    <th>Name</th>
                    <th>Website URL</th>
                    <th style={{ width: '100px' }}>Status</th>
                    <th style={{ width: '220px' }} className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...partners].sort((a, b) => a.sort_order - b.sort_order).map((partner, idx) => (
                    <tr key={partner.id}>
                      <td>{partner.sort_order}</td>
                      <td>
                        {partner.logo ? (
                          <img src={partner.logo} alt={partner.name} style={{ width: '100px', height: '40px', objectFit: 'contain', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', padding: '4px' }} />
                        ) : (
                          <div style={{ width: '100px', height: '40px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>No Logo</div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{partner.name}</div>
                      </td>
                      <td>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{partner.websiteUrl || '-'}</div>
                      </td>
                      <td>
                        <span
                          className={`badge badge-${partner.status === 'active' ? 'success' : 'secondary'}`}
                          style={{ cursor: 'pointer', display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}
                          onClick={() => updatePartner(partner.id, { status: partner.status === 'active' ? 'inactive' : 'active' })}
                        >
                          {partner.status}
                        </span>
                      </td>
                      <td className="text-right">
                        <button type="button" className="btn btn-secondary btn-sm" style={{ marginRight: '8px' }} onClick={() => handleOpenEditPartner(partner)}>Edit</button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => { if(confirm('Are you sure you want to delete this partner?')) deletePartner(partner.id); }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {partners.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center" style={{ padding: '30px', color: 'var(--text-muted)' }}>
                        No partners found. Click "Add New Partner" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 10: STATISTICS */}
      {activeTab === 'statistics' && (
        <div className="tab-pane active" id="tab-statistics">
          <div className="chart-card">
            <div className="table-header-actions" style={{ marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="chart-card-title" style={{ margin: 0 }}>Statistics & Counters</h3>
              <button type="button" className="btn btn-primary" onClick={handleOpenAddStat}>Add New Statistic</button>
            </div>
            
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Sort Order</th>
                    <th>Icon Class</th>
                    <th>Label</th>
                    <th>Value</th>
                    <th style={{ width: '100px' }}>Status</th>
                    <th style={{ width: '220px' }} className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...statistics].sort((a, b) => a.sort_order - b.sort_order).map((stat) => (
                    <tr key={stat.id}>
                      <td>{stat.sort_order}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '4px' }}>{stat.icon}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{stat.label}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{stat.value}</div>
                      </td>
                      <td>
                        <span
                          className={`badge badge-${stat.status === 'active' ? 'success' : 'secondary'}`}
                          style={{ cursor: 'pointer', display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}
                          onClick={() => updateStatistic(stat.id, { status: stat.status === 'active' ? 'inactive' : 'active' })}
                        >
                          {stat.status}
                        </span>
                      </td>
                      <td className="text-right">
                        <button type="button" className="btn btn-secondary btn-sm" style={{ marginRight: '8px' }} onClick={() => handleOpenEditStat(stat)}>Edit</button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => { if(confirm('Are you sure you want to delete this statistic?')) deleteStatistic(stat.id); }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {statistics.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center" style={{ padding: '30px', color: 'var(--text-muted)' }}>
                        No statistics found. Click "Add New Statistic" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 11: INDUSTRIES */}
      {activeTab === 'industries' && (
        <div className="tab-pane active" id="tab-industries">
          <div className="chart-card">
            <div className="table-header-actions" style={{ marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="chart-card-title" style={{ margin: 0 }}>Industries Served</h3>
              <button type="button" className="btn btn-primary" onClick={handleOpenAddInd}>Add New Industry</button>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Sort Order</th>
                    <th>Icon Class</th>
                    <th>Industry Title</th>
                    <th>Description</th>
                    <th style={{ width: '100px' }}>Status</th>
                    <th style={{ width: '220px' }} className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...industries].sort((a, b) => a.sort_order - b.sort_order).map((ind) => (
                    <tr key={ind.id}>
                      <td>{ind.sort_order}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '4px' }}>{ind.icon}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{ind.title}</div>
                      </td>
                      <td>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ind.desc}</div>
                      </td>
                      <td>
                        <span
                          className={`badge badge-${ind.status === 'active' ? 'success' : 'secondary'}`}
                          style={{ cursor: 'pointer', display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}
                          onClick={() => updateIndustry(ind.id, { status: ind.status === 'active' ? 'inactive' : 'active' })}
                        >
                          {ind.status}
                        </span>
                      </td>
                      <td className="text-right">
                        <button type="button" className="btn btn-secondary btn-sm" style={{ marginRight: '8px' }} onClick={() => handleOpenEditInd(ind)}>Edit</button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => { if(confirm('Are you sure you want to delete this industry?')) deleteIndustry(ind.id); }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {industries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center" style={{ padding: '30px', color: 'var(--text-muted)' }}>
                        No industries found. Click "Add New Industry" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TESTIMONIAL MODAL */}
      {activeModal === 'testimonial' && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="modal-container">
            <div className="modal-header">
              <h3>{modalMode === 'create' ? 'Add Testimonial' : 'Edit Testimonial'}</h3>
              <button className="modal-close" onClick={() => setActiveModal(null)}><svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <form onSubmit={handleSaveTestimonial}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Author Name</label>
                  <input type="text" className="form-control" value={testimonialAuthor} onChange={(e) => setTestimonialAuthor(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input type="text" className="form-control" value={testimonialCompany} onChange={(e) => setTestimonialCompany(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Quote Statement</label>
                  <textarea className="form-control" value={testimonialText} onChange={(e) => setTestimonialText(e.target.value)} rows={4} required></textarea>
                </div>
                <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Star Rating (1-5)</label>
                    <select className="form-control" value={testimonialRating} onChange={(e) => setTestimonialRating(Number(e.target.value))}>
                      <option value={5}>5 Stars</option>
                      <option value={4}>4 Stars</option>
                      <option value={3}>3 Stars</option>
                      <option value={2}>2 Stars</option>
                      <option value={1}>1 Star</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Sort Order</label>
                    <input type="number" className="form-control" value={testimonialSort} onChange={(e) => setTestimonialSort(Number(e.target.value))} min={1} required />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Testimonial</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HIGHLIGHT MODAL */}
      {activeModal === 'highlight' && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="modal-container">
            <div className="modal-header">
              <h3>{modalMode === 'create' ? 'Add Highlight' : 'Edit Highlight'}</h3>
              <button className="modal-close" onClick={() => setActiveModal(null)}><svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <form onSubmit={handleSaveHighlight}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Highlight Title</label>
                  <input type="text" className="form-control" value={highlightTitle} onChange={(e) => setHighlightTitle(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" value={highlightDesc} onChange={(e) => setHighlightDesc(e.target.value)} rows={3} required></textarea>
                </div>
                <div className="form-group">
                  <label className="form-label">Sort Order</label>
                  <input type="number" className="form-control" value={highlightSort} onChange={(e) => setHighlightSort(Number(e.target.value))} min={1} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Highlight</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEAM MEMBER MODAL */}
      {activeModal === 'team' && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="modal-container">
            <div className="modal-header">
              <h3>{modalMode === 'create' ? 'Add Team Member' : 'Edit Team Member'}</h3>
              <button className="modal-close" onClick={() => setActiveModal(null)}><svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <form onSubmit={handleSaveTeam}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Member Name *</label>
                  <input type="text" className="form-control" value={teamMemberName} onChange={(e) => setTeamMemberName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Designation / Role *</label>
                  <input type="text" className="form-control" value={teamMemberRole} onChange={(e) => setTeamMemberRole(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">LinkedIn profile URL</label>
                  <input type="text" className="form-control" value={teamMemberLinkedIn} onChange={(e) => setTeamMemberLinkedIn(e.target.value)} placeholder="e.g. https://linkedin.com/in/username" />
                </div>
                <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Sort Order</label>
                    <input type="number" className="form-control" value={teamMemberSort} onChange={(e) => setTeamMemberSort(Number(e.target.value))} min={1} required />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Profile Image Attachment</label>
                    <div style={{ position: 'relative', border: '1px dashed var(--border-color)', padding: '8px', borderRadius: '4px', textAlign: 'center', cursor: 'pointer' }}>
                      <span style={{ fontSize: '0.75rem' }}>Upload Photo</span>
                      <input type="file" accept="image/*" onChange={handleTeamAvatarUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                    </div>
                  </div>
                </div>
                {teamMemberAvatar && (
                  <div style={{ marginTop: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <img src={teamMemberAvatar} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Image preview active</span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FAQ MODAL */}
      {activeModal === 'faq' && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="modal-container">
            <div className="modal-header">
              <h3>{faqId !== null ? 'Edit FAQ Entry' : 'Add FAQ Entry'}</h3>
              <button className="modal-close" onClick={() => setActiveModal(null)}><svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <form onSubmit={handleSaveFAQ}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-control" value={faqFormCategory} onChange={(e) => setFaqFormCategory(e.target.value)} required>
                    <option value="Rates">Rates</option>
                    <option value="Compliance">Compliance</option>
                    <option value="Booking">Booking</option>
                    <option value="Schedules">Schedules</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Question</label>
                  <input type="text" className="form-control" value={faqFormQuestion} onChange={(e) => setFaqFormQuestion(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Answer Text</label>
                  <textarea className="form-control" value={faqFormAnswer} onChange={(e) => setFaqFormAnswer(e.target.value)} rows={4} required></textarea>
                </div>
                <div className="form-group">
                  <label className="custom-checkbox">
                    <input type="checkbox" checked={faqFormPublished} onChange={(e) => setFaqFormPublished(e.target.checked)} />
                    <span className="checkbox-mark"></span>
                    <span style={{ marginLeft: '8px', fontSize: '0.85rem', fontWeight: 500 }}>Publish immediately</span>
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save FAQ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HERO SLIDE MODAL */}
      {slideModalOpen && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="modal-container">
            <div className="modal-header">
              <h3>{editingSlideId ? 'Edit Hero Slide' : 'Add Hero Slide'}</h3>
              <button className="modal-close" onClick={() => setSlideModalOpen(false)}><svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <form onSubmit={handleSaveSlide}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="form-group">
                  <label className="form-label">Slide Title *</label>
                  <input type="text" className="form-control" value={slideTitle} onChange={(e) => setSlideTitle(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Subtitle</label>
                  <input type="text" className="form-control" value={slideSubtitle} onChange={(e) => setSlideSubtitle(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" value={slideDescription} onChange={(e) => setSlideDescription(e.target.value)} rows={3} />
                </div>
                <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Button Text</label>
                    <input type="text" className="form-control" value={slideButtonText} onChange={(e) => setSlideButtonText(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Button Link</label>
                    <input type="text" className="form-control" value={slideButtonUrl} onChange={(e) => setSlideButtonUrl(e.target.value)} />
                  </div>
                </div>
                <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Status</label>
                    <select className="form-control" value={slideStatus} onChange={(e) => setSlideStatus(e.target.value as any)}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Upload Slide Background Image</label>
                    <div style={{ position: 'relative', border: '1px dashed var(--border-color)', padding: '8px', borderRadius: '4px', textAlign: 'center', cursor: 'pointer' }}>
                      <span style={{ fontSize: '0.75rem' }}>Upload Image</span>
                      <input type="file" accept="image/*" onChange={handleSlideImageUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                    </div>
                  </div>
                </div>
                {slideImage && (
                  <div style={{ marginTop: '12px' }}>
                    <label className="form-label">Background Preview</label>
                    <img src={slideImage} alt="Preview" style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px' }} />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSlideModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Slide</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PARTNER MODAL */}
      {partnerModalOpen && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="modal-container">
            <div className="modal-header">
              <h3>{editingPartnerId ? 'Edit Partner Logo' : 'Add Partner Logo'}</h3>
              <button className="modal-close" onClick={() => setPartnerModalOpen(false)}><svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <form onSubmit={handleSavePartner}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="form-group">
                  <label className="form-label">Partner Name *</label>
                  <input type="text" className="form-control" value={partnerName} onChange={(e) => setPartnerName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Website URL</label>
                  <input type="text" className="form-control" value={partnerWebsiteUrl} onChange={(e) => setPartnerWebsiteUrl(e.target.value)} placeholder="e.g. https://lxpantos.com" />
                </div>
                <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Status</label>
                    <select className="form-control" value={partnerStatus} onChange={(e) => setPartnerStatus(e.target.value as any)}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Upload Partner Logo</label>
                    <div style={{ position: 'relative', border: '1px dashed var(--border-color)', padding: '8px', borderRadius: '4px', textAlign: 'center', cursor: 'pointer' }}>
                      <span style={{ fontSize: '0.75rem' }}>Upload Image</span>
                      <input type="file" accept="image/*" onChange={handlePartnerLogoUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                    </div>
                  </div>
                </div>
                {partnerLogo && (
                  <div style={{ marginTop: '12px' }}>
                    <label className="form-label">Logo Preview</label>
                    <img src={partnerLogo} alt="Preview" style={{ height: '50px', objectFit: 'contain', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', padding: '4px' }} />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setPartnerModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Partner</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATISTIC MODAL */}
      {statModalOpen && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="modal-container">
            <div className="modal-header">
              <h3>{editingStatId ? 'Edit Statistic' : 'Add Statistic'}</h3>
              <button className="modal-close" onClick={() => setStatModalOpen(false)}><svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <form onSubmit={handleSaveStat}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="form-group">
                  <label className="form-label">Label *</label>
                  <input type="text" className="form-control" value={statLabel} onChange={(e) => setStatLabel(e.target.value)} required placeholder="e.g. Clients Served" />
                </div>
                <div className="form-group">
                  <label className="form-label">Value *</label>
                  <input type="text" className="form-control" value={statValue} onChange={(e) => setStatValue(e.target.value)} required placeholder="e.g. 1500+" />
                </div>
                <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Icon Class</label>
                    <input type="text" className="form-control" value={statIcon} onChange={(e) => setStatIcon(e.target.value)} placeholder="e.g. flaticon-transport-9" />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Status</label>
                    <select className="form-control" value={statStatus} onChange={(e) => setStatStatus(e.target.value as any)}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setStatModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Statistic</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INDUSTRY MODAL */}
      {indModalOpen && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="modal-container">
            <div className="modal-header">
              <h3>{editingIndId ? 'Edit Industry' : 'Add Industry'}</h3>
              <button className="modal-close" onClick={() => setIndModalOpen(false)}><svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <form onSubmit={handleSaveInd}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="form-group">
                  <label className="form-label">Industry Title *</label>
                  <input type="text" className="form-control" value={indTitle} onChange={(e) => setIndTitle(e.target.value)} required placeholder="e.g. Automotive" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <textarea className="form-control" value={indDesc} onChange={(e) => setIndDesc(e.target.value)} rows={3} required placeholder="Brief description of logistics services for this industry..." />
                </div>
                <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Icon Class</label>
                    <input type="text" className="form-control" value={indIcon} onChange={(e) => setIndIcon(e.target.value)} placeholder="e.g. flaticon-cogwheel" />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Status</label>
                    <select className="form-control" value={indStatus} onChange={(e) => setIndStatus(e.target.value as any)}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIndModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Industry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SERVICE EDITING MODAL */}
      {serviceModalOpen && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="modal-container" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3>{editingServiceId ? 'Edit Service Details' : 'Create New Service'}</h3>
              <button className="modal-close" onClick={() => setServiceModalOpen(false)}><svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <form onSubmit={handleSaveService}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Service Title *</label>
                    <input type="text" className="form-control" value={serviceTitle} onChange={(e) => setServiceTitle(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">URL Slug *</label>
                    <input type="text" className="form-control" value={serviceSlug} onChange={(e) => setServiceSlug(e.target.value)} required placeholder="e.g. ocean-freight-forwarding" />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Category *</label>
                    <select className="form-control" value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value as any)} required>
                      <option value="core">Core Service</option>
                      <option value="value-added">Value Added Service</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Icon Identifier *</label>
                    <input type="text" className="form-control" value={serviceIcon} onChange={(e) => setServiceIcon(e.target.value)} required placeholder="e.g. anchor, plane, truck" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Short Description *</label>
                  <textarea className="form-control" value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)} rows={2} required placeholder="Brief summary of service for card views..." />
                </div>

                <div className="form-group">
                  <label className="form-label">Full Page Details & Advantages <span style={{ color: 'var(--accent-primary)', fontSize: '0.75rem' }}>(Separate with Advantages header)</span></label>
                  <textarea 
                    className="form-control" 
                    value={serviceDetails} 
                    onChange={(e) => setServiceDetails(e.target.value)} 
                    rows={6} 
                    placeholder="Full service description.&#10;&#10;Advantages:&#10;- Advantage statement 1&#10;- Advantage statement 2"
                  />
                </div>

                <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Sort Order</label>
                    <input type="number" className="form-control" value={serviceSortOrder} onChange={(e) => setServiceSortOrder(Number(e.target.value))} min={1} required />
                  </div>
                  <div className="form-group" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '28px' }}>
                    <label className="custom-checkbox">
                      <input type="checkbox" checked={serviceActive} onChange={(e) => setServiceActive(e.target.checked)} />
                      <span className="checkbox-mark"></span>
                      <span style={{ marginLeft: '8px', fontSize: '0.85rem', fontWeight: 600 }}>Active Status</span>
                    </label>
                  </div>
                </div>

                <div className="form-row" style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Main Image</label>
                    <div style={{ position: 'relative', border: '1px dashed var(--border-color)', padding: '8px', borderRadius: '4px', textAlign: 'center', cursor: 'pointer' }}>
                      <span style={{ fontSize: '0.75rem' }}>Upload Main Image</span>
                      <input type="file" accept="image/*" onChange={handleServiceImageUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                    </div>
                    {serviceImage && (
                      <div style={{ marginTop: '8px' }}>
                        <img src={serviceImage} alt="Main Preview" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px' }} />
                      </div>
                    )}
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Banner Image</label>
                    <div style={{ position: 'relative', border: '1px dashed var(--border-color)', padding: '8px', borderRadius: '4px', textAlign: 'center', cursor: 'pointer' }}>
                      <span style={{ fontSize: '0.75rem' }}>Upload Banner Image</span>
                      <input type="file" accept="image/*" onChange={handleServiceBannerUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                    </div>
                    {serviceBannerImage && (
                      <div style={{ marginTop: '8px' }}>
                        <img src={serviceBannerImage} alt="Banner Preview" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px' }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setServiceModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Service</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
