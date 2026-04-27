import { contextBridge, ipcRenderer } from 'electron'

// Expose a safe API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Chats
  listChats: () => ipcRenderer.invoke('chat:list'),
  getChat: (chatId: string) => ipcRenderer.invoke('chat:get', chatId),
  createChat: (title: string) => ipcRenderer.invoke('chat:create', title),
  deleteChat: (chatId: string) => ipcRenderer.invoke('chat:delete', chatId),
  renameChat: (chatId: string, title: string) => ipcRenderer.invoke('chat:rename', chatId, title),

  // Messages
  listMessages: (chatId: string) => ipcRenderer.invoke('messages:list', chatId),
  addMessage: (chatId: string, role: string, content: string, model: string) =>
    ipcRenderer.invoke('messages:add', chatId, role, content, model),

  // API Keys
  getKey: (provider: string) => ipcRenderer.invoke('keys:get', provider),
  setKey: (provider: string, key: string) => ipcRenderer.invoke('keys:set', provider, key),
  deleteKey: (provider: string) => ipcRenderer.invoke('keys:delete', provider),
  listConfiguredProviders: () => ipcRenderer.invoke('keys:list'),

  // Settings
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),

  // Ollama
  ollamaStatus: () => ipcRenderer.invoke('ollama:status'),
  ollamaListModels: () => ipcRenderer.invoke('ollama:list-models'),
  ollamaPullModel: (name: string) => ipcRenderer.invoke('ollama:pull-model', name),
  ollamaDeleteModel: (name: string) => ipcRenderer.invoke('ollama:delete-model', name),
  onOllamaPullProgress: (cb: (progress: any) => void) => {
    ipcRenderer.on('ollama:pull-progress', (_e, progress) => cb(progress))
    return () => ipcRenderer.removeAllListeners('ollama:pull-progress')
  },

  // AI Streaming
  streamMessage: (payload: {
    provider: string
    model: string
    messages: Array<{ role: string; content: string }>
    chatId: string
  }) => ipcRenderer.invoke('ai:stream', payload),

  testApiKey: (provider: string, key: string) => ipcRenderer.invoke('ai:test-key', provider, key),

  onStreamChunk: (cb: (data: { chatId: string; chunk: string }) => void) => {
    const handler = (_e: any, data: any) => cb(data)
    ipcRenderer.on('ai:stream-chunk', handler)
    return () => ipcRenderer.removeListener('ai:stream-chunk', handler)
  },
  onStreamDone: (cb: (data: { chatId: string; fullText: string }) => void) => {
    const handler = (_e: any, data: any) => cb(data)
    ipcRenderer.on('ai:stream-done', handler)
    return () => ipcRenderer.removeListener('ai:stream-done', handler)
  },
  onStreamError: (cb: (data: { chatId: string; error: string }) => void) => {
    const handler = (_e: any, data: any) => cb(data)
    ipcRenderer.on('ai:stream-error', handler)
    return () => ipcRenderer.removeListener('ai:stream-error', handler)
  },

  // Shortcuts
  onShortcut: (shortcut: string, cb: () => void) => {
    ipcRenderer.on(`shortcut:${shortcut}`, cb)
    return () => ipcRenderer.removeListener(`shortcut:${shortcut}`, cb)
  },

  // Misc
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  openExternal: (url: string) => ipcRenderer.invoke('shell:open', url),
  completeOnboarding: () => ipcRenderer.invoke('onboarding:complete'),
  getOnboardingStatus: () => ipcRenderer.invoke('onboarding:status'),
})
