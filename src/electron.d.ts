import { Chat, Message, OllamaModel, PullProgress } from './types'

export interface ElectronAPI {
  isBrowserMode?: boolean

  // Chats
  listChats: () => Promise<Chat[]>
  getChat: (chatId: string) => Promise<Chat | null>
  createChat: (title: string) => Promise<Chat>
  deleteChat: (chatId: string) => Promise<void>
  renameChat: (chatId: string, title: string) => Promise<void>

  // Messages
  listMessages: (chatId: string) => Promise<Message[]>
  addMessage: (chatId: string, role: string, content: string, model: string) => Promise<Message>

  // API Keys
  getKey: (provider: string) => Promise<string | null>
  setKey: (provider: string, key: string) => Promise<void>
  deleteKey: (provider: string) => Promise<void>
  listConfiguredProviders: () => Promise<string[]>

  // Settings
  getSetting: (key: string) => Promise<string | null>
  setSetting: (key: string, value: string) => Promise<void>

  // Ollama
  ollamaStatus: () => Promise<{ installed: boolean; running: boolean; models: OllamaModel[] }>
  ollamaListModels: () => Promise<OllamaModel[]>
  ollamaPullModel: (name: string) => Promise<void>
  ollamaDeleteModel: (name: string) => Promise<void>
  onOllamaPullProgress: (cb: (progress: PullProgress) => void) => () => void

  // Installer
  installOllama: () => Promise<void>
  pullDefaultModel: () => Promise<void>
  onInstallProgress: (cb: (progress: any) => void) => () => void

  // AI (auto-routed)
  streamMessage: (payload: {
    messages: Array<{ role: string; content: string }>
    chatId: string
  }) => Promise<void>
  testApiKey: (provider: string, key: string) => Promise<{ ok: boolean; error?: string }>

  onStreamChunk: (cb: (data: { chatId: string; chunk: string }) => void) => () => void
  onStreamDone: (cb: (data: { chatId: string; fullText: string }) => void) => () => void
  onStreamError: (cb: (data: { chatId: string; error: string }) => void) => () => void

  // WebLLM (browser mode only)
  onLocalModelProgress?: (cb: (data: { text: string; progress: number }) => void) => () => void
  webllmAvailable?: () => boolean

  // Shortcuts
  onShortcut: (shortcut: string, cb: () => void) => () => void

  // Misc
  getAppVersion: () => Promise<string>
  openExternal: (url: string) => Promise<void>
  completeOnboarding: () => Promise<void>
  getOnboardingStatus: () => Promise<string | null>

  // GitHub Device Flow OAuth
  githubStartDeviceFlow: () => Promise<{
    device_code: string
    user_code: string
    verification_uri: string
    interval: number
    expires_in: number
    error?: string
  }>
  githubPollDeviceFlow: (deviceCode: string) => Promise<{ ok: boolean; error?: string }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
