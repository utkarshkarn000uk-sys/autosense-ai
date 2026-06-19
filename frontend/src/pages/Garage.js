import React, { useState, useEffect } from 'react'
import API from '../api'

const CAR_IMAGES = [
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=300&h=200&fit=crop',
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=300&h=200&fit=crop',
  'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=300&h=200&fit=crop',
  'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=300&h=200&fit=crop',
  'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=300&h=200&fit=crop',
]

export default function Garage() {
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    manufacturer: '',
    model_name: '',
    year: 2020,
    odometer: 50000,
    condition: 'good',
    price: 15000,
  })
  const [saving, setSaving] = useState(false)

  const fetchCars = async () => {
    try {
      const res = await API.get('/garage')
      setCars(res.data)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => { fetchCars() }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await API.post('/garage', {
        ...form,
        year: parseInt(form.year),
        odometer: parseInt(form.odometer),
        price: parseFloat(form.price),
      })
      setShowForm(false)
      setForm({ manufacturer: '', model_name: '', year: 2020, odometer: 50000, condition: 'good', price: 15000 })
      fetchCars()
    } catch (err) {
      console.error(err)
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try {
      await API.delete(`/garage/${id}`)
      fetchCars()
    } catch (err) {
      console.error(err)
    }
  }

  const totalValue = cars.reduce((sum, car) => sum + (car.price || 0), 0)

  return (
    <div className="page">
      <div style={styles.header}>
        <div>
          <h1 className="page-title">My garage</h1>
          <p className="page-sub">
            {cars.length} saved cars · Total value ${totalValue.toLocaleString()}
          </p>
        </div>
        <button
          className="btn-primary"
          style={{width:'auto',padding:'9px 18px'}}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ Add car'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{marginBottom:'16px'}}>
          <div className="card-title">Add a car to your garage</div>
          <form onSubmit={handleSave}>
            <div style={styles.formGrid}>
              <div style={{marginBottom:'12px'}}>
                <label style={styles.label}>Manufacturer</label>
                <input
                  placeholder="e.g. Toyota"
                  value={form.manufacturer}
                  onChange={e => setForm({...form, manufacturer: e.target.value})}
                  required
                />
              </div>
              <div style={{marginBottom:'12px'}}>
                <label style={styles.label}>Model</label>
                <input
                  placeholder="e.g. Camry"
                  value={form.model_name}
                  onChange={e => setForm({...form, model_name: e.target.value})}
                  required
                />
              </div>
              <div style={{marginBottom:'12px'}}>
                <label style={styles.label}>Year</label>
                <input
                  type="number"
                  value={form.year}
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
                </select>
              </div>
              <div style={{marginBottom:'12px'}}>
                <label style={styles.label}>Price ($)</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={e => setForm({...form, price: e.target.value})}
                />
              </div>
            </div>
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save to garage'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{textAlign:'center',padding:'40px',color:'#888'}}>
          Loading your garage...
        </div>
      ) : cars.length === 0 ? (
        <div className="card" style={{textAlign:'center',padding:'40px'}}>
          <img
            src="https://images.unsplash.com/photo-1493238792000-8113da705763?w=300&h=200&fit=crop"
            alt="empty garage"
            style={{width:'100%',maxWidth:'280px',height:'160px',objectFit:'cover',borderRadius:'10px',marginBottom:'16px'}}
          />
          <div style={{fontSize:'15px',fontWeight:'500',color:'#1a1a1a',marginBottom:'6px'}}>
            Your garage is empty
          </div>
          <div style={{fontSize:'13px',color:'#888',marginBottom:'16px'}}>
            Add cars you own or are considering buying to track their value
          </div>
          <button
            className="btn-primary"
            style={{width:'auto',padding:'9px 18px',margin:'0 auto'}}
            onClick={() => setShowForm(true)}
          >
            + Add your first car
          </button>
        </div>
      ) : (
        <div style={styles.garageGrid}>
          {cars.map((car, i) => (
            <div key={car.id} style={styles.carCard}>
              <img
                src={CAR_IMAGES[i % CAR_IMAGES.length]}
                alt={car.manufacturer}
                style={styles.carImg}
              />
              <div style={styles.carInfo}>
                <div style={styles.carName}>
                  {car.year} {car.manufacturer} {car.model_name}
                </div>
                <div style={styles.carMeta}>
                  {(car.odometer || 0).toLocaleString()} mi · {car.condition}
                </div>
                <div style={styles.carFooter}>
                  <div style={styles.carPrice}>
                    ${(car.price || 0).toLocaleString()}
                  </div>
                  <button
                    style={styles.deleteBtn}
                    onClick={() => handleDelete(car.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '16px',
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
  garageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '14px',
  },
  carCard: {
    background: 'white',
    borderRadius: '12px',
    border: '0.5px solid #e5e5e5',
    overflow: 'hidden',
  },
  carImg: {
    width: '100%',
    height: '160px',
    objectFit: 'cover',
  },
  carInfo: { padding: '14px' },
  carName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: '4px',
    textTransform: 'capitalize',
  },
  carMeta: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '10px',
  },
  carFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  carPrice: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#E24B4A',
  },
  deleteBtn: {
    padding: '4px 10px',
    background: 'transparent',
    border: '0.5px solid #e5e5e5',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#888',
  },
}