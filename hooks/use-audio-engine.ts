/* ──────────────────────────────────────────────────────
   useAudioEngine  --  React hook bridging UI <-> native audio
   Provides a unified API that works in both Electron and browser.
   In browser mode, all calls are no-ops and metering is simulated.
   ────────────────────────────────────────────────────── */

"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { isElectron, getElectronAPI } from "@/lib/electron-api"
import type { MeterData, AudioDevice, FileInfo, EngineStatus } from "@/types/electron"

export interface AudioEngineState {
  isElectronMode: boolean
  isPlaying: boolean
  isPaused: boolean
  currentTime: number
  devices: AudioDevice[]
  engineStatus: EngineStatus | null
}

export interface AudioEngineActions {
  play: () => Promise<void>
  pause: () => Promise<void>
  stop: () => Promise<void>
  seek: (time: number) => Promise<void>
  loadFile: (channelId: number, filePath?: string) => Promise<FileInfo | null>
  unloadFile: (channelId: number) => Promise<void>
  setVolume: (channelId: number, volume: number) => void
  setPan: (channelId: number, pan: number) => void
  setMute: (channelId: number, muted: boolean) => void
  setSolo: (channelId: number, solo: boolean) => void
  setMasterVolume: (volume: number) => void
  setOutputDevice: (deviceIndex: number) => Promise<void>
  refreshDevices: () => Promise<void>
}

interface UseAudioEngineOptions {
  onMeterData?: (data: MeterData) => void
  onTimeUpdate?: (time: number) => void
  onTransportState?: (state: { isPlaying: boolean; isPaused: boolean }) => void
  onError?: (error: string) => void
}

export function useAudioEngine(options: UseAudioEngineOptions = {}) {
  const { onMeterData, onTimeUpdate, onTransportState, onError } = options

  const [state, setState] = useState<AudioEngineState>({
    isElectronMode: false,
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    devices: [],
    engineStatus: null,
  })

  // Store callbacks in refs so event listeners always see the latest version
  const onMeterDataRef = useRef(onMeterData)
  const onTimeUpdateRef = useRef(onTimeUpdate)
  const onTransportStateRef = useRef(onTransportState)
  const onErrorRef = useRef(onError)

  useEffect(() => { onMeterDataRef.current = onMeterData }, [onMeterData])
  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate }, [onTimeUpdate])
  useEffect(() => { onTransportStateRef.current = onTransportState }, [onTransportState])
  useEffect(() => { onErrorRef.current = onError }, [onError])

  // Set up Electron IPC listeners
  useEffect(() => {
    if (!isElectron()) return

    setState((prev) => ({ ...prev, isElectronMode: true }))

    const api = getElectronAPI()!
    const cleanups: Array<() => void> = []

    cleanups.push(
      api.onMeterData((data) => {
        onMeterDataRef.current?.(data as MeterData)
      })
    )

    cleanups.push(
      api.onTimeUpdate((time) => {
        setState((prev) => ({ ...prev, currentTime: time }))
        onTimeUpdateRef.current?.(time)
      })
    )

    cleanups.push(
      api.onTransportState((ts) => {
        setState((prev) => ({
          ...prev,
          isPlaying: ts.isPlaying,
          isPaused: ts.isPaused,
        }))
        onTransportStateRef.current?.(ts)
      })
    )

    cleanups.push(
      api.onEngineError((err) => {
        onErrorRef.current?.(err)
      })
    )

    // Fetch initial devices
    api.getDevices().then((devices) => {
      setState((prev) => ({ ...prev, devices: devices as AudioDevice[] }))
    })
    api.getEngineStatus().then((status) => {
      setState((prev) => ({ ...prev, engineStatus: status as EngineStatus }))
    })

    return () => {
      cleanups.forEach((fn) => fn())
    }
  }, [])

  // ── Actions ─────────────────────────────────────────
  const play = useCallback(async () => {
    const api = getElectronAPI()
    if (api) {
      await api.play()
    }
    setState((prev) => ({ ...prev, isPlaying: true, isPaused: false }))
  }, [])

  const pause = useCallback(async () => {
    const api = getElectronAPI()
    if (api) {
      await api.pause()
    }
    setState((prev) => ({ ...prev, isPaused: true }))
  }, [])

  const stop = useCallback(async () => {
    const api = getElectronAPI()
    if (api) {
      await api.stop()
    }
    setState((prev) => ({ ...prev, isPlaying: false, isPaused: false, currentTime: 0 }))
  }, [])

  const seek = useCallback(async (time: number) => {
    const api = getElectronAPI()
    if (api) {
      await api.seek(time)
    }
    setState((prev) => ({ ...prev, currentTime: time }))
  }, [])

  const loadFile = useCallback(async (channelId: number, filePath?: string): Promise<FileInfo | null> => {
    const api = getElectronAPI()
    if (api) {
      return (await api.loadFile(channelId, filePath)) as FileInfo | null
    }
    return null
  }, [])

  const unloadFile = useCallback(async (channelId: number) => {
    const api = getElectronAPI()
    if (api) {
      await api.unloadFile(channelId)
    }
  }, [])

  const setVolume = useCallback((channelId: number, volume: number) => {
    const api = getElectronAPI()
    if (api) api.setVolume(channelId, volume)
  }, [])

  const setPan = useCallback((channelId: number, pan: number) => {
    const api = getElectronAPI()
    if (api) api.setPan(channelId, pan)
  }, [])

  const setMute = useCallback((channelId: number, muted: boolean) => {
    const api = getElectronAPI()
    if (api) api.setMute(channelId, muted)
  }, [])

  const setSolo = useCallback((channelId: number, solo: boolean) => {
    const api = getElectronAPI()
    if (api) api.setSolo(channelId, solo)
  }, [])

  const setMasterVolume = useCallback((volume: number) => {
    const api = getElectronAPI()
    if (api) api.setMasterVolume(volume)
  }, [])

  const setOutputDevice = useCallback(async (deviceIndex: number) => {
    const api = getElectronAPI()
    if (api) {
      await api.setOutputDevice(deviceIndex)
      const status = await api.getEngineStatus()
      setState((prev) => ({ ...prev, engineStatus: status as EngineStatus }))
    }
  }, [])

  const refreshDevices = useCallback(async () => {
    const api = getElectronAPI()
    if (api) {
      const devices = await api.getDevices()
      setState((prev) => ({ ...prev, devices: devices as AudioDevice[] }))
    }
  }, [])

  const actions: AudioEngineActions = {
    play, pause, stop, seek,
    loadFile, unloadFile,
    setVolume, setPan, setMute, setSolo,
    setMasterVolume,
    setOutputDevice, refreshDevices,
  }

  return { state, actions }
}
