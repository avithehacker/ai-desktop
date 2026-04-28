# Ramanujan

AI that disappears into the tools you already use. You prompt. It figures out the rest.

Local models run on your machine. Cloud kicks in silently when needed. You never choose which — it just works.

---

## What's in this repo

```
ai-desktop/
├── electron/          # Desktop app (Mac, Windows, Linux)
├── cli/               # Terminal — ram "your question"
├── vscode/            # VS Code extension
├── api/               # HTTP API — POST /v1/prompt
└── .github/workflows/ # CI + release automation
```

---

## How routing works

Every prompt is classified silently:

| Type | What triggers it | Handled by |
|---|---|---|
| Simple / Moderate | Short questions, explanations | Local model first (Gemma 2B) |
| Complex | Code, long prompts | Local enhances prompt → cloud |
| Image | "draw", "generate image" | Cloud only |
| Search | "latest news", "today" | Cloud only |

If local gives a bad answer it escalates to cloud automatically. You never see any of this.

---

## Desktop app

Built with Electron + React + TypeScript.

**First launch:** installs Ollama and pulls Gemma 2B automatically. Forced — nothing skippable. Then connects one cloud provider (Claude, ChatGPT, or Gemini).

**Dev:**
```bash
npm install
npm run dev
```

**Build:**
```bash
npm run build
npx electron-builder --mac   # or --win or --linux
```

**Key files:**
- `electron/main.ts` — IPC handlers, app lifecycle
- `electron/router.ts` — prompt classification + routing logic
- `electron/installer.ts` — Ollama + Gemma 2B auto-install
- `electron/preload.ts` — context bridge (renderer ↔ main)
- `electron/aiProviders.ts` — streaming for Ollama / Claude / OpenAI / Gemini
- `electron/keychain.ts` — API keys stored in OS keychain (never plain files)
- `electron/db.ts` — SQLite chat history
- `src/pages/Onboarding.tsx` — forced setup flow (∑ icon, auto-installs)
- `src/pages/MainApp.tsx` — root layout
- `src/pages/Settings.tsx` — provider keys, appearance

---

## CLI — `ram`

```bash
# Ask anything
ram "explain this error"

# Pipe files
cat error.log | ram "summarise"

# Save API key
ram config --anthropic sk-ant-...

# Start HTTP API server
ram serve
```

**Install:**
```bash
cd cli
npm install
npm run build
npm link         # makes `ram` available globally
```

Or download binary from [Releases](https://github.com/avithehacker/ai-desktop/releases/latest).

---

## VS Code extension

- `Cmd+Shift+R` — ask about selected code
- `Cmd+Shift+E` — explain selection inline

**Build:**
```bash
cd vscode
npm install
npm run build
npx vsce package   # produces ramanujan-x.x.x.vsix
```

Install the `.vsix`: open VS Code → Extensions → `...` → Install from VSIX.

---

## HTTP API

```bash
# Start (requires ram CLI installed)
ram serve

# Or run directly
cd api && npx ts-node src/server.ts
```

```bash
# Use it
curl -X POST http://localhost:4242/v1/prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Fix this bug"}'

# Health check
curl http://localhost:4242/health
```

API keys read from `~/.ramanujan/config.json` (written by `ram config`).

---

## CI / Releases

**Every push to main** (`build.yml`):
- Builds Mac DMG, Windows EXE, Linux AppImage
- Packages VS Code VSIX
- Builds CLI binaries (Mac / Windows / Linux)

**On `v*` tag** (`release.yml`):
- Creates GitHub Release with all assets attached
- Publishes CLI to npm (needs `NPM_TOKEN` secret)
- Publishes extension to VS Code Marketplace (needs `VSCE_PAT` secret)

To release:
```bash
git tag v1.0.1
git push origin v1.0.1
```

---

## Config

API keys are stored at `~/.ramanujan/config.json`:
```json
{
  "anthropic": "sk-ant-...",
  "openai": "sk-...",
  "google": "AIza..."
}
```

Set via `ram config --anthropic YOUR_KEY` or through the app's onboarding.
