'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useEngine } from './game-context'
import type { Combatant } from '@/lib/game/engine'
import { PLAYER } from '@/lib/game/config'

export function Combatants() {
  const engine = useEngine()
  const ids = Array.from(engine.combatants.keys())
  return (
    <group>
      {ids.map((id) => (
        <CombatantMesh key={id} id={id} />
      ))}
    </group>
  )
}

function CombatantMesh({ id }: { id: string }) {
  const engine = useEngine()
  const group = useRef<THREE.Group>(null)
  const bodyMat = useRef<THREE.MeshStandardMaterial>(null)
  const bar = useRef<THREE.Mesh>(null)

  const c = engine.combatants.get(id)!
  const isLocal = c.isLocal
  const teamColor = c.team === 'A' ? engine.map.accentA : engine.map.accentB

  useFrame(() => {
    const cc = engine.combatants.get(id)
    if (!group.current || !cc) return
    const visible = cc.alive && !isLocal
    group.current.visible = visible
    if (!visible) return
    group.current.position.set(cc.pos.x, cc.pos.y, cc.pos.z)
    group.current.rotation.y = cc.yaw
    if (bodyMat.current) {
      bodyMat.current.emissiveIntensity = cc.hitFlash > 0 ? 3 : 0.6
    }
    if (bar.current) {
      const ratio = Math.max(0, cc.health / PLAYER.maxHealth)
      bar.current.scale.x = ratio
      bar.current.position.x = -(1 - ratio) * 0.5
      ;(bar.current.material as THREE.MeshBasicMaterial).color.set(
        ratio > 0.5 ? '#22d3ee' : ratio > 0.25 ? '#f59e0b' : '#ef4444',
      )
    }
  })

  return (
    <group ref={group}>
      {/* ── Legs ── */}
      <mesh position={[-0.12, 0.3, 0]}>
        <capsuleGeometry args={[0.08, 0.35, 4, 8]} />
        <meshStandardMaterial color="#0c0a16" metalness={0.5} roughness={0.6} />
      </mesh>
      <mesh position={[0.12, 0.3, 0]}>
        <capsuleGeometry args={[0.08, 0.35, 4, 8]} />
        <meshStandardMaterial color="#0c0a16" metalness={0.5} roughness={0.6} />
      </mesh>
      {/* Knee pads */}
      <mesh position={[-0.12, 0.22, 0.08]}>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.3} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0.12, 0.22, 0.08]}>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.3} metalness={0.6} roughness={0.3} />
      </mesh>

      {/* ── Torso ── */}
      <mesh position={[0, 0.85, 0]}>
        <capsuleGeometry args={[0.2, 0.35, 4, 10]} />
        <meshStandardMaterial
          ref={bodyMat}
          color={c.color}
          emissive={c.color}
          emissiveIntensity={0.6}
          metalness={0.55}
          roughness={0.3}
        />
      </mesh>
      {/* Chest plate */}
      <mesh position={[0, 0.9, 0.14]}>
        <boxGeometry args={[0.3, 0.25, 0.06]} />
        <meshStandardMaterial color="#0e0c1a" emissive={c.color} emissiveIntensity={0.2} metalness={0.7} roughness={0.25} />
      </mesh>
      {/* Back plate */}
      <mesh position={[0, 0.85, -0.14]}>
        <boxGeometry args={[0.28, 0.22, 0.04]} />
        <meshStandardMaterial color="#0e0c1a" emissive={teamColor} emissiveIntensity={0.15} metalness={0.7} roughness={0.25} />
      </mesh>

      {/* ── Shoulders / pauldrons ── */}
      <mesh position={[0.28, 1.05, 0]}>
        <sphereGeometry args={[0.09, 8, 6]} />
        <meshStandardMaterial color={c.color} emissive={teamColor} emissiveIntensity={0.5} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[-0.28, 1.05, 0]}>
        <sphereGeometry args={[0.09, 8, 6]} />
        <meshStandardMaterial color={c.color} emissive={teamColor} emissiveIntensity={0.5} metalness={0.6} roughness={0.3} />
      </mesh>

      {/* ── Arms ── */}
      <mesh position={[0.3, 0.8, 0.05]} rotation={[0.3, 0, 0]}>
        <capsuleGeometry args={[0.06, 0.25, 4, 8]} />
        <meshStandardMaterial color="#0c0a16" metalness={0.5} roughness={0.6} />
      </mesh>
      <mesh position={[-0.3, 0.8, 0.05]} rotation={[0.3, 0, 0]}>
        <capsuleGeometry args={[0.06, 0.25, 4, 8]} />
        <meshStandardMaterial color="#0c0a16" metalness={0.5} roughness={0.6} />
      </mesh>

      {/* ── Head / Helmet ── */}
      <mesh position={[0, 1.35, 0]}>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshStandardMaterial color="#0a0812" emissive={c.color} emissiveIntensity={0.2} metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Visor */}
      <mesh position={[0, 1.36, 0.14]}>
        <boxGeometry args={[0.22, 0.08, 0.04]} />
        <meshStandardMaterial color={teamColor} emissive={teamColor} emissiveIntensity={1.5} metalness={0.3} roughness={0.1} transparent opacity={0.85} />
      </mesh>
      {/* Helmet ridge */}
      <mesh position={[0, 1.44, 0]}>
        <boxGeometry args={[0.06, 0.04, 0.2]} />
        <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.4} metalness={0.6} roughness={0.3} />
      </mesh>

      {/* ── Team ring (ground) ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.35, 0.45, 24]} />
        <meshBasicMaterial color={teamColor} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* ── Neon accents ── */}
      {/* Belt line */}
      <mesh position={[0, 0.65, 0]}>
        <torusGeometry args={[0.2, 0.012, 6, 16]} />
        <meshBasicMaterial color={teamColor} toneMapped={false} />
      </mesh>
      {/* Arm bands */}
      <mesh position={[0.3, 0.72, 0.05]}>
        <torusGeometry args={[0.065, 0.008, 6, 12]} />
        <meshBasicMaterial color={teamColor} toneMapped={false} />
      </mesh>
      <mesh position={[-0.3, 0.72, 0.05]}>
        <torusGeometry args={[0.065, 0.008, 6, 12]} />
        <meshBasicMaterial color={teamColor} toneMapped={false} />
      </mesh>

      {/* ── Name + health bar (billboard) ── */}
      <Billboard position={[0, 1.8, 0]}>
        <Text fontSize={0.2} color={teamColor} anchorX="center" anchorY="middle" outlineWidth={0.01} outlineColor="#000000" font={undefined}>
          {c.username}
        </Text>
        {/* Health bar bg */}
        <mesh position={[0, -0.2, 0]}>
          <planeGeometry args={[0.8, 0.06]} />
          <meshBasicMaterial color="#1a1a2e" transparent opacity={0.6} />
        </mesh>
        {/* Health bar fill */}
        <mesh ref={bar} position={[0, -0.2, 0.01]}>
          <planeGeometry args={[0.78, 0.04]} />
          <meshBasicMaterial color="#22d3ee" />
        </mesh>
      </Billboard>
    </group>
  )
}
