import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { username, logout } = useAuthStore()

  const links = [
    { path: '/', label: 'Dashboard' },
    { path: '/predict', label: 'Price check' },
    { path: '/garage', label: 'My garage' },
    { path: '/chat', label: 'AI mechanic' },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        <div style={styles.logo} onClick={() => navigate('/')}>
          <div style={styles.dot}></div>
          AutoSense
        </div>
        <div style={styles.links}>
          {links.map(link => (
            <div
              key={link.path}
              style={{
                ...styles.link,
                ...(location.pathname === link.path ? styles.activeLink : {})
              }}
              onClick={() => navigate(link.path)}
            >
              {link.label}
            </div>
          ))}
        </div>
        <div style={styles.right}>
          <div style={styles.username}>{username}</div>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}

const styles = {
  nav: {
    background: 'white',
    borderBottom: '0.5px solid #e5e5e5',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  inner: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '0 20px',
    height: '52px',
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  },
  logo: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#1a1a1a',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#E24B4A',
  },
  links: {
    display: 'flex',
    gap: '24px',
    flex: 1,
  },
  link: {
    fontSize: '13px',
    color: '#888',
    cursor: 'pointer',
    padding: '4px 0',
    borderBottom: '2px solid transparent',
  },
  activeLink: {
    color: '#1a1a1a',
    borderBottom: '2px solid #E24B4A',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  username: {
    fontSize: '13px',
    color: '#888',
  },
  logoutBtn: {
    padding: '5px 12px',
    background: 'transparent',
    border: '0.5px solid #ddd',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    color: '#888',
  }
}