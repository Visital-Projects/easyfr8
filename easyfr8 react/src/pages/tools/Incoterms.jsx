import { useEffect } from 'react'
import incotermsPdf from '../../assets/images/incoterms.pdf'

export default function Incoterms() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <>
      {/* Page Header */}
      <div className="page-header title-area">
        <div className="header-title">
          <div className="container">
            <div className="row">
              <div className="col-md-12 col-sm-12 col-xs-12">
                <h1 className="page-title">Tools</h1>
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
                  <span>Tools</span>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="secpadd" style={{ background: '#f7f7f7' }}>
        <div className="container" style={{ maxWidth: '1200px' }}>
          <div className="row" style={{ background: '#fff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', padding: '20px' }}>
            {/* LEFT : PDF PREVIEW */}
            <div className="col-md-6 col-sm-12" style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '15px' }}>Incoterms® 2020 – PDF Preview</h4>
              <div style={{ border: '1px solid #ddd', height: '500px' }}>
                <iframe src={incotermsPdf} width="100%" height="100%" style={{ border: 'none' }} title="Incoterms PDF Preview"></iframe>
              </div>
              <p style={{ fontSize: '12px', marginTop: '8px', color: '#777' }}>
                Scroll inside the document to preview the Incoterms® PDF.
              </p>
            </div>

            {/* RIGHT : CONTENT */}
            <div className="col-md-6 col-sm-12">
              <h3>Incoterms® 2020</h3>
              <p>
                The latest, active rules are <strong>Incoterms® 2020</strong>, established by the <strong>International Chamber of Commerce (ICC)</strong>. These 11 international commercial terms define seller and buyer responsibilities for delivery, risk, and costs in international trade.
              </p>
              <p>
                They consist of <strong>seven rules applicable to all transport modes</strong> and <strong>four rules specifically for sea and inland waterway transport</strong>.
              </p>

              <h4 style={{ marginTop: '20px' }}>Rules for Any Mode of Transport</h4>
              <ul style={{ paddingLeft: '18px', lineHeight: '1.7' }}>
                <li>
                  <strong>EXW (Ex Works):</strong> Seller makes goods available at their premises; buyer handles all transport, risks, and costs.
                </li>
                <li>
                  <strong>FCA (Free Carrier):</strong> Seller delivers goods to a carrier nominated by the buyer at a named place.
                </li>
                <li>
                  <strong>CPT (Carriage Paid To):</strong> Seller pays for carriage to the named destination, but risk transfers once goods are handed to the first carrier.
                </li>
                <li>
                  <strong>CIP (Carriage and Insurance Paid To):</strong> Seller pays for carriage and insurance with higher insurance coverage (Clause A).
                </li>
                <li>
                  <strong>DAP (Delivered at Place):</strong> Seller delivers goods ready for unloading at the named destination.
                </li>
                <li>
                  <strong>DPU (Delivered at Place Unloaded):</strong> Seller delivers and unloads goods at the destination; replaces the old DAT rule.
                </li>
              </ul>

              <p style={{ marginTop: '15px', fontSize: '13px', color: '#555' }}>
                📌 <strong>Note:</strong> Incoterms® define responsibilities, costs, and risk transfer, but do not cover ownership transfer or payment terms.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
