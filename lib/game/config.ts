export type WeaponId =
  | 'pistol'
  | 'deagle'
  | 'smg'
  | 'uzi'
  | 'rifle'
  | 'ak47'
  | 'shotgun'
  | 'pump'
  | 'sniper'
  | 'laser'
  | 'knife'

export type WeaponKind = 'primary' | 'secondary'

export type Weapon = {
  id: WeaponId
  name: string
  kind: WeaponKind
  price: number
  damage: number
  /** merkeze uzaklıkla azalan hasar için maksimum etkili menzil */
  range: number
  /** saniyedeki atış (RPM/60) */
  fireRate: number
  magazine: number
  reserve: number
  /** her atışta rastgele yayılma (radyan) */
  spread: number
  /** tek atışta çıkan mermi sayısı (shotgun > 1) */
  pellets: number
  reloadTime: number
  /** geri tepme (ekran sarsıntı katsayısı) */
  recoil: number
  auto: boolean
  color: string
}

export const WEAPONS: Record<WeaponId, Weapon> = {
  pistol: {
    id: 'pistol',
    name: 'GX-9 Tabanca',
    kind: 'secondary',
    price: 0,
    damage: 26,
    range: 40,
    fireRate: 6,
    magazine: 12,
    reserve: 48,
    spread: 0.012,
    pellets: 1,
    reloadTime: 1.3,
    recoil: 0.6,
    auto: false,
    color: '#a855f7',
  },
  deagle: {
    id: 'deagle',
    name: 'Deagle .50',
    kind: 'secondary',
    price: 800,
    damage: 63,
    range: 60,
    fireRate: 3,
    magazine: 7,
    reserve: 35,
    spread: 0.008,
    pellets: 1,
    reloadTime: 1.8,
    recoil: 1.6,
    auto: false,
    color: '#fbbf24',
  },
  smg: {
    id: 'smg',
    name: 'Vektor SMG',
    kind: 'primary',
    price: 1200,
    damage: 20,
    range: 45,
    fireRate: 13,
    magazine: 30,
    reserve: 90,
    spread: 0.03,
    pellets: 1,
    reloadTime: 2,
    recoil: 0.5,
    auto: true,
    color: '#22d3ee',
  },
  uzi: {
    id: 'uzi',
    name: 'Neon Uzi',
    kind: 'primary',
    price: 1500,
    damage: 17,
    range: 40,
    fireRate: 16,
    magazine: 25,
    reserve: 100,
    spread: 0.045,
    pellets: 1,
    reloadTime: 1.8,
    recoil: 0.4,
    auto: true,
    color: '#ec4899',
  },
  rifle: {
    id: 'rifle',
    name: 'AR-Neon',
    kind: 'primary',
    price: 2700,
    damage: 33,
    range: 80,
    fireRate: 10,
    magazine: 30,
    reserve: 90,
    spread: 0.018,
    pellets: 1,
    reloadTime: 2.4,
    recoil: 0.9,
    auto: true,
    color: '#a855f7',
  },
  ak47: {
    id: 'ak47',
    name: 'AK Pulse',
    kind: 'primary',
    price: 2500,
    damage: 39,
    range: 85,
    fireRate: 8,
    magazine: 30,
    reserve: 90,
    spread: 0.024,
    pellets: 1,
    reloadTime: 2.8,
    recoil: 1.1,
    auto: true,
    color: '#ef4444',
  },
  shotgun: {
    id: 'shotgun',
    name: 'Sawed Breacher',
    kind: 'primary',
    price: 1800,
    damage: 12,
    range: 18,
    fireRate: 1.8,
    magazine: 8,
    reserve: 32,
    spread: 0.12,
    pellets: 8,
    reloadTime: 2.5,
    recoil: 2,
    auto: false,
    color: '#f97316',
  },
  pump: {
    id: 'pump',
    name: 'Pump Breacher',
    kind: 'primary',
    price: 2000,
    damage: 16,
    range: 22,
    fireRate: 1.2,
    magazine: 6,
    reserve: 24,
    spread: 0.09,
    pellets: 9,
    reloadTime: 3.2,
    recoil: 2.3,
    auto: false,
    color: '#fbbf24',
  },
  sniper: {
    id: 'sniper',
    name: 'Longshot X',
    kind: 'primary',
    price: 4200,
    damage: 115,
    range: 200,
    fireRate: 0.8,
    magazine: 5,
    reserve: 20,
    spread: 0.002,
    pellets: 1,
    reloadTime: 3.4,
    recoil: 3,
    auto: false,
    color: '#22d3ee',
  },
  laser: {
    id: 'laser',
    name: 'Laser Rifle',
    kind: 'primary',
    price: 3200,
    damage: 45,
    range: 120,
    fireRate: 6,
    magazine: 40,
    reserve: 80,
    spread: 0.008,
    pellets: 1,
    reloadTime: 2.2,
    recoil: 0.3,
    auto: true,
    color: '#22c55e',
  },
  knife: {
    id: 'knife',
    name: 'Neon Blade',
    kind: 'secondary',
    price: 500,
    damage: 75,
    range: 2,
    fireRate: 2,
    magazine: 999,
    reserve: 999,
    spread: 0,
    pellets: 1,
    reloadTime: 0,
    recoil: 0,
    auto: false,
    color: '#06b6d4',
  },
}

