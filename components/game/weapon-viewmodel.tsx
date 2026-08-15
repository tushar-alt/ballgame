'use client'

import { useRef, useEffect, useMemo, useState } from 'react'
import { useFrame, useThree, useLoader } from '@react-three/fiber'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import * as THREE from 'three'
import { useEngine } from './game-context'
import { controls } from '@/lib/game/store'
import { WEAPONS } from '@/lib/game/config'
import type { WeaponId } from '@/lib/game/config'

// Map weapon IDs to OBJ model files
const WEAPON_MODEL_MAP: Record<WeaponId, string> = {
  pistol: '/models/animated_guns/OBJ/Pistol.obj',
  deagle: '/models/animated_guns/OBJ/Revolver.obj',
  smg: '/models/animated_guns/OBJ/P90.obj',
  uzi: '/models/animated_guns/OBJ/P90.obj',
  rifle: '/models/animated_guns/OBJ/Rifle.obj',
  ak47: '/models/animated_guns/OBJ/Rifle.obj',
  shotgun: '/models/animated_guns/OBJ/Shotgun.obj',
  pump: '/models/animated_guns/OBJ/Shotgun.obj',
  sniper: '/models/animated_guns/OBJ/SniperRifle.obj',
  laser: '/models/animated_guns/OBJ/SniperRifle.obj',
  knife: '/models/animated_guns/OBJ/Pistol.obj', // fallback
}

// Model-specific scale and offset for first-person view
const MODEL_CONFIG: Record<WeaponId, { scale: number; pos: [number, number, number]; rot: [number, number, number] }> = {
  pistol: { scale: 0.012, pos: [0.18, -0.18, -0.35], rot: [0, -Math.PI / 2, 0] },
  deagle: { scale: 0.014, pos: [0.18, -0.2, -0.35], rot: [0, -Math.PI / 2, 0] },
  smg: { scale: 0.01, pos: [0.15, -0.2, -0.4], rot: [0, -Math.PI / 2, 0] },
  uzi: { scale: 0.009, pos: [0.14, -0.18, -0.35], rot: [0, -Math.PI / 2, 0] },
  rifle: { scale: 0.008, pos: [0.12, -0.2, -0.45], rot: [0, -Math.PI / 2, 0] },
  ak47: { scale: 0.008, pos: [0.12, -0.2, -0.45], rot: [0, -Math.PI / 2, 0] },
  shotgun: { scale: 0.009, pos: [0.14, -0.2, -0.42], rot: [0, -Math.PI / 2, 0] },
  pump: { scale: 0.009, pos: [0.14, -0.2, -0.42], rot: [0, -Math.PI / 2, 0] },
  sniper: { scale: 0.007, pos: [0.1, -0.2, -0.5], rot: [0, -Math.PI / 2, 0] },
  laser: { scale: 0.007, pos: [0.1, -0.2, -0.5], rot: [0, -Math.PI / 2, 0] },
  knife: { scale: 0.008, pos: [0.16, -0.16, -0.3], rot: [0.3, -Math.PI / 2, 0.1] },
}

const offset = new THREE.Vector3()

export function WeaponViewmodel() {
  const engine = useEngine()
  const { camera } = useThree()
  const group = useRef<THREE.Group>(null)
  const muzzle = useRef<THREE.Mesh>(null)
  const modelGroup = useRef<THREE.Group>(null)
  const lastShot = useRef(0)
  const recoil = useRef(0)
  const bob = useRef(0)

  const local = engine.local
  const weaponId = local?.weapon ?? 'pistol'
  const color = WEAPONS[weaponId].color
  const modelPath = WEAPON_MODEL_MAP[weaponId]
  const config = MODEL_CONFIG[weaponId]

  // Load OBJ model
  const obj = useLoader(OBJLoader, modelPath)

  // Clone and apply neon materials
  const model = useMemo(() => {
    const clone = obj.clone()
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: '#0c0a18',
          emissive: color,
          emissiveIntensity: 0.4,
          metalness: 0.85,
          roughness: 0.2,
        })
        child.castShadow = true
      }
    })
    return clone
  }, [obj, color])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const l = engine.local
    if (!group.current || !l) return
    const now = performance.now() / 1000

    group.current.visible = l.alive

    // Base position
    offset.set(...config.pos)

    // Walk bob
    if ((controls.moveX !== 0 || controls.moveY !== 0) && engine.phase === 'live') {
      bob.current += dt * 10
    }
    offset.x += Math.cos(bob.current * 0.5) * 0.008
    offset.y += Math.sin(bob.current) * 0.008

    // Recoil
    if (l.lastShotAt !== lastShot.current) {
      lastShot.current = l.lastShotAt
      recoil.current = Math.min(1, recoil.current + 0.5)
    }
    recoil.current = Math.max(0, recoil.current - dt * 6)
    offset.z += recoil.current * 0.08

    // Reload tilt
    const reloading = now < l.reloadUntil
    let reloadRot = 0
    if (reloading) {
      const w2 = WEAPONS[l.weapon]
      const p = 1 - (l.reloadUntil - now) / w2.reloadTime
      reloadRot = Math.sin(p * Math.PI) * 0.7
      offset.y -= Math.sin(p * Math.PI) * 0.12
    }

    // Apply to group
    offset.applyQuaternion(camera.quaternion)
    group.current.position.copy(camera.position).add(offset)
    group.current.quaternion.copy(camera.quaternion)
    group.current.rotateX(reloadRot + recoil.current * 0.12)
    group.current.rotateZ(reloading ? Math.sin(now * 18) * 0.04 : 0)

    // Muzzle flash
    if (muzzle.current) {
      const since = now - l.lastShotAt
      const on = since < 0.05 && l.alive
      muzzle.current.visible = on
      if (on) {
        muzzle.current.scale.setScalar(0.5 + Math.random() * 0.4)
        ;(muzzle.current.material as THREE.MeshBasicMaterial).color.set(color)
      }
    }
  })

  return (
    <group ref={group}>
      {/* Loaded 3D model */}
      <group ref={modelGroup} scale={config.scale} rotation={config.rot}>
        <primitive object={model} />
      </group>

      {/* Neon accent light on weapon */}
      <pointLight position={[0, 0, -0.3]} intensity={0.5} distance={1} color={color} />

      {/* Muzzle flash */}
      <mesh ref={muzzle} position={[0, 0, -0.6]} visible={false}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  )
}
