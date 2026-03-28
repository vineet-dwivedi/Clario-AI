import React from 'react'
import ConversationList from './ConversationList'
import DashboardTopbar from './DashboardTopbar'
import PromptComposer from './PromptComposer'

function DashboardThread({
  avatarLabel,
  chatModels,
  conversationEndRef,
  draft,
  isSidebarOpen,
  isStreaming,
  messages,
  mode,
  onChange,
  onMenuToggle,
  onModeChange,
  onModelChange,
  onStartNewThread,
  onSubmit,
  selectedModel,
  statusError,
  threadTitle,
  username,
}) {
  return (
    <div className="dashboard-thread-page">
      <div className="dashboard-thread-page__header">
        <div className="dashboard-shell">
          <DashboardTopbar
            actionLabel="New chat"
            avatarLabel={avatarLabel}
            isSidebarOpen={isSidebarOpen}
            onAction={onStartNewThread}
            onMenuToggle={onMenuToggle}
            username={username}
          />
        </div>
      </div>

      <main className="dashboard-thread">
        <div className="dashboard-thread__scroll">
          <div className="dashboard-thread__inner">
            <div className="dashboard-thread__hero">
              <h1 className="dashboard-thread__title">{threadTitle}</h1>
              <p className="dashboard-thread__copy">
                Ask follow-up questions in the same thread and the backend will keep the conversation grouped.
              </p>
            </div>

            <ConversationList conversationEndRef={conversationEndRef} messages={messages} statusError={statusError} />
          </div>
        </div>

        <PromptComposer
          chatModels={chatModels}
          docked
          draft={draft}
          isSending={isStreaming}
          mode={mode}
          onChange={onChange}
          onModeChange={onModeChange}
          onModelChange={onModelChange}
          onSubmit={onSubmit}
          selectedModel={selectedModel}
        />
      </main>
    </div>
  )
}
export default DashboardThread
