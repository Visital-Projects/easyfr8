import { useState, useEffect } from 'react'

export default function VolumetricWeightCalculator() {
  const [mode, setMode] = useState('')
  const [unit, setUnit] = useState('')
  const [actualWeight, setActualWeight] = useState('')
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [containers, setContainers] = useState('1')
  
  const [result, setResult] = useState(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleCalculate = (e) => {
    e.preventDefault()

    const L = parseFloat(length)
    const W = parseFloat(width)
    const H = parseFloat(height)
    const cnts = parseInt(containers) || 1
    const actW = parseFloat(actualWeight)

    let volumetricWeightPerContainer = 0

    // AIR / ROAD
    if (mode === 'air' || mode === 'road') {
      if (unit === 'cm') {
        volumetricWeightPerContainer = (L * W * H) / 5000
      } else if (unit === 'm') {
        volumetricWeightPerContainer = (L * W * H) * 167
      } else if (unit === 'inch') {
        volumetricWeightPerContainer = (L * W * H) / 139
      }
    }

    // SEA
    if (mode === 'sea') {
      if (unit === 'cm') {
        volumetricWeightPerContainer = (L * W * H) / 100000
      } else if (unit === 'm') {
        volumetricWeightPerContainer = (L * W * H) * 1000
      } else if (unit === 'inch') {
        volumetricWeightPerContainer = (L * W * H) / 366
      }
    }

    const totalVolumetricWeight = volumetricWeightPerContainer * cnts
    const totalActualWeight = actW * cnts
    const totalChargeableWeight = Math.max(totalVolumetricWeight, totalActualWeight)
    const chargeablePerContainer = totalChargeableWeight / cnts

    setResult({
      containers: cnts,
      volWeightPerContainer: volumetricWeightPerContainer.toFixed(3),
      volWeight: totalVolumetricWeight.toFixed(3),
      actWeight: totalActualWeight.toFixed(3),
      chargeWeight: totalChargeableWeight.toFixed(3),
      chargePerContainer: chargeablePerContainer.toFixed(3)
    })
  }

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

      {/* Page Title */}
      <section className="secpadd" style={{ background: '#f7f7f7' }}>
        <div className="container text-center">
          <h2>Volumetric Weight Calculator</h2>
          <p>Calculate chargeable weight for Air, Sea & Road shipments</p>
        </div>
      </section>

      {/* Calculator */}
      <section className="secpadd">
        <div className="container" style={{ maxWidth: '900px' }}>
          <div style={{ background: '#fff', padding: '30px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
            <form onSubmit={handleCalculate}>
              {/* Mode */}
              <div className="row">
                <div className="col-md-4">
                  <label>Transport Mode</label>
                  <select value={mode} onChange={e => setMode(e.target.value)} className="form-control" required>
                    <option value="">Select</option>
                    <option value="air">Air</option>
                    <option value="sea">Sea</option>
                    <option value="road">Road</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label>Dimension Unit</label>
                  <select value={unit} onChange={e => setUnit(e.target.value)} className="form-control" required>
                    <option value="">Select</option>
                    <option value="cm">Centimeters (CM)</option>
                    <option value="m">Meters (M)</option>
                    <option value="inch">Inches</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label>Actual Weight (KG)</label>
                  <input type="number" value={actualWeight} onChange={e => setActualWeight(e.target.value)} className="form-control" step="0.01" required />
                </div>
              </div>

              {/* Dimensions */}
              <div className="row" style={{ marginTop: '20px' }}>
                <div className="col-md-4">
                  <label>Length</label>
                  <input type="number" value={length} onChange={e => setLength(e.target.value)} className="form-control" step="0.01" required />
                </div>
                <div className="col-md-4">
                  <label>Width</label>
                  <input type="number" value={width} onChange={e => setWidth(e.target.value)} className="form-control" step="0.01" required />
                </div>
                <div className="col-md-4">
                  <label>Height</label>
                  <input type="number" value={height} onChange={e => setHeight(e.target.value)} className="form-control" step="0.01" required />
                </div>
              </div>

              {/* Number of Containers */}
              <div className="row" style={{ marginTop: '20px' }}>
                <div className="col-md-4">
                  <label>Number of Containers</label>
                  <input type="number" value={containers} onChange={e => setContainers(e.target.value)} className="form-control" min="1" step="1" required />
                </div>
              </div>

              {/* Button */}
              <div className="text-center" style={{ marginTop: '30px' }}>
                <button type="submit" className="fh-btn btn" style={{ background: '#d64238', color: '#fff' }}>
                  Calculate
                </button>
              </div>
            </form>

            {/* Result */}
            {result && (
              <div style={{ marginTop: '30px', padding: '20px', background: '#f7f7f7' }}>
                <h4>Calculation Result</h4>
                <p><strong>Number of Containers:</strong> <span>{result.containers}</span></p>
                <p><strong>Volumetric Weight (per container):</strong> <span>{result.volWeightPerContainer}</span> KG</p>
                <p><strong>Total Volumetric Weight:</strong> <span>{result.volWeight}</span> KG</p>
                <p><strong>Total Actual Weight:</strong> <span>{result.actWeight}</span> KG</p>
                <p><strong>Total Chargeable Weight:</strong> <span>{result.chargeWeight}</span> KG</p>
                <p><strong>Chargeable Weight per Container:</strong> <span>{result.chargePerContainer}</span> KG</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
