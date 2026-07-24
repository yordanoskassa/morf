// ✏️ MUTABLE — this is the app being built. Morphs rewrite this file (and its siblings
// under src/mutable/). Everything else in the repo is locked. Ask the chat to change it.
import { Button } from '@/components/ui/button'

export default function Stage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Your app starts here</h1>
      <p className="max-w-md text-muted-foreground">
        This panel is the mutable stage. Type a request in the chat and three models will
        race to rewrite it. The winner ships and this reloads.
      </p>
      <Button size="lg">Get started</Button>
    </div>
  )
}
