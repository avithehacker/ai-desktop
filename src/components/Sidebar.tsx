import React, { useState } from 'react'
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

  return (
    <div className="flex flex-col shrink-0 no-drag" style={{ width: 220, borderRight: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>

      {/* Header: logo + wordmark + new chat */}
      <div className="drag-region" style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 6, padding: '0 16px 10px' }}>
        <img src={logoUrl} alt="" style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0 }} />
        <span className="no-drag select-none" style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 400, letterSpacing: '0.08em', color: 'var(--text-primary)', lineHeight: 1 }}>
          Ramanujan
        </span>
        <button
          onClick={onNewChat}
          className="no-drag"
          title="New chat (⌘N)"
          style={{ width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2" style={{ paddingTop: 4 }}>
        {chats.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '32px 12px' }}>No chats yet</p>
        )}
        {chats.map(chat => {
          const active = activeChatId === chat.id
          const hovered = hoveredId === chat.id
          return (
            <div key={chat.id} style={{ position: 'relative' }}
              onMouseEnter={() => setHoveredId(chat.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <button
                onClick={() => onSelectChat(chat.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '7px 28px 7px 10px',
                  borderRadius: 8, fontSize: 13, lineHeight: 1.4,
                  background: active ? 'var(--bg-elevated)' : hovered ? 'var(--bg-hover)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: active ? 500 : 400,
                  border: 'none', cursor: 'pointer',
                  display: 'block', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  transition: 'background 0.1s, color 0.1s',
                }}
              >
                {chat.title}
              </button>
              {hovered && (
                <button
                  onClick={e => { e.stopPropagation(); onDeleteChat(chat.id) }}
                  style={{
                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                    width: 20, height: 20, borderRadius: 5, border: 'none', cursor: 'pointer',
                    background: 'transparent', color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--bg-elevated)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer: settings */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={onSettings}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 9,
            padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: isSettingsActive ? 'var(--bg-elevated)' : 'transparent',
            color: isSettingsActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: 13, textAlign: 'left',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = isSettingsActive ? 'var(--bg-elevated)' : 'transparent'; e.currentTarget.style.color = isSettingsActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="7" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M7 1.5V3M7 11v1.5M1.5 7H3M11 7h1.5M3.05 3.05l1.06 1.06M9.89 9.89l1.06 1.06M10.95 3.05L9.89 4.11M4.11 9.89L3.05 10.95" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Settings
          <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.4 }}>⌘,</span>
        </button>
      </div>
    </div>
  )
}
