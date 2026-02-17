"use client"

import { useState } from "react"
import { FileAudio, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileName: string
  channelCount: number
  onImport: (opts: { mode: "stereo" | "split"; targetChannel: number; volume: number }) => void
}

export function ImportDialog({
  open,
  onOpenChange,
  fileName,
  channelCount,
  onImport,
}: ImportDialogProps) {
  const [mode, setMode] = useState<"stereo" | "split">("stereo")
  const [targetChannel, setTargetChannel] = useState(1)
  const [volume, setVolume] = useState(80)

  const dbVal = volume === 0 ? "-\u221E" : `${(20 * Math.log10(volume / 80)).toFixed(1)}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <FileAudio className="size-5" />
            {"\u0418\u041C\u041F\u041E\u0420\u0422 \u0410\u0423\u0414\u0418\u041E"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 pt-2">
          {/* File info */}
          <div className="flex items-center gap-3 rounded-md bg-secondary px-3 py-2.5">
            <FileAudio className="size-4 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-foreground">{fileName}</span>
              <span className="text-xs text-muted-foreground">{"\u0421\u0442\u0435\u0440\u0435\u043e \u0444\u0430\u0439\u043b"}</span>
            </div>
          </div>

          {/* Mode */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {"\u0420\u0435\u0436\u0438\u043c \u0438\u043c\u043f\u043e\u0440\u0442\u0430"}
            </span>
            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:bg-accent/30">
              <input
                type="radio"
                name="mode"
                value="stereo"
                checked={mode === "stereo"}
                onChange={() => setMode("stereo")}
                className="accent-foreground"
              />
              <div className="flex flex-col">
                <span className="text-sm text-foreground">{"\u0421\u0442\u0435\u0440\u0435\u043e \u2192 1 \u043a\u0430\u043d\u0430\u043b"}</span>
                <span className="text-[11px] text-muted-foreground">{"\u041e\u0434\u0438\u043d \u043a\u0430\u043d\u0430\u043b \u0441\u043e \u0441\u0442\u0435\u0440\u0435\u043e \u0437\u0432\u0443\u043a\u043e\u043c"}</span>
              </div>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:bg-accent/30">
              <input
                type="radio"
                name="mode"
                value="split"
                checked={mode === "split"}
                onChange={() => setMode("split")}
                className="accent-foreground"
              />
              <div className="flex flex-col">
                <span className="text-sm text-foreground">{"\u0420\u0430\u0437\u0434\u0435\u043b\u0438\u0442\u044c L/R \u2192 2 \u043a\u0430\u043d\u0430\u043b\u0430"}</span>
                <span className="text-[11px] text-muted-foreground">{"\u041b\u0435\u0432\u044b\u0439 \u0438 \u043f\u0440\u0430\u0432\u044b\u0439 \u043d\u0430 \u0440\u0430\u0437\u043d\u044b\u0435 \u043a\u0430\u043d\u0430\u043b\u044b"}</span>
              </div>
            </label>
          </div>

          {/* Target channel */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {"\u041a\u0430\u043d\u0430\u043b"}
            </span>
            <select
              value={targetChannel}
              onChange={(e) => setTargetChannel(Number(e.target.value))}
              className="rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-foreground outline-none"
            >
              {Array.from({ length: channelCount }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>

          {/* Volume */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {"\u0413\u0440\u043e\u043c\u043a\u043e\u0441\u0442\u044c"}
            </span>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="h-4 flex-1"
              />
              <span className="w-14 text-right font-mono text-xs text-foreground">{dbVal} dB</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {"\u041e\u0422\u041c\u0415\u041d\u0410"}
            </button>
            <button
              onClick={() => onImport({ mode, targetChannel, volume })}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-bold text-background transition-colors hover:bg-foreground/90"
            >
              {"\u0417\u0410\u0413\u0420\u0423\u0417\u0418\u0422\u042c"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
