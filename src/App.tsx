import React, { useState, useEffect } from 'react'
import Onboarding from './pages/Onboarding'
import MainApp from './pages/MainApp'

type AppState = 'loading' | 'onboarding' | 'main'

export default function App() {
  const [state, setState] = useState<AppState>('loading')

  useEffect(() => {
    const check = async () => {
      try {
        // Check if running in Electron
        if (!window.electronAPI) {
          // Dev mode without Electron - go straight to main
          setState('main')
          return
        }
        const status = await window.electronAPI.getOnboardingStatus()
        setState(status === 'true' ? 'main' : 'onboarding')
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
