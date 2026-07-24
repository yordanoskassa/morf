// App shell. A full-bleed stage with a floating, movable command-bar chat and a
// collapsible scoreboard, so the app itself stays visible. Fully morphable — but a
// morph only ships if the chat survives (INVARIANT.json): the app must keep a
// data-morph-chat element and its /morph call, or the candidate is rejected.
import { useState } from 'react'
import { Chat } from '@/core/Chat'
import { Scoreboard } from '@/core/Scoreboard'
import Stage from '@/stage/Stage'
import { Toaster } from '@/components/ui/sonner'

const glass = 'rounded-2xl border border-white/10 bg-background/60 shadow-2xl backdrop-blur-xl'

export default function App() {
  const [sbOpen, setSbOpen] = useState(false)

  return (
    <div className="dark relative h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-background via-background to-muted" />
      <div className="pointer-events-none absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-1/4 h-96 w-96 rounded-full bg-cyan-600/20 blur-3xl" />

      {/* the stage — the app being built — fills the viewport */}
      <div className="absolute inset-0">
        <Stage />
      </div>

      {/* collapsible scoreboard, top-right */}
      {sbOpen ? (
        <div className={`absolute right-4 top-4 max-h-[calc(100vh-2rem)] w-[340px] overflow-hidden ${glass}`}>
          <button
            onClick={() => setSbOpen(false)}
            className="absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-xs text-muted-foreground hover:bg-white/10 hover:text-foreground"
            title="hide scoreboard"
          >—</button>
          <Scoreboard />
        </div>
      ) : (
        <button
          onClick={() => setSbOpen(true)}
          className={`absolute right-4 top-4 flex items-center gap-2 px-4 py-2 text-sm font-medium ${glass} hover:bg-background/80`}
        >
          📊 scoreboard
        </button>
      )}

      {/* the chat floats and positions itself (movable + minimizable) */}
      <Chat />

      <Toaster position="top-center" theme="dark" />
    </div>
  )
}
