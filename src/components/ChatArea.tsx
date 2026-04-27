import React, { useEffect, useRef } from 'react'
import { Message, ModelOption, Provider } from '../types'
import MessageBubble from './MessageBubble'
import ModelPicker from './ModelPicker'
import InputBar from './InputBar'

interface ChatAreaProps {
  messages: Message[]
  streamingText: string
  isStreaming: boolean
  streamError: string
  selectedModel: string
  selectedProvider: Provider
  availableModels: ModelOption[]
  onSend: (content: string) => void
  onModelSelect: (modelId: string, provider: Provider) => void
}

const EMPTY_SUGGESTIONS = [
  { icon: '✍️', text: 'Help me write a cover letter for a software engineering role' },
  { icon: '🔍', text: 'Explain how transformers work in machine learning' },
  { icon: '🛠️', text: 'Debug this Python code and suggest improvements' },
  { icon: '💡', text: 'Brainstorm creative names for my new product' },
]

export default function ChatArea({
  messages,
  streamingText,
  isStreaming,
  streamError,
  selectedModel,
  selectedProvider,
  availableModels,
  onSend,
  onModelSelect,
}: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div
        className="drag-region flex items-center px-4"
        style={{
          height: 'var(--topbar-height)',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-primary)',
        }}
      >
        <div className="flex-1" />
        <div className="no-drag">
          <ModelPicker
            selectedModel={selectedModel}
            selectedProvider={selectedProvider}
            availableModels={availableModels}
            onSelect={onModelSelect}
          />
        </div>
        <div className="flex-1" />
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty && !isStreaming ? (
          <EmptyState onSend={onSend} model={selectedModel} />
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-6">
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Streaming message */}
            {isStreaming && (
              <MessageBubble
                message={{
                  id: 'streaming',
                  chat_id: '',
                  role: 'assistant',
                  content: streamingText,
                  model: selectedModel,
                  created_at: Date.now(),
                }}
                isStreaming={true}
                streamingText={streamingText}
              />
            )}

            {streamError && (
              <div
                className="flex items-start gap-3 mb-6 p-4 rounded-xl"
                style={{ background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.2)' }}
              >
                <span className="text-lg">⚠️</span>
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--red)' }}>
                    Something went wrong
                  </div>
                  <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {streamError}
                  </div>
                  {streamError.includes('API key') && (
                    <button
                      className="text-xs mt-2 underline"
                      style={{ color: 'var(--accent-light)' }}
                      onClick={() => {/* navigate to settings */}}
                    >
                      Configure API keys in Settings →
                    </button>
                  )}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <InputBar
        onSend={onSend}
        isStreaming={isStreaming}
        selectedModel={selectedModel}
        selectedProvider={selectedProvider}
      />
    </div>
  )
}

function EmptyState({ onSend, model }: { onSend: (text: string) => void; model: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 pb-8">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <div
            className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-xl"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            ✦
          </div>
          <h2 className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
            Chat with {model.split(':')[0]}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {EMPTY_SUGGESTIONS.map(s => (
            <button
              key={s.text}
              onClick={() => onSend(s.text)}
              className="text-left p-3 rounded-xl text-sm transition-all duration-150"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--bg-elevated)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--bg-secondary)'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
            >
              <div className="text-base mb-1">{s.icon}</div>
              <div className="leading-snug">{s.text}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
