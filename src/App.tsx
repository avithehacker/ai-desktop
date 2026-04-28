import React, { useState, useEffect } from 'react'
import Onboarding from './pages/Onboarding'
import MainApp from './pages/MainApp'

type AppState = 'loading' | 'onboarding' | 'main'

export default function App() {
  const [state, setState] = useState<AppState>('loading')

  useEffect(() => {
    const check = async () => {
      try {
        if (!window.electronAPI) {
          setState('main')
          return
        }
        const status = await window.electronAPI.getOnboardingStatus()
        if (status !== 'true') {
          setState('onboarding')
          return
        }
        // Onboarding completed before — verify Ollama is still up.
        // If it's not (e.g. user wiped it or first run on new machine),
        // send them back through setup so nothing is broken silently.
        const ollamaStatus = await window.electronAPI.ollamaStatus()
        if (!ollamaStatus.running) {
          // Reset flag so setup runs fresh
          await window.electronAPI.setSetting('onboarding_complete', 'false')
          setState('onboarding')
          return
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
