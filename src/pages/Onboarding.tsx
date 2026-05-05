import React, { useState, useEffect } from 'react'

interface OnboardingProps {
  onComplete: () => void
}

type Screen = 'setup' | 'cloud'

interface StepState {
  label: string
  status: 'waiting' | 'running' | 'done' | 'error'
  detail?: string
  percent?: number
}

interface ProviderState {
  key: string
  testing: boolean
  tested: boolean
  ok: boolean
  error: string
}

// ── Brand icons ───────────────────────────────────────────────────────────────

function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

// ── Step row (setup screen) ───────────────────────────────────────────────────

function StepRow({ step, index, isLast }: { step: StepState; index: number; isLast: boolean }) {
  const done    = step.status === 'done'
  const running = step.status === 'running'
  const error   = step.status === 'error'
  const waiting = step.status === 'waiting'

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* Left: circle + connector */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: done ? '#16a34a' : error ? '#dc2626' : running ? '#1a1a1a' : 'transparent',
          border: `2px solid ${done ? '#16a34a' : error ? '#dc2626' : running ? '#1a1a1a' : '#e8e8e8'}`,
          transition: 'all 0.35s ease',
        }}>
          {done    && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          {error   && <span style={{ color: '#fff', fontSize: 13, lineHeight: 1 }}>✕</span>}
          {running && <span style={{ color: '#fff', fontSize: 12, display: 'inline-block', animation: 'spin 1s linear infinite' }}>◌</span>}
          {waiting && <span style={{ color: '#bbb', fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>{index + 1}</span>}
        </div>
        {!isLast && (
          <div style={{ width: 2, flex: 1, minHeight: 16, background: done ? '#16a34a33' : '#e8e8e8', borderRadius: 1, marginTop: 4, transition: 'background 0.35s ease' }} />
        )}
      </div>

      {/* Right: text */}
      <div style={{ paddingTop: 6, paddingBottom: isLast ? 0 : 20, flex: 1 }}>
        <div style={{
          fontSize: 14,
          fontWeight: running ? 500 : 400,
          color: waiting ? '#aaa' : error ? '#dc2626' : '#1a1a1a',
          lineHeight: 1.4,
          transition: 'color 0.2s',
        }}>
          {step.label}
        </div>
        {step.detail && (
          <div style={{ fontSize: 12, color: error ? '#dc2626' : '#999', marginTop: 3 }}>{step.detail}</div>
        )}
        {running && typeof step.percent === 'number' && (
          <div style={{ marginTop: 10, height: 3, borderRadius: 99, background: '#f0f0f0', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, background: '#1a1a1a', width: `${step.percent}%`, transition: 'width 0.5s ease' }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Provider card (cloud screen) ──────────────────────────────────────────────

const FREE_PROVIDERS = {
  github: {
    name: 'GitHub Models',
    model: 'GPT-4o mini',
    badge: 'Free',
    badgeSub: 'with any GitHub account',
    steps: ['Go to GitHub → Settings → Developer settings → Tokens', 'Click "Generate new token (classic)"', 'No scopes needed — scroll down and click Generate', 'Copy and paste below'],
    placeholder: 'github_pat_...',
    keysUrl: 'https://github.com/settings/tokens/new?description=Ramanujan+AI&scopes=',
    testProvider: 'github',
    iconBg: '#24292e',
    icon: <GitHubIcon />,
  },
  google: {
    name: 'Gemini',
    model: 'Flash 2.0 · 15 req/min',
    badge: 'Free tier',
    badgeSub: 'Google account required',
    steps: ['Go to Google AI Studio (aistudio.google.com)', 'Click "Get API key" → Create API key', 'Copy and paste below'],
    placeholder: 'AIza...',
    keysUrl: 'https://aistudio.google.com/app/apikey',
    testProvider: 'google',
    iconBg: '#ffffff',
    icon: <GoogleIcon />,
  },
}

const PAID_PROVIDERS = {
  anthropic: {
    name: 'Claude',
    model: 'Haiku · best for reasoning',
    badge: 'Paid',
    badgeSub: 'console.anthropic.com',
    steps: ['Go to console.anthropic.com/account/keys', 'Create an API key', 'Copy and paste below'],
    placeholder: 'sk-ant-...',
    keysUrl: 'https://console.anthropic.com/account/keys',
    testProvider: 'anthropic',
    iconBg: '#c96442',
    icon: <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>A</span>,
  },
  openai: {
    name: 'ChatGPT',
    model: 'GPT-4o mini · general purpose',
    badge: 'Paid',
    badgeSub: 'platform.openai.com',
    steps: ['Go to platform.openai.com/api-keys', 'Create an API key', 'Copy and paste below'],
    placeholder: 'sk-...',
    keysUrl: 'https://platform.openai.com/api-keys',
    testProvider: 'openai',
    iconBg: '#19c37d',
    icon: <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>G</span>,
  },
}

const PROVIDERS = { ...FREE_PROVIDERS, ...PAID_PROVIDERS }

interface CardProps {
  id: string
  state: ProviderState
  expanded: boolean
  onGetKey: () => void
  onKeyChange: (v: string) => void
  onSave: () => void
}

function ProviderCard({ id, state, expanded, onGetKey, onKeyChange, onSave }: CardProps) {
  const p = PROVIDERS[id as keyof typeof PROVIDERS]
  const connected = state.tested && state.ok

  return (
    <div style={{
      borderRadius: 10,
      border: `1px solid ${connected ? '#16a34a' : expanded ? '#1a1a1a' : '#e8e8e8'}`,
      background: '#fff',
      overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}>
      {/* Single compact row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px' }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: p.iconBg,
          border: id === 'google' ? '1px solid #e8e8e8' : 'none',
          color: id === 'github' ? '#fff' : undefined,
          fontSize: 12,
        }}>
          {p.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{p.name}</span>
          <span style={{ fontSize: 12, color: '#bbb', marginLeft: 6 }}>{p.model}</span>
        </div>

        {connected ? (
          <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', flexShrink: 0 }}>✓ Connected</span>
        ) : (
          <>
            <span style={{ fontSize: 11, fontWeight: 600, color: p.badge === 'Paid' ? '#bbb' : '#16a34a', flexShrink: 0 }}>{p.badge}</span>
            <button onClick={onGetKey} style={{
              fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6, flexShrink: 0,
              background: expanded ? '#1a1a1a' : '#f4f4f4',
              color: expanded ? '#fff' : '#444',
              border: '1px solid #e0e0e0', cursor: 'pointer', transition: 'all 0.15s',
            }}
              onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = '#eaeaea' }}
              onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = '#f4f4f4' }}
            >
              {expanded ? 'Opening…' : 'Connect'}
            </button>
          </>
        )}
      </div>

      {/* Expanded input */}
      {expanded && !connected && (
        <div style={{ borderTop: '1px solid #f0f0f0', padding: '10px 12px', background: '#fafafa' }}>
          <p style={{ fontSize: 11, color: '#999', margin: '0 0 8px', lineHeight: 1.5 }}>
            {p.steps[p.steps.length - 2]} · {p.steps[p.steps.length - 1]}
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            <input autoFocus type="password" placeholder={p.placeholder} value={state.key}
              onChange={e => onKeyChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && state.key.trim()) onSave() }}
              style={{
                flex: 1, padding: '7px 10px', borderRadius: 6, fontSize: 12,
                fontFamily: 'JetBrains Mono, monospace',
                background: '#fff',
                border: `1px solid ${state.tested ? (state.ok ? '#16a34a' : '#dc2626') : '#e0e0e0'}`,
                color: '#1a1a1a', outline: 'none',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#1a1a1a' }}
              onBlur={e => { if (!state.tested) e.currentTarget.style.borderColor = '#e0e0e0' }}
            />
            <button onClick={onSave} disabled={!state.key.trim() || state.testing}
              style={{
                padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: '#1a1a1a', color: '#fff', border: 'none',
                cursor: state.key.trim() && !state.testing ? 'pointer' : 'default',
                opacity: !state.key.trim() || state.testing ? 0.35 : 1,
              }}
            >
              {state.testing ? '…' : 'Save'}
            </button>
          </div>
          {state.tested && !state.ok && state.error && (
            <p style={{ fontSize: 11, color: '#dc2626', margin: '6px 0 0' }}>{state.error}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [screen, setScreen] = useState<Screen>('setup')
  const [steps, setSteps] = useState<StepState[]>([
    { label: 'Install Ollama  ·  local AI runtime', status: 'waiting' },
    { label: 'Download Llama 3.2 1B  ·  780 MB', status: 'waiting' },
  ])
  const [setupError, setSetupError] = useState(false)
  const [providers, setProviders] = useState<Record<string, ProviderState>>({
    github:    { key: '', testing: false, tested: false, ok: false, error: '' },
    google:    { key: '', testing: false, tested: false, ok: false, error: '' },
    anthropic: { key: '', testing: false, tested: false, ok: false, error: '' },
    openai:    { key: '', testing: false, tested: false, ok: false, error: '' },
  })
  const [expanded, setExpanded] = useState<string | null>(null)

  const updateStep = (i: number, patch: Partial<StepState>) =>
    setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s))

  useEffect(() => { runSetup() }, [])

  const runSetup = async () => {
    if (!window.electronAPI) { setScreen('cloud'); return }
    setSetupError(false)
    setSteps([
      { label: 'Install Ollama  ·  local AI runtime', status: 'waiting' },
      { label: 'Download Llama 3.2 1B  ·  780 MB', status: 'waiting' },
    ])

    updateStep(0, { status: 'running', detail: 'Checking…' })
    let ollamaOk = false
    const c0 = window.electronAPI.onInstallProgress((p: any) => {
      if (p.step === 'checking')           updateStep(0, { detail: 'Checking…' })
      if (p.step === 'ollama-found')       updateStep(0, { status: 'done', detail: '' })
      if (p.step === 'downloading-ollama') updateStep(0, { detail: `${p.percent}%`, percent: p.percent })
      if (p.step === 'installing-ollama')  updateStep(0, { detail: 'Installing…' })
      if (p.step === 'starting-ollama')    updateStep(0, { detail: 'Starting…' })
    })
    try {
      await window.electronAPI.installOllama()
      updateStep(0, { status: 'done', detail: '' })
      ollamaOk = true
    } catch (e: any) {
      updateStep(0, { status: 'error', detail: e.message || 'Failed' })
    }
    c0()
    if (!ollamaOk) { setSetupError(true); return }

    updateStep(1, { status: 'running', percent: 0, detail: '0%' })
    let modelOk = false
    const c1 = window.electronAPI.onInstallProgress((p: any) => {
      if (p.step === 'pulling-model') updateStep(1, { percent: p.percent, detail: `${p.percent}%` })
      if (p.step === 'model-ready')   updateStep(1, { status: 'done', detail: '' })
    })
    try {
      await window.electronAPI.pullDefaultModel()
      updateStep(1, { status: 'done', detail: '' })
      modelOk = true
    } catch (e: any) {
      updateStep(1, { status: 'error', detail: e.message || 'Failed' })
    }
    c1()
    if (!modelOk) { setSetupError(true); return }
    setScreen('cloud')
  }

  const handleGetKey = (id: string) => {
    const url = PROVIDERS[id as keyof typeof PROVIDERS].keysUrl
    if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url)
    else window.open(url, '_blank')
    setExpanded(id)
  }

  const handleSave = async (id: string) => {
    if (!window.electronAPI) return
    const key = providers[id].key.trim()
    if (!key) return
    setProviders(p => ({ ...p, [id]: { ...p[id], testing: true } }))
    const testProvider = PROVIDERS[id as keyof typeof PROVIDERS].testProvider
    const result = await window.electronAPI.testApiKey(testProvider, key)
    setProviders(p => ({ ...p, [id]: { ...p[id], testing: false, tested: true, ok: result.ok, error: result.error || '' } }))
    if (result.ok) {
      await window.electronAPI.setKey(testProvider, key)
      setExpanded(null)
    }
  }

  const finish = async () => {
    if (window.electronAPI) await window.electronAPI.completeOnboarding()
    onComplete()
  }

  const anyConnected = Object.values(providers).some(p => p.ok)

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', position: 'relative', overflowY: 'auto' }}>
      <div className="drag-region" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 44 }} />
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ width: '100%', maxWidth: 400, padding: '32px 24px', animation: 'fadeUp 0.4s ease' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, margin: '0 auto 10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#f7f7f7', border: '1px solid #e8e8e8',
          }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '1.5rem', fontWeight: 300, color: '#1a1a1a', lineHeight: 1, userSelect: 'none' }}>∑</span>
          </div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.6rem', fontWeight: 400, letterSpacing: '0.05em', color: '#1a1a1a', margin: '0 0 4px' }}>
            Ramanujan
          </h1>
          <p style={{ fontSize: 12, color: '#999', margin: 0, fontWeight: 300 }}>
            {screen === 'setup' ? 'Setting up your local AI engine' : 'Add a cloud model for harder tasks'}
          </p>
        </div>

        {/* ── Setup screen ── */}
        {screen === 'setup' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 16, padding: '24px 24px 8px' }}>
              {steps.map((step, i) => (
                <StepRow key={i} step={step} index={i} isLast={i === steps.length - 1} />
              ))}
            </div>

            {setupError ? (
              <div style={{ marginTop: 16, padding: '16px', borderRadius: 12, background: '#fff5f5', border: '1px solid #fecaca', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#dc2626', margin: '0 0 12px' }}>
                  Setup failed. Check your connection and try again.
                </p>
                <button onClick={runSetup} style={{ padding: '9px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#1a1a1a', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  Retry
                </button>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: '#bbb', textAlign: 'center', marginTop: 16 }}>
                Runs once · Do not close the app
              </p>
            )}
          </div>
        )}

        {/* ── Cloud screen ── */}
        {screen === 'cloud' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            {/* Free providers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {Object.keys(FREE_PROVIDERS).map(id => (
                <ProviderCard key={id} id={id} state={providers[id]} expanded={expanded === id}
                  onGetKey={() => handleGetKey(id)}
                  onKeyChange={v => setProviders(p => ({ ...p, [id]: { ...p[id], key: v, tested: false } }))}
                  onSave={() => handleSave(id)} />
              ))}
            </div>

            {/* Paid providers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#e8e8e8' }} />
              <span style={{ fontSize: 11, color: '#bbb', fontWeight: 500, letterSpacing: '0.06em' }}>OR CONNECT A PAID API</span>
              <div style={{ flex: 1, height: 1, background: '#e8e8e8' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {Object.keys(PAID_PROVIDERS).map(id => (
                <ProviderCard key={id} id={id} state={providers[id]} expanded={expanded === id}
                  onGetKey={() => handleGetKey(id)}
                  onKeyChange={v => setProviders(p => ({ ...p, [id]: { ...p[id], key: v, tested: false } }))}
                  onSave={() => handleSave(id)} />
              ))}
            </div>

            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button
                onClick={finish}
                disabled={!anyConnected}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 600,
                  background: anyConnected ? '#1a1a1a' : '#f0f0f0',
                  color: anyConnected ? '#fff' : '#bbb',
                  border: 'none',
                  cursor: anyConnected ? 'pointer' : 'default',
                  transition: 'all 0.25s ease',
                  letterSpacing: '0.01em',
                }}
              >
                {anyConnected ? 'Open Ramanujan →' : 'Connect one to continue'}
              </button>

              <button
                onClick={finish}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, color: '#bbb', padding: '8px 0',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#888' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#bbb' }}
              >
                Skip for now · use local model only
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Progress dots */}
      <div style={{ position: 'fixed', bottom: 24, display: 'flex', gap: 6, alignItems: 'center' }}>
        {(['setup', 'cloud'] as Screen[]).map(s => (
          <div key={s} style={{
            borderRadius: '50%',
            width: screen === s ? 20 : 6,
            height: 6,
            background: screen === s ? '#1a1a1a' : '#e0e0e0',
            transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }} />
        ))}
      </div>
    </div>
  )
}
