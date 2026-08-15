import * as THREE from 'three'
import { WEAPONS, PLAYER, ROUND, ECONOMY, damageFalloff, type WeaponId } from './config'
import { getMap, solidBlocks, type MapDef, type Block } from './maps'
import {
  setHud,
  getHud,
  pushKillFeed,
  resetHud,
  type Phase,
} from './store'
import * as SFX from './sound'

export type Team = 'A' | 'B'

export type Combatant = {
  id: string
  team: Team
  isBot: boolean
  isLocal: boolean
  username: string
  color: string
  pos: THREE.Vector3
  vel: THREE.Vector3
  yaw: number
  pitch: number
  health: number
  shield: number
  alive: boolean
  weapon: WeaponId
  ammo: number
  reserve: number
  grenades: number
  money: number
  kills: number
  deaths: number
  xp: number
  reloadUntil: number
  lastShotAt: number
  hitFlash: number
  // AI
  targetId: string | null
  wander: THREE.Vector3
  nextThink: number
  aimError: THREE.Vector3
}

export type Tracer = { from: THREE.Vector3; to: THREE.Vector3; color: string; t: number; life: number }
export type Flash = { pos: THREE.Vector3; color: string; t: number; life: number }
export type Spark = { pos: THREE.Vector3; t: number; life: number }
export type Explosion = { pos: THREE.Vector3; t: number; life: number }
export type Grenade = {
  id: number
  pos: THREE.Vector3
  vel: THREE.Vector3
  fuse: number
  ownerId: string
  team: Team
}

export type Bomb = {
  carrierIds: string[] // Team A players who can carry the bomb
  pos: THREE.Vector3 // Current position (on ground or on carrier)
  plantedAt: THREE.Vector3 | null // Position where bomb is planted
  plantingPlayerId: string | null // Who is planting
  plantingProgress: number // 0 to 1
  state: 'ground' | 'carried' | 'planted' | 'exploded' // bomb state
  explosionTime: number // Time until explosion after planting
}

type Aabb = { min: THREE.Vector3; max: THREE.Vector3 }

function blockAabb(b: Block): Aabb {
  const [x, y, z] = b.pos
  const [w, h, d] = b.size
  return {
    min: new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2),
    max: new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2),
  }
}

function rayAabb(origin: THREE.Vector3, dir: THREE.Vector3, box: Aabb): number | null {
  let tmin = 0
  let tmax = Infinity
  for (let i = 0; i < 3; i++) {
    const o = origin.getComponent(i)
    const d = dir.getComponent(i)
    const mn = box.min.getComponent(i)
    const mx = box.max.getComponent(i)
    if (Math.abs(d) < 1e-8) {
      if (o < mn || o > mx) return null
    } else {
      let t1 = (mn - o) / d
      let t2 = (mx - o) / d
      if (t1 > t2) [t1, t2] = [t2, t1]
      tmin = Math.max(tmin, t1)
      tmax = Math.min(tmax, t2)
      if (tmin > tmax) return null
    }
  }
  return tmin
}

function raySphere(origin: THREE.Vector3, dir: THREE.Vector3, center: THREE.Vector3, radius: number): number | null {
  const oc = origin.clone().sub(center)
  const b = oc.dot(dir)
  const c = oc.dot(oc) - radius * radius
  const disc = b * b - c
  if (disc < 0) return null
  const t = -b - Math.sqrt(disc)
  return t >= 0 ? t : null
}

export type EngineOpts = {
  mapId: string
  localId: string
  localName: string
  localColor: string
  localTeam: Team
  humans: { id: string; name: string; color: string; team: Team }[]
  botsPerTeam: number
  onMatchEnd: (winner: Team, scoreA: number, scoreB: number, localWon: boolean) => void
}

const BOT_NAMES = ['Vex', 'Nova', 'Rion', 'Kade', 'Zeph', 'Lux', 'Cyra', 'Drax', 'Onyx', 'Pyx']

