import { useState } from 'react'
import incotermsPdf from '../assets/images/incoterms.pdf'

export default function Tools() {
  const [mode, setMode] = useState('')
  const [unit, setUnit] = useState('')
  const [actualWeight, setActualWeight] = useState('')
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [containers, setContainers] = useState(1)
  const [result, setResult] = useState(null)

  const getDivisor = () => {
    if (mode === 'air') return 6000
    if (mode === 'sea') return 1000
    if (mode === 'road') return 3000
    return 5000
  }

  const toCm = (val) => {
    if (unit === 'cm') return val
    if (unit === 'm') return val * 100
    if (unit === 'inch') return val * 2.54
    return val
  }

  const handleCalculate = (e) => {
    e.preventDefault()
    const l = toCm(parseFloat(length))
    const w = toCm(parseFloat(width))
    const h = toCm(parseFloat(height))
    const n = parseInt(containers)
    const act = parseFloat(actualWeight)
    const divisor = getDivisor()
    const volPerContainer = (l * w * h) / divisor
    const totalVol = volPerContainer * n
    const totalAct = act * n
    const totalCharge = Math.max(totalVol, totalAct)
    const chargePerCont = totalCharge / n
    setResult({
      n,
      volPerContainer: volPerContainer.toFixed(3),
      totalVol: totalVol.toFixed(3),
      totalAct: totalAct.toFixed(3),
      totalCharge: totalCharge.toFixed(3),
      chargePerCont: chargePerCont.toFixed(3),
    })
  }

  return (
    <div id="page">
      {/* Page Header */}
      <div className="page-header title-area">
        <div className="header-title">
          <div className="container">
            <div className="row">
              <div className="col-md-12 col-sm-12 col-xs-12">
                <h1 className="page-title"> Tools</h1>
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

      {/* Volumetric Weight Calculator */}
      <section id="vwc" className="secpadd" style={{ background: '#f7f7f7' }}>
        <div className="container text-center">
          <h2>Volumetric Weight Calculator</h2>
          <p>Calculate chargeable weight for Air, Sea &amp; Road shipments</p>
        </div>
      </section>

      <section className="secpadd">
        <div className="container" style={{ maxWidth: '900px' }}>
          <div style={{ background: '#fff', padding: '30px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
            <form id="calcForm" onSubmit={handleCalculate}>
              <div className="row">
                <div className="col-md-4">
                  <label>Transport Mode</label>
                  <select className="form-control" value={mode} onChange={e => setMode(e.target.value)} required>
                    <option value="">Select</option>
                    <option value="air">Air</option>
                    <option value="sea">Sea</option>
                    <option value="road">Road</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label>Dimension Unit</label>
                  <select className="form-control" value={unit} onChange={e => setUnit(e.target.value)} required>
                    <option value="">Select</option>
                    <option value="cm">Centimeters (CM)</option>
                    <option value="m">Meters (M)</option>
                    <option value="inch">Inches</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label>Actual Weight (KG)</label>
                  <input type="number" className="form-control" step="0.01" required value={actualWeight} onChange={e => setActualWeight(e.target.value)} />
                </div>
              </div>

              <div className="row" style={{ marginTop: '20px' }}>
                <div className="col-md-4">
                  <label>Length</label>
                  <input type="number" className="form-control" step="0.01" required value={length} onChange={e => setLength(e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label>Width</label>
                  <input type="number" className="form-control" step="0.01" required value={width} onChange={e => setWidth(e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label>Height</label>
                  <input type="number" className="form-control" step="0.01" required value={height} onChange={e => setHeight(e.target.value)} />
                </div>
              </div>

              <div className="row" style={{ marginTop: '20px' }}>
                <div className="col-md-4">
                  <label>Number of Containers</label>
                  <input type="number" className="form-control" min="1" step="1" required value={containers} onChange={e => setContainers(e.target.value)} />
                </div>
              </div>

              <div className="text-center" style={{ marginTop: '30px' }}>
                <button type="submit" className="fh-btn btn" style={{ background: '#d64238', color: '#fff' }}>
                  Calculate
                </button>
              </div>
            </form>

            {result && (
              <div style={{ marginTop: '30px', padding: '20px', background: '#f7f7f7' }}>
                <h4>Calculation Result</h4>
                <p><strong>Number of Containers:</strong> {result.n}</p>
                <p><strong>Volumetric Weight (per container):</strong> {result.volPerContainer} KG</p>
                <p><strong>Total Volumetric Weight:</strong> {result.totalVol} KG</p>
                <p><strong>Total Actual Weight:</strong> {result.totalAct} KG</p>
                <p><strong>Total Chargeable Weight:</strong> {result.totalCharge} KG</p>
                <p><strong>Chargeable Weight per Container:</strong> {result.chargePerCont} KG</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Incoterms Section */}
      <section id="ict" className="secpadd" style={{ background: '#f7f7f7' }}>
        <div className="container" style={{ maxWidth: '1200px' }}>
          <div className="row" style={{ background: '#fff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', padding: '20px' }}>
            <div className="col-md-6 col-sm-12" style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '15px' }}>Incoterms® 2020 – PDF Preview</h4>
              <div style={{ border: '1px solid #ddd', height: '500px' }}>
                <iframe
                  src={incotermsPdf}
                  width="100%"
                  height="100%"
                  style={{ border: 'none' }}
                  title="Incoterms PDF"
                ></iframe>
              </div>
              <p style={{ fontSize: '12px', marginTop: '8px', color: '#777' }}>Scroll inside the document to preview the Incoterms® PDF.</p>
            </div>

            <div className="col-md-6 col-sm-12">
              <h3>Incoterms® 2020</h3>
              <p>The latest, active rules are <strong>Incoterms® 2020</strong>, established by the <strong>International Chamber of Commerce (ICC)</strong>. These 11 international commercial terms define seller and buyer responsibilities for delivery, risk, and costs in international trade.</p>
              <p>They consist of <strong>seven rules applicable to all transport modes</strong> and <strong>four rules specifically for sea and inland waterway transport</strong>.</p>
              <h4 style={{ marginTop: '20px' }}>Rules for Any Mode of Transport</h4>
              <ul style={{ paddingLeft: '18px', lineHeight: '1.7' }}>
                <li><strong>EXW (Ex Works):</strong> Seller makes goods available at their premises; buyer handles all transport, risks, and costs.</li>
                <li><strong>FCA (Free Carrier):</strong> Seller delivers goods to a carrier nominated by the buyer at a named place.</li>
                <li><strong>CPT (Carriage Paid To):</strong> Seller pays for carriage to the named destination, but risk transfers once goods are handed to the first carrier.</li>
                <li><strong>CIP (Carriage and Insurance Paid To):</strong> Seller pays for carriage and insurance with higher insurance coverage (Clause A).</li>
                <li><strong>DAP (Delivered at Place):</strong> Seller delivers goods ready for unloading at the named destination.</li>
                <li><strong>DPU (Delivered at Place Unloaded):</strong> Seller delivers and unloads goods at the destination; replaces the old DAT rule.</li>
              </ul>
              <p style={{ marginTop: '15px', fontSize: '13px', color: '#555' }}>📌 <strong>Note:</strong> Incoterms® define responsibilities, costs, and risk transfer, but do not cover ownership transfer or payment terms.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
