import React, { useState, useEffect, useRef } from 'react'
import { PullProgress, CLOUD_MODELS } from '../types'

interface OnboardingProps {
  onComplete: () => void
}

type Screen = 'welcome' | 'local' | 'cloud'

interface ProviderState {
  key: string
  testing: boolean
  tested: boolean
  ok: boolean
  error: string
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [screen, setScreen] = useState<Screen>('welcome')
  const [pullProgress, setPullProgress] = useState<PullProgress | null>(null)
  const [pullDone, setPullDone] = useState(false)
  const [pullError, setPullError] = useState('')
  const [isPulling, setIsPulling] = useState(false)
  const [ollamaInstalled, setOllamaInstalled] = useState<boolean | null>(null)

  const [providers, setProviders] = useState<Record<string, ProviderState>>({
    anthropic: { key: '', testing: false, tested: false, ok: false, error: '' },
    openai: { key: '', testing: false, tested: false, ok: false, error: '' },
    google: { key: '', testing: false, tested: false, ok: false, error: '' },
  })

  useEffect(() => {
    if (screen === 'local' && window.electronAPI) {
      window.electronAPI.ollamaStatus().then(s => setOllamaInstalled(s.installed))
    }
  }, [screen])

  useEffect(() => {
    if (!window.electronAPI) return
    const cleanup = window.electronAPI.onOllamaPullProgress((progress) => {
      setPullProgress(progress)
      if (progress.status === 'success' || progress.status?.includes('manifest')) {
        // Pulling done
      }
    })
    return cleanup
  }, [])

  const handleDownloadModel = async () => {
    if (!window.electronAPI) return
    setIsPulling(true)
    setPullError('')
    try {
      await window.electronAPI.ollamaPullModel('phi3:mini')
      setPullDone(true)
    } catch (e: any) {
      setPullError(e.message || 'Download failed')
    } finally {
      setIsPulling(false)
    }
  }

  const handleTestKey = async (provider: string) => {
    if (!window.electronAPI) return
    const key = providers[provider].key
    if (!key) return
    setProviders(p => ({ ...p, [provider]: { ...p[provider], testing: true, tested: false } }))
    const result = await window.electronAPI.testApiKey(provider, key)
    setProviders(p => ({
      ...p,
      [provider]: { ...p[provider], testing: false, tested: true, ok: result.ok, error: result.error || '' },
    }))
    if (result.ok) {
      await window.electronAPI.setKey(provider, key)
    }
  }

  const handleDone = async () => {
    if (window.electronAPI) {
      // Save any keys that have been entered but not tested
      for (const [provider, state] of Object.entries(providers)) {
        if (state.key && state.ok) {
          await window.electronAPI.setKey(provider, state.key)
        }
      }
      await window.electronAPI.completeOnboarding()
    }
    onComplete()
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full" style={{ background: 'var(--bg-primary)' }}>
      {/* Traffic light spacer */}
      <div className="drag-region absolute top-0 left-0 right-0 h-10" />

      <div className="w-full max-w-md px-6 animate-fade-in">
        {screen === 'welcome' && <WelcomeScreen onNext={() => setScreen('local')} />}
        {screen === 'local' && (
          <LocalModelScreen
            ollamaInstalled={ollamaInstalled}
            isPulling={isPulling}
            pullDone={pullDone}
            pullError={pullError}
            pullProgress={pullProgress}
            onDownload={handleDownloadModel}
            onSkip={() => setScreen('cloud')}
            onNext={() => setScreen('cloud')}
          />
        )}
        {screen === 'cloud' && (
          <CloudScreen
            providers={providers}
            onChange={(provider, key) => setProviders(p => ({
              ...p, [provider]: { ...p[provider], key, tested: false }
            }))}
            onTest={handleTestKey}
            onDone={handleDone}
          />
        )}
      </div>

      {/* Step indicators */}
      <div className="absolute bottom-8 flex gap-2">
        {(['welcome', 'local', 'cloud'] as Screen[]).map(s => (
          <div
            key={s}
            className="w-1.5 h-1.5 rounded-full transition-all duration-300"
            style={{ background: screen === s ? 'var(--accent)' : 'var(--border)' }}
          />
        ))}
      </div>
    </div>
  )
}

function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-10">
      <div className="space-y-5">
        {/* Logo mark */}
        <div
          className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
          style={{ border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}
        >
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1 }}>R</span>
        </div>

        <div className="space-y-2">
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', fontWeight: 400, letterSpacing: '0.03em', color: 'var(--text-primary)', lineHeight: 1.15 }}>
            Ramanujan
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>
            One AI. Every model. Local and online.
          </p>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 rounded-xl font-medium transition-all duration-200 hover:opacity-80 active:scale-[0.98]"
        style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', fontSize: '0.9rem' }}
      >
        Get started
      </button>
    </div>
  )
}