export class GameEngine {
  map: MapDef
  solids: Aabb[]
  combatants = new Map<string, Combatant>()
  localId: string
  tracers: Tracer[] = []
  flashes: Flash[] = []
  sparks: Spark[] = []
  explosions: Explosion[] = []
  grenades: Grenade[] = []
  bomb: Bomb | null = null
  shake = 0
  phase: Phase = 'buy'
  phaseTimer = ROUND.buyTime
  roundNum = 1
  scoreA = 0
  scoreB = 0
  private grenadeId = 1
  private opts: EngineOpts
  private accum = 0
  private ended = false

  constructor(opts: EngineOpts) {
    this.opts = opts
    this.map = getMap(opts.mapId)
    this.solids = solidBlocks(this.map).map(blockAabb)
    this.localId = opts.localId
    resetHud()
    this.spawnCombatants()
    this.startRound(true)
  }

  private spawnCombatants() {
    const { humans, botsPerTeam } = this.opts
    const teamCounts: Record<Team, number> = { A: 0, B: 0 }
    // insanlar
    for (const h of humans) {
      this.combatants.set(h.id, this.makeCombatant(h.id, h.team, false, h.id === this.localId, h.name, h.color))
      teamCounts[h.team]++
    }
    // botlar
    let bi = 0
    for (const team of ['A', 'B'] as Team[]) {
      const need = botsPerTeam
      for (let i = 0; i < need; i++) {
        const id = `bot_${team}_${i}`
        const name = BOT_NAMES[bi % BOT_NAMES.length] + (bi >= BOT_NAMES.length ? '2' : '')
        bi++
        const color = team === 'A' ? this.map.accentA : this.map.accentB
        this.combatants.set(id, this.makeCombatant(id, team, true, false, name, color))
      }
    }
  }

  private makeCombatant(id: string, team: Team, isBot: boolean, isLocal: boolean, username: string, color: string): Combatant {
    return {
      id, team, isBot, isLocal, username, color,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      yaw: 0, pitch: 0,
      health: PLAYER.maxHealth, shield: 0, alive: true,
      weapon: 'pistol', ammo: WEAPONS.pistol.magazine, reserve: WEAPONS.pistol.reserve,
      grenades: 0, money: ECONOMY.startMoney,
      kills: 0, deaths: 0, xp: 0,
      reloadUntil: 0, lastShotAt: 0, hitFlash: 0,
      targetId: null, wander: new THREE.Vector3(), nextThink: 0,
      aimError: new THREE.Vector3(),
    }
  }

  get local(): Combatant | undefined {
    return this.combatants.get(this.localId)
  }

  private spawnPoint(team: Team, idx: number): THREE.Vector3 {
    const arr = team === 'A' ? this.map.spawnsA : this.map.spawnsB
    const [x, z] = arr[idx % arr.length]
    return new THREE.Vector3(x, 0, z)
  }

  private startRound(first = false) {
    this.phase = 'buy'
    this.phaseTimer = ROUND.buyTime
    let ai = 0
    let bi = 0
    for (const c of this.combatants.values()) {
      const idx = c.team === 'A' ? ai++ : bi++
      c.pos.copy(this.spawnPoint(c.team, idx))
      c.vel.set(0, 0, 0)
      c.health = PLAYER.maxHealth
      c.shield = c.isLocal ? c.shield : c.shield // insan kalkanı alışverişte
      c.alive = true
      c.reloadUntil = 0
      c.targetId = null
      c.yaw = c.team === 'A' ? 0 : Math.PI
      // botlara tur bazlı ekonomi/silah
      if (c.isBot) this.equipBot(c)
      else {
        // insanlar mermilerini yeniler
        const w = WEAPONS[c.weapon]
        c.ammo = w.magazine
        c.reserve = w.reserve
        if (first) {
          c.weapon = 'pistol'
          c.shield = 0
          c.grenades = 0
          c.money = ECONOMY.startMoney
        }
      }
    }
    if (!first) SFX.playRoundStart()
    this.syncLocalHud()
    setHud({
      phase: 'buy',
      roundNum: this.roundNum,
      scoreA: this.scoreA,
      scoreB: this.scoreB,
      timer: Math.ceil(this.phaseTimer),
      roundResult: null,
      alive: true,
      ...this.aliveCounts(),
    })
  }

