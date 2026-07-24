// The voted timeline — everyone's morphs, newest first. Vote up/down anyone's change,
// see which version is the community favorite (⭐) vs live (●), and restore any past one.
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { morphClient, type TimelineItem, type TimelineResponse } from './morphClient'

const RACER_COLOR: Record<string, string> = { kimi: '#a78bfa', glm: '#22d3ee', qwen: '#fbbf24' }
const POLL_MS = 5000
const EMPTY: TimelineResponse = { items: [], top_id: null, current_id: null }

function Row({ it, top, current, onVote, onRestore }: {
  it: TimelineItem; top: boolean; current: boolean
  onVote: (v: number) => void; onRestore: () => void
}) {
  const mv = it.my_vote
  return (
    <div className={`rounded-lg border p-2 ${top ? 'border-amber-400/50 bg-amber-400/5' : 'border-white/10 bg-white/5'}`}>
      <div className="flex items-start gap-2">
        {/* vote stack */}
        <div className="flex flex-col items-center">
          <button onClick={() => onVote(mv === 1 ? 0 : 1)}
            className={`leading-none ${mv === 1 ? 'text-emerald-400' : 'text-neutral-500 hover:text-neutral-300'}`}>▲</button>
          <span className="text-xs font-semibold tabular-nums text-neutral-200">{it.score}</span>
          <button onClick={() => onVote(mv === -1 ? 0 : -1)}
            className={`leading-none ${mv === -1 ? 'text-rose-400' : 'text-neutral-500 hover:text-neutral-300'}`}>▼</button>
        </div>
        {/* body */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {top && <span title="community favorite">⭐</span>}
            {current && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="live now" />}
            <span className="truncate text-xs text-neutral-100">{it.prompt || '—'}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-neutral-400">
            <span>{it.author}</span>
            {it.model && <span className="font-mono uppercase" style={{ color: RACER_COLOR[it.model] }}>{it.model}</span>}
            {it.restored_from && <span>· restored</span>}
            <span>· {it.up}↑ {it.down}↓</span>
          </div>
        </div>
        {/* restore */}
        {it.shipped && !current && (
          <button onClick={onRestore}
            className="shrink-0 rounded-md border border-white/15 px-2 py-0.5 text-[10px] text-neutral-200 hover:bg-white/10">restore</button>
        )}
      </div>
    </div>
  )
}

export function Timeline() {
  const [data, setData] = useState<TimelineResponse>(EMPTY)

  const load = useCallback(async () => {
    try { setData(await morphClient.timeline()) } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, POLL_MS)
    return () => clearInterval(id)
  }, [load])

  async function vote(morph_id: string, value: number) {
    // optimistic: refresh right after
    await morphClient.vote(morph_id, value)
    load()
  }

  async function restore(morph_id: string) {
    const r = await morphClient.restore(morph_id)
    if (r.ok) toast.success('Restored — the app reverted to that version')
    else toast.error('Restore failed', { description: r.error })
    load()
  }

  const favorite = data.items.find((i) => i.morph_id === data.top_id)

  return (
    <div className="flex h-full flex-col gap-2 overflow-auto p-3">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-sm font-semibold">Timeline · vote</h2>
        <span className="text-[10px] text-neutral-400">{data.items.length} changes</span>
      </div>

      {favorite && favorite.morph_id !== data.current_id && (
        <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-2 text-[11px] text-amber-200">
          ⭐ A past version (“{favorite.prompt.slice(0, 28)}”) is the crowd favorite — restore it?
        </div>
      )}

      <div className="space-y-1.5">
        {data.items.length === 0 && <div className="px-1 text-xs text-neutral-400">no changes yet — morf something</div>}
        {data.items.map((it) => (
          <Row key={it.morph_id} it={it}
            top={it.morph_id === data.top_id}
            current={it.morph_id === data.current_id}
            onVote={(v) => vote(it.morph_id, v)}
            onRestore={() => restore(it.morph_id)} />
        ))}
      </div>
    </div>
  )
}
