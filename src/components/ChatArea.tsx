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

export default function ChatArea({ messages, streamingText, isStreaming, streamError, onSend }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const isEmpty = messages.length === 0 && !isStreaming

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Drag region */}
      <div className="drag-region" style={{ height: 52, flexShrink: 0 }} />

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isEmpty ? (
          <EmptyState />
        ) : (
          <div style={{ maxWidth: '42rem', margin: '0 auto', padding: '8px 28px 8px' }}>
            {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}

            {isStreaming && (
              <MessageBubble
                message={{ id: 'streaming', chat_id: '', role: 'assistant', content: streamingText, model: '', created_at: Date.now() }}
                isStreaming
                streamingText={streamingText}
              />
            )}

            {streamError && (
              <div style={{ marginBottom: 20, padding: '10px 14px', borderRadius: 10, background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)' }}>
                <span style={{ fontSize: 13, color: 'var(--red)' }}>{streamError}</span>
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

function EmptyState() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: '2.2rem', fontWeight: 300, color: 'var(--border)', lineHeight: 1, display: 'block' }}>∑</span>
      </div>
    </div>
  )
}
