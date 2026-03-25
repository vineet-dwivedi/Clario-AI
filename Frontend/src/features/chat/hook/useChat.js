import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import {
  appendChatMessages,
  removeChat,
  setChatMessages,
  setChats,
  setCurrentChatId,
  setDeleting,
  setError,
  setLoading,
  setSending,
  upsertChat,
} from '../chat.slice'
import { deleteChat, getChatMessages, getChats, sendMessage } from '../service/chat.api'

const getApiErrorMessage = (error, fallbackMessage) => error?.response?.data?.message || error?.message || fallbackMessage

/**
 * Chat hook responsible for loading threads, opening chats, and sending messages.
 */
export const useChat = (shouldLoad) => {
  const dispatch = useDispatch()
  const hasLoadedChatsRef = useRef(false)
  const chatState = useSelector((state) => state.chat)
  const { chats, currentChatId, messagesByChatId } = chatState
  const currentChat = chats.find((chat) => chat.id === currentChatId) || null
  const currentMessages = currentChatId ? messagesByChatId[currentChatId] || [] : []

  useEffect(() => {
    if (!shouldLoad || hasLoadedChatsRef.current) {
      return
    }

    hasLoadedChatsRef.current = true

    const loadInitialChats = async () => {
      dispatch(setLoading(true))
      dispatch(setError(null))

      try {
        const response = await getChats()
        dispatch(setChats(response?.data || []))
      } catch (error) {
        dispatch(setError(getApiErrorMessage(error, 'Failed to load chats.')))
      } finally {
        dispatch(setLoading(false))
      }
    }

    loadInitialChats()
  }, [dispatch, shouldLoad])

  const openChat = async (chatId) => {
    if (!chatId) {
      dispatch(setCurrentChatId(null))
      return null
    }

    dispatch(setCurrentChatId(chatId))

    if (Object.prototype.hasOwnProperty.call(messagesByChatId, chatId)) {
      return {
        chat: chats.find((chat) => chat.id === chatId) || null,
        messages: messagesByChatId[chatId] || [],
      }
    }

    dispatch(setLoading(true))
    dispatch(setError(null))

    try {
      const response = await getChatMessages(chatId)
      const chat = response?.data?.chat || null
      const messages = response?.data?.messages || []

      if (chat) {
        dispatch(upsertChat(chat))
      }

      dispatch(setChatMessages({ chatId, messages }))
      return { chat, messages }
    } catch (error) {
      dispatch(setError(getApiErrorMessage(error, 'Failed to load chat messages.')))
      return null
    } finally {
      dispatch(setLoading(false))
    }
  }

  const startNewChat = () => {
    dispatch(setCurrentChatId(null))
  }

  const sendChatMessage = async (message, chatId = currentChatId) => {
    const trimmedMessage = message?.trim()

    if (!trimmedMessage) {
      return null
    }

    dispatch(setSending(true))
    dispatch(setError(null))

    try {
      const response = await sendMessage({ chatId, message: trimmedMessage })
      const data = response?.data
      const nextChat = data?.chat || null
      const nextChatId = nextChat?.id || chatId
      const nextMessages = [data?.userMessage, data?.aiMessage].filter(Boolean)

      if (nextChat) {
        dispatch(upsertChat(nextChat))
      }

      if (nextChatId) {
        dispatch(setCurrentChatId(nextChatId))
        dispatch(appendChatMessages({ chatId: nextChatId, messages: nextMessages }))
      }

      return data
    } catch (error) {
      dispatch(setError(getApiErrorMessage(error, 'Failed to send message.')))
      return null
    } finally {
      dispatch(setSending(false))
    }
  }

  const deleteChatById = async (chatId) => {
    if (!chatId) {
      return false
    }

    dispatch(setDeleting(true))
    dispatch(setError(null))

    try {
      await deleteChat(chatId)
      dispatch(removeChat(chatId))
      return true
    } catch (error) {
      dispatch(setError(getApiErrorMessage(error, 'Failed to delete chat.')))
      return false
    } finally {
      dispatch(setDeleting(false))
    }
  }

  return {
    ...chatState,
    currentChat,
    currentMessages,
    deleteChatById,
    openChat,
    sendChatMessage,
    startNewChat,
  }
}
