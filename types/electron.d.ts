/* ──────────────────────────────────────────────────────
   Type declarations shared between main + renderer
   ────────────────────────────────────────────────────── */

export interface AudioDevice {
  index: number
  name: string
  hostApi: string // "WASAPI" | "ASIO" | "WDM-KS" …
  maxOutputChannels: number
  defaultSampleRate: number
  isDefault: boolean
}

export interface FileInfo {
  path: string
  name: string
  sampleRate: number
  channels: number
  durationSeconds: number
  frames: number
}

export interface MeterData {
  channels: Array<{ id: number; rmsL: number; rmsR: number; peakL: number; peakR: number }>
  master: { rmsL: number; rmsR: number; peakL: number; peakR: number }
}

export interface EngineStatus {
  sampleRate: number
  bufferSize: number
  outputDevice: string
  hostApi: string
  cpuLoad: number
}

export interface ElectronAPI {
  // Device management
  getDevices(): Promise<AudioDevice[]>
  setOutputDevice(deviceIndex: number): Promise<void>
  getEngineStatus(): Promise<EngineStatus>

  // File loading
  loadFile(channelId: number, filePath?: string): Promise<FileInfo | null>
  openFileDialog(): Promise<string | null>
  unloadFile(channelId: number): Promise<void>

  // Transport
  play(): Promise<void>
  pause(): Promise<void>
  stop(): Promise<void>
  seek(timeSeconds: number): Promise<void>

  // Channel control
  setVolume(channelId: number, volume: number): void
  setPan(channelId: number, pan: number): void
  setMute(channelId: number, muted: boolean): void
  setSolo(channelId: number, solo: boolean): void

  // Master
  setMasterVolume(volume: number): void

  // Events from main process
  onMeterData(callback: (data: MeterData) => void): () => void
  onTimeUpdate(callback: (time: number) => void): () => void
  onTransportState(callback: (state: { isPlaying: boolean; isPaused: boolean }) => void): () => void
  onEngineError(callback: (error: string) => void): () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
