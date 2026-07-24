// Dead-simple name-only identity (hackathon). Stored in localStorage; one vote per handle.
export interface User { id: string; name: string }

const KEY = 'morf.user'

export function getUser(): User | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function setUser(name: string): User {
  const clean = name.trim().slice(0, 24) || 'anon'
  const existing = getUser()
  const user: User = { id: existing?.id ?? crypto.randomUUID(), name: clean }
  localStorage.setItem(KEY, JSON.stringify(user))
  return user
}
