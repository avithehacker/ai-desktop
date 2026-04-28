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

const PROVIDER_INFO: Record<string, { name: string; tagline: string; color: string; placeholder: string; keysUrl: string }> = {
  anthropic: { name: 'Claude',  tagline: 'by Anthropic', color: '#c96442', placeholder: 'sk-ant-...', keysUrl: 'https://console.anthropic.com/account/keys' },
  openai:    { name: 'ChatGPT', tagline: 'by OpenAI',    color: '#19c37d', placeholder: 'sk-...',      keysUrl: 'https://platform.openai.com/api-keys' },
}

function StepRow({ step }: { step: StepState }) {
  const icon =
    step.status === 'done'      ? <span style={{ color: 'var(--green)' }}>✓</span>
    : step.status === 'error'   ? <span style={{ color: 'var(--red)' }}>✗</span>
    : step.status === 'running' ? <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>◌</span>
    : <span style={{ color: 'var(--text-muted)' }}>○</span>

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-sm w-4 text-center shrink-0">{icon}</span>
        <span className="text-sm flex-1" style={{ color: step.status === 'waiting' ? 'var(--text-muted)' : step.status === 'error' ? 'var(--red)' : 'var(--text-primary)', fontWeight: step.status === 'running' ? 500 : 400 }}>
          {step.label}
        </span>
        {step.detail && <span className="text-xs" style={{ color: step.status === 'error' ? 'var(--red)' : 'var(--text-muted)' }}>{step.detail}</span>}
      </div>
      {step.status === 'running' && typeof step.percent === 'number' && (
        <div className="pl-7">
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${step.percent}%`, background: 'var(--accent)' }} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [screen, setScreen] = useState<Screen>('setup')
  const [steps, setSteps] = useState<StepState[]>([
    { label: 'Installing Ollama (local AI engine)', status: 'waiting' },
    { label: 'Downloading Gemma 2B (1.6 GB)', status: 'waiting' },
  ])
  const [setupError, setSetupError] = useState(false)
  const [providers, setProviders] = useState<Record<string, { key: string; testing: boolean; tested: boolean; ok: boolean; error: string }>>({
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
      { label: 'Installing Ollama (local AI engine)', status: 'waiting' },
      { label: 'Downloading Gemma 2B (1.6 GB)', status: 'waiting' },
    ])

    // Step 1: Install Ollama
    updateStep(0, { status: 'running', detail: 'Checking...' })
    let ollamaOk = false
    const cleanup0 = window.electronAPI.onInstallProgress((p: any) => {
      if (p.step === 'checking')           updateStep(0, { detail: 'Checking...' })
      if (p.step === 'ollama-found')       updateStep(0, { status: 'done', detail: '' })
      if (p.step === 'downloading-ollama') updateStep(0, { detail: `${p.percent}%`, percent: p.percent })
      if (p.step === 'installing-ollama')  updateStep(0, { detail: 'Installing...' })
      if (p.step === 'starting-ollama')    updateStep(0, { detail: 'Starting...' })
    })
    try {
      await window.electronAPI.installOllama()
      updateStep(0, { status: 'done', detail: '' })
      ollamaOk = true
    } catch (e: any) {
      updateStep(0, { status: 'error', detail: e.message || 'Failed' })
    }
    cleanup0()

    if (!ollamaOk) { setSetupError(true); return }

    // Step 2: Pull Gemma 2B
    updateStep(1, { status: 'running', percent: 0, detail: '0%' })
    let modelOk = false
    const cleanup1 = window.electronAPI.onInstallProgress((p: any) => {
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
    cleanup1()

    if (!modelOk) { setSetupError(true); return }

    // Both done — advance to cloud setup
    setScreen('cloud')
  }

  const handleConnect = (provider: string) => {
    const url = PROVIDER_INFO[provider].keysUrl
    if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url)
    else window.open(url, '_blank')
    setExpanded(provider)
  }

  const handleTest = async (provider: string) => {
    if (!window.electronAPI) return
    const key = providers[provider].key
    if (!key) return
    setProviders(p => ({ ...p, [provider]: { ...p[provider], testing: true } }))
    const result = await window.electronAPI.testApiKey(provider, key)
    setProviders(p => ({ ...p, [provider]: { ...p[provider], testing: false, tested: true, ok: result.ok, error: result.error || '' } }))
    if (result.ok) await window.electronAPI.setKey(provider, key)
  }

  const handleDone = async () => {
    if (window.electronAPI) await window.electronAPI.completeOnboarding()
    onComplete()
  }

  const anyConnected = Object.values(providers).some(p => p.ok)

  return (
    <div className="flex flex-col items-center justify-center w-full h-full" style={{ background: 'var(--bg-primary)' }}>
      <div className="drag-region absolute top-0 left-0 right-0 h-10" />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <div className="w-full max-w-md px-6">
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4"
            style={{ border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', fontWeight: 300, color: 'var(--text-primary)', lineHeight: 1 }}>∑</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 400, letterSpacing: '0.03em', color: 'var(--text-primary)' }}>
            Ramanujan
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>
            {screen === 'setup' ? 'Setting up your local AI…' : 'Connect a cloud AI to continue'}
          </p>
        </div>

        {screen === 'setup' && (
          <div className="space-y-5">
            <div className="rounded-2xl p-5 space-y-5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              {steps.map((step, i) => <StepRow key={i} step={step} />)}
            </div>

            {setupError ? (
              <div className="space-y-3">
                <p className="text-sm text-center" style={{ color: 'var(--red)' }}>
                  Setup failed. Check your internet connection and try again.
                </p>
                <button onClick={runSetup}
                  className="w-full py-3 rounded-xl font-semibold transition-all duration-200 hover:opacity-80 active:scale-[0.98]"
                  style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
                  Retry Setup
                </button>
              </div>
            ) : (
              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                This only runs once. Do not close the app.
              </p>
            )}
          </div>
        )}

        {screen === 'cloud' && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 400, color: 'var(--text-primary)' }}>
                Connect your AI
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>
                For complex tasks. Local handles everything else.
              </p>
            </div>

            <div className="space-y-2">
              {Object.entries(PROVIDER_INFO).map(([provider, info]) => {
                const state = providers[provider]
                const isConnected = state.tested && state.ok
                const isOpen = expanded === provider
                return (
                  <div key={provider} className="rounded-2xl overflow-hidden"
                    style={{ border: `1px solid ${isConnected ? 'var(--green)' : 'var(--border)'}`, background: 'var(--bg-secondary)' }}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ background: `${info.color}18`, color: info.color }}>
                        {info.name[0]}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{info.name}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{info.tagline}</div>
                      </div>
                      {isConnected ? (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'rgba(22,163,74,0.1)', color: 'var(--green)' }}>
                          Connected ✓
                        </span>
                      ) : (
                        <button onClick={() => handleConnect(provider)}
                          className="text-sm font-semibold px-4 py-1.5 rounded-full transition-all duration-150 active:scale-95"
                          style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
                          Connect
                        </button>
                      )}
                    </div>
                    {(isOpen || isConnected) && (
                      <div className="px-4 pb-4 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
                        <p className="text-xs pt-3" style={{ color: 'var(--text-muted)' }}>Paste your API key</p>
                        <div className="flex gap-2">
                          <input
                            autoFocus={isOpen && !isConnected}
                            type="password"
                            placeholder={info.placeholder}
                            value={state.key}
                            onChange={e => setProviders(p => ({ ...p, [provider]: { ...p[provider], key: e.target.value, tested: false } }))}
                            onKeyDown={e => { if (e.key === 'Enter' && state.key) handleTest(provider) }}
                            className="flex-1 px-3 py-2 rounded-lg text-sm font-mono outline-none"
                            style={{
                              background: 'var(--bg-tertiary)',
                              border: `1px solid ${state.tested ? (state.ok ? 'var(--green)' : 'var(--red)') : 'var(--border)'}`,
                              color: 'var(--text-primary)',
                            }}
                          />
                          <button onClick={() => handleTest(provider)} disabled={!state.key || state.testing}
                            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
                            style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
                            {state.testing ? '…' : 'Save'}
                          </button>
                        </div>
                        {state.tested && !state.ok && state.error && (
                          <p className="text-xs" style={{ color: 'var(--red)' }}>{state.error}</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <button onClick={handleDone} disabled={!anyConnected}
              className="w-full py-3 rounded-xl font-semibold transition-all duration-200 hover:opacity-80 active:scale-[0.98] disabled:opacity-40"
              style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
              {anyConnected ? 'Open Ramanujan →' : 'Connect at least one to continue'}
            </button>
          </div>
        )}
      </div>

      <div className="absolute bottom-8 flex gap-2">
        {(['setup', 'cloud'] as Screen[]).map(s => (
          <div key={s} className="w-1.5 h-1.5 rounded-full transition-all duration-300"
            style={{ background: screen === s ? 'var(--accent)' : 'var(--border)' }} />
        ))}
      </div>
    </div>
  )
}
