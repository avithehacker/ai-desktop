import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { createBrowserAPI } from './browserAPI'

// Install browser API when running outside Electron
if (!window.electronAPI) {
  ;(window as any).electronAPI = createBrowserAPI()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
