import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import API from '../api'

const CAR_IMAGES = {
  toyota: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=300&h=200&fit=crop',
  ford: 'https://images.unsplash.com/photo-1612544448445-b8232cff3b6c?w=300&h=200&fit=crop',
  chevrolet: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=300&h=200&fit=crop',
  honda: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=300&h=200&fit=crop',
  nissan: 'https://images.unsplash.com/photo-1580274455191-1c62238fa333?w=300&h=200&fit=crop',
  bmw: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=300&h=200&fit=crop',
  'mercedes-benz': 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=300&h=200&fit=crop',
  audi: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=300&h=200&fit=crop',
  jeep: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=300&h=200&fit=crop',
  ram: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop',
  dodge: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=300&h=200&fit=crop',
  gmc: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=300&h=200&fit=crop',
  hyundai: 'https://images.unsplash.com/photo-1629897048514-3dd7414fe72a?w=300&h=200&fit=crop',
  kia: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=300&h=200&fit=crop',
  subaru: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=300&h=200&fit=crop',
  volkswagen: 'https://images.unsplash.com/photo-1541443131876-6f85a8a5c66a?w=300&h=200&fit=crop',
  lexus: 'https://images.unsplash.com/photo-1563694983011-6f4d90358083?w=300&h=200&fit=crop',
  cadillac: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=300&h=200&fit=crop',
  default: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=300&h=200&fit=crop'
}

const getCarImage = (manufacturer) => {
  const key = String(manufacturer || '').toLowerCase()
  return CAR_IMAGES[key] || CAR_IMAGES.default
}

