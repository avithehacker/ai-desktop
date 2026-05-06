#!/usr/bin/env node
/**
 * ram — Ramanujan CLI
 * Usage:
 *   ram "your question"
 *   cat file.txt | ram "summarise this"
 *   ram "explain this" --file error.log
 */

import * as readline from 'readline'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const CONFIG_PATH = path.join(os.homedir(), '.ramanujan', 'config.json')

interface Config {
  anthropic?: string
  openai?: string
  google?: string
}

function loadConfig(): Config {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
  } catch {
    return {}
  }
}

function classifyTask(prompt: string): 'simple' | 'moderate' | 'complex' {
  const words = prompt.trim().split(/\s+/).length
  const hasCode = /```|function\s+\w|class\s+\w|def\s+\w|import\s+\w/.test(prompt)
  if (hasCode || words > 80) return 'complex'
  if (words < 15) return 'simple'
  return 'moderate'
}

async function tryLocal(prompt: string): Promise<string | null> {
  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama3.2:1b', prompt, stream: false }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) return null
    const data = await res.json() as { response?: string }
    return data.response || null
  } catch {
    return null
  }
}

async function tryCloud(prompt: string, config: Config): Promise<string | null> {
  if (config.anthropic) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': config.anthropic,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 2048,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (res.ok) {
        const data = await res.json() as { content: Array<{ text: string }> }
        return data.content?.[0]?.text || null
      }
    } catch {}
  }

  if (config.openai) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${config.openai}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }] }),
      })
      if (res.ok) {
        const data = await res.json() as { choices: Array<{ message: { content: string } }> }
        return data.choices?.[0]?.message?.content || null
      }
    } catch {}
  }

  return null
}

async function serve() {
  const http = await import('http')
  const PORT = parseInt(process.env.RAM_PORT || '4242', 10)
  const config = loadConfig()

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', version: '1.0.0' }))
      return
    }

    if (req.method === 'POST' && req.url === '/v1/prompt') {
      const chunks: Buffer[] = []
      req.on('data', (c: Buffer) => chunks.push(c))
      req.on('end', async () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString()) as { prompt?: string }
          if (!body.prompt) { res.writeHead(400); res.end(JSON.stringify({ error: 'prompt required' })); return }

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

    res.writeHead(404)
    res.end(JSON.stringify({ error: 'Not found' }))
  })

  server.listen(PORT, () => {
    console.log(`Ramanujan API running on http://localhost:${PORT}`)
    console.log(`POST /v1/prompt  { "prompt": "..." }`)
  })
}

async function main() {
  const args = process.argv.slice(2)

  // ram serve
  if (args[0] === 'serve') {
    await serve()
    return
  }

  // ram config --anthropic sk-ant-...
  if (args[0] === 'config') {
    const config = loadConfig()
    for (let i = 1; i < args.length; i += 2) {
      const key = args[i].replace('--', '') as keyof Config
      const val = args[i + 1]
      if (val) config[key] = val
    }
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true })
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
    console.log('Config saved.')
    return
  }

  let prompt = args.join(' ')

  // Read from stdin if piped
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = []
    for await (const chunk of process.stdin) chunks.push(chunk)
    const stdin = Buffer.concat(chunks).toString().trim()
    prompt = stdin + (prompt ? `\n\n${prompt}` : '')
  }

  if (!prompt) {
    console.error('Usage: ram "your question"')
    process.exit(1)
  }

  const config = loadConfig()
  const taskType = classifyTask(prompt)

  // Simple/moderate → try local first
  if (taskType !== 'complex') {
    const local = await tryLocal(prompt)
    if (local && local.split(/\s+/).length > 10) {
      process.stdout.write(local + '\n')
      return
    }
  }

  // Cloud fallback
  const cloud = await tryCloud(prompt, config)
  if (cloud) {
    process.stdout.write(cloud + '\n')
    return
  }

  // Last resort: local regardless of quality
  const local = await tryLocal(prompt)
  if (local) {
    process.stdout.write(local + '\n')
    return
  }

  console.error('No AI available. Run: ram config --anthropic YOUR_KEY')
  process.exit(1)
}

main().catch(err => { console.error(err.message); process.exit(1) })
