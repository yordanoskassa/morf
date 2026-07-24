// The chat that drives the self-editing loop. Morphable, but must keep the
// data-morph-chat element and the /morph call alive (chat-survival invariant).
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { morphClient, type MorphEvent } from './morphClient'
import { Voice } from './Voice'
import type { CandidateResult, MorphResponse } from './types'

const RACER_COLOR: Record<string, string> = {
  kimi: 'text-violet-400',
  glm: 'text-cyan-400',
  qwen: 'text-amber-400',
}
const PHASE_LABEL: Record<string, string> = {
  thinking: 'thinking', generated: 'proposed', sandbox: 'warm sandbox', sync: 'syncing',
  build: 'building', compiled: 'compiled', serve: 'starting',
  render: 'rendering', rendered: 'rendered', chat_check: 'checking chat', chat_ok: 'chat ✓',
  build_failed: 'compile failed', render_failed: 'no render', chat_broken: 'chat ✗',
  done: 'done',
}

interface RacerLive {
  key: string
  role: string
  phase: string
  status: 'running' | 'won' | 'lost' | 'error' | 'blocked'
  compiled?: boolean
  rendered?: boolean
  chat_ok?: boolean
  total_ms?: number
}
interface Turn {
  prompt: string
  live: boolean
  racers: Record<string, RacerLive>
  log: { racer?: string; text: string }[]
  result?: MorphResponse
  winner?: string
  shipped?: { ok: boolean; sha: string | null }
}

function RacerChip({ r, winner }: { r: RacerLive; winner: boolean }) {
  const color = RACER_COLOR[r.key] ?? 'text-foreground'
  const dead = r.status === 'error' || r.status === 'blocked' || r.status === 'lost'
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs backdrop-blur
      ${winner ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-border/60 bg-background/40'}`}>
      <span className={`h-2 w-2 rounded-full ${r.status === 'running' ? 'animate-pulse bg-current' : dead ? 'bg-destructive' : 'bg-emerald-500'} ${color}`} />
      <span className={`font-mono font-semibold uppercase ${color}`}>{r.key}</span>
      <span className="text-muted-foreground">{PHASE_LABEL[r.phase] ?? r.phase}</span>
      {winner && <span className="ml-auto text-emerald-400">win</span>}
    </div>
  )
}

