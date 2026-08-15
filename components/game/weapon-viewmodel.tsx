'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useEngine } from './game-context'
import { controls } from '@/lib/game/store'
import { WEAPONS } from '@/lib/game/config'
import type { WeaponId } from '@/lib/game/config'

const offset = new THREE.Vector3()
const baseOffset = new THREE.Vector3(0.24, -0.22, -0.5)

export function WeaponViewmodel() {
  const engine = useEngine()
  const { camera } = useThree()
  const group = useRef<THREE.Group>(null)
  const muzzle = useRef<THREE.Mesh>(null)
  const lastShot = useRef(0)
  const recoil = useRef(0)
  const bob = useRef(0)

  const local = engine.local

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const l = engine.local
    if (!group.current || !l) return
    const now = performance.now() / 1000

    group.current.visible = l.alive

    offset.copy(baseOffset)
    if ((controls.moveX !== 0 || controls.moveY !== 0) && engine.phase === 'live') {
      bob.current += dt * 10
    }
    const bobY = Math.sin(bob.current) * 0.012
    const bobX = Math.cos(bob.current * 0.5) * 0.012
    offset.x += bobX
    offset.y += bobY

    if (l.lastShotAt !== lastShot.current) {
      lastShot.current = l.lastShotAt
      recoil.current = Math.min(1, recoil.current + 0.6)
    }
    recoil.current = Math.max(0, recoil.current - dt * 6)
    offset.z += recoil.current * 0.12

    const reloading = now < l.reloadUntil
    let reloadRot = 0
    if (reloading) {
      const w2 = WEAPONS[l.weapon]
      const p = 1 - (l.reloadUntil - now) / w2.reloadTime
      reloadRot = Math.sin(p * Math.PI) * 0.9
      offset.y -= Math.sin(p * Math.PI) * 0.15
    }

    offset.applyQuaternion(camera.quaternion)
    group.current.position.copy(camera.position).add(offset)
    group.current.quaternion.copy(camera.quaternion)
    group.current.rotateX(reloadRot + recoil.current * 0.15)
    group.current.rotateZ(reloading ? Math.sin(now * 20) * 0.05 : 0)

    if (muzzle.current) {
      const since = now - l.lastShotAt
      const on = since < 0.05 && l.alive
      muzzle.current.visible = on
      if (on) {
        muzzle.current.scale.setScalar(0.6 + Math.random() * 0.5)
        const w = WEAPONS[l.weapon]
        ;(muzzle.current.material as THREE.MeshBasicMaterial).color.set(w.color)
      }
    }
  })

  const weaponId = local?.weapon ?? 'pistol'
  const color = WEAPONS[weaponId].color

  return (
    <group ref={group}>
      <WeaponModel weaponId={weaponId} color={color} muzzleRef={muzzle} />
    </group>
  )
}

function WeaponModel({ weaponId, color, muzzleRef }: { weaponId: WeaponId; color: string; muzzleRef: React.RefObject<THREE.Mesh | null> }) {
  switch (weaponId) {
    case 'sniper': return <SniperModel color={color} muzzleRef={muzzleRef} />
    case 'rifle': return <RifleModel color={color} muzzleRef={muzzleRef} />
    case 'ak47': return <AKModel color={color} muzzleRef={muzzleRef} />
    case 'shotgun': return <ShotgunModel color={color} muzzleRef={muzzleRef} />
    case 'pump': return <ShotgunModel color={color} muzzleRef={muzzleRef} />
    case 'smg': return <SMGModel color={color} muzzleRef={muzzleRef} />
    case 'uzi': return <UziModel color={color} muzzleRef={muzzleRef} />
    case 'deagle': return <DeagleModel color={color} muzzleRef={muzzleRef} />
    case 'laser': return <LaserModel color={color} muzzleRef={muzzleRef} />
    case 'knife': return <KnifeModel color={color} muzzleRef={muzzleRef} />
    default: return <PistolModel color={color} muzzleRef={muzzleRef} />
  }
}

