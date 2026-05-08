import React, { useState, useMemo } from 'react'
import { Chat } from '../types'
import logoUrl from '../assets/logo.png'

interface SidebarProps {
  chats: Chat[]
  activeChatId: string | null
  onNewChat: () => void
  onSelectChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => void
  onSettings: () => void
  isSettingsActive: boolean
}

export default function Sidebar({ chats, activeChatId, onNewChat, onSelectChat, onDeleteChat, onSettings, isSettingsActive }: SidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const isMac = useMemo(() => /Mac|iPhone|iPad|iPod/.test(navigator.platform), [])

  return (
    <div className="flex flex-col shrink-0 no-drag" style={{
      width: 232,
      borderRight: '1px solid var(--border-subtle)',
      background: 'var(--bg-secondary)',
    }}>

      {/* Header — logo left, new chat right */}
      <div
        className="drag-region"
        style={{
          height: 52,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
        }}
      >
        <div className="no-drag" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={logoUrl} alt="" style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0 }} />
          <span
            className="select-none"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1rem',
              fontWeight: 400,
              letterSpacing: '0.06em',
              color: 'var(--text-primary)',
              lineHeight: 1,
            }}
          >
            Ramanujan
          </span>
        </div>

        <button
          onClick={onNewChat}
          className="no-drag"
          title={isMac ? 'New chat (⌘N)' : 'New chat (Ctrl+N)'}
          style={{
            width: 26, height: 26, borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            flexShrink: 0,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-muted)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '4px 8px' }}>
        {chats.length === 0 && (
          <p style={{
            fontSize: 12, color: 'var(--text-muted)',
            textAlign: 'center', padding: '40px 12px',
            lineHeight: 1.6,
          }}>
            Start a new chat
          </p>
        )}
        {chats.map(chat => {
          const active = activeChatId === chat.id
          const hovered = hoveredId === chat.id
          return (
            <div
              key={chat.id}
              style={{ position: 'relative', marginBottom: 1 }}
              onMouseEnter={() => setHoveredId(chat.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <button
                onClick={() => onSelectChat(chat.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 32px 7px 10px',
                  borderRadius: 8,
                  fontSize: 13,
                  lineHeight: 1.4,
                  background: active ? 'var(--bg-elevated)' : hovered ? 'var(--bg-hover)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: active ? 500 : 400,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'block',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  transition: 'background 0.1s, color 0.1s',
                }}
              >
                {chat.title}
              </button>

              {hovered && (
                <button
                  onClick={e => { e.stopPropagation(); onDeleteChat(chat.id) }}
                  style={{
                    position: 'absolute', right: 6, top: '50%',
                    transform: 'translateY(-50%)',
                    width: 20, height: 20, borderRadius: 5,
                    border: 'none', cursor: 'pointer',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--bg-tertiary)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
                >
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path d="M1 1l7 7M8 1L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer — settings */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={onSettings}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 10px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            background: isSettingsActive ? 'var(--bg-elevated)' : 'transparent',
            color: isSettingsActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: 13,
            textAlign: 'left',
            transition: 'all 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => {
            e.currentTarget.style.background = isSettingsActive ? 'var(--bg-elevated)' : 'transparent'
            e.currentTarget.style.color = isSettingsActive ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="7" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M7 1.5V3M7 11v1.5M1.5 7H3M11 7h1.5M3.05 3.05l1.06 1.06M9.89 9.89l1.06 1.06M10.95 3.05L9.89 4.11M4.11 9.89L3.05 10.95" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <span>Settings</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', opacity: 0.7 }}>{isMac ? '⌘,' : 'Ctrl+,'}</span>
        </button>
      </div>
    </div>
  )
}
