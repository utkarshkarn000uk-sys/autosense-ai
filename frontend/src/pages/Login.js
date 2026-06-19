import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import API from '../api'
import useAuthStore from '../store/authStore'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await API.post('/auth/login',
        new URLSearchParams({ username: form.email, password: form.password }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )
      login(res.data.access_token, res.data.username)
      navigate('/')
    } catch (err) {
      setError('Invalid email or password')
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
        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.sub}>Sign in to your account</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              required
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button
            className="btn-primary"
            type="submit"
            disabled={loading}
            style={{marginTop: '8px'}}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div style={styles.divider}>
          <span>or</span>
        </div>

        <p style={styles.switch}>
          No account?{' '}
          <Link to="/register" style={styles.link}>Create one free</Link>
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
  divider: {
    textAlign: 'center',
    margin: '16px 0',
    fontSize: '12px',
    color: '#aaa',
    position: 'relative',
  },
  switch: {
    textAlign: 'center',
    fontSize: '13px',
    color: '#888',
  },
  link: {
    color: '#E24B4A',
    textDecoration: 'none',
    fontWeight: '500',
  }
}