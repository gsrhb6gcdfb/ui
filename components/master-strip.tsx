"use client"

import { useCallback, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface MasterStripProps {
  volume: number
  levelL: number
  levelR: number
  onVolumeChange: (v: number) => void
}

function volToDb(v: number): string {
  if (v === 0) return "-\u221E"
  const db = 20 * Math.log10(v / 80)
  return `${db >= 0 ? "+" : ""}${db.toFixed(1)}`
}

function MasterMeter({ level }: { level: number }) {
  const clamped = Math.max(0, Math.min(100, level))
  return (
    <div className="relative h-full w-[6px] overflow-hidden rounded-sm bg-secondary">
      <div
        className="absolute bottom-0 left-0 w-full rounded-sm transition-all duration-75"
        style={{
          height: `${clamped}%`,
          background:
            clamped > 90
              ? "oklch(0.85 0 0)"
              : clamped > 70
                ? "oklch(0.65 0 0)"
                : "oklch(0.5 0 0)",
        }}
      />
    </div>
  )
}

export function MasterStrip({ volume, levelL, levelR, onVolumeChange }: MasterStripProps) {
  const faderRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFaderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      const el = faderRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const update = (clientY: number) => {
        const pct = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
        onVolumeChange(Math.round(pct * 100))
      }
      update(e.clientY)
      const onMove = (ev: MouseEvent) => update(ev.clientY)
      const onUp = () => {
        setIsDragging(false)
        window.removeEventListener("mousemove", onMove)
        window.removeEventListener("mouseup", onUp)
      }
      window.addEventListener("mousemove", onMove)
      window.addEventListener("mouseup", onUp)
    },
    [onVolumeChange]
  )

  const handleFaderTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setIsDragging(true)
      const el = faderRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const update = (clientY: number) => {
        const pct = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
        onVolumeChange(Math.round(pct * 100))
      }
      update(e.touches[0].clientY)
      const onMove = (ev: TouchEvent) => {
        ev.preventDefault()
        update(ev.touches[0].clientY)
      }
      const onEnd = () => {
        setIsDragging(false)
        window.removeEventListener("touchmove", onMove)
        window.removeEventListener("touchend", onEnd)
      }
      window.addEventListener("touchmove", onMove, { passive: false })
      window.addEventListener("touchend", onEnd)
    },
    [onVolumeChange]
  )

  return (
    <div className="flex w-[130px] shrink-0 flex-col bg-card">
      {/* Header */}
      <div className="flex h-9 items-center justify-center border-b border-border bg-foreground">
        <span className="text-xs font-bold uppercase tracking-widest text-background">
          {"\u041C\u0410\u0421\u0422\u0415\u0420"}
        </span>
      </div>

      {/* Spacer matching file area */}
      <div className="flex h-16 items-center justify-center border-b border-border">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {"\u0413\u043b\u0430\u0432\u043d\u044b\u0439 \u0432\u044b\u0445\u043e\u0434"}
        </span>
      </div>

      {/* Level meters + fader */}
      <div className="flex flex-1 items-stretch gap-0 border-b border-border px-2">
        {/* L meter */}
        <div className="flex w-4 items-stretch py-2">
          <MasterMeter level={levelL} />
          <span className="sr-only">L</span>
        </div>

        {/* Fader */}
        <div
          ref={faderRef}
          className="relative mx-auto flex flex-1 cursor-pointer touch-none items-stretch py-2"
          onMouseDown={handleFaderMouseDown}
          onTouchStart={handleFaderTouchStart}
          role="slider"
          aria-valuenow={volume}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={"\u041c\u0430\u0441\u0442\u0435\u0440 \u0433\u0440\u043e\u043c\u043a\u043e\u0441\u0442\u044c"}
        >
          <div className="absolute left-1/2 top-2 bottom-2 w-[2px] -translate-x-1/2 rounded bg-secondary" />
          <div
            className={cn(
              "absolute left-1/2 h-4 w-10 -translate-x-1/2 rounded-sm border border-border transition-colors",
              isDragging ? "bg-foreground" : "bg-muted-foreground"
            )}
            style={{
              bottom: `calc(${volume}% * 0.88 + 8px)`,
            }}
          >
            <div className="flex h-full flex-col items-center justify-center gap-[2px]">
              <div className="h-[1px] w-4 bg-background/50" />
              <div className="h-[1px] w-4 bg-background/50" />
              <div className="h-[1px] w-4 bg-background/50" />
            </div>
          </div>
          {[0, 25, 50, 75, 100].map((v) => (
            <div
              key={v}
              className="absolute right-0 h-[1px] w-2 bg-muted-foreground/30"
              style={{ bottom: `calc(${v}% * 0.88 + 8px)` }}
            />
          ))}
        </div>

        {/* R meter */}
        <div className="flex w-4 items-stretch py-2">
          <MasterMeter level={levelR} />
          <span className="sr-only">R</span>
        </div>
      </div>

      {/* dB value */}
      <div className="flex h-7 items-center justify-center border-b border-border">
        <span className="font-mono text-xs font-bold text-foreground">
          {volToDb(volume)} dB
        </span>
      </div>

      {/* Pan */}
      <div className="flex h-10 flex-col items-center justify-center gap-0.5 border-b border-border px-2">
        <div className="flex w-full items-center gap-0.5">
          <span className="text-[9px] text-muted-foreground">L</span>
          <input
            type="range"
            min={-50}
            max={50}
            value={0}
            readOnly
            className="h-3 flex-1"
          />
          <span className="text-[9px] text-muted-foreground">R</span>
        </div>
        <span className="font-mono text-[9px] text-muted-foreground">C</span>
      </div>

      {/* Empty bottom to match M/S */}
      <div className="flex h-9 items-center justify-center bg-secondary">
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
          {"\u0412\u044b\u0445\u043e\u0434"}
        </span>
      </div>
    </div>
  )
}
