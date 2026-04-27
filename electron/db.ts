import Database from 'better-sqlite3'
import * as path from 'path'
import { app } from 'electron'
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export interface Chat {
  id: string
  title: string
  created_at: number
  updated_at: number
  model: string
}

export interface Message {
  id: string
  chat_id: string
  role: string
  content: string
  model: string
  created_at: number
}

export class DatabaseManager {
  private db: Database.Database

  constructor() {
    const userDataPath = app.getPath('userData')
    const dbPath = path.join(userDataPath, 'ai-desktop.db')
    this.db = new Database(dbPath)
    this.migrate()
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT 'New Chat',
        model TEXT NOT NULL DEFAULT 'phi3:mini',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        model TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
      CREATE INDEX IF NOT EXISTS idx_chats_updated ON chats(updated_at DESC);
    `)
  }

  listChats(): Chat[] {
    return this.db.prepare('SELECT * FROM chats ORDER BY updated_at DESC').all() as Chat[]
  }

  getChat(chatId: string): Chat | null {
    return this.db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId) as Chat | null
  }

  createChat(title: string = 'New Chat', model: string = 'phi3:mini'): Chat {
    const id = generateId()
    const now = Date.now()
    this.db.prepare(
      'INSERT INTO chats (id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run(id, title, model, now, now)
    return this.getChat(id)!
  }

  renameChat(chatId: string, title: string): void {
    this.db.prepare('UPDATE chats SET title = ?, updated_at = ? WHERE id = ?')
      .run(title, Date.now(), chatId)
  }

  updateChatModel(chatId: string, model: string): void {
    this.db.prepare('UPDATE chats SET model = ?, updated_at = ? WHERE id = ?')
      .run(model, Date.now(), chatId)
  }

  deleteChat(chatId: string): void {
    this.db.prepare('DELETE FROM chats WHERE id = ?').run(chatId)
  }

  listMessages(chatId: string): Message[] {
    return this.db.prepare(
      'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC'
    ).all(chatId) as Message[]
  }

  addMessage(chatId: string, role: string, content: string, model: string = ''): Message {
    const id = generateId()
    const now = Date.now()
    this.db.prepare(
      'INSERT INTO messages (id, chat_id, role, content, model, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, chatId, role, content, model, now)
    // Update chat's updated_at
    this.db.prepare('UPDATE chats SET updated_at = ? WHERE id = ?').run(now, chatId)
    return { id, chat_id: chatId, role, content, model, created_at: now }
  }

  getSetting(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
    return row?.value ?? null
  }

  setSetting(key: string, value: string): void {
    this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
  }

  exportChats(): { chats: Chat[]; messages: Message[] } {
    const chats = this.listChats()
    const messages = this.db.prepare('SELECT * FROM messages ORDER BY created_at ASC').all() as Message[]
    return { chats, messages }
  }

  clearAllChats(): void {
    this.db.exec('DELETE FROM messages; DELETE FROM chats;')
  }
}
