import React, { useState, useEffect } from 'react'
import Onboarding from './pages/Onboarding'
import MainApp from './pages/MainApp'

type AppState = 'loading' | 'onboarding' | 'main'

export default function App() {
  const [state, setState] = useState<AppState>('loading')

  useEffect(() => {
    const check = async () => {
      try {
        const api = window.electronAPI
        const isBrowser = (api as any)?.isBrowserMode === true
        const status = await api.getOnboardingStatus()
        if (status !== 'true') { setState('onboarding'); return }
        // In Electron, verify Ollama is still installed
        if (!isBrowser) {
          const ollamaStatus = await api.ollamaStatus()
          if (!ollamaStatus.installed) {
            await api.setSetting('onboarding_complete', 'false')
            setState('onboarding')
            return
          }
        }
        setState('main')
      } catch {
        setState('onboarding')
      }
    }
    check()
  }, [])

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center w-full h-full" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-6 h-6 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
      </div>
    )
  }

  if (state === 'onboarding') {
    return <Onboarding onComplete={() => setState('main')} />
  }

  return <MainApp />
}
