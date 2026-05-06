// Browser-compatible implementation of ElectronAPI — uses localStorage + direct fetch
import type { Chat, Message } from './types'

// ── Storage helpers ───────────────────────────────────────────────────────────

const S = {
  get:     (k: string)           => localStorage.getItem(k),
  set:     (k: string, v: string) => localStorage.setItem(k, v),
  del:     (k: string)           => localStorage.removeItem(k),
  getJ:    <T>(k: string, d: T): T => { const v = localStorage.getItem(k); if (v === null) return d; try { return JSON.parse(v) } catch { return d } },
  setJ:    (k: string, v: any)   => localStorage.setItem(k, JSON.stringify(v)),
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

// ── Chats / messages ──────────────────────────────────────────────────────────

const chats   = () => S.getJ<Chat[]>('rj:chats', [])
const msgs    = (id: string) => S.getJ<Message[]>(`rj:msgs:${id}`, [])
const saveC   = (c: Chat[]) => S.setJ('rj:chats', c)
const saveM   = (id: string, m: Message[]) => S.setJ(`rj:msgs:${id}`, m)
const touchC  = (id: string) => saveC(chats().map(c => c.id === id ? { ...c, updated_at: Date.now() } : c))

// ── Keys / settings ───────────────────────────────────────────────────────────

const getKey  = (p: string)           => S.get(`rj:key:${p}`)
const setKey  = (p: string, v: string) => S.set(`rj:key:${p}`, v)
const delKey  = (p: string)           => S.del(`rj:key:${p}`)

// ── Streaming event bus ───────────────────────────────────────────────────────

type ChunkCb = (d: { chatId: string; chunk: string }) => void
type DoneCb  = (d: { chatId: string; fullText: string }) => void
type ErrCb   = (d: { chatId: string; error: string }) => void

const chunkCbs = new Set<ChunkCb>()
const doneCbs  = new Set<DoneCb>()
const errCbs   = new Set<ErrCb>()

// ── Routing (ported from router.ts) ───────────────────────────────────────────

type Intent   = 'coding' | 'rewrite' | 'chat' | 'reasoning' | 'image' | 'search'
type ModelKey = 'local' | 'claude' | 'openai' | 'github' | 'google'

function classify(prompt: string): Intent {
  const p = prompt.toLowerCase()
  if (/\b(draw|generate|create|design)\b.{0,40}\b(image|picture|logo|icon)\b/i.test(prompt)) return 'image'
  if (/\b(latest|current|today|news|search|look up|right now)\b/i.test(p))                   return 'search'
  if (/```|function |class |def |import |const |async /.test(prompt))                         return 'coding'
  if (/\b(explain|analyse|analyze|compare|evaluate|solve)\b/i.test(p))                       return 'reasoning'
  if (/\b(rewrite|rephrase|improve|fix grammar|edit)\b/i.test(p))                            return 'rewrite'
  return 'chat'
}

function pickModel(intent: Intent, avail: Set<ModelKey>): ModelKey | null {
  const s: Record<ModelKey, number> = { local: 0, claude: 0, openai: 0, github: 0, google: 0 }
  switch (intent) {
    case 'coding': case 'reasoning': s.claude=9; s.openai=7; s.github=6; s.google=5; s.local=1; break
    case 'image':   s.openai=10; s.github=8; s.google=6; s.claude=2; s.local=0; break
    case 'search':  s.claude=8;  s.openai=8; s.github=7; s.google=7; s.local=0; break
    case 'rewrite': s.claude=8;  s.local=6;  s.openai=5; s.github=5; s.google=5; break
    default:        s.local=8;   s.claude=6; s.openai=5; s.github=5; s.google=5; break
  }
  for (const k of Object.keys(s) as ModelKey[]) if (!avail.has(k)) s[k] = 0
  const top = Object.entries(s).sort(([,a],[,b]) => b - a).find(([,v]) => v > 0)
  return top ? top[0] as ModelKey : null
}

// ── SSE parser ────────────────────────────────────────────────────────────────

async function readSSE(res: Response, onData: (d: string) => void): Promise<void> {
  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop() || ''
    for (const line of lines) if (line.startsWith('data: ')) onData(line.slice(6).trim())
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYS = `You are the AI assistant in Ramanujan — built by Avinash Singh, a Product Manager at Mahindra.
Ramanujan routes messages to the best available AI model automatically. If asked who built this app, say Avinash Singh.`

// ── Core streaming ────────────────────────────────────────────────────────────

const onHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'

async function ollamaOk(): Promise<boolean> {
  // On HTTPS, browsers block http://localhost (mixed content).
  // Chrome has a localhost exception; Firefox/Safari do not.
  // Ollama also needs OLLAMA_ORIGINS set to allow the GitHub Pages origin.
  try { return (await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) })).ok }
  catch { return false }
}

async function streamToChat(
  chatId: string,
  messages: Array<{ role: string; content: string }>
): Promise<void> {
  const avail = new Set<ModelKey>()
  if (await ollamaOk())  avail.add('local')
  if (getKey('anthropic')) avail.add('claude')
  if (getKey('openai'))    avail.add('openai')
  if (getKey('github'))    avail.add('github')
  if (getKey('google'))    avail.add('google')

  if (avail.size === 0) {
    const msg = onHttps
      ? 'Local Ollama is blocked on HTTPS. To use it: open Chrome, then run Ollama with OLLAMA_ORIGINS=* (see Settings for details). Or connect a free cloud provider like GitHub Models.'
      : 'No AI available. Connect a provider in Settings.'
    errCbs.forEach(cb => cb({ chatId, error: msg })); return
  }

  const intent = classify(messages[messages.length - 1]?.content || '')
  const model  = pickModel(intent, avail)
  if (!model) { errCbs.forEach(cb => cb({ chatId, error: 'No suitable model available.' })); return }

  const withSys = messages[0]?.role === 'system' ? messages : [{ role: 'system', content: SYS }, ...messages]

  let full = ''
  const chunk = (t: string) => { full += t; chunkCbs.forEach(cb => cb({ chatId, chunk: t })) }

  try {
    if (model === 'local') {
      const res = await fetch('http://localhost:11434/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama3.2:1b', messages: withSys, stream: true }),
      })
      if (!res.ok) throw new Error(`Ollama error (${res.status})`)
      const reader = res.body!.getReader(); const dec = new TextDecoder(); let buf = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() || ''
        for (const l of lines) { try { const d = JSON.parse(l); if (d.message?.content) chunk(d.message.content) } catch {} }
      }
    } else if (model === 'claude') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': getKey('anthropic')!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5', max_tokens: 4096, stream: true,
          messages: withSys.filter(m => m.role !== 'system').map(m => ({ role: m.role as 'user'|'assistant', content: m.content })),
          ...(withSys[0]?.role === 'system' ? { system: withSys[0].content } : {}),
        }),
      })
      if (!res.ok) throw new Error(`Anthropic error (${res.status})`)
      await readSSE(res, raw => { try { const d = JSON.parse(raw); if (d.type === 'content_block_delta' && d.delta?.type === 'text_delta') chunk(d.delta.text) } catch {} })
    } else if (model === 'openai' || model === 'github') {
      const base = model === 'openai' ? 'https://api.openai.com/v1' : 'https://models.inference.ai.azure.com'
      const key  = model === 'openai' ? getKey('openai')! : getKey('github')!
      const res  = await fetch(`${base}/chat/completions`, {
        method: 'POST', headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', stream: true, messages: withSys }),
      })
      if (!res.ok) throw new Error(`API error (${res.status})`)
      await readSSE(res, raw => { if (raw === '[DONE]') return; try { const d = JSON.parse(raw).choices?.[0]?.delta?.content; if (d) chunk(d) } catch {} })
    } else if (model === 'google') {
      const contents = withSys.filter(m => m.role !== 'system')
        .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${getKey('google')!}&alt=sse`,
        { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contents }) }
      )
      if (!res.ok) throw new Error(`Gemini error (${res.status})`)
      await readSSE(res, raw => { try { const t = JSON.parse(raw).candidates?.[0]?.content?.parts?.[0]?.text; if (t) chunk(t) } catch {} })
    }
  } catch (err: any) {
    errCbs.forEach(cb => cb({ chatId, error: err.message || 'Unknown error' })); return
  }

  doneCbs.forEach(cb => cb({ chatId, fullText: full }))
}

