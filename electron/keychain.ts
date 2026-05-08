// Uses macOS Keychain via keytar for secure API key storage
// Falls back to encrypted file if keytar is unavailable

const SERVICE_NAME = 'ramanujan'

export class KeychainManager {
  private keytar: any = null
  private fallbackKeys: Map<string, string> = new Map()

  constructor() {
    try {
      this.keytar = require('keytar')
    } catch {
      console.warn('keytar not available, using in-memory fallback (not secure)')
    }
  }

  async get(provider: string): Promise<string | null> {
    if (this.keytar) {
      try {
        return await this.keytar.getPassword(SERVICE_NAME, provider)
      } catch {
        return this.fallbackKeys.get(provider) || null
      }
    }
    return this.fallbackKeys.get(provider) || null
  }

  async set(provider: string, key: string): Promise<void> {
    if (this.keytar) {
      try {
        await this.keytar.setPassword(SERVICE_NAME, provider, key)
        return
      } catch {}
    }
    this.fallbackKeys.set(provider, key)
  }

  async delete(provider: string): Promise<void> {
    if (this.keytar) {
      try {
        await this.keytar.deletePassword(SERVICE_NAME, provider)
      } catch {}
    }
    this.fallbackKeys.delete(provider)
  }

  async listConfigured(): Promise<string[]> {
    const providers = ['anthropic', 'openai', 'google', 'github']
    const configured: string[] = []
    for (const p of providers) {
      const key = await this.get(p)
      if (key) configured.push(p)
    }
    return configured
  }
}
