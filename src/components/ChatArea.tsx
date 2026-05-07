import React, { useEffect, useRef } from 'react'
import { Message, AttachedFile } from '../types'
import logoUrl from '../assets/logo.png'
import MessageBubble from './MessageBubble'
import InputBar from './InputBar'

interface ChatAreaProps {
  messages: Message[]
  streamingText: string
  isStreaming: boolean
  streamError: string
  modelProgress?: { text: string; progress: number } | null
  configuredProviders: string[]
  onSend: (content: string, files: AttachedFile[]) => void
}

export default function ChatArea({ messages, streamingText, isStreaming, streamError, modelProgress, configuredProviders, onSend }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const isEmpty = messages.length === 0 && !isStreaming

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Drag region */}
      <div className="drag-region" style={{ height: 52, flexShrink: 0 }} />

      {/* WebLLM download progress */}
      {modelProgress && (
        <div style={{ flexShrink: 0, padding: '6px 20px', background: 'rgba(99,102,241,0.08)', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
          <div style={{ maxWidth: '42rem', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              <span>{modelProgress.text}</span>
              <span>{Math.round(modelProgress.progress * 100)}%</span>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(99,102,241,0.2)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${modelProgress.progress * 100}%`, background: 'rgba(99,102,241,0.7)', transition: 'width 0.3s ease' }} />
            </div>
          </div>
        </div>
      )}

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

      <InputBar onSend={onSend} isStreaming={isStreaming} configuredProviders={configuredProviders} />
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ textAlign: 'center' }}>
        <img src={logoUrl} alt="Ramanujan" style={{ width: 56, height: 56, borderRadius: 14, opacity: 0.18, display: 'block', margin: '0 auto' }} />
      </div>
    </div>
  )
}
