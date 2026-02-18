/**
 * Stage Traxx -- Native Dependencies Setup Script
 * 
 * Downloads the required header-only libraries (dr_wav, dr_mp3) and
 * provides instructions for PortAudio + ASIO SDK setup on Windows.
 * 
 * Run: node scripts/setup-native-deps.js
 */

import { existsSync, mkdirSync, writeFileSync } from "fs"
import { join } from "path"

const DEPS_DIR = join(process.cwd(), "native", "deps")
const PA_DIR = join(DEPS_DIR, "portaudio")

const DR_LIBS_BASE = "https://raw.githubusercontent.com/mackron/dr_libs/master"

async function downloadFile(url, destPath) {
  console.log(`  Downloading: ${url}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${url}`)
  const text = await res.text()
  writeFileSync(destPath, text, "utf-8")
  console.log(`  Saved: ${destPath}`)
}

async function main() {
  console.log("=== Stage Traxx Native Dependencies Setup ===\n")

  // 1. Create directories
  for (const dir of [DEPS_DIR, PA_DIR, join(PA_DIR, "include"), join(PA_DIR, "lib"), join(PA_DIR, "bin")]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
      console.log(`Created: ${dir}`)
    }
  }

  // 2. Download dr_libs headers
  console.log("\n--- dr_libs (header-only audio decoders) ---")
  await downloadFile(`${DR_LIBS_BASE}/dr_wav.h`, join(DEPS_DIR, "dr_wav.h"))
  await downloadFile(`${DR_LIBS_BASE}/dr_mp3.h`, join(DEPS_DIR, "dr_mp3.h"))

  // 3. PortAudio instructions
  console.log("\n--- PortAudio + ASIO Setup ---")
  console.log("PortAudio must be built manually with ASIO support.")
  console.log("")
  console.log("Quick steps for Windows:")
  console.log("  1. Download PortAudio source: http://www.portaudio.com/download.html")
  console.log("  2. Download ASIO SDK from Steinberg: https://www.steinberg.net/developers/")
  console.log("  3. Build PortAudio with CMake:")
  console.log("     cd portaudio")
  console.log("     mkdir build && cd build")
  console.log("     cmake .. -DPA_USE_ASIO=ON -DASIOSDK_ROOT=<path-to-asio-sdk>")
  console.log("     cmake --build . --config Release")
  console.log("  4. Copy build outputs to native/deps/portaudio/:")
  console.log(`     - include/portaudio.h  -> ${join(PA_DIR, "include", "portaudio.h")}`)
  console.log(`     - lib/portaudio_x64.lib -> ${join(PA_DIR, "lib", "portaudio_x64.lib")}`)
  console.log(`     - bin/portaudio_x64.dll -> ${join(PA_DIR, "bin", "portaudio_x64.dll")}`)
  console.log("")
  console.log("  5. Install node-addon-api: npm install node-addon-api")
  console.log("  6. Build native addon: cd native && node-gyp rebuild")

  // Create a placeholder portaudio.h so the project structure is clear
  const paHeaderPath = join(PA_DIR, "include", "portaudio.h")
  if (!existsSync(paHeaderPath)) {
    writeFileSync(paHeaderPath, `/* PortAudio placeholder -- replace with real portaudio.h */\n#pragma once\n`, "utf-8")
    console.log(`\nCreated placeholder: ${paHeaderPath}`)
  }

  console.log("\n=== Setup complete ===")
  console.log("Next: follow the PortAudio instructions above, then run:")
  console.log("  cd native && node-gyp rebuild")
  console.log("  npm run dev:electron")
}

main().catch((err) => {
  console.error("Setup failed:", err)
  process.exit(1)
})