  private equipBot(c: Combatant) {
    const r = this.roundNum
    const weapons: WeaponId[] = ['pistol', 'smg', 'uzi', 'rifle', 'ak47', 'shotgun', 'pump', 'sniper', 'laser', 'deagle']
    let w: WeaponId = 'pistol'
    if (r >= 2) w = Math.random() < 0.6 ? 'smg' : 'uzi'
    if (r >= 4) w = Math.random() < 0.7 ? (Math.random() < 0.5 ? 'rifle' : 'ak47') : (Math.random() < 0.5 ? 'shotgun' : 'pump')
    if (r >= 6 && Math.random() < 0.4) w = 'sniper'
    if (r >= 8 && Math.random() < 0.3) w = Math.random() < 0.5 ? 'laser' : 'sniper'
    if (r >= 10 && Math.random() < 0.2) w = 'deagle'
    c.weapon = w
    c.ammo = WEAPONS[w].magazine
    c.reserve = WEAPONS[w].reserve
    c.shield = r >= 3 ? (r >= 7 ? 100 : 50) : 0
    c.grenades = Math.random() < (r / 13) * 0.7 ? Math.min(3, Math.floor(r / 5) + 1) : 0
  }

  private aliveCounts() {
    let a = 0
    let b = 0
    for (const c of this.combatants.values()) {
      if (!c.alive) continue
      if (c.team === 'A') a++
      else b++
    }
    return { aliveA: a, aliveB: b }
  }

  syncLocalHud() {
    const l = this.local
    if (!l) return
    const w = WEAPONS[l.weapon]
    setHud({
      health: Math.max(0, Math.round(l.health)),
      shield: Math.max(0, Math.round(l.shield)),
      ammo: l.ammo,
      reserve: l.reserve,
      grenades: l.grenades,
      money: l.money,
      weaponId: l.weapon,
      alive: l.alive,
      reloading: performance.now() / 1000 < l.reloadUntil,
    })
  }

  // --- Market ---
  buyWeapon(weapon: WeaponId): boolean {
    const l = this.local
    if (!l || this.phase !== 'buy') return false
    const w = WEAPONS[weapon]
    if (l.money < w.price) return false
    l.money -= w.price
    l.weapon = weapon
    l.ammo = w.magazine
    l.reserve = w.reserve
    this.syncLocalHud()
    return true
  }

  buyGear(kind: 'shield_light' | 'shield_heavy' | 'grenade' | 'ammo'): boolean {
    const l = this.local
    if (!l || this.phase !== 'buy') return false
    const prices = { shield_light: 500, shield_heavy: 1000, grenade: 300, ammo: 200 }
    const price = prices[kind]
    if (l.money < price) return false
    if (kind === 'grenade' && l.grenades >= ECONOMY.maxGrenades) return false
    if (kind === 'shield_light' && l.shield >= 50) return false
    l.money -= price
    if (kind === 'shield_light') l.shield = Math.min(PLAYER.maxShield, l.shield + 50)
    if (kind === 'shield_heavy') l.shield = Math.min(PLAYER.maxShield, l.shield + 100)
    if (kind === 'grenade') l.grenades = Math.min(ECONOMY.maxGrenades, l.grenades + 1)
    if (kind === 'ammo') l.reserve = WEAPONS[l.weapon].reserve
    this.syncLocalHud()
    return true
  }

