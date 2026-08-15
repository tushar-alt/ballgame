'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Crosshair, Loader2, Lock, User } from 'lucide-react'

export function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const fn = mode === 'login' ? signIn : signUp
    const { error } = await fn(username, password)
    if (error) setError(error)
    setBusy(false)
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 inline-flex size-14 items-center justify-center rounded-2xl glass border-glow-purple">
          <Crosshair className="size-6 text-primary" />
        </div>
        <h1 className="font-mono text-2xl font-black tracking-[0.25em] text-foreground text-glow-purple">
          CIZRE
        </h1>
        <h2 className="font-mono text-base font-bold tracking-[0.4em] text-accent text-glow-cyan">
          PAINTBALL
        </h2>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm glass-strong rounded-2xl p-6">
        {/* Mode toggle */}
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              className={`rounded-lg py-2.5 font-mono text-[10px] font-bold tracking-[0.15em] transition-all ${
                mode === m
                  ? 'bg-primary/90 text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m === 'login' ? 'SIGN IN' : 'REGISTER'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex items-center gap-3 rounded-xl glass px-3 focus-within:border-primary/50 transition-colors">
            <User className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoCapitalize="none"
              autoComplete="username"
              className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </label>
          <label className="flex items-center gap-3 rounded-xl glass px-3 focus-within:border-primary/50 transition-colors">
            <Lock className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </label>

          {error && (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary/90 py-3 font-mono text-xs font-bold tracking-[0.2em] text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            {mode === 'login' ? 'ENTER ARENA' : 'CREATE ACCOUNT'}
          </button>
        </form>
      </div>

      <p className="mt-8 max-w-xs text-center font-mono text-[10px] leading-relaxed text-muted-foreground/60">
        Neon multiplayer arena. Join with a code, invite friends, enter the field.
      </p>
    </div>
  )
}
