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
      <svg
        viewBox="0 0 200 120"
        className="h-40 w-auto text-blue-500"
        fill="currentColor"
        aria-label="Blue corgi silhouette"
      >
        <path d="M45 85 C40 85 35 80 35 70 C35 60 40 55 45 55 C45 45 50 35 60 35 C65 35 70 38 73 42 C78 38 85 35 95 35 C110 35 120 42 125 50 C130 48 135 48 140 50 C150 55 155 65 155 75 C155 85 150 90 145 90 L140 90 C140 95 135 100 130 100 C125 100 120 95 120 90 L85 90 C85 95 80 100 75 100 C70 100 65 95 65 90 L55 90 C50 90 45 88 45 85 Z" />
        <ellipse cx="60" cy="30" rx="8" ry="14" transform="rotate(-15 60 30)" />
        <ellipse cx="78" cy="28" rx="8" ry="14" transform="rotate(10 78 28)" />
        <circle cx="58" cy="48" r="3" />
        <path d="M52 52 Q58 56 64 52" stroke="currentColor" strokeWidth="2" fill="none" />
        <ellipse cx="145" cy="72" rx="12" ry="8" />
      </svg>
      <Button size="lg" className="h-14 px-8 text-lg">
        Launch
      </Button>
    </div>
  )
}
