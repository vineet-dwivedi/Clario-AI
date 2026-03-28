import { STORAGE_KEY } from './constants'
import { jsPDF } from 'jspdf'

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

function sanitizeFileName(value, fallback) {
  const safeValue = String(value || fallback)
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80)

  return safeValue || fallback
}

export function getAvatarLabel(username) {
  const parts = String(username || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)

  if (!parts.length) {
    return 'CA'
  }

  return parts.map((part) => part[0]?.toUpperCase() || '').join('')
}

export function formatConversationText(messages, threadTitle = 'Chat') {
  const transcript = messages
    .filter((message) => !message.pending)
    .map((message) => {
      const role = message.role === 'user' ? 'You' : 'Clario AI'
      const content = String(message.content || '').trim()
      const attachmentLines = Array.isArray(message.attachments)
        ? message.attachments.map((file) => `Attachment: ${file.name}`)
        : []
      const imageLine = Array.isArray(message.images) && message.images.length ? [`Images: ${message.images.length}`] : []

      return [role, content, ...attachmentLines, ...imageLine].filter(Boolean).join('\n')
    })
    .join('\n\n')

  return `${threadTitle}\n\n${transcript}`.trim()
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textArea = document.createElement('textarea')
  textArea.value = text
  document.body.appendChild(textArea)
  textArea.select()
  document.execCommand('copy')
  textArea.remove()
}

export function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${sanitizeFileName(filename, 'clario-ai-chat')}.txt`
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadConversationPdf(filename, text) {
  const pdf = new jsPDF({
    unit: 'pt',
    format: 'a4',
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 42
  const lineHeight = 18
  const lines = pdf.splitTextToSize(text, pageWidth - margin * 2)
  let y = margin

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(12)

  for (const line of lines) {
    if (y > pageHeight - margin) {
      pdf.addPage()
      y = margin
    }

    pdf.text(line, margin, y)
    y += lineHeight
  }

  pdf.save(`${sanitizeFileName(filename, 'clario-ai-chat')}.pdf`)
}