// ── testApiKey ────────────────────────────────────────────────────────────────

async function testKey(provider: string, key: string): Promise<{ ok: boolean; error?: string }> {
  try {
    switch (provider) {
      case 'anthropic': {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }),
        }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return { ok: true }
      }
      case 'openai': {
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST', headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }),
        }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return { ok: true }
      }
      case 'google': {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
        if (!r.ok) throw new Error(`HTTP ${r.status}`); return { ok: true }
      }
      case 'github': {
        const r = await fetch('https://models.inference.ai.azure.com/chat/completions', {
          method: 'POST', headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }),
        }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return { ok: true }
      }
      default: return { ok: false, error: 'Unknown provider' }
    }
  } catch (e: any) { return { ok: false, error: e.message || 'Unknown error' } }
}

// ── Public factory ────────────────────────────────────────────────────────────

export function createBrowserAPI() {
  return {
    isBrowserMode: true as const,

    // Chats
    listChats:   async () => chats().sort((a, b) => b.updated_at - a.updated_at),
    getChat:     async (id: string) => chats().find(c => c.id === id) ?? null,
    createChat:  async (title: string) => {
      const c: Chat = { id: uid(), title, model: '', created_at: Date.now(), updated_at: Date.now() }
      saveC([c, ...chats()]); return c
    },
    deleteChat:  async (id: string) => { saveC(chats().filter(c => c.id !== id)); S.del(`rj:msgs:${id}`) },
    renameChat:  async (id: string, title: string) => saveC(chats().map(c => c.id === id ? { ...c, title, updated_at: Date.now() } : c)),

    // Messages
    listMessages: async (chatId: string) => msgs(chatId),
    addMessage:   async (chatId: string, role: string, content: string, model: string) => {
      const m: Message = { id: uid(), chat_id: chatId, role: role as any, content, model, created_at: Date.now() }
      saveM(chatId, [...msgs(chatId), m]); touchC(chatId); return m
    },

    // Keys
    getKey:                  async (p: string)           => getKey(p),
    setKey:                  async (p: string, v: string) => setKey(p, v),
    deleteKey:               async (p: string)           => delKey(p),
    listConfiguredProviders: async ()                     => ['anthropic','openai','google','github'].filter(p => !!getKey(p)),

    // Settings
    getSetting: async (k: string)           => S.get(`rj:setting:${k}`),
    setSetting: async (k: string, v: string) => S.set(`rj:setting:${k}`, v),

    // Ollama (read-only — install is manual for web users)
    ollamaStatus: async () => {
      const running = await ollamaOk()
      if (!running) return { installed: false, running: false, models: [] }
      try { const d = await (await fetch('http://localhost:11434/api/tags')).json(); return { installed: true, running: true, models: d.models || [] } }
      catch { return { installed: true, running: false, models: [] } }
    },
    ollamaListModels: async () => { try { return (await (await fetch('http://localhost:11434/api/tags')).json()).models || [] } catch { return [] } },
    ollamaPullModel:    async (_: string) => {},
    ollamaDeleteModel:  async (_: string) => {},
    onOllamaPullProgress: (_: any) => (() => {}),

    // Installer no-ops
    installOllama:    async () => {},
    pullDefaultModel: async () => {},
    onInstallProgress: (_: any) => (() => {}),

    // AI streaming
    streamMessage: ({ messages, chatId }: { messages: Array<{role:string;content:string}>; chatId: string }) => {
      streamToChat(chatId, messages); return Promise.resolve()
    },
    testApiKey:    testKey,
    onStreamChunk: (cb: ChunkCb) => { chunkCbs.add(cb); return () => chunkCbs.delete(cb) },
    onStreamDone:  (cb: DoneCb)  => { doneCbs.add(cb);  return () => doneCbs.delete(cb)  },
    onStreamError: (cb: ErrCb)   => { errCbs.add(cb);   return () => errCbs.delete(cb)   },

    // Misc
    onShortcut:           (_: string, _cb: () => void) => (() => {}),
    getAppVersion:        async () => '1.0.0',
    openExternal:         async (url: string) => { window.open(url, '_blank') },
    completeOnboarding:   async () => { S.set('rj:setting:onboarding_complete', 'true') },
    getOnboardingStatus:  async () => S.get('rj:setting:onboarding_complete'),
    githubStartDeviceFlow: async () => ({ error: 'n/a', device_code: '', user_code: '', verification_uri: '', interval: 5, expires_in: 900 }),
    githubPollDeviceFlow:  async () => ({ ok: false as const, error: 'n/a' }),
  }
}