// ─── Shared materials ────────────────────────────────────────────────
const bodyMat = (color: string) => ({ color: '#0a0812', emissive: color, emissiveIntensity: 0.2, metalness: 0.9, roughness: 0.15 })
const accentMat = (color: string) => ({ color: '#1a1626', emissive: color, emissiveIntensity: 0.5, metalness: 0.85, roughness: 0.2 })
const neonMat = (color: string) => ({ color, emissive: color, emissiveIntensity: 1.2, metalness: 0.3, roughness: 0.1 })
const gripMat = () => ({ color: '#1c1828', emissive: '#0a0612', emissiveIntensity: 0.1, metalness: 0.4, roughness: 0.8 })

// ─── Pistol ──────────────────────────────────────────────────────────
function PistolModel({ color, muzzleRef }: { color: string; muzzleRef: React.RefObject<THREE.Mesh | null> }) {
  return (
    <group>
      {/* Slide */}
      <mesh position={[0, 0.02, -0.08]}>
        <boxGeometry args={[0.06, 0.07, 0.22]} />
        <meshStandardMaterial {...bodyMat(color)} />
      </mesh>
      {/* Barrel */}
      <mesh position={[0, 0.02, -0.22]}>
        <boxGeometry args={[0.035, 0.04, 0.08]} />
        <meshStandardMaterial {...accentMat(color)} />
      </mesh>
      {/* Frame */}
      <mesh position={[0, -0.04, -0.04]}>
        <boxGeometry args={[0.055, 0.05, 0.16]} />
        <meshStandardMaterial {...gripMat()} />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.1, 0.02]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.05, 0.1, 0.04]} />
        <meshStandardMaterial {...gripMat()} />
      </mesh>
      {/* Trigger guard */}
      <mesh position={[0, -0.06, -0.02]}>
        <torusGeometry args={[0.02, 0.004, 6, 12, Math.PI]} />
        <meshStandardMaterial {...accentMat(color)} />
      </mesh>
      {/* Neon strip */}
      <mesh position={[0.032, 0.02, -0.08]}>
        <boxGeometry args={[0.003, 0.03, 0.18]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* Sight front */}
      <mesh position={[0, 0.06, -0.18]}>
        <boxGeometry args={[0.01, 0.015, 0.01]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* Muzzle flash */}
      <mesh ref={muzzleRef} position={[0, 0.02, -0.27]} visible={false}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ─── Deagle ──────────────────────────────────────────────────────────
