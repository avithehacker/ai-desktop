import * as vscode from 'vscode'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'

const CONFIG_PATH = path.join(os.homedir(), '.ramanujan', 'config.json')

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) } catch { return {} }
}

async function askRamanujan(prompt: string): Promise<string> {
  // Try local first
  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gemma2:2b', prompt, stream: false }),
      signal: AbortSignal.timeout(20000),
    })
    if (res.ok) {
      const data = await res.json() as { response?: string }
      if (data.response && data.response.split(/\s+/).length > 10) return data.response
    }
  } catch {}

  // Cloud fallback
  const config = loadConfig()
  if (config.anthropic) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': config.anthropic, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 2048, messages: [{ role: 'user', content: prompt }] }),
    })
    if (res.ok) {
      const data = await res.json() as { content: Array<{ text: string }> }
      return data.content?.[0]?.text || 'No response.'
    }
  }

  throw new Error('No AI available. Run: ram config --anthropic YOUR_KEY')
}

export function activate(context: vscode.ExtensionContext) {
  // Ask about selection
  const askCmd = vscode.commands.registerCommand('ramanujan.ask', async () => {
    const editor = vscode.window.activeTextEditor
    const selected = editor?.document.getText(editor.selection)

    const question = await vscode.window.showInputBox({
      prompt: selected ? `Ask about: "${selected.slice(0, 60)}…"` : 'Ask Ramanujan anything',
      placeHolder: 'What does this do?',
    })
    if (!question) return

    const prompt = selected ? `${question}\n\nCode:\n${selected}` : question

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Ramanujan', cancellable: false },
      async () => {
        try {
          const answer = await askRamanujan(prompt)
          const panel = vscode.window.createWebviewPanel('ramanujan', 'Ramanujan', vscode.ViewColumn.Beside, {})
          panel.webview.html = `<html><body style="font-family:system-ui;padding:20px;white-space:pre-wrap">${answer.replace(/</g, '&lt;')}</body></html>`
        } catch (e: any) {
          vscode.window.showErrorMessage(e.message)
        }
      }
    )
  })

  // Explain selection inline
  const explainCmd = vscode.commands.registerCommand('ramanujan.explain', async () => {
    const editor = vscode.window.activeTextEditor
    if (!editor) return
    const selected = editor.document.getText(editor.selection)
    if (!selected) { vscode.window.showWarningMessage('Select some code first.'); return }

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Ramanujan: explaining…', cancellable: false },
      async () => {
        try {
          const answer = await askRamanujan(`Explain this code briefly:\n\n${selected}`)
          vscode.window.showInformationMessage(answer.slice(0, 300))
        } catch (e: any) {
          vscode.window.showErrorMessage(e.message)
        }
      }
    )
  })

  context.subscriptions.push(askCmd, explainCmd)
}

export function deactivate() {}