  // --- Atış ---
  private losBlocked(from: THREE.Vector3, to: THREE.Vector3): boolean {
    const dir = to.clone().sub(from)
    const dist = dir.length()
    dir.normalize()
    for (const box of this.solids) {
      const t = rayAabb(from, dir, box)
      if (t !== null && t < dist - 0.4) return true
    }
    return false
  }

  private nearestWallDist(origin: THREE.Vector3, dir: THREE.Vector3): number {
    let best = Infinity
    for (const box of this.solids) {
      const t = rayAabb(origin, dir, box)
      if (t !== null && t < best) best = t
    }
    return best
  }

  shootHitscan(shooter: Combatant, origin: THREE.Vector3, dir: THREE.Vector3) {
    const w = WEAPONS[shooter.weapon]
    const wallDist = this.nearestWallDist(origin, dir)
    let hitC: Combatant | null = null
    let hitDist = Infinity
    for (const c of this.combatants.values()) {
      if (!c.alive || c.team === shooter.team || c.id === shooter.id) continue
      const center = c.pos.clone()
      center.y += PLAYER.eyeHeight * 0.7
      const t = raySphere(origin, dir, center, 0.55)
      if (t !== null && t < hitDist && t < w.range && t < wallDist) {
        hitDist = t
        hitC = c
      }
    }
    
    // Only show tracers for ranged weapons (not knives)
    if (w.id !== 'knife') {
      const end = origin.clone().add(dir.clone().multiplyScalar(Math.min(hitC ? hitDist : Math.min(wallDist, w.range), w.range)))
      this.tracers.push({ from: origin.clone(), to: end, color: w.color, t: 0, life: 0.06 })
    }
    
    if (hitC) {
      const dmg = damageFalloff(w.damage, hitDist, w.range)
      this.applyDamage(hitC, dmg, shooter)
      if (w.id !== 'knife') {
        this.sparks.push({ pos: origin.clone().add(dir.clone().multiplyScalar(hitDist)), t: 0, life: 0.2 })
      }
      if (shooter.isLocal) {
        SFX.playHit()
        setHud({ hitMarker: performance.now() })
      }
    }
  }

  private applyDamage(target: Combatant, dmg: number, attacker: Combatant) {
    if (!target.alive) return
    let remaining = dmg
    if (target.shield > 0) {
      const absorbed = Math.min(target.shield, remaining)
      target.shield -= absorbed
      remaining -= absorbed
    }
    target.health -= remaining
    target.hitFlash = 0.15
    if (target.isLocal) {
      SFX.playHurt()
      setHud({ damageFlash: performance.now() })
      this.shake = Math.min(1, this.shake + 0.4)
    }
    if (target.health <= 0) {
      this.kill(target, attacker)
    } else if (target.isLocal) {
      this.syncLocalHud()
    }
  }

  private kill(victim: Combatant, attacker: Combatant) {
    victim.alive = false
    victim.health = 0
    victim.deaths++
    attacker.kills++
    
    // Award money and XP
    const killXp = 50 + (this.roundNum * 5)
    attacker.xp += killXp
    attacker.money = Math.min(ECONOMY.maxMoney, attacker.money + ECONOMY.killReward)
    
    pushKillFeed({
      attacker: attacker.username,
      victim: victim.username,
      weapon: WEAPONS[attacker.weapon].name,
      attackerTeam: attacker.team,
    })
    if (attacker.isLocal || victim.isLocal) this.syncLocalHud()
    setHud(this.aliveCounts())
    this.checkRoundEnd()
  }

  throwGrenade(shooter: Combatant, origin: THREE.Vector3, dir: THREE.Vector3) {
    if (shooter.grenades <= 0 || this.phase !== 'live') return
    shooter.grenades--
    const vel = dir.clone().multiplyScalar(16)
    vel.y += 4
    this.grenades.push({
      id: this.grenadeId++,
      pos: origin.clone(),
      vel,
      fuse: 1.6,
      ownerId: shooter.id,
      team: shooter.team,
    })
    SFX.playThrow()
    if (shooter.isLocal) this.syncLocalHud()
  }

