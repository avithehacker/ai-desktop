import React, { useState, useRef, useEffect } from 'react'
import { AttachedFile, categoriseFile, getFileWarnings } from '../types'

interface InputBarProps {
  onSend: (content: string, files: AttachedFile[]) => void
  isStreaming: boolean
  configuredProviders: string[]
}

export default function InputBar({ onSend, isStreaming, configuredProviders }: InputBarProps) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState<AttachedFile[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px'
  }, [text])

  useEffect(() => { textareaRef.current?.focus() }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleSend = () => {
    const supported = files.filter(f => f.category !== 'unsupported')
    if (!text.trim() && supported.length === 0) return
    if (isStreaming) return
    onSend(text.trim(), supported)
    setText('')
    setFiles([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || [])
    if (!picked.length) return
    const read = await Promise.all(picked.map(readFile))
    setFiles(prev => [...prev, ...read])
    e.target.value = ''
  }

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx))

  const warnings = getFileWarnings(files, configuredProviders)
  const canSend = (text.trim().length > 0 || files.some(f => f.category !== 'unsupported')) && !isStreaming

  return (
    <div className="no-drag" style={{ padding: '0 24px 20px', maxWidth: '42rem', margin: '0 auto', width: '100%' }}>

      {/* Attached file chips */}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {files.map((f, i) => (
            <div key={i} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              height: 28,
              padding: '0 10px 0 8px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500,
              background: f.category === 'unsupported' ? 'rgba(220,38,38,0.05)' : 'var(--bg-secondary)',
              border: `1px solid ${f.category === 'unsupported' ? 'rgba(220,38,38,0.2)' : 'var(--border)'}`,
              color: f.category === 'unsupported' ? 'var(--red)' : 'var(--text-secondary)',
            }}>
              <span style={{ fontSize: 13, lineHeight: 1 }}>{fileIcon(f.category)}</span>
              <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.name}
              </span>
              <button
                onClick={() => removeFile(i)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 14, height: 14, marginLeft: 2,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'inherit', opacity: 0.5, padding: 0, borderRadius: '50%',
                  fontSize: 14, lineHeight: 1,
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {warnings.map((w, i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          marginBottom: 8,
          padding: '9px 12px',
          borderRadius: 10,
          fontSize: 12,
          lineHeight: 1.5,
          background: 'rgba(202,138,4,0.06)',
          border: '1px solid rgba(202,138,4,0.18)',
          color: 'var(--text-secondary)',
        }}>
          <span style={{ color: 'var(--yellow)', flexShrink: 0, marginTop: 1 }}>⚠</span>
          <span>{w}</span>
        </div>
      ))}

      {/* Input box */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          padding: '10px 10px 10px 14px',
          border: '1px solid var(--border)',
          borderRadius: 14,
          background: 'var(--bg-primary)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onFocusCapture={e => {
          e.currentTarget.style.borderColor = 'var(--text-muted)'
          e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.07)'
        }}
        onBlurCapture={e => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
        }}
      >
        {/* Attach button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
          title="Attach file"
          style={{
            flexShrink: 0,
            width: 30, height: 30,
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            cursor: isStreaming ? 'default' : 'pointer',
            transition: 'all 0.15s',
            opacity: isStreaming ? 0.4 : 1,
          }}
          onMouseEnter={e => {
            if (!isStreaming) {
              e.currentTarget.style.borderColor = 'var(--text-muted)'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.md,.csv,.json,.yaml,.yml,.xml,.html,.css,.js,.ts,.tsx,.jsx,.py,.java,.cpp,.c,.h,.rs,.go,.rb,.sh,.sql,.toml,.env,.ini"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? 'Thinking…' : 'Message…'}
          rows={1}
          disabled={isStreaming}
          style={{
            flex: 1,
            resize: 'none',
            background: 'transparent',
            outline: 'none',
            border: 'none',
            fontSize: 14,
            lineHeight: 1.6,
            color: 'var(--text-primary)',
            maxHeight: 180,
            overflowY: 'auto',
            fontFamily: 'Inter, system-ui, sans-serif',
            padding: 0,
          }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          style={{
            flexShrink: 0,
            width: 30, height: 30,
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: canSend ? 'var(--text-primary)' : 'transparent',
            border: `1px solid ${canSend ? 'transparent' : 'var(--border)'}`,
            color: canSend ? 'var(--bg-primary)' : 'var(--text-muted)',
            cursor: canSend ? 'pointer' : 'default',
            transition: 'all 0.15s',
          }}
        >
          {isStreaming ? (
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              border: '1.5px solid currentColor',
              borderTopColor: 'transparent',
              animation: 'spin 0.7s linear infinite',
            }} />
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

function fileIcon(category: AttachedFile['category']): string {
  switch (category) {
    case 'image': return '🖼'
    case 'pdf':   return '📄'
    case 'text':  return '📝'
    default:      return '⚠'
  }
}

async function readFile(file: File): Promise<AttachedFile> {
  const category = categoriseFile(file.type, file.name)
  if (category === 'image') {
    const dataUrl = await readAs(file, 'dataURL')
    return { name: file.name, mimeType: file.type, dataUrl, text: '', size: file.size, category }
  }
  if (category === 'text' || category === 'pdf') {
    const text = await readAs(file, 'text')
    return { name: file.name, mimeType: file.type, dataUrl: '', text, size: file.size, category }
  }
  return { name: file.name, mimeType: file.type, dataUrl: '', text: '', size: file.size, category }
}

function readAs(file: File, mode: 'text' | 'dataURL'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    if (mode === 'dataURL') reader.readAsDataURL(file)
    else reader.readAsText(file)
  })
}
