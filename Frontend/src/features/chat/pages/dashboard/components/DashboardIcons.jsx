import React from 'react'

const iconProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeWidth: 1.8,
  viewBox: '0 0 24 24',
  xmlns: 'http://www.w3.org/2000/svg',
}

export function SearchIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <circle cx="11" cy="11" r="6.75" />
      <path d="M16.2 16.2L20 20" />
    </svg>
  )
}

export function MenuIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <path d="M5 7H19" />
      <path d="M5 12H19" />
      <path d="M5 17H19" />
    </svg>
  )
}

export function MicIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <rect x="9" y="4" width="6" height="10" rx="3" />
      <path d="M6.5 11.5C6.5 14.54 8.96 17 12 17C15.04 17 17.5 14.54 17.5 11.5" />
      <path d="M12 17V20" />
    </svg>
  )
}

export function ArrowRightIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <path d="M5 12H19" />
      <path d="M13 6L19 12L13 18" />
    </svg>
  )
}

export function NoteIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <path d="M14 4.5H8C6.9 4.5 6 5.4 6 6.5V17.5C6 18.6 6.9 19.5 8 19.5H16C17.1 19.5 18 18.6 18 17.5V8.5L14 4.5Z" />
      <path d="M14 4.5V8.5H18" />
      <path d="M9 12H15" />
      <path d="M9 15H13" />
    </svg>
  )
}

export function CodeIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <path d="M8.5 8L4.5 12L8.5 16" />
      <path d="M15.5 8L19.5 12L15.5 16" />
    </svg>
  )
}

export function ImageIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <rect x="4.5" y="5.5" width="15" height="13" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M7 16L10.5 12.5L13.2 15.2L15 13.4L17 16" />
    </svg>
  )
}

export function OrbitIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <circle cx="12" cy="12" r="2.25" />
      <path d="M4.6 9.6C6.9 6.6 10 5 12.8 5.4C15.6 5.8 18.1 8.1 19.4 12.4" />
      <path d="M4.6 14.4C6.9 17.4 10 19 12.8 18.6C15.6 18.2 18.1 15.9 19.4 11.6" />
    </svg>
  )
}

export function PlusIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <path d="M12 5V19" />
      <path d="M5 12H19" />
    </svg>
  )
}

export function CloseIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <path d="M6 6L18 18" />
      <path d="M18 6L6 18" />
    </svg>
  )
}

export function ChatIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <path d="M6.5 6.5H17.5C18.05 6.5 18.5 6.95 18.5 7.5V14.5C18.5 15.05 18.05 15.5 17.5 15.5H10.2L6.5 18.5V7.5C6.5 6.95 6.95 6.5 7.5 6.5" />
    </svg>
  )
}

export function LogoutIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <path d="M10 5.5H7.5C6.95 5.5 6.5 5.95 6.5 6.5V17.5C6.5 18.05 6.95 18.5 7.5 18.5H10" />
      <path d="M13 8.5L17 12L13 15.5" />
      <path d="M10 12H17" />
    </svg>
  )
}

export function TrashIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <path d="M5.5 7.5H18.5" />
      <path d="M9.5 4.5H14.5" />
      <path d="M8 7.5L8.7 18.1C8.77 19.02 9.53 19.75 10.45 19.75H13.55C14.47 19.75 15.23 19.02 15.3 18.1L16 7.5" />
      <path d="M10 10.5V16" />
      <path d="M14 10.5V16" />
    </svg>
  )
}
