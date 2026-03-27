import React from 'react'

function SuggestionGrid({ onSuggestionClick, suggestions }) {
  return (
    <div className="dashboard-suggestions" aria-label="Suggested prompts">
      {suggestions.map(({ label, icon: Icon, tone }) => (
        <button
          className={`dashboard-suggestion dashboard-suggestion--${tone}`}
          key={label}
          onClick={() => onSuggestionClick(label)}
          type="button"
        >
          <Icon className="dashboard-suggestion__icon" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}

export default SuggestionGrid
