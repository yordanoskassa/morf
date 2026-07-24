import { Button } from '@/components/ui/button'

export default function Stage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-2">
        <div className="text-6xl text-blue-500">🦘</div>
        <h1 className="text-4xl font-bold tracking-tight text-emerald-500">haha silly words</h1>
        <p className="text-lg text-muted-foreground">built by three racing models</p>
      </div>
      <p className="max-w-md text-muted-foreground">
        This panel is the mutable stage. Type a request in the chat and three models will
        race to rewrite it. The winner ships and this reloads.
      </p>
      <Button size="lg" className="h-14 px-8 text-lg">
        Launch
      </Button>
      <footer className="mt-auto pt-4 text-sm text-muted-foreground">© 2026 Morph</footer>
    </div>
  )
}
