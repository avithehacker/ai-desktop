import React, { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import ChatArea from '../components/ChatArea'
import Settings from './Settings'
import { Chat, Message, ModelOption, CLOUD_MODELS, OllamaModel, Provider } from '../types'

type View = 'chat' | 'settings'

export default function MainApp() {
  const [view, setView] = useState<View>('chat')
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('phi3:mini')
  const [selectedProvider, setSelectedProvider] = useState<Provider>('ollama')
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [streamError, setStreamError] = useState('')

  const api = window.electronAPI

  // Load initial data
  useEffect(() => {
    loadChats()
    loadModels()
  }, [])

  // Load messages when chat changes
  useEffect(() => {
    if (activeChatId) loadMessages(activeChatId)
    else setMessages([])
  }, [activeChatId])

  // Register streaming listeners
  useEffect(() => {
    if (!api) return
    const cleanChunk = api.onStreamChunk(({ chatId, chunk }) => {
      if (chatId === activeChatId) {
        setStreamingText(prev => prev + chunk)
      }
    })
    const cleanDone = api.onStreamDone(async ({ chatId, fullText }) => {
      if (chatId === activeChatId) {
        setIsStreaming(false)
        setStreamingText('')
        // Save AI message to DB
        await api.addMessage(chatId, 'assistant', fullText, selectedModel)
        await loadMessages(chatId)
        await loadChats()
      }
    })
    const cleanError = api.onStreamError(({ chatId, error }) => {
      if (chatId === activeChatId) {
        setIsStreaming(false)
        setStreamingText('')
        setStreamError(error)
      }
    })
    return () => { cleanChunk(); cleanDone(); cleanError() }
  }, [activeChatId, selectedModel, api])

  // Register shortcuts
  useEffect(() => {
    if (!api) return
    const cleanN = api.onShortcut('new-chat', handleNewChat)
    const cleanSettings = api.onShortcut('open-settings', () => setView('settings'))
    return () => { cleanN(); cleanSettings() }
  }, [api])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        handleNewChat()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        setView(v => v === 'settings' ? 'chat' : 'settings')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const loadChats = async () => {
    if (!api) return
    const list = await api.listChats()
    setChats(list)
  }

  const loadMessages = async (chatId: string) => {
    if (!api) return
    const msgs = await api.listMessages(chatId)
    setMessages(msgs)
  }

  const loadModels = async () => {
    if (!api) return

    const models: ModelOption[] = []

    // Local models
    try {
      const ollamaStatus = await api.ollamaStatus()
      if (ollamaStatus.running && ollamaStatus.models.length > 0) {
        for (const m of ollamaStatus.models) {
          models.push({
            id: m.name,
            name: m.name.split(':')[0],
            provider: 'ollama',
            description: 'Local · Free',
            isLocal: true,
            available: true,
          })
        }
      }
    } catch {}

    // Cloud models
    const configured = await api.listConfiguredProviders()
    for (const m of CLOUD_MODELS) {
      models.push({ ...m, available: configured.includes(m.provider) })
    }

    setAvailableModels(models)

    // Set default model
    if (models.length > 0) {
      const first = models[0]
      setSelectedModel(first.id)
      setSelectedProvider(first.provider)
    }
  }

  const handleNewChat = useCallback(async () => {
    if (!api) {
      // Mock for dev
      setActiveChatId(null)
      setMessages([])
      return
    }
    const chat = await api.createChat('New Chat')
    setChats(prev => [chat, ...prev])
    setActiveChatId(chat.id)
    setMessages([])
    setStreamError('')
    setView('chat')
  }, [api])

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId)
    setStreamError('')
    setView('chat')
  }

  const handleDeleteChat = async (chatId: string) => {
    if (!api) return
    await api.deleteChat(chatId)
    if (activeChatId === chatId) {
      setActiveChatId(null)
      setMessages([])
    }
    await loadChats()
  }

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isStreaming || !api) return

    let chatId = activeChatId
    if (!chatId) {
      const chat = await api.createChat(content.slice(0, 60))
      chatId = chat.id
      setActiveChatId(chatId)
      setChats(prev => [chat, ...prev])
    } else {
      // Update chat title from first message
      const existing = messages
      if (existing.length === 0) {
        await api.renameChat(chatId, content.slice(0, 60))
      }
    }

    // Save user message
    const userMsg = await api.addMessage(chatId, 'user', content, '')
    setMessages(prev => [...prev, userMsg])
    setStreamError('')
    setIsStreaming(true)
    setStreamingText('')

    // Build conversation history
    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))

    // Stream response
    await api.streamMessage({
      provider: selectedProvider,
      model: selectedModel,
      messages: history,
      chatId,
    })
  }

  const handleModelSelect = (modelId: string, provider: Provider) => {
    setSelectedModel(modelId)
    setSelectedProvider(provider)
  }

  return (
    <div className="flex w-full h-full" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onSettings={() => setView(v => v === 'settings' ? 'chat' : 'settings')}
        isSettingsActive={view === 'settings'}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {view === 'settings' ? (
          <Settings
            onClose={() => setView('chat')}
            onModelsChanged={loadModels}
          />
        ) : (
          <ChatArea
            messages={messages}
            streamingText={streamingText}
            isStreaming={isStreaming}
            streamError={streamError}
            selectedModel={selectedModel}
            selectedProvider={selectedProvider}
            availableModels={availableModels}
            onSend={handleSendMessage}
            onModelSelect={handleModelSelect}
          />
        )}
      </div>
    </div>
  )
}
