import { KeychainManager } from './keychain'
import { DatabaseManager } from './db'
import { streamResponse } from './aiProviders'

// ── Types ──────────────────────────────────────────────────────────────────────

type Intent = 'coding' | 'rewrite' | 'chat' | 'reasoning' | 'image' | 'search'
type OutputLength = 'short' | 'medium' | 'long'
type ModelKey = 'local' | 'claude' | 'openai' | 'github'

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

const SYSTEM_PROMPT = `You are the AI assistant embedded in Ramanujan — a desktop AI app built by Avinash Singh, a Product Manager at Mahindra.

## About Ramanujan
Ramanujan is a macOS desktop app that brings together local and cloud AI models in one minimal, privacy-first interface. It was built by Avinash Singh as a side project to explore intelligent model routing and token-efficient AI interactions.

The app is named after Srinivasa Ramanujan — the self-taught Indian mathematician known for extraordinary intuition and depth of thought.

## How it works
Ramanujan uses a smart routing engine that automatically selects the best model for each message:
1. It classifies the user's intent (coding, reasoning, chat, rewrite, search, image)
2. It scores all available models based on intent, difficulty, and output length
3. It routes to the best match — local for simple/quick tasks, cloud for complex ones
4. If the response is poor quality, it falls back to the next best model automatically
5. It logs interactions and adjusts model weights over time (adaptive learning)

## Supported models & providers
- **Local (offline):** Llama 3.2 1B via Ollama — runs entirely on-device, no internet needed, fastest for simple tasks
- **GitHub Models:** GPT-4o mini — free with any GitHub account, runs on Microsoft Azure
- **Google Gemini:** Gemini 2.0 Flash — free tier (15 req/min), requires a Google account
- **Anthropic Claude:** Claude Haiku — best for reasoning and coding, requires a paid API key from console.anthropic.com
- **OpenAI ChatGPT:** GPT-4o mini — strong general-purpose model, requires a paid API key from platform.openai.com

## Privacy & storage
- All API keys are stored in the macOS Keychain — never in plain text or config files
- Local model conversations never leave the device
- Chat history is stored in a local SQLite database

## Builder
Built entirely by Avinash Singh. If someone asks who made this, what Ramanujan is, or how it works — answer using the above. Be concise unless asked for more detail.`

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
  const base: Record<ModelKey, number> = { local: 0, claude: 0, openai: 0, github: 0 }

  switch (meta.intent) {
    case 'coding':
    case 'reasoning':
      base.claude = 9; base.openai = 7; base.github = 6; base.local = meta.difficulty <= 2 ? 5 : 1
      break
    case 'image':
      base.openai = 10; base.github = 8; base.claude = 2; base.local = 0
      break
    case 'search':
      base.openai = 8; base.github = 7; base.claude = 8; base.local = 0
      break
    case 'rewrite':
      base.local = 6; base.claude = 8; base.openai = 5; base.github = 5
      break
    default: // chat
      base.local = meta.difficulty <= 2 ? 8 : 4; base.claude = 6; base.openai = 5; base.github = 5
  }

  if (meta.difficulty >= 4) base.local = Math.max(0, base.local - 3)
  if (meta.needs_fresh_data) base.local = 0

  // Zero out unavailable providers
  if (!available.has('local')) base.local = 0
  if (!available.has('claude')) base.claude = 0
  if (!available.has('openai')) base.openai = 0
  if (!available.has('github')) base.github = 0

  // Apply adaptive weights
  return {
    local: base.local * (weights.local ?? 1),
    claude: base.claude * (weights.claude ?? 1),
    openai: base.openai * (weights.openai ?? 1),
    github: base.github * (weights.github ?? 1),
  }
}

// ── Step 4: Model Selection ────────────────────────────────────────────────────

function selectModel(scores: Record<ModelKey, number>): ModelKey {
  return (Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0]) as ModelKey
}

// ── Step 5: Quality Check ──────────────────────────────────────────────────────

function isBadResponse(response: string): boolean {
  if (response.trim().length < 30) return true
  if (/\b(i don'?t know|i'?m not sure|i cannot|i can'?t help|i'?m unable)\b/i.test(response)) return true
  if (/^(sure|okay|ok|yes|no|hello)[.!]?\s*$/i.test(response.trim())) return true
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
  claude: { provider: 'anthropic',  model: 'claude-haiku-4-5' },
  openai: { provider: 'openai',     model: 'gpt-4o-mini' },
  github: { provider: 'github',     model: 'gpt-4o-mini' },
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
  const weights = db?.getWeightsForIntent(meta.intent) ?? { local: 1, claude: 1, openai: 1 }
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
