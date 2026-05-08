import { KeychainManager } from './keychain'
import { DatabaseManager } from './db'
import { streamResponse } from './aiProviders'

// ── Types ──────────────────────────────────────────────────────────────────────

type Intent = 'coding' | 'rewrite' | 'chat' | 'reasoning' | 'image' | 'search'
type OutputLength = 'short' | 'medium' | 'long'
type ModelKey = 'local' | 'claude' | 'openai' | 'github' | 'google'

interface Classification {
  intent: Intent
  difficulty: number        // 1–5
  output_length: OutputLength
  needs_fresh_data: boolean
}

interface Message {
  role: string
  content: string
}

// ── System prompt ──────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a helpful AI assistant inside Ramanujan, built by Avinash Singh.

Rules:
- Always reply short and to the point. One or two sentences max unless the user explicitly asks for more detail.
- No bullet dumps. No long intros. Just the answer.
- Simple everyday language. No jargon unless asked.
- If someone asks who built this: Avinash Singh built Ramanujan as a side project. It picks the best AI model for each question automatically.`

// ── Step 1: Prompt Compression ─────────────────────────────────────────────────
// No-op: rule-based routing is fast enough; LLM pre-processing adds latency.

async function compressPrompt(prompt: string): Promise<string> {
  return prompt
}

// ── Step 2: Classifier ─────────────────────────────────────────────────────────
// Rule-based only — avoids a blocking Ollama call before every response.

async function classifyPrompt(prompt: string): Promise<Classification> {
  return ruleBasedClassify(prompt)
}

function ruleBasedClassify(prompt: string): Classification {
  const p = prompt.toLowerCase()
  const words = prompt.trim().split(/\s+/).length
  const intent: Intent =
    /\b(draw|generate|create|design)\b.{0,40}\b(image|picture|logo|icon)\b/i.test(prompt) ? 'image' :
    /\b(latest|current|today|news|search|look up|right now)\b/i.test(p) ? 'search' :
    /```|function |class |def |import |const |async /.test(prompt) ? 'coding' :
    /\b(explain|analyse|analyze|compare|evaluate|solve)\b/i.test(p) ? 'reasoning' :
    /\b(rewrite|rephrase|improve|fix grammar|edit)\b/i.test(p) ? 'rewrite' :
    'chat'
  return {
    intent,
    difficulty: words > 80 ? 4 : words > 30 ? 3 : 2,
    output_length: words > 60 ? 'long' : words > 20 ? 'medium' : 'short',
    needs_fresh_data: intent === 'search',
  }
}

// ── Step 3: Scoring Engine ─────────────────────────────────────────────────────

function scoreModels(
  meta: Classification,
  available: Set<ModelKey>,
  weights: Record<ModelKey, number>
): Record<ModelKey, number> {
  const base: Record<ModelKey, number> = { local: 0, claude: 0, openai: 0, github: 0, google: 0 }

  switch (meta.intent) {
    case 'coding':
    case 'reasoning':
      base.claude = 9; base.openai = 7; base.github = 6; base.google = 6; base.local = meta.difficulty <= 2 ? 5 : 1
      break
    case 'image':
      base.openai = 10; base.github = 8; base.claude = 2; base.google = 4; base.local = 0
      break
    case 'search':
      base.openai = 8; base.github = 7; base.claude = 8; base.google = 8; base.local = 0
      break
    case 'rewrite':
      base.local = 6; base.claude = 8; base.openai = 5; base.github = 5; base.google = 6
      break
    default: // chat
      base.local = meta.difficulty <= 2 ? 8 : 4; base.claude = 6; base.openai = 5; base.github = 5; base.google = 7
  }

  if (meta.difficulty >= 4) base.local = Math.max(0, base.local - 3)
  if (meta.needs_fresh_data) base.local = 0

  // Zero out unavailable providers
  if (!available.has('local')) base.local = 0
  if (!available.has('claude')) base.claude = 0
  if (!available.has('openai')) base.openai = 0
  if (!available.has('github')) base.github = 0
  if (!available.has('google')) base.google = 0

  // Apply adaptive weights
  return {
    local:  base.local  * (weights.local  ?? 1),
    claude: base.claude * (weights.claude ?? 1),
    openai: base.openai * (weights.openai ?? 1),
    github: base.github * (weights.github ?? 1),
    google: base.google * (weights.google ?? 1),
  }
}

// ── Step 4: Model Selection ────────────────────────────────────────────────────

function selectModel(scores: Record<ModelKey, number>): ModelKey {
  return (Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0]) as ModelKey
}

// ── Step 5: Quality Check ──────────────────────────────────────────────────────

function isBadResponse(response: string): boolean {
  const trimmed = response.trim()
  if (trimmed.length === 0) return true
  // Only flag truly empty/refusal responses — short factual answers ("Yes", "42") are valid
  if (/^\s*$/i.test(trimmed)) return true
  if (/^(i don'?t know|i'?m not sure|i cannot help|i can'?t help with that|i'?m unable to)[.!]?\s*$/i.test(trimmed)) return true
  return false
}

// ── Step 6 + 9: Route with fallback, logging, and learning ────────────────────

