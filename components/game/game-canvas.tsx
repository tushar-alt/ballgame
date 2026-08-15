'use client'

import React, { Component, Suspense, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GameContext } from './game-context'
import { Environment } from './environment'
import { Combatants } from './combatants'
import { Effects } from './effects'
import { PlayerController } from './player-controller'
import { WeaponViewmodel } from './weapon-viewmodel'
import type { GameEngine } from '@/lib/game/engine'

function EngineDriver({ engine }: { engine: GameEngine }) {
  useFrame((_, dt) => {
    engine.update(dt)
  })
  return null
}

// Postprocessing is lazy-loaded and wrapped in an error boundary so that
// if the library fails to initialise (common on low-end GPUs or with
// version mismatches), the game still renders without bloom/vignette.
type PPSrops = { children?: never }
type PPState = { failed: boolean }

class PostProcessingGuard extends Component<PPSrops & { fallback: ReactNode }, PPState> {
  state: PPState = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err: Error) { console.warn('[PostProcessing] disabled:', err.message) }
  render() {
    if (this.state.failed) return this.props.fallback
    return this.props.children
  }
}

function SafePostProcessing() {
  // Dynamic import so a crash here doesn't prevent the rest of the scene
  // from rendering. The component is loaded lazily inside Suspense.
  const [mods, setMods] = React.useState<{
    EffectComposer: React.ComponentType<{ children: ReactNode }>
    Bloom: React.ComponentType<Record<string, unknown>>
    Vignette: React.ComponentType<Record<string, unknown>>
  } | null>(null)

  React.useEffect(() => {
    let cancelled = false
    Promise.all([
      import('@react-three/postprocessing').then((m) => m),
    ])
      .then(([pp]) => {
        if (!cancelled) {
          setMods({
            EffectComposer: pp.EffectComposer as React.ComponentType<{ children: ReactNode }>,
            Bloom: pp.Bloom as React.ComponentType<Record<string, unknown>>,
            Vignette: pp.Vignette as React.ComponentType<Record<string, unknown>>,
          })
        }
      })
      .catch((err) => {
        console.warn('[PostProcessing] failed to load:', err)
      })
    return () => { cancelled = true }
  }, [])

  if (!mods) return null

  const { EffectComposer, Bloom, Vignette } = mods
  return (
    <PostProcessingGuard fallback={null}>
      <EffectComposer>
        <Bloom intensity={0.9} luminanceThreshold={0.35} luminanceSmoothing={0.3} mipmapBlur radius={0.6} />
        <Vignette eskil={false} offset={0.25} darkness={0.7} />
      </EffectComposer>
    </PostProcessingGuard>
  )
}

export function GameCanvas({ engine }: { engine: GameEngine }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        precision: 'lowp',
        stencil: false,
        depth: true,
        alpha: false,
      }}
      camera={{ fov: 75, near: 0.1, far: 200, position: [0, 1.6, 0] }}
      onCreated={({ scene, gl }) => {
        scene.background = new THREE.Color(engine.map.sky)
        scene.fog = new THREE.Fog(engine.map.fog, engine.map.fogNear, engine.map.fogFar)
        // Graceful degradation: if WebGL context is lost, log it
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          console.error('[WebGL] Context lost')
        })
      }}
      style={{ touchAction: 'none' }}
    >
      <GameContext.Provider value={engine}>
        <EngineDriver engine={engine} />
        <Environment map={engine.map} />
        <Combatants />
        <Effects />
        <PlayerController onWeaponEvent={() => {}} />
        <WeaponViewmodel />
        <Suspense fallback={null}>
          <SafePostProcessing />
        </Suspense>
      </GameContext.Provider>
    </Canvas>
  )
}
