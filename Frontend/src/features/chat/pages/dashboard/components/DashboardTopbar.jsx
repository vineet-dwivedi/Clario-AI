import React from 'react'
import { SparkleIcon } from '../../../../auth/components/AuthIcons'
import { MenuIcon } from './DashboardIcons'

function DashboardTopbar({ actionLabel, avatarLabel, isSidebarOpen, onAction, onMenuToggle, username }) {
  return (
    <header className="dashboard-topbar">
      <div className="dashboard-topbar__left">
        <button
          aria-expanded={isSidebarOpen}
          aria-label="Open dashboard menu"
          className="dashboard-topbar__circle"
          onClick={onMenuToggle}
          type="button"
        >
          <MenuIcon className="dashboard-topbar__icon" />
        </button>

        <div className="dashboard-brand">
          <span className="dashboard-brand__badge" aria-hidden="true">
            <SparkleIcon className="dashboard-brand__icon" />
          </span>
          <span className="dashboard-brand__name">Lumina</span>
        </div>
      </div>

      <div className="dashboard-topbar__actions">
        <button className="dashboard-topbar__link" onClick={onAction} type="button">
          {actionLabel}
        </button>

        <button aria-label={`${username} profile`} className="dashboard-avatar" type="button">
          <span className="dashboard-avatar__label">{avatarLabel}</span>
        </button>
      </div>
    </header>
  )
}

export default DashboardTopbar
