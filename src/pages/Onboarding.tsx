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
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <div
          className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl"
          style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)' }}
        >
          ✦
        </div>
        <h1 className="text-3xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Your AI.<br />Local and online.
        </h1>
        <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Chat with local models on your Mac or connect to Claude, ChatGPT, and Gemini — all from one place.
        </p>
      </div>
      <button
        onClick={onNext}
        className="w-full py-3 rounded-xl font-medium text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
        style={{ background: 'var(--accent)' }}
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
        <h2 className="text-2xl font-semibold tracking-tight">Download a free local model</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
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

const PROVIDER_INFO = {
  anthropic: { name: 'Claude', icon: '◆', color: '#d4a574', placeholder: 'sk-ant-...' },
  openai: { name: 'ChatGPT', icon: '◉', color: '#74b9d4', placeholder: 'sk-...' },
  google: { name: 'Gemini', icon: '✦', color: '#74d4a5', placeholder: 'AIza...' },
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
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Connect your accounts</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Optional. Add API keys to use cloud models.
        </p>
      </div>

      <div className="space-y-3">
        {Object.entries(PROVIDER_INFO).map(([provider, info]) => {
          const state = providers[provider]
          return (
            <div
              key={provider}
              className="rounded-xl p-4 space-y-3"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm"
                  style={{ background: `${info.color}20`, color: info.color }}
                >
                  {info.icon}
                </div>
                <span className="font-medium">{info.name}</span>
                {state.tested && state.ok && (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(48,209,88,0.12)', color: 'var(--green)' }}>
                    Connected ✓
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder={info.placeholder}
                  value={state.key}
                  onChange={e => onChange(provider, e.target.value)}
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
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-40"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {state.testing ? '...' : 'Test'}
                </button>
              </div>

              {state.tested && !state.ok && state.error && (
                <div className="text-xs" style={{ color: 'var(--red)' }}>
                  {state.error}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={onDone}
        className="w-full py-3 rounded-xl font-medium text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
        style={{ background: 'var(--accent)' }}
      >
        Open app →
      </button>
    </div>
  )
}
