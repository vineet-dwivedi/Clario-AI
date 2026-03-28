import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../auth/hook/useAuth'
import {
  clearChatError,
  clearCurrentChat,
  deleteChatThread,
  fetchChatMessages,
  fetchChats,
  setCurrentChatId,
} from '../../chat.slice'
import { generateImage, getModels, streamMessage } from '../../service/chat.api'
import { COMPOSER_MODE } from './constants'
import { buildVisibleMessages, getInitialTheme } from './helpers'

export function useDashboardPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { handleLogout } = useAuth()
  const { loading: isAuthLoading, user } = useSelector((state) => state.auth)
  const { chats, currentChatId, error, isDeleting, isLoading, messagesByChatId } = useSelector((state) => state.chat)
  const [draft, setDraft] = useState('')
  const [chatModels, setChatModels] = useState([])
  const [composerMode, setComposerMode] = useState(COMPOSER_MODE.CHAT)
  const [selectedChatModel, setSelectedChatModel] = useState('')
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

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem('perplexity-auth-theme', theme)
  }, [theme])

  useEffect(() => {
    if (user) {
      dispatch(fetchChats())
    }
  }, [dispatch, user])

  useEffect(() => {
    if (!user) {
      setChatModels([])
      setSelectedChatModel('')
      return undefined
    }

    let cancelled = false

    const loadModels = async () => {
      try {
        const response = await getModels()
        const nextChatModels = (response.data || []).filter((model) => model.capability === 'chat')

        if (cancelled) {
          return
        }

        setChatModels(nextChatModels)
        setSelectedChatModel((currentModel) => {
          if (currentModel && nextChatModels.some((model) => model.alias === currentModel)) {
            return currentModel
          }

          return nextChatModels.find((model) => model.isDefault)?.alias || nextChatModels[0]?.alias || ''
        })
      } catch {
        if (!cancelled) {
          setChatModels([])
        }
      }
    }

    loadModels()

    return () => {
      cancelled = true
    }
  }, [user])

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
  const visibleMessages = buildVisibleMessages(activeMessages, streamState, isStreaming)

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

  function handleSuggestionClick(label) {
    setDraft(label)
  }

  function handleComposerModeChange(nextMode) {
    setComposerMode(nextMode)
  }

  function handleChatModelChange(nextModel) {
    setSelectedChatModel(nextModel)
  }

  function handleThemeToggle() {
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

  function handleMenuToggle() {
    setIsSidebarOpen((current) => !current)
  }

  function handleSidebarClose() {
    setIsSidebarOpen(false)
  }

  async function handleThreadSelect(chatId) {
    streamAbortRef.current?.abort()
    streamAbortRef.current = null
    setPendingHydrationChatId(null)
    dispatch(setCurrentChatId(chatId))
    dispatch(clearChatError())
    setStreamError('')
    setStreamState(null)
    setIsSidebarOpen(false)

    if (!messagesByChatId[chatId]) {
      await dispatch(fetchChatMessages(chatId))
    }
  }

  function handleStartNewThread() {
    setDraft('')
    setStreamError('')
    setStreamState(null)
    setPendingHydrationChatId(null)
    streamAbortRef.current?.abort()
    streamAbortRef.current = null
    dispatch(clearChatError())
    dispatch(clearCurrentChat())
    setIsSidebarOpen(false)
  }

  async function handleDeleteChat(event, chatId) {
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

  async function handleSubmit(event) {
    event.preventDefault()

    const prompt = draft.trim()

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
          pending: true,
        },
        aiText: '',
        aiImages: [],
        aiKind: 'image',
        doneReceived: false,
        isStreaming: true,
      })
      setDraft('')
      dispatch(clearChatError())

      try {
        const response = await generateImage({
          chatId: currentChatId,
          message: prompt,
        })
        const payload = response.data || {}
        const nextChatId = payload.chat?.id || currentChatId

        setStreamState({
          chat: payload.chat || activeChat,
          title: payload.chat?.title || prompt,
          userMessage:
            payload.userMessage || {
              id: 'pending-user',
              role: 'user',
              kind: 'text',
              content: prompt,
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
        model: selectedChatModel || undefined,
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

  async function handleLogoutClick() {
    await handleLogout()
    navigate('/login', { replace: true })
  }

  return {
    avatarLabel,
    chatModels,
    chats,
    composerMode,
    conversationEndRef,
    currentChatId,
    deletingChatId,
    draft,
    hasActiveThread,
    isAuthLoading,
    isDeleting,
    isLoading,
    isSidebarOpen,
    isStreaming,
    isThemeTransitioning,
    nextTheme,
    selectedChatModel,
    statusError,
    theme,
    threadTitle,
    username,
    visibleMessages,
    handleComposerModeChange,
    handleChatModelChange,
    handleDeleteChat,
    handleDraftChange: setDraft,
    handleLogoutClick,
    handleMenuToggle,
    handleSidebarClose,
    handleStartNewThread,
    handleSubmit,
    handleSuggestionClick,
    handleThemeToggle,
    handleThreadSelect,
  }
}
