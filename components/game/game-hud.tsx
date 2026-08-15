"use client"

import { useEffect, useRef, useState } from "react"
import { controls, useHud } from "@/lib/game/store"
import { WEAPONS, GEAR } from "@/lib/game/config"
import { useEngine } from "./game-context"
import { RotateCcw, Menu } from "lucide-react"

// ─── Joystick ────────────────────────────────────────────────────────
function Joystick() {
  const baseRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const activeId = useRef<number | null>(null)
  const center = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const base = baseRef.current!
    const knob = knobRef.current!
    const radius = 38

    function setVec(dx: number, dy: number) {
      const len = Math.hypot(dx, dy)
      const clamped = Math.min(len, radius)
      const nx = len > 0 ? dx / len : 0
      const ny = len > 0 ? dy / len : 0
      knob.style.transform = `translate(${nx * clamped}px, ${ny * clamped}px)`
      controls.moveX = (nx * clamped) / radius
      controls.moveY = (ny * clamped) / radius
    }
    function reset() {
      knob.style.transform = "translate(0px, 0px)"
      controls.moveX = 0
      controls.moveY = 0
      activeId.current = null
    }
    function onDown(e: PointerEvent) {
      if (activeId.current !== null) return
      e.preventDefault()
      activeId.current = e.pointerId
      const r = base.getBoundingClientRect()
      center.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      setVec(e.clientX - center.current.x, e.clientY - center.current.y)
    }
    function onMove(e: PointerEvent) {
      if (e.pointerId !== activeId.current) return
      setVec(e.clientX - center.current.x, e.clientY - center.current.y)
    }
    function onUp(e: PointerEvent) {
      if (e.pointerId !== activeId.current) return
      reset()
    }
    base.addEventListener("pointerdown", onDown, { passive: false })
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      base.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [])

  return (
    <div
      ref={baseRef}
      className="absolute bottom-4 left-4 landscape:bottom-6 landscape:left-6 h-24 w-24 landscape:h-28 landscape:w-28 rounded-full glass"
      style={{ touchAction: "none" }}
    >
      <div
        ref={knobRef}
        className="absolute left-1/2 top-1/2 h-10 w-10 landscape:h-12 landscape:w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 border border-white/20 shadow-[0_0_12px_rgba(255,255,255,0.1)]"
      />
    </div>
  )
}

// ─── Look Area ───────────────────────────────────────────────────────
function LookArea() {
  const activeId = useRef<number | null>(null)
  const last = useRef({ x: 0, y: 0 })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current!
    function onDown(e: PointerEvent) {
      if (activeId.current !== null) return
      const target = e.target as HTMLElement
      if (target.closest("[data-hud-control]")) return
      activeId.current = e.pointerId
      last.current = { x: e.clientX, y: e.clientY }
    }
    function onMove(e: PointerEvent) {
      if (e.pointerId !== activeId.current) return
      controls.lookDX += e.clientX - last.current.x
      controls.lookDY += e.clientY - last.current.y
      last.current = { x: e.clientX, y: e.clientY }
    }
    function onUp(e: PointerEvent) {
      if (e.pointerId !== activeId.current) return
      activeId.current = null
    }
    el.addEventListener("pointerdown", onDown)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      el.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [])

  return <div ref={ref} className="absolute inset-0" style={{ touchAction: "none" }} />
}

// ─── Action Button ───────────────────────────────────────────────────
function ActionBtn({
  label,
  className = "",
  size = "md",
  onDown,
  onUp,
}: {
  label: string
  className?: string
  size?: "sm" | "md" | "lg"
  onDown?: () => void
  onUp?: () => void
}) {
  const sizes = { sm: "h-11 w-11 text-[9px]", md: "h-14 w-14 text-[10px]", lg: "h-[72px] w-[72px] text-xs" }
  return (
    <button
      data-hud-control
      className={`pointer-events-auto select-none rounded-full glass font-mono font-bold uppercase tracking-wider active:scale-90 active:bg-white/15 transition-transform ${sizes[size]} ${className}`}
      style={{ touchAction: "none" }}
      onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onDown?.() }}
      onPointerUp={(e) => { e.preventDefault(); onUp?.() }}
      onPointerLeave={() => onUp?.()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  )
}

// ─── Buy Menu ────────────────────────────────────────────────────────
function BuyMenu({ onClose }: { onClose: () => void }) {
  const engine = useEngine()
  const hud = useHud()
  const [tab, setTab] = useState<"weapons" | "gear">("weapons")

  if (hud.phase !== "buy") return null

  const canAfford = (price: number) => hud.money >= price

  return (
    <div data-hud-control className="absolute inset-0 z-50 flex items-center justify-center p-4">
      <div className="glass-strong rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <div>
            <p className="font-mono text-xs font-bold tracking-[0.2em] text-foreground/90">LOADOUT</p>
            <p className="font-mono text-[10px] text-accent">${hud.money}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground active:scale-95">
            <Menu className="size-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          {(["weapons", "gear"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 font-mono text-[10px] font-bold tracking-[0.15em] transition-colors ${
                tab === t ? "text-foreground border-b border-primary" : "text-muted-foreground"
              }`}
            >
              {t === "weapons" ? "WEAPONS" : "GEAR"}
            </button>
          ))}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {tab === "weapons" &&
            (Object.values(WEAPONS) as typeof WEAPONS.pistol[]).map((w) => (
              <button
                key={w.id}
                onClick={() => engine.buyWeapon(w.id as any)}
                disabled={!canAfford(w.price)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all active:scale-[0.98] ${
                  canAfford(w.price)
                    ? "glass hover:bg-white/5"
                    : "opacity-30"
                }`}
              >
                <div>
                  <p className="font-mono text-[11px] font-bold tracking-wide">{w.name}</p>
                  <p className="font-mono text-[9px] text-muted-foreground">
                    DMG {w.damage} · RNG {w.range} · {w.auto ? "AUTO" : "SEMI"}
                  </p>
                </div>
                <span className={`font-mono text-xs font-bold ${canAfford(w.price) ? "text-accent" : "text-muted-foreground"}`}>
                  ${w.price}
                </span>
              </button>
            ))}

          {tab === "gear" &&
            (Object.values(GEAR) as typeof GEAR.shield_light[]).filter(g => g.id !== 'bomb').map((g) => (
              <button
                key={g.id}
                onClick={() => engine.buyGear(g.id as any)}
                disabled={!canAfford(g.price)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all active:scale-[0.98] ${
                  canAfford(g.price)
                    ? "glass hover:bg-white/5"
                    : "opacity-30"
                }`}
              >
                <div>
                  <p className="font-mono text-[11px] font-bold tracking-wide">{g.name}</p>
                  <p className="font-mono text-[9px] text-muted-foreground">{g.description}</p>
                </div>
                <span className={`font-mono text-xs font-bold ${canAfford(g.price) ? "text-accent" : "text-muted-foreground"}`}>
                  ${g.price}
                </span>
              </button>
            ))}
        </div>

        {/* Timer */}
        <div className="border-t border-white/5 px-4 py-2 text-center">
          <p className="font-mono text-[10px] text-muted-foreground">
            BUY PHASE · <span className="text-accent font-bold">{hud.timer}s</span>
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Match End Screen ────────────────────────────────────────────────
function MatchEndScreen({ onExit }: { onExit: () => void }) {
  const hud = useHud()
  if (hud.phase !== "matchend") return null

  const won = hud.matchWinner === "A"
  const teamLabel = won ? "PURPLE" : "CYAN"

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
      <div className="relative glass-strong rounded-2xl p-8 text-center max-w-xs w-full mx-4">
        <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground mb-2">MATCH OVER</p>
        <p className={`font-mono text-3xl font-black tracking-[0.15em] mb-1 ${won ? "text-glow-purple text-primary" : "text-glow-cyan text-accent"}`}>
          {won ? "VICTORY" : "DEFEAT"}
        </p>
        <p className="font-mono text-sm text-muted-foreground mb-6">
          {teamLabel} TEAM — {hud.scoreA} : {hud.scoreB}
        </p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="glass rounded-xl p-3">
            <p className="font-mono text-lg font-bold">{hud.scoreA}</p>
            <p className="font-mono text-[8px] tracking-wider text-muted-foreground">ROUNDS</p>
          </div>
          <div className="glass rounded-xl p-3">
            <p className="font-mono text-lg font-bold">{hud.aliveA}</p>
            <p className="font-mono text-[8px] tracking-wider text-muted-foreground">ALIVE</p>
          </div>
          <div className="glass rounded-xl p-3">
            <p className="font-mono text-lg font-bold">{hud.roundNum}</p>
            <p className="font-mono text-[8px] tracking-wider text-muted-foreground">PLAYED</p>
          </div>
        </div>

        <button
          data-hud-control
          onClick={onExit}
          className="w-full rounded-xl bg-primary/90 py-3 font-mono text-xs font-bold tracking-[0.2em] text-primary-foreground active:scale-[0.98] transition-transform"
        >
          RETURN TO LOBBY
        </button>
      </div>
    </div>
  )
}

// ─── Main HUD ────────────────────────────────────────────────────────
export function GameHud({ onExit }: { onExit?: () => void }) {
  const hud = useHud()
  const hpPct = Math.max(0, Math.min(100, hud.health))
  const shieldPct = Math.max(0, Math.min(100, hud.shield))
  const weapon = WEAPONS[hud.weaponId]
  const [showBuy, setShowBuy] = useState(false)

  const now = performance.now()
  const showDamage = now - hud.damageFlash < 180

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden font-mono text-foreground safe-top safe-bottom safe-left safe-right">
      <LookArea />

      {/* Damage flash */}
      {showDamage && (
        <div className="absolute inset-0 bg-red-500/15 animate-pulse pointer-events-none" />
      )}

      {/* ── Top Bar: Score ── */}
      <div className="absolute left-1/2 top-2 landscape:top-3 -translate-x-1/2 pointer-events-none">
        <div className="glass rounded-full px-4 py-1.5 flex items-center gap-3">
          <span className="text-sm font-bold text-primary text-glow-purple">{hud.scoreA}</span>
          <div className="flex flex-col items-center leading-none">
            <span className="text-[8px] tracking-[0.2em] text-muted-foreground">R{hud.roundNum}</span>
            <span className="text-[10px] font-bold tabular-nums">{hud.timer}</span>
          </div>
          <span className="text-sm font-bold text-accent text-glow-cyan">{hud.scoreB}</span>
        </div>
      </div>

      {/* ── Phase indicator ── */}
      {hud.phase === "buy" && !showBuy && (
        <div className="absolute left-1/2 top-12 landscape:top-14 -translate-x-1/2 pointer-events-auto">
          <button
            data-hud-control
            onClick={() => setShowBuy(true)}
            className="glass rounded-full px-4 py-1.5 active:scale-95 transition-transform"
          >
            <span className="text-[10px] font-bold tracking-[0.15em] text-accent">
              BUY MENU · {hud.timer}s
            </span>
          </button>
        </div>
      )}

      {/* ── Round result ── */}
      {hud.phase === "roundend" && hud.roundResult && (
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 pointer-events-none">
          <div className="glass-strong rounded-2xl px-8 py-4 text-center">
            <p className="text-lg font-black tracking-[0.15em]">
              <span className={hud.roundResult === "A" ? "text-primary text-glow-purple" : "text-accent text-glow-cyan"}>
                {hud.roundResult === "A" ? "PURPLE" : "CYAN"}
              </span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">ROUND WON</p>
          </div>
        </div>
      )}

      {/* ── Killfeed (top right) ── */}
      <div className="absolute right-2 top-2 landscape:right-3 landscape:top-3 flex flex-col items-end gap-1 pointer-events-none">
        {hud.killfeed.map((k) => (
          <div key={k.id} className="glass rounded-lg px-2 py-1 text-[9px] animate-in fade-in slide-in-from-right-2">
            <span className={k.attackerTeam === "A" ? "text-primary" : "text-accent"}>{k.attacker}</span>
            <span className="text-muted-foreground mx-1">{k.weapon}</span>
            <span className="text-muted-foreground">{k.victim}</span>
          </div>
        ))}
      </div>

      {/* ── Alive count (top right, below killfeed) ── */}
      <div className="absolute right-2 top-12 landscape:top-14 pointer-events-none">
        <div className="glass rounded-lg px-2.5 py-1 flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-primary">{hud.aliveA}</span>
          <span className="text-[8px] text-muted-foreground">v</span>
          <span className="text-[10px] font-bold text-accent">{hud.aliveB}</span>
        </div>
      </div>

      {/* ── Crosshair ── */}
      {hud.alive && hud.phase !== "roundend" && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="opacity-60">
            <line x1="10" y1="2" x2="10" y2="7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="10" y1="13" x2="10" y2="18" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="2" y1="10" x2="7" y2="10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="13" y1="10" x2="18" y2="10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="10" cy="10" r="1" fill="white" opacity="0.4" />
          </svg>
        </div>
      )}

      {/* ── Left side: Joystick ── */}
      <div className="pointer-events-auto">
        <Joystick />
      </div>

      {/* ── Bottom left: Health bar ── */}
      <div className="absolute bottom-4 left-32 landscape:bottom-6 landscape:left-36 w-28 landscape:w-32 pointer-events-none">
        {/* Health */}
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-1">
          <div
            className="h-full rounded-full transition-[width] duration-100"
            style={{
              width: `${hpPct}%`,
              background: hpPct > 50 ? "oklch(0.65 0.22 290)" : hpPct > 25 ? "oklch(0.75 0.16 80)" : "oklch(0.58 0.2 25)",
            }}
          />
        </div>
        {/* Shield */}
        {hud.shield > 0 && (
          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent/70 transition-[width] duration-100"
              style={{ width: `${shieldPct}%` }}
            />
          </div>
        )}
        <p className="mt-0.5 text-[8px] text-muted-foreground tabular-nums">
          {Math.ceil(hud.health)}{hud.shield > 0 && <span className="text-accent"> +{Math.ceil(hud.shield)}</span>}
        </p>
      </div>

      {/* ── Right side: Action buttons ── */}
      <div className="pointer-events-auto absolute bottom-4 right-4 landscape:bottom-6 landscape:right-6 flex flex-col items-end gap-2">
        {/* Fire button — large */}
        <ActionBtn
          label="FIRE"
          size="lg"
          className="!bg-primary/20 border-primary/30 text-primary"
          onDown={() => (controls.firing = true)}
          onUp={() => (controls.firing = false)}
        />
        {/* Secondary row */}
        <div className="flex gap-2">
          <ActionBtn label="JMP" size="sm" onDown={() => (controls.jumpQueued = true)} />
          <ActionBtn label="RLD" size="sm" onDown={() => (controls.reloadQueued = true)} />
          <ActionBtn label={`💣${hud.grenades}`} size="sm" onDown={() => (controls.grenadeQueued = true)} />
        </div>
      </div>

      {/* ── Bottom center: Ammo ── */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="glass rounded-xl px-3 py-1.5 text-center">
          <div className="flex items-baseline gap-0.5">
            <span className="text-base font-bold tabular-nums">{hud.ammo}</span>
            <span className="text-[10px] text-muted-foreground tabular-nums">/ {hud.reserve}</span>
          </div>
          <p className="text-[8px] tracking-[0.15em] text-muted-foreground uppercase">
            {weapon.name}
            {hud.reloading && <span className="ml-1 text-accent animate-pulse">···</span>}
          </p>
        </div>
      </div>

      {/* ── Death overlay ── */}
      {!hud.alive && hud.phase === "live" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-2xl font-black tracking-[0.2em] text-destructive/80">ELIMINATED</p>
            <p className="mt-1 text-[10px] text-muted-foreground">Next round starting...</p>
          </div>
        </div>
      )}

      {/* ── Buy Menu ── */}
      {showBuy && <BuyMenu onClose={() => setShowBuy(false)} />}

      {/* ── Match End ── */}
      <MatchEndScreen onExit={() => { setShowBuy(false); onExit?.() }} />
    </div>
  )
}
