/* ──────────────────────────────────────────────────────
   IPC Handlers  --  Bridge between renderer and native audio engine
   ────────────────────────────────────────────────────── */

import { ipcMain, dialog, BrowserWindow } from "electron"
import * as path from "path"

// The native C++ addon is loaded at runtime
// In production it ships in the `native/` extraResources folder
let audioEngine: any = null

function getAddonPath(): string {
  const isPackaged = !process.env.NODE_ENV || process.env.NODE_ENV === "production"
  if (isPackaged) {
    return path.join(process.resourcesPath, "native", "audio_engine.node")
  }
  return path.join(__dirname, "../native/build/Release/audio_engine.node")
}

function initEngine() {
  if (audioEngine) return audioEngine
  try {
    audioEngine = require(getAddonPath())
    audioEngine.initialize({
      sampleRate: 48000,
      bufferSize: 256,
      channelCount: 8,
    })
    console.log("[StageTraxx] Native audio engine initialized")
  } catch (err) {
    console.error("[StageTraxx] Failed to load native audio engine:", err)
    console.log("[StageTraxx] Falling back to stub engine")
    audioEngine = createStubEngine()
  }
  return audioEngine
}

/* ── Stub engine for development without compiled C++ addon ─── */
function createStubEngine() {
  const state = {
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    channels: Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      filePath: null as string | null,
      fileName: null as string | null,
      volume: 75,
      pan: 0,
      muted: false,
      solo: false,
      duration: 0,
      sampleRate: 48000,
      fileChannels: 2,
      frames: 0,
    })),
    masterVolume: 80,
    meterInterval: null as ReturnType<typeof setInterval> | null,
    timeInterval: null as ReturnType<typeof setInterval> | null,
    meterCallback: null as ((data: unknown) => void) | null,
    timeCallback: null as ((time: number) => void) | null,
  }

  function startMetering() {
    if (state.meterInterval) return
    state.meterInterval = setInterval(() => {
      if (!state.isPlaying || state.isPaused) return
      if (!state.meterCallback) return

      const channels = state.channels.map((ch) => {
        if (!ch.filePath || ch.muted) {
          return { id: ch.id, rmsL: 0, rmsR: 0, peakL: 0, peakR: 0 }
        }
        const base = ch.volume / 100
        const hasSolo = state.channels.some((c) => c.solo)
        const audible = hasSolo ? ch.solo : true
        const level = audible ? base * 0.8 : 0
        return {
          id: ch.id,
          rmsL: Math.min(1, level + (Math.random() - 0.4) * 0.25),
          rmsR: Math.min(1, level + (Math.random() - 0.4) * 0.25),
          peakL: Math.min(1, level + Math.random() * 0.15),
          peakR: Math.min(1, level + Math.random() * 0.15),
        }
      })
      const masterLevel = (state.masterVolume / 100) * 0.85
      state.meterCallback({
        channels,
        master: {
          rmsL: Math.min(1, masterLevel + (Math.random() - 0.3) * 0.2),
          rmsR: Math.min(1, masterLevel + (Math.random() - 0.3) * 0.2),
          peakL: Math.min(1, masterLevel + Math.random() * 0.1),
          peakR: Math.min(1, masterLevel + Math.random() * 0.1),
        },
      })
    }, 33) // ~30fps

    state.timeInterval = setInterval(() => {
      if (!state.isPlaying || state.isPaused) return
      state.currentTime += 0.1
      const maxDuration = Math.max(...state.channels.filter((c) => c.filePath).map((c) => c.duration), 0)
      if (maxDuration > 0 && state.currentTime >= maxDuration) {
        state.isPlaying = false
        state.isPaused = false
        state.currentTime = 0
      }
      if (state.timeCallback) state.timeCallback(state.currentTime)
    }, 100)
  }

  function stopMetering() {
    if (state.meterInterval) { clearInterval(state.meterInterval); state.meterInterval = null }
    if (state.timeInterval) { clearInterval(state.timeInterval); state.timeInterval = null }
  }

  return {
    initialize: () => {},
    getDevices: () => [
      { index: 0, name: "Встроенный выход (WASAPI)", hostApi: "WASAPI", maxOutputChannels: 2, defaultSampleRate: 48000, isDefault: true },
      { index: 1, name: "HDMI Output (WASAPI)", hostApi: "WASAPI", maxOutputChannels: 8, defaultSampleRate: 48000, isDefault: false },
      { index: 2, name: "Focusrite USB ASIO", hostApi: "ASIO", maxOutputChannels: 8, defaultSampleRate: 48000, isDefault: false },
    ],
    setOutputDevice: (_index: number) => {},
    getStatus: () => ({
      sampleRate: 48000,
      bufferSize: 256,
      outputDevice: "Встроенный выход (WASAPI)",
      hostApi: "WASAPI",
      cpuLoad: 0.02,
    }),
    loadFile: (channelId: number, filePath: string) => {
      const ch = state.channels.find((c) => c.id === channelId)
      if (ch) {
        ch.filePath = filePath
        ch.fileName = path.basename(filePath)
        ch.duration = 180 + Math.random() * 180 // stub: 3-6 min
        ch.frames = ch.duration * 48000
      }
      return {
        path: filePath,
        name: path.basename(filePath),
        sampleRate: 48000,
        channels: 2,
        durationSeconds: ch?.duration || 300,
        frames: ch?.frames || 300 * 48000,
      }
    },
    unloadFile: (channelId: number) => {
      const ch = state.channels.find((c) => c.id === channelId)
      if (ch) { ch.filePath = null; ch.fileName = null; ch.duration = 0; ch.frames = 0 }
    },
    play: () => {
      state.isPlaying = true
      state.isPaused = false
      startMetering()
    },
    pause: () => {
      state.isPaused = true
    },
    stop: () => {
      state.isPlaying = false
      state.isPaused = false
      state.currentTime = 0
      stopMetering()
    },
    seek: (time: number) => { state.currentTime = time },
    setVolume: (channelId: number, volume: number) => {
      const ch = state.channels.find((c) => c.id === channelId)
      if (ch) ch.volume = volume
    },
    setPan: (channelId: number, pan: number) => {
      const ch = state.channels.find((c) => c.id === channelId)
      if (ch) ch.pan = pan
    },
    setMute: (channelId: number, muted: boolean) => {
      const ch = state.channels.find((c) => c.id === channelId)
      if (ch) ch.muted = muted
    },
    setSolo: (channelId: number, solo: boolean) => {
      const ch = state.channels.find((c) => c.id === channelId)
      if (ch) ch.solo = solo
    },
    setMasterVolume: (volume: number) => { state.masterVolume = volume },
    onMeterData: (cb: (data: unknown) => void) => { state.meterCallback = cb },
    onTimeUpdate: (cb: (time: number) => void) => { state.timeCallback = cb },
    dispose: () => { stopMetering() },
    _getState: () => state,
  }
}

