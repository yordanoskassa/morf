// The chat that drives the self-editing loop. Morphable, but must keep the
// data-morph-chat element and the /morph call alive (chat-survival invariant).
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { morphClient, type MorphEvent } from './morphClient'
import { Voice } from './Voice'
import type { CandidateResult, MorphResponse } from './types'

const RACER_COLOR: Record<string, string> = {
  kimi: 'text-violet-400', glm: 'text-cyan-400', qwen: 'text-amber-400',
}
const PHASE_LABEL: Record<string, string> = {
  thinking: 'thinking', generated: 'proposed', sandbox: 'warm sandbox', sync: 'syncing',
  build: 'building', compiled: 'compiled', serve: 'starting', render: 'rendering',
  rendered: 'rendered', chat_check: 'checking chat', chat_ok: 'chat ✓',
  build_failed: 'compile failed', render_failed: 'no render', chat_broken: 'chat ✗', done: 'done',
}

interface RacerLive {
  key: string; role: string; phase: string
  status: 'running' | 'won' | 'lost' | 'error' | 'blocked'
  compiled?: boolean; rendered?: boolean; chat_ok?: boolean; total_ms?: number
}
interface Turn {
  prompt: string; live: boolean
  racers: Record<string, RacerLive>
  log: { racer?: string; text: string }[]
  result?: MorphResponse; winner?: string; shipped?: { ok: boolean; sha: string | null }
}

