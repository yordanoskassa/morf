// App shell. Floating glass panels over a full-bleed stage. Fully morphable — but a
// morph only ships if the chat survives (see INVARIANT.json): the app must keep a
// data-morph-chat element and its /morph call, or the candidate is rejected.
import { Chat } from '@/core/Chat'
import { Scoreboard } from '@/core/Scoreboard'
import Stage from '@/stage/Stage'
import { Toaster } from '@/components/ui/sonner'

const glass = 'rounded-2xl border border-white/10 bg-background/60 shadow-2xl backdrop-blur-xl'

export default function App() {
  return (
    <div className="dark relative h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* ambient backdrop so the glass panels read against the stage */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-background via-background to-muted" />
      <div className="pointer-events-none absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-1/4 h-96 w-96 rounded-full bg-cyan-600/20 blur-3xl" />

      {/* the stage — the app being built — fills the viewport */}
      <div className="absolute inset-0">
        <Stage />
      </div>

      {/* floating chat, left */}
      <div className={`absolute left-4 top-4 bottom-4 w-[380px] overflow-hidden ${glass}`}>
        <Chat />
      </div>

      {/* floating scoreboard, right */}
      <div className={`absolute right-4 top-4 max-h-[calc(100vh-2rem)] w-[360px] overflow-hidden ${glass}`}>
        <Scoreboard />
      </div>

      <Toaster position="bottom-center" theme="dark" />
    </div>
  )
}
