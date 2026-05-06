import { KeychainManager } from './keychain'

export type Provider = 'ollama' | 'anthropic' | 'openai' | 'google' | 'github'

interface Message {
  role: string
  content: string
}

// ── SSE stream parser ─────────────────────────────────────────────────────────

async function readSSE(
  res: Response,
  onData: (data: string) => void
): Promise<void> {
  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() || ''
    for (const line of lines) {
      if (line.startsWith('data: ')) onData(line.slice(6).trim())
    }
  }
}

// ── Key test ──────────────────────────────────────────────────────────────────

export async function testApiKey(provider: string, key: string): Promise<{ ok: boolean; error?: string }> {
  try {
    switch (provider) {
      case 'anthropic': {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return { ok: true }
      }
      case 'openai': {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return { ok: true }
      }
      case 'google': {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return { ok: true }
      }
      case 'github': {
        const res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return { ok: true }
      }
      default:
        return { ok: false, error: 'Unknown provider' }
    }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Unknown error' }
  }
}

// ── Stream response ───────────────────────────────────────────────────────────

export async function streamResponse(
  provider: string,
  model: string,
  messages: Message[],
  onChunk: (chunk: string) => void,
  onDone: (fullText: string) => void,
  onError: (error: string) => void,
  keychain: KeychainManager
): Promise<void> {
  try {
    switch (provider) {
      case 'ollama':   await streamOllama(model, messages, onChunk, onDone); break
      case 'anthropic': {
        const key = await keychain.get('anthropic')
        if (!key) throw new Error('Anthropic API key not configured')
        await streamAnthropic(key, model, messages, onChunk, onDone)
        break
      }
      case 'openai': {
        const key = await keychain.get('openai')
        if (!key) throw new Error('OpenAI API key not configured')
        await streamOpenAI('https://api.openai.com/v1', key, model, messages, onChunk, onDone)
        break
      }
      case 'github': {
        const key = await keychain.get('github')
        if (!key) throw new Error('GitHub token not configured')
        await streamOpenAI('https://models.inference.ai.azure.com', key, model, messages, onChunk, onDone)
        break
      }
      case 'google': {
        const key = await keychain.get('google')
        if (!key) throw new Error('Google API key not configured')
        await streamGemini(key, model, messages, onChunk, onDone)
        break
      }
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  } catch (err: any) {
    onError(err.message || 'Unknown error')
  }
}

// ── Ollama ────────────────────────────────────────────────────────────────────

async function streamOllama(
  model: string, messages: Message[],
  onChunk: (c: string) => void, onDone: (t: string) => void
): Promise<void> {
  const res = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true }),
  })
  if (!res.ok) throw new Error(`Ollama error (${res.status}): ${await res.text()}`)

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')
  const dec = new TextDecoder()
  let buf = '', full = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop() || ''
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const d = JSON.parse(line)
        if (d.message?.content) { onChunk(d.message.content); full += d.message.content }
      } catch {}
    }
  }
  onDone(full)
}

// ── Anthropic (direct fetch, SSE) ─────────────────────────────────────────────

async function streamAnthropic(
  apiKey: string, model: string, messages: Message[],
  onChunk: (c: string) => void, onDone: (t: string) => void
): Promise<void> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model, max_tokens: 4096, stream: true,
      messages: messages.filter(m => m.role !== 'system').map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ...(messages[0]?.role === 'system' ? { system: messages[0].content } : {}),
    }),
  })
  if (!res.ok) throw new Error(`Anthropic error (${res.status}): ${await res.text()}`)
  let full = ''
  await readSSE(res, raw => {
    if (raw === '[DONE]') return
    try {
      const d = JSON.parse(raw)
      if (d.type === 'content_block_delta' && d.delta?.type === 'text_delta') {
        onChunk(d.delta.text); full += d.delta.text
      }
    } catch {}
  })
  onDone(full)
}

// ── OpenAI-compatible (OpenAI + GitHub Models) ────────────────────────────────

async function streamOpenAI(
  baseUrl: string, apiKey: string, model: string, messages: Message[],
  onChunk: (c: string) => void, onDone: (t: string) => void
): Promise<void> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model, stream: true, messages }),
  })
  if (!res.ok) throw new Error(`API error (${res.status}): ${await res.text()}`)
  let full = ''
  await readSSE(res, raw => {
    if (raw === '[DONE]') return
    try {
      const delta = JSON.parse(raw).choices?.[0]?.delta?.content
      if (delta) { onChunk(delta); full += delta }
    } catch {}
  })
  onDone(full)
}

// ── Google Gemini (SSE) ───────────────────────────────────────────────────────

async function streamGemini(
  apiKey: string, model: string, messages: Message[],
  onChunk: (c: string) => void, onDone: (t: string) => void
): Promise<void> {
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contents }) }
  )
  if (!res.ok) throw new Error(`Gemini error (${res.status}): ${await res.text()}`)
  let full = ''
  await readSSE(res, raw => {
    if (raw === '[DONE]') return
    try {
      const text = JSON.parse(raw).candidates?.[0]?.content?.parts?.[0]?.text
      if (text) { onChunk(text); full += text }
    } catch {}
  })
  onDone(full)
}
