import React, { useState, useRef, useEffect } from 'react'

interface InputBarProps {
  onSend: (content: string) => void
  isStreaming: boolean
}

export default function InputBar({ onSend, isStreaming }: InputBarProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px'
  }, [text])

  useEffect(() => { textareaRef.current?.focus() }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = () => {
    if (!text.trim() || isStreaming) return
    onSend(text.trim())
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const canSend = text.trim().length > 0 && !isStreaming

  return (
    <div className="no-drag" style={{ padding: '0 28px 20px', maxWidth: '42rem', margin: '0 auto', width: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 10,
        border: '1px solid var(--border)',
        borderRadius: 14, padding: '10px 10px 10px 16px',
        background: 'var(--bg-primary)',
        boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
        onFocusCapture={e => { const el = e.currentTarget; el.style.borderColor = 'var(--text-muted)'; el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)' }}
        onBlurCapture={e => { const el = e.currentTarget; el.style.borderColor = 'var(--border)'; el.style.boxShadow = '0 1px 6px rgba(0,0,0,0.05)' }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? 'Thinking…' : 'Message…'}
          rows={1}
          disabled={isStreaming}
          style={{
            flex: 1, resize: 'none', background: 'transparent', outline: 'none',
            border: 'none', fontSize: 14, lineHeight: 1.6,
            color: 'var(--text-primary)', maxHeight: 180, overflowY: 'auto',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          style={{
            flexShrink: 0, width: 30, height: 30, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: canSend ? 'var(--text-primary)' : 'transparent',
            border: `1px solid ${canSend ? 'transparent' : 'var(--border)'}`,
            color: canSend ? 'var(--bg-primary)' : 'var(--text-muted)',
            cursor: canSend ? 'pointer' : 'default',
            transition: 'all 0.15s',
          }}
        >
          {isStreaming ? (
            <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid currentColor', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
          ) : (
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 11V2M2 6.5l4.5-4.5 4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
