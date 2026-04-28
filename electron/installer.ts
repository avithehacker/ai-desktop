import { exec } from 'child_process'
import { promisify } from 'util'
import * as https from 'https'
import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const execAsync = promisify(exec)

export type InstallStep =
  | { step: 'checking' }
  | { step: 'ollama-found' }
  | { step: 'downloading-ollama'; percent: number }
  | { step: 'installing-ollama' }
  | { step: 'starting-ollama' }
  | { step: 'pulling-model'; model: string; percent: number; status: string }
  | { step: 'model-ready'; model: string }
  | { step: 'error'; message: string }

export const DEFAULT_MODEL = 'gemma2:2b'

function downloadFile(url: string, dest: string, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const follow = (u: string) => {
      const mod = u.startsWith('https') ? https : http
      mod.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return follow(res.headers.location!)
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))

        const total = parseInt(res.headers['content-length'] || '0', 10)
        let downloaded = 0
        const file = fs.createWriteStream(dest)

        res.on('data', (chunk) => {
          downloaded += chunk.length
          file.write(chunk)
          if (total > 0) onProgress(Math.round((downloaded / total) * 100))
        })
        res.on('end', () => file.close(() => resolve()))
        res.on('error', reject)
        file.on('error', reject)
      }).on('error', reject)
    }
    follow(url)
  })
}

async function installOllamaMac(onProgress: (s: InstallStep) => void): Promise<void> {
  // Try brew cask first
  try {
    await execAsync('/opt/homebrew/bin/brew install --cask ollama 2>&1', { timeout: 180000 })
    return
  } catch {}

  // Direct download fallback
  const tmpZip = path.join(os.tmpdir(), 'Ollama-darwin.zip')
  onProgress({ step: 'downloading-ollama', percent: 0 })
  await downloadFile('https://ollama.com/download/Ollama-darwin.zip', tmpZip, (pct) =>
    onProgress({ step: 'downloading-ollama', percent: pct })
  )
  onProgress({ step: 'installing-ollama' })
  await execAsync(`unzip -o "${tmpZip}" -d /tmp/ollama-install && mv -f /tmp/ollama-install/Ollama.app /Applications/Ollama.app`)
  await execAsync('open /Applications/Ollama.app')
  // Wait for it to start
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 1000))
    try {
      await execAsync('curl -s http://localhost:11434/api/tags')
      return
    } catch {}
  }
}

async function installOllamaWindows(onProgress: (s: InstallStep) => void): Promise<void> {
  const tmpExe = path.join(os.tmpdir(), 'OllamaSetup.exe')
  onProgress({ step: 'downloading-ollama', percent: 0 })
  await downloadFile('https://ollama.com/download/OllamaSetup.exe', tmpExe, (pct) =>
    onProgress({ step: 'downloading-ollama', percent: pct })
  )
  onProgress({ step: 'installing-ollama' })
  await execAsync(`"${tmpExe}" /SILENT /NORESTART`, { timeout: 180000 })
}

async function installOllamaLinux(onProgress: (s: InstallStep) => void): Promise<void> {
  onProgress({ step: 'installing-ollama' })
  await execAsync('curl -fsSL https://ollama.com/install.sh | sh', { timeout: 300000 })
}

export async function ensureOllamaInstalled(onProgress: (s: InstallStep) => void): Promise<boolean> {
  onProgress({ step: 'checking' })

  // Check if already installed and running
  try {
    await execAsync('curl -s --max-time 2 http://localhost:11434/api/tags')
    onProgress({ step: 'ollama-found' })
    return true
  } catch {}

  // Check binary
  const paths = ['/usr/local/bin/ollama', '/opt/homebrew/bin/ollama', `${os.homedir()}/.ollama/ollama`]
  const found = paths.find(p => { try { fs.accessSync(p, fs.constants.X_OK); return true } catch { return false } })

  if (!found) {
    try {
      const platform = process.platform
      if (platform === 'darwin') await installOllamaMac(onProgress)
      else if (platform === 'win32') await installOllamaWindows(onProgress)
      else await installOllamaLinux(onProgress)
    } catch (e: any) {
      onProgress({ step: 'error', message: `Failed to install Ollama: ${e.message}` })
      return false
    }
  }

  // Start Ollama
  onProgress({ step: 'starting-ollama' })
  try {
    const ollamaPath = found || '/usr/local/bin/ollama'
    require('child_process').spawn(ollamaPath, ['serve'], { detached: true, stdio: 'ignore' }).unref()
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000))
      try {
        await execAsync('curl -s --max-time 1 http://localhost:11434/api/tags')
        onProgress({ step: 'ollama-found' })
        return true
      } catch {}
    }
  } catch {}

  onProgress({ step: 'error', message: 'Ollama installed but could not start. Please restart the app.' })
  return false
}

export async function pullDefaultModel(onProgress: (s: InstallStep) => void): Promise<boolean> {
  onProgress({ step: 'pulling-model', model: DEFAULT_MODEL, percent: 0, status: 'Starting...' })

  const res = await fetch('http://localhost:11434/api/pull', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: DEFAULT_MODEL, stream: true }),
  })

  if (!res.ok) throw new Error(`Pull failed: ${res.status}`)

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No stream body')

  const dec = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() || ''
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const d = JSON.parse(line)
        const pct = d.total && d.completed ? Math.round((d.completed / d.total) * 100) : 0
        onProgress({ step: 'pulling-model', model: DEFAULT_MODEL, percent: pct, status: d.status || '' })
        if (d.status === 'success') {
          onProgress({ step: 'model-ready', model: DEFAULT_MODEL })
          return true
        }
      } catch {}
    }
  }

  onProgress({ step: 'model-ready', model: DEFAULT_MODEL })
  return true
}

export async function isModelPulled(model: string): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:11434/api/tags')
    if (!res.ok) return false
    const data = await res.json() as { models: Array<{ name: string }> }
    return data.models.some(m => m.name.startsWith(model.split(':')[0]))
  } catch {
    return false
  }
}
