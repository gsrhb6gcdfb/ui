/* ──────────────────────────────────────────────────────
   Electron Preload Script
   Exposes a safe, typed API to the renderer via contextBridge
   ────────────────────────────────────────────────────── */

import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electronAPI", {
  // ── Device management ─────────────────────────────
  getDevices: () => ipcRenderer.invoke("audio:get-devices"),
  setOutputDevice: (deviceIndex: number) =>
    ipcRenderer.invoke("audio:set-device", deviceIndex),
  getEngineStatus: () => ipcRenderer.invoke("audio:get-status"),

  // ── File loading ──────────────────────────────────
  loadFile: (channelId: number, filePath?: string) =>
    ipcRenderer.invoke("audio:load-file", channelId, filePath),
  openFileDialog: () => ipcRenderer.invoke("audio:open-file-dialog"),
  unloadFile: (channelId: number) =>
    ipcRenderer.invoke("audio:unload-file", channelId),

  // ── Transport ─────────────────────────────────────
  play: () => ipcRenderer.invoke("audio:play"),
  pause: () => ipcRenderer.invoke("audio:pause"),
  stop: () => ipcRenderer.invoke("audio:stop"),
  seek: (timeSeconds: number) =>
    ipcRenderer.invoke("audio:seek", timeSeconds),

  // ── Channel control (fire-and-forget) ─────────────
  setVolume: (channelId: number, volume: number) =>
    ipcRenderer.send("audio:set-volume", channelId, volume),
  setPan: (channelId: number, pan: number) =>
    ipcRenderer.send("audio:set-pan", channelId, pan),
  setMute: (channelId: number, muted: boolean) =>
    ipcRenderer.send("audio:set-mute", channelId, muted),
  setSolo: (channelId: number, solo: boolean) =>
    ipcRenderer.send("audio:set-solo", channelId, solo),

  // ── Master ────────────────────────────────────────
  setMasterVolume: (volume: number) =>
    ipcRenderer.send("audio:set-master-volume", volume),

  // ── Events from main process ──────────────────────
  onMeterData: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on("audio:meters", handler)
    return () => { ipcRenderer.removeListener("audio:meters", handler) }
  },
  onTimeUpdate: (callback: (time: number) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, time: number) => callback(time)
    ipcRenderer.on("audio:time", handler)
    return () => { ipcRenderer.removeListener("audio:time", handler) }
  },
  onTransportState: (callback: (state: { isPlaying: boolean; isPaused: boolean }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: { isPlaying: boolean; isPaused: boolean }) => callback(state)
    ipcRenderer.on("audio:transport-state", handler)
    return () => { ipcRenderer.removeListener("audio:transport-state", handler) }
  },
  onEngineError: (callback: (error: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error: string) => callback(error)
    ipcRenderer.on("audio:error", handler)
    return () => { ipcRenderer.removeListener("audio:error", handler) }
  },
})
