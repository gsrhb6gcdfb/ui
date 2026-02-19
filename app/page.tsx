"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { ChannelStrip, type ChannelState } from "@/components/channel-strip"
import { MasterStrip } from "@/components/master-strip"
import { TransportBar } from "@/components/transport-bar"
import { ImportDialog } from "@/components/import-dialog"
import { BottomDrawer } from "@/components/bottom-drawer"
import { useAudioEngine } from "@/hooks/use-audio-engine"
import { isElectron } from "@/lib/electron-api"
import type { MeterData } from "@/types/electron"

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
    // Demo data for browser preview mode
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
  const [totalTime, setTotalTime] = useState(312) // 5:12

  const [importOpen, setImportOpen] = useState(false)
  const [importFileName] = useState("track.wav")

  // Browser fallback animation refs
  const animRef = useRef<number>(0)
  const lastRef = useRef<number>(0)

  // ── Audio engine integration (Electron mode) ──────
  const { state: engineState, actions: engine } = useAudioEngine({
    onMeterData: (data: MeterData) => {
      // Update channel levels from native metering
      setChannels((prev) =>
        prev.map((ch) => {
          const meterCh = data.channels.find((m) => m.id === ch.id)
          if (!meterCh) return ch
          return {
            ...ch,
            levelL: Math.min(100, meterCh.rmsL * 100),
            levelR: Math.min(100, meterCh.rmsR * 100),
          }
        })
      )
      // Update master levels
      setMasterLevelL(Math.min(100, data.master.rmsL * 100))
      setMasterLevelR(Math.min(100, data.master.rmsR * 100))
    },
    onTimeUpdate: (time: number) => {
      setCurrentTime(time)
    },
    onTransportState: (ts) => {
      setIsPlaying(ts.isPlaying)
      setIsPaused(ts.isPaused)
    },
    onError: (err) => {
      console.error("[StageTraxx] Audio engine error:", err)
    },
  })

  // Sync engine state
  useEffect(() => {
    if (engineState.isElectronMode) {
      setIsPlaying(engineState.isPlaying)
      setIsPaused(engineState.isPaused)
      setCurrentTime(engineState.currentTime)
    }
  }, [engineState])

  // ── Browser fallback: animate meters during playback ──
  useEffect(() => {
    // Skip browser simulation when running in Electron
    if (isElectron()) return

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

        setMasterLevelL(Math.min(100, masterVolume * 0.85 + (Math.random() - 0.3) * 20))
        setMasterLevelR(Math.min(100, masterVolume * 0.85 + (Math.random() - 0.3) * 20))
      }
      animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [isPlaying, isPaused, totalTime, masterVolume])

  // ── Browser fallback: decay meters when stopped ──
  useEffect(() => {
    if (isElectron()) return
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

  // ── Handlers (unified: work in both modes) ────────

  const handleVolumeChange = useCallback((id: number, vol: number) => {
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, volume: vol } : c)))
    engine.setVolume(id, vol)
  }, [engine])

  const handlePanChange = useCallback((id: number, pan: number) => {
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, pan } : c)))
    engine.setPan(id, pan)
  }, [engine])

  const handleMute = useCallback((id: number) => {
    setChannels((prev) => {
      const ch = prev.find((c) => c.id === id)
      if (ch) engine.setMute(id, !ch.muted)
      return prev.map((c) => (c.id === id ? { ...c, muted: !c.muted } : c))
    })
  }, [engine])

  const handleSolo = useCallback((id: number) => {
    setChannels((prev) => {
      const ch = prev.find((c) => c.id === id)
      if (ch) engine.setSolo(id, !ch.solo)
      return prev.map((c) => (c.id === id ? { ...c, solo: !c.solo } : c))
    })
  }, [engine])

  const handleLoadFile = useCallback(async (id: number) => {
    if (isElectron()) {
      // Open native file dialog and load into engine
      const fileInfo = await engine.loadFile(id)
      if (fileInfo) {
        setChannels((prev) =>
          prev.map((c) => (c.id === id ? { ...c, fileName: fileInfo.name } : c))
        )
        // Update total time to match longest loaded file
        setTotalTime((prev) => Math.max(prev, fileInfo.durationSeconds))
      }
    } else {
      // Browser fallback: demo file names
      const demoFiles = [
        "click.wav", "drums.wav", "bass.wav", "keys.wav",
        "guitar.wav", "vocals.wav", "bgv.wav", "pads.wav",
      ]
      setChannels((prev) =>
        prev.map((c) => (c.id === id ? { ...c, fileName: demoFiles[id - 1] || "track.wav" } : c))
      )
    }
  }, [engine])

  const handleClear = useCallback(async (id: number) => {
    await engine.unloadFile(id)
    setChannels((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, fileName: null, levelL: 0, levelR: 0 } : c
      )
    )
  }, [engine])

  const handleDrop = useCallback(async (id: number, file: File) => {
    if (isElectron()) {
      // In Electron, File objects from drag-and-drop have a .path property
      const filePath = (file as any).path as string
      if (filePath) {
        const fileInfo = await engine.loadFile(id, filePath)
        if (fileInfo) {
          setChannels((prev) =>
            prev.map((c) => (c.id === id ? { ...c, fileName: fileInfo.name } : c))
          )
          setTotalTime((prev) => Math.max(prev, fileInfo.durationSeconds))
        }
      }
    } else {
      setChannels((prev) =>
        prev.map((c) => (c.id === id ? { ...c, fileName: file.name } : c))
      )
    }
  }, [engine])

  const handlePlay = useCallback(async () => {
    if (isElectron()) {
      await engine.play()
    } else {
      setIsPlaying(true)
      setIsPaused(false)
    }
  }, [engine])

  const handlePause = useCallback(async () => {
    if (isElectron()) {
      await engine.pause()
    } else {
      setIsPaused(true)
    }
  }, [engine])

  const handleStop = useCallback(async () => {
    if (isElectron()) {
      await engine.stop()
    } else {
      setIsPlaying(false)
      setIsPaused(false)
      setCurrentTime(0)
    }
  }, [engine])

  const handleSeek = useCallback(async (t: number) => {
    if (isElectron()) {
      await engine.seek(t)
    }
    setCurrentTime(t)
  }, [engine])

  const handleMasterVolumeChange = useCallback((vol: number) => {
    setMasterVolume(vol)
    engine.setMasterVolume(vol)
  }, [engine])

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
          onVolumeChange={handleMasterVolumeChange}
        />
      </div>

      {/* Bottom drawer: Songs / History / Settings */}
      <BottomDrawer
        onSelectSong={() => {}}
        audioDevices={engineState.devices}
        engineStatus={engineState.engineStatus}
        onSetOutputDevice={engine.setOutputDevice}
        isElectronMode={engineState.isElectronMode}
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
