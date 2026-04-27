import { spawn, ChildProcess, exec } from 'child_process'
import { promisify } from 'util'
import * as https from 'https'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const execAsync = promisify(exec)

export interface OllamaStatus {
  installed: boolean
  running: boolean
  models: OllamaModel[]
}

export interface OllamaModel {
  name: string
  size: number
  digest: string
  modified_at: string
}

export interface PullProgress {
  status: string
  completed?: number
  total?: number
  percent?: number
  modelName: string
}

export class OllamaManager {
  private ollamaProcess: ChildProcess | null = null
  private baseUrl = 'http://localhost:11434'

  async isInstalled(): Promise<boolean> {
    try {
      await execAsync('which ollama')
      return true
    } catch {
      try {
        await execAsync('ls /usr/local/bin/ollama')
        return true
      } catch {
        return false
      }
    }
  }

  async isRunning(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(2000) })
      return response.ok
    } catch {
      return false
    }
  }

  async ensureRunning(): Promise<void> {
    if (!(await this.isInstalled())) {
      throw new Error('Ollama not installed')
    }
    if (await this.isRunning()) return

    // Start Ollama serve
    this.ollamaProcess = spawn('ollama', ['serve'], {
      detached: false,
      stdio: 'ignore',
    })

    // Wait for it to start (up to 10 seconds)
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500))
      if (await this.isRunning()) return
    }
    throw new Error('Ollama failed to start')
  }

  async getStatus(): Promise<OllamaStatus> {
    const installed = await this.isInstalled()
    const running = await this.isRunning()
    let models: OllamaModel[] = []

    if (running) {
      try {
        models = await this.listModels()
      } catch {}
    }

    return { installed, running, models }
  }

  async listModels(): Promise<OllamaModel[]> {
    const res = await fetch(`${this.baseUrl}/api/tags`)
    if (!res.ok) throw new Error('Failed to list models')
    const data = await res.json() as { models: OllamaModel[] }
    return data.models || []
  }

  async deleteModel(name: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) throw new Error(`Failed to delete model: ${name}`)
  }

  async pullModel(modelName: string, onProgress: (p: PullProgress) => void): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true }),
    })

    if (!res.ok) throw new Error(`Failed to pull model: ${modelName}`)

    const reader = res.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const data = JSON.parse(line)
          const progress: PullProgress = {
            status: data.status || '',
            completed: data.completed,
            total: data.total,
            modelName,
          }
          if (data.total && data.completed) {
            progress.percent = Math.round((data.completed / data.total) * 100)
          }
          onProgress(progress)
        } catch {}
      }
    }
  }

  async streamChat(
    model: string,
    messages: Array<{ role: string; content: string }>,
    onChunk: (text: string) => void
  ): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Ollama error: ${text}`)
    }

    const reader = res.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const data = JSON.parse(line)
          if (data.message?.content) {
            onChunk(data.message.content)
            fullText += data.message.content
          }
        } catch {}
      }
    }

    return fullText
  }
}
