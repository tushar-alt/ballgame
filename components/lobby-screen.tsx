'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import {
  leaveLobby,
  sendMessage,
  setMap as setLobbyMap,
  setTeam as setMemberTeam,
} from '@/lib/lobby-api'
import { sendGameInvite } from '@/lib/invite-api'
import { GameEngine } from '@/lib/game/engine'
import type { Lobby, LobbyMember, LobbyMessage, Profile } from '@/lib/types'
import { GAME_MAPS } from '@/lib/types'
import { FriendsPanel } from './friends-panel'
import {
  ArrowLeft,
  Copy,
  Crosshair,
  Send,
  Users,
  MessageSquare,
  Check,
  Play,
} from 'lucide-react'

export function LobbyScreen({
  lobby: initialLobby,
  onLeave,
  onStart,
}: {
  lobby: Lobby
  onLeave: () => void
  onStart?: (engine: GameEngine) => void
}) {
  const { userId, profile } = useAuth()
  const [lobby, setLobby] = useState<Lobby>(initialLobby)
  const [members, setMembers] = useState<LobbyMember[]>([])
  const [messages, setMessages] = useState<LobbyMessage[]>([])
  const [input, setInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [showFriends, setShowFriends] = useState(false)
  const [pane, setPane] = useState<'lobby' | 'chat'>('lobby')
  const chatEndRef = useRef<HTMLDivElement>(null)

  const isHost = lobby.host_id === userId

  const loadMembers = useCallback(async () => {
    const supabase = getSupabaseBrowser()
    if (!supabase) return
    const { data } = await supabase
      .from('lobby_members')
      .select('*')
      .eq('lobby_id', lobby.id)
      .order('joined_at', { ascending: true })
    if (!data) return
    const rows = data as LobbyMember[]
    const ids = rows.map((r) => r.user_id)
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids)
    const pMap = new Map<string, Profile>()
    ;(profiles as Profile[] | null)?.forEach((p) => pMap.set(p.id, p))
    setMembers(rows.map((r) => ({ ...r, profile: pMap.get(r.user_id) })))
  }, [lobby.id])

  const loadMessages = useCallback(async () => {
    const supabase = getSupabaseBrowser()
    if (!supabase) return
    const { data } = await supabase
      .from('lobby_messages')
      .select('*')
      .eq('lobby_id', lobby.id)
      .order('created_at', { ascending: true })
      .limit(100)
    if (data) setMessages(data as LobbyMessage[])
  }, [lobby.id])

  useEffect(() => {
    loadMembers()
    loadMessages()
    const supabase = getSupabaseBrowser()
    if (!supabase) return

    const channel = supabase
      .channel(`lobby:${lobby.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobby_members', filter: `lobby_id=eq.${lobby.id}` }, () => loadMembers())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lobby_messages', filter: `lobby_id=eq.${lobby.id}` }, (payload) => setMessages((prev) => [...prev, payload.new as LobbyMessage]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lobbies', filter: `id=eq.${lobby.id}` }, (payload) => setLobby(payload.new as Lobby))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'lobbies', filter: `id=eq.${lobby.id}` }, () => onLeave())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [lobby.id, loadMembers, loadMessages, onLeave])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !userId || !profile) return
    const content = input.trim()
    setInput('')
    await sendMessage(lobby.id, userId, profile.username, content)
  }

  async function handleLeave() {
    if (userId) await leaveLobby(userId, lobby)
    onLeave()
  }

  async function handleStart() {
    if (!userId || !profile || !onStart) return
    const supabase = getSupabaseBrowser()
    if (supabase) {
      await supabase.from('lobbies').update({ status: 'in_game' }).eq('id', lobby.id)
      setLobby((prev) => ({ ...prev, status: 'in_game' }))
    }
    const engine = new GameEngine({
      mapId: lobby.map,
      localId: userId,
      localName: profile.username,
      localColor: '#8b5cf6',
      localTeam: 'A',
      humans: [{ id: userId, name: profile.username, color: '#8b5cf6', team: 'A' }],
      botsPerTeam: 2,
      onMatchEnd: () => {},
    })
    onStart(engine)
  }

  function copyCode() {
    navigator.clipboard?.writeText(lobby.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const teamA = members.filter((m) => m.team === 'A')
  const teamB = members.filter((m) => m.team === 'B')
  const myTeam = members.find((m) => m.user_id === userId)?.team
  const currentMap = GAME_MAPS.find((m) => m.id === lobby.map) ?? GAME_MAPS[0]
  const canStart = members.length >= 1

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 glass-strong px-4 py-3 safe-top">
        <div className="flex items-center justify-between">
          <button onClick={handleLeave} className="rounded-xl glass p-2.5 text-muted-foreground active:scale-95 transition-all">
            <ArrowLeft className="size-4" />
          </button>

          <button
            onClick={copyCode}
            className="flex items-center gap-2 glass rounded-xl px-4 py-2.5 border-glow-purple transition-all active:scale-95"
          >
            <span className="font-mono text-base font-black tracking-[0.3em] text-primary">{lobby.code}</span>
            {copied ? <Check className="size-3.5 text-accent" /> : <Copy className="size-3.5 text-muted-foreground" />}
          </button>

          <div className="flex items-center gap-1.5 glass rounded-xl px-3 py-2.5">
            <Users className="size-3.5 text-muted-foreground" />
            <span className="font-mono text-xs font-bold tabular-nums">{members.length}</span>
          </div>
        </div>
      </header>

      {/* Tab switch */}
      <div className="grid grid-cols-2 gap-1 p-3">
        {(['lobby', 'chat'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPane(p)}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 font-mono text-[10px] font-bold tracking-[0.15em] transition-all ${
              pane === p
                ? p === 'lobby' ? 'bg-primary/90 text-primary-foreground' : 'bg-accent/90 text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {p === 'lobby' ? <Users className="size-3.5" /> : <MessageSquare className="size-3.5" />}
            {p === 'lobby' ? 'LOBBY' : 'CHAT'}
          </button>
        ))}
      </div>

      {pane === 'lobby' ? (
        <div className="flex-1 px-4 pb-4">
          {/* Map card */}
          <div className="mb-4 glass rounded-xl p-4 border-glow-purple">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Crosshair className="size-5" />
              </div>
              <div>
                <p className="font-mono text-[8px] tracking-[0.25em] text-muted-foreground">MAP</p>
                <p className="font-mono text-sm font-bold tracking-[0.05em]">{currentMap.name}</p>
              </div>
            </div>
            {isHost && (
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {GAME_MAPS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setLobbyMap(lobby.id, m.id)}
                    className={`rounded-lg px-2 py-2 font-mono text-[9px] font-bold tracking-[0.1em] transition-all active:scale-95 ${
                      lobby.map === m.id
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'bg-white/5 text-muted-foreground border border-transparent'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Teams */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <TeamColumn title="PURPLE" accent="purple" members={teamA} hostId={lobby.host_id}
              onJoin={myTeam !== 'A' ? () => userId && setMemberTeam(userId, lobby.id, 'A') : undefined} />
            <TeamColumn title="CYAN" accent="cyan" members={teamB} hostId={lobby.host_id}
              onJoin={myTeam !== 'B' ? () => userId && setMemberTeam(userId, lobby.id, 'B') : undefined} />
          </div>

          {/* Friends invite */}
          <button
            onClick={() => setShowFriends((s) => !s)}
            className="mb-3 flex w-full items-center justify-center gap-2 glass rounded-xl py-2.5 font-mono text-[10px] font-bold tracking-[0.15em] text-accent active:scale-[0.98] transition-all"
          >
            <Send className="size-3.5" /> INVITE FRIENDS
          </button>
          {showFriends && userId && (
            <div className="mb-4 glass rounded-xl p-3">
              <FriendsPanel
                userId={userId}
                canInvite
                onInvite={(f) => { if (userId) sendGameInvite(userId, f.profile.id, lobby.id) }}
              />
            </div>
          )}

          {/* Start button */}
          {isHost && (
            <button
              onClick={handleStart}
              disabled={!canStart}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary/90 py-4 font-mono text-xs font-black tracking-[0.2em] text-primary-foreground active:scale-[0.98] disabled:opacity-40 transition-all"
            >
              <Play className="size-4" /> START MATCH
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="mt-12 text-center font-mono text-[10px] text-muted-foreground/50">No messages yet</p>
            )}
            {messages.map((m) => {
              const mine = m.user_id === userId
              return (
                <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  <span className="mb-0.5 px-1 font-mono text-[8px] tracking-wider text-muted-foreground/60">
                    {m.username}
                  </span>
                  <span
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-[12px] ${
                      mine
                        ? 'bg-primary/90 text-primary-foreground'
                        : 'glass'
                    }`}
                  >
                    {m.content}
                  </span>
                </div>
              )
            })}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSend} className="flex gap-2 glass-strong p-3 safe-bottom">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-xl glass px-3 py-2.5 text-sm outline-none focus:border-accent/40 transition-colors placeholder:text-muted-foreground/40"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-xl bg-accent/90 px-4 text-accent-foreground active:scale-95 disabled:opacity-30 transition-all"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function TeamColumn({
  title,
  accent,
  members,
  hostId,
  onJoin,
}: {
  title: string
  accent: 'purple' | 'cyan'
  members: LobbyMember[]
  hostId: string
  onJoin?: () => void
}) {
  return (
    <div className={`flex flex-col glass rounded-xl p-3 ${accent === 'purple' ? 'border-glow-purple' : 'border-glow-cyan'}`}>
      <p className={`mb-2 font-mono text-[9px] font-bold tracking-[0.2em] ${accent === 'purple' ? 'text-primary' : 'text-accent'}`}>
        {title}
      </p>
      <ul className="flex flex-1 flex-col gap-1.5">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-2 text-[11px]">
            <span className={`size-1.5 rounded-full ${accent === 'purple' ? 'bg-primary' : 'bg-accent'}`} />
            <span className="truncate font-medium">{m.profile?.username ?? '...'}</span>
            {m.user_id === hostId && (
              <span className="ml-auto font-mono text-[7px] tracking-[0.15em] text-muted-foreground">HOST</span>
            )}
          </li>
        ))}
        {members.length === 0 && (
          <li className="rounded-lg border border-dashed border-white/10 px-2 py-3 text-center font-mono text-[9px] text-muted-foreground/40">
            Empty
          </li>
        )}
      </ul>
      {onJoin && (
        <button
          onClick={onJoin}
          className={`mt-2 rounded-lg py-2 font-mono text-[9px] font-bold tracking-[0.15em] active:scale-95 transition-all ${
            accent === 'purple' ? 'bg-primary/15 text-primary' : 'bg-accent/15 text-accent'
          }`}
        >
          JOIN
        </button>
      )}
    </div>
  )
}