const capitalize = (val) => {
  const s = String(val || '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [marketStats, setMarketStats] = useState(null)
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      API.get('/stats'),
      API.get('/market/stats'),
      API.get('/market/listings?limit=6')
    ]).then(([statsRes, marketRes, listingsRes]) => {
      setStats(statsRes.data)
      setMarketStats(marketRes.data)
      setListings(listingsRes.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const getDealBadge = (price) => {
    if (price < 10000) return { label: 'Great deal', cls: 'badge-green' }
    if (price < 20000) return { label: 'Good price', cls: 'badge-blue' }
    if (price < 35000) return { label: 'Fair price', cls: 'badge-amber' }
    return { label: 'Premium', cls: 'badge-red' }
  }

  if (loading) return (
    <div style={{textAlign:'center',padding:'60px',color:'#888'}}>
      Loading dashboard...
    </div>
  )

  const chartData = (marketStats?.by_manufacturer || [])
    .slice(0, 8)
    .map(m => ({
      name: capitalize(String(m.manufacturer || 'N/A')).slice(0, 8),
      price: Math.round(Number(m.mean) || 0)
    }))

  return (
    <div className="page">
      <div style={styles.hero}>
        <div style={styles.heroText}>
          <div style={styles.heroTag}>
            AI-powered · {(stats?.total_listings || 0).toLocaleString()} listings
          </div>
          <h1 style={styles.heroTitle}>Know the real value of any car instantly</h1>
          <p style={styles.heroSub}>
            ML-powered price predictions with full SHAP explanation in seconds.
          </p>
          <button style={styles.heroBtn} onClick={() => navigate('/predict')}>
            Check a car price
          </button>
        </div>
        <div style={styles.heroImg}>
          <img
            src="https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&h=250&fit=crop"
            alt="Featured car"
            style={styles.heroPhoto}
          />
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Avg market price</div>
          <div className="stat-value">${(stats?.avg_price || 0).toLocaleString()}</div>
          <div className="stat-change">356K+ listings</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Median price</div>
          <div className="stat-value">${(stats?.median_price || 0).toLocaleString()}</div>
          <div className="stat-change">50th percentile</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Top manufacturer</div>
          <div className="stat-value" style={{textTransform:'capitalize'}}>
            {stats?.top_manufacturer || 'ford'}
          </div>
          <div className="stat-change">Most listings</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Price range</div>
          <div className="stat-value">$500-100K</div>
          <div className="stat-change">All conditions</div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="card-title">
            Avg price by manufacturer
            <span className="badge badge-blue">Top 8</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{fontSize:11}} />
              <YAxis tick={{fontSize:11}} />
              <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Avg price']} />
              <Bar dataKey="price" fill="#E24B4A" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">
            Live listings
            <span className="badge badge-red">Live</span>
          </div>
          {listings.slice(0,4).map((car, i) => {
            const deal = getDealBadge(car.price)
            return (
              <div key={i} style={styles.carRow}>
                <img
                  src={getCarImage(car.manufacturer)}
                  alt={car.manufacturer}
                  style={styles.carThumb}
                />
                <div style={styles.carInfo}>
                  <div style={styles.carName}>
                    {car.year} {capitalize(car.manufacturer)}
                  </div>
                  <div style={styles.carMeta}>
                    {(car.odometer || 0).toLocaleString()} mi · {car.condition} · {car.fuel}
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={styles.carPrice}>${(car.price || 0).toLocaleString()}</div>
                  <span className={`badge ${deal.cls}`}>{deal.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          Featured cars
          <button style={styles.seeAllBtn} onClick={() => navigate('/predict')}>
            Check price →
          </button>
        </div>
        <div style={styles.featuredGrid}>
          {listings.slice(0,3).map((car, i) => (
            <div key={i} style={styles.featuredCard}>
              <img
                src={getCarImage(car.manufacturer)}
                alt={car.manufacturer}
                style={styles.featuredImg}
              />
              <div style={styles.featuredInfo}>
                <div style={styles.carName}>
                  {car.year} {capitalize(car.manufacturer)}
                </div>
                <div style={styles.carMeta}>
                  {(car.odometer || 0).toLocaleString()} mi · {car.condition}
                </div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:'8px'}}>
                  <div style={{fontSize:'16px',fontWeight:'500',color:'#E24B4A'}}>
                    ${(car.price || 0).toLocaleString()}
                  </div>
                  <span className={`badge ${getDealBadge(car.price).cls}`}>
                    {getDealBadge(car.price).label}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  hero: {
    background: 'white',
    borderRadius: '14px',
    border: '0.5px solid #e5e5e5',
    overflow: 'hidden',
    display: 'flex',
    marginBottom: '16px',
  },
  heroText: { padding: '28px', flex: 1 },
  heroTag: {
    fontSize: '11px',
    color: '#991b1b',
    background: '#fee2e2',
    padding: '3px 10px',
    borderRadius: '999px',
    display: 'inline-block',
    marginBottom: '12px',
    fontWeight: '500',
  },
  heroTitle: {
    fontSize: '20px',
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: '8px',
    lineHeight: '1.3',
  },
  heroSub: {
    fontSize: '13px',
    color: '#888',
    marginBottom: '20px',
    lineHeight: '1.6',
  },
  heroBtn: {
    padding: '10px 20px',
    background: '#E24B4A',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
  },
  heroImg: { width: '260px', flexShrink: 0, overflow: 'hidden' },
  heroPhoto: { width: '100%', height: '100%', objectFit: 'cover' },
  carRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
    borderBottom: '0.5px solid #f0f0f0',
  },
  carThumb: {
    width: '64px',
    height: '44px',
    borderRadius: '6px',
    objectFit: 'cover',
    flexShrink: 0,
  },
  carInfo: { flex: 1 },
  carName: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: '2px',
    textTransform: 'capitalize',
  },
  carMeta: { fontSize: '11px', color: '#888' },
  carPrice: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: '3px',
  },
  featuredGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  featuredCard: {
    border: '0.5px solid #e5e5e5',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  featuredImg: {
    width: '100%',
    height: '140px',
    objectFit: 'cover',
  },
  featuredInfo: { padding: '12px' },
  seeAllBtn: {
    background: 'transparent',
    border: 'none',
    color: '#E24B4A',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  },
}