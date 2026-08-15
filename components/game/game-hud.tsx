"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { controls, useHud, resetControls } from "@/lib/game/store"
import { WEAPONS, GEAR } from "@/lib/game/config"
import { useEngine } from "./game-context"
import { X } from "lucide-react"

// ─── Fullscreen helper ──────────────────────────────────────────────
function requestFullscreen() {
  try {
    const el = document.documentElement as any
    if (el.requestFullscreen) el.requestFullscreen()
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
  } catch {}
}

// ─── Joystick ────────────────────────────────────────────────────────
function Joystick() {
  const baseRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const activeId = useRef<number | null>(null)
  const center = useRef({ x: 0, y: 0 })
  const radius = 40

  useEffect(() => {
    const base = baseRef.current!
    const knob = knobRef.current!

    function setVec(dx: number, dy: number) {
      const len = Math.hypot(dx, dy)
      const clamped = Math.min(len, radius)
      const nx = len > 0 ? dx / len : 0
      const ny = len > 0 ? dy / len : 0
      knob.style.transform = `translate(${nx * clamped}px, ${ny * clamped}px)`
      controls.moveX = (nx * clamped) / radius
      // Invert Y: screen-down is positive in clientY, but game-forward is negative moveY
      controls.moveY = -(ny * clamped) / radius
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
      e.stopPropagation()
      base.setPointerCapture(e.pointerId)
      activeId.current = e.pointerId
      const r = base.getBoundingClientRect()
      center.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      setVec(e.clientX - center.current.x, e.clientY - center.current.y)
    }

    function onMove(e: PointerEvent) {
      if (e.pointerId !== activeId.current) return
      e.preventDefault()
      setVec(e.clientX - center.current.x, e.clientY - center.current.y)
    }

    function onUp(e: PointerEvent) {
      if (e.pointerId !== activeId.current) return
      e.preventDefault()
      try { base.releasePointerCapture(e.pointerId) } catch {}
      reset()
    }

    base.addEventListener("pointerdown", onDown, { passive: false })
    base.addEventListener("pointermove", onMove, { passive: false })
    base.addEventListener("pointerup", onUp, { passive: false })
    base.addEventListener("pointercancel", onUp, { passive: false })
    base.addEventListener("lostpointercapture", () => reset())
    return () => {
      base.removeEventListener("pointerdown", onDown)
      base.removeEventListener("pointermove", onMove)
      base.removeEventListener("pointerup", onUp)
      base.removeEventListener("pointercancel", onUp)
      reset()
    }
  }, [])

  return (
    <div
      ref={baseRef}
      data-hud-control
      className="absolute bottom-5 left-5 h-[88px] w-[88px] rounded-full z-30"
      style={{ touchAction: "none", background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 60%, transparent 100%)", border: "1.5px solid rgba(255,255,255,0.08)" }}
    >
      <div className="absolute left-1/2 top-2 bottom-2 w-px bg-white/5 -translate-x-1/2" />
      <div className="absolute top-1/2 left-2 right-2 h-px bg-white/5 -translate-y-1/2" />
      <div
        ref={knobRef}
        className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(168,85,247,0.3) 0%, rgba(168,85,247,0.1) 100%)", border: "1.5px solid rgba(168,85,247,0.4)", boxShadow: "0 0 12px rgba(168,85,247,0.2)" }}
      />
    </div>
  )
}

// ─── Look Area (drag anywhere except HUD controls to look around) ───
function LookArea() {
  const activeId = useRef<number | null>(null)
  const last = useRef({ x: 0, y: 0 })

  useEffect(() => {
    function onDown(e: PointerEvent) {
      if (activeId.current !== null) return
      // Ignore touches on HUD controls (joystick, buttons, buy menu, etc.)
      const target = e.target as HTMLElement
      if (target.closest("[data-hud-control]")) return
      activeId.current = e.pointerId
      last.current = { x: e.clientX, y: e.clientY }
    }
    function onMove(e: PointerEvent) {
      if (e.pointerId !== activeId.current) return
      const dx = e.clientX - last.current.x
      const dy = e.clientY - last.current.y
      controls.lookDX += dx * 1.5
      controls.lookDY += dy * 1.5
      last.current = { x: e.clientX, y: e.clientY }
    }
    function onUp(e: PointerEvent) {
      if (e.pointerId !== activeId.current) return
      activeId.current = null
    }
    // Listen on document so we catch ALL touches
    document.addEventListener("pointerdown", onDown)
    document.addEventListener("pointermove", onMove)
    document.addEventListener("pointerup", onUp)
    document.addEventListener("pointercancel", onUp)
    return () => {
      document.removeEventListener("pointerdown", onDown)
      document.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerup", onUp)
      document.removeEventListener("pointercancel", onUp)
    }
  }, [])

  return null
}

// ─── Action Button ───────────────────────────────────────────────────
function ActionBtn({
  label,
  className = "",
  size = "md",
  glow = "",
  onDown,
  onUp,
}: {
  label: string
  className?: string
  size?: "sm" | "md" | "lg"
  glow?: string
  onDown?: () => void
  onUp?: () => void
}) {
  const sizes = { sm: "h-12 w-12 text-[9px]", md: "h-14 w-14 text-[10px]", lg: "h-[76px] w-[76px] text-xs" }
  return (
    <button
      data-hud-control
      className={`pointer-events-auto select-none rounded-full font-mono font-bold uppercase tracking-wider active:scale-90 transition-all duration-75 ${sizes[size]} ${className}`}
      style={{
        touchAction: "none",
        background: "rgba(255,255,255,0.05)",
        border: "1.5px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        boxShadow: glow || undefined,
      }}
      onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onDown?.() }}
      onPointerUp={(e) => { e.preventDefault(); onUp?.() }}
      onPointerLeave={() => { onUp?.() }}
      onPointerCancel={() => { onUp?.() }}
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
    <div data-hud-control className="absolute inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden rounded-2xl" style={{ background: "rgba(10,6,20,0.9)", border: "1px solid rgba(168,85,247,0.15)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div>
            <p className="font-mono text-[10px] font-bold tracking-[0.25em] text-white/70">LOADOUT</p>
            <p className="font-mono text-sm font-bold" style={{ color: "oklch(0.72 0.14 195)" }}>${hud.money}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-white/40 hover:text-white/80 active:scale-95">
            <X className="size-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {(["weapons", "gear"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 font-mono text-[9px] font-bold tracking-[0.2em] transition-all ${
                tab === t ? "text-white" : "text-white/30"
              }`}
              style={tab === t ? { borderBottom: "2px solid oklch(0.65 0.22 290)" } : {}}
            >
              {t === "weapons" ? "WEAPONS" : "GEAR"}
            </button>
          ))}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {tab === "weapons" &&
            (Object.values(WEAPONS) as typeof WEAPONS.pistol[]).map((w) => (
              <button
                key={w.id}
                onClick={() => { engine.buyWeapon(w.id as any) }}
                disabled={!canAfford(w.price)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-all active:scale-[0.98] active:bg-white/10 ${
                  canAfford(w.price) ? "bg-white/[0.04]" : "opacity-25"
                }`}
              >
                <div>
                  <p className="font-mono text-[11px] font-bold tracking-wide text-white/90">{w.name}</p>
                  <p className="font-mono text-[8px] tracking-wider text-white/30 mt-0.5">
                    DMG {w.damage} · RNG {w.range} · {w.auto ? "AUTO" : "SEMI"}
                  </p>
                </div>
                <span className={`font-mono text-[11px] font-bold ${canAfford(w.price) ? "text-accent" : "text-white/20"}`}>
                  ${w.price}
                </span>
              </button>
            ))}
          {tab === "gear" &&
            (Object.values(GEAR) as typeof GEAR.shield_light[]).filter(g => g.id !== 'bomb').map((g) => (
              <button
                key={g.id}
                onClick={() => { engine.buyGear(g.id as any) }}
                disabled={!canAfford(g.price)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-all active:scale-[0.98] active:bg-white/10 ${
                  canAfford(g.price) ? "bg-white/[0.04]" : "opacity-25"
                }`}
              >
                <div>
                  <p className="font-mono text-[11px] font-bold tracking-wide text-white/90">{g.name}</p>
                  <p className="font-mono text-[8px] tracking-wider text-white/30 mt-0.5">{g.description}</p>
                </div>
                <span className={`font-mono text-[11px] font-bold ${canAfford(g.price) ? "text-accent" : "text-white/20"}`}>
                  ${g.price}
                </span>
              </button>
            ))}
        </div>

        {/* Timer */}
        <div className="px-4 py-2 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="font-mono text-[9px] tracking-[0.2em] text-white/30">
            PREP PHASE · <span className="text-accent font-bold">{hud.timer}s</span>
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Match End ───────────────────────────────────────────────────────
function MatchEndScreen({ onExit }: { onExit: () => void }) {
  const hud = useHud()
  if (hud.phase !== "matchend") return null
  const won = hud.matchWinner === "A"

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto">
      <div className="absolute inset-0" style={{ background: "rgba(10,6,20,0.8)", backdropFilter: "blur(16px)" }} />
      <div className="relative w-full max-w-xs mx-4 rounded-2xl p-8 text-center" style={{ background: "rgba(10,6,20,0.9)", border: `1px solid ${won ? "rgba(168,85,247,0.3)" : "rgba(34,211,238,0.3)"}`, boxShadow: `0 0 40px ${won ? "rgba(168,85,247,0.15)" : "rgba(34,211,238,0.15)"}` }}>
        <p className="font-mono text-[9px] tracking-[0.3em] text-white/40 mb-3">MATCH OVER</p>
        <p className="font-mono text-3xl font-black tracking-[0.15em] mb-1" style={{ color: won ? "oklch(0.65 0.22 290)" : "oklch(0.72 0.14 195)", textShadow: `0 0 20px ${won ? "rgba(168,85,247,0.5)" : "rgba(34,211,238,0.5)"}` }}>
          {won ? "VICTORY" : "DEFEAT"}
        </p>
        <p className="font-mono text-xs text-white/40 mb-6">{hud.scoreA} — {hud.scoreB}</p>
        <button
          data-hud-control
          onClick={onExit}
          className="w-full rounded-xl py-3 font-mono text-[10px] font-bold tracking-[0.2em] text-white active:scale-[0.98] transition-transform"
          style={{ background: "oklch(0.65 0.22 290 / 80%)", boxShadow: "0 0 20px rgba(168,85,247,0.3)" }}
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

  // Request fullscreen on mount
  useEffect(() => {
    requestFullscreen()
  }, [])

  const handleExit = useCallback(() => {
    try { if (document.fullscreenElement) document.exitFullscreen() } catch {}
    resetControls()
    onExit?.()
  }, [onExit])

  const now = performance.now()
  const showDamage = now - hud.damageFlash < 200
  const hpColor = hpPct > 50 ? "oklch(0.65 0.22 290)" : hpPct > 25 ? "oklch(0.75 0.16 80)" : "oklch(0.58 0.2 25)"

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden font-mono text-white">
      {/* Look area — no DOM element, uses document listeners */}
      <LookArea />

      {/* Damage vignette */}
      {showDamage && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(239,68,68,0.25) 100%)" }} />
      )}

      {/* ── Score pill ── */}
      <div className="absolute left-1/2 top-2 -translate-x-1/2 pointer-events-none">
        <div className="flex items-center gap-2 rounded-full px-4 py-1" style={{ background: "rgba(10,6,20,0.6)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}>
          <span className="text-sm font-black tabular-nums" style={{ color: "oklch(0.65 0.22 290)", textShadow: "0 0 8px rgba(168,85,247,0.4)" }}>{hud.scoreA}</span>
          <div className="flex flex-col items-center leading-none px-1">
            <span className="text-[7px] tracking-[0.25em] text-white/25">R{hud.roundNum}</span>
            <span className="text-[10px] font-bold tabular-nums text-white/70">{hud.timer}</span>
          </div>
          <span className="text-sm font-black tabular-nums" style={{ color: "oklch(0.72 0.14 195)", textShadow: "0 0 8px rgba(34,211,238,0.4)" }}>{hud.scoreB}</span>
        </div>
      </div>

      {/* ── Buy phase button ── */}
      {hud.phase === "buy" && !showBuy && (
        <div className="absolute left-1/2 top-11 -translate-x-1/2 pointer-events-auto z-30">
          <button
            data-hud-control
            onClick={() => setShowBuy(true)}
            className="rounded-full px-5 py-2 active:scale-95 transition-transform"
            style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.25)", boxShadow: "0 0 16px rgba(34,211,238,0.15)" }}
          >
            <span className="font-mono text-[10px] font-bold tracking-[0.2em]" style={{ color: "oklch(0.72 0.14 195)" }}>
              SHOP · {hud.timer}s
            </span>
          </button>
        </div>
      )}

      {/* ── Round result ── */}
      {hud.phase === "roundend" && hud.roundResult && (
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 pointer-events-none">
          <div className="rounded-2xl px-8 py-5 text-center" style={{ background: "rgba(10,6,20,0.8)", border: `1px solid ${hud.roundResult === "A" ? "rgba(168,85,247,0.2)" : "rgba(34,211,238,0.2)"}`, backdropFilter: "blur(20px)" }}>
            <p className="text-lg font-black tracking-[0.15em]" style={{ color: hud.roundResult === "A" ? "oklch(0.65 0.22 290)" : "oklch(0.72 0.14 195)", textShadow: `0 0 16px ${hud.roundResult === "A" ? "rgba(168,85,247,0.4)" : "rgba(34,211,238,0.4)"}` }}>
              {hud.roundResult === "A" ? "PURPLE" : "CYAN"} WINS
            </p>
            <p className="text-[9px] tracking-[0.2em] text-white/30 mt-1">ROUND {hud.roundNum}</p>
          </div>
        </div>
      )}

      {/* ── Killfeed ── */}
      <div className="absolute right-2 top-2 flex flex-col items-end gap-1 pointer-events-none">
        {hud.killfeed.map((k) => (
          <div key={k.id} className="rounded-lg px-2.5 py-1 text-[8px]" style={{ background: "rgba(10,6,20,0.5)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ color: k.attackerTeam === "A" ? "oklch(0.65 0.22 290)" : "oklch(0.72 0.14 195)" }}>{k.attacker}</span>
            <span className="text-white/25 mx-1">{k.weapon}</span>
            <span className="text-white/40">{k.victim}</span>
          </div>
        ))}
      </div>

      {/* ── Alive count ── */}
      <div className="absolute right-2 top-12 pointer-events-none">
        <div className="flex items-center gap-1.5 rounded-lg px-2 py-1" style={{ background: "rgba(10,6,20,0.5)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <span className="text-[9px] font-bold" style={{ color: "oklch(0.65 0.22 290)" }}>{hud.aliveA}</span>
          <span className="text-[7px] text-white/20">vs</span>
          <span className="text-[9px] font-bold" style={{ color: "oklch(0.72 0.14 195)" }}>{hud.aliveB}</span>
        </div>
      </div>

      {/* ── Crosshair ── */}
      {hud.alive && hud.phase !== "roundend" && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <line x1="12" y1="3" x2="12" y2="8" stroke="white" strokeWidth="1" opacity="0.5" strokeLinecap="round" />
            <line x1="12" y1="16" x2="12" y2="21" stroke="white" strokeWidth="1" opacity="0.5" strokeLinecap="round" />
            <line x1="3" y1="12" x2="8" y2="12" stroke="white" strokeWidth="1" opacity="0.5" strokeLinecap="round" />
            <line x1="16" y1="12" x2="21" y2="12" stroke="white" strokeWidth="1" opacity="0.5" strokeLinecap="round" />
            <circle cx="12" cy="12" r="1.5" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" />
          </svg>
        </div>
      )}

      {/* ── Joystick ── */}
      <div className="pointer-events-auto z-30">
        <Joystick />
      </div>

      {/* ── Health ── */}
      <div className="absolute bottom-[100px] left-5 w-[88px] pointer-events-none z-30">
        <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-full rounded-full transition-[width] duration-100" style={{ width: `${hpPct}%`, background: hpColor, boxShadow: `0 0 6px ${hpColor}` }} />
        </div>
        {hud.shield > 0 && (
          <div className="h-0.5 rounded-full overflow-hidden mt-1" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="h-full rounded-full transition-[width] duration-100" style={{ width: `${shieldPct}%`, background: "oklch(0.72 0.14 195 / 60%)" }} />
          </div>
        )}
        <p className="mt-0.5 text-[8px] text-white/30 tabular-nums tracking-wider">
          {Math.ceil(hud.health)}{hud.shield > 0 && <span className="text-accent/60"> +{Math.ceil(hud.shield)}</span>}
        </p>
      </div>

      {/* ── Action buttons ── */}
      <div className="pointer-events-auto absolute bottom-5 right-5 flex flex-col items-end gap-2.5 z-30">
        <ActionBtn
          label="FIRE"
          size="lg"
          glow="0 0 16px rgba(168,85,247,0.2), inset 0 0 12px rgba(168,85,247,0.08)"
          className="!border-purple-500/25 text-purple-300"
          onDown={() => (controls.firing = true)}
          onUp={() => (controls.firing = false)}
        />
        <div className="flex gap-2">
          <ActionBtn label="JMP" size="sm" onDown={() => (controls.jumpQueued = true)} className="text-white/50" />
          <ActionBtn label="RLD" size="sm" onDown={() => (controls.reloadQueued = true)} className="text-white/50" />
          <ActionBtn label={`💣${hud.grenades}`} size="sm" onDown={() => (controls.grenadeQueued = true)} className="text-white/50" />
        </div>
      </div>

      {/* ── Ammo ── */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="rounded-xl px-4 py-1.5 text-center" style={{ background: "rgba(10,6,20,0.5)", border: "1px solid rgba(255,255,255,0.04)", backdropFilter: "blur(8px)" }}>
          <div className="flex items-baseline justify-center gap-0.5">
            <span className="text-base font-black tabular-nums text-white/80">{hud.ammo}</span>
            <span className="text-[9px] text-white/25 tabular-nums">/ {hud.reserve}</span>
          </div>
          <p className="text-[7px] tracking-[0.2em] text-white/25 uppercase mt-0.5">
            {weapon.name}
            {hud.reloading && <span className="ml-1 text-accent/60 animate-pulse">···</span>}
          </p>
        </div>
      </div>

      {/* ── Death overlay ── */}
      {!hud.alive && hud.phase === "live" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-2xl font-black tracking-[0.25em]" style={{ color: "oklch(0.58 0.2 25 / 70%)", textShadow: "0 0 20px rgba(239,68,68,0.3)" }}>ELIMINATED</p>
            <p className="mt-1.5 text-[9px] tracking-[0.2em] text-white/25">NEXT ROUND INCOMING</p>
          </div>
        </div>
      )}

      {/* ── Buy Menu ── */}
      {showBuy && <BuyMenu onClose={() => setShowBuy(false)} />}

      {/* ── Match End ── */}
      <MatchEndScreen onExit={handleExit} />
    </div>
  )
}
