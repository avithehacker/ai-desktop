import React, { useState, useEffect } from 'react'
import { POPULAR_LOCAL_MODELS, WEBLLM_AVAILABLE_MODELS, OllamaModel, PullProgress, formatBytes } from '../types'

interface SettingsProps {
  onClose: () => void
  onModelsChanged: () => void
}

type Tab = 'models' | 'appearance' | 'data' | 'downloads'

const PROVIDER_INFO = {
  anthropic: { name: 'Anthropic (Claude)', placeholder: 'sk-ant-...', color: '#d4a574' },
  openai:    { name: 'OpenAI (ChatGPT)',   placeholder: 'sk-...',     color: '#74b9d4' },
  google:    { name: 'Google (Gemini)',    placeholder: 'AIza...',    color: '#7bc67e' },
  github:    { name: 'GitHub Models',     placeholder: 'ghp_...',    color: '#a78bfa' },
}

export default function Settings({ onClose, onModelsChanged }: SettingsProps) {
  const [tab, setTab] = useState<Tab>('models')
  const [localModels, setLocalModels] = useState<OllamaModel[]>([])
  const [ollamaRunning, setOllamaRunning] = useState(false)
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({})
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; error?: string }>>({})
  const [pullProgress, setPullProgress] = useState<Record<string, PullProgress>>({})
  const [theme, setTheme] = useState('dark')
  const [webllmActiveModel, setWebllmActiveModel] = useState('')
  const [webllmLoadingId, setWebllmLoadingId] = useState<string | null>(null)
  const [webllmLoadProgress, setWebllmLoadProgress] = useState(0)
  const [webllmLoadStatus, setWebllmLoadStatus] = useState('')
  const api = window.electronAPI
  const isBrowser = (api as any)?.isBrowserMode === true

  useEffect(() => {
    loadData()
    if (!api) return
    const cleanupOllama = api.onOllamaPullProgress((progress) => {
      setPullProgress(prev => ({ ...prev, [progress.modelName]: progress }))
    })
    const cleanupWebLLM = api.onLocalModelProgress?.((data) => {
      setWebllmLoadProgress(data.progress)
      setWebllmLoadStatus(data.text)
      if (data.progress >= 1) setWebllmLoadingId(null)
    })
    if (api.getActiveWebLLMModel) setWebllmActiveModel(api.getActiveWebLLMModel())
    return () => { cleanupOllama(); cleanupWebLLM?.() }
  }, [])

  const loadData = async () => {
    if (!api) return
    try {
      const status = await api.ollamaStatus()
      setOllamaRunning(status.running)
      setLocalModels(status.models || [])
    } catch {}

    for (const provider of Object.keys(PROVIDER_INFO)) {
      const key = await api.getKey(provider)
      if (key) {
        setApiKeys(prev => ({ ...prev, [provider]: key }))
        setSavedKeys(prev => ({ ...prev, [provider]: true }))
      }
    }

    const savedTheme = await api.getSetting('theme')
    if (savedTheme) setTheme(savedTheme)
  }

  const handleSaveKey = async (provider: string) => {
    if (!api || !apiKeys[provider]) return
    await api.setKey(provider, apiKeys[provider])
    setSavedKeys(prev => ({ ...prev, [provider]: true }))
    setTestResults(prev => ({ ...prev, [provider]: { ok: false } }))
    onModelsChanged()
  }

  const handleDeleteKey = async (provider: string) => {
    if (!api) return
    await api.deleteKey(provider)
    setApiKeys(prev => ({ ...prev, [provider]: '' }))
    setSavedKeys(prev => ({ ...prev, [provider]: false }))
    setTestResults(prev => ({ ...prev, [provider]: { ok: false } }))
    onModelsChanged()
  }

  const handleTestKey = async (provider: string) => {
    if (!api || !apiKeys[provider]) return
    const result = await api.testApiKey(provider, apiKeys[provider])
    setTestResults(prev => ({ ...prev, [provider]: result }))
    if (result.ok) handleSaveKey(provider)
  }

  const handlePullModel = async (modelName: string) => {
    if (!api) return
    setPullProgress(prev => ({ ...prev, [modelName]: { status: 'starting', modelName } }))
    try {
      const status = await api.ollamaStatus()
      if (!status.running) {
        if (isBrowser) {
          setPullProgress(prev => ({ ...prev, [modelName]: { status: 'Error: Ollama not running. Start it locally or use a WebLLM model above.', modelName } }))
          return
        }
        setPullProgress(prev => ({ ...prev, [modelName]: { status: 'Starting Ollama…', modelName } }))
        await api.installOllama()
        const after = await api.ollamaStatus()
        if (!after.running) throw new Error('Ollama could not be started. Please restart the app.')
      }
      await api.ollamaPullModel(modelName)
      await loadData()
      onModelsChanged()
    } catch (e: any) {
      setPullProgress(prev => ({ ...prev, [modelName]: { status: `Error: ${e.message}`, modelName } }))
    }
  }

  const handleLoadWebLLMModel = async (modelId: string) => {
    if (!api?.loadWebLLMModel) return
    setWebllmLoadingId(modelId)
    setWebllmLoadProgress(0)
    setWebllmLoadStatus('Starting…')
    try {
      await api.loadWebLLMModel(modelId)
      setWebllmActiveModel(modelId)
      onModelsChanged()
    } catch (e: any) {
      setWebllmLoadStatus(`Error: ${e.message}`)
      setWebllmLoadingId(null)
    }
  }

  const handleRemoveWebLLMModel = async (modelId: string) => {
    if (!api?.removeWebLLMModel) return
    if (!confirm(`Remove ${WEBLLM_AVAILABLE_MODELS.find(m => m.id === modelId)?.label}? This deletes the cached files from your browser.`)) return
    setWebllmLoadingId(modelId)
    setWebllmLoadStatus('Removing…')
    try {
      await api.removeWebLLMModel(modelId)
      setWebllmActiveModel(api.getActiveWebLLMModel?.() || '')
      onModelsChanged()
    } finally {
      setWebllmLoadingId(null)
      setWebllmLoadStatus('')
    }
  }

  const handleResetWebLLMChat = async () => {
    if (!api?.resetWebLLMChat) return
    await api.resetWebLLMChat()
    onModelsChanged()
  }

  const handleDeleteModel = async (name: string) => {
    if (!api) return
    await api.ollamaDeleteModel(name)
    await loadData()
    onModelsChanged()
  }

  const handleExport = async () => {
    if (!api) return
    const chats = await api.listChats()
    const data: Record<string, any> = {}
    for (const chat of chats) {
      data[chat.id] = { ...chat, messages: await api.listMessages(chat.id) }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'ramanujan-chats.json'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleClearChats = async () => {
    if (!api) return
    if (!confirm('Delete all chats? This cannot be undone.')) return
    const chats = await api.listChats()
    await Promise.all(chats.map(c => api.deleteChat(c.id)))
    window.location.reload()
  }

  const handleResetSetup = async () => {
    if (!api) return
    if (!confirm('Restart setup? This will take you back to the onboarding screen. Your chats and API keys will be kept.')) return
    await api.setSetting('onboarding_complete', 'false')
    window.location.reload()
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'models', label: 'Models' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'data', label: 'Data' },
    ...(isBrowser ? [{ id: 'downloads' as Tab, label: 'Downloads' }] : []),
  ]

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="drag-region flex items-center px-6"
        style={{ height: 'var(--topbar-height)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <h1 className="font-semibold no-drag" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <button
          onClick={onClose}
          className="ml-auto no-drag w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Tab nav */}
        <div className="w-44 shrink-0 p-3 space-y-0.5" style={{ borderRight: '1px solid var(--border-subtle)' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-100"
              style={{
                background: tab === t.id ? 'var(--bg-elevated)' : 'transparent',
                color: tab === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: tab === t.id ? 500 : 400,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'models' && (
            <div className="max-w-xl space-y-8">

              {/* WebLLM Models — browser mode only */}
              {isBrowser && api.webllmAvailable?.() && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="font-medium">In-Browser Models</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(48,209,88,0.1)', color: 'var(--green)' }}>
                      ● WebGPU
                    </span>
                  </div>
                  <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                    Run AI locally in your browser — no install needed. Models are downloaded once and cached.
                  </p>
                  <div className="space-y-2">
                    {WEBLLM_AVAILABLE_MODELS.map(m => {
                      const isActive  = webllmActiveModel === m.id || (!webllmActiveModel && m.id === 'Llama-3.2-1B-Instruct-q4f16_1-MLC')
                      const isLoading = webllmLoadingId === m.id
                      return (
                        <div
                          key={m.id}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl"
                          style={{
                            background: isActive ? 'var(--accent-bg)' : 'var(--bg-secondary)',
                            border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                          }}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{m.label}</span>
                              {isActive && (
                                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--accent)', color: '#fff', fontSize: '10px' }}>
                                  active
                                </span>
                              )}
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {m.size} · {m.description}
                            </div>
                            {isLoading && (
                              <div className="mt-2">
                                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                                  <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{ width: `${Math.round(webllmLoadProgress * 100)}%`, background: 'var(--accent)' }}
                                  />
                                </div>
                                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                  {webllmLoadStatus} {webllmLoadProgress > 0 && webllmLoadProgress < 1 ? `${Math.round(webllmLoadProgress * 100)}%` : ''}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isActive && (
                              <button
                                onClick={handleResetWebLLMChat}
                                disabled={!!webllmLoadingId}
                                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150 disabled:opacity-50"
                                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                                title="Clear model's conversation memory"
                              >
                                Reset
                              </button>
                            )}
                            {isActive && (
                              <button
                                onClick={() => handleRemoveWebLLMModel(m.id)}
                                disabled={!!webllmLoadingId}
                                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150 disabled:opacity-50"
                                style={{ color: 'var(--text-muted)' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                              >
                                Remove
                              </button>
                            )}
                            {!isActive && (
                              <button
                                onClick={() => handleLoadWebLLMModel(m.id)}
                                disabled={!!webllmLoadingId}
                                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150 disabled:opacity-50"
                                style={{
                                  background: 'var(--accent-bg)',
                                  color: 'var(--accent-light)',
                                  border: '1px solid rgba(94,106,210,0.3)',
                                }}
                              >
                                {isLoading ? 'Loading…' : 'Load'}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {isBrowser && !api.webllmAvailable?.() && (
                <section>
                  <h2 className="font-medium mb-3">In-Browser Models</h2>
                  <div className="px-4 py-3 rounded-xl text-xs" style={{ background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.2)', color: 'var(--text-secondary)' }}>
                    WebGPU is not available in this browser. Try Chrome or Edge to use local in-browser models.
                  </div>
                </section>
              )}

              {/* Local Models (Ollama) */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="font-medium">Local Models</h2>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: ollamaRunning ? 'rgba(48,209,88,0.1)' : 'rgba(142,142,154,0.1)',
                      color: ollamaRunning ? 'var(--green)' : 'var(--text-muted)',
                    }}
                  >
                    {ollamaRunning ? '● Ollama running' : '○ Ollama offline'}
                  </span>
                  {window.location.protocol === 'https:' && !ollamaRunning && (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      · HTTPS blocks localhost
                    </span>
                  )}
                </div>

                {/* HTTPS notice */}
                {window.location.protocol === 'https:' && !ollamaRunning && (
                  <div className="mb-4 px-4 py-3 rounded-xl text-xs space-y-1" style={{ background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.2)', color: 'var(--text-secondary)' }}>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>To use local models from this web app:</p>
                    <p>1. Use <strong>Chrome</strong> (it allows localhost from HTTPS)</p>
                    <p>2. Restart Ollama with CORS enabled:</p>
                    <code className="block mt-1 px-2 py-1 rounded text-xs font-mono" style={{ background: 'var(--bg-elevated)' }}>
                      OLLAMA_ORIGINS=* ollama serve
                    </code>
                    <p className="mt-1" style={{ color: 'var(--text-muted)' }}>Or use the <strong>desktop app</strong> — no restrictions.</p>
                  </div>
                )}

                {/* Installed models */}
                {localModels.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {localModels.map(m => (
                      <div
                        key={m.name}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: 'var(--green)' }}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{m.name}</div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {formatBytes(m.size)} · Installed
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteModel(m.name)}
                          className="text-xs px-2 py-1 rounded-lg transition-all duration-150"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Available to download */}
                <div className="space-y-2">
                  {POPULAR_LOCAL_MODELS
                    .filter(pm => !localModels.find(m => m.name === pm.name))
                    .map(pm => {
                      const progress = pullProgress[pm.name]
                      const isDownloading = progress && progress.status !== 'done'
                      return (
                        <div
                          key={pm.name}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium">{pm.label}</div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {pm.size} · {pm.description}
                            </div>
                            {isDownloading && (
                              <div className="mt-2">
                                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                                  <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{ width: `${progress.percent || 0}%`, background: 'var(--accent)' }}
                                  />
                                </div>
                                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                  {progress.status} {progress.percent ? `${progress.percent}%` : ''}
                                </div>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handlePullModel(pm.name)}
                            disabled={isDownloading}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150 disabled:opacity-50"
                            style={{
                              background: 'var(--accent-bg)',
                              color: 'var(--accent-light)',
                              border: '1px solid rgba(94,106,210,0.3)',
                            }}
                          >
                            {isDownloading ? 'Downloading...' : 'Download'}
                          </button>
                        </div>
                      )
                    })}
                </div>
              </section>

              {/* Cloud Models */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="font-medium">Cloud Models</h2>
                </div>
                <div className="mb-4 px-4 py-3 rounded-xl text-xs space-y-1" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', color: 'var(--text-secondary)' }}>
                  <p><strong style={{ color: 'var(--text-primary)' }}>Google Gemini</strong> and <strong style={{ color: 'var(--text-primary)' }}>GitHub Models</strong> are free — adding either one will give much better answers.</p>
                </div>
                <div className="space-y-4">
                  {Object.entries(PROVIDER_INFO).map(([provider, info]) => {
                    const currentKey = apiKeys[provider] || ''
                    const isSaved = savedKeys[provider]
                    const testResult = testResults[provider]

                    return (
                      <div
                        key={provider}
                        className="p-4 rounded-xl space-y-3"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ background: isSaved ? 'var(--green)' : 'var(--border)' }}
                            />
                            <span className="text-sm font-medium">{info.name}</span>
                          </div>
                          {isSaved && (
                            <button
                              onClick={() => handleDeleteKey(provider)}
                              className="text-xs"
                              style={{ color: 'var(--red)' }}
                            >
                              Disconnect
                            </button>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="password"
                            placeholder={isSaved ? '••••••••••••••••' : info.placeholder}
                            value={currentKey}
                            onChange={e => {
                              setApiKeys(prev => ({ ...prev, [provider]: e.target.value }))
                              setSavedKeys(prev => ({ ...prev, [provider]: false }))
                            }}
                            className="flex-1 px-3 py-2 rounded-lg text-sm font-mono outline-none"
                            style={{
                              background: 'var(--bg-tertiary)',
                              border: `1px solid ${testResult?.ok ? 'var(--green)' : testResult && !testResult.ok ? 'var(--red)' : 'var(--border)'}`,
                              color: 'var(--text-primary)',
                            }}
                          />
                          <button
                            onClick={() => handleTestKey(provider)}
                            disabled={!currentKey}
                            className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-40 transition-all duration-150"
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                          >
                            Test &amp; Save
                          </button>
                        </div>

                        {testResult && (
                          <div className="text-xs" style={{ color: testResult.ok ? 'var(--green)' : 'var(--red)' }}>
                            {testResult.ok ? '✓ Connected successfully' : `✗ ${testResult.error || 'Connection failed'}`}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            </div>
          )}

          {tab === 'appearance' && (
            <div className="max-w-sm space-y-6">
              <section>
                <h2 className="font-medium mb-4">Theme</h2>
                <div className="grid grid-cols-3 gap-3">
                  {['dark', 'light', 'system'].map(t => (
                    <button
                      key={t}
                      onClick={() => {
                        setTheme(t)
                        if (api) api.setSetting('theme', t)
                      }}
                      className="py-3 rounded-xl text-sm font-medium capitalize transition-all duration-150"
                      style={{
                        background: theme === t ? 'var(--accent-bg)' : 'var(--bg-secondary)',
                        border: `1px solid ${theme === t ? 'var(--accent)' : 'var(--border)'}`,
                        color: theme === t ? 'var(--accent-light)' : 'var(--text-secondary)',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}

          {tab === 'downloads' && (
            <div className="max-w-sm space-y-6">
              <section className="space-y-3">
                <h2 className="font-medium mb-4">Desktop App</h2>
                {[
                  { label: 'Mac (Apple Silicon)', sub: 'arm64 · zip', href: 'https://github.com/avithehacker/ai-desktop/releases/download/v1.1.0/Ramanujan-1.0.0-arm64-mac.zip' },
                  { label: 'Mac (Intel)', sub: 'x64 · zip', href: 'https://github.com/avithehacker/ai-desktop/releases/download/v1.1.0/Ramanujan-1.0.0-mac.zip' },
                  { label: 'Windows', sub: 'x64 · NSIS installer', href: 'https://github.com/avithehacker/ai-desktop/releases/download/v1.1.0/Ramanujan.Setup.1.0.0.exe' },
                  { label: 'Linux', sub: 'x64 · AppImage', href: 'https://github.com/avithehacker/ai-desktop/releases/download/v1.1.0/Ramanujan-1.0.0.AppImage' },
                ].map(({ label, sub, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between w-full py-2.5 px-4 rounded-xl text-sm transition-all duration-150 no-underline"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <span className="font-medium">{label}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub} ↓</span>
                  </a>
                ))}
              </section>

              <section className="space-y-3">
                <h2 className="font-medium mb-4">Terminal CLI</h2>
                {[
                  { label: 'Mac', sub: 'binary', href: 'https://github.com/avithehacker/ai-desktop/releases/download/v1.0.0/ram-macos' },
                  { label: 'Windows', sub: '.exe', href: 'https://github.com/avithehacker/ai-desktop/releases/download/v1.0.0/ram-win.exe' },
                  { label: 'Linux', sub: 'binary', href: 'https://github.com/avithehacker/ai-desktop/releases/download/v1.0.0/ram-linux' },
                ].map(({ label, sub, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between w-full py-2.5 px-4 rounded-xl text-sm transition-all duration-150"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <span className="font-medium">{label}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub} ↓</span>
                  </a>
                ))}
              </section>

              <section className="space-y-3">
                <h2 className="font-medium mb-4">VS Code Extension</h2>
                <a
                  href="https://github.com/avithehacker/ai-desktop/releases/download/v1.0.0/ramanujan-1.0.0.vsix"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between w-full py-2.5 px-4 rounded-xl text-sm transition-all duration-150"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <span className="font-medium">ramanujan-1.0.0.vsix</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>.vsix ↓</span>
                </a>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Install via Extensions → ··· → Install from VSIX…
                </p>
              </section>
            </div>
          )}

          {tab === 'data' && (
            <div className="max-w-sm space-y-6">
              <section className="space-y-3">
                <h2 className="font-medium mb-4">Chat Data</h2>
                <button
                  onClick={handleExport}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-left transition-all duration-150"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  Export chat history as JSON
                </button>
                <button
                  onClick={handleClearChats}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-left transition-all duration-150"
                  style={{ background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.2)', color: 'var(--red)' }}
                >
                  Clear all chats
                </button>
              </section>

              <section className="space-y-3">
                <h2 className="font-medium mb-4">Setup</h2>
                <button
                  onClick={handleResetSetup}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-left transition-all duration-150"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  Restart onboarding
                </button>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Returns to the setup screen. Chats and API keys are kept.
                </p>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
