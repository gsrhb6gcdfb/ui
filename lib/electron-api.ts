/* ──────────────────────────────────────────────────────
   Electron API  --  Safe accessor for window.electronAPI
   Works both in Electron and in browser (fallback mode)
   ────────────────────────────────────────────────────── */

import type { ElectronAPI } from "@/types/electron"

/**
 * Returns true if running inside Electron with the preload bridge available.
 */
export function isElectron(): boolean {
  return typeof window !== "undefined" && !!window.electronAPI
}

/**
 * Get the Electron API. Returns undefined when running in a browser.
 */
export function getElectronAPI(): ElectronAPI | undefined {
  if (typeof window !== "undefined") return window.electronAPI
  return undefined
}
