# Graph Report - .  (2026-05-20)

## Corpus Check
- Corpus is ~32,012 words - fits in a single context window. You may not need a graph.

## Summary
- 471 nodes · 613 edges · 29 communities (25 shown, 4 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.85)
- Token cost: 28,300 input · 6,600 output

## Community Hubs (Navigation)
- [[_COMMUNITY_UI Chat Components|UI Chat Components]]
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_Electron AI Providers|Electron AI Providers]]
- [[_COMMUNITY_Browser Runtime API|Browser Runtime API]]
- [[_COMMUNITY_AI Provider Streaming|AI Provider Streaming]]
- [[_COMMUNITY_VS Code Extension Config|VS Code Extension Config]]
- [[_COMMUNITY_Standalone API Server|Standalone API Server]]
- [[_COMMUNITY_CLI Package|CLI Package]]
- [[_COMMUNITY_Root TypeScript Config|Root TypeScript Config]]
- [[_COMMUNITY_SQLite Database Layer|SQLite Database Layer]]
- [[_COMMUNITY_Electron Build Config|Electron Build Config]]
- [[_COMMUNITY_Build Scripts|Build Scripts]]
- [[_COMMUNITY_Node TypeScript Config|Node TypeScript Config]]
- [[_COMMUNITY_Onboarding UI|Onboarding UI]]
- [[_COMMUNITY_CLI TypeScript Config|CLI TypeScript Config]]
- [[_COMMUNITY_Architecture Concepts|Architecture Concepts]]
- [[_COMMUNITY_VS Code TypeScript Config|VS Code TypeScript Config]]
- [[_COMMUNITY_CLI Source Entry|CLI Source Entry]]
- [[_COMMUNITY_API Server Source|API Server Source]]
- [[_COMMUNITY_VS Code Extension Source|VS Code Extension Source]]
- [[_COMMUNITY_Claude Settings|Claude Settings]]
- [[_COMMUNITY_Build Pipeline Manifests|Build Pipeline Manifests]]
- [[_COMMUNITY_Electron Builder Config|Electron Builder Config]]
- [[_COMMUNITY_CSS Config|CSS Config]]
- [[_COMMUNITY_Ollama Module|Ollama Module]]

## God Nodes (most connected - your core abstractions)
1. `DatabaseManager` - 23 edges
2. `compilerOptions` - 18 edges
3. `OllamaManager` - 15 edges
4. `route()` - 15 edges
5. `compilerOptions` - 12 edges
6. `KeychainManager` - 12 edges
7. `build` - 10 edges
8. `Message` - 10 edges
9. `compilerOptions` - 9 edges
10. `compilerOptions` - 9 edges

## Surprising Connections (you probably didn't know these)
- `OllamaManager` --implements--> `Local-first AI strategy — use local Ollama/WebLLM, escalate to cloud only when needed`  [INFERRED]
  electron/ollama.ts → README.md
- `vite.config.ts — Vite build configuration` --references--> `index.html — Vite app entry HTML`  [INFERRED]
  vite.config.ts → index.html
- `App Logo (Sigma Icon)` --rationale_for--> `index.html — Vite app entry HTML`  [INFERRED]
  public/logo.png → index.html
- `README.md — Project documentation` --references--> `electron/main.ts — Electron main process, IPC handlers`  [EXTRACTED]
  README.md → electron/main.ts
- `README.md — Project documentation` --references--> `electron/router.ts — AI prompt classification and model routing`  [EXTRACTED]
  README.md → electron/router.ts

## Hyperedges (group relationships)
- **AI Routing Pipeline — classify, score, select, stream, fallback, log** — electron_router_rulebasedclassify, electron_router_scoremodels, electron_aiproviders_streamresponse, electron_router_isbadresponse, electron_db_databasemanager [EXTRACTED 1.00]
- **Electron IPC Bridge — preload contextBridge mediating renderer <-> main communication** — electron_preload, electron_main, concept_context_isolation [EXTRACTED 1.00]
- **Ollama Lifecycle — installer, manager, and default model form the local AI setup flow** — electron_installer_ensureollamainstalled, electron_ollama_ollamamanager, electron_installer_pulldefaultmodel [EXTRACTED 1.00]
- **Local-First AI Routing Triad (CLI, API Server, Browser)** — cli_src_index_classify_task, api_src_server_classify_task, src_browser_api_classify [INFERRED 0.90]
- **Shared ~/.ramanujan/config.json Across CLI, API, VS Code** — cli_src_index_load_config, api_src_server_load_config, vscode_src_extension_load_config, concept_ramanujan_config_file [EXTRACTED 1.00]
- **ElectronAPI Interface + BrowserAPI Factory — Dual Platform Bridge** — src_electron_d_electron_api_interface, src_browser_api_create_browser_api, concept_electron_api_bridge [INFERRED 0.95]

## Communities (29 total, 4 thin omitted)

### Community 0 - "UI Chat Components"
Cohesion: 0.06
Nodes (49): ChatArea(), ChatAreaProps, InputBar(), InputBarProps, readAs(), readFile(), CodeBlock(), md (+41 more)

### Community 1 - "Package Dependencies"
Cohesion: 0.05
Nodes (37): author, email, name, dependencies, better-sqlite3, keytar, description, devDependencies (+29 more)

