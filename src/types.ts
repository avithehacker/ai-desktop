export interface Chat {
  id: string
  title: string
  model: string
  created_at: number
  updated_at: number
}

export interface Message {
  id: string
  chat_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  model: string
  created_at: number
}

export type Provider = 'ollama' | 'anthropic' | 'openai' | 'google'

export interface ModelOption {
  id: string
  name: string
  provider: Provider
  description: string
  isLocal: boolean
  available: boolean
}

export interface OllamaModel {
  name: string
  size: number
  digest: string
  modified_at: string
}

export interface PullProgress {
  status: string
  completed?: number
  total?: number
  percent?: number
  modelName: string
}

export const CLOUD_MODELS: ModelOption[] = [
  // Anthropic
  { id: 'claude-sonnet-4-5', name: 'Claude Sonnet', provider: 'anthropic', description: 'Anthropic · Balanced', isLocal: false, available: false },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku', provider: 'anthropic', description: 'Anthropic · Fast', isLocal: false, available: false },
  // OpenAI
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', description: 'OpenAI · Smart', isLocal: false, available: false },
  { id: 'gpt-4o-mini', name: 'GPT-4o mini', provider: 'openai', description: 'OpenAI · Fast', isLocal: false, available: false },
  // Google
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google', description: 'Google · Smart', isLocal: false, available: false },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google', description: 'Google · Fast', isLocal: false, available: false },
]

export const POPULAR_LOCAL_MODELS = [
  { name: 'phi3:mini', label: 'Phi-3 Mini 3.8B', size: '2.2 GB', description: 'Fastest, great for most tasks' },
  { name: 'llama3.2', label: 'Llama 3.2 3B', size: '2.0 GB', description: 'Meta\'s latest small model' },
  { name: 'mistral', label: 'Mistral 7B', size: '4.1 GB', description: 'Strong general purpose model' },
  { name: 'gemma2:2b', label: 'Gemma 2 2B', size: '1.6 GB', description: 'Google\'s efficient model' },
]

export const WEBLLM_AVAILABLE_MODELS = [
  { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',    label: 'Llama 3.2 1B',  size: '700 MB',  description: 'Fastest, runs on most devices' },
  { id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',    label: 'Llama 3.2 3B',  size: '2.0 GB',  description: 'Better quality, needs more RAM' },
  { id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',    label: 'Phi 3.5 Mini',  size: '2.2 GB',  description: 'Microsoft, strong reasoning' },
  { id: 'gemma-2-2b-it-q4f16_1-MLC',            label: 'Gemma 2 2B',    size: '1.4 GB',  description: 'Google, efficient and accurate' },
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',    label: 'Qwen 2.5 1.5B', size: '900 MB',  description: 'Alibaba, multilingual' },
  { id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC',    label: 'SmolLM2 1.7B',  size: '1.0 GB',  description: 'Lightweight, very fast' },
  { id: 'Mistral-7B-Instruct-v0.3-q4f16_1-MLC', label: 'Mistral 7B',    size: '4.3 GB',  description: 'High quality, needs 8 GB+ RAM' },
]

export function providerColor(provider: Provider): string {
  switch (provider) {
    case 'anthropic': return '#d4a574'
    case 'openai': return '#74b9d4'
    case 'google': return '#74d4a5'
    case 'ollama': return '#a574d4'
    default: return '#8e8e9a'
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1e9) return `${(bytes / 1e6).toFixed(0)} MB`
  return `${(bytes / 1e9).toFixed(1)} GB`
}
