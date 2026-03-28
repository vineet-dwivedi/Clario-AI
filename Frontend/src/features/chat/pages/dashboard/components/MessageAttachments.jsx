import React from 'react'
import { FileIcon } from './DashboardIcons'

function MessageAttachments({ attachments = [] }) {
  if (!attachments.length) {
    return null
  }

  return (
    <div className="dashboard-message__attachments">
      {attachments.map((file) => (
        <span className="dashboard-message__attachment" key={`${file.name}-${file.mimeType}`}>
          <FileIcon className="dashboard-message__attachment-icon" />
          <span className="dashboard-message__attachment-label">{file.name}</span>
        </span>
      ))}
    </div>
  )
}

export default MessageAttachments
