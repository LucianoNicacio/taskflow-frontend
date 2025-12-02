import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const token = ref(localStorage.getItem('token'))

  // Getters
  const isAuthenticated = computed(() => !!token.value)

  // Actions
  async function register(name, email, password, passwordConfirmation) {
    const response = await api.post('/register', {
      name,
      email,
      password,
      password_confirmation: passwordConfirmation,
    })
    return response.data
  }

  async function login(email, password) {
    const response = await api.post('/login', {
      email,
      password,
    })

    token.value = response.data.token
    user.value = response.data.user
    localStorage.setItem('token', response.data.token)

    return response.data
  }

  async function logout() {
    try {
      await api.post('/logout')
    } catch (error) {
      // Ignore errors on logout
    }

    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }

  async function fetchUser() {
    if (!token.value) return null

    try {
      const response = await api.get('/user')
      user.value = response.data
      return response.data
    } catch (error) {
      token.value = null
      user.value = null
      localStorage.removeItem('token')
      return null
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    register,
    login,
    logout,
    fetchUser,
  }
})