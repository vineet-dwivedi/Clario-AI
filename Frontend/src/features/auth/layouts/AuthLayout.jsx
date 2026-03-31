import React, { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'

import { MoonIcon, SunIcon } from '../components/AuthIcons'
import { applyDocumentTheme, getInitialTheme } from '../../../utils/theme'
import { useDynamicFavicon } from '../../../utils/useDynamicFavicon'

// Shared layout for auth pages, including the theme toggle and transition overlay.
const AuthLayout = () => {
  const [theme, setTheme] = useState(getInitialTheme)
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false)
  const transitionTimeoutRef = useRef(null)

  useDynamicFavicon(theme)

  useEffect(() => {
    applyDocumentTheme(theme)
  }, [theme])

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [])

  const nextTheme = theme === 'light' ? 'dark' : 'light'

  // Keep the theme switch visually smooth by briefly enabling the transition layer.
  const handleThemeToggle = () => {
    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current)
    }

    setIsThemeTransitioning(true)
    setTheme(nextTheme)

    transitionTimeoutRef.current = window.setTimeout(() => {
      setIsThemeTransitioning(false)
      transitionTimeoutRef.current = null
    }, 520)
  }

  return (
    <div className={`auth-scene${isThemeTransitioning ? ' auth-scene--theme-shift' : ''}`}>
      <span aria-hidden="true" className="theme-transition-layer" />
      <Outlet />

      <button
        aria-label={`Switch to ${nextTheme} mode`}
        aria-pressed={theme === 'dark'}
        className="theme-toggle"
        onClick={handleThemeToggle}
        type="button"
      >
        {theme === 'light' ? (
          <MoonIcon className="theme-toggle__icon" />
        ) : (
          <SunIcon className="theme-toggle__icon" />
        )}
      </button>
    </div>
  )
}

export default AuthLayout
