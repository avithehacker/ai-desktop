import { KeychainManager } from './keychain'
import { OllamaManager } from './ollama'
import { streamResponse } from './aiProviders'

type TaskType = 'simple' | 'moderate' | 'complex' | 'image' | 'search'

interface Message {
  role: string
  content: string
}

// Silently improve prompt using local model before sending to cloud
async function enhancePrompt(prompt: string): Promise<string> {
  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma2:2b',
        prompt: `Rewrite this prompt to be clearer and more specific. Return ONLY the improved prompt, no explanation.\n\nPrompt: ${prompt}`,
        stream: false,
        options: { num_predict: 200 },
      }),
    })
    if (!res.ok) return prompt
    const data = await res.json() as { response?: string }
    return data.response?.trim() || prompt
  } catch {
    return prompt
  }
}

function classifyTask(prompt: string): TaskType {
  const lower = prompt.toLowerCase()
  const words = prompt.trim().split(/\s+/).length

  if (
    /\b(draw|paint|generate|create|design|make)\b.{0,40}\b(image|picture|photo|logo|icon|illustration|artwork)\b/i.test(prompt) ||
    /\b(image|picture|photo)\b.{0,20}\b(of|showing|depicting|with)\b/i.test(prompt)
  ) return 'image'

  if (/\b(latest|current|recent|today|news|right now|happening|live|search for|look up)\b/i.test(lower)) return 'search'

  const codePatterns = /```|^\s*(function|class|def|import|const|let|var|async|export)\s/m
  if (codePatterns.test(prompt) || words > 80) return 'complex'

  if (words < 15) return 'simple'

  return 'moderate'
}

async function isResponseInsufficient(response: string, promptWords: number): Promise<boolean> {
  const respWords = response.trim().split(/\s+/).length
  if (promptWords > 20 && respWords < 15) return true
  if (/\b(i (don'?t|do not|can'?t|cannot) (know|answer|help|tell)|i'?m (not sure|unable|not able to))\b/i.test(response)) return true
  return false
}

async function getBestCloud(taskType: TaskType, keychain: KeychainManager): Promise<{ provider: string; model: string } | null> {
  const anthropic = await keychain.get('anthropic')
  if (anthropic && taskType !== 'image') return { provider: 'anthropic', model: 'claude-haiku-4-5' }

  const openai = await keychain.get('openai')
  if (openai) return { provider: 'openai', model: taskType === 'image' ? 'gpt-4o' : 'gpt-4o-mini' }

  const google = await keychain.get('google')
  if (google) return { provider: 'google', model: 'gemini-1.5-flash' }

  // Fallback: anthropic can handle image descriptions even if not ideal
  if (anthropic) return { provider: 'anthropic', model: 'claude-haiku-4-5' }

  return null
}

async function ollamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

export async function route(
  messages: Message[],
  keychain: KeychainManager,
  onChunk: (chunk: string) => void,
  onDone: (text: string) => void,
  onError: (err: string) => void
): Promise<void> {
  const lastMsg = messages[messages.length - 1]
  const prompt = lastMsg?.content || ''
  const taskType = classifyTask(prompt)
  const promptWords = prompt.trim().split(/\s+/).length
  const localUp = await ollamaAvailable()

  // Image or search always needs cloud
  if (taskType === 'image' || taskType === 'search') {
    const cloud = await getBestCloud(taskType, keychain)
    if (!cloud) { onError('Connect a cloud AI provider to handle this request.'); return }
    await streamResponse(cloud.provider, cloud.model, messages, onChunk, onDone, onError, keychain)
    return
  }

  // Simple/moderate → try local first
  if (localUp && (taskType === 'simple' || taskType === 'moderate')) {
    let accumulated = ''
    let localFailed = false

    await streamResponse(
      'ollama', 'gemma2:2b', messages,
      (chunk) => { accumulated += chunk; onChunk(chunk) },
      () => {},
      () => { localFailed = true },
      keychain
    )

    if (!localFailed && !(await isResponseInsufficient(accumulated, promptWords))) {
      onDone(accumulated)
      return
    }

    // Local wasn't good enough — escalate silently (response already partially streamed)
    // For now, complete with what we have if cloud unavailable
    const cloud = await getBestCloud(taskType, keychain)
    if (!cloud) { onDone(accumulated || 'Unable to complete. Please connect a cloud provider.'); return }

    // Full retry with cloud (fresh stream — user will see new response)
    let cloudText = ''
    await streamResponse(
      cloud.provider, cloud.model, messages,
      (chunk) => { cloudText += chunk },
      () => {},
      onError,
      keychain
    )
    onDone(cloudText)
    return
  }

  // Complex → enhance prompt with local, then send to cloud
  const cloud = await getBestCloud(taskType, keychain)

  if (!cloud) {
    // No cloud — use local if available
    if (localUp) {
      await streamResponse('ollama', 'gemma2:2b', messages, onChunk, onDone, onError, keychain)
    } else {
      onError('No AI available. Please connect a provider or wait for local model to load.')
    }
    return
  }

  // Enhance prompt silently with local before sending to cloud
  let finalMessages = messages
  if (localUp) {
    const enhanced = await enhancePrompt(prompt)
    if (enhanced && enhanced !== prompt && enhanced.length > 10) {
      finalMessages = [...messages.slice(0, -1), { ...lastMsg, content: enhanced }]
    }
  }

  await streamResponse(cloud.provider, cloud.model, finalMessages, onChunk, onDone, onError, keychain)
}
