import { create } from 'zustand'
import axios from 'axios'
import { API_URL } from '../utils/constants'

interface User {
  id: string
  username: string
  email: string
  firstName?: string
  lastName?: string
  role: string
  status: string
}

interface AuthState {
  token: string | null
  user: User | null
  loading: boolean
  error: string | null
  login: (emailOrUsername: string, password: string) => Promise<void>
  register: (userData: {
    username: string
    email: string
    password: string
    firstName?: string
    lastName?: string
  }) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  loading: false,
  error: null,

  login: async (emailOrUsername, password) => {
    try {
      set({ loading: true, error: null })
      const response = await axios.post(`${API_URL}/auth/login`, {
        emailOrUsername,
        password
      })
      
      const { token, user } = response.data
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      
      set({ token, user, loading: false })
    } catch (error) {
      const errorMessage = 
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'An error occurred during login'
      
      set({ error: errorMessage, loading: false })
    }
  },

  register: async (userData) => {
    try {
      set({ loading: true, error: null })
      const response = await axios.post(`${API_URL}/auth/register`, userData)
      
      const { token, user } = response.data
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      
      set({ token, user, loading: false })
    } catch (error) {
      const errorMessage = 
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'An error occurred during registration'
      
      set({ error: errorMessage, loading: false })
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ token: null, user: null })
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      set({ token: null, user: null })
      return
    }

    try {
      // Optional: Verify token with backend
      // For now, we'll just use the stored user data
      const user = JSON.parse(localStorage.getItem('user') || 'null')
      set({ user, token })
    } catch (error) {
      // If token verification fails, logout
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      set({ token: null, user: null })
    }
  }
}))
