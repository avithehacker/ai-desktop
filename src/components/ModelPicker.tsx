import React, { useState, useRef, useEffect } from 'react'
import { ModelOption, Provider, providerColor } from '../types'

interface ModelPickerProps {
  selectedModel: string
  selectedProvider: Provider
  availableModels: ModelOption[]
  onSelect: (modelId: string, provider: Provider) => void
  compact?: boolean
}

const PROVIDER_LABELS: Record<string, string> = {
  ollama: 'Local',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
}

export default function ModelPicker({ selectedModel, selectedProvider, availableModels, onSelect, compact }: ModelPickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const currentModel = availableModels.find(m => m.id === selectedModel)

  // Group models by provider
  const groups: Record<string, ModelOption[]> = {}
  for (const m of availableModels) {
    if (!groups[m.provider]) groups[m.provider] = []
    groups[m.provider].push(m)
  }

  return (
    <div ref={ref} className="relative no-drag">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
        style={{
          background: open ? 'var(--bg-elevated)' : 'var(--bg-tertiary)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
        }}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: currentModel?.available ? providerColor(selectedProvider) : 'var(--text-muted)' }}
        />
        <span>{currentModel?.name || selectedModel.split(':')[0]}</span>
        {!compact && (
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
            {currentModel?.isLocal ? 'Local · Free' : PROVIDER_LABELS[selectedProvider] || selectedProvider}
          </span>
        )}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-full mt-1.5 z-50 rounded-xl overflow-hidden py-1.5"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            minWidth: '220px',
            left: compact ? 'auto' : '0',
            right: compact ? '0' : 'auto',
          }}
        >
          {Object.entries(groups).map(([provider, models]) => (
            <div key={provider}>
              <div
                className="px-3 py-1 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                {PROVIDER_LABELS[provider] || provider}
              </div>
              {models.map(model => (
                <button
                  key={model.id}
                  onClick={() => { onSelect(model.id, model.provider as Provider); setOpen(false) }}
                  disabled={!model.available}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-all duration-100 disabled:opacity-40"
                  style={{
                    background: model.id === selectedModel ? 'var(--accent-bg)' : 'transparent',
                    color: model.id === selectedModel ? 'var(--accent-light)' : 'var(--text-primary)',
                  }}
                  onMouseEnter={e => { if (model.id !== selectedModel && model.available) e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = model.id === selectedModel ? 'var(--accent-bg)' : 'transparent' }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: model.available ? providerColor(model.provider) : 'var(--text-muted)' }}
                  />
                  <span className="flex-1">{model.name}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {model.available ? (model.isLocal ? 'Free' : '') : 'Not configured'}
                  </span>
                </button>
              ))}
            </div>
          ))}

          {availableModels.length === 0 && (
            <div className="px-3 py-4 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
              No models available.
              <br />Configure in Settings.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
