'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { createLobby, joinLobbyByCode, joinLobbyById } from '@/lib/lobby-api'
import type { GameInvite, Lobby, Profile } from '@/lib/types'
import { GAME_MAPS } from '@/lib/types'
import { FriendsPanel } from './friends-panel'
import {
  Coins,
  Crosshair,
  DoorOpen,
  Loader2,
  LogOut,
  Plus,
  Skull,
  Swords,
  Target,
  Trophy,
  Users,
} from 'lucide-react'

export function MainMenu({ onEnterLobby }: { onEnterLobby: (lobby: Lobby) => void }) {
  const { profile, userId, signOut } = useAuth()
  const [tab, setTab] = useState<'play' | 'friends'>('play')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [invites, setInvites] = useState<GameInvite[]>([])

  useEffect(() => {
    if (!userId) return
    const supabase = getSupabaseBrowser()
    if (!supabase) return

    async function loadInvites() {
      const { data } = await supabase!
        .from('game_invites')
        .select('*')
        .eq('to_user', userId!)
        .eq('status', 'pending')
      if (!data) return
      const withProfiles = await Promise.all(
        (data as GameInvite[]).map(async (inv) => {
          const { data: p } = await supabase!
            .from('profiles')
            .select('*')
            .eq('id', inv.from_user)
            .maybeSingle()
          return { ...inv, from_profile: (p as Profile) ?? undefined }
        }),
      )
      setInvites(withProfiles)
    }

    loadInvites()
    const channel = supabase
      .channel(`invites:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_invites', filter: `to_user=eq.${userId}` },
        () => loadInvites(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  async function handleCreate(map: string) {
    if (!userId) return
    setBusy(true)
    setError('')
    const { lobby, error } = await createLobby(userId, map)
    setBusy(false)
    if (error) setError(error)
    else if (lobby) onEnterLobby(lobby)
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !code.trim()) return
    setBusy(true)
    setError('')
    const { lobby, error } = await joinLobbyByCode(userId, code)
    setBusy(false)
    if (error) setError(error)
    else if (lobby) onEnterLobby(lobby)
  }

  async function acceptInvite(inv: GameInvite) {
    if (!userId) return
    const supabase = getSupabaseBrowser()
    if (!supabase) return
    await supabase.from('game_invites').update({ status: 'accepted' }).eq('id', inv.id)
    const res = await joinLobbyById(userId, inv.lobby_id)
    if (res.lobby) onEnterLobby(res.lobby)
    else if (res.error) setError(res.error)
  }

  async function declineInvite(inv: GameInvite) {
    const supabase = getSupabaseBrowser()
    if (!supabase) return
    await supabase.from('game_invites').update({ status: 'declined' }).eq('id', inv.id)
  }

  if (!profile) return null

  const kd = profile.deaths > 0 ? (profile.kills / profile.deaths).toFixed(2) : profile.kills.toFixed(2)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 glass-strong px-4 py-3 safe-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl glass border-glow-purple">
              <Crosshair className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-mono text-sm font-bold tracking-[0.1em]">{profile.username}</p>
              <p className="flex items-center gap-1 font-mono text-[10px] text-accent">
                <Coins className="size-3" /> {profile.money}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="rounded-xl glass p-2.5 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 px-4 py-4">
        {/* Invites */}
        {invites.length > 0 && (
          <div className="mb-4 flex flex-col gap-2">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between glass rounded-xl px-3 py-2.5 border-glow-purple">
                <p className="text-[11px]">
                  <span className="font-bold text-primary">{inv.from_profile?.username ?? 'Player'}</span>
                  <span className="text-muted-foreground ml-1">invited you</span>
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => acceptInvite(inv)}
                    className="rounded-lg bg-accent/90 px-3 py-1.5 font-mono text-[9px] font-bold tracking-wider text-accent-foreground active:scale-95"
                  >
                    JOIN
                  </button>
                  <button
                    onClick={() => declineInvite(inv)}
                    className="rounded-lg bg-white/5 px-2.5 py-1.5 font-mono text-[9px] font-bold text-muted-foreground active:scale-95"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="mb-5 grid grid-cols-4 gap-2">
          <StatCard icon={<Trophy className="size-3.5" />} label="WINS" value={profile.wins} accent="cyan" />
          <StatCard icon={<Swords className="size-3.5" />} label="MATCHES" value={profile.matches_played} accent="purple" />
          <StatCard icon={<Target className="size-3.5" />} label="KILLS" value={profile.kills} accent="cyan" />
          <StatCard icon={<Skull className="size-3.5" />} label="K/D" value={kd} accent="purple" />
        </div>

        {/* Tabs */}
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1">
          {(['play', 'friends'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 font-mono text-[10px] font-bold tracking-[0.15em] transition-all ${
                tab === t
                  ? t === 'play' ? 'bg-primary/90 text-primary-foreground' : 'bg-accent/90 text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'play' ? <Swords className="size-3.5" /> : <Users className="size-3.5" />}
              {t === 'play' ? 'PLAY' : 'FRIENDS'}
            </button>
          ))}
        </div>

        {tab === 'play' ? (
          <div className="flex flex-col gap-4">
            {/* Join by code */}
            <form onSubmit={handleJoin} className="flex gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl glass px-3 focus-within:border-accent/40 transition-colors">
                <DoorOpen className="size-4 shrink-0 text-muted-foreground" />
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="LOBBY CODE"
                  maxLength={6}
                  className="w-full bg-transparent py-3 font-mono text-sm tracking-[0.2em] outline-none placeholder:text-muted-foreground/50"
                />
              </div>
              <button
                type="submit"
                disabled={busy || !code.trim()}
                className="rounded-xl bg-accent/90 px-5 font-mono text-[10px] font-bold tracking-[0.15em] text-accent-foreground active:scale-95 disabled:opacity-40 transition-all"
              >
                JOIN
              </button>
            </form>

            {error && (
              <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
                {error}
              </p>
            )}

            <div>
              <p className="mb-2.5 flex items-center gap-1.5 font-mono text-[9px] tracking-[0.2em] text-muted-foreground">
                <Plus className="size-3" /> CREATE LOBBY
              </p>
              <div className="grid grid-cols-1 gap-2">
                {GAME_MAPS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleCreate(m.id)}
                    disabled={busy}
                    className={`group flex items-center gap-3 glass rounded-xl p-3.5 text-left transition-all active:scale-[0.98] disabled:opacity-40 hover:bg-white/5 ${
                      m.accent === 'purple' ? 'border-glow-purple' : 'border-glow-cyan'
                    }`}
                  >
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                        m.accent === 'purple' ? 'bg-primary/15 text-primary' : 'bg-accent/15 text-accent'
                      }`}
                    >
                      <Crosshair className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] font-bold tracking-[0.1em]">{m.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground mt-0.5">{m.description}</p>
                    </div>
                    {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          userId && <FriendsPanel userId={userId} />
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  accent: 'purple' | 'cyan'
}) {
  return (
    <div className="flex flex-col items-center gap-1 glass rounded-xl py-3">
      <span className={accent === 'purple' ? 'text-primary' : 'text-accent'}>{icon}</span>
      <span className="font-mono text-sm font-bold leading-none tabular-nums">{value}</span>
      <span className="font-mono text-[7px] tracking-[0.2em] text-muted-foreground">{label}</span>
    </div>
  )
}
