// App shell. A full-bleed stage with a floating, movable command-bar chat and a
// collapsible scoreboard, so the app itself stays visible. Fully morphable — but a
// morph only ships if the chat survives (INVARIANT.json): the app must keep a
// data-morph-chat element and its /morph call, or the candidate is rejected.
import { useState } from 'react'
import { Chat } from '@/core/Chat'
import { Scoreboard } from '@/core/Scoreboard'
import { Timeline } from '@/core/Timeline'
import { LoginGate, useAuth } from '@/core/Login'
import Stage from '@/stage/Stage'
import { Toaster } from '@/components/ui/sonner'

const darkGlass = 'rounded-2xl border border-white/10 bg-neutral-950/90 text-neutral-100 shadow-2xl backdrop-blur-xl'

const glass = 'rounded-2xl border border-black/10 bg-white/80 shadow-2xl backdrop-blur-xl'

export default function App() {
  const { user, login } = useAuth()
  const [sbOpen, setSbOpen] = useState(false)
  const [tlOpen, setTlOpen] = useState(false)

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-background to-muted" />
      <div className="pointer-events-none absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-1/4 h-96 w-96 rounded-full bg-red-700/10 blur-3xl" />

      {/* layout: header + sidebar + main */}
      <div className="absolute inset-0 flex flex-col">
        {/* header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-black/10 bg-white/60 px-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <span className="text-lg font-bold text-primary">M</span>
            </div>
            <span className="text-sm font-semibold">this could be anything</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              placeholder="Search…"
              className="h-8 w-56 rounded-lg border border-black/10 bg-white/50 px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
            />
            <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/5">
              <span className="text-sm">🔔</span>
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
              U
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* sidebar */}
          <aside className="flex w-56 shrink-0 flex-col border-r border-black/10 bg-white/40 backdrop-blur-xl">
            <nav className="flex-1 space-y-1 p-3">
              {[
                { icon: '📊', label: 'Dashboard', active: true },
                { icon: '📈', label: 'Analytics', active: false },
                { icon: '👥', label: 'Users', active: false },
                { icon: '💰', label: 'Revenue', active: false },
                { icon: '⚙️', label: 'Settings', active: false },
              ].map((item) => (
                <button
                  key={item.label}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                    item.active
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-black/5 hover:text-foreground'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="border-t border-black/10 p-3">
              <div className="rounded-lg bg-white/50 p-3">
                <div className="text-xs font-bold">Pro plan</div>
                <div className="mt-1 text-[10px] font-bold text-muted-foreground">Upgrade for more features</div>
              </div>
            </div>
          </aside>

          {/* main content */}
          <main className="flex-1 overflow-hidden">
            <Stage />
          </main>
        </div>
      </div>

      {/* collapsible scoreboard, top-right */}
      {sbOpen ? (
        <div className={`absolute right-4 top-4 max-h-[calc(100vh-2rem)] w-[340px] overflow-hidden ${glass}`}>
          <button
            onClick={() => setSbOpen(false)}
            className="absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-xs text-muted-foreground hover:bg-black/5 hover:text-foreground"
            title="hide scoreboard"
          >—</button>
          <Scoreboard />
        </div>
      ) : (
        <button
          onClick={() => setSbOpen(true)}
          className={`absolute right-4 top-4 flex items-center gap-2 px-4 py-2 text-sm font-medium ${glass} hover:bg-white`}
        >
          📊 scoreboard
        </button>
      )}

      {/* collapsible voted timeline, bottom-left */}
      {tlOpen ? (
        <div className={`absolute bottom-4 left-4 max-h-[70vh] w-[320px] overflow-hidden ${darkGlass}`}>
          <button onClick={() => setTlOpen(false)}
            className="absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-xs text-neutral-400 hover:bg-white/10 hover:text-white" title="hide">—</button>
          <Timeline />
        </div>
      ) : (
        <button onClick={() => setTlOpen(true)}
          className={`absolute bottom-4 left-4 flex items-center gap-2 px-4 py-2 text-sm font-medium ${darkGlass} hover:brightness-110`}>
          🕒 timeline · vote
        </button>
      )}

      {/* the chat floats and positions itself (movable + minimizable) */}
      <Chat />

      <Toaster position="top-center" />

      {!user && <LoginGate onLogin={login} />}
    </div>
  )
}
