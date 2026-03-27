import { STORAGE_KEY } from './constants'

export function getInitialTheme() {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const savedTheme = window.localStorage.getItem(STORAGE_KEY)

  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function buildVisibleMessages(activeMessages, streamState, isStreaming) {
  const messages = [...activeMessages]

  if (streamState?.userMessage && !messages.some((message) => message.id === streamState.userMessage.id)) {
    messages.push(streamState.userMessage)
  }

  if (streamState?.aiText || streamState?.aiImages?.length || isStreaming) {
    messages.push({
      id: 'streaming-ai',
      role: 'ai',
      kind: streamState?.aiKind || 'text',
      content: streamState?.aiText || '',
      images: streamState?.aiImages || [],
      pending: isStreaming,
    })
  }

  return messages
}
