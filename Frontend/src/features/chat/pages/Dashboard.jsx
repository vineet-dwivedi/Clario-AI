import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import { MoonIcon, SparkleIcon, SunIcon } from '../../auth/components/AuthIcons'
import { useAuth } from '../../auth/hook/useAuth'
import {
  clearChatError,
  clearCurrentChat,
  fetchChatMessages,
  fetchChats,
  sendChatMessage,
  setCurrentChatId,
} from '../chat.slice'
import { useChat } from '../hook/useChat'

const STORAGE_KEY = 'perplexity-auth-theme'

const promptActions = [
  { label: 'Focus', icon: GridIcon },
  { label: 'Attach', icon: FileIcon },
]

const suggestionPrompts = [
  { label: 'Summarize the latest chat', icon: NoteIcon, tone: 'violet' },
  { label: 'Debug this React hook', icon: CodeIcon, tone: 'teal' },
  { label: 'Generate a product description', icon: ImageIcon, tone: 'rose' },
  { label: 'Explain quantum physics simply', icon: OrbitIcon, tone: 'mint' },
]

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

function Dashboard() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { handleLogout } = useAuth()
  const { loading: isAuthLoading, user } = useSelector((state) => state.auth)
  const { chats, currentChatId, error, isLoading, isSending, messagesByChatId } = useSelector((state) => state.chat)
  const [draft, setDraft] = useState('')
  const [pendingPrompt, setPendingPrompt] = useState('')
  const [theme, setTheme] = useState(getInitialTheme)
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const transitionTimeoutRef = useRef(null)
  const conversationEndRef = useRef(null)

  useChat(Boolean(user))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    if (user) {
      dispatch(fetchChats())
    }
  }, [dispatch, user])

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [])

  const activeChat = chats.find((chat) => chat.id === currentChatId) || null
  const activeMessages = currentChatId ? messagesByChatId[currentChatId] || [] : []
  const hasActiveThread = Boolean(currentChatId || pendingPrompt)
  const username = user?.username?.trim() || 'Lumina User'
  const avatarLabel = username.slice(0, 2).toUpperCase()
  const nextTheme = theme === 'light' ? 'dark' : 'light'

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [activeMessages, currentChatId, pendingPrompt, isSending])

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
    setIsSidebarOpen((current) => !current)
  }

  const handleSidebarClose = () => {
    setIsSidebarOpen(false)
  }

  const handleThreadSelect = async (chatId) => {
    dispatch(setCurrentChatId(chatId))
    dispatch(clearChatError())
    setPendingPrompt('')
    setIsSidebarOpen(false)

    if (!messagesByChatId[chatId]) {
      await dispatch(fetchChatMessages(chatId))
    }
  }

  const handleStartNewThread = () => {
    setDraft('')
    setPendingPrompt('')
    dispatch(clearChatError())
    dispatch(clearCurrentChat())
    setIsSidebarOpen(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const prompt = draft.trim()

    if (!prompt || isSending) {
      return
    }

    setPendingPrompt(prompt)
    setDraft('')
    dispatch(clearChatError())

    const result = await dispatch(
      sendChatMessage({
        chatId: currentChatId,
        message: prompt,
      }),
    )

    if (sendChatMessage.rejected.match(result)) {
      setDraft(prompt)
    }

    setPendingPrompt('')
  }

  const handleLogoutClick = async () => {
    await handleLogout()
    navigate('/login', { replace: true })
  }

  const visibleMessages = [...activeMessages]

  if (pendingPrompt) {
    visibleMessages.push({
      id: 'pending-user',
      role: 'user',
      content: pendingPrompt,
      pending: true,
    })
  }

  if (isSending) {
    visibleMessages.push({
      id: 'pending-ai',
      role: 'ai',
      content: 'Thinking...',
      pending: true,
    })
  }

  return (
    <div
      className={`dashboard-scene${isThemeTransitioning ? ' dashboard-scene--theme-shift' : ''}${
        hasActiveThread ? ' dashboard-scene--thread' : ''
      }${isSidebarOpen ? ' dashboard-scene--sidebar-open' : ''}`}
    >
      <span aria-hidden="true" className="theme-transition-layer" />

      {isSidebarOpen ? (
        <button
          aria-label="Close menu"
          className="dashboard-sidebar-backdrop"
          onClick={handleSidebarClose}
          type="button"
        />
      ) : null}

      <aside className={`dashboard-sidebar${isSidebarOpen ? ' dashboard-sidebar--open' : ''}`}>
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
            onClick={handleSidebarClose}
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
            {isLoading && chats.length === 0 ? <p className="dashboard-sidebar__note">Loading chats...</p> : null}

            {!isLoading && chats.length === 0 ? <p className="dashboard-sidebar__note">No chats yet.</p> : null}

            {chats.map((chat) => (
              <button
                className={`dashboard-thread-link${chat.id === currentChatId ? ' dashboard-thread-link--active' : ''}`}
                key={chat.id}
                onClick={() => handleThreadSelect(chat.id)}
                type="button"
              >
                <ChatIcon className="dashboard-thread-link__icon" />
                <span className="dashboard-thread-link__label">{chat.title}</span>
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
            disabled={isAuthLoading}
            onClick={handleLogoutClick}
            type="button"
          >
            <LogoutIcon className="dashboard-sidebar__logout-icon" />
            <span>{isAuthLoading ? 'Logging out...' : 'Logout'}</span>
          </button>
        </div>
      </aside>

      {hasActiveThread ? (
        <div className="dashboard-thread-page">
          <div className="dashboard-thread-page__header">
            <div className="dashboard-shell">
              <header className="dashboard-topbar">
                <div className="dashboard-topbar__left">
                  <button
                    aria-expanded={isSidebarOpen}
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
                  <button className="dashboard-topbar__link" onClick={handleStartNewThread} type="button">
                    New chat
                  </button>

                  <button aria-label={`${username} profile`} className="dashboard-avatar" type="button">
                    <span className="dashboard-avatar__label">{avatarLabel}</span>
                  </button>
                </div>
              </header>
            </div>
          </div>

          <main className="dashboard-thread">
            <div className="dashboard-thread__scroll">
              <div className="dashboard-thread__inner">
                <div className="dashboard-thread__hero">
                  <h1 className="dashboard-thread__title">{activeChat?.title || pendingPrompt || 'New Chat'}</h1>
                  <p className="dashboard-thread__copy">
                    Ask follow-up questions in the same thread and the backend will keep the conversation grouped.
                  </p>
                </div>

                {error ? <p className="dashboard-thread__status dashboard-thread__status--error">{error}</p> : null}

                <div className="dashboard-conversation">
                  {visibleMessages.map((message) => (
                    <article
                      className={`dashboard-message dashboard-message--${message.role}${message.pending ? ' dashboard-message--pending' : ''}`}
                      key={message.id}
                    >
                      <div className="dashboard-message__meta">
                        <span className="dashboard-message__role">{message.role === 'user' ? 'You' : 'Lumina'}</span>
                      </div>

                      <p className="dashboard-message__content">{message.content}</p>
                    </article>
                  ))}

                  <div ref={conversationEndRef} />
                </div>
              </div>
            </div>

            <PromptComposer draft={draft} isSending={isSending} onChange={setDraft} onSubmit={handleSubmit} docked />
          </main>
        </div>
      ) : (
        <div className="dashboard-shell">
          <header className="dashboard-topbar">
            <div className="dashboard-topbar__left">
              <button
                aria-expanded={isSidebarOpen}
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
              <button className="dashboard-topbar__link" onClick={handleMenuToggle} type="button">
                Chats
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
                Ask anything. Your question will be sent to the backend AI service and the reply will appear here.
              </p>
            </section>

            {error ? <p className="dashboard-thread__status dashboard-thread__status--error">{error}</p> : null}

            <PromptComposer draft={draft} isSending={isSending} onChange={setDraft} onSubmit={handleSubmit} />

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

function PromptComposer({ draft, isSending, onChange, onSubmit, docked = false }) {
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

          <button
            aria-label="Send question"
            className="dashboard-composer__send"
            disabled={!draft.trim() || isSending}
            type="submit"
          >
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

export default Dashboard
