import React, { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import { MoonIcon, SparkleIcon, SunIcon } from '../../auth/components/AuthIcons'
import { useAuth } from '../../auth/hook/useAuth'
import { useChat } from '../hook/useChat'

const STORAGE_KEY = 'perplexity-auth-theme'

const promptActions = [
  { label: 'Focus', icon: GridIcon },
  { label: 'Attach', icon: FileIcon },
]

const suggestionPrompts = [
  { label: 'Summarize a document', icon: NoteIcon, tone: 'violet' },
  { label: 'Debug this React hook', icon: CodeIcon, tone: 'teal' },
  { label: 'Generate an illustration', icon: ImageIcon, tone: 'rose' },
  { label: 'Explain quantum physics', icon: OrbitIcon, tone: 'mint' },
]

const threadCatalog = [
  {
    id: 'deep-sea',
    title: 'How do deep sea creatures survive extreme pressure?',
    sources: [
      { domain: 'sciencedaily.com', title: 'How deep-sea fish survive crushing pressure', tone: 'sand' },
      { domain: 'nature.com', title: 'Adaptation of cell membranes in extreme environments', tone: 'sage' },
      { domain: 'oceanexplorer.noaa.gov', title: 'The Mariana Trench: Life at the bottom', tone: 'blue' },
      { domain: 'nationalgeographic.com', title: 'Bizarre creatures of the abyssal zone', tone: 'rose' },
    ],
    answer: [
      'Deep sea creatures survive intense pressure by evolving bodies that work with it instead of resisting it. Their proteins, membranes, and tissues stay stable even thousands of meters below the surface, where pressure can be hundreds of times greater than what land animals experience.',
      'One of the main adaptations is the use of piezolytes such as TMAO, which help keep proteins folded correctly under pressure. Many species also build more flexible cell membranes so important transport and signaling processes continue to work in cold, dense water.',
      'They also avoid structures that would collapse easily. Soft bodies, reduced air spaces, slower metabolisms, and pressure-tolerant enzymes allow these animals to remain functional in the deep ocean while still hunting, sensing their surroundings, and reproducing.',
    ],
  },
  {
    id: 'quantum',
    title: 'Explain quantum entanglement',
    sources: [
      { domain: 'cern.ch', title: 'Quantum entanglement explained simply', tone: 'blue' },
      { domain: 'scientificamerican.com', title: 'Why entanglement feels so strange', tone: 'rose' },
      { domain: 'quantamagazine.org', title: 'The physics behind entangled particles', tone: 'sage' },
      { domain: 'nature.com', title: 'Entanglement and information transfer', tone: 'sand' },
    ],
    answer: [
      'Quantum entanglement happens when two particles become linked so that measuring one immediately determines the state of the other, even if they are far apart. The link is in the shared quantum state, not in a visible signal passing between them.',
      'This does not let information travel faster than light, but it does mean nature preserves correlations that classical physics cannot explain on its own. That is why entanglement matters in quantum computing, cryptography, and teleportation research.',
    ],
  },
  {
    id: 'react-hooks',
    title: 'Best practices for React hooks',
    sources: [
      { domain: 'react.dev', title: 'Rules of Hooks and mental models', tone: 'sage' },
      { domain: 'overreacted.io', title: 'Thinking in effects correctly', tone: 'blue' },
      { domain: 'kentcdodds.com', title: 'Patterns for custom hooks', tone: 'rose' },
      { domain: 'frontendmasters.com', title: 'Avoiding stale closures in React', tone: 'sand' },
    ],
    answer: [
      'Keep hooks predictable: call them at the top level, keep state close to where it is used, and separate rendering logic from side effects. If an effect only derives UI state, it usually should not be an effect at all.',
      'Prefer custom hooks when a piece of behavior repeats in multiple components. That keeps components smaller and makes the dependency flow easier to reason about.',
    ],
  },
  {
    id: 'carbonara',
    title: 'Recipe for authentic carbonara',
    sources: [
      { domain: 'giallozafferano.it', title: 'Classic Roman carbonara technique', tone: 'sand' },
      { domain: 'seriouseats.com', title: 'How to emulsify the sauce correctly', tone: 'blue' },
      { domain: 'eataly.com', title: 'Ingredient breakdown for carbonara', tone: 'rose' },
      { domain: 'saveur.com', title: 'Traditional guanciale-based version', tone: 'sage' },
    ],
    answer: [
      'Authentic carbonara uses pasta, egg yolks, Pecorino Romano, black pepper, and guanciale. There is no cream. The sauce forms when hot pasta water emulsifies with the egg and cheese mixture.',
      'Render the guanciale slowly, mix yolks with cheese separately, then combine everything off the heat so the sauce turns glossy instead of scrambling.',
    ],
  },
  {
    id: 'roman-empire',
    title: 'History of the Roman Empire',
    sources: [
      { domain: 'britannica.com', title: 'Roman Empire overview and timeline', tone: 'rose' },
      { domain: 'history.com', title: 'From Augustus to the fall of Rome', tone: 'sand' },
      { domain: 'worldhistory.org', title: 'Expansion, reforms, and collapse', tone: 'blue' },
      { domain: 'cambridge.org', title: 'Imperial administration and culture', tone: 'sage' },
    ],
    answer: [
      'The Roman Empire began when Augustus consolidated power after the fall of the Republic. It expanded across Europe, North Africa, and the Middle East, building durable systems for law, taxation, roads, and military control.',
      'Over time, political instability, economic strain, military pressure, and administrative fragmentation weakened the western empire. The western half fell in the fifth century, while the eastern empire continued for nearly a thousand more years as Byzantium.',
    ],
  },
]

const threadLookup = Object.fromEntries(threadCatalog.map((thread) => [thread.id, thread]))

const getInitialTheme = () => {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const savedTheme = window.localStorage.getItem(STORAGE_KEY)

  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const createPreviewThread = (prompt) => ({
  id: 'preview',
  title: prompt,
  sources: [
    { domain: 'lumina research', title: `Research angles for "${prompt}"`, tone: 'sand' },
    { domain: 'technical notes', title: `Core concepts to cover for "${prompt}"`, tone: 'sage' },
    { domain: 'practical guide', title: `A concise response structure for "${prompt}"`, tone: 'blue' },
    { domain: 'follow-up ideas', title: `Useful next questions related to "${prompt}"`, tone: 'rose' },
  ],
  answer: [
    `This workspace is ready for the question "${prompt}". The sidebar, source cards, answer layout, and sticky composer are now in place for the frontend chat experience.`,
    'When you wire this screen to the backend chat API, this section can render the real model response while keeping the same Perplexity-style reading flow.',
  ],
})

function Dashboard() {
  const navigate = useNavigate()
  const { handleLogout } = useAuth()
  const { loading, user } = useSelector((state) => state.auth)
  const [draft, setDraft] = useState('')
  const [theme, setTheme] = useState(getInitialTheme)
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false)
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState(threadCatalog[0].id)
  const [previewThread, setPreviewThread] = useState(null)
  const transitionTimeoutRef = useRef(null)

  useChat(Boolean(user))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [])

  const username = user?.username?.trim() || 'Lumina User'
  const avatarLabel = username.slice(0, 2).toUpperCase()
  const nextTheme = theme === 'light' ? 'dark' : 'light'
  const activeThread =
    activeThreadId === 'preview' && previewThread ? previewThread : threadLookup[activeThreadId] || threadCatalog[0]
  const visibleThreads = previewThread
    ? [{ id: previewThread.id, title: previewThread.title }, ...threadCatalog]
    : threadCatalog

  const handleSuggestionClick = (label) => {
    setDraft(label)
  }

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

  const handleMenuToggle = () => {
    setIsWorkspaceOpen((current) => !current)
  }

  const handleWorkspaceClose = () => {
    setIsWorkspaceOpen(false)
  }

  const handleThreadSelect = (threadId) => {
    setActiveThreadId(threadId)
    setIsWorkspaceOpen(true)
  }

  const handleStartNewThread = () => {
    setDraft('')
    setPreviewThread(null)
    setActiveThreadId(threadCatalog[0].id)
    setIsWorkspaceOpen(false)
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const prompt = draft.trim()

    if (!prompt) {
      return
    }

    setPreviewThread(createPreviewThread(prompt))
    setActiveThreadId('preview')
    setIsWorkspaceOpen(true)
    setDraft('')
  }

  const handleLogoutClick = async () => {
    await handleLogout()
    navigate('/login', { replace: true })
  }

  return (
    <div
      className={`dashboard-scene${isThemeTransitioning ? ' dashboard-scene--theme-shift' : ''}${
        isWorkspaceOpen ? ' dashboard-scene--workspace' : ''
      }`}
    >
      <span aria-hidden="true" className="theme-transition-layer" />

      {isWorkspaceOpen ? (
        <div className="dashboard-workspace">
          <aside className="dashboard-sidebar">
            <div className="dashboard-sidebar__header">
              <div className="dashboard-sidebar__brand">
                <span className="dashboard-brand__badge" aria-hidden="true">
                  <SparkleIcon className="dashboard-brand__icon" />
                </span>
                <span className="dashboard-brand__name">Lumina</span>
              </div>

              <button
                aria-label="Close menu"
                className="dashboard-sidebar__close dashboard-topbar__circle"
                onClick={handleWorkspaceClose}
                type="button"
              >
                <CloseIcon className="dashboard-topbar__icon" />
              </button>
            </div>

            <button className="dashboard-sidebar__new" onClick={handleStartNewThread} type="button">
              <span>New Thread</span>
              <PlusIcon className="dashboard-sidebar__new-icon" />
            </button>

            <div className="dashboard-sidebar__section">
              <p className="dashboard-sidebar__label">Recent</p>

              <div className="dashboard-sidebar__threads">
                {visibleThreads.map((thread) => (
                  <button
                    className={`dashboard-thread-link${thread.id === activeThreadId ? ' dashboard-thread-link--active' : ''}`}
                    key={thread.id}
                    onClick={() => handleThreadSelect(thread.id)}
                    type="button"
                  >
                    <ChatIcon className="dashboard-thread-link__icon" />
                    <span className="dashboard-thread-link__label">{thread.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="dashboard-sidebar__footer">
              <button className="dashboard-sidebar__profile" type="button">
                <span className="dashboard-sidebar__profile-avatar">{avatarLabel}</span>
                <span className="dashboard-sidebar__profile-name">{username}</span>
              </button>

              <button
                className="dashboard-sidebar__logout"
                disabled={loading}
                onClick={handleLogoutClick}
                type="button"
              >
                <LogoutIcon className="dashboard-sidebar__logout-icon" />
                <span>{loading ? 'Logging out...' : 'Logout'}</span>
              </button>
            </div>
          </aside>

          <main className="dashboard-thread">
            <div className="dashboard-thread__scroll">
              <div className="dashboard-thread__inner">
                <div className="dashboard-thread__mobilebar">
                  <button
                    aria-expanded={isWorkspaceOpen}
                    aria-label="Close menu"
                    className="dashboard-topbar__circle"
                    onClick={handleWorkspaceClose}
                    type="button"
                  >
                    <CloseIcon className="dashboard-topbar__icon" />
                  </button>

                  <span className="dashboard-thread__mobilebrand">Lumina</span>
                </div>

                <h1 className="dashboard-thread__title">{activeThread.title}</h1>

                <section className="dashboard-thread__section">
                  <div className="dashboard-thread__eyebrow">
                    <GlobeIcon className="dashboard-thread__eyebrow-icon" />
                    <span>Sources</span>
                  </div>

                  <div className="dashboard-sources">
                    {activeThread.sources.map((source) => (
                      <article
                        className={`dashboard-source-card dashboard-source-card--${source.tone}`}
                        key={`${activeThread.id}-${source.domain}`}
                      >
                        <div className="dashboard-source-card__meta">
                          <span className="dashboard-source-card__badge" aria-hidden="true">
                            <SparkleIcon className="dashboard-source-card__badge-icon" />
                          </span>
                          <span className="dashboard-source-card__domain">{source.domain}</span>
                        </div>
                        <h2 className="dashboard-source-card__title">{source.title}</h2>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="dashboard-thread__section dashboard-thread__section--answer">
                  <div className="dashboard-thread__eyebrow">
                    <TextStackIcon className="dashboard-thread__eyebrow-icon" />
                    <span>Answer</span>
                  </div>

                  <div className="dashboard-answer">
                    {activeThread.answer.map((paragraph) => (
                      <p className="dashboard-answer__paragraph" key={paragraph}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            <PromptComposer draft={draft} onChange={setDraft} onSubmit={handleSubmit} docked />
          </main>
        </div>
      ) : (
        <div className="dashboard-shell">
          <header className="dashboard-topbar">
            <div className="dashboard-topbar__left">
              <button
                aria-expanded={isWorkspaceOpen}
                aria-label="Open dashboard menu"
                className="dashboard-topbar__circle"
                onClick={handleMenuToggle}
                type="button"
              >
                <MenuIcon className="dashboard-topbar__icon" />
              </button>

              <div className="dashboard-brand">
                <span className="dashboard-brand__badge" aria-hidden="true">
                  <SparkleIcon className="dashboard-brand__icon" />
                </span>
                <span className="dashboard-brand__name">Lumina</span>
              </div>
            </div>

            <div className="dashboard-topbar__actions">
              <button className="dashboard-topbar__link" type="button">
                Library
              </button>

              <button aria-label={`${username} profile`} className="dashboard-avatar" type="button">
                <span className="dashboard-avatar__label">{avatarLabel}</span>
              </button>
            </div>
          </header>

          <main className="dashboard-main">
            <section className="dashboard-hero">
              <h1 className="dashboard-hero__title">What do you want to know?</h1>
              <p className="dashboard-hero__copy">
                Ask anything. I&apos;ll search the web, read docs, and write code to help.
              </p>
            </section>

            <PromptComposer draft={draft} onChange={setDraft} onSubmit={handleSubmit} />

            <div className="dashboard-suggestions" aria-label="Suggested prompts">
              {suggestionPrompts.map(({ label, icon: Icon, tone }) => (
                <button
                  className={`dashboard-suggestion dashboard-suggestion--${tone}`}
                  key={label}
                  onClick={() => handleSuggestionClick(label)}
                  type="button"
                >
                  <Icon className="dashboard-suggestion__icon" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </main>
        </div>
      )}

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

function PromptComposer({ draft, onChange, onSubmit, docked = false }) {
  return (
    <form className={`dashboard-composer${docked ? ' dashboard-composer--dock' : ''}`} onSubmit={onSubmit}>
      <div className="dashboard-composer__field">
        <SearchIcon className="dashboard-composer__search" />

        <label className="sr-only" htmlFor={docked ? 'dashboard-question-docked' : 'dashboard-question'}>
          Ask a question
        </label>
        <textarea
          className="dashboard-composer__input"
          id={docked ? 'dashboard-question-docked' : 'dashboard-question'}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ask a question or search..."
          rows="1"
          value={draft}
        />
      </div>

      <div className="dashboard-composer__footer">
        <div className="dashboard-composer__actions">
          {promptActions.map(({ label, icon: Icon }) => (
            <button className="dashboard-composer__action" key={label} type="button">
              <Icon className="dashboard-composer__action-icon" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="dashboard-composer__controls">
          <button aria-label="Voice input" className="dashboard-composer__icon-button" type="button">
            <MicIcon className="dashboard-composer__icon" />
          </button>

          <button aria-label="Send question" className="dashboard-composer__send" disabled={!draft.trim()} type="submit">
            <ArrowRightIcon className="dashboard-composer__send-icon" />
          </button>
        </div>
      </div>
    </form>
  )
}

const iconProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeWidth: 1.8,
  viewBox: '0 0 24 24',
  xmlns: 'http://www.w3.org/2000/svg',
}

function SearchIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <circle cx="11" cy="11" r="6.75" />
      <path d="M16.2 16.2L20 20" />
    </svg>
  )
}

function MenuIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <path d="M5 7H19" />
      <path d="M5 12H19" />
      <path d="M5 17H19" />
    </svg>
  )
}

function GridIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <rect x="4.5" y="4.5" width="5.5" height="5.5" rx="1" />
      <rect x="14" y="4.5" width="5.5" height="5.5" rx="1" />
      <rect x="4.5" y="14" width="5.5" height="5.5" rx="1" />
      <rect x="14" y="14" width="5.5" height="5.5" rx="1" />
    </svg>
  )
}

function FileIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <path d="M14 4.5H8C6.9 4.5 6 5.4 6 6.5V17.5C6 18.6 6.9 19.5 8 19.5H16C17.1 19.5 18 18.6 18 17.5V8.5L14 4.5Z" />
      <path d="M14 4.5V8.5H18" />
      <path d="M9 12H15" />
      <path d="M9 15H13" />
    </svg>
  )
}

function MicIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <rect x="9" y="4" width="6" height="10" rx="3" />
      <path d="M6.5 11.5C6.5 14.54 8.96 17 12 17C15.04 17 17.5 14.54 17.5 11.5" />
      <path d="M12 17V20" />
    </svg>
  )
}

function ArrowRightIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <path d="M5 12H19" />
      <path d="M13 6L19 12L13 18" />
    </svg>
  )
}

function NoteIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <path d="M14 4.5H8C6.9 4.5 6 5.4 6 6.5V17.5C6 18.6 6.9 19.5 8 19.5H16C17.1 19.5 18 18.6 18 17.5V8.5L14 4.5Z" />
      <path d="M14 4.5V8.5H18" />
      <path d="M9 12H15" />
      <path d="M9 15H13" />
    </svg>
  )
}

function CodeIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <path d="M8.5 8L4.5 12L8.5 16" />
      <path d="M15.5 8L19.5 12L15.5 16" />
    </svg>
  )
}

function ImageIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <rect x="4.5" y="5.5" width="15" height="13" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M7 16L10.5 12.5L13.2 15.2L15 13.4L17 16" />
    </svg>
  )
}

function OrbitIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <circle cx="12" cy="12" r="2.25" />
      <path d="M4.6 9.6C6.9 6.6 10 5 12.8 5.4C15.6 5.8 18.1 8.1 19.4 12.4" />
      <path d="M4.6 14.4C6.9 17.4 10 19 12.8 18.6C15.6 18.2 18.1 15.9 19.4 11.6" />
    </svg>
  )
}

function PlusIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <path d="M12 5V19" />
      <path d="M5 12H19" />
    </svg>
  )
}

function CloseIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <path d="M6 6L18 18" />
      <path d="M18 6L6 18" />
    </svg>
  )
}

function ChatIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <path d="M6.5 6.5H17.5C18.05 6.5 18.5 6.95 18.5 7.5V14.5C18.5 15.05 18.05 15.5 17.5 15.5H10.2L6.5 18.5V7.5C6.5 6.95 6.95 6.5 7.5 6.5" />
    </svg>
  )
}

function LogoutIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <path d="M10 5.5H7.5C6.95 5.5 6.5 5.95 6.5 6.5V17.5C6.5 18.05 6.95 18.5 7.5 18.5H10" />
      <path d="M13 8.5L17 12L13 15.5" />
      <path d="M10 12H17" />
    </svg>
  )
}

function GlobeIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <circle cx="12" cy="12" r="8" />
      <path d="M4.8 12H19.2" />
      <path d="M12 4C14.5 6.2 15.9 9 15.9 12C15.9 15 14.5 17.8 12 20" />
      <path d="M12 4C9.5 6.2 8.1 9 8.1 12C8.1 15 9.5 17.8 12 20" />
    </svg>
  )
}

function TextStackIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} {...iconProps}>
      <path d="M5 7H19" />
      <path d="M5 12H15" />
      <path d="M5 17H19" />
    </svg>
  )
}

export default Dashboard
