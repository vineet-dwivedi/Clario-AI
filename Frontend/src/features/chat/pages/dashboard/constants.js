import { CodeIcon, ImageIcon, NoteIcon, OrbitIcon } from './components/DashboardIcons'

export const COMPOSER_MODE = Object.freeze({
  CHAT: 'chat',
  IMAGE: 'image',
})

export const suggestionPrompts = [
  { label: 'Summarize the latest chat', icon: NoteIcon, tone: 'violet' },
  { label: 'Debug this React hook', icon: CodeIcon, tone: 'teal' },
  { label: 'Generate a product description', icon: ImageIcon, tone: 'rose' },
  { label: 'Explain quantum physics simply', icon: OrbitIcon, tone: 'mint' },
]