export type GearId = 'shield_light' | 'shield_heavy' | 'grenade' | 'ammo' | 'bomb'

export type Gear = {
  id: GearId
  name: string
  price: number
  description: string
}

export const GEAR: Record<GearId, Gear> = {
  shield_light: { id: 'shield_light', name: 'Hafif Kalkan', price: 500, description: '+50 kalkan' },
  shield_heavy: { id: 'shield_heavy', name: 'Ağır Kalkan', price: 1000, description: '+100 kalkan' },
  grenade: { id: 'grenade', name: 'Patlayıcı', price: 300, description: 'Alan hasarı, +1 adet' },
  ammo: { id: 'ammo', name: 'Cephane Paketi', price: 200, description: 'Yedek mermileri doldur' },
  bomb: { id: 'bomb', name: 'Hedef Pili', price: 0, description: 'Hedefteki hedefi aktifleştir' },
}

// Ekonomi
export const ECONOMY = {
  startMoney: 1200,
  maxMoney: 9000,
  winReward: 3500,
  lossReward: 2400,
  killReward: 500,
  bombPlantReward: 300,
  bombDefuseReward: 600,
  bombExplodeReward: 500,
  maxGrenades: 3,
}

// Tur sistemi
export const ROUND = {
  roundsToWin: 7, // 13 tur formatı: ilk 7'yi alan kazanır
  totalRounds: 13,
  mercyDiff: 6, // 6-0 farkında maç biter
  buyTime: 15, // saniye - base'den çıkamama + market
  roundTime: 100, // saniye
  respawnDelay: 3,
  bombPlantTime: 3, // saniye
  bombDefuseTime: 5, // saniye
  bombExplosionTime: 40, // saniye
}

export const PLAYER = {
  maxHealth: 150,
  maxShield: 100,
  moveSpeed: 5.5,
  sprintSpeed: 7,
  jumpForce: 5.2,
  eyeHeight: 1.55,
  radius: 0.35,
  height: 1.2,
}

export type SkinId = 'violet' | 'cyan' | 'magenta' | 'lime' | 'amber' | 'custom'

export const SKINS: { id: SkinId; name: string; color: string }[] = [
  { id: 'violet', name: 'Violet', color: '#a855f7' },
  { id: 'cyan', name: 'Cyan', color: '#22d3ee' },
  { id: 'magenta', name: 'Magenta', color: '#ec4899' },
  { id: 'lime', name: 'Lime', color: '#84cc16' },
  { id: 'amber', name: 'Amber', color: '#f59e0b' },
]

export function damageFalloff(base: number, dist: number, range: number) {
  if (dist <= range * 0.5) return base
  if (dist >= range) return base * 0.4
  const t = (dist - range * 0.5) / (range * 0.5)
  return base * (1 - 0.6 * t)
}
