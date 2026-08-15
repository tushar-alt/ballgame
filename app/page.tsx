'use client'

import { Suspense, useState } from 'react'
import dynamic from 'next/dynamic'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { SetupNotice } from '@/components/setup-notice'
import { AuthScreen } from '@/components/auth-screen'
import { MainMenu } from '@/components/main-menu'
import { LobbyScreen } from '@/components/lobby-screen'
import { GameHud } from '@/components/game/game-hud'
import { GameErrorBoundary } from '@/components/game/game-error-boundary'
import { GameEngine } from '@/lib/game/engine'
import type { Lobby } from '@/lib/types'
import { Loader2 } from 'lucide-react'

// GameCanvas uses WebGL — must never be SSR'd. Dynamic import with ssr: false
// prevents hydration mismatches and server-side WebGL errors.
const GameCanvas = dynamic(
  () => import('@/components/game/game-canvas').then((m) => m.GameCanvas),
  { ssr: false },
)

function GameLoadingScreen() {
  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-3 bg-black">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="font-mono text-xs tracking-wider text-muted-foreground">SAHNE YÜKLENİYOR...</p>
    </div>
  )
}

function MatchScreen({ engine, onClose }: { engine: GameEngine; onClose: () => void }) {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <GameErrorBoundary onRetry={onClose}>
        <Suspense fallback={<GameLoadingScreen />}>
          <GameCanvas engine={engine} />
        </Suspense>
        <GameHud />
      </GameErrorBoundary>
      <button
        onClick={onClose}
        className="absolute left-4 top-4 z-30 rounded-xl border border-border bg-background/70 px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider text-foreground"
      >
        MENÜ
      </button>
    </div>
  )
}

function Game() {
  const { loading, userId, profile } = useAuth()
  const [lobby, setLobby] = useState<Lobby | null>(null)
  const [matchEngine, setMatchEngine] = useState<GameEngine | null>(null)

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!userId || !profile) return <AuthScreen />

  if (matchEngine) {
    return <MatchScreen engine={matchEngine} onClose={() => setMatchEngine(null)} />
  }

  if (lobby) return <LobbyScreen lobby={lobby} onLeave={() => setLobby(null)} onStart={setMatchEngine} />

  return <MainMenu onEnterLobby={setLobby} />
}

export default function Page() {
  if (!isSupabaseConfigured) return <SetupNotice />

  return (
    <AuthProvider>
      <Game />
    </AuthProvider>
  )
}
