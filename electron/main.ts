/* ──────────────────────────────────────────────────────
   Electron Main Process  --  Stage Traxx
   ────────────────────────────────────────────────────── */

import { app, BrowserWindow, Menu, ipcMain, dialog, nativeTheme } from "electron"
import * as path from "path"
import { registerIpcHandlers } from "./ipc-handlers"

// Determine if we are in development
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged

let mainWindow: BrowserWindow | null = null

function createWindow() {
  // Force dark mode for the native window chrome
  nativeTheme.themeSource = "dark"

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: "Stage Traxx",
    backgroundColor: "#111111",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // required for native addon access via preload
    },
  })

  // Application menu
  const menu = Menu.buildFromTemplate([
    {
      label: "Stage Traxx",
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Файл",
      submenu: [
        {
          label: "Открыть проект...",
          accelerator: "CmdOrCtrl+O",
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow!, {
              properties: ["openFile"],
              filters: [{ name: "Stage Traxx Project", extensions: ["stx", "json"] }],
            })
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow?.webContents.send("project:open", result.filePaths[0])
            }
          },
        },
        {
          label: "Сохранить проект",
          accelerator: "CmdOrCtrl+S",
          click: () => { mainWindow?.webContents.send("project:save") },
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Вид",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
  ])
  Menu.setApplicationMenu(menu)

  // Register all IPC handlers (audio engine + file dialogs)
  registerIpcHandlers(mainWindow)

  // Load the renderer
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000")
    mainWindow.webContents.openDevTools({ mode: "detach" })
  } else {
    mainWindow.loadFile(path.join(__dirname, "../out/index.html"))
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show()
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

// ── App lifecycle ────────────────────────────────────

app.whenReady().then(createWindow)

app.on("window-all-closed", () => {
  app.quit()
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
