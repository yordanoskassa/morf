import { Button } from '@/components/ui/button'

export default function Stage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Your app starts here</h1>
        <p className="text-lg text-muted-foreground">built by three racing models</p>
      </div>
      <p className="max-w-md text-muted-foreground">
        This panel is the mutable stage. Type a request in the chat and three models will
        race to rewrite it. The winner ships and this reloads.
      </p>
      <Button size="lg" className="h-14 px-8 text-lg">
        Launch
      </Button>
    </div>
  )
}
