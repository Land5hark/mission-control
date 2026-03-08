import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

export type MessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'tool_use'; id: string; name: string; input: string }
  | { type: 'tool_result'; toolUseId: string; content: string; isError?: boolean }

export interface TranscriptMessage {
  role: 'user' | 'assistant' | 'system'
  parts: MessageContentPart[]
  timestamp?: string
}

/**
 * Parse OpenClaw JSONL transcript format.
 *
 * Each line is a JSON object. We care about entries with type: "message"
 * which contain { message: { role, content } } in Claude API format.
 */
export function parseJsonlTranscript(raw: string, limit: number): TranscriptMessage[] {
  const lines = raw.split('\n').filter(Boolean)
  const out: TranscriptMessage[] = []

  for (const line of lines) {
    let entry: any
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }

    if (entry.type !== 'message' || !entry.message) continue

    const msg = entry.message
    const role = msg.role === 'assistant' ? 'assistant' as const
      : msg.role === 'system' ? 'system' as const
      : 'user' as const

    const parts: MessageContentPart[] = []
    const ts = typeof entry.timestamp === 'string' ? entry.timestamp
      : typeof msg.timestamp === 'string' ? msg.timestamp
      : undefined

    if (typeof msg.content === 'string' && msg.content.trim()) {
      parts.push({ type: 'text', text: msg.content.trim().slice(0, 8000) })
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (!block || typeof block !== 'object') continue
        if (block.type === 'text' && typeof block.text === 'string' && block.text.trim()) {
          parts.push({ type: 'text', text: block.text.trim().slice(0, 8000) })
        } else if (block.type === 'thinking' && typeof block.thinking === 'string') {
          parts.push({ type: 'thinking', thinking: block.thinking.slice(0, 4000) })
        } else if (block.type === 'tool_use') {
          parts.push({
            type: 'tool_use',
            id: block.id || '',
            name: block.name || 'unknown',
            input: JSON.stringify(block.input || {}).slice(0, 500),
          })
        } else if (block.type === 'tool_result') {
          const content = typeof block.content === 'string' ? block.content
            : Array.isArray(block.content) ? block.content.map((c: any) => c?.text || '').join('\n')
            : ''
          if (content.trim()) {
            parts.push({
              type: 'tool_result',
              toolUseId: block.tool_use_id || '',
              content: content.trim().slice(0, 8000),
              isError: block.is_error === true,
            })
          }
        }
      }
    }

    if (parts.length > 0) {
      out.push({ role, parts, timestamp: ts })
    }
  }

  return out.slice(-limit)
}

/**
 * Read a session's JSONL transcript file from disk given stateDir, agentName, and sessionId.
 */
export function readSessionJsonl(stateDir: string, agentName: string, sessionId: string): string | null {
  const jsonlPath = path.join(stateDir, 'agents', agentName, 'sessions', `${sessionId}.jsonl`)
  if (!existsSync(jsonlPath)) return null
  try {
    return readFileSync(jsonlPath, 'utf-8')
  } catch {
    return null
  }
}
