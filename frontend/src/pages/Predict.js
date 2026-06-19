import React, { useState } from 'react'
import API from '../api'

export default function Predict() {
  const [form, setForm] = useState({
    manufacturer: 'toyota',
    year: 2019,
    odometer: 45000,
    condition: 'excellent',
    fuel: 'gas',
    transmission: 'automatic',
    drive: 'fwd',
    cylinders: '6 cylinders',
    type: 'sedan',
    paint_color: 'white',
    state: 'ca',
    title_status: 'clean'
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await API.post('/predict', {
        ...form,
        year: parseInt(form.year),
        odometer: parseInt(form.odometer)
      })
      setResult(res.data)
    } catch (err) {
      setError('Prediction failed. Please try again.')
    }
    setLoading(false)
  }

  const getRiskColor = (price) => {
    if (price < 10000) return '#22c55e'
    if (price < 25000) return '#f59e0b'
    return '#E24B4A'
  }

  return (
    <div className="page">
      <h1 className="page-title">Price predictor</h1>
      <p className="page-sub">AI-powered market value estimation with SHAP explanation</p>

      <div style={styles.layout}>
        <div className="card" style={{flex:1}}>
          <div className="card-title">
            Car details
            <span className="badge badge-red">XGBoost + LightGBM</span>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={styles.formGrid}>
              <div style={{marginBottom:'12px'}}>
                <label style={styles.label}>Manufacturer</label>
                <select value={form.manufacturer} onChange={e => setForm({...form, manufacturer: e.target.value})}>
                  <option value="toyota">Toyota</option>
                  <option value="ford">Ford</option>
                  <option value="chevrolet">Chevrolet</option>
                  <option value="honda">Honda</option>
                  <option value="nissan">Nissan</option>
                  <option value="bmw">BMW</option>
                  <option value="mercedes-benz">Mercedes-Benz</option>
                  <option value="audi">Audi</option>
                  <option value="jeep">Jeep</option>
                  <option value="ram">Ram</option>
                </select>
              </div>
              <div style={{marginBottom:'12px'}}>
                <label style={styles.label}>Year</label>
                <input
                  type="number"
                  value={form.year}
                  min="1990" max="2024"
                  onChange={e => setForm({...form, year: e.target.value})}
                />
              </div>
              <div style={{marginBottom:'12px'}}>
                <label style={styles.label}>Odometer (miles)</label>
                <input
                  type="number"
                  value={form.odometer}
                  onChange={e => setForm({...form, odometer: e.target.value})}
                />
              </div>
              <div style={{marginBottom:'12px'}}>
                <label style={styles.label}>Condition</label>
                <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})}>
                  <option value="new">New</option>
                  <option value="like new">Like new</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="salvage">Salvage</option>
                </select>
              </div>
              <div style={{marginBottom:'12px'}}>
                <label style={styles.label}>Fuel type</label>
                <select value={form.fuel} onChange={e => setForm({...form, fuel: e.target.value})}>
                  <option value="gas">Gas</option>
                  <option value="diesel">Diesel</option>
                  <option value="electric">Electric</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div style={{marginBottom:'12px'}}>
                <label style={styles.label}>Transmission</label>
                <select value={form.transmission} onChange={e => setForm({...form, transmission: e.target.value})}>
                  <option value="automatic">Automatic</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div style={{marginBottom:'12px'}}>
                <label style={styles.label}>Drive type</label>
                <select value={form.drive} onChange={e => setForm({...form, drive: e.target.value})}>
                  <option value="fwd">FWD</option>
                  <option value="rwd">RWD</option>
                  <option value="4wd">4WD</option>
                </select>
              </div>
              <div style={{marginBottom:'12px'}}>
                <label style={styles.label}>Cylinders</label>
                <select value={form.cylinders} onChange={e => setForm({...form, cylinders: e.target.value})}>
                  <option value="4 cylinders">4 cylinders</option>
                  <option value="6 cylinders">6 cylinders</option>
                  <option value="8 cylinders">8 cylinders</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            {error && <p style={{color:'#E24B4A',fontSize:'12px',marginBottom:'8px'}}>{error}</p>}
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Predicting...' : 'Predict price'}
            </button>
          </form>
        </div>

        <div style={{flex:1,display:'flex',flexDirection:'column',gap:'14px'}}>
          {result ? (
            <>
              <div className="card">
                <div style={{textAlign:'center',paddingBottom:'16px',borderBottom:'0.5px solid #f0f0f0',marginBottom:'16px'}}>
                  <div style={{fontSize:'12px',color:'#888',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:'6px'}}>
                    Predicted market value
                  </div>
                  <div style={{fontSize:'36px',fontWeight:'500',color:getRiskColor(result.predicted_price)}}>
                    ${result.predicted_price?.toLocaleString()}
                  </div>
                  <div style={{fontSize:'12px',color:'#888',marginTop:'4px'}}>
                    Confidence: ${result.confidence_low?.toLocaleString()} — ${result.confidence_high?.toLocaleString()}
                  </div>
                  <div style={styles.meter}>
                    <div style={{
                      ...styles.meterFill,
                      width: `${Math.min((result.predicted_price / 100000) * 100, 100)}%`,
                      background: getRiskColor(result.predicted_price)
                    }}/>
                  </div>
                </div>
                <div style={styles.statRow}>
                  <div style={styles.statBox}>
                    <div style={styles.statLabel}>You selected</div>
                    <div style={styles.statVal}>{form.year} {form.manufacturer}</div>
                  </div>
                  <div style={styles.statBox}>
                    <div style={styles.statLabel}>Condition</div>
                    <div style={styles.statVal}>{form.condition}</div>
                  </div>
                  <div style={styles.statBox}>
                    <div style={styles.statLabel}>Mileage</div>
                    <div style={styles.statVal}>{parseInt(form.odometer).toLocaleString()} mi</div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-title">
                  Why this price? (SHAP)
                  <span className="badge badge-blue">Explainable AI</span>
                </div>
                {result.top_factors?.map((factor, i) => (
                  <div key={i} style={styles.shapRow}>
                    <div style={styles.shapLabel}>{factor.feature}</div>
                    <div style={styles.shapTrack}>
                      {factor.shap_value > 0 ? (
                        <div style={{
                          position:'absolute', left:'50%',
                          width:`${Math.min(Math.abs(factor.shap_value) * 2, 48)}%`,
                          height:'100%', background:'#E24B4A',
                          borderRadius:'0 3px 3px 0'
                        }}/>
                      ) : (
                        <div style={{
                          position:'absolute', right:'50%',
                          width:`${Math.min(Math.abs(factor.shap_value) * 2, 48)}%`,
                          height:'100%', background:'#378ADD',
                          borderRadius:'3px 0 0 3px'
                        }}/>
                      )}
                    </div>
                    <div style={{
                      ...styles.shapVal,
                      color: factor.shap_value > 0 ? '#E24B4A' : '#378ADD'
                    }}>
                      {factor.shap_value > 0 ? '+' : ''}${Math.round(factor.shap_value).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="card" style={{textAlign:'center',padding:'40px'}}>
              <img
                src="https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=300&h=200&fit=crop"
                alt="car"
                style={{width:'100%',height:'160px',objectFit:'cover',borderRadius:'8px',marginBottom:'16px'}}
              />
              <div style={{fontSize:'14px',color:'#888'}}>
                Fill in the car details and click Predict price to get an instant ML-powered valuation
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  layout: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0 12px',
  },
  label: {
    fontSize: '11px',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    display: 'block',
    marginBottom: '4px',
  },
  meter: {
    height: '6px',
    background: '#f0f0f0',
    borderRadius: '3px',
    overflow: 'hidden',
    margin: '10px auto',
    maxWidth: '200px',
  },
  meterFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.5s ease',
  },
  statRow: {
    display: 'flex',
    gap: '10px',
  },
  statBox: {
    flex: 1,
    background: '#f8f8f8',
    borderRadius: '8px',
    padding: '10px',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: '11px',
    color: '#888',
    marginBottom: '3px',
  },
  statVal: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#1a1a1a',
    textTransform: 'capitalize',
  },
  shapRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  shapLabel: {
    fontSize: '11px',
    color: '#888',
    width: '100px',
    textAlign: 'right',
    flexShrink: 0,
  },
  shapTrack: {
    flex: 1,
    height: '8px',
    background: '#f0f0f0',
    borderRadius: '3px',
    position: 'relative',
    overflow: 'hidden',
  },
  shapVal: {
    fontSize: '11px',
    width: '60px',
    flexShrink: 0,
    fontWeight: '500',
  },
}