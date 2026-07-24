// Name-only login gate (hackathon). No passwords — just a handle to attribute
// morphs + votes. Stored in localStorage.
import { useState } from 'react'
import { getUser, setUser, type User } from './user'
import { Button } from '@/components/ui/button'

export function useAuth() {
  const [user, setU] = useState<User | null>(getUser())
  return { user, login: (name: string) => setU(setUser(name)) }
}

export function LoginGate({ onLogin }: { onLogin: (name: string) => void }) {
  const [name, setName] = useState('')
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="w-[320px] rounded-2xl border border-white/10 bg-neutral-950 p-6 text-center shadow-2xl">
        <div style={{ fontFamily: '"Jersey 15", monospace', letterSpacing: '0.02em' }} className="text-5xl text-white">morf</div>
        <p className="mt-2 text-sm text-neutral-400">pick a handle — you'll morf and vote as this name</p>
        <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onLogin(name) }} className="mt-4 space-y-3">
          <input
            autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="your name"
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-center text-sm text-white outline-none placeholder:text-neutral-500"
          />
          <Button type="submit" className="w-full" disabled={!name.trim()}>Enter</Button>
        </form>
      </div>
    </div>
  )
}
