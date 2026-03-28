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
import { buildVisibleMessages, getAvatarLabel, getInitialTheme } from './helpers'
import { useVoiceAssistant } from './useVoiceAssistant'

function createFileEntry(file) {
  const isImage = String(file.type || '').startsWith('image/')

  return {
    id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    name: file.name,
    mimeType: file.type,
    previewUrl: isImage ? URL.createObjectURL(file) : '',
  }
}

function revokeFileEntries(fileEntries) {
  fileEntries.forEach((entry) => {
    if (entry.previewUrl) {
      URL.revokeObjectURL(entry.previewUrl)
    }
  })
}

function buildPendingUserText(prompt, fileEntries) {
  const text = String(prompt || '').trim()

  if (text) {
    return text
  }

  const hasPdf = fileEntries.some((fileEntry) => fileEntry.mimeType === 'application/pdf')
  const hasImage = fileEntries.some((fileEntry) => fileEntry.mimeType.startsWith('image/'))

  if (hasPdf && hasImage) {
    return 'Analyze the uploaded PDF and image files.'
  }

  if (hasPdf) {
    return 'Summarize the uploaded PDF.'
  }

  if (hasImage) {
    return 'Analyze the uploaded image.'
  }

  return ''
}

function buildPendingAttachments(fileEntries) {
  return fileEntries
    .filter((fileEntry) => fileEntry.mimeType === 'application/pdf')
    .map((fileEntry) => ({
      name: fileEntry.name,
      mimeType: fileEntry.mimeType,
    }))
}

function buildPendingImages(fileEntries) {
  return fileEntries
    .filter((fileEntry) => fileEntry.mimeType.startsWith('image/'))
    .map((fileEntry) => ({
      mimeType: fileEntry.mimeType,
      dataUrl: fileEntry.previewUrl,
    }))
}

function isSupportedAttachment(file) {
  return String(file?.type || '').startsWith('image/') || String(file?.type || '') === 'application/pdf'
}

