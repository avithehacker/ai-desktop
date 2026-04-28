/**
 * Ramanujan API Server
 * POST /v1/prompt  { "prompt": "..." }  → { "output": "..." }
 *
 * Run: npx ts-node src/server.ts
 * Or:  RAM_PORT=3000 RAM_ANTHROPIC_KEY=sk-... npx ts-node src/server.ts
 */

import * as http from 'http'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'

const PORT = parseInt(process.env.RAM_PORT || '4242', 10)
const CONFIG_PATH = path.join(os.homedir(), '.ramanujan', 'config.json')

function loadConfig() {
  const env = {
    anthropic: process.env.RAM_ANTHROPIC_KEY,
    openai: process.env.RAM_OPENAI_KEY,
    google: process.env.RAM_GOOGLE_KEY,
  }
  try {
    const file = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
    return { ...file, ...Object.fromEntries(Object.entries(env).filter(([, v]) => v)) }
  } catch {
    return env
  }
}

function classifyTask(prompt: string): 'simple' | 'moderate' | 'complex' {
  const words = prompt.trim().split(/\s+/).length
  const hasCode = /```|function\s+\w|class\s+\w|def\s+\w/.test(prompt)
  if (hasCode || words > 80) return 'complex'
  if (words < 15) return 'simple'
  return 'moderate'
}

async function tryLocal(prompt: string): Promise<string | null> {
  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gemma2:2b', prompt, stream: false }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) return null
    const data = await res.json() as { response?: string }
    return data.response || null
  } catch { return null }
}

async function tryCloud(prompt: string, config: ReturnType<typeof loadConfig>): Promise<string | null> {
  if (config.anthropic) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': config.anthropic, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 2048, messages: [{ role: 'user', content: prompt }] }),
    })
    if (res.ok) {
      const data = await res.json() as { content: Array<{ text: string }> }
      return data.content?.[0]?.text || null
    }
  }
  if (config.openai) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.openai}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }] }),
    })
    if (res.ok) {
      const data = await res.json() as { choices: Array<{ message: { content: string } }> }
      return data.choices?.[0]?.message?.content || null
    }
  }
  return null
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  if (req.method === 'POST' && req.url === '/v1/prompt') {
    const chunks: Buffer[] = []
    req.on('data', c => chunks.push(c))
    req.on('end', async () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString()) as { prompt?: string }
        if (!body.prompt) { res.writeHead(400); res.end(JSON.stringify({ error: 'prompt required' })); return }

        const config = loadConfig()
        const taskType = classifyTask(body.prompt)
        let output: string | null = null

        if (taskType !== 'complex') {
          output = await tryLocal(body.prompt)
          if (output && output.split(/\s+/).length < 10) output = null
        }

        if (!output) output = await tryCloud(body.prompt, config)
        if (!output) output = await tryLocal(body.prompt)
        if (!output) { res.writeHead(503); res.end(JSON.stringify({ error: 'No AI available' })); return }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ output }))
      } catch (e: any) {
        res.writeHead(500)
        res.end(JSON.stringify({ error: e.message }))
      }
    })
    return
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', version: '1.0.0' }))
    return
  }

  res.writeHead(404)
  res.end(JSON.stringify({ error: 'Not found' }))
})

server.listen(PORT, () => {
  console.log(`Ramanujan API running on http://localhost:${PORT}`)
  console.log(`POST /v1/prompt  { "prompt": "..." }`)
})