  private explodeGrenade(g: Grenade) {
    const attacker = this.combatants.get(g.ownerId)
    this.explosions.push({ pos: g.pos.clone(), t: 0, life: 0.5 })
    SFX.playExplosion()
    const localPos = this.local?.pos
    if (localPos) {
      const d = localPos.distanceTo(g.pos)
      if (d < 12) this.shake = Math.min(1.5, this.shake + (1 - d / 12) * 1.2)
    }
    const radius = 6
    for (const c of this.combatants.values()) {
      if (!c.alive) continue
      const d = c.pos.distanceTo(g.pos)
      if (d < radius) {
        const dmg = 90 * (1 - d / radius)
        this.applyDamage(c, dmg, attacker ?? c)
      }
    }
  }

  // --- Tur mantığı ---
  private checkRoundEnd() {
    if (this.phase !== 'live') return
    const { aliveA, aliveB } = this.aliveCounts()
    if (aliveA === 0 || aliveB === 0) {
      this.endRound(aliveA === 0 ? 'B' : 'A')
    }
  }

  private endRound(winner: Team) {
    this.phase = 'roundend'
    this.phaseTimer = ROUND.respawnDelay + 1
    if (winner === 'A') this.scoreA++
    else this.scoreB++
    // ekonomi ve XP
    for (const c of this.combatants.values()) {
      const won = c.team === winner
      c.money = Math.min(ECONOMY.maxMoney, c.money + (won ? ECONOMY.winReward : ECONOMY.lossReward))
      // Round win XP
      const roundXp = won ? 100 + (this.roundNum * 10) : 30 + (this.roundNum * 5)
      c.xp += roundXp
    }
    const localTeam = this.local?.team
    if (localTeam) {
      if (localTeam === winner) SFX.playWin()
      else SFX.playLose()
    }
    this.syncLocalHud()
    setHud({
      phase: 'roundend',
      scoreA: this.scoreA,
      scoreB: this.scoreB,
      roundResult: winner,
      timer: Math.ceil(this.phaseTimer),
    })
    // maç sonu?
    const mercy =
      (this.scoreA >= ROUND.mercyDiff && this.scoreB === 0) ||
      (this.scoreB >= ROUND.mercyDiff && this.scoreA === 0)
    const reachedTarget = this.scoreA >= ROUND.roundsToWin || this.scoreB >= ROUND.roundsToWin
    const maxRounds = this.roundNum >= ROUND.totalRounds
    if (mercy || reachedTarget || maxRounds) {
      this.matchWinner = this.scoreA > this.scoreB ? 'A' : 'B'
    }
  }

  private matchWinner: Team | null = null

  private endMatch() {
    if (this.ended) return
    this.ended = true
    const winner = this.matchWinner ?? (this.scoreA >= this.scoreB ? 'A' : 'B')
    this.phase = 'matchend'
    const localWon = this.local?.team === winner
    setHud({ phase: 'matchend', matchWinner: winner, scoreA: this.scoreA, scoreB: this.scoreB })
    if (localWon) SFX.playWin()
    else SFX.playLose()
    this.opts.onMatchEnd(winner, this.scoreA, this.scoreB, localWon)
  }

