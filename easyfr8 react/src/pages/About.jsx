import { useCms } from '../context/CmsContext'
import { getImageUrl } from '../services/api'
import aboutImg from '../assets/images/resources/aboutus-1.jpg'

export default function About() {
  const { cms } = useCms()
  return (
    <div id="page">
      {/* Page Header */}
      <div className="page-header title-area">
        <div className="header-title">
          <div className="container">
            <div className="row">
              <div className="col-md-12 col-sm-12 col-xs-12">
                <h1 className="page-title">About Us</h1>
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
                  <span>About Us</span>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About Us Section */}
      <section id="abtsec" className="aboutsec-2 secpaddbig">
        <div className="container">
          <div className="row">
            <div className="col-md-4 col-sm-6">
              <div className="abotimglft">
                <img src={cms.aboutUs.overviewImage ? getImageUrl(cms.aboutUs.overviewImage) : aboutImg} className="img-responsive" alt="About Us" />
              </div>
            </div>
            <div className="col-md-8 col-sm-6">
              <div className="abotinforgt">
                <div className="fh-section-title clearfix text-left version-dark paddbtm30">
                  <h2>Who We are</h2>
                </div>
                <p style={{ whiteSpace: 'pre-line' }}>{cms.aboutUs.overview}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Vision Values */}
      <section className="features-3 bluebg">
        <div className="container">
          <div className="row">
            <div className="col-sm-4">
              <div className="fh-feature-box"><span className="chars">M</span>
                <h4 className="box-title">Our Mission</h4>
                <div className="desc">{cms.aboutUs.mission}</div>
              </div>
            </div>
            <div className="col-sm-4">
              <div className="fh-feature-box"><span className="chars">V</span>
                <h4 className="box-title">Our Vision</h4>
                <div className="desc">{cms.aboutUs.vision}</div>
              </div>
            </div>
            <div className="col-sm-4">
              <div className="fh-feature-box"><span className="chars">C</span>
                <h4 className="box-title">Core Values</h4>
                <div className="desc">{cms.aboutUs.coreValues || 'Integrity, Innovation, Intelligence.'}</div>
              </div>
            </div>
          </div>
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
    </div>
  )
}
