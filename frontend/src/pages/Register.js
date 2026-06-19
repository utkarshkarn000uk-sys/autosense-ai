import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import API from '../api'
import useAuthStore from '../store/authStore'

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [form, setForm] = useState({ email: '', username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await API.post('/auth/register', form)
      login(res.data.access_token, res.data.username)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    }
    setLoading(false)
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <div style={styles.dot}></div>
          AutoSense
        </div>
        <h1 style={styles.title}>Create account</h1>
        <p style={styles.sub}>Start analyzing car prices for free</p>
        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:'12px'}}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              placeholder="yourname"
              value={form.username}
              onChange={e => setForm({...form, username: e.target.value})}
              required
            />
          </div>
          <div style={{marginBottom:'12px'}}>
            <label style={styles.label}>Email address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              required
            />
          </div>
          <div style={{marginBottom:'12px'}}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              placeholder="password"
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              required
            />
          </div>
          {error && <p style={{color:'#E24B4A',fontSize:'12px',marginBottom:'8px'}}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={styles.btn}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p style={styles.switch}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f8f8f8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '14px',
    border: '0.5px solid #e5e5e5',
    padding: '32px',
    width: '100%',
    maxWidth: '380px',
  },
  logo: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#1a1a1a',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '24px',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#E24B4A',
  },
  title: {
    fontSize: '20px',
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: '4px',
  },
  sub: {
    fontSize: '13px',
    color: '#888',
    marginBottom: '24px',
  },
  label: {
    fontSize: '11px',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    display: 'block',
    marginBottom: '4px',
  },
  btn: {
    width: '100%',
    padding: '11px',
    background: '#E24B4A',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    marginTop: '8px',
  },
  switch: {
    textAlign: 'center',
    fontSize: '13px',
    color: '#888',
    marginTop: '16px',
  },
  link: {
    color: '#E24B4A',
    textDecoration: 'none',
    fontWeight: '500',
  }
}