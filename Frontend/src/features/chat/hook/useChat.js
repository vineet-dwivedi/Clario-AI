import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import {
  clearCurrentChat,
  deleteChatThread,
  fetchChatMessages,
  fetchChats,
  sendChatMessage,
  setCurrentChatId,
} from '../chat.slice'

/**
 * Shared chat hook backed by the Redux slice and backend API.
 */
export const useChat = (shouldLoad) => {
  const dispatch = useDispatch()
  const chatState = useSelector((state) => state.chat)
  const { chats, currentChatId, messagesByChatId } = chatState
  const currentChat = chats.find((chat) => chat.id === currentChatId) || null
  const currentMessages = currentChatId ? messagesByChatId[currentChatId] || [] : []

  useEffect(() => {
    if (shouldLoad) {
      dispatch(fetchChats())
    }
  }, [dispatch, shouldLoad])

  const openChat = async (chatId) => {
    if (!chatId) {
      dispatch(clearCurrentChat())
      return null
    }

    dispatch(setCurrentChatId(chatId))
    const result = await dispatch(fetchChatMessages(chatId))

    if (fetchChatMessages.fulfilled.match(result)) {
      return result.payload
    }

    return null
  }

  const startNewChat = () => {
    dispatch(clearCurrentChat())
  }

  const sendMessageToChat = async (message, chatId = currentChatId) => {
    const result = await dispatch(sendChatMessage({ chatId, message }))
    return sendChatMessage.fulfilled.match(result) ? result.payload : null
  }

  const deleteChatById = async (chatId) => {
    const result = await dispatch(deleteChatThread(chatId))
    return deleteChatThread.fulfilled.match(result)
  }

  return {
    ...chatState,
    currentChat,
    currentMessages,
    deleteChatById,
    openChat,
    sendChatMessage: sendMessageToChat,
    startNewChat,
  }
}
