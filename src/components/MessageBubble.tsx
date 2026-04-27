import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Message, providerColor, Provider } from '../types'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
  streamingText?: string
}

function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group rounded-xl overflow-hidden my-3" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="text-xs px-2 py-1 rounded transition-all duration-150"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm m-0" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        <code style={{ color: 'var(--text-primary)' }}>{children}</code>
      </pre>
    </div>
  )
}

const markdownComponents = {
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '')
    const lang = match ? match[1] : ''
    if (!inline) {
      return <CodeBlock language={lang}>{String(children).replace(/\n$/, '')}</CodeBlock>
    }
    return (
      <code
        className="font-mono text-sm px-1.5 py-0.5 rounded"
        style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-light)' }}
        {...props}
      >
        {children}
      </code>
    )
  },
  p: ({ children }: any) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }: any) => <ul className="mb-3 pl-4 space-y-1 list-disc">{children}</ul>,
  ol: ({ children }: any) => <ol className="mb-3 pl-4 space-y-1 list-decimal">{children}</ol>,
  li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }: any) => <h1 className="text-xl font-semibold mb-3 mt-4">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-lg font-semibold mb-2 mt-4">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-base font-semibold mb-2 mt-3">{children}</h3>,
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-2 pl-4 my-3 italic" style={{ borderColor: 'var(--accent)', color: 'var(--text-secondary)' }}>
      {children}
    </blockquote>
  ),
  a: ({ href, children }: any) => (
    <a href={href} className="underline" style={{ color: 'var(--accent-light)' }} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
  hr: () => <hr className="my-4" style={{ borderColor: 'var(--border)' }} />,
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>{children}</table>
    </div>
  ),
  th: ({ children }: any) => (
    <th className="px-3 py-2 text-left font-medium" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>{children}</td>
  ),
}

export default function MessageBubble({ message, isStreaming, streamingText }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const content = isStreaming && streamingText !== undefined ? streamingText : message.content

  if (isUser) {
    return (
      <div className="flex justify-end mb-6 animate-slide-up">
        <div
          className="max-w-[70%] px-4 py-3 rounded-2xl rounded-tr-md selectable"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 mb-6 animate-slide-up">
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-lg shrink-0 mt-1 flex items-center justify-center text-xs font-semibold"
        style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
      >
        ✦
      </div>

      <div className="flex-1 min-w-0">
        <div
          className="text-sm leading-relaxed selectable"
          style={{ color: 'var(--text-primary)' }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents as any}
          >
            {content}
          </ReactMarkdown>
          {isStreaming && content !== undefined && (
            <span className="streaming-cursor" />
          )}
        </div>

        {message.model && !isStreaming && (
          <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            {message.model}
          </div>
        )}
      </div>
    </div>
  )
}
