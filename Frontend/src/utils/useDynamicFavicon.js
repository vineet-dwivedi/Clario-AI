import { useEffect } from 'react'

const THEME_COLORS = {
  light: {
    badgeTop: '#98ae81',
    badgeBottom: '#738c5d',
    outline: '#d9e3ce',
    icon: '#fffdf8',
    sparkle: '#eef5e8',
  },
  dark: {
    badgeTop: '#bbb4f2',
    badgeBottom: '#8f87d6',
    outline: '#d6d1ff',
    icon: '#151829',
    sparkle: '#f4f6ff',
  },
}

export function useDynamicFavicon(theme) {
  useEffect(() => {
    updateFaviconColors(theme)
  }, [theme])
}

function updateFaviconColors(theme) {
  const colors = THEME_COLORS[theme] || THEME_COLORS.light
  const svg = getSvgString(colors)
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

  let link = document.querySelector('link[data-clario-favicon]') || document.querySelector("link[rel='icon']")
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/svg+xml'
    document.head.appendChild(link)
  }

  link.setAttribute('data-clario-favicon', 'true')
  link.href = url
}

function getSvgString(colors) {
  return `<svg viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="clario-favicon-gradient" x1="48" y1="36" x2="214" y2="224" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${colors.badgeTop}"/>
      <stop offset="1" stop-color="${colors.badgeBottom}"/>
    </linearGradient>
  </defs>

  <rect x="24" y="24" width="208" height="208" rx="64" fill="url(#clario-favicon-gradient)"/>
  <rect x="28" y="28" width="200" height="200" rx="60" stroke="${colors.outline}" stroke-width="8" opacity="0.56"/>

  <path
    d="M76 94C76 82.95 84.95 74 96 74H154C162.61 74 170.73 78.06 175.88 84.94L191.64 105.95C195.85 111.56 198 118.38 198 125.4V186C198 197.05 189.05 206 178 206H96C84.95 206 76 197.05 76 186V94Z"
    stroke="${colors.icon}"
    stroke-width="16"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <path d="M106 122H176" stroke="${colors.icon}" stroke-width="15" stroke-linecap="round"/>
  <path d="M106 152H150" stroke="${colors.icon}" stroke-width="15" stroke-linecap="round"/>
  <path d="M174 50L180 68L198 74L180 80L174 98L168 80L150 74L168 68L174 50Z" fill="${colors.sparkle}"/>
</svg>`
}
