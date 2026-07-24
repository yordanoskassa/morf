// 🔒 immutable — live scoreboard. Polls the backend BTQL aggregation; quality climbs.
import { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { morphClient } from './morphClient'
import type { ScoreboardResponse } from './types'

const POLL_MS = 4000

export function Scoreboard() {
  const [data, setData] = useState<ScoreboardResponse>({ rows: [], timeseries: [] })
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    const tick = async () => {
      try {
        const d = await morphClient.scoreboard()
        if (live) { setData(d); setErr(null) }
      } catch (e) {
        if (live) setErr(String(e))
      }
    }
    tick()
    const id = setInterval(tick, POLL_MS)
    return () => { live = false; clearInterval(id) }
  }, [])

  // cumulative running-average quality → the "climbing" line
  const chart = useMemo(() => {
    let sum = 0
    return data.timeseries.map((p, i) => {
      sum += p.quality
      return { i: i + 1, quality: +(sum / (i + 1)).toFixed(3) }
    })
  }, [data.timeseries])

  const overall = chart.length ? chart[chart.length - 1].quality : 0

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            Morph quality
            <span className="text-2xl font-bold tabular-nums">{(overall * 100).toFixed(0)}%</span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">1 − undo-rate, running average</p>
        </CardHeader>
        <CardContent className="h-40 px-1">
          {chart.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {err ? `scoreboard offline` : 'no morphs yet'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="i" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="quality" stroke="oklch(0.6 0.18 150)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Which model wins which edit</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b [&>th]:px-3 [&>th]:py-2 [&>th]:text-left">
                <th>model</th><th>edit</th><th>quality</th><th>compile</th><th>render</th><th>ms</th><th>n</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">no data yet</td></tr>
              )}
              {data.rows
                .sort((a, b) => b.quality - a.quality)
                .map((r, i) => (
                  <tr key={i} className="border-b [&>td]:px-3 [&>td]:py-2">
                    <td className="font-mono uppercase">{r.model}</td>
                    <td>{r.edit_type}</td>
                    <td><Badge className="bg-emerald-600">{(r.quality * 100).toFixed(0)}%</Badge></td>
                    <td>{(r.compile_rate * 100).toFixed(0)}%</td>
                    <td>{(r.render_rate * 100).toFixed(0)}%</td>
                    <td className="tabular-nums">{r.p50_latency_ms.toFixed(0)}</td>
                    <td className="tabular-nums">{r.n}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
