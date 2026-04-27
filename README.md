# AI Desktop

A native macOS AI chat app — unified client for local and cloud models.

## Features

- 🖥️ **Local models** via Ollama (private, free, runs on your Mac)
- ☁️ **Cloud models** — Claude, ChatGPT, Gemini via API keys
- 💬 **One interface** — switch between all models from a single dropdown
- 📝 **Streaming responses** with markdown and syntax highlighting
- 🗂️ **Persistent chat history** via SQLite
- 🔐 **Secure key storage** in macOS Keychain
- 🎨 **Dark UI** with native macOS frameless window

## Prerequisites

- macOS 12.0+
- Node.js 18+
- npm 9+

## Quick Start

```bash
# Install dependencies
npm install

# Start in development mode (hot reload)
npm run dev
```

## Build for Production

```bash
# Build + package as .dmg
npm run dist
```

Output will be in `release/`.

## Project Structure

```
ai-desktop/
├── electron/
│   ├── main.ts           # Electron main process + IPC handlers
│   ├── preload.ts        # Context bridge (renderer ↔ main)
│   ├── ollama.ts         # Ollama process management + model pulling
│   ├── db.ts             # SQLite (better-sqlite3) chat history
│   ├── keychain.ts       # macOS Keychain API key storage
│   └── aiProviders.ts    # Streaming: Ollama, Claude, OpenAI, Gemini
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx       # Chat list + navigation
│   │   ├── ChatArea.tsx      # Main chat view + empty state
│   │   ├── MessageBubble.tsx # Markdown rendering + code blocks
│   │   ├── ModelPicker.tsx   # Model dropdown
│   │   └── InputBar.tsx      # Multiline input + send button
│   ├── pages/
│   │   ├── Onboarding.tsx    # 3-screen first-launch flow
│   │   ├── MainApp.tsx       # Root layout + state
│   │   └── Settings.tsx      # Models, appearance, data
│   ├── types.ts              # Shared TypeScript types
│   ├── electron.d.ts         # Window.electronAPI type declarations
│   └── App.tsx               # Onboarding vs main router
├── package.json
├── vite.config.ts
├── electron-builder.config.js
└── entitlements.mac.plist
```

## Adding Models

### Local (Ollama)
Settings → Models → Download any model from the list, or run:
```bash
ollama pull llama3.2
```

### Cloud
Settings → Models → Paste your API key → Test & Save

- **Claude**: Get key at [console.anthropic.com](https://console.anthropic.com)
- **OpenAI**: Get key at [platform.openai.com](https://platform.openai.com)
- **Gemini**: Get key at [aistudio.google.com](https://aistudio.google.com)

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘N | New chat |
| ⌘, | Settings |
| ⌘K | Switch model |
| Enter | Send message |
| ⇧Enter | New line |

## Technical Notes

- **Streaming**: All providers use server-sent events / async iterators
- **Security**: API keys stored in macOS Keychain via `keytar`, never in plain files
- **Database**: `better-sqlite3` (synchronous, fast, zero config)
- **Window**: Frameless with `hiddenInset` title bar for native macOS feel
- **Native modules**: `better-sqlite3` and `keytar` require rebuild for Electron ABI — handled by `electron-builder` automatically