function LocalModelScreen({
  ollamaInstalled,
  isPulling,
  pullDone,
  pullError,
  pullProgress,
  onDownload,
  onSkip,
  onNext,
}: {
  ollamaInstalled: boolean | null
  isPulling: boolean
  pullDone: boolean
  pullError: string
  pullProgress: PullProgress | null
  onDownload: () => void
  onSkip: () => void
  onNext: () => void
}) {
  const percent = pullProgress?.percent || 0

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 400, letterSpacing: '0.02em', color: 'var(--text-primary)' }}>Download a local model</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>
          Runs on your Mac. Private. No API key needed.
        </p>
      </div>

      {/* Model card */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="font-medium">Phi-3 Mini 3.8B</div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              2.2 GB · Microsoft · Fast &amp; capable
            </div>
          </div>
          <span
            className="text-xs px-2 py-1 rounded-full"
            style={{ background: 'var(--accent-bg)', color: 'var(--accent-light)' }}
          >
            Recommended
          </span>
        </div>

        {/* Progress bar */}
        {(isPulling || pullDone) && (
          <div className="space-y-1.5">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: pullDone ? '100%' : `${percent}%`,
                  background: pullDone ? 'var(--green)' : 'var(--accent)',
                }}
              />
            </div>
            <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>{pullDone ? '✓ Ready' : pullProgress?.status || 'Downloading...'}</span>
              {!pullDone && <span>{percent}%</span>}
            </div>
          </div>
        )}

        {pullError && (
          <div className="text-sm" style={{ color: 'var(--red)' }}>
            {pullError}
          </div>
        )}
      </div>

      {ollamaInstalled === false && (
        <div
          className="text-sm p-3 rounded-lg"
          style={{ background: 'rgba(255,213,10,0.08)', border: '1px solid rgba(255,213,10,0.2)', color: '#ffd60a' }}
        >
          Ollama will be installed automatically when you download.
        </div>
      )}

      <div className="space-y-3">
        {!pullDone ? (
          <button
            onClick={onDownload}
            disabled={isPulling}
            className="w-full py-3 rounded-xl font-medium text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {isPulling ? 'Downloading...' : 'Download and set up'}
          </button>
        ) : (
          <button
            onClick={onNext}
            className="w-full py-3 rounded-xl font-medium text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'var(--green)' }}
          >
            ✓ Continue
          </button>
        )}
        {!pullDone && (
          <button
            onClick={onSkip}
            className="w-full py-3 rounded-xl font-medium transition-all duration-200"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  )
}

const PROVIDER_INFO: Record<string, {
  name: string
  tagline: string
  icon: string
  color: string
  placeholder: string
  keysUrl: string
}> = {
  anthropic: {
    name: 'Claude',
    tagline: 'by Anthropic',
    icon: '◆',
    color: '#c96442',
    placeholder: 'sk-ant-...',
    keysUrl: 'https://console.anthropic.com/account/keys',
  },
  openai: {
    name: 'ChatGPT',
    tagline: 'by OpenAI',
    icon: '◉',
    color: '#19c37d',
    placeholder: 'sk-...',
    keysUrl: 'https://platform.openai.com/api-keys',
  },
  google: {
    name: 'Gemini',
    tagline: 'by Google',
    icon: '✦',
    color: '#4285f4',
    placeholder: 'AIza...',
    keysUrl: 'https://aistudio.google.com/app/apikey',
  },
}

function CloudScreen({
  providers,
  onChange,
  onTest,
  onDone,
}: {
  providers: Record<string, { key: string; testing: boolean; tested: boolean; ok: boolean; error: string }>
  onChange: (provider: string, key: string) => void
  onTest: (provider: string) => void
  onDone: () => void
}) {
  const [expanded, setExpanded] = React.useState<string | null>(null)

  const handleConnect = (provider: string, keysUrl: string) => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(keysUrl)
    } else {
      window.open(keysUrl, '_blank')
    }
    setExpanded(provider)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 400, letterSpacing: '0.02em', color: 'var(--text-primary)' }}>Connect your AI</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>
          Connect one or more. You can always add more later in settings.
        </p>
      </div>

      <div className="space-y-2.5">
        {Object.entries(PROVIDER_INFO).map(([provider, info]) => {
          const state = providers[provider]
          const isConnected = state.tested && state.ok
          const isOpen = expanded === provider

          return (
            <div
              key={provider}
              className="rounded-2xl overflow-hidden transition-all duration-200"
              style={{ border: `1px solid ${isConnected ? 'var(--green)' : 'var(--border)'}`, background: 'var(--bg-secondary)' }}
            >
              {/* Provider row */}
              <div className="flex items-center gap-3.5 px-4 py-3.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold shrink-0"
                  style={{ background: `${info.color}18`, color: info.color }}
                >
                  {info.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{info.name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{info.tagline}</div>
                </div>

                {isConnected ? (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'rgba(22,163,74,0.1)', color: 'var(--green)' }}>
                    Connected ✓
                  </span>
                ) : (
                  <button
                    onClick={() => handleConnect(provider, info.keysUrl)}
                    className="text-sm font-semibold px-4 py-1.5 rounded-full transition-all duration-150 active:scale-95"
                    style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}
                  >
                    Connect
                  </button>
                )}
              </div>

              {/* Paste key area — shown after Connect clicked */}
              {(isOpen || isConnected) && (
                <div className="px-4 pb-4 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
                  <p className="text-xs pt-3" style={{ color: 'var(--text-muted)' }}>
                    Paste your API key from the page that just opened
                  </p>
                  <div className="flex gap-2">
                    <input
                      autoFocus={isOpen && !isConnected}
                      type="password"
                      placeholder={info.placeholder}
                      value={state.key}
                      onChange={e => onChange(provider, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && state.key) onTest(provider) }}
                      className="flex-1 px-3 py-2 rounded-lg text-sm font-mono outline-none"
                      style={{
                        background: 'var(--bg-tertiary)',
                        border: `1px solid ${state.tested ? (state.ok ? 'var(--green)' : 'var(--red)') : 'var(--border)'}`,
                        color: 'var(--text-primary)',
                      }}
                    />
                    <button
                      onClick={() => onTest(provider)}
                      disabled={!state.key || state.testing}
                      className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 disabled:opacity-40"
                      style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}
                    >
                      {state.testing ? '...' : 'Save'}
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

      <button
        onClick={onDone}
        className="w-full py-3 rounded-xl font-semibold transition-all duration-200 hover:opacity-80 active:scale-[0.98]"
        style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}
      >
        {Object.values(providers).some(p => p.ok) ? 'Open Ramanujan →' : 'Skip for now →'}
      </button>
    </div>
  )
}
