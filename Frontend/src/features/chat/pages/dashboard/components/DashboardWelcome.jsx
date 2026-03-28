import React from 'react'
import { suggestionPrompts } from '../constants'
import DashboardTopbar from './DashboardTopbar'
import PromptComposer from './PromptComposer'
import SuggestionGrid from './SuggestionGrid'

function DashboardWelcome({
  avatarLabel,
  chatModels,
  draft,
  isListeningToVoice,
  isSidebarOpen,
  isStreaming,
  isVoiceInputSupported,
  isVoicePlaybackSupported,
  isVoiceReplyEnabled,
  isVoiceSpeaking,
  isVoiceTranscribing,
  mode,
  onChange,
  onMenuToggle,
  onModeChange,
  onModelChange,
  onSubmit,
  onSuggestionClick,
  onVoiceInputToggle,
  onVoiceReplyToggle,
  selectedModel,
  statusError,
  username,
  voiceStatus,
}) {
  return (
    <div className="dashboard-shell">
      <DashboardTopbar
        actionLabel="Chats"
        avatarLabel={avatarLabel}
        isSidebarOpen={isSidebarOpen}
        onAction={onMenuToggle}
        onMenuToggle={onMenuToggle}
        username={username}
      />

      <main className="dashboard-main">
        <section className="dashboard-hero">
          <h1 className="dashboard-hero__title">What do you want to know?</h1>
          <p className="dashboard-hero__copy">
            Ask anything. Your question will be sent to the backend AI service and the reply will appear here.
          </p>
        </section>

        {statusError ? <p className="dashboard-thread__status dashboard-thread__status--error">{statusError}</p> : null}

        <PromptComposer
          chatModels={chatModels}
          draft={draft}
          isListening={isListeningToVoice}
          isSending={isStreaming}
          isVoiceInputSupported={isVoiceInputSupported}
          isVoicePlaybackSupported={isVoicePlaybackSupported}
          isVoiceReplyEnabled={isVoiceReplyEnabled}
          isVoiceSpeaking={isVoiceSpeaking}
          isVoiceTranscribing={isVoiceTranscribing}
          mode={mode}
          onChange={onChange}
          onModeChange={onModeChange}
          onModelChange={onModelChange}
          onSubmit={onSubmit}
          onVoiceInputToggle={onVoiceInputToggle}
          onVoiceReplyToggle={onVoiceReplyToggle}
          selectedModel={selectedModel}
          voiceStatus={voiceStatus}
        />

        <SuggestionGrid onSuggestionClick={onSuggestionClick} suggestions={suggestionPrompts} />
      </main>
    </div>
  )
}

export default DashboardWelcome
