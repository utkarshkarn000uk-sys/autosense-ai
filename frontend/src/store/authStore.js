import { create } from 'zustand'

const useAuthStore = create((set) => ({
  token: localStorage.getItem('token') || null,
  username: localStorage.getItem('username') || null,
  isLoggedIn: !!localStorage.getItem('token'),

  login: (token, username) => {
    localStorage.setItem('token', token)
    localStorage.setItem('username', username)
    set({ token, username, isLoggedIn: true })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    set({ token: null, username: null, isLoggedIn: false })
  }
}))

export default useAuthStore