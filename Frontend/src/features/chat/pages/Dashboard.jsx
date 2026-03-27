import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import { MoonIcon, SparkleIcon, SunIcon } from '../../auth/components/AuthIcons'
import { useAuth } from '../../auth/hook/useAuth'
import ChatMarkdown from '../components/ChatMarkdown'
import {
  clearChatError,
  clearCurrentChat,
  deleteChatThread,
  fetchChatMessages,
  fetchChats,
  setCurrentChatId,
} from '../chat.slice'
import { generateImage, streamMessage } from '../service/chat.api'

const STORAGE_KEY = 'perplexity-auth-theme'

const promptActions = [
  { label: 'Focus', icon: GridIcon },
]

const suggestionPrompts = [
  { label: 'Summarize the latest chat', icon: NoteIcon, tone: 'violet' },
  { label: 'Debug this React hook', icon: CodeIcon, tone: 'teal' },
  { label: 'Generate a product description', icon: ImageIcon, tone: 'rose' },
  { label: 'Explain quantum physics simply', icon: OrbitIcon, tone: 'mint' },
]
const COMPOSER_MODE = Object.freeze({
  CHAT: 'chat',
  IMAGE: 'image',
})
const IMAGE_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4']
const MAX_REFERENCE_IMAGES = 5

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error(`Failed to read "${file.name}".`))
    reader.readAsDataURL(file)
  })

const stripDataUrlPrefix = (value) => String(value || '').replace(/^data:[^;]+;base64,/i, '')

const createImageAttachments = async (files) =>
  Promise.all(
    files.map(async (file, index) => {
      const dataUrl = await readFileAsDataUrl(file)

      return {
        id: `${file.name}-${file.lastModified}-${index}`,
        name: file.name,
        mimeType: file.type || 'image/png',
        dataUrl,
        data: stripDataUrlPrefix(dataUrl),
      }
    }),
  )

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
  const { chats, currentChatId, error, isDeleting, isLoading, messagesByChatId } = useSelector((state) => state.chat)
  const [draft, setDraft] = useState('')
  const [composerMode, setComposerMode] = useState(COMPOSER_MODE.CHAT)
  const [composerImages, setComposerImages] = useState([])
  const [imageAspectRatio, setImageAspectRatio] = useState('1:1')
  const [deletingChatId, setDeletingChatId] = useState(null)
  const [streamState, setStreamState] = useState(null)
  const [streamError, setStreamError] = useState('')
  const [pendingHydrationChatId, setPendingHydrationChatId] = useState(null)
  const [theme, setTheme] = useState(getInitialTheme)
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const transitionTimeoutRef = useRef(null)
  const conversationEndRef = useRef(null)
  const streamAbortRef = useRef(null)
  const imageInputRef = useRef(null)

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
      streamAbortRef.current?.abort()

      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [])

  const activeChat = chats.find((chat) => chat.id === currentChatId) || null
  const activeMessages = currentChatId ? messagesByChatId[currentChatId] || [] : []
  const isStreaming = Boolean(streamState?.isStreaming)
  const hasActiveThread = Boolean(currentChatId || streamState)
  const username = user?.username?.trim() || 'Lumina User'
  const avatarLabel = username.slice(0, 2).toUpperCase()
  const nextTheme = theme === 'light' ? 'dark' : 'light'
  const statusError = streamError || error
  const threadTitle = activeChat?.title || streamState?.title || 'New Chat'

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [activeMessages, currentChatId, streamState?.aiText, streamState?.aiImages?.length, streamState?.userMessage?.content])

  useEffect(() => {
    if (!streamState?.aiBuffer) {
      if (streamState?.doneReceived && streamState.isStreaming) {
        setStreamState((currentState) =>
          currentState?.doneReceived && !currentState.aiBuffer
            ? {
                ...currentState,
                isStreaming: false,
              }
            : currentState,
        )
      }

      return undefined
    }

    const intervalId = window.setInterval(() => {
      setStreamState((currentState) => {
        if (!currentState?.aiBuffer) {
          return currentState
        }

        const step = Math.max(1, Math.min(4, Math.ceil(currentState.aiBuffer.length / 28)))
        const nextChunk = currentState.aiBuffer.slice(0, step)
        const remainingBuffer = currentState.aiBuffer.slice(step)

        return {
          ...currentState,
          aiText: `${currentState.aiText || ''}${nextChunk}`,
          aiBuffer: remainingBuffer,
          isStreaming: !(currentState.doneReceived && !remainingBuffer),
        }
      })
    }, 16)

    return () => window.clearInterval(intervalId)
  }, [streamState?.aiBuffer, streamState?.doneReceived, streamState?.isStreaming])

  useEffect(() => {
    if (!pendingHydrationChatId) {
      return undefined
    }

    if (streamState?.isStreaming || streamState?.aiBuffer) {
      return undefined
    }

    let cancelled = false

    const hydrateChat = async () => {
      await dispatch(fetchChats())

      if (cancelled) {
        return
      }

      dispatch(setCurrentChatId(pendingHydrationChatId))
      await dispatch(fetchChatMessages(pendingHydrationChatId))

      if (!cancelled) {
        setPendingHydrationChatId(null)
        setStreamState(null)
      }
    }

    hydrateChat()

    return () => {
      cancelled = true
    }
  }, [dispatch, pendingHydrationChatId, streamState?.aiBuffer, streamState?.isStreaming])

  const handleSuggestionClick = (label) => {
    setDraft(label)
  }

  const handleComposerModeChange = (nextMode) => {
    setComposerMode(nextMode)

    if (nextMode === COMPOSER_MODE.CHAT) {
      setComposerImages([])
      setImageAspectRatio('1:1')
    }
  }

  const handlePromptAction = (label) => {
    if (label !== 'Attach') {
      return
    }

    setComposerMode(COMPOSER_MODE.IMAGE)
    imageInputRef.current?.click()
  }

  const handleRemoveComposerImage = (imageId) => {
    setComposerImages((currentImages) => currentImages.filter((image) => image.id !== imageId))
  }

  const handleImageSelection = async (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'))

    if (!files.length) {
      return
    }

    try {
      const nextImages = await createImageAttachments(files)

      setComposerImages((currentImages) => {
        const mergedImages = [...currentImages, ...nextImages].slice(0, MAX_REFERENCE_IMAGES)

        if (currentImages.length + nextImages.length > MAX_REFERENCE_IMAGES) {
          setStreamError(`You can attach up to ${MAX_REFERENCE_IMAGES} reference images.`)
        } else {
          setStreamError('')
        }

        return mergedImages
      })
      setComposerMode(COMPOSER_MODE.IMAGE)
    } catch (error) {
      setStreamError(error.message || 'Failed to load image.')
    } finally {
      event.target.value = ''
    }
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
    streamAbortRef.current?.abort()
    streamAbortRef.current = null
    setPendingHydrationChatId(null)
    setComposerImages([])
    dispatch(setCurrentChatId(chatId))
    dispatch(clearChatError())
    setStreamError('')
    setStreamState(null)
    setIsSidebarOpen(false)

    if (!messagesByChatId[chatId]) {
      await dispatch(fetchChatMessages(chatId))
    }
  }

  const handleStartNewThread = () => {
    setDraft('')
    setStreamError('')
    setStreamState(null)
    setPendingHydrationChatId(null)
    setComposerImages([])
    streamAbortRef.current?.abort()
    streamAbortRef.current = null
    dispatch(clearChatError())
    dispatch(clearCurrentChat())
    setIsSidebarOpen(false)
  }

  const handleDeleteChat = async (event, chatId) => {
    event.stopPropagation()

    if (!chatId || deletingChatId) {
      return
    }

    const targetChat = chats.find((chat) => chat.id === chatId)
    const shouldDelete = window.confirm(`Delete "${targetChat?.title || 'this chat'}"?`)

    if (!shouldDelete) {
      return
    }

    if (currentChatId === chatId || pendingHydrationChatId === chatId || streamState?.chat?.id === chatId) {
      streamAbortRef.current?.abort()
      streamAbortRef.current = null
      setPendingHydrationChatId(null)
      setStreamState(null)
      setStreamError('')
      dispatch(clearCurrentChat())
    }

    setDeletingChatId(chatId)

    try {
      await dispatch(deleteChatThread(chatId)).unwrap()
    } finally {
      setDeletingChatId(null)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const prompt = draft.trim()
    const pendingImages = composerImages

    if (!prompt || isStreaming) {
      return
    }

    if (composerMode === COMPOSER_MODE.IMAGE) {
      streamAbortRef.current?.abort()
      streamAbortRef.current = null
      setPendingHydrationChatId(null)
      setStreamError('')
      setStreamState({
        chat: activeChat,
        title: activeChat?.title || prompt,
        userMessage: {
          id: 'pending-user',
          role: 'user',
          kind: 'text',
          content: prompt,
          images: pendingImages,
          pending: true,
        },
        aiText: '',
        aiImages: [],
        aiKind: 'image',
        doneReceived: false,
        isStreaming: true,
      })
      setDraft('')
      setComposerImages([])
      dispatch(clearChatError())

      try {
        const response = await generateImage({
          chatId: currentChatId,
          message: prompt,
          images: pendingImages.map(({ mimeType, data, dataUrl }) => ({
            mimeType,
            data,
            dataUrl,
          })),
          aspectRatio: imageAspectRatio,
        })
        const payload = response.data || {}
        const nextChatId = payload.chat?.id || currentChatId

        setStreamState({
          chat: payload.chat || activeChat,
          title: payload.chat?.title || prompt,
          userMessage:
            payload.userMessage ||
            {
              id: 'pending-user',
              role: 'user',
              kind: 'text',
              content: prompt,
              images: pendingImages,
            },
          aiText: payload.aiMessage?.content || '',
          aiImages: payload.aiMessage?.images || [],
          aiKind: payload.aiMessage?.kind || 'image',
          doneReceived: true,
          isStreaming: false,
        })

        if (nextChatId) {
          dispatch(setCurrentChatId(nextChatId))
          setPendingHydrationChatId(nextChatId)
        }
      } catch (imageFailure) {
        setDraft(prompt)
        setComposerImages(pendingImages)
        setStreamError(imageFailure.message || 'Failed to generate image.')
        setPendingHydrationChatId(null)
        setStreamState(null)
      }

      return
    }

    const abortController = new AbortController()
    streamAbortRef.current?.abort()
    streamAbortRef.current = abortController

    let streamMeta = null
    let streamDone = null

    setStreamError('')
    setStreamState({
      chat: activeChat,
      title: activeChat?.title || prompt,
      userMessage: {
        id: 'pending-user',
        role: 'user',
        content: prompt,
        pending: true,
      },
      aiText: '',
      aiBuffer: '',
      doneReceived: false,
      isStreaming: true,
    })
    setDraft('')
    dispatch(clearChatError())

    try {
      await streamMessage({
        chatId: currentChatId,
        message: prompt,
        signal: abortController.signal,
        onEvent: ({ event, data }) => {
          if (event === 'meta') {
            streamMeta = data

            setStreamState((currentState) => ({
              ...(currentState || {}),
              chat: data.chat || currentState?.chat || null,
              title: data.chat?.title || data.title || currentState?.title || prompt,
              userMessage: data.userMessage || currentState?.userMessage || null,
              aiText: currentState?.aiText || '',
              aiBuffer: currentState?.aiBuffer || '',
              doneReceived: currentState?.doneReceived || false,
              isStreaming: true,
            }))

            if (data.chat?.id) {
              dispatch(setCurrentChatId(data.chat.id))
            }
          }

          if (event === 'token') {
            setStreamState((currentState) => ({
              ...(currentState || {}),
              aiBuffer: `${currentState?.aiBuffer || ''}${data.text || ''}`,
              isStreaming: true,
            }))
          }

          if (event === 'done') {
            streamDone = data

            setStreamState((currentState) => {
              const safeState = currentState || {}
              const currentCombined = `${safeState.aiText || ''}${safeState.aiBuffer || ''}`
              const finalText = data.text || currentCombined

              if (!finalText.startsWith(currentCombined)) {
                return {
                  ...safeState,
                  chat: data.chat || safeState.chat || null,
                  title: data.chat?.title || data.title || safeState.title || prompt,
                  userMessage: data.userMessage || safeState.userMessage || null,
                  aiText: finalText,
                  aiBuffer: '',
                  doneReceived: true,
                  isStreaming: false,
                }
              }

              const tail = finalText.slice(currentCombined.length)

              return {
                ...safeState,
                chat: data.chat || safeState.chat || null,
                title: data.chat?.title || data.title || safeState.title || prompt,
                userMessage: data.userMessage || safeState.userMessage || null,
                aiBuffer: `${safeState.aiBuffer || ''}${tail}`,
                doneReceived: true,
                isStreaming: true,
              }
            })
          }
        },
      })

      const nextChatId = streamDone?.chat?.id || streamMeta?.chat?.id || currentChatId

      if (nextChatId) {
        setPendingHydrationChatId(nextChatId)
      }
    } catch (streamFailure) {
      if (abortController.signal.aborted) {
        setPendingHydrationChatId(null)
        setStreamState(null)
        return
      }

      setDraft(prompt)
      setStreamError(streamFailure.message || 'Failed to stream message.')
      setPendingHydrationChatId(null)
      setStreamState(null)
    } finally {
      if (streamAbortRef.current === abortController) {
        streamAbortRef.current = null
      }
    }
  }

  const handleLogoutClick = async () => {
    await handleLogout()
    navigate('/login', { replace: true })
  }

  const visibleMessages = [...activeMessages]

  if (streamState?.userMessage && !visibleMessages.some((message) => message.id === streamState.userMessage.id)) {
    visibleMessages.push(streamState.userMessage)
  }

  if (streamState?.aiText || streamState?.aiImages?.length || isStreaming) {
    visibleMessages.push({
      id: 'streaming-ai',
      role: 'ai',
      kind: streamState?.aiKind || 'text',
      content: streamState?.aiText || '',
      images: streamState?.aiImages || [],
      pending: isStreaming,
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
              <div className="dashboard-thread-item" key={chat.id}>
                <button
                  className={`dashboard-thread-link${chat.id === currentChatId ? ' dashboard-thread-link--active' : ''}`}
                  onClick={() => handleThreadSelect(chat.id)}
                  type="button"
                >
                  <ChatIcon className="dashboard-thread-link__icon" />
                  <span className="dashboard-thread-link__label">{chat.title}</span>
                </button>

                <button
                  aria-label={`Delete ${chat.title}`}
                  className="dashboard-thread-item__delete"
                  disabled={isDeleting || deletingChatId === chat.id}
                  onClick={(event) => handleDeleteChat(event, chat.id)}
                  title="Delete chat"
                  type="button"
                >
                  <TrashIcon className="dashboard-thread-item__delete-icon" />
                </button>
              </div>
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
                  <h1 className="dashboard-thread__title">{threadTitle}</h1>
                  <p className="dashboard-thread__copy">
                    Ask follow-up questions in the same thread and the backend will keep the conversation grouped.
                  </p>
                </div>

                {statusError ? <p className="dashboard-thread__status dashboard-thread__status--error">{statusError}</p> : null}

                <div className="dashboard-conversation">
                  {visibleMessages.map((message) => (
                    <article
                      className={`dashboard-message dashboard-message--${message.role}${message.pending ? ' dashboard-message--pending' : ''}`}
                      key={message.id}
                    >
                      <div className="dashboard-message__meta">
                        <span className="dashboard-message__role">{message.role === 'user' ? 'You' : 'Lumina'}</span>
                      </div>

                      {message.role === 'ai' ? (
                        <div className="dashboard-message__content dashboard-message__content--ai">
                          {message.content ? <ChatMarkdown content={message.content} /> : null}
                          {Array.isArray(message.images) && message.images.length ? (
                            <MessageImages images={message.images} pending={message.pending} />
                          ) : null}
                          {!message.content && !message.images?.length && message.pending ? <p>Generating...</p> : null}
                          {message.pending ? <span aria-hidden="true" className="dashboard-message__stream-caret" /> : null}
                        </div>
                      ) : (
                        <div className="dashboard-message__content dashboard-message__content--user">
                          <p>{message.content}</p>
                          {Array.isArray(message.images) && message.images.length ? (
                            <MessageImages images={message.images} pending={message.pending} />
                          ) : null}
                        </div>
                      )}
                    </article>
                  ))}

                  <div ref={conversationEndRef} />
                </div>
              </div>
            </div>
            <PromptComposer
              aspectRatio={imageAspectRatio}
              attachments={composerImages}
              draft={draft}
              fileInputRef={imageInputRef}
              isSending={isStreaming}
              mode={composerMode}
              onAction={handlePromptAction}
              onAspectRatioChange={setImageAspectRatio}
              onChange={setDraft}
              onFilesSelected={handleImageSelection}
              onModeChange={handleComposerModeChange}
              onRemoveAttachment={handleRemoveComposerImage}
              onSubmit={handleSubmit}
              docked
            />
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

            {statusError ? <p className="dashboard-thread__status dashboard-thread__status--error">{statusError}</p> : null}

            <PromptComposer
              aspectRatio={imageAspectRatio}
              attachments={composerImages}
              draft={draft}
              fileInputRef={imageInputRef}
              isSending={isStreaming}
              mode={composerMode}
              onAction={handlePromptAction}
              onAspectRatioChange={setImageAspectRatio}
              onChange={setDraft}
              onFilesSelected={handleImageSelection}
              onModeChange={handleComposerModeChange}
              onRemoveAttachment={handleRemoveComposerImage}
              onSubmit={handleSubmit}
            />

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

function PromptComposer({
  aspectRatio,
  attachments,
  draft,
  fileInputRef,
  isSending,
  mode,
  onAction,
  onAspectRatioChange,
  onChange,
  onFilesSelected,
  onModeChange,
  onRemoveAttachment,
  onSubmit,
  docked = false,
}) {
  return (
    <form className={`dashboard-composer${docked ? ' dashboard-composer--dock' : ''}`} onSubmit={onSubmit}>
      <div className="dashboard-composer__toolbar">
        <div className="dashboard-mode-toggle" role="tablist" aria-label="Composer mode">
          <button
            aria-selected={mode === COMPOSER_MODE.CHAT}
            className={`dashboard-mode-toggle__button${
              mode === COMPOSER_MODE.CHAT ? ' dashboard-mode-toggle__button--active' : ''
            }`}
            onClick={() => onModeChange(COMPOSER_MODE.CHAT)}
            role="tab"
            type="button"
          >
            <SparkleIcon className="dashboard-mode-toggle__icon" />
            <span>Chat</span>
          </button>

          <button
            aria-selected={mode === COMPOSER_MODE.IMAGE}
            className={`dashboard-mode-toggle__button${
              mode === COMPOSER_MODE.IMAGE ? ' dashboard-mode-toggle__button--active' : ''
            }`}
            onClick={() => onModeChange(COMPOSER_MODE.IMAGE)}
            role="tab"
            type="button"
          >
            <ImageIcon className="dashboard-mode-toggle__icon" />
            <span>Free Image</span>
          </button>
        </div>

      </div>

      <input
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        multiple
        onChange={onFilesSelected}
        ref={fileInputRef}
        type="file"
      />

      <div className="dashboard-composer__field">
        <SearchIcon className="dashboard-composer__search" />

        <label className="sr-only" htmlFor={docked ? 'dashboard-question-docked' : 'dashboard-question'}>
          Ask a question
        </label>
        <textarea
          className="dashboard-composer__input"
          id={docked ? 'dashboard-question-docked' : 'dashboard-question'}
          onChange={(event) => onChange(event.target.value)}
          placeholder={
            mode === COMPOSER_MODE.IMAGE
              ? 'Describe the image you want to generate...'
              : 'Ask a question or search...'
          }
          rows="1"
          value={draft}
        />
      </div>

      {attachments.length ? (
        <div className="dashboard-composer__attachments">
          {attachments.map((attachment) => (
            <div className="dashboard-attachment-chip" key={attachment.id}>
              <img alt={attachment.name} className="dashboard-attachment-chip__thumb" src={attachment.dataUrl} />
              <span className="dashboard-attachment-chip__label">{attachment.name}</span>
              <button
                aria-label={`Remove ${attachment.name}`}
                className="dashboard-attachment-chip__remove"
                onClick={() => onRemoveAttachment(attachment.id)}
                type="button"
              >
                <CloseIcon className="dashboard-attachment-chip__remove-icon" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="dashboard-composer__footer">
        <div className="dashboard-composer__actions">
          {promptActions.map(({ label, icon: Icon }) => (
            <button className="dashboard-composer__action" key={label} onClick={() => onAction(label)} type="button">
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
            aria-label={mode === COMPOSER_MODE.IMAGE ? 'Generate image' : 'Send question'}
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

function MessageImages({ images, pending = false }) {
  return (
    <div className={`dashboard-message__images${pending ? ' dashboard-message__images--pending' : ''}`}>
      {images.map((image, index) => (
        <figure className="dashboard-message__image-card" key={`${image.dataUrl || image.mimeType}-${index}`}>
          <img
            alt={`Generated image ${index + 1}`}
            className="dashboard-message__image"
            loading="lazy"
            src={image.dataUrl}
          />
        </figure>
      ))}
    </div>
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

function TrashIcon({ className }) {
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

export default Dashboard
