// Mirrors backend/app/schemas.py
export interface FileEdit { path: string; content: string }

export interface CandidateResult {
  racer: string
  model: string
  edit_type: string
  summary: string
  files: FileEdit[]
  blocked: boolean
  blocked_reason: string | null
  compiled: boolean
  rendered: boolean
  chat_ok: boolean
  gen_ms: number
  build_ms: number
  render_ms: number
  total_ms: number
  build_log: string
  preview_url: string | null
  span_id: string | null
  score: number
}

export interface MorphResponse {
  winner: CandidateResult | null
  candidates: CandidateResult[]
  shipped: boolean
  commit_sha: string | null
}

export interface ScoreboardRow {
  model: string
  edit_type: string
  compile_rate: number
  render_rate: number
  undo_rate: number
  quality: number
  p50_latency_ms: number
  n: number
}

export interface ModelStat {
  model: string
  n: number
  wins: number
  win_rate: number
  compile_rate: number
  render_rate: number
  chat_rate: number
  quality: number
  p50_latency_ms: number
  gen_ms: number
  build_ms: number
  render_ms: number
}

export interface ScoreboardKPIs {
  morphs: number
  candidates: number
  ship_rate: number
  quality: number
  compile_rate: number
  render_rate: number
  chat_rate: number
  p50_latency_ms: number
}

export interface ScoreboardResponse {
  kpis: ScoreboardKPIs
  models: ModelStat[]
  rows: ScoreboardRow[]
  timeseries: { created: string; model: string; quality: number }[]
}
