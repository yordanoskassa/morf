// 🔒 immutable — the chat that drives the self-editing loop.
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { morphClient } from './morphClient'
import { Voice } from './Voice'
import type { CandidateResult, MorphResponse } from './types'

interface Turn {
  prompt: string
  loading: boolean
  result?: MorphResponse
}

function stateBadge(c: CandidateResult) {
  if (c.blocked) return <Badge variant="destructive">blocked</Badge>
  if (c.compiled && c.rendered) return <Badge className="bg-emerald-600">compiled + rendered</Badge>
  if (c.compiled) return <Badge className="bg-amber-500">compiled, no render</Badge>
  return <Badge variant="secondary">failed</Badge>
}

function Candidate({ c, winner }: { c: CandidateResult; winner: boolean }) {
  return (
    <div className={`rounded-lg border p-3 text-sm ${winner ? 'border-emerald-500 bg-emerald-500/5' : 'border-border'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold uppercase">{c.racer}</span>
          {winner && <Badge className="bg-emerald-600">winner</Badge>}
        </div>
        {stateBadge(c)}
      </div>
      <p className="mt-1 text-muted-foreground">{c.summary}</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>edit: {c.edit_type}</span>
        <span>{c.total_ms} ms</span>
        <span>{c.files.length} file{c.files.length === 1 ? '' : 's'}</span>
        {c.blocked_reason && <span className="text-destructive">{c.blocked_reason}</span>}
      </div>
    </div>
  )
}

export function Chat() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')

  async function send(prompt: string) {
    const text = prompt.trim()
    if (!text) return
    setInput('')
    const idx = turns.length
    setTurns((t) => [...t, { prompt: text, loading: true }])
    try {
      const result = await morphClient.morph(text)
      setTurns((t) => t.map((x, i) => (i === idx ? { ...x, loading: false, result } : x)))
      if (result.shipped) toast.success('Morph shipped', { description: result.winner?.summary })
      else if (result.winner) toast('Winner found but not shipped')
      else toast.error('No candidate compiled + rendered')
    } catch (e) {
      setTurns((t) => t.map((x, i) => (i === idx ? { ...x, loading: false } : x)))
      toast.error('Morph failed', { description: String(e) })
    }
  }

  async function undo(span_id: string, commit_sha: string | null) {
    await morphClient.undo(span_id, commit_sha)
    toast('Undone — logged as a quality signal')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="text-sm font-semibold">morph</h1>
          <p className="text-xs text-muted-foreground">a coding chat that builds itself</p>
        </div>
        <Voice onTranscript={send} />
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 py-4">
          {turns.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Ask for a change — e.g. “add a hero section with a call-to-action button”. Three
              models race to build it; the winner ships and hot-reloads the stage.
            </p>
          )}
          {turns.map((t, i) => (
            <div key={i} className="space-y-2">
              <div className="ml-auto w-fit max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
                {t.prompt}
              </div>
              {t.loading && <p className="text-sm text-muted-foreground">3 models racing…</p>}
              {t.result && (
                <Card>
                  <CardContent className="space-y-2 p-3">
                    {t.result.candidates.map((c) => (
                      <Candidate key={c.racer} c={c} winner={c.span_id === t.result!.winner?.span_id && !!t.result!.winner} />
                    ))}
                    {t.result.winner && (
                      <>
                        <Separator />
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {t.result.shipped ? `shipped ${t.result.commit_sha?.slice(0, 7) ?? ''}` : 'not shipped'}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => undo(t.result!.winner!.span_id!, t.result!.commit_sha)}
                            disabled={!t.result.winner.span_id}
                          >
                            Undo
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe a change…"
          className="min-h-[44px] resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send(input)
            }
          }}
        />
        <Button type="submit">Morph</Button>
      </form>
    </div>
  )
}
