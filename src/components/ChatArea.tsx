import React, { useEffect, useRef } from 'react'
import { Message } from '../types'
import MessageBubble from './MessageBubble'
import InputBar from './InputBar'

interface ChatAreaProps {
  messages: Message[]
  streamingText: string
  isStreaming: boolean
  streamError: string
  onSend: (content: string) => void
}

const EMPTY_SUGGESTIONS = [
  { icon: '✍️', text: 'Help me write a cover letter for a software engineering role' },
  { icon: '🔍', text: 'Explain how transformers work in machine learning' },
  { icon: '🛠️', text: 'Debug this Python code and suggest improvements' },
  { icon: '💡', text: 'Brainstorm creative names for my new product' },
]

export default function ChatArea({ messages, streamingText, isStreaming, streamError, onSend }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full">
      {/* Top bar — just a drag region */}
      <div
        className="drag-region shrink-0"
        style={{ height: 'var(--topbar-height)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-primary)' }}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty && !isStreaming ? (
          <EmptyState onSend={onSend} />
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-6">
            {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}

            {isStreaming && (
              <MessageBubble
                message={{ id: 'streaming', chat_id: '', role: 'assistant', content: streamingText, model: '', created_at: Date.now() }}
                isStreaming={true}
                streamingText={streamingText}
              />
            )}

            {streamError && (
              <div className="flex items-start gap-3 mb-6 p-4 rounded-xl"
                style={{ background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.2)' }}>
                <span className="text-lg">⚠️</span>
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--red)' }}>Something went wrong</div>
                  <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{streamError}</div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <InputBar onSend={onSend} isStreaming={isStreaming} />
    </div>
  )
}

function EmptyState({ onSend }: { onSend: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 pb-8">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-3">
          <div className="w-11 h-11 rounded-xl mx-auto flex items-center justify-center"
            style={{ border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '1.4rem', fontWeight: 300, color: 'var(--text-primary)', lineHeight: 1 }}>∑</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '0.01em' }}>
            What can I help with?
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {EMPTY_SUGGESTIONS.map(s => (
            <button key={s.text} onClick={() => onSend(s.text)}
              className="text-left p-3.5 rounded-xl text-sm transition-all duration-150"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
              <div className="text-base mb-1.5">{s.icon}</div>
              <div className="leading-snug font-normal">{s.text}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
