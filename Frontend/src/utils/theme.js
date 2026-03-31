export const THEME_STORAGE_KEY = 'clario-ai-theme'

export function getInitialTheme() {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)

  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyDocumentTheme(theme) {
  if (typeof document === 'undefined') {
    return
  }

  const nextTheme = theme === 'dark' ? 'dark' : 'light'

  document.documentElement.dataset.theme = nextTheme
  document.documentElement.style.colorScheme = nextTheme

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
  }
}
