import React, { useState } from 'react'
import { Chat } from '../types'

interface SidebarProps {
  chats: Chat[]
  activeChatId: string | null
  onNewChat: () => void
  onSelectChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => void
  onSettings: () => void
  isSettingsActive: boolean
}

export default function Sidebar({
  chats,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onSettings,
  isSettingsActive,
}: SidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const formatRelativeTime = (ts: number) => {
    const now = Date.now()
    const diff = now - ts
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return new Date(ts).toLocaleDateString()
  }

  return (
    <div
      className="flex flex-col shrink-0"
      style={{
        width: 'var(--sidebar-width)',
        borderRight: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)',
      }}
    >
      {/* Traffic lights + wordmark */}
      <div className="drag-region flex items-end pb-3 px-4" style={{ height: '52px' }}>
        <span
          className="no-drag tracking-widest uppercase text-xs font-medium select-none"
          style={{ fontFamily: 'var(--font-serif)', fontSize: '0.95rem', letterSpacing: '0.12em', color: 'var(--text-primary)', fontWeight: 400 }}
        >
          Ramanujan
        </span>
      </div>

      {/* New Chat button */}
      <div className="px-3 pb-3 no-drag">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          New chat
          <span className="ml-auto text-xs opacity-40">⌘N</span>
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5 no-drag">
        {chats.length === 0 && (
          <div className="px-3 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No chats yet
          </div>
        )}
        {chats.map(chat => (
          <div
            key={chat.id}
            className="relative group"
            onMouseEnter={() => setHoveredId(chat.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <button
              onClick={() => onSelectChat(chat.id)}
              className="w-full text-left px-3 py-2.5 rounded-lg transition-all duration-100"
              style={{
                background: activeChatId === chat.id ? 'var(--bg-elevated)' : 'transparent',
                color: activeChatId === chat.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
              onMouseEnter={e => {
                if (activeChatId !== chat.id) {
                  e.currentTarget.style.background = 'var(--bg-hover)'
                }
              }}
              onMouseLeave={e => {
                if (activeChatId !== chat.id) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <div className="text-sm truncate pr-6" style={{ fontWeight: activeChatId === chat.id ? 500 : 400 }}>
                {chat.title}
              </div>
              <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                {formatRelativeTime(chat.updated_at)}
              </div>
            </button>

            {/* Delete button */}
            {hoveredId === chat.id && (
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id) }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center transition-all duration-150"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Settings */}
      <div className="p-3 no-drag" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={onSettings}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm"
          style={{
            background: isSettingsActive ? 'var(--accent-bg)' : 'transparent',
            color: isSettingsActive ? 'var(--accent-light)' : 'var(--text-secondary)',
          }}
          onMouseEnter={e => { if (!isSettingsActive) e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={e => { if (!isSettingsActive) e.currentTarget.style.background = 'transparent' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.1 2.1l1.1 1.1M10.8 10.8l1.1 1.1M11.9 2.1l-1.1 1.1M3.2 10.8l-1.1 1.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          Settings
          <span className="ml-auto text-xs opacity-40">⌘,</span>
        </button>
      </div>
    </div>
  )
}
