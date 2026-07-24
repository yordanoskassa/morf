// Live scoreboard. Polls the backend BTQL aggregation; quality climbs. Morphable.
import { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { morphClient } from './morphClient'
import type { ScoreboardResponse, ModelStat } from './types'

const POLL_MS = 6000
const RACER_COLOR: Record<string, string> = { kimi: '#a78bfa', glm: '#22d3ee', qwen: '#fbbf24' }
const EMPTY: ScoreboardResponse = {
  kpis: { morphs: 0, candidates: 0, ship_rate: 0, quality: 0, compile_rate: 0, render_rate: 0, chat_rate: 0, p50_latency_ms: 0 },
  models: [], rows: [], timeseries: [],
}

const pct = (x: number) => `${Math.round(x * 100)}%`

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-bold tabular-nums leading-tight">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  )
}

function Bar({ frac, color }: { frac: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full" style={{ width: `${Math.max(2, frac * 100)}%`, background: color }} />
    </div>
  )
}

function ModelRow({ m, maxWins, maxLat }: { m: ModelStat; maxWins: number; maxLat: number }) {
  const color = RACER_COLOR[m.model] ?? '#94a3b8'
  const seg = (ms: number) => (maxLat ? (ms / maxLat) * 100 : 0)
  return (
    <div className="space-y-1 rounded-lg border border-white/10 bg-white/5 p-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono font-semibold uppercase" style={{ color }}>{m.model}</span>
        <span className="text-muted-foreground">{m.wins}/{m.n} wins · {pct(m.quality)} quality</span>
      </div>
      {/* wins bar */}
      <Bar frac={maxWins ? m.wins / maxWins : 0} color={color} />
      {/* rate mini-stats */}
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <span>compile {pct(m.compile_rate)}</span>
        <span>render {pct(m.render_rate)}</span>
        <span>chat {pct(m.chat_rate)}</span>
        <span>{Math.round(m.p50_latency_ms)}ms</span>
      </div>
      {/* latency breakdown gen | build | render (one axis, stacked to total) */}
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/10" title="gen · build · render">
        <div style={{ width: `${seg(m.gen_ms)}%`, background: color, opacity: 0.4 }} />
        <div style={{ width: `${seg(m.build_ms)}%`, background: color, opacity: 0.7 }} />
        <div style={{ width: `${seg(m.render_ms)}%`, background: color }} />
      </div>
    </div>
  )
}

export function Scoreboard() {
  const [data, setData] = useState<ScoreboardResponse>(EMPTY)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    const tick = async () => {
      try {
        const d = await morphClient.scoreboard()
        if (live) { setData(d); setErr(null) }
      } catch (e) { if (live) setErr(String(e)) }
    }
    tick()
    const id = setInterval(tick, POLL_MS)
    return () => { live = false; clearInterval(id) }
  }, [])

  const chart = useMemo(() => {
    let sum = 0
    return data.timeseries.map((p, i) => { sum += p.quality; return { i: i + 1, quality: +(sum / (i + 1)).toFixed(3) } })
  }, [data.timeseries])

  const k = data.kpis
  const maxWins = Math.max(1, ...data.models.map((m) => m.wins))
  const maxLat = Math.max(1, ...data.models.map((m) => m.gen_ms + m.build_ms + m.render_ms))

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-3">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-sm font-semibold">Morph scoreboard</h2>
        <span className="text-[10px] text-muted-foreground">{k.morphs} morphs · last 7d</span>
      </div>

      {/* KPI tiles — a lot of data at a glance */}
      <div className="grid grid-cols-2 gap-2">
        <Tile label="Quality" value={pct(k.quality)} sub="1 − undo-rate" />
        <Tile label="Ship rate" value={pct(k.ship_rate)} sub={`${k.candidates} candidates`} />
        <Tile label="Compile" value={pct(k.compile_rate)} />
        <Tile label="Chat survive" value={pct(k.chat_rate)} />
        <Tile label="Render" value={pct(k.render_rate)} />
        <Tile label="Median latency" value={`${(k.p50_latency_ms / 1000).toFixed(1)}s`} />
      </div>

      {/* quality-over-time */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-2">
        <div className="mb-1 px-1 text-[11px] text-muted-foreground">quality over time (climbing)</div>
        <div className="h-28">
          {chart.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {err ? 'scoreboard offline' : 'no morphs yet'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 6, right: 8, bottom: 0, left: -22 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff14" />
                <XAxis dataKey="i" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ fontSize: 11, background: '#0b0b0f', border: '1px solid #ffffff22', borderRadius: 8 }} />
                <Line type="monotone" dataKey="quality" stroke="#34d399" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* per-model leaderboard */}
      <div className="space-y-2">
        <div className="px-1 text-[11px] text-muted-foreground">model leaderboard — bar = wins · thin bar = gen·build·render latency</div>
        {data.models.length === 0 && <div className="px-1 text-xs text-muted-foreground">no data yet</div>}
        {data.models.map((m) => <ModelRow key={m.model} m={m} maxWins={maxWins} maxLat={maxLat} />)}
      </div>

      {/* which model wins which edit-type */}
      {data.rows.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-0">
          <div className="px-2 py-1.5 text-[11px] text-muted-foreground">who wins which edit</div>
          <table className="w-full text-[11px]">
            <thead className="text-muted-foreground">
              <tr className="border-b border-white/10 [&>th]:px-2 [&>th]:py-1 [&>th]:text-left">
                <th>model</th><th>edit</th><th>quality</th><th>ms</th><th>n</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.sort((a, b) => b.quality - a.quality).slice(0, 12).map((r, i) => (
                <tr key={i} className="border-b border-white/5 [&>td]:px-2 [&>td]:py-1">
                  <td className="font-mono uppercase" style={{ color: RACER_COLOR[r.model] ?? undefined }}>{r.model}</td>
                  <td className="max-w-[90px] truncate">{r.edit_type}</td>
                  <td>{pct(r.quality)}</td>
                  <td className="tabular-nums">{Math.round(r.p50_latency_ms)}</td>
                  <td className="tabular-nums">{r.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