function LiveConsole({ turn }: { turn: Turn }) {
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [turn.log.length])
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-1.5">
        {Object.values(turn.racers).map((r) => (
          <RacerChip key={r.key} r={r} winner={turn.winner === r.key} />
        ))}
      </div>
      <div className="max-h-40 overflow-auto rounded-lg border border-border/50 bg-black/30 p-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
        {turn.log.map((l, i) => (
          <div key={i}>
            {l.racer && <span className={RACER_COLOR[l.racer] ?? ''}>[{l.racer}] </span>}
            {l.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}

function CandidateCard({ c, winner }: { c: CandidateResult; winner: boolean }) {
  const badge = c.blocked ? <Badge variant="destructive">blocked</Badge>
    : c.compiled && c.rendered && !c.chat_ok ? <Badge variant="destructive">chat broken</Badge>
    : c.compiled && c.rendered ? <Badge className="bg-emerald-600">ok</Badge>
    : c.compiled ? <Badge className="bg-amber-500">no render</Badge>
    : <Badge variant="secondary">failed</Badge>
  return (
    <div className={`rounded-lg border p-2.5 text-xs ${winner ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-border/50'}`}>
      <div className="flex items-center justify-between">
        <span className={`font-mono font-semibold uppercase ${RACER_COLOR[c.racer] ?? ''}`}>{c.racer}</span>
        <div className="flex items-center gap-1">{winner && <Badge className="bg-emerald-600">winner</Badge>}{badge}</div>
      </div>
      <p className="mt-1 text-muted-foreground">{c.summary}</p>
      <div className="mt-1 flex gap-3 text-[10px] text-muted-foreground">
        <span>{c.edit_type || '—'}</span><span>{c.total_ms}ms</span>
        {c.blocked_reason && <span className="text-destructive">{c.blocked_reason}</span>}
      </div>
    </div>
  )
}

export function Chat() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')

  function patch(idx: number, fn: (t: Turn) => Turn) {
    setTurns((ts) => ts.map((t, i) => (i === idx ? fn(t) : t)))
  }

  async function send(prompt: string) {
    const text = prompt.trim()
    if (!text) return
    setInput('')
    const idx = turns.length
    setTurns((ts) => [...ts, { prompt: text, live: true, racers: {}, log: [] }])

    const onEvent = (ev: MorphEvent) => {
      const racer = ev.racer as string | undefined
      patch(idx, (t) => {
        const racers = { ...t.racers }
        const log = [...t.log]
        const set = (k: string, p: Partial<RacerLive>) => { racers[k] = { ...racers[k], ...p } }
        switch (ev.type) {
          case 'start':
            for (const r of ev.racers as { key: string; role: string }[])
              racers[r.key] = { key: r.key, role: r.role, phase: 'queued', status: 'running' }
            log.push({ text: '3 models racing…' })
            break
          case 'gen_start': if (racer) set(racer, { phase: 'thinking' }); break
          case 'gen_done':
            if (racer) set(racer, { phase: 'generated' })
            log.push({ racer, text: `proposed: ${ev.summary}` })
            break
          case 'gen_fail':
            if (racer) set(racer, { phase: 'error', status: 'error' })
            log.push({ racer, text: `model error` })
            break
          case 'blocked':
            if (racer) set(racer, { phase: 'blocked', status: 'blocked' })
            log.push({ racer, text: `blocked: ${ev.reason}` })
            break
          case 'step':
            if (racer) set(racer, { phase: ev.phase as string })
            log.push({ racer, text: `${ev.phase} · ${ev.detail ?? ''}` })
            break
          case 'eval_done':
            if (racer) set(racer, {
              phase: 'done',
              compiled: ev.compiled as boolean, rendered: ev.rendered as boolean, chat_ok: ev.chat_ok as boolean,
              total_ms: ev.total_ms as number,
              status: (ev.compiled && ev.rendered && ev.chat_ok) ? 'running' : 'lost',
            })
            break
          case 'winner':
            for (const k of Object.keys(racers)) if (k !== racer && racers[k].status === 'running') racers[k].status = 'lost'
            if (racer) set(racer, { status: 'won' })
            log.push({ racer, text: `WINNER (${ev.total_ms}ms)` })
            return { ...t, racers, log, winner: racer }
          case 'warming': log.push({ text: '🔥 warming the sandbox image (first run only)…' }); break
          case 'applied': log.push({ text: '✍️  written locally — hot-reloading' }); break
          case 'shipping': log.push({ text: '⬆️  pushing to GitHub' }); break
          case 'shipped':
            log.push({ text: ev.ok ? `✅ shipped ${String(ev.commit_sha ?? '').slice(0, 7)}` : '⚠️ ship failed' })
            return { ...t, racers, log, shipped: { ok: ev.ok as boolean, sha: (ev.commit_sha as string) ?? null } }
          case 'no_winner': log.push({ text: '✗ no candidate survived' }); break
          case 'error': log.push({ text: `error: ${ev.error}` }); return { ...t, racers, log, live: false }
          case 'done':
            return { ...t, racers, log, result: ev.result as MorphResponse, live: false }
        }
        return { ...t, racers, log }
      })
    }

    try {
      await morphClient.morphStream(text, [], onEvent)
    } catch (e) {
      patch(idx, (t) => ({ ...t, live: false, log: [...t.log, { text: `stream error: ${e}` }] }))
      toast.error('Morph failed', { description: String(e) })
    }
  }

  async function undo(span_id: string, sha: string | null) {
    await morphClient.undo(span_id, sha)
    toast('Undone — logged as a quality signal')
  }

  return (
    <div className="flex h-full flex-col" data-morph-chat>
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div>
          <h1 className="text-sm font-semibold">morph</h1>
          <p className="text-[11px] text-muted-foreground">a coding chat that builds itself</p>
        </div>
        <Voice onTranscript={send} />
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-4 py-4">
          {turns.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Ask for any change — e.g. “add a hero section with a CTA”. Three models race,
              each builds in a sandbox, the winner ships and hot-reloads. Watch it live below.
            </p>
          )}
          {turns.map((t, i) => (
            <div key={i} className="space-y-2">
              <div className="ml-auto w-fit max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground">
                {t.prompt}
              </div>
              {(t.live || t.log.length > 0) && <LiveConsole turn={t} />}
              {t.result && (
                <div className="space-y-1.5 rounded-xl border border-border/50 bg-background/40 p-2 backdrop-blur">
                  {t.result.candidates.map((c) => (
                    <CandidateCard key={c.racer} c={c} winner={!!t.result!.winner && c.span_id === t.result!.winner.span_id} />
                  ))}
                  {t.result.winner && (
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-muted-foreground">
                        {t.shipped?.ok ? `shipped ${t.shipped.sha?.slice(0, 7)}` : 'not shipped'}
                      </span>
                      <Button size="sm" variant="outline" className="h-7"
                        onClick={() => undo(t.result!.winner!.span_id!, t.shipped?.sha ?? null)}
                        disabled={!t.result.winner.span_id}>
                        Undo
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <form
        className="flex items-end gap-2 border-t border-border/50 p-3"
        onSubmit={(e) => { e.preventDefault(); send(input) }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe a change…"
          className="min-h-[44px] resize-none bg-background/40"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
        />
        <Button type="submit">Morph</Button>
      </form>
    </div>
  )
}
