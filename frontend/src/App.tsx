// 🔒 immutable — the locked shell. Mounts chat + scoreboard (immutable) around the
// mutable Stage. Morphs can never touch this file.
import { Chat } from '@/immutable/Chat'
import { Scoreboard } from '@/immutable/Scoreboard'
import Stage from '@/mutable/Stage'
import { Toaster } from '@/components/ui/sonner'

export default function App() {
  return (
    <div className="grid h-screen grid-cols-[minmax(320px,380px)_1fr_minmax(300px,360px)] bg-background text-foreground">
      {/* left: the chat that drives everything (locked) */}
      <aside className="border-r">
        <Chat />
      </aside>

      {/* center: the app being built (mutable) */}
      <main className="overflow-auto">
        <Stage />
      </main>

      {/* right: live morph scoreboard (locked) */}
      <aside className="border-l">
        <Scoreboard />
      </aside>

      <Toaster position="bottom-center" />
    </div>
  )
}
