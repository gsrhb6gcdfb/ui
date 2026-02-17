"use client"

import { useCallback, useRef } from "react"
import {
  SkipBack,
  Play,
  Pause,
  Square,
  SkipForward,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TransportBarProps {
  isPlaying: boolean
  isPaused: boolean
  currentTime: number
  totalTime: number
  songTitle: string
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onPrev: () => void
  onNext: () => void
  onSeek: (time: number) => void
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
}

export function TransportBar({
  isPlaying,
  isPaused,
  currentTime,
  totalTime,
  songTitle,
  onPlay,
  onPause,
  onStop,
  onPrev,
  onNext,
  onSeek,
}: TransportBarProps) {
  const progressRef = useRef<HTMLDivElement>(null)
  const progress = totalTime > 0 ? currentTime / totalTime : 0

  const handleProgressClick = useCallback(
    (e: React.MouseEvent) => {
      const el = progressRef.current
      if (!el || totalTime === 0) return
      const rect = el.getBoundingClientRect()
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
      onSeek((x / rect.width) * totalTime)
    },
    [totalTime, onSeek]
  )

  return (
    <div className="flex flex-col border-b border-border bg-card">
      {/* Progress bar */}
      <div
        ref={progressRef}
        className="group relative h-2 cursor-pointer bg-secondary transition-all hover:h-3"
        onClick={handleProgressClick}
        role="progressbar"
        aria-valuenow={Math.floor(currentTime)}
        aria-valuemin={0}
        aria-valuemax={Math.floor(totalTime)}
      >
        <div
          className="h-full bg-foreground/80 transition-all"
          style={{ width: `${progress * 100}%` }}
        />
        {/* Playhead marker */}
        <div
          className="absolute top-1/2 h-3 w-1 -translate-y-1/2 rounded-full bg-foreground opacity-0 transition-opacity group-hover:opacity-100"
          style={{ left: `${progress * 100}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-0 px-2 py-1.5">
        {/* Transport buttons */}
        <div className="flex items-center">
          <button
            onClick={onPrev}
            className="flex size-9 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={"\u041f\u0440\u0435\u0434\u044b\u0434\u0443\u0449\u0438\u0439"}
          >
            <SkipBack className="size-4" />
          </button>

          <button
            onClick={isPlaying && !isPaused ? onPause : onPlay}
            className={cn(
              "flex size-10 items-center justify-center rounded-md text-foreground transition-colors",
              isPlaying && !isPaused
                ? "bg-foreground text-background"
                : "bg-accent hover:bg-accent/70"
            )}
            aria-label={isPlaying && !isPaused ? "\u041f\u0430\u0443\u0437\u0430" : "\u0412\u043e\u0441\u043f\u0440\u043e\u0438\u0437\u0432\u0435\u0441\u0442\u0438"}
          >
            {isPlaying && !isPaused ? (
              <Pause className="size-5" />
            ) : (
              <Play className="ml-0.5 size-5" />
            )}
          </button>

          <button
            onClick={onStop}
            className="flex size-9 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={"\u0421\u0442\u043e\u043f"}
          >
            <Square className="size-4" />
          </button>

          <button
            onClick={onNext}
            className="flex size-9 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={"\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439"}
          >
            <SkipForward className="size-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-3 h-6 w-px bg-border" />

        {/* Song title */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {songTitle || "\u041d\u0435\u0442 \u0442\u0440\u0435\u043a\u0430"}
          </span>
        </div>

        {/* Time display */}
        <div className="flex items-center gap-1.5 font-mono text-sm tabular-nums text-foreground">
          <Clock className="size-3.5 text-muted-foreground" />
          <span>{formatTime(currentTime)}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{formatTime(totalTime)}</span>
        </div>
      </div>
    </div>
  )
}
