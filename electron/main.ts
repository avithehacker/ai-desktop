import { app, BrowserWindow, ipcMain, shell, Menu, Tray, nativeImage } from 'electron'
import * as path from 'path'
import { OllamaManager } from './ollama'
import { DatabaseManager } from './db'
import { KeychainManager } from './keychain'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let ollamaManager: OllamaManager
let db: DatabaseManager
let keychain: KeychainManager

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Register global shortcuts
  const { globalShortcut } = require('electron')
  globalShortcut.register('CommandOrControl+N', () => {
    mainWindow?.webContents.send('shortcut:new-chat')
  })
  globalShortcut.register('CommandOrControl+K', () => {
    mainWindow?.webContents.send('shortcut:switch-model')
  })
}

function createTray() {
  // Create a simple tray icon
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.setToolTip('Ramanujan')
  tray.on('click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}

app.whenReady().then(async () => {
  db = new DatabaseManager()
  keychain = new KeychainManager()
  ollamaManager = new OllamaManager()

  createWindow()

  // Start Ollama if installed
  try {
    await ollamaManager.ensureRunning()
  } catch (e) {
    console.log('Ollama not available:', e)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  const { globalShortcut } = require('electron')
  globalShortcut.unregisterAll()
})

// ── IPC: Chats ────────────────────────────────────────────────────────────────

ipcMain.handle('chat:list', () => db.listChats())
ipcMain.handle('chat:get', (_e, chatId: string) => db.getChat(chatId))
ipcMain.handle('chat:create', (_e, title: string) => db.createChat(title))
ipcMain.handle('chat:delete', (_e, chatId: string) => db.deleteChat(chatId))
ipcMain.handle('chat:rename', (_e, chatId: string, title: string) => db.renameChat(chatId, title))
ipcMain.handle('messages:list', (_e, chatId: string) => db.listMessages(chatId))
ipcMain.handle('messages:add', (_e, chatId: string, role: string, content: string, model: string) =>
  db.addMessage(chatId, role, content, model)
)

// ── IPC: API Keys ─────────────────────────────────────────────────────────────

ipcMain.handle('keys:get', (_e, provider: string) => keychain.get(provider))
ipcMain.handle('keys:set', (_e, provider: string, key: string) => keychain.set(provider, key))
ipcMain.handle('keys:delete', (_e, provider: string) => keychain.delete(provider))
ipcMain.handle('keys:list', () => keychain.listConfigured())

// ── IPC: Settings ─────────────────────────────────────────────────────────────

ipcMain.handle('settings:get', (_e, key: string) => db.getSetting(key))
ipcMain.handle('settings:set', (_e, key: string, value: string) => db.setSetting(key, value))

// ── IPC: Ollama ───────────────────────────────────────────────────────────────

ipcMain.handle('ollama:status', () => ollamaManager.getStatus())
ipcMain.handle('ollama:list-models', () => ollamaManager.listModels())
ipcMain.handle('ollama:delete-model', (_e, name: string) => ollamaManager.deleteModel(name))

ipcMain.handle('ollama:pull-model', async (event, modelName: string) => {
  return ollamaManager.pullModel(modelName, (progress) => {
    event.sender.send('ollama:pull-progress', progress)
  })
})

// ── IPC: Cloud AI ─────────────────────────────────────────────────────────────

ipcMain.handle('ai:test-key', async (_e, provider: string, key: string) => {
  const { testApiKey } = require('./aiProviders')
  return testApiKey(provider, key)
})

// ── IPC: Streaming ────────────────────────────────────────────────────────────

ipcMain.handle('ai:stream', async (event, payload: {
  provider: string
  model: string
  messages: Array<{ role: string; content: string }>
  chatId: string
}) => {
  const { streamResponse } = require('./aiProviders')
  
  try {
    await streamResponse(
      payload.provider,
      payload.model,
      payload.messages,
      async (chunk: string) => {
        event.sender.send('ai:stream-chunk', { chatId: payload.chatId, chunk })
      },
      async (fullText: string) => {
        event.sender.send('ai:stream-done', { chatId: payload.chatId, fullText })
      },
      (error: string) => {
        event.sender.send('ai:stream-error', { chatId: payload.chatId, error })
      },
      keychain
    )
  } catch (err: any) {
    event.sender.send('ai:stream-error', { chatId: payload.chatId, error: err.message })
  }
})

// ── IPC: Misc ─────────────────────────────────────────────────────────────────

ipcMain.handle('app:version', () => app.getVersion())
ipcMain.handle('shell:open', (_e, url: string) => shell.openExternal(url))
ipcMain.handle('onboarding:complete', () => db.setSetting('onboarding_complete', 'true'))
ipcMain.handle('onboarding:status', () => db.getSetting('onboarding_complete'))