  // --- Ana güncelleme ---
  update(dt: number) {
    if (this.phase === 'matchend') return
    dt = Math.min(dt, 0.05)
    this.shake = Math.max(0, this.shake - dt * 3)

    // efekt ömürleri
    const decay = (arr: { t: number; life: number }[]) => {
      for (let i = arr.length - 1; i >= 0; i--) {
        arr[i].t += dt
        if (arr[i].t >= arr[i].life) arr.splice(i, 1)
      }
    }
    decay(this.tracers)
    decay(this.flashes)
    decay(this.sparks)
    decay(this.explosions)

    for (const c of this.combatants.values()) {
      if (c.hitFlash > 0) c.hitFlash = Math.max(0, c.hitFlash - dt)
    }

    // faz zamanlayıcı
    this.phaseTimer -= dt
    if (this.phase === 'buy') {
      setHud({ timer: Math.max(0, Math.ceil(this.phaseTimer)) })
      if (this.phaseTimer <= 0) {
        this.phase = 'live'
        this.phaseTimer = ROUND.roundTime
        setHud({ phase: 'live', timer: Math.ceil(this.phaseTimer) })
        SFX.playRoundStart()
      }
    } else if (this.phase === 'live') {
      setHud({ timer: Math.max(0, Math.ceil(this.phaseTimer)) })
      if (this.phaseTimer <= 0) {
        const { aliveA, aliveB } = this.aliveCounts()
        this.endRound(aliveA >= aliveB ? 'A' : 'B')
      }
    } else if (this.phase === 'roundend') {
      setHud({ timer: Math.max(0, Math.ceil(this.phaseTimer)) })
      if (this.phaseTimer <= 0) {
        if (this.matchWinner) this.endMatch()
        else {
          this.roundNum++
          this.startRound(false)
        }
      }
    }

    // botlar & mermiler yalnızca canlı fazda hareket
    if (this.phase === 'live' || this.phase === 'buy') {
      for (const c of this.combatants.values()) {
        if (c.isBot && c.alive) this.updateBot(c, dt)
      }
    }
    this.updateGrenades(dt)
  }

  private tmpDir = new THREE.Vector3()
  private tmpEye = new THREE.Vector3()

  private updateBot(bot: Combatant, dt: number) {
    const now = performance.now() / 1000
    // hedef bul
    if (now > bot.nextThink) {
      bot.nextThink = now + 0.3 + Math.random() * 0.3
      let best: Combatant | null = null
      let bestD = Infinity
      const eye = bot.pos.clone()
      eye.y += PLAYER.eyeHeight
      for (const o of this.combatants.values()) {
        if (!o.alive || o.team === bot.team) continue
        const oe = o.pos.clone()
        oe.y += PLAYER.eyeHeight * 0.7
        const d = eye.distanceTo(oe)
        if (d < bestD && !this.losBlocked(eye, oe)) {
          bestD = d
          best = o
        }
      }
      bot.targetId = best?.id ?? null
      if (!best && Math.random() < 0.6) {
        // dolaş - merkeze/rakip tarafa yönel
        const tgtZ = bot.team === 'A' ? this.map.half * 0.4 : -this.map.half * 0.4
        bot.wander.set((Math.random() - 0.5) * this.map.half, 0, tgtZ + (Math.random() - 0.5) * 8)
      }
      bot.aimError.set((Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.15)
    }

    if (this.phase !== 'live') return

    const w = WEAPONS[bot.weapon]

    // bot reload completion
    if (now >= bot.reloadUntil && bot.ammo <= 0 && bot.reserve > 0) {
      const need = w.magazine - bot.ammo
      const take = Math.min(need, bot.reserve)
      bot.reserve -= take
      bot.ammo += take
    }

    const target = bot.targetId ? this.combatants.get(bot.targetId) : null
    const eye = bot.pos.clone()
    eye.y += PLAYER.eyeHeight

    let moveDir = new THREE.Vector3()
    if (target && target.alive) {
      const te = target.pos.clone()
      te.y += PLAYER.eyeHeight * 0.7
      const toT = te.clone().sub(eye)
      const dist = toT.length()
      bot.yaw = Math.atan2(toT.x, toT.z)
      // mesafe ayarı
      const ideal = Math.min(w.range * 0.55, 18)
      if (dist > ideal) moveDir.add(target.pos.clone().sub(bot.pos).setY(0).normalize())
      else if (dist < ideal * 0.5) moveDir.add(bot.pos.clone().sub(target.pos).setY(0).normalize())
      // strafe
      const perp = new THREE.Vector3(-toT.z, 0, toT.x).normalize()
      moveDir.add(perp.multiplyScalar(Math.sin(now * 2 + bot.pos.x) * 0.6))
      // ateş
      if (
        now - bot.lastShotAt > 1 / w.fireRate &&
        now > bot.reloadUntil &&
        dist < w.range &&
        !this.losBlocked(eye, te)
      ) {
        if (bot.ammo <= 0) {
          bot.reloadUntil = now + w.reloadTime
        } else {
          bot.lastShotAt = now
          bot.ammo--
          const dir = toT.clone().normalize().add(bot.aimError).normalize()
          const pellets = w.pellets
          for (let p = 0; p < pellets; p++) {
            const pd = dir.clone()
            if (pellets > 1) pd.add(new THREE.Vector3((Math.random() - 0.5) * w.spread * 3, (Math.random() - 0.5) * w.spread * 3, (Math.random() - 0.5) * w.spread * 3)).normalize()
            this.shootHitscan(bot, eye, pd)
          }
          this.flashes.push({ pos: eye.clone().add(this.tmpDir.set(Math.sin(bot.yaw), 0, Math.cos(bot.yaw)).multiplyScalar(0.6)), color: w.color, t: 0, life: 0.05 })
          // yakındaysa ses
          const lp = this.local?.pos
          if (lp && lp.distanceTo(bot.pos) < 40) SFX.playShot(bot.weapon)
        }
      }
    } else {
      // dolaş
      const toW = bot.wander.clone().sub(bot.pos).setY(0)
      if (toW.length() > 1) {
        moveDir.add(toW.normalize())
        bot.yaw = Math.atan2(toW.x, toW.z)
      }
    }

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize().multiplyScalar(PLAYER.moveSpeed * 0.85 * dt)
      this.moveWithCollision(bot, moveDir)
    }
  }

