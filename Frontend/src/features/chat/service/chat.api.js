import axios from 'axios'

const API_BASE_URL = 'http://localhost:5000'

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

function buildPayload({ chatId, message, model }) {
  return {
    message,
    ...(chatId ? { chatId } : {}),
    ...(model ? { model } : {}),
  }
}

async function getJsonErrorMessage(response) {
  try {
    const data = await response.json()
    return data?.message || 'Request failed'
  } catch {
    return 'Request failed'
  }
}

export async function getChats() {
  const response = await api.get('/api/chats')
  return response.data
}

export async function getChatMessages(chatId) {
  const response = await api.get(`/api/chats/${chatId}/messages`)
  return response.data
}

export async function sendMessage(payload) {
  const response = await api.post('/api/chats/message', buildPayload(payload))
  return response.data
}

export async function generateImage({ chatId, message }) {
  const response = await api.post('/api/chats/image', { message, ...(chatId ? { chatId } : {}) })
  return response.data
}

export async function deleteChat(chatId) {
  const response = await api.delete(`/api/chats/${chatId}`)
  return response.data
}

export async function getModels() {
  const response = await api.get('/api/chats/models')
  return response.data
}

export async function streamMessage({ chatId, message, model, onEvent, signal }) {
  const response = await fetch(`${API_BASE_URL}/api/chats/message/stream`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildPayload({ chatId, message, model })),
    signal,
  })

  if (!response.ok) {
    throw new Error(await getJsonErrorMessage(response))
  }

  if (!response.body) {
    throw new Error('Streaming is not available in this browser.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let currentEvent = 'message'

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() || ''

    for (const part of parts) {
      const lines = part.split('\n')
      let dataLine = ''

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim()
        }

        if (line.startsWith('data: ')) {
          dataLine += line.slice(6)
        }
      }

      if (!dataLine) {
        continue
      }

      const data = JSON.parse(dataLine)

      onEvent?.({ event: currentEvent, data })

      if (currentEvent === 'error') {
        throw new Error(data?.message || 'Streaming failed.')
      }

      currentEvent = 'message'
    }
  }
}
