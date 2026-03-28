import React from 'react'
import { SparkleIcon } from '../../../../auth/components/AuthIcons'
import { ChatIcon, CloseIcon, LogoutIcon, PlusIcon, TrashIcon } from './DashboardIcons'

function DashboardSidebar({
  avatar,
  avatarLabel,
  chats,
  currentChatId,
  deletingChatId,
  isDeleting,
  isLoggingOut,
  isLoading,
  isSidebarOpen,
  onClose,
  onDeleteChat,
  onLogout,
  onNewThread,
  onOpenProfile,
  onSelectChat,
  username,
}) {
  return (
    <aside className={`dashboard-sidebar${isSidebarOpen ? ' dashboard-sidebar--open' : ''}`}>
      <div className="dashboard-sidebar__header">
        <div className="dashboard-sidebar__brand">
          <span className="dashboard-brand__badge" aria-hidden="true">
            <SparkleIcon className="dashboard-brand__icon" />
          </span>
          <span className="dashboard-brand__name">Clario AI</span>
        </div>

        <button
          aria-label="Close menu"
          className="dashboard-sidebar__close dashboard-topbar__circle"
          onClick={onClose}
          type="button"
        >
          <CloseIcon className="dashboard-topbar__icon" />
        </button>
      </div>

      <button className="dashboard-sidebar__new" onClick={onNewThread} type="button">
        <span>New Thread</span>
        <PlusIcon className="dashboard-sidebar__new-icon" />
      </button>

      <div className="dashboard-sidebar__section">
        <p className="dashboard-sidebar__label">Recent</p>

        <div className="dashboard-sidebar__threads">
          {isLoading && chats.length === 0 ? <p className="dashboard-sidebar__note">Loading chats...</p> : null}
          {!isLoading && chats.length === 0 ? <p className="dashboard-sidebar__note">No chats yet.</p> : null}

          {chats.map((chat) => (
            <div className="dashboard-thread-item" key={chat.id}>
              <button
                className={`dashboard-thread-link${chat.id === currentChatId ? ' dashboard-thread-link--active' : ''}`}
                onClick={() => onSelectChat(chat.id)}
                type="button"
              >
                <ChatIcon className="dashboard-thread-link__icon" />
                <span className="dashboard-thread-link__label">{chat.title}</span>
              </button>

              <button
                aria-label={`Delete ${chat.title}`}
                className="dashboard-thread-item__delete"
                disabled={isDeleting || deletingChatId === chat.id}
                onClick={(event) => onDeleteChat(event, chat.id)}
                title="Delete chat"
                type="button"
              >
                <TrashIcon className="dashboard-thread-item__delete-icon" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-sidebar__footer">
        <button className="dashboard-sidebar__profile" onClick={onOpenProfile} type="button">
          <span className="dashboard-sidebar__profile-avatar">
            {avatar ? <img alt={username} className="dashboard-sidebar__profile-image" src={avatar} /> : avatarLabel}
          </span>
          <span className="dashboard-sidebar__profile-name">{username}</span>
        </button>

        <button className="dashboard-sidebar__logout" disabled={isLoggingOut} onClick={onLogout} type="button">
          <LogoutIcon className="dashboard-sidebar__logout-icon" />
          <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
        </button>
      </div>
    </aside>
  )
}
export default DashboardSidebar
