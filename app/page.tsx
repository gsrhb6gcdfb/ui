"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { ChannelStrip, type ChannelState } from "@/components/channel-strip"
import { MasterStrip } from "@/components/master-strip"
import { TransportBar } from "@/components/transport-bar"
import { ImportDialog } from "@/components/import-dialog"
import { BottomDrawer } from "@/components/bottom-drawer"

function createDefaultChannel(id: number): ChannelState {
  const names = [
    "\u041a\u043b\u0438\u043a", "\u0411\u0430\u0440\u0430\u0431\u0430\u043d\u044b", "\u0411\u0430\u0441", "\u041a\u043b\u0430\u0432\u0438\u0448\u0438",
    "\u0413\u0438\u0442\u0430\u0440\u0430", "\u0412\u043e\u043a\u0430\u043b", "\u0411\u044d\u043a", "\u042d\u0444\u0444\u0435\u043a\u0442\u044b",
  ]
  return {
    id,
    name: names[id - 1] || `Track ${id}`,
    fileName: null,
    volume: 75,
    pan: 0,
    muted: false,
    solo: false,
    levelL: 0,
    levelR: 0,
  }
}

export default function ShowRunnerPage() {
  const [channels, setChannels] = useState<ChannelState[]>(() => {
    const chs = Array.from({ length: 8 }, (_, i) => createDefaultChannel(i + 1))
    chs[0] = { ...chs[0], fileName: "click-track.wav", volume: 60 }
    chs[1] = { ...chs[1], fileName: "drums-full.wav", volume: 82 }
    chs[4] = { ...chs[4], fileName: "guitar-lead.wav", volume: 65, pan: 15 }
    chs[5] = { ...chs[5], fileName: "main-vocals.wav", volume: 78 }
    return chs
  })

  const [masterVolume, setMasterVolume] = useState(80)
  const [masterLevelL, setMasterLevelL] = useState(0)
  const [masterLevelR, setMasterLevelR] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const totalTime = 312 // 5:12

  const [importOpen, setImportOpen] = useState(false)
  const [importFileName] = useState("track.wav")

  const animRef = useRef<number>(0)
  const lastRef = useRef<number>(0)

  // Animate meters during playback
  useEffect(() => {
    if (!isPlaying || isPaused) {
      cancelAnimationFrame(animRef.current)
      return
    }

    const animate = (time: number) => {
      if (time - lastRef.current > 50) {
        lastRef.current = time

        setCurrentTime((prev) => {
          if (prev >= totalTime) {
            setIsPlaying(false)
            setIsPaused(false)
            return 0
          }
          return prev + 0.05
        })

        setChannels((prev) =>
          prev.map((ch) => {
            if (!ch.fileName || ch.muted) {
              return {
                ...ch,
                levelL: Math.max(0, ch.levelL * 0.7),
                levelR: Math.max(0, ch.levelR * 0.7),
              }
            }
            const base = ch.volume * 0.8
            return {
              ...ch,
              levelL: Math.min(100, base + (Math.random() - 0.4) * 25),
              levelR: Math.min(100, base + (Math.random() - 0.4) * 25),
            }
          })
        )

        // Master level
        setMasterLevelL(Math.min(100, masterVolume * 0.85 + (Math.random() - 0.3) * 20))
        setMasterLevelR(Math.min(100, masterVolume * 0.85 + (Math.random() - 0.3) * 20))
      }
      animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [isPlaying, isPaused, totalTime, masterVolume])

  // Decay meters when stopped
  useEffect(() => {
    if (isPlaying && !isPaused) return
    const decay = setInterval(() => {
      setChannels((prev) => {
        const anyActive = prev.some((c) => c.levelL > 0.5 || c.levelR > 0.5)
        if (!anyActive) {
          clearInterval(decay)
          return prev
        }
        return prev.map((c) => ({
          ...c,
          levelL: Math.max(0, c.levelL * 0.85),
          levelR: Math.max(0, c.levelR * 0.85),
        }))
      })
      setMasterLevelL((p) => Math.max(0, p * 0.85))
      setMasterLevelR((p) => Math.max(0, p * 0.85))
    }, 50)
    return () => clearInterval(decay)
  }, [isPlaying, isPaused])

  const handleVolumeChange = useCallback((id: number, vol: number) => {
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, volume: vol } : c)))
  }, [])

  const handlePanChange = useCallback((id: number, pan: number) => {
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, pan } : c)))
  }, [])

  const handleMute = useCallback((id: number) => {
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, muted: !c.muted } : c)))
  }, [])

  const handleSolo = useCallback((id: number) => {
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, solo: !c.solo } : c)))
  }, [])

  const handleLoadFile = useCallback((id: number) => {
    const demoFiles = [
      "click.wav", "drums.wav", "bass.wav", "keys.wav",
      "guitar.wav", "vocals.wav", "bgv.wav", "pads.wav",
    ]
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, fileName: demoFiles[id - 1] || "track.wav" } : c))
    )
  }, [])

  const handleClear = useCallback((id: number) => {
    setChannels((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, fileName: null, levelL: 0, levelR: 0 } : c
      )
    )
  }, [])

  const handleDrop = useCallback((id: number, file: File) => {
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, fileName: file.name } : c))
    )
  }, [])

  const handlePlay = useCallback(() => {
    setIsPlaying(true)
    setIsPaused(false)
  }, [])

  const handlePause = useCallback(() => {
    setIsPaused(true)
  }, [])

  const handleStop = useCallback(() => {
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentTime(0)
  }, [])

  const handleSeek = useCallback((t: number) => {
    setCurrentTime(t)
  }, [])

  return (
    <main className="flex h-screen flex-col bg-background">
      {/* Transport bar */}
      <TransportBar
        isPlaying={isPlaying}
        isPaused={isPaused}
        currentTime={currentTime}
        totalTime={totalTime}
        songTitle={"\u041f\u0440\u043e\u0435\u043a\u0442 1 \u2014 Amazing Grace (8 \u0442\u0440\u0435\u043a\u043e\u0432)"}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onPrev={() => {}}
        onNext={() => {}}
        onSeek={handleSeek}
      />

      {/* Mixer area: 8 channels + master */}
      <div className="flex flex-1 overflow-x-auto overflow-y-hidden">
        {channels.map((ch) => (
          <ChannelStrip
            key={ch.id}
            channel={ch}
            onVolumeChange={handleVolumeChange}
            onPanChange={handlePanChange}
            onMute={handleMute}
            onSolo={handleSolo}
            onLoadFile={handleLoadFile}
            onClear={handleClear}
            onDrop={handleDrop}
          />
        ))}

        {/* Divider */}
        <div className="w-px shrink-0 bg-muted-foreground/20" />

        {/* Master */}
        <MasterStrip
          volume={masterVolume}
          levelL={masterLevelL}
          levelR={masterLevelR}
          onVolumeChange={setMasterVolume}
        />
      </div>

      {/* Bottom drawer: Songs / History / Settings */}
      <BottomDrawer
        onSelectSong={() => {}}
      />

      {/* Import dialog */}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        fileName={importFileName}
        channelCount={8}
        onImport={(opts) => {
          setImportOpen(false)
          handleLoadFile(opts.targetChannel)
        }}
      />
    </main>
  )
}
