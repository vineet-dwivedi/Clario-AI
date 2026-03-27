import React from 'react'
import DashboardSidebar from './components/DashboardSidebar'
import DashboardThread from './components/DashboardThread'
import DashboardWelcome from './components/DashboardWelcome'
import ThemeToggleButton from './components/ThemeToggleButton'
import { useDashboardPage } from './useDashboardPage'

function DashboardPage() {
  const page = useDashboardPage()
  const sceneClassName = `dashboard-scene${page.isThemeTransitioning ? ' dashboard-scene--theme-shift' : ''}${
    page.hasActiveThread ? ' dashboard-scene--thread' : ''
  }${page.isSidebarOpen ? ' dashboard-scene--sidebar-open' : ''}`

  return (
    <div className={sceneClassName}>
      <span aria-hidden="true" className="theme-transition-layer" />

      {page.isSidebarOpen ? (
        <button
          aria-label="Close menu"
          className="dashboard-sidebar-backdrop"
          onClick={page.handleSidebarClose}
          type="button"
        />
      ) : null}

      <DashboardSidebar
        avatarLabel={page.avatarLabel}
        chats={page.chats}
        currentChatId={page.currentChatId}
        deletingChatId={page.deletingChatId}
        isAuthLoading={page.isAuthLoading}
        isDeleting={page.isDeleting}
        isLoading={page.isLoading}
        isSidebarOpen={page.isSidebarOpen}
        onClose={page.handleSidebarClose}
        onDeleteChat={page.handleDeleteChat}
        onLogout={page.handleLogoutClick}
        onNewThread={page.handleStartNewThread}
        onSelectChat={page.handleThreadSelect}
        username={page.username}
      />

      {page.hasActiveThread ? (
        <DashboardThread
          avatarLabel={page.avatarLabel}
          conversationEndRef={page.conversationEndRef}
          draft={page.draft}
          isSidebarOpen={page.isSidebarOpen}
          isStreaming={page.isStreaming}
          messages={page.visibleMessages}
          mode={page.composerMode}
          onChange={page.handleDraftChange}
          onMenuToggle={page.handleMenuToggle}
          onModeChange={page.handleComposerModeChange}
          onStartNewThread={page.handleStartNewThread}
          onSubmit={page.handleSubmit}
          statusError={page.statusError}
          threadTitle={page.threadTitle}
          username={page.username}
        />
      ) : (
        <DashboardWelcome
          avatarLabel={page.avatarLabel}
          draft={page.draft}
          isSidebarOpen={page.isSidebarOpen}
          isStreaming={page.isStreaming}
          mode={page.composerMode}
          onChange={page.handleDraftChange}
          onMenuToggle={page.handleMenuToggle}
          onModeChange={page.handleComposerModeChange}
          onSubmit={page.handleSubmit}
          onSuggestionClick={page.handleSuggestionClick}
          statusError={page.statusError}
          username={page.username}
        />
      )}

      <ThemeToggleButton nextTheme={page.nextTheme} onToggle={page.handleThemeToggle} theme={page.theme} />
    </div>
  )
}

export default DashboardPage
