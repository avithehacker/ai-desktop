# Ramanujan — Build History

A chronological record of everything built in this project.

---

## Phase 1 — Foundation (Apr 27)

### Initial Commit
- Created the `ai-desktop` repo as a unified AI chat client
- Set up Electron + React + TypeScript + Vite + Tailwind stack
- Established project structure: `electron/`, `src/`, `api/`, `cli/`, `vscode/`

### Ramanujan Theme
- Renamed project to **Ramanujan**
- Applied portfolio typography and white minimalist design
- Fixed Ollama crash on startup

### CI Groundwork
- Added GitHub Actions workflow (`.github/workflows/`)
- Fixed artifact paths to `dist/`, added Windows target
- Fixed `db.ts` crypto import error
- Switched from `npm ci` to `npm install` (no lockfile at that stage)

---

## Phase 2 — Full Platform Build (Apr 28)

### Smart LLM Router
- Built `electron/router.ts` — prompt classification + routing logic
- Adaptive weight learning: router improves based on response quality
- Routing table:
  - Simple / Moderate → local model first (Gemma 2B via Ollama)
  - Complex → local enhances prompt → escalates to cloud
  - Image / Search → cloud only
- Router silently escalates if local answer quality is low

### Full Platform (CLI + VS Code + HTTP API)
- **CLI (`cli/`)** — `ram` command: ask questions, pipe files, configure keys, start server
- **VS Code Extension (`vscode/`)** — `Cmd+Shift+R` ask, `Cmd+Shift+E` explain selected code
- **HTTP API (`api/`)** — `POST /v1/prompt` and `GET /health` at port 4242
- **Electron (`electron/`)** key files:
  - `main.ts` — IPC handlers, app lifecycle
  - `installer.ts` — auto-installs Ollama + pulls Gemma 2B on first launch
  - `aiProviders.ts` — streaming for Ollama / Claude / OpenAI / Gemini
  - `keychain.ts` — API keys stored in OS keychain (never plain files)
  - `db.ts` — SQLite chat history

### Forced Onboarding & App Icon
- First launch forces Ollama + Gemma 2B installation (nothing skippable)
- Connects one cloud provider (Claude, ChatGPT, or Gemini) during setup
- Added app icon (`build/` assets)
- Removed Gemini from initial onboarding (added back later)

### README Rewrite
- Documented all four platforms: Desktop, CLI, VS Code, HTTP API
- Documented CI/release pipeline and config file format

### Release Pipeline Fixes (multiple commits)
- Fixed `@yao-pkg/pkg` for Node 18 binary targets
- Fixed `mkdir binaries` before pkg build
- Added `LICENSE` for VS Code Marketplace publish
- Made npm and vsce publish optional (GitHub Release always runs on tag)
- Fixed Linux `.deb` author email requirement
- Restructured release to produce native CLI binaries per OS + Linux AppImage
- Fixed ICO 256 encoding for Windows icon
- Fixed `App.tsx` race condition on startup
- Fixed all `npm audit` vulnerabilities

---

## Phase 3 — UX & Provider Polish (May 5)

### Electron 41 Compatibility
- Fixed `app.dock` optional chaining for Electron 41 types
- Fixed `dist` build working correctly with Electron 41

### New Providers & Onboarding
- Added **Google Gemini** to the onboarding cloud provider step
- Added restart onboarding button in **Settings > Data**

### GitHub OAuth (Device Flow)
- Added GitHub login via Device Flow (no redirect URI needed)
- Added ability to **skip onboarding** for returning users

### Minimalist Chat UI
- Redesigned chat interface — cleaner, faster-feeling layout
- Improved local model speed and routing response time

### Multi-Platform CI
- Fixed bundle size issues
- Added full multi-platform CI release workflow (Mac DMG, Windows EXE, Linux AppImage, VSIX, CLI binaries)

---

## Phase 4 — Web App Mode (May 6)

### Pure Web App
- Made the entire app run as a **zero-download web app** (no Electron required)
- Implemented `src/browserAPI.ts` — browser-compatible API layer that mirrors the Electron IPC bridge
- App detects context (Electron vs browser) and switches API layer automatically

### Bundle Size Optimisation
- Shrunk desktop Electron bundle from **~3 GB → ~115 MB**
- Removed unnecessary native dependencies from the packaged app

### WebLLM — In-Browser Local Inference
- Integrated **WebLLM** for running local models directly in the browser (no install)
- Works across all browsers that support WebGPU
- Enables fully offline AI inference without Ollama

### Downloads Tab
- Added a **Downloads** tab in Settings (browser mode)
- Lists available model downloads for WebLLM

### Bug Fixes (web app)
- Fixed three bugs discovered during web app testing

### HTTPS → Ollama Limitation
- Documented the HTTPS-to-Ollama limitation (browsers block mixed content)
- Added in-app explanation with fix instructions

### Provider & Router Fixes
- Added Google Gemini to the router (was missing after earlier removal)
- Settings now shows **all free providers** (not just paid ones)

### System Prompt Rewrite
- Rewrote the system prompt to produce simpler, friendlier responses
- Removed verbose/formal tone from default AI persona

---

## Phase 5 — WebLLM Model Management (May 6)

### Multi-Model Switcher
- Added `WEBLLM_AVAILABLE_MODELS` list with 7 models selectable from Settings:
  - Llama 3.2 1B (700 MB) — default, runs on most devices
  - Llama 3.2 3B (2.0 GB)
  - Phi 3.5 Mini (2.2 GB) — Microsoft, strong reasoning
  - Gemma 2 2B (1.4 GB) — Google
  - Qwen 2.5 1.5B (900 MB) — Alibaba, multilingual
  - SmolLM2 1.7B (1.0 GB) — lightweight
  - Mistral 7B (4.3 GB) — high quality, needs 8 GB+ RAM
- Active model stored in `localStorage` (`rj:webllm:model`), persists across sessions
- Engine detects model switches and resets the WebGPU context automatically

### Remove & Reset Controls
- **Reset** — calls `engine.resetChat()` to clear conversation memory without re-downloading
- **Remove** — unloads engine from GPU/RAM + calls `deleteModelAllInfoInCache()` to delete cached model files from browser, freeing disk space. Resets active model to default.
- Both buttons shown only on the currently active model card

### Memory Safety
- Switching models now calls `engine.unload()` before loading the new one — prevents two models occupying GPU memory simultaneously
- Closing the browser tab releases all GPU/RAM (WebGPU context destroyed by browser)
- Downloaded model files persist in browser Cache API across sessions (no re-download needed)

### Bug Fix
- Fixed crash when clicking "Download" on Ollama models in browser mode — was throwing "Ollama could not be started. Please restart the app." Now shows a clear message directing users to WebLLM models instead.

---

## Current State (May 6)

| Component | Status |
|---|---|
| Electron desktop app | Working — Mac, Windows, Linux |
| Web app (browser) | Working — zero install, WebLLM in-browser inference |
| WebLLM model switcher | Working — 7 models, Load / Reset / Remove controls |
| CLI (`ram`) | Working — ask, pipe, config, serve |
| VS Code extension | Working — packaged as `.vsix` |
| HTTP API | Working — `POST /v1/prompt` |
| Smart router | Working — local-first, cloud escalation, Gemini added |
| CI/CD pipeline | Working — build on push, release on `v*` tag |
| Onboarding | Working — forced setup, GitHub OAuth, skip option |
| Settings | Working — providers, appearance, data, downloads |
