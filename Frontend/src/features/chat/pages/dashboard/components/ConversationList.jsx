import React from 'react'
import ChatMarkdown from '../../../components/ChatMarkdown'
import MessageImages from './MessageImages'

function ConversationList({ conversationEndRef, messages, statusError }) {
  return (
    <>
      {statusError ? <p className="dashboard-thread__status dashboard-thread__status--error">{statusError}</p> : null}

      <div className="dashboard-conversation">
        {messages.map((message) => (
          <article
            className={`dashboard-message dashboard-message--${message.role}${message.pending ? ' dashboard-message--pending' : ''}`}
            key={message.id}
          >
            <div className="dashboard-message__meta">
              <span className="dashboard-message__role">{message.role === 'user' ? 'You' : 'Lumina'}</span>
            </div>

            {message.role === 'ai' ? (
              <div className="dashboard-message__content dashboard-message__content--ai">
                {message.content ? <ChatMarkdown content={message.content} /> : null}
                {Array.isArray(message.images) && message.images.length ? (
                  <MessageImages images={message.images} pending={message.pending} />
                ) : null}
                {!message.content && !message.images?.length && message.pending ? <p>Generating...</p> : null}
                {message.pending ? <span aria-hidden="true" className="dashboard-message__stream-caret" /> : null}
              </div>
            ) : (
              <div className="dashboard-message__content dashboard-message__content--user">
                <p>{message.content}</p>
                {Array.isArray(message.images) && message.images.length ? (
                  <MessageImages images={message.images} pending={message.pending} />
                ) : null}
              </div>
            )}
          </article>
        ))}

        <div ref={conversationEndRef} />
      </div>
    </>
  )
}

export default ConversationList