### Community 2 - "Electron AI Providers"
Cohesion: 0.09
Nodes (24): Context Isolation — Electron contextBridge pattern for renderer/main process security boundary, testApiKey(), downloadFile(), ensureOllamaInstalled(), execAsync, installOllamaLinux(), installOllamaMac(), installOllamaWindows() (+16 more)

### Community 3 - "Browser Runtime API"
Cohesion: 0.08
Nodes (25): chats(), ChunkCb, chunkCbs, classify(), createBrowserAPI(), DoneCb, doneCbs, ErrCb (+17 more)

### Community 4 - "AI Provider Streaming"
Cohesion: 0.10
Nodes (25): Adaptive Model Weights — routing weights updated based on response quality and fallback events, Message, Provider, readSSE(), streamAnthropic(), streamGemini(), streamOllama(), streamOpenAI() (+17 more)

### Community 5 - "VS Code Extension Config"
Cohesion: 0.07
Nodes (29): activationEvents, categories, contributes, commands, keybindings, menus, description, devDependencies (+21 more)

### Community 6 - "Standalone API Server"
Cohesion: 0.10
Nodes (25): API classifyTask, API loadConfig (env + file merge), Ramanujan API Server (standalone), API tryCloud (Anthropic/OpenAI), API tryLocal (Ollama gemma2:2b), CLI classifyTask, CLI loadConfig (~/.ramanujan/config.json), CLI Entry Point (main) (+17 more)

### Community 7 - "CLI Package"
Cohesion: 0.08
Nodes (23): bin, ram, description, devDependencies, ts-node, @types/node, typescript, @yao-pkg/pkg (+15 more)

### Community 8 - "Root TypeScript Config"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleResolution (+13 more)

### Community 9 - "SQLite Database Layer"
Cohesion: 0.11
Nodes (4): Chat, DatabaseManager, generateId(), Message

### Community 10 - "Electron Build Config"
Cohesion: 0.10
Nodes (20): build, afterPack, appId, asarUnpack, files, icon, linux, mac (+12 more)

### Community 11 - "Build Scripts"
Cohesion: 0.11
Nodes (17): { execSync }, compilerOptions, esModuleInterop, module, moduleResolution, noUnusedLocals, noUnusedParameters, outDir (+9 more)

### Community 12 - "Node TypeScript Config"
Cohesion: 0.14
Nodes (16): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include, App Logo (Sigma Icon) (+8 more)

### Community 13 - "Onboarding UI"
Cohesion: 0.15
Nodes (8): CardProps, FREE_PROVIDERS, OnboardingProps, PAID_PROVIDERS, PROVIDERS, ProviderState, Screen, StepState

### Community 14 - "CLI TypeScript Config"
Cohesion: 0.18
Nodes (10): compilerOptions, esModuleInterop, lib, module, outDir, rootDir, skipLibCheck, strict (+2 more)

### Community 15 - "Architecture Concepts"
Cohesion: 0.20
Nodes (11): AI Router — Rule-based prompt classification and model selection with adaptive learning, Keychain Fallback — uses OS keytar first, falls back to in-memory map if unavailable, Local-first AI strategy — use local Ollama/WebLLM, escalate to cloud only when needed, WebLLM — In-browser local inference via WebGPU (no install required), electron/db.ts — DatabaseManager: SQLite chat/message/routing history, electron/installer.ts — Ollama auto-install and default model pull, electron/keychain.ts — KeychainManager: OS keychain API key storage, electron/aiProviders.ts — Multi-provider streaming (Ollama/Anthropic/OpenAI/Gemini/GitHub) (+3 more)

### Community 16 - "VS Code TypeScript Config"
Cohesion: 0.18
Nodes (10): compilerOptions, esModuleInterop, lib, module, outDir, rootDir, skipLibCheck, strict (+2 more)

### Community 17 - "CLI Source Entry"
Cohesion: 0.39
Nodes (8): classifyTask(), Config, CONFIG_PATH, loadConfig(), main(), serve(), tryCloud(), tryLocal()

### Community 18 - "API Server Source"
Cohesion: 0.25
Nodes (3): CONFIG_PATH, PORT, server

### Community 19 - "VS Code Extension Source"
Cohesion: 0.40
Nodes (3): askRamanujan(), CONFIG_PATH, loadConfig()

### Community 21 - "Build Pipeline Manifests"
Cohesion: 0.67
Nodes (3): Ramanujan CLI Package (ram), VS Code Extension Manifest (ramanujan), GitHub Actions CI/CD Build Pipeline

## Knowledge Gaps
- **226 isolated node(s):** `composite`, `skipLibCheck`, `module`, `moduleResolution`, `allowSyntheticDefaultImports` (+221 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createBrowserAPI() Factory` connect `Standalone API Server` to `UI Chat Components`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `WEBLLM_AVAILABLE_MODELS` connect `UI Chat Components` to `Browser Runtime API`, `Standalone API Server`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `OllamaManager` (e.g. with `Local-first AI strategy — use local Ollama/WebLLM, escalate to cloud only when needed` and `streamOllama()`) actually correct?**
  _`OllamaManager` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `composite`, `skipLibCheck`, `module` to the rest of the system?**
  _228 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Chat Components` be split into smaller, more focused modules?**
  _Cohesion score 0.06284153005464481 - nodes in this community are weakly interconnected._
- **Should `Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `Electron AI Providers` be split into smaller, more focused modules?**
  _Cohesion score 0.09009009009009009 - nodes in this community are weakly interconnected._