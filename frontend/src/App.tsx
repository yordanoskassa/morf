// App shell. Mounts the chat + scoreboard around the stage. Fully morphable — but a
// morph only ships if the chat survives (see INVARIANT.json): the app must keep a
// data-morph-chat element and its /morph call, or the candidate is rejected.
import { Chat } from '@/core/Chat'
import { Scoreboard } from '@/core/Scoreboard'
import Stage from '@/stage/Stage'
import { Toaster } from '@/components/ui/sonner'

export default function App() {
  return (
    <div className="grid h-screen grid-cols-[minmax(320px,380px)_1fr_minmax(300px,360px)] bg-background text-foreground">
      {/* left: the chat that drives everything */}
      <aside className="border-r">
        <Chat />
      </aside>

      {/* center: the stage */}
      <main className="overflow-auto">
        <Stage />
      </main>

      {/* right: live morph scoreboard */}
      <aside className="border-l">
        <Scoreboard />
      </aside>

      <Toaster position="bottom-center" />
    </div>
  )
}
