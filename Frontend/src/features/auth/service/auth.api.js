import axios from 'axios'
import { API_BASE_URL } from '../../../app/api.base'

// Shared Axios client for auth requests. Cookies stay enabled for session-based auth.
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

/**
 * Calls the backend register endpoint.
 * @param {{ email: string, username: string, password: string }} payload
 */
export async function register({ email, username, password }) {
  const response = await api.post('/api/auth/register', { email, username, password })

  return response.data
}

/**
 * Calls the backend login endpoint.
 * @param {{ email: string, password: string }} payload
 */
export async function login({ email, password }) {
  const response = await api.post('/api/auth/login', { email, password })

  return response.data
}

/**
 * Fetches the currently authenticated user from the backend.
 */
export async function getme() {
  const response = await api.get('/api/auth/get-me')

  return response.data
}

/**
 * Ends the current authenticated session on the backend.
 */
export async function logout() {
  const response = await api.post('/api/auth/logout')

  return response.data
}

/**
 * Updates the current user's profile details.
 * @param {{ username: string, avatarFile?: File | null }} payload
 */
export async function updateProfile({ username, avatarFile }) {
  const formData = new FormData()
  formData.append('username', username)

  if (avatarFile) {
    formData.append('avatar', avatarFile)
  }

  const response = await api.put('/api/auth/profile', formData)
  return response.data
}
