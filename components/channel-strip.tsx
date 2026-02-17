"use client"

import { useCallback, useRef, useState, useEffect } from "react"
import {
  Volume2,
  VolumeX,
  Headphones,
  Upload,
  X,
  FileAudio,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface ChannelState {
  id: number
  name: string
  fileName: string | null
  volume: number
  pan: number
  muted: boolean
  solo: boolean
  levelL: number
  levelR: number
}

interface ChannelStripProps {
  channel: ChannelState
  onVolumeChange: (id: number, vol: number) => void
  onPanChange: (id: number, pan: number) => void
  onMute: (id: number) => void
  onSolo: (id: number) => void
  onLoadFile: (id: number) => void
  onClear: (id: number) => void
  onDrop: (id: number, file: File) => void
}

function volToDb(v: number): string {
  if (v === 0) return "-\u221E"
  const db = 20 * Math.log10(v / 80)
  return `${db >= 0 ? "+" : ""}${db.toFixed(1)}`
}

function LevelMeter({ level }: { level: number }) {
  const clamped = Math.max(0, Math.min(100, level))
  return (
    <div className="relative h-full w-[5px] overflow-hidden rounded-sm bg-secondary">
      <div
        className="absolute bottom-0 left-0 w-full rounded-sm transition-all duration-75"
        style={{
          height: `${clamped}%`,
          background:
            clamped > 90
              ? "oklch(0.85 0 0)"
              : clamped > 70
                ? "oklch(0.65 0 0)"
                : "oklch(0.45 0 0)",
        }}
      />
    </div>
  )
}

export function ChannelStrip({
  channel,
  onVolumeChange,
  onPanChange,
  onMute,
  onSolo,
  onLoadFile,
  onClear,
  onDrop,
}: ChannelStripProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const faderRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const isLoaded = channel.fileName !== null

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])
  const handleDragLeave = useCallback(() => setIsDragOver(false), [])
  const handleDropFile = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const f = e.dataTransfer.files[0]
      if (f) onDrop(channel.id, f)
    },
    [channel.id, onDrop]
  )

  // Custom vertical fader via mouse
  const handleFaderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      const el = faderRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const update = (clientY: number) => {
        const pct = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
        onVolumeChange(channel.id, Math.round(pct * 100))
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
    [channel.id, onVolumeChange]
  )

  // Touch support
  const handleFaderTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setIsDragging(true)
      const el = faderRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const update = (clientY: number) => {
        const pct = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
        onVolumeChange(channel.id, Math.round(pct * 100))
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
    [channel.id, onVolumeChange]
  )

  return (
    <div
      className={cn(
        "flex w-[100px] shrink-0 flex-col border-r border-border bg-card transition-colors",
        isDragOver && "bg-accent/40",
        channel.muted && "opacity-40"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropFile}
    >
      {/* Channel number + name header */}
      <div className="flex h-12 flex-col items-center justify-center gap-0.5 border-b border-border bg-secondary">
        <span className="text-[10px] font-bold tracking-wide text-foreground">{channel.id}</span>
        <span className="max-w-full truncate px-1 text-[9px] uppercase tracking-wider text-muted-foreground">
          {channel.name}
        </span>
      </div>

      {/* File name / load area */}
      <div className="flex h-16 flex-col items-center justify-center gap-1 border-b border-border px-1.5">
        {isLoaded ? (
          <>
            <div className="flex w-full items-center gap-1">
              <FileAudio className="size-3 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-center text-[10px] text-foreground">
                {channel.fileName}
              </span>
            </div>
            <button
              onClick={() => onClear(channel.id)}
              className="flex items-center gap-0.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              aria-label={"\u0423\u0434\u0430\u043b\u0438\u0442\u044c"}
            >
              <X className="size-3" />
            </button>
          </>
        ) : (
          <button
            onClick={() => onLoadFile(channel.id)}
            className="flex flex-col items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Upload className="size-4" />
            <span className="text-[10px] font-medium uppercase tracking-wider">
              {"\u0424\u0410\u0419\u041b"}
            </span>
          </button>
        )}
      </div>

      {/* Level meters + Fader */}
      <div className="flex flex-1 items-stretch gap-0 border-b border-border px-1">
        {/* L meter */}
        <div className="flex w-3 items-stretch py-2">
          <LevelMeter level={channel.levelL} />
          <span className="sr-only">L</span>
        </div>

        {/* Fader */}
        <div
          ref={faderRef}
          className="relative mx-auto flex flex-1 cursor-pointer touch-none items-stretch py-2"
          onMouseDown={handleFaderMouseDown}
          onTouchStart={handleFaderTouchStart}
          role="slider"
          aria-valuenow={channel.volume}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`\u0413\u0440\u043e\u043c\u043a\u043e\u0441\u0442\u044c \u043a\u0430\u043d\u0430\u043b\u0430 ${channel.id}`}
        >
          {/* Track line */}
          <div className="absolute left-1/2 top-2 bottom-2 w-[2px] -translate-x-1/2 rounded bg-secondary" />
          {/* Fader thumb */}
          <div
            className={cn(
              "absolute left-1/2 h-3 w-8 -translate-x-1/2 rounded-sm border border-border transition-colors",
              isDragging ? "bg-foreground" : "bg-muted-foreground"
            )}
            style={{
              bottom: `calc(${channel.volume}% * 0.88 + 8px)`,
            }}
          >
            {/* Grip lines */}
            <div className="flex h-full flex-col items-center justify-center gap-[2px]">
              <div className="h-[1px] w-3 bg-background/50" />
              <div className="h-[1px] w-3 bg-background/50" />
            </div>
          </div>
          {/* Scale marks */}
          {[0, 25, 50, 75, 100].map((v) => (
            <div
              key={v}
              className="absolute right-0 h-[1px] w-1.5 bg-muted-foreground/30"
              style={{ bottom: `calc(${v}% * 0.88 + 8px)` }}
            />
          ))}
        </div>

        {/* R meter */}
        <div className="flex w-3 items-stretch py-2">
          <LevelMeter level={channel.levelR} />
          <span className="sr-only">R</span>
        </div>
      </div>

      {/* dB value */}
      <div className="flex h-7 items-center justify-center border-b border-border">
        <span className="font-mono text-[10px] text-muted-foreground">
          {volToDb(channel.volume)} dB
        </span>
      </div>

      {/* Pan */}
      <div className="flex h-10 flex-col items-center justify-center gap-0.5 border-b border-border px-1">
        <div className="flex w-full items-center gap-0.5">
          <span className="text-[8px] text-muted-foreground">L</span>
          <input
            type="range"
            min={-50}
            max={50}
            value={channel.pan}
            onChange={(e) => onPanChange(channel.id, Number(e.target.value))}
            className="h-3 flex-1"
          />
          <span className="text-[8px] text-muted-foreground">R</span>
        </div>
        <span className="font-mono text-[8px] text-muted-foreground">
          {channel.pan === 0 ? "C" : channel.pan < 0 ? `L${Math.abs(channel.pan)}` : `R${channel.pan}`}
        </span>
      </div>

      {/* Mute / Solo */}
      <div className="flex items-stretch">
        <button
          onClick={() => onMute(channel.id)}
          className={cn(
            "flex h-9 flex-1 items-center justify-center border-r border-border text-[10px] font-bold uppercase transition-colors",
            channel.muted
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label={channel.muted ? "\u0412\u043a\u043b\u044e\u0447\u0438\u0442\u044c" : "\u0417\u0430\u0433\u043b\u0443\u0448\u0438\u0442\u044c"}
        >
          {channel.muted ? <VolumeX className="size-3.5" /> : "M"}
        </button>
        <button
          onClick={() => onSolo(channel.id)}
          className={cn(
            "flex h-9 flex-1 items-center justify-center text-[10px] font-bold uppercase transition-colors",
            channel.solo
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label={channel.solo ? "\u0423\u0431\u0440\u0430\u0442\u044c \u0441\u043e\u043b\u043e" : "\u0421\u043e\u043b\u043e"}
        >
          {channel.solo ? <Headphones className="size-3.5" /> : "S"}
        </button>
      </div>

      <input ref={fileRef} type="file" accept="audio/*" className="hidden" />
    </div>
  )
}
