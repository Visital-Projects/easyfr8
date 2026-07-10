// Reusable service page template
import { useCms } from '../context/CmsContext'

export default function ServicePage({ title, icon, heroDesc, sections, relatedServices }) {
  const { cms } = useCms()

  const servicePaths = {
    'Ocean Freight Forwarding': '/services/ocean-freight-forwarding',
    'Ocean Freight FCL/LCL': '/services/ocean-freight-forwarding',
    'Air Freight Forwarding': '/services/air-freight-forwarding',
    'Expedited Air Freight': '/services/air-freight-forwarding',
    'Road Freight Forwarding': '/services/road-freight-forwarding',
    'LTL & FTL Road Haulage': '/services/road-freight-forwarding',
    'Warehousing': '/services/warehousing',
    'Warehousing & Cross-Docking': '/services/warehousing',
    'Custom Clearance': '/services/custom-clearance',
    'CFS': '/services/cfs',
    'Contract Handling': '/services/contract-handling',
    'Cargo Insurance': '/services/cargo-insurance'
  }

  return (
    <div id="page">
      {/* Page Header */}
      <div className="page-header title-area">
        <div className="header-title">
          <div className="container">
            <div className="row">
              <div className="col-md-12 col-sm-12 col-xs-12">
                <h1 className="page-title">{title}</h1>
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
                  <span>Services</span>
                  <i className="fa fa-angle-right" aria-hidden="true" style={{ marginLeft: '8px' }}></i>
                  <span style={{ marginLeft: '8px' }}>{title}</span>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Service Overview */}
      <section className="service-page-content secpadd">
        <div className="container">
          <div className="row">
            <div className="col-md-8">
              <div className="service-icon" style={{ marginBottom: '20px' }}>
                <span className="fh-icon" style={{ fontSize: '60px' }}><i className={icon}></i></span>
              </div>
              <div className="fh-section-title clearfix text-left version-dark paddbtm30">
                <h2>{title}</h2>
              </div>
              <p>{heroDesc}</p>

              {sections && sections.map((sec, i) => (
                <div key={i} style={{ marginTop: '30px' }}>
                  <h4>{sec.title}</h4>
                  {sec.content && <p>{sec.content}</p>}
                  {sec.items && (
                    <ul style={{ paddingLeft: '20px', lineHeight: '2' }}>
                      {sec.items.map((item, j) => <li key={j}>{item}</li>)}
                    </ul>
                  )}
                </div>
              ))}

              <div style={{ marginTop: '40px' }}>
                <a href="/contact" className="fh-btn btn">Get A Quote</a>
              </div>
            </div>

            <div className="col-md-4">
              {/* Dynamic Services List */}
              <div className="sidebar-service" style={{ background: '#f7f7f7', padding: '25px' }}>
                <h4 className="widget-title">Our Services</h4>
                <ul className="service-list" style={{ listStyle: 'none', padding: 0 }}>
                  {cms.services.filter(s => s.active).map(service => {
                    const path = servicePaths[service.title] || '/services'
                    return (
                      <li key={service.id}>
                        <a href={path}>{service.title}</a>
                      </li>
                    )
                  })}
                </ul>
              </div>

              {/* Dynamic "Need Help?" box */}
              <div style={{ background: '#d64238', padding: '25px', marginTop: '20px', color: 'white' }}>
                <h4 style={{ color: 'white', marginBottom: '15px' }}>Need Help?</h4>
                <p style={{ color: 'white', marginBottom: '10px' }}>Call us for a quick quote!</p>
                {cms.contact.phones && cms.contact.phones[0] && (
                  <p style={{ color: 'white', fontWeight: 700, fontSize: '18px' }}>{cms.contact.phones[0]}</p>
                )}
                {cms.contact.emails && cms.contact.emails[0] && (
                  <p style={{ color: 'white', marginTop: '10px' }}>{cms.contact.emails[0]}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
