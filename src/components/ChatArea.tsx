import React, { useEffect, useRef } from 'react'
import { Message, AttachedFile } from '../types'
import MessageBubble from './MessageBubble'
import InputBar from './InputBar'
import logoUrl from '../assets/logo.png'

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Topbar drag region */}
      <div className="drag-region" style={{ height: 52, flexShrink: 0 }} />

      {/* WebLLM model loading progress */}
      {modelProgress && (
        <div style={{
          flexShrink: 0,
          padding: '8px 20px',
          background: 'rgba(0,0,0,0.03)',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{ maxWidth: '42rem', margin: '0 auto' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 12, color: 'var(--text-muted)', marginBottom: 5,
            }}>
              <span>{modelProgress.text}</span>
              <span>{Math.round(modelProgress.progress * 100)}%</span>
            </div>
            <div style={{
              height: 2, borderRadius: 1,
              background: 'var(--border)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${modelProgress.progress * 100}%`,
                background: 'var(--text-primary)',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isEmpty ? (
          <EmptyState />
        ) : (
          <div style={{ maxWidth: '42rem', margin: '0 auto', padding: '16px 28px 8px' }}>
            {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}

            {isStreaming && (
              <MessageBubble
                message={{ id: 'streaming', chat_id: '', role: 'assistant', content: streamingText, model: '', created_at: Date.now() }}
                isStreaming
                streamingText={streamingText}
              />
            )}

            {streamError && (
              <div style={{
                marginBottom: 20,
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(220,38,38,0.04)',
                border: '1px solid rgba(220,38,38,0.12)',
              }}>
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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: 12,
      userSelect: 'none',
    }}>
      <img
        src={logoUrl}
        alt="Ramanujan"
        style={{ width: 48, height: 48, borderRadius: 12, opacity: 0.15 }}
      />
    </div>
  )
}
