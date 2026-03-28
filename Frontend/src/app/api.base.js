const DEFAULT_API_PORT = '5000'

function getBrowserApiBaseUrl() {
  if (typeof window === 'undefined') {
    return `http://localhost:${DEFAULT_API_PORT}`
  }

  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
  const host = window.location.hostname || 'localhost'

  return `${protocol}//${host}:${DEFAULT_API_PORT}`
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || getBrowserApiBaseUrl()
