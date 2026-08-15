'use client'

import { Suspense, useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { SetupNotice } from '@/components/setup-notice'
import { AuthScreen } from '@/components/auth-screen'
import { MainMenu } from '@/components/main-menu'
import { LobbyScreen } from '@/components/lobby-screen'
import { GameHud } from '@/components/game/game-hud'
import { GameErrorBoundary } from '@/components/game/game-error-boundary'
import { GameContext } from '@/components/game/game-context'
import { GameEngine } from '@/lib/game/engine'
import { resumeAudio } from '@/lib/game/sound'
import { resetControls } from '@/lib/game/store'
import type { Lobby } from '@/lib/types'
import { Loader2, MonitorSmartphone } from 'lucide-react'

const GameCanvas = dynamic(
  () => import('@/components/game/game-canvas').then((m) => m.GameCanvas),
  { ssr: false },
)

function GameLoadingScreen() {
  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-3 bg-black">
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">LOADING ARENA</p>
    </div>
  )
}

function LandscapePrompt() {
  const [isPortrait, setIsPortrait] = useState(false)

  useEffect(() => {
    function check() {
      setIsPortrait(window.innerHeight > window.innerWidth * 1.2)
    }
    check()
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    return () => {
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
    }
  }, [])

  if (!isPortrait) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl">
      <div className="text-center p-8 max-w-xs">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl glass">
          <MonitorSmartphone className="size-7 text-accent animate-pulse" />
        </div>
        <p className="font-mono text-sm font-bold tracking-[0.15em] text-foreground mb-2">
          ROTATE YOUR DEVICE
        </p>
        <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
          This game is optimized for landscape mode.
          Please rotate your device for the best experience.
        </p>
      </div>
    </div>
  )
}

function MatchScreen({ engine, onClose }: { engine: GameEngine; onClose: () => void }) {
  useEffect(() => {
    resumeAudio()
    const handleInteraction = () => resumeAudio()
    document.addEventListener('pointerdown', handleInteraction, { once: true })
    return () => document.removeEventListener('pointerdown', handleInteraction)
  }, [])

  const handleExit = useCallback(() => {
    resetControls()
    onClose()
  }, [onClose])

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <GameErrorBoundary onRetry={onClose}>
        <GameContext.Provider value={engine}>
          <Suspense fallback={<GameLoadingScreen />}>
            <GameCanvas engine={engine} />
          </Suspense>
          <GameHud onExit={handleExit} />
        </GameContext.Provider>
      </GameErrorBoundary>
      <LandscapePrompt />
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
        <Loader2 className="size-5 animate-spin text-primary" />
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