function promptHash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i)
  return (h >>> 0).toString(36)
}

async function ollamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch { return false }
}

const PROVIDER_MAP: Record<ModelKey, { provider: string; model: string }> = {
  local:  { provider: 'ollama',     model: 'llama3.2:1b' },
  claude: { provider: 'anthropic',  model: 'claude-haiku-4-5-20251001' },
  openai: { provider: 'openai',     model: 'gpt-4o-mini' },
  github: { provider: 'github',     model: 'gpt-4o-mini' },
  google: { provider: 'google',     model: 'gemini-2.0-flash' },
}

async function callModel(
  model: ModelKey,
  messages: Message[],
  keychain: KeychainManager
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    let text = ''
    const { provider, model: modelName } = PROVIDER_MAP[model]
    await streamResponse(
      provider, modelName, messages,
      (chunk) => { text += chunk },
      () => resolve(text),
      (err) => reject(new Error(err)),
      keychain
    )
  })
}

// ── Main exported function ─────────────────────────────────────────────────────

export async function route(
  messages: Message[],
  keychain: KeychainManager,
  onChunk: (chunk: string) => void,
  onDone: (text: string) => void,
  onError: (err: string) => void,
  db?: DatabaseManager
): Promise<void> {
  const prompt = messages[messages.length - 1]?.content || ''
  const start = Date.now()

  // Prepend system prompt if not already present
  const messagesWithSystem: Message[] = messages[0]?.role === 'system'
    ? messages
    : [{ role: 'system', content: SYSTEM_PROMPT }, ...messages]

  // Determine available providers
  const available = new Set<ModelKey>()
  if (await ollamaAvailable()) available.add('local')
  if (await keychain.get('anthropic')) available.add('claude')
  if (await keychain.get('openai')) available.add('openai')
  if (await keychain.get('github')) available.add('github')
  if (await keychain.get('google')) available.add('google')

  if (available.size === 0) { onError('No AI available. Connect a provider in Settings.'); return }

  // Steps 1–2: compress + classify (parallel, both timeout safely)
  const [compressed, meta] = await Promise.all([
    compressPrompt(prompt),
    classifyPrompt(prompt),
  ])

  const workingMessages = compressed !== prompt
    ? [...messagesWithSystem.slice(0, -1), { ...messagesWithSystem[messagesWithSystem.length - 1], content: compressed }]
    : messagesWithSystem

  // Steps 3–4: score + select
  const weights = db?.getWeightsForIntent(meta.intent) ?? { local: 1, claude: 1, openai: 1, github: 1, google: 1 }
  const scores = scoreModels(meta, available, weights)
  const ranked = (Object.entries(scores) as [ModelKey, number][])
    .sort(([, a], [, b]) => b - a)
    .filter(([, s]) => s > 0)
    .map(([k]) => k)

  if (ranked.length === 0) { onError('No suitable model available for this request.'); return }

  const primary = ranked[0]
  const fallbacks = ranked.slice(1)

  // Step 6: try primary, fallback if bad
  let modelUsed = primary
  let fallbackUsed = false
  let response = ''

  try {
    if (primary === 'local') {
      // Collect local response first for quality check (fast model)
      response = await callModel('local', workingMessages, keychain)
      if (isBadResponse(response) && fallbacks.length > 0) {
        fallbackUsed = true
        modelUsed = fallbacks[0]
        const { provider: fp, model: fm } = PROVIDER_MAP[modelUsed]
        await streamResponse(fp, fm, workingMessages,
          (chunk) => { response += chunk; onChunk(chunk) },
          () => {}, (err) => { throw new Error(err) }, keychain)
      } else {
        onChunk(response)
      }
    } else {
      // Cloud: stream directly
      const { provider: pp, model: pm } = PROVIDER_MAP[primary]
      await streamResponse(pp, pm, workingMessages,
        (chunk) => { response += chunk; onChunk(chunk) },
        () => {}, (err) => { throw new Error(err) }, keychain)

      // Fallback if cloud gave bad response
      if (isBadResponse(response) && fallbacks.length > 0) {
        fallbackUsed = true
        modelUsed = fallbacks[0]
        response = ''
        const { provider: fp, model: fm } = PROVIDER_MAP[modelUsed]
        await streamResponse(fp, fm, workingMessages,
          (chunk) => { response += chunk; onChunk(chunk) },
          () => {}, (err) => { throw new Error(err) }, keychain)
      }
    }
  } catch (err: any) {
    onError(err.message)
    return
  }

  const latency = Date.now() - start
  const success = !isBadResponse(response)
  const tokensEstimated = Math.ceil(response.split(/\s+/).length * 1.3)

  // Steps 7–8: log + update weights
  if (db) {
    db.logInteraction({
      prompt_hash: promptHash(prompt),
      intent: meta.intent,
      model_used: modelUsed,
      fallback_used: fallbackUsed,
      tokens_estimated: tokensEstimated,
      latency_ms: latency,
      success,
    })
    db.updateModelWeight(meta.intent, modelUsed, fallbackUsed, success)
  }

  onDone(response)
}
