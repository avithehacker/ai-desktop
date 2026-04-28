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
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
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
    <div className="px-4 pb-4 no-drag">
      <div className="flex items-end gap-3 p-3 rounded-2xl"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? 'Thinking…' : 'Message… (⇧↵ for new line)'}
          rows={1}
          disabled={isStreaming}
          className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed"
          style={{ color: 'var(--text-primary)', maxHeight: '200px', overflowY: 'auto' }}
        />
        <button onClick={handleSend} disabled={!canSend}
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
          style={{ background: canSend ? 'var(--accent)' : 'var(--bg-elevated)', color: canSend ? 'white' : 'var(--text-muted)' }}>
          {isStreaming ? (
            <div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 12V2M2 7l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
