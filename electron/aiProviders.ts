import { KeychainManager } from './keychain'

export type Provider = 'ollama' | 'anthropic' | 'openai' | 'google' | 'github'

interface Message {
  role: string
  content: string
}

export async function testApiKey(provider: string, key: string): Promise<{ ok: boolean; error?: string }> {
  try {
    switch (provider) {
      case 'anthropic': {
        const Anthropic = require('@anthropic-ai/sdk')
        const client = new Anthropic.Anthropic({ apiKey: key })
        await client.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        })
        return { ok: true }
      }
      case 'openai': {
        const OpenAI = require('openai')
        const client = new OpenAI.OpenAI({ apiKey: key })
        await client.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        })
        return { ok: true }
      }
      case 'google': {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return { ok: true }
      }
      case 'github': {
        const OpenAI = require('openai')
        const client = new OpenAI.OpenAI({ apiKey: key, baseURL: 'https://models.inference.ai.azure.com' })
        await client.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        })
        return { ok: true }
      }
      default:
        return { ok: false, error: 'Unknown provider' }
    }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Unknown error' }
  }
}

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
      case 'ollama':
        await streamOllama(model, messages, onChunk, onDone)
        break
      case 'anthropic': {
        const key = await keychain.get('anthropic')
        if (!key) throw new Error('Anthropic API key not configured')
        await streamAnthropic(key, model, messages, onChunk, onDone)
        break
      }
      case 'openai': {
        const key = await keychain.get('openai')
        if (!key) throw new Error('OpenAI API key not configured')
        await streamOpenAI(key, model, messages, onChunk, onDone)
        break
      }
      case 'google': {
        const key = await keychain.get('google')
        if (!key) throw new Error('Google API key not configured')
        await streamGemini(key, model, messages, onChunk, onDone)
        break
      }
      case 'github': {
        const key = await keychain.get('github')
        if (!key) throw new Error('GitHub token not configured')
        await streamGitHub(key, model, messages, onChunk, onDone)
        break
      }
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  } catch (err: any) {
    onError(err.message || 'Unknown error')
  }
}

async function streamOllama(
  model: string,
  messages: Message[],
  onChunk: (chunk: string) => void,
  onDone: (fullText: string) => void
): Promise<void> {
  const res = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Ollama error (${res.status}): ${text}`)
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

  onDone(fullText)
}

async function streamAnthropic(
  apiKey: string,
  model: string,
  messages: Message[],
  onChunk: (chunk: string) => void,
  onDone: (fullText: string) => void
): Promise<void> {
  const Anthropic = require('@anthropic-ai/sdk')
  const client = new Anthropic.Anthropic({ apiKey })

  let fullText = ''
  const stream = await client.messages.stream({
    model,
    max_tokens: 4096,
    messages: messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      onChunk(event.delta.text)
      fullText += event.delta.text
    }
  }

  onDone(fullText)
}

async function streamOpenAI(
  apiKey: string,
  model: string,
  messages: Message[],
  onChunk: (chunk: string) => void,
  onDone: (fullText: string) => void
): Promise<void> {
  const OpenAI = require('openai')
  const client = new OpenAI.OpenAI({ apiKey })

  let fullText = ''
  const stream = await client.chat.completions.create({
    model,
    stream: true,
    messages: messages as any,
  })

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) {
      onChunk(delta)
      fullText += delta
    }
  }

  onDone(fullText)
}

async function streamGitHub(
  token: string,
  model: string,
  messages: Message[],
  onChunk: (chunk: string) => void,
  onDone: (fullText: string) => void
): Promise<void> {
  const OpenAI = require('openai')
  const client = new OpenAI.OpenAI({ apiKey: token, baseURL: 'https://models.inference.ai.azure.com' })

  let fullText = ''
  const stream = await client.chat.completions.create({
    model: model || 'gpt-4o-mini',
    stream: true,
    messages: messages as any,
  })

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) {
      onChunk(delta)
      fullText += delta
    }
  }

  onDone(fullText)
}

async function streamGemini(
  apiKey: string,
  model: string,
  messages: Message[],
  onChunk: (chunk: string) => void,
  onDone: (fullText: string) => void
): Promise<void> {
  // Convert messages to Gemini format
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gemini error (${res.status}): ${text}`)
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
      if (!line.startsWith('data: ')) continue
      const jsonStr = line.slice(6).trim()
      if (jsonStr === '[DONE]') continue
      try {
        const data = JSON.parse(jsonStr)
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          onChunk(text)
          fullText += text
        }
      } catch {}
    }
  }

  onDone(fullText)
}
