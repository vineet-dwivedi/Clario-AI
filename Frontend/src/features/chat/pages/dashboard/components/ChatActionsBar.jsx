import React, { useMemo, useState } from 'react'
import { copyText, downloadConversationPdf, downloadTextFile, formatConversationText } from '../helpers'
import { CopyIcon, DownloadIcon, SaveIcon } from './DashboardIcons'

function ChatActionsBar({ messages, threadTitle }) {
  const [status, setStatus] = useState('')
  const transcript = useMemo(() => formatConversationText(messages, threadTitle), [messages, threadTitle])

  async function handleCopy() {
    try {
      await copyText(transcript)
      setStatus('Conversation copied.')
    } catch {
      setStatus('Copy failed. Please try again.')
    }
  }

  function handleSave() {
    downloadTextFile(threadTitle || 'clario-ai-chat', transcript)
    setStatus('Chat saved as text.')
  }

  function handleDownloadPdf() {
    downloadConversationPdf(threadTitle || 'clario-ai-chat', transcript)
    setStatus('PDF download started.')
  }

  return (
    <div className="dashboard-chat-actions">
      <div className="dashboard-chat-actions__buttons">
        <button className="dashboard-chat-actions__button" onClick={handleCopy} type="button">
          <CopyIcon className="dashboard-chat-actions__icon" />
          <span>Copy</span>
        </button>

        <button className="dashboard-chat-actions__button" onClick={handleSave} type="button">
          <SaveIcon className="dashboard-chat-actions__icon" />
          <span>Save</span>
        </button>

        <button className="dashboard-chat-actions__button" onClick={handleDownloadPdf} type="button">
          <DownloadIcon className="dashboard-chat-actions__icon" />
          <span>Download PDF</span>
        </button>
      </div>

      {status ? (
        <p aria-live="polite" className="dashboard-chat-actions__status">
          {status}
        </p>
      ) : null}
    </div>
  )
}

export default ChatActionsBar
