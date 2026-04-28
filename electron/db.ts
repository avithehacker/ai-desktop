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

      CREATE TABLE IF NOT EXISTS routing_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt_hash TEXT NOT NULL,
        intent TEXT NOT NULL,
        model_used TEXT NOT NULL,
        fallback_used INTEGER NOT NULL DEFAULT 0,
        tokens_estimated INTEGER NOT NULL DEFAULT 0,
        latency_ms INTEGER NOT NULL DEFAULT 0,
        success INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS model_weights (
        intent TEXT NOT NULL,
        model TEXT NOT NULL,
        weight REAL NOT NULL DEFAULT 1.0,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (intent, model)
      );
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

  logInteraction(data: {
    prompt_hash: string
    intent: string
    model_used: string
    fallback_used: boolean
    tokens_estimated: number
    latency_ms: number
    success: boolean
  }): void {
    this.db.prepare(`
      INSERT INTO routing_log (prompt_hash, intent, model_used, fallback_used, tokens_estimated, latency_ms, success, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.prompt_hash, data.intent, data.model_used,
      data.fallback_used ? 1 : 0, data.tokens_estimated,
      data.latency_ms, data.success ? 1 : 0, Date.now()
    )
  }

  getWeightsForIntent(intent: string): Record<string, number> {
    const rows = this.db.prepare(
      'SELECT model, weight FROM model_weights WHERE intent = ?'
    ).all(intent) as { model: string; weight: number }[]
    const weights: Record<string, number> = { local: 1, claude: 1, openai: 1 }
    for (const row of rows) weights[row.model] = row.weight
    return weights
  }

  updateModelWeight(intent: string, model: string, fallbackUsed: boolean, success: boolean): void {
    const now = Date.now()
    // Ensure row exists
    this.db.prepare(`
      INSERT OR IGNORE INTO model_weights (intent, model, weight, updated_at) VALUES (?, ?, 1.0, ?)
    `).run(intent, model, now)

    const current = this.db.prepare(
      'SELECT weight FROM model_weights WHERE intent = ? AND model = ?'
    ).get(intent, model) as { weight: number }

    let weight = current.weight
    if (fallbackUsed) {
      weight = Math.max(0.1, weight * 0.9)   // fallback triggered → down 10%
    } else if (success) {
      weight = Math.min(3.0, weight * 1.05)  // good response → up 5%
    }

    this.db.prepare(
      'UPDATE model_weights SET weight = ?, updated_at = ? WHERE intent = ? AND model = ?'
    ).run(weight, now, intent, model)
  }
}