  private moveWithCollision(c: Combatant, delta: THREE.Vector3) {
    const half = this.map.half - 1
    // x ekseni
    const nx = c.pos.x + delta.x
    if (!this.blockedAt(nx, c.pos.z) && Math.abs(nx) < half) c.pos.x = nx
    const nz = c.pos.z + delta.z
    if (!this.blockedAt(c.pos.x, nz) && Math.abs(nz) < half) c.pos.z = nz
  }

  private blockedAt(x: number, z: number): boolean {
    const r = PLAYER.radius + 0.2
    for (const box of this.solids) {
      if (box.max.y < 0.6) continue
      if (x > box.min.x - r && x < box.max.x + r && z > box.min.z - r && z < box.max.z + r) return true
    }
    return false
  }

  private updateGrenades(dt: number) {
    const half = this.map.half - 0.5
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i]
      g.fuse -= dt
      g.vel.y -= 12 * dt
      g.pos.addScaledVector(g.vel, dt)
      if (g.pos.y < 0.2) {
        g.pos.y = 0.2
        g.vel.y = -g.vel.y * 0.4
        g.vel.x *= 0.7
        g.vel.z *= 0.7
      }
      if (Math.abs(g.pos.x) > half) { g.pos.x = Math.sign(g.pos.x) * half; g.vel.x = -g.vel.x * 0.5 }
      if (Math.abs(g.pos.z) > half) { g.pos.z = Math.sign(g.pos.z) * half; g.vel.z = -g.vel.z * 0.5 }
      if (g.fuse <= 0) {
        this.explodeGrenade(g)
        this.grenades.splice(i, 1)
      }
    }
  }

  // Oyuncu hareketi için engel testi (rapier yerine hafif)
  isBlocked(x: number, z: number) {
    return this.blockedAt(x, z)
  }

  groundHeightAt(x: number, z: number): number {
    let top = 0
    for (const box of this.solids.concat(this.map.blocks.map(blockAabb))) {
      if (x > box.min.x && x < box.max.x && z > box.min.z && z < box.max.z) {
        if (box.max.y <= 2.1 && box.max.y > top) top = box.max.y
      }
    }
    return top
  }
}