function RacerChip({ r, winner }: { r: RacerLive; winner: boolean }) {
  const color = RACER_COLOR[r.key] ?? 'text-foreground'
  const dead = r.status === 'error' || r.status === 'blocked' || r.status === 'lost'
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs
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
      <div className="grid grid-cols-3 gap-1.5">
        {Object.values(turn.racers).map((r) => <RacerChip key={r.key} r={r} winner={turn.winner === r.key} />)}
      </div>
      <div className="max-h-28 overflow-auto rounded-lg border border-border/50 bg-black/30 p-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
        {turn.log.map((l, i) => (
          <div key={i}>{l.racer && <span className={RACER_COLOR[l.racer] ?? ''}>[{l.racer}] </span>}{l.text}</div>
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

type Dock = 'bottom' | 'left' | 'right' | 'free'

export function Chat() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [minimized, setMinimized] = useState(false)
  const [open, setOpen] = useState(false)          // is the panel (console/results) showing
  const [dock, setDock] = useState<Dock>('bottom')
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const dragRef = useRef<{ dx: number; dy: number } | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const busy = turns.some((t) => t.live)

  function patch(idx: number, fn: (t: Turn) => Turn) {
    setTurns((ts) => ts.map((t, i) => (i === idx ? fn(t) : t)))
  }

  // ---- drag to move ----
  const onMove = useCallback((e: PointerEvent) => {
    if (!dragRef.current) return
    setPos({ x: e.clientX - dragRef.current.dx, y: e.clientY - dragRef.current.dy })
  }, [])
  const onUp = useCallback(() => {
    dragRef.current = null
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }, [onMove])
  function startDrag(e: React.PointerEvent) {
    const rect = boxRef.current!.getBoundingClientRect()
    setPos({ x: rect.left, y: rect.top })
    setDock('free')
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // position styles per dock mode
  const dockStyle: React.CSSProperties =
    dock === 'free' ? { left: pos.x, top: pos.y }
    : dock === 'left' ? { left: 16, top: '50%', transform: 'translateY(-50%)' }
    : dock === 'right' ? { right: 16, top: '50%', transform: 'translateY(-50%)' }
    : { left: '50%', bottom: 16, transform: 'translateX(-50%)' }  // bottom

  async function send(prompt: string) {
    const text = prompt.trim()
    if (!text) return
    setInput(''); setOpen(true)
    const idx = turns.length
    setTurns((ts) => [...ts, { prompt: text, live: true, racers: {}, log: [] }])

    const onEvent = (ev: MorphEvent) => {
      const racer = ev.racer as string | undefined
      patch(idx, (t) => {
        const racers = { ...t.racers }; const log = [...t.log]
        const set = (k: string, p: Partial<RacerLive>) => { racers[k] = { ...racers[k], ...p } }
        switch (ev.type) {
          case 'start':
            for (const r of ev.racers as { key: string; role: string }[])
              racers[r.key] = { key: r.key, role: r.role, phase: 'queued', status: 'running' }
            log.push({ text: '3 models racing…' }); break
          case 'warming': log.push({ text: '🔥 warming sandbox image (first run only)…' }); break
          case 'gen_start': if (racer) set(racer, { phase: 'thinking' }); break
          case 'gen_done': if (racer) set(racer, { phase: 'generated' }); log.push({ racer, text: `proposed: ${ev.summary}` }); break
          case 'gen_fail': if (racer) set(racer, { phase: 'error', status: 'error' }); log.push({ racer, text: 'model error' }); break
          case 'blocked': if (racer) set(racer, { phase: 'blocked', status: 'blocked' }); log.push({ racer, text: `blocked: ${ev.reason}` }); break
          case 'step': if (racer) set(racer, { phase: ev.phase as string }); log.push({ racer, text: `${ev.phase} · ${ev.detail ?? ''}` }); break
          case 'eval_done':
            if (racer) set(racer, { phase: 'done', compiled: ev.compiled as boolean, rendered: ev.rendered as boolean, chat_ok: ev.chat_ok as boolean, total_ms: ev.total_ms as number, status: (ev.compiled && ev.rendered && ev.chat_ok) ? 'running' : 'lost' })
            break
          case 'winner':
            for (const k of Object.keys(racers)) if (k !== racer && racers[k].status === 'running') racers[k].status = 'lost'
            if (racer) set(racer, { status: 'won' })
            log.push({ racer, text: `WINNER (${ev.total_ms}ms)` })
            return { ...t, racers, log, winner: racer }
          case 'applied': log.push({ text: '✍️  written locally — hot-reloading' }); break
          case 'shipping': log.push({ text: '⬆️  pushing to GitHub' }); break
          case 'shipped': log.push({ text: ev.ok ? `✅ shipped ${String(ev.commit_sha ?? '').slice(0, 7)}` : '⚠️ ship failed' }); return { ...t, racers, log, shipped: { ok: ev.ok as boolean, sha: (ev.commit_sha as string) ?? null } }
          case 'no_winner': log.push({ text: '✗ no candidate survived' }); break
          case 'error': log.push({ text: `error: ${ev.error}` }); return { ...t, racers, log, live: false }
          case 'done': return { ...t, racers, log, result: ev.result as MorphResponse, live: false }
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

  // ---- minimized: just a pill ----
  if (minimized) {
    return (
      <button
        data-morph-chat
        onClick={() => setMinimized(false)}
        style={dockStyle}
        className="fixed z-50 flex items-center gap-2 rounded-full border border-white/10 bg-background/70 px-4 py-2 text-sm font-medium shadow-2xl backdrop-blur-xl hover:bg-background/90"
      >
        <span className={`h-2 w-2 rounded-full ${busy ? 'animate-pulse bg-emerald-400' : 'bg-violet-400'}`} />
        morf
      </button>
    )
  }

  return (
    <div
      ref={boxRef}
      data-morph-chat
      style={dockStyle}
      className="fixed z-50 flex w-[min(680px,calc(100vw-2rem))] flex-col gap-2"
    >
      {/* expandable panel: live console + results, grows upward from the bar */}
      {open && turns.length > 0 && (
        <div className="max-h-[45vh] overflow-auto rounded-2xl border border-white/10 bg-background/70 p-3 shadow-2xl backdrop-blur-xl">
          <div className="space-y-3">
            {turns.map((t, i) => (
              <div key={i} className="space-y-2">
                <div className="ml-auto w-fit max-w-[85%] rounded-2xl bg-primary px-3 py-1.5 text-sm text-primary-foreground">{t.prompt}</div>
                {(t.live || t.log.length > 0) && <LiveConsole turn={t} />}
                {t.result && (
                  <div className="space-y-1.5 rounded-xl border border-border/50 bg-background/40 p-2">
                    {t.result.candidates.map((c) => (
                      <CandidateCard key={c.racer} c={c} winner={!!t.result!.winner && c.span_id === t.result!.winner.span_id} />
                    ))}
                    {t.result.winner && (
                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <span className="text-muted-foreground">{t.shipped?.ok ? `shipped ${t.shipped.sha?.slice(0, 7)}` : 'not shipped'}</span>
                        <Button size="sm" variant="outline" className="h-7" onClick={() => undo(t.result!.winner!.span_id!, t.shipped?.sha ?? null)} disabled={!t.result.winner.span_id}>Undo</Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* the one-line command bar */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(input) }}
        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-background/70 px-2 py-1.5 shadow-2xl backdrop-blur-xl"
      >
        {/* drag handle */}
        <button type="button" onPointerDown={startDrag} title="drag to move"
          className="cursor-grab px-1 text-muted-foreground hover:text-foreground active:cursor-grabbing">⠿</button>

        {/* morf wordmark — the logo lives inline on the bar. data-morph-logo is a survival
            anchor: morphs may restyle it, never remove it. */}
        <span
          data-morph-logo
          className="select-none px-0.5 text-xl leading-none text-foreground"
          style={{ fontFamily: '"Jersey 15", monospace', letterSpacing: '0.03em', textShadow: '0 0 10px rgba(255,255,255,0.25)' }}
        >
          morf
        </span>

        <span className="h-4 w-px shrink-0 bg-white/15" />
        <span className={`h-2 w-2 shrink-0 rounded-full ${busy ? 'animate-pulse bg-emerald-400' : 'bg-violet-400'}`} />

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={busy ? 'morfing…' : 'Describe a change to the app…'}
          className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
        />

        <Voice onTranscript={send} />

        {/* dock cycle */}
        <button type="button" title="move: bottom / left / right"
          onClick={() => setDock((d) => (d === 'bottom' ? 'left' : d === 'left' ? 'right' : 'bottom'))}
          className="rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-white/10 hover:text-foreground">⤢</button>

        {/* toggle panel */}
        {turns.length > 0 && (
          <button type="button" title={open ? 'hide log' : 'show log'} onClick={() => setOpen((o) => !o)}
            className="rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-white/10 hover:text-foreground">{open ? '▾' : '▴'}</button>
        )}

        {/* minimize */}
        <button type="button" title="minimize" onClick={() => setMinimized(true)}
          className="rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-white/10 hover:text-foreground">—</button>

        <Button type="submit" size="sm" className="h-8 rounded-full px-4 bg-[#39FF14] text-black shadow-[0_0_15px_#39FF14] hover:bg-[#39FF14]/90">Morf</Button>
      </form>
    </div>
  )
}
