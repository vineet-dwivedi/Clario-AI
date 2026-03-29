import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

import {
  deleteChat as deleteChatRequest,
  getChatMessages,
  getChats,
  sendMessage,
  updateChatSaveStatus as updateChatSaveStatusRequest,
} from './service/chat.api'

const getApiErrorMessage = (error, fallbackMessage) => {
  return error.response?.data?.message || error.message || fallbackMessage
}

const sortChatsByActivity = (chats) =>
  [...chats].sort((left, right) => new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0))

const upsertChatInList = (chats, nextChat) => {
  if (!nextChat?.id) {
    return chats
  }

  const index = chats.findIndex((chat) => chat.id === nextChat.id)

  if (index === -1) {
    return sortChatsByActivity([...chats, nextChat])
  }

  const nextChats = [...chats]
  nextChats[index] = {
    ...nextChats[index],
    ...nextChat,
  }

  return sortChatsByActivity(nextChats)
}

const appendUniqueMessages = (currentMessages, nextMessages) => {
  const seenMessageIds = new Set(currentMessages.map((message) => message.id))
  const mergedMessages = [...currentMessages]

  for (const message of nextMessages) {
    if (!message?.id || seenMessageIds.has(message.id)) {
      continue
    }

    seenMessageIds.add(message.id)
    mergedMessages.push(message)
  }

  return mergedMessages
}

export const fetchChats = createAsyncThunk('chat/fetchChats', async (_, { rejectWithValue }) => {
  try {
    const response = await getChats()
    return response.data || []
  } catch (error) {
    return rejectWithValue(getApiErrorMessage(error, 'Failed to load chats.'))
  }
})

export const fetchChatMessages = createAsyncThunk('chat/fetchChatMessages', async (chatId, { rejectWithValue }) => {
  try {
    const response = await getChatMessages(chatId)
    return response.data
  } catch (error) {
    return rejectWithValue(getApiErrorMessage(error, 'Failed to load chat messages.'))
  }
})

export const sendChatMessage = createAsyncThunk('chat/sendChatMessage', async (payload, { rejectWithValue }) => {
  try {
    const response = await sendMessage(payload)
    return response.data
  } catch (error) {
    return rejectWithValue(getApiErrorMessage(error, 'Failed to send message.'))
  }
})

export const deleteChatThread = createAsyncThunk('chat/deleteChatThread', async (chatId, { rejectWithValue }) => {
  try {
    const response = await deleteChatRequest(chatId)
    return response.data?.chatId || chatId
  } catch (error) {
    return rejectWithValue(getApiErrorMessage(error, 'Failed to delete chat.'))
  }
})

export const toggleSavedChatStatus = createAsyncThunk(
  'chat/toggleSavedChatStatus',
  async ({ chatId, isSaved }, { rejectWithValue }) => {
    try {
      const response = await updateChatSaveStatusRequest(chatId, isSaved)
      return response.data?.chat || null
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Failed to update saved chat.'))
    }
  },
)

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    chats: [],
    messagesByChatId: {},
    currentChatId: null,
    isLoading: false,
    isSending: false,
    isDeleting: false,
    error: null,
  },
  reducers: {
    setCurrentChatId: (state, action) => {
      state.currentChatId = action.payload
    },
    clearCurrentChat: (state) => {
      state.currentChatId = null
    },
    clearChatError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChats.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchChats.fulfilled, (state, action) => {
        state.isLoading = false
        state.chats = sortChatsByActivity(action.payload || [])
      })
      .addCase(fetchChats.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload || 'Failed to load chats.'
      })
      .addCase(fetchChatMessages.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchChatMessages.fulfilled, (state, action) => {
        const { chat, messages } = action.payload || {}

        state.isLoading = false

        if (chat?.id) {
          state.currentChatId = chat.id
          state.chats = upsertChatInList(state.chats, chat)
          state.messagesByChatId[chat.id] = messages || []
        }
      })
      .addCase(fetchChatMessages.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload || 'Failed to load chat messages.'
      })
      .addCase(sendChatMessage.pending, (state) => {
        state.isSending = true
        state.error = null
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        const { aiMessage, chat, userMessage } = action.payload || {}
        const nextMessages = [userMessage, aiMessage].filter(Boolean)

        state.isSending = false

        if (chat?.id) {
          state.currentChatId = chat.id
          state.chats = upsertChatInList(state.chats, chat)
          state.messagesByChatId[chat.id] = appendUniqueMessages(state.messagesByChatId[chat.id] || [], nextMessages)
        }
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.isSending = false
        state.error = action.payload || 'Failed to send message.'
      })
      .addCase(deleteChatThread.pending, (state) => {
        state.isDeleting = true
        state.error = null
      })
      .addCase(deleteChatThread.fulfilled, (state, action) => {
        const chatId = action.payload

        state.isDeleting = false
        state.chats = state.chats.filter((chat) => chat.id !== chatId)
        delete state.messagesByChatId[chatId]

        if (state.currentChatId === chatId) {
          state.currentChatId = null
        }
      })
      .addCase(deleteChatThread.rejected, (state, action) => {
        state.isDeleting = false
        state.error = action.payload || 'Failed to delete chat.'
      })
      .addCase(toggleSavedChatStatus.pending, (state) => {
        state.error = null
      })
      .addCase(toggleSavedChatStatus.fulfilled, (state, action) => {
        if (action.payload?.id) {
          state.chats = upsertChatInList(state.chats, action.payload)
        }
      })
      .addCase(toggleSavedChatStatus.rejected, (state, action) => {
        state.error = action.payload || 'Failed to update saved chat.'
      })
  },
})

export const { clearChatError, clearCurrentChat, setCurrentChatId } = chatSlice.actions

export default chatSlice.reducer
