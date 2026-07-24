// 🔒 immutable — the only bridge from the locked shell to the FastAPI backend.
import type { MorphResponse, ScoreboardResponse } from './types'

const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`${path} -> ${r.status}`)
  return r.json() as Promise<T>
}

export const morphClient = {
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
}