function DeagleModel({ color, muzzleRef }: { color: string; muzzleRef: React.RefObject<THREE.Mesh | null> }) {
  return (
    <group>
      <mesh position={[0, 0.03, -0.1]}>
        <boxGeometry args={[0.07, 0.09, 0.26]} />
        <meshStandardMaterial {...bodyMat(color)} />
      </mesh>
      <mesh position={[0, 0.03, -0.26]}>
        <cylinderGeometry args={[0.025, 0.03, 0.1, 8]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial {...accentMat(color)} />
      </mesh>
      <mesh position={[0, -0.05, -0.02]}>
        <boxGeometry args={[0.06, 0.06, 0.18]} />
        <meshStandardMaterial {...gripMat()} />
      </mesh>
      <mesh position={[0, -0.12, 0.04]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.055, 0.12, 0.05]} />
        <meshStandardMaterial {...gripMat()} />
      </mesh>
      {/* Gold neon accent */}
      <mesh position={[0.037, 0.03, -0.1]}>
        <boxGeometry args={[0.003, 0.05, 0.22]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[-0.037, 0.03, -0.1]}>
        <boxGeometry args={[0.003, 0.05, 0.22]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={muzzleRef} position={[0, 0.03, -0.32]} visible={false}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ─── SMG ─────────────────────────────────────────────────────────────
function SMGModel({ color, muzzleRef }: { color: string; muzzleRef: React.RefObject<THREE.Mesh | null> }) {
  return (
    <group>
      {/* Receiver */}
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[0.07, 0.08, 0.3]} />
        <meshStandardMaterial {...bodyMat(color)} />
      </mesh>
      {/* Barrel shroud */}
      <mesh position={[0, 0.01, -0.25]}>
        <boxGeometry args={[0.05, 0.05, 0.12]} />
        <meshStandardMaterial {...accentMat(color)} />
      </mesh>
      {/* Barrel */}
      <mesh position={[0, 0.01, -0.34]}>
        <boxGeometry args={[0.025, 0.025, 0.06]} />
        <meshStandardMaterial color="#060410" metalness={0.95} roughness={0.1} />
      </mesh>
      {/* Magazine (front) */}
      <mesh position={[0, -0.08, -0.12]}>
        <boxGeometry args={[0.04, 0.1, 0.04]} />
        <meshStandardMaterial {...accentMat(color)} />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.08, 0.04]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.05, 0.09, 0.04]} />
        <meshStandardMaterial {...gripMat()} />
      </mesh>
      {/* Stock hint */}
      <mesh position={[0, -0.01, 0.12]}>
        <boxGeometry args={[0.04, 0.06, 0.08]} />
        <meshStandardMaterial {...gripMat()} />
      </mesh>
      {/* Neon strips */}
      <mesh position={[0.037, 0, -0.05]}>
        <boxGeometry args={[0.003, 0.04, 0.26]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.042, -0.05]}>
        <boxGeometry args={[0.04, 0.003, 0.26]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={muzzleRef} position={[0, 0.01, -0.38]} visible={false}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ─── Uzi ─────────────────────────────────────────────────────────────
function UziModel({ color, muzzleRef }: { color: string; muzzleRef: React.RefObject<THREE.Mesh | null> }) {
  return (
    <group>
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[0.065, 0.075, 0.22]} />
        <meshStandardMaterial {...bodyMat(color)} />
      </mesh>
      <mesh position={[0, 0.01, -0.16]}>
        <boxGeometry args={[0.04, 0.04, 0.08]} />
        <meshStandardMaterial {...accentMat(color)} />
      </mesh>
      {/* Mag through grip */}
      <mesh position={[0, -0.1, -0.02]}>
        <boxGeometry args={[0.035, 0.12, 0.03]} />
        <meshStandardMaterial {...accentMat(color)} />
      </mesh>
      <mesh position={[0.034, 0, -0.02]}>
        <boxGeometry args={[0.003, 0.04, 0.18]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={muzzleRef} position={[0, 0.01, -0.22]} visible={false}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ─── Rifle (AR) ──────────────────────────────────────────────────────
function RifleModel({ color, muzzleRef }: { color: string; muzzleRef: React.RefObject<THREE.Mesh | null> }) {
  return (
    <group>
      {/* Upper receiver */}
      <mesh position={[0, 0.02, -0.08]}>
        <boxGeometry args={[0.065, 0.06, 0.36]} />
        <meshStandardMaterial {...bodyMat(color)} />
      </mesh>
      {/* Lower receiver */}
      <mesh position={[0, -0.03, -0.02]}>
        <boxGeometry args={[0.06, 0.04, 0.22]} />
        <meshStandardMaterial {...gripMat()} />
      </mesh>
      {/* Handguard */}
      <mesh position={[0, 0.01, -0.3]}>
        <boxGeometry args={[0.055, 0.055, 0.14]} />
        <meshStandardMaterial {...accentMat(color)} />
      </mesh>
      {/* Barrel */}
      <mesh position={[0, 0.01, -0.42]}>
        <boxGeometry args={[0.02, 0.02, 0.12]} />
        <meshStandardMaterial color="#060410" metalness={0.95} roughness={0.1} />
      </mesh>
      {/* Magazine */}
      <mesh position={[0, -0.08, -0.1]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.04, 0.1, 0.04]} />
        <meshStandardMaterial {...accentMat(color)} />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.09, 0.04]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[0.04, 0.09, 0.035]} />
        <meshStandardMaterial {...gripMat()} />
      </mesh>
      {/* Stock */}
      <mesh position={[0, 0, 0.16]}>
        <boxGeometry args={[0.05, 0.06, 0.1]} />
        <meshStandardMaterial {...gripMat()} />
      </mesh>
      {/* Rail / neon */}
      <mesh position={[0, 0.053, -0.08]}>
        <boxGeometry args={[0.04, 0.003, 0.3]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0.034, 0.01, -0.3]}>
        <boxGeometry args={[0.003, 0.03, 0.12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* Sight */}
      <mesh position={[0, 0.06, -0.18]}>
        <boxGeometry args={[0.015, 0.02, 0.04]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={muzzleRef} position={[0, 0.01, -0.49]} visible={false}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ─── AK ──────────────────────────────────────────────────────────────
function AKModel({ color, muzzleRef }: { color: string; muzzleRef: React.RefObject<THREE.Mesh | null> }) {
  return (
    <group>
      {/* Receiver - slightly bulkier */}
      <mesh position={[0, 0.02, -0.06]}>
        <boxGeometry args={[0.07, 0.065, 0.32]} />
        <meshStandardMaterial {...bodyMat(color)} />
      </mesh>
      {/* Gas tube */}
      <mesh position={[0, 0.055, -0.22]}>
        <boxGeometry args={[0.025, 0.02, 0.14]} />
        <meshStandardMaterial {...accentMat(color)} />
      </mesh>
      {/* Handguard */}
      <mesh position={[0, 0.01, -0.28]}>
        <boxGeometry args={[0.06, 0.06, 0.12]} />
        <meshStandardMaterial color="#2a1a10" emissive={color} emissiveIntensity={0.15} metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Barrel */}
      <mesh position={[0, 0.02, -0.4]}>
        <boxGeometry args={[0.022, 0.022, 0.14]} />
        <meshStandardMaterial color="#060410" metalness={0.95} roughness={0.1} />
      </mesh>
      {/* Curved magazine */}
      <mesh position={[0, -0.08, -0.08]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.04, 0.12, 0.04]} />
        <meshStandardMaterial {...accentMat(color)} />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.08, 0.06]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.04, 0.08, 0.035]} />
        <meshStandardMaterial color="#2a1a10" emissive={color} emissiveIntensity={0.1} metalness={0.3} roughness={0.8} />
      </mesh>
      {/* Stock */}
      <mesh position={[0, 0.01, 0.15]}>
        <boxGeometry args={[0.04, 0.05, 0.12]} />
        <meshStandardMaterial color="#2a1a10" emissive={color} emissiveIntensity={0.1} metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Neon accent */}
      <mesh position={[0.037, 0.02, -0.06]}>
        <boxGeometry args={[0.003, 0.035, 0.28]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={muzzleRef} position={[0, 0.02, -0.48]} visible={false}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ─── Shotgun ─────────────────────────────────────────────────────────
function ShotgunModel({ color, muzzleRef }: { color: string; muzzleRef: React.RefObject<THREE.Mesh | null> }) {
  return (
    <group>
      {/* Receiver */}
      <mesh position={[0, 0.02, -0.06]}>
        <boxGeometry args={[0.08, 0.08, 0.28]} />
        <meshStandardMaterial {...bodyMat(color)} />
      </mesh>
      {/* Barrel - wide */}
      <mesh position={[0, 0.025, -0.28]}>
        <cylinderGeometry args={[0.03, 0.035, 0.2, 8]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#060410" metalness={0.95} roughness={0.1} />
      </mesh>
      {/* Pump */}
      <mesh position={[0, -0.01, -0.22]}>
        <boxGeometry args={[0.06, 0.04, 0.1]} />
        <meshStandardMaterial {...accentMat(color)} />
      </mesh>
      {/* Stock */}
      <mesh position={[0, 0, 0.14]}>
        <boxGeometry args={[0.06, 0.07, 0.12]} />
        <meshStandardMaterial {...gripMat()} />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.08, 0.04]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.05, 0.08, 0.04]} />
        <meshStandardMaterial {...gripMat()} />
      </mesh>
      {/* Neon ring on barrel */}
      <mesh position={[0, 0.025, -0.36]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.035, 0.004, 8, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={muzzleRef} position={[0, 0.025, -0.4]} visible={false}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ─── Sniper ──────────────────────────────────────────────────────────
function SniperModel({ color, muzzleRef }: { color: string; muzzleRef: React.RefObject<THREE.Mesh | null> }) {
  return (
    <group>
      {/* Receiver */}
      <mesh position={[0, 0.02, -0.1]}>
        <boxGeometry args={[0.06, 0.065, 0.4]} />
        <meshStandardMaterial {...bodyMat(color)} />
      </mesh>
      {/* Long barrel */}
      <mesh position={[0, 0.02, -0.4]}>
        <boxGeometry args={[0.02, 0.02, 0.24]} />
        <meshStandardMaterial color="#060410" metalness={0.95} roughness={0.08} />
      </mesh>
      {/* Scope body */}
      <mesh position={[0, 0.065, -0.12]}>
        <cylinderGeometry args={[0.018, 0.018, 0.16, 8]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial {...accentMat(color)} />
      </mesh>
      {/* Scope lens */}
      <mesh position={[0, 0.065, -0.21]}>
        <circleGeometry args={[0.018, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} opacity={0.6} transparent />
      </mesh>
      {/* Bipod hint */}
      <mesh position={[-0.02, -0.04, -0.3]}>
        <boxGeometry args={[0.005, 0.06, 0.005]} />
        <meshStandardMaterial {...accentMat(color)} />
      </mesh>
      <mesh position={[0.02, -0.04, -0.3]}>
        <boxGeometry args={[0.005, 0.06, 0.005]} />
        <meshStandardMaterial {...accentMat(color)} />
      </mesh>
      {/* Magazine */}
      <mesh position={[0, -0.06, -0.06]}>
        <boxGeometry args={[0.035, 0.06, 0.04]} />
        <meshStandardMaterial {...accentMat(color)} />
      </mesh>
      {/* Stock */}
      <mesh position={[0, 0, 0.16]}>
        <boxGeometry args={[0.05, 0.06, 0.14]} />
        <meshStandardMaterial {...gripMat()} />
      </mesh>
      <mesh position={[0, 0.01, 0.24]}>
        <boxGeometry args={[0.04, 0.04, 0.04]} />
        <meshStandardMaterial {...gripMat()} />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.08, 0.04]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.04, 0.08, 0.03]} />
        <meshStandardMaterial {...gripMat()} />
      </mesh>
      {/* Neon rail */}
      <mesh position={[0, 0.055, -0.1]}>
        <boxGeometry args={[0.035, 0.003, 0.36]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={muzzleRef} position={[0, 0.02, -0.54]} visible={false}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ─── Laser ───────────────────────────────────────────────────────────
function LaserModel({ color, muzzleRef }: { color: string; muzzleRef: React.RefObject<THREE.Mesh | null> }) {
  return (
    <group>
      {/* Sleek body */}
      <mesh position={[0, 0.01, -0.1]}>
        <boxGeometry args={[0.055, 0.06, 0.38]} />
        <meshStandardMaterial color="#0a1a10" emissive={color} emissiveIntensity={0.3} metalness={0.85} roughness={0.15} />
      </mesh>
      {/* Emitter */}
      <mesh position={[0, 0.01, -0.32]}>
        <cylinderGeometry args={[0.015, 0.025, 0.08, 8]} rotation={[Math.PI / 2, 0, 0]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* Energy cell */}
      <mesh position={[0, -0.05, -0.05]}>
        <boxGeometry args={[0.04, 0.06, 0.08]} />
        <meshStandardMaterial {...accentMat(color)} />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.08, 0.04]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.04, 0.08, 0.035]} />
        <meshStandardMaterial {...gripMat()} />
      </mesh>
      {/* Glow strips */}
      <mesh position={[0.029, 0.01, -0.1]}>
        <boxGeometry args={[0.003, 0.03, 0.34]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[-0.029, 0.01, -0.1]}>
        <boxGeometry args={[0.003, 0.03, 0.34]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.042, -0.1]}>
        <boxGeometry args={[0.03, 0.003, 0.34]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={muzzleRef} position={[0, 0.01, -0.38]} visible={false}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ─── Knife ───────────────────────────────────────────────────────────
function KnifeModel({ color, muzzleRef }: { color: string; muzzleRef: React.RefObject<THREE.Mesh | null> }) {
  return (
    <group rotation={[0.3, 0.2, 0.1]}>
      {/* Blade */}
      <mesh position={[0, 0.01, -0.12]}>
        <boxGeometry args={[0.005, 0.04, 0.18]} />
        <meshStandardMaterial color="#e0e0e0" emissive={color} emissiveIntensity={0.4} metalness={0.95} roughness={0.05} />
      </mesh>
      {/* Guard */}
      <mesh position={[0, 0.01, -0.02]}>
        <boxGeometry args={[0.04, 0.01, 0.015]} />
        <meshStandardMaterial {...accentMat(color)} />
      </mesh>
      {/* Handle */}
      <mesh position={[0, 0.01, 0.04]}>
        <boxGeometry args={[0.025, 0.03, 0.1]} />
        <meshStandardMaterial {...gripMat()} />
      </mesh>
      {/* Neon edge */}
      <mesh position={[0.004, 0.01, -0.12]}>
        <boxGeometry args={[0.001, 0.02, 0.16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={muzzleRef} position={[0, 0.01, -0.22]} visible={false}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  )
}
