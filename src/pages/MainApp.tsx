import React, { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import ChatArea from '../components/ChatArea'
import Settings from './Settings'
import { Chat, Message, AttachedFile } from '../types'

type View = 'chat' | 'settings'

export default function MainApp() {
  const [view, setView] = useState<View>('chat')
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [streamError, setStreamError] = useState('')
  const [modelProgress, setModelProgress] = useState<{ text: string; progress: number } | null>(null)
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([])

  const api = window.electronAPI

  useEffect(() => {
    loadChats()
    api?.listConfiguredProviders().then(setConfiguredProviders)
  }, [])
  useEffect(() => { if (activeChatId) loadMessages(activeChatId); else setMessages([]) }, [activeChatId])

  useEffect(() => {
    if (!api) return
    const cleanChunk = api.onStreamChunk(({ chatId, chunk }) => {
      if (chatId === activeChatId) setStreamingText(prev => prev + chunk)
    })
    const cleanDone = api.onStreamDone(async ({ chatId, fullText }) => {
      if (chatId === activeChatId) {
        setIsStreaming(false)
        setStreamingText('')
        await api.addMessage(chatId, 'assistant', fullText, '')
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
  }, [activeChatId, api])

  useEffect(() => {
    if (!api?.onLocalModelProgress) return
    const clean = api.onLocalModelProgress(prog => {
      if (prog.progress >= 1) { setModelProgress(null); return }
      setModelProgress(prog)
    })
    return clean
  }, [api])

  useEffect(() => {
    if (!api) return
    const cleanN = api.onShortcut('new-chat', handleNewChat)
    return () => { cleanN() }
  }, [api])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); handleNewChat() }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') { e.preventDefault(); setView(v => v === 'settings' ? 'chat' : 'settings') }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const loadChats = async () => {
    if (!api) return
    setChats(await api.listChats())
  }

  const loadMessages = async (chatId: string) => {
    if (!api) return
    setMessages(await api.listMessages(chatId))
  }

  const handleNewChat = useCallback(async () => {
    if (!api) { setActiveChatId(null); setMessages([]); return }
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
    if (activeChatId === chatId) { setActiveChatId(null); setMessages([]) }
    await loadChats()
  }

  const handleSendMessage = async (content: string, files: AttachedFile[] = []) => {
    const textFiles  = files.filter(f => f.category === 'text' || f.category === 'pdf')
    const imageFiles = files.filter(f => f.category === 'image')

    // Inject text/pdf file contents as code blocks
    let fullContent = content
    for (const f of textFiles) {
      fullContent = `[File: ${f.name}]\n\`\`\`\n${f.text}\n\`\`\`\n\n${fullContent}`
    }
    // For display, note attached images
    const imageNote = imageFiles.length > 0
      ? imageFiles.map(f => `[Image: ${f.name}]`).join(' ') + '\n\n'
      : ''
    const displayContent = imageNote + fullContent

    if (!displayContent.trim() || isStreaming || !api) return

    let chatId = activeChatId
    const title = (content || files[0]?.name || 'File').slice(0, 60)
    if (!chatId) {
      const chat = await api.createChat(title)
      chatId = chat.id
      setActiveChatId(chatId)
      setChats(prev => [chat, ...prev])
    } else if (messages.length === 0) {
      await api.renameChat(chatId, title)
    }

    const userMsg = await api.addMessage(chatId, 'user', displayContent, '')
    setMessages(prev => [...prev, userMsg])
    setStreamError('')
    setIsStreaming(true)
    setStreamingText('')

    // History uses fullContent (without image note) for context; images sent as attachments
    const history = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: fullContent },
    ]
    const imageAttachments = imageFiles.map(f => ({ mimeType: f.mimeType, dataUrl: f.dataUrl }))

    await api.streamMessage({ messages: history, chatId, attachments: imageAttachments })
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
          <Settings onClose={() => setView('chat')} onModelsChanged={() => { api?.listConfiguredProviders().then(setConfiguredProviders) }} />
        ) : (
          <ChatArea
            messages={messages}
            streamingText={streamingText}
            isStreaming={isStreaming}
            streamError={streamError}
            modelProgress={modelProgress}
            configuredProviders={configuredProviders}
            onSend={handleSendMessage}
          />
        )}
      </div>
    </div>
  )
}