/* ── Register all IPC handlers ────────────────────────── */

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  const engine = initEngine()

  // Forward meter data and time updates from engine to renderer
  engine.onMeterData((data: unknown) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("audio:meters", data)
    }
  })
  engine.onTimeUpdate((time: number) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("audio:time", time)
    }
  })

  // ── Device management ─────────────────────────────
  ipcMain.handle("audio:get-devices", () => engine.getDevices())
  ipcMain.handle("audio:set-device", (_e, deviceIndex: number) => engine.setOutputDevice(deviceIndex))
  ipcMain.handle("audio:get-status", () => engine.getStatus())

  // ── File operations ───────────────────────────────
  ipcMain.handle("audio:open-file-dialog", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [
        { name: "Аудио файлы", extensions: ["wav", "mp3", "flac", "ogg", "aiff", "aif"] },
        { name: "Все файлы", extensions: ["*"] },
      ],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle("audio:load-file", async (_e, channelId: number, filePath?: string) => {
    let targetPath = filePath
    if (!targetPath) {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openFile"],
        filters: [
          { name: "Аудио файлы", extensions: ["wav", "mp3", "flac", "ogg", "aiff", "aif"] },
        ],
      })
      if (result.canceled || result.filePaths.length === 0) return null
      targetPath = result.filePaths[0]
    }
    try {
      return engine.loadFile(channelId, targetPath)
    } catch (err: any) {
      mainWindow.webContents.send("audio:error", `Ошибка загрузки: ${err.message}`)
      return null
    }
  })

  ipcMain.handle("audio:unload-file", (_e, channelId: number) => engine.unloadFile(channelId))

  // ── Transport ─────────────────────────────────────
  ipcMain.handle("audio:play", () => {
    engine.play()
    mainWindow.webContents.send("audio:transport-state", { isPlaying: true, isPaused: false })
  })
  ipcMain.handle("audio:pause", () => {
    engine.pause()
    mainWindow.webContents.send("audio:transport-state", { isPlaying: true, isPaused: true })
  })
  ipcMain.handle("audio:stop", () => {
    engine.stop()
    mainWindow.webContents.send("audio:transport-state", { isPlaying: false, isPaused: false })
  })
  ipcMain.handle("audio:seek", (_e, time: number) => engine.seek(time))

  // ── Channel control (fire-and-forget via send) ────
  ipcMain.on("audio:set-volume", (_e, channelId: number, volume: number) => engine.setVolume(channelId, volume))
  ipcMain.on("audio:set-pan", (_e, channelId: number, pan: number) => engine.setPan(channelId, pan))
  ipcMain.on("audio:set-mute", (_e, channelId: number, muted: boolean) => engine.setMute(channelId, muted))
  ipcMain.on("audio:set-solo", (_e, channelId: number, solo: boolean) => engine.setSolo(channelId, solo))
  ipcMain.on("audio:set-master-volume", (_e, volume: number) => engine.setMasterVolume(volume))

  // ── Cleanup on window close ───────────────────────
  mainWindow.on("closed", () => {
    engine.dispose()
  })
}