export function useDashboardPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { handleLogout, handleUpdateProfile } = useAuth()
  const { user } = useSelector((state) => state.auth)
  const { chats, currentChatId, error, isDeleting, isLoading, messagesByChatId } = useSelector((state) => state.chat)
  const [draft, setDraft] = useState('')
  const [chatModels, setChatModels] = useState([])
  const [composerMode, setComposerMode] = useState(COMPOSER_MODE.CHAT)
  const [selectedChatModel, setSelectedChatModel] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [deletingChatId, setDeletingChatId] = useState(null)
  const [streamState, setStreamState] = useState(null)
  const [streamError, setStreamError] = useState('')
  const [pendingHydrationChatId, setPendingHydrationChatId] = useState(null)
  const [theme, setTheme] = useState(getInitialTheme)
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isProfileSaving, setIsProfileSaving] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const transitionTimeoutRef = useRef(null)
  const conversationEndRef = useRef(null)
  const streamAbortRef = useRef(null)
  const pendingFileCleanupRef = useRef([])
  const selectedFilesRef = useRef([])
  const {
    isListening,
    isTranscribing,
    isVoiceInputSupported,
    startListening,
    stopListening,
    voiceError,
  } = useVoiceAssistant()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem('clario-ai-theme', theme)
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
    selectedFilesRef.current = selectedFiles
  }, [selectedFiles])

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort()
      revokeFileEntries(selectedFilesRef.current)
      revokeFileEntries(pendingFileCleanupRef.current)

      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [])

  const activeChat = chats.find((chat) => chat.id === currentChatId) || null
  const activeMessages = currentChatId ? messagesByChatId[currentChatId] || [] : []
  const isStreaming = Boolean(streamState?.isStreaming)
  const hasActiveThread = Boolean(currentChatId || streamState)
  const username = user?.username?.trim() || 'Clario AI User'
  const avatarLabel = getAvatarLabel(username)
  const nextTheme = theme === 'light' ? 'dark' : 'light'
  const statusError = streamError || error
  const threadTitle = activeChat?.title || streamState?.title || 'New Chat'
  const visibleMessages = buildVisibleMessages(activeMessages, streamState, isStreaming)
  const canSubmit = composerMode === COMPOSER_MODE.IMAGE ? Boolean(draft.trim()) : Boolean(draft.trim() || selectedFiles.length)
  const voiceStatus = voiceError
    ? voiceError
    : isListening
      ? 'Recording... tap the mic again when you are done.'
      : isTranscribing
        ? 'Turning your voice into text...'
        : ''

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

        const step = Math.max(1, Math.min(6, Math.ceil(currentState.aiBuffer.length / 28)))
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
        flushPendingFileCleanup()
      }
    }

    hydrateChat()

    return () => {
      cancelled = true
    }
  }, [dispatch, pendingHydrationChatId, streamState?.aiBuffer, streamState?.isStreaming])

  function clearSelectedFiles() {
    setSelectedFiles((currentFiles) => {
      revokeFileEntries(currentFiles)
      return []
    })
  }

  function flushPendingFileCleanup() {
    revokeFileEntries(pendingFileCleanupRef.current)
    pendingFileCleanupRef.current = []
  }

  function handleSuggestionClick(label) {
    setDraft(label)
  }

  function handleComposerModeChange(nextMode) {
    setComposerMode(nextMode)
    if (nextMode !== COMPOSER_MODE.CHAT) {
      clearSelectedFiles()
    }
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

  function handleProfileOpen() {
    setIsProfileOpen(true)
  }

  function handleProfileClose() {
    setIsProfileOpen(false)
  }

  function handleFilesSelected(files) {
    const nextFiles = files.filter(isSupportedAttachment).slice(0, 6)

    if (!nextFiles.length) {
      return
    }

    setSelectedFiles((currentFiles) => {
      const availableSlots = Math.max(0, 6 - currentFiles.length)
      const fileEntries = nextFiles.slice(0, availableSlots).map(createFileEntry)
      return [...currentFiles, ...fileEntries]
    })
  }

  function handleRemoveFile(fileId) {
    setSelectedFiles((currentFiles) => {
      const nextFiles = currentFiles.filter((fileEntry) => fileEntry.id !== fileId)
      const removedFile = currentFiles.find((fileEntry) => fileEntry.id === fileId)

      if (removedFile?.previewUrl) {
        URL.revokeObjectURL(removedFile.previewUrl)
      }

      return nextFiles
    })
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
    stopListening()
    clearSelectedFiles()
    flushPendingFileCleanup()

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
    stopListening()
    clearSelectedFiles()
    flushPendingFileCleanup()
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
      stopListening()
      clearSelectedFiles()
      flushPendingFileCleanup()
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

    if (!canSubmit || isStreaming) {
      return
    }

    if (composerMode === COMPOSER_MODE.IMAGE) {
      stopListening()
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
          attachments: [],
          images: [],
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
              attachments: [],
              images: [],
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

    const fileEntries = [...selectedFiles]
    const files = fileEntries.map((fileEntry) => fileEntry.file)
    const userContent = buildPendingUserText(prompt, fileEntries)
    const pendingAttachments = buildPendingAttachments(fileEntries)
    const pendingImages = buildPendingImages(fileEntries)
    const abortController = new AbortController()

    stopListening()
    streamAbortRef.current?.abort()
    streamAbortRef.current = abortController

    let streamMeta = null
    let streamDone = null

    setStreamError('')
    setStreamState({
      chat: activeChat,
      title: activeChat?.title || userContent,
      userMessage: {
        id: 'pending-user',
        role: 'user',
        content: userContent,
        pending: true,
        attachments: pendingAttachments,
        images: pendingImages,
      },
      aiText: '',
      aiBuffer: '',
      doneReceived: false,
      isStreaming: true,
    })
    setDraft('')
    setSelectedFiles([])
    dispatch(clearChatError())

    try {
      await streamMessage({
        chatId: currentChatId,
        files,
        message: prompt,
        model: selectedChatModel || undefined,
        signal: abortController.signal,
        onEvent: ({ event, data }) => {
          if (event === 'meta') {
            streamMeta = data

            setStreamState((currentState) => ({
              ...(currentState || {}),
              chat: data.chat || currentState?.chat || null,
              title: data.chat?.title || data.title || currentState?.title || userContent,
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
                  title: data.chat?.title || data.title || safeState.title || userContent,
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
                title: data.chat?.title || data.title || safeState.title || userContent,
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
        pendingFileCleanupRef.current = [...pendingFileCleanupRef.current, ...fileEntries]
        setPendingHydrationChatId(nextChatId)
      } else {
        revokeFileEntries(fileEntries)
      }
    } catch (streamFailure) {
      if (abortController.signal.aborted) {
        revokeFileEntries(fileEntries)
        setPendingHydrationChatId(null)
        setStreamState(null)
        return
      }

      setDraft(prompt)
      setSelectedFiles(fileEntries)
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
    setIsLoggingOut(true)
    stopListening()
    clearSelectedFiles()
    flushPendingFileCleanup()

    try {
      await handleLogout()
      navigate('/login', { replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }

  async function handleProfileSave({ username: nextUsername, avatarFile }) {
    setIsProfileSaving(true)

    try {
      const response = await handleUpdateProfile({
        username: nextUsername,
        avatarFile,
      })

      if (response?.user) {
        setIsProfileOpen(false)
      }
    } finally {
      setIsProfileSaving(false)
    }
  }

  function handleVoiceInputToggle() {
    if (isListening) {
      stopListening()
      return
    }

    startListening({
      initialText: draft,
      onTextChange: setDraft,
    })
  }

  return {
    avatar: user?.avatar || '',
    avatarLabel,
    canSubmit,
    chatModels,
    chats,
    composerMode,
    conversationEndRef,
    currentChatId,
    deletingChatId,
    draft,
    hasActiveThread,
    isDeleting,
    isLoading,
    isListeningToVoice: isListening,
    isLoggingOut,
    isProfileOpen,
    isProfileSaving,
    isSidebarOpen,
    isStreaming,
    isThemeTransitioning,
    isVoiceInputSupported,
    isVoiceTranscribing: isTranscribing,
    nextTheme,
    selectedChatModel,
    selectedFiles,
    statusError,
    theme,
    threadTitle,
    username,
    visibleMessages,
    voiceStatus,
    handleChatModelChange,
    handleComposerModeChange,
    handleDeleteChat,
    handleDraftChange: setDraft,
    handleFilesSelected,
    handleLogoutClick,
    handleMenuToggle,
    handleProfileClose,
    handleProfileOpen,
    handleProfileSave,
    handleRemoveFile,
    handleSidebarClose,
    handleStartNewThread,
    handleSubmit,
    handleSuggestionClick,
    handleThemeToggle,
    handleThreadSelect,
    handleVoiceInputToggle,
  }
}
