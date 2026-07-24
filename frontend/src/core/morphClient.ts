// Bridge from the app to the FastAPI backend. Holds the /morph anchor that the
// chat-survival check looks for — keep the /morph call if you edit this.
import type { MorphResponse, ScoreboardResponse } from './types'
import { getUser } from './user'

const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'

export type MorphEvent = { type: string; [k: string]: unknown }

export interface TimelineItem {
  morph_id: string; prompt: string; author: string; model: string | null
  shipped: boolean; ts: string | null; up: number; down: number; score: number
  my_vote: number; restored_from: string | null
}
export interface TimelineResponse { items: TimelineItem[]; top_id: string | null; current_id: string | null }

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`${path} -> ${r.status}`)
  return r.json() as Promise<T>
}

// Stream Server-Sent Events from POST /morph/stream, calling onEvent per event.
async function streamMorph(
  prompt: string,
  focus: string[],
  onEvent: (ev: MorphEvent) => void,
): Promise<void> {
  const u = getUser()
  const r = await fetch(`${BASE}/morph/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, focus, user_id: u?.id, user_name: u?.name }),
  })
  if (!r.ok || !r.body) throw new Error(`/morph/stream -> ${r.status}`)
  const reader = r.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const chunks = buf.split('\n\n')
    buf = chunks.pop() ?? ''
    for (const c of chunks) {
      const line = c.trim()
      if (line.startsWith('data:')) {
        try { onEvent(JSON.parse(line.slice(5).trim())) } catch { /* ignore */ }
      }
    }
  }
}

export const morphClient = {
  morphStream: streamMorph,

  morph: (prompt: string, focus: string[] = []) =>
    post<MorphResponse>('/morph', { prompt, focus }),

  undo: (span_id: string, commit_sha: string | null = null) =>
    post<{ ok: boolean }>('/undo', { span_id, commit_sha }),

  scoreboard: async (): Promise<ScoreboardResponse> => {
    const r = await fetch(`${BASE}/scoreboard`)
    if (!r.ok) throw new Error(`/scoreboard -> ${r.status}`)
    return r.json()
  },

  voiceSignedUrl: async (): Promise<{ signed_url?: string; error?: string }> => {
    const r = await fetch(`${BASE}/voice/signed-url`)
    return r.json()
  },

  timeline: async (): Promise<TimelineResponse> => {
    const u = getUser()
    const r = await fetch(`${BASE}/timeline?user_id=${encodeURIComponent(u?.id ?? '')}`)
    if (!r.ok) throw new Error(`/timeline -> ${r.status}`)
    return r.json()
  },

  vote: (morph_id: string, value: number) => {
    const u = getUser()
    return post<{ ok: boolean }>('/vote', { morph_id, user_id: u?.id ?? 'anon', value })
  },

  restore: (morph_id: string) => {
    const u = getUser()
    return post<{ ok: boolean; morph_id?: string; error?: string }>('/restore', {
      morph_id, user_id: u?.id, user_name: u?.name,
    })
  },
}
