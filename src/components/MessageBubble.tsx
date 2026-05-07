import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Message } from '../types'

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
    <div style={{ borderRadius: 10, overflow: 'hidden', margin: '12px 0', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
        <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>{language || 'code'}</span>
        <button onClick={handleCopy} style={{ fontSize: 11, color: copied ? 'var(--green)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 4 }}
          onMouseEnter={e => { if (!copied) e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { if (!copied) e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: '14px', overflowX: 'auto', fontSize: 13, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.6 }}>
        <code style={{ color: 'var(--text-primary)' }}>{children}</code>
      </pre>
    </div>
  )
}

const md: any = {
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '')
    if (!inline) return <CodeBlock language={match?.[1] || ''}>{String(children).replace(/\n$/, '')}</CodeBlock>
    return <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.875em', background: 'var(--bg-tertiary)', borderRadius: 4, padding: '1px 5px', color: 'var(--text-primary)' }} {...props}>{children}</code>
  },
  p: ({ children }: any) => <p style={{ margin: '0 0 10px', lineHeight: 1.65 }}>{children}</p>,
  ul: ({ children }: any) => <ul style={{ margin: '0 0 10px', paddingLeft: 20, lineHeight: 1.65 }}>{children}</ul>,
  ol: ({ children }: any) => <ol style={{ margin: '0 0 10px', paddingLeft: 20, lineHeight: 1.65 }}>{children}</ol>,
  li: ({ children }: any) => <li style={{ marginBottom: 3, lineHeight: 1.65 }}>{children}</li>,
  h1: ({ children }: any) => <h1 style={{ fontSize: '1.15em', fontWeight: 600, margin: '16px 0 6px' }}>{children}</h1>,
  h2: ({ children }: any) => <h2 style={{ fontSize: '1.05em', fontWeight: 600, margin: '14px 0 5px' }}>{children}</h2>,
  h3: ({ children }: any) => <h3 style={{ fontSize: '1em', fontWeight: 600, margin: '12px 0 4px' }}>{children}</h3>,
  blockquote: ({ children }: any) => <blockquote style={{ borderLeft: '2px solid var(--border)', paddingLeft: 14, margin: '8px 0', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{children}</blockquote>,
  a: ({ href, children }: any) => <a href={href} style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 2 }} target="_blank" rel="noopener noreferrer">{children}</a>,
  strong: ({ children }: any) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '14px 0' }} />,
  table: ({ children }: any) => <div style={{ overflowX: 'auto', margin: '8px 0' }}><table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>{children}</table></div>,
  th: ({ children }: any) => <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>{children}</th>,
  td: ({ children }: any) => <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--border-subtle)' }}>{children}</td>,
}

export default function MessageBubble({ message, isStreaming, streamingText }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const content = isStreaming && streamingText !== undefined ? streamingText : message.content

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <div
          className="selectable"
          style={{
            maxWidth: '76%',
            padding: '9px 14px',
            borderRadius: '14px 14px 3px 14px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            fontSize: 14,
            lineHeight: 1.6,
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        className="selectable"
        style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary)' }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>
          {content}
        </ReactMarkdown>
        {isStreaming && <span className="streaming-cursor" />}
      </div>
    </div>
  )
}
