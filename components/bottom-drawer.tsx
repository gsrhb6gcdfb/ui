"use client"

import { useState, useCallback } from "react"
import {
  Settings,
  History,
  Music2,
  ChevronUp,
  ChevronDown,
  Volume2,
  Monitor,
  Wifi,
  Save,
  FolderOpen,
  PlayCircle,
  Clock,
  Trash2,
  GripVertical,
  CheckCircle2,
  Circle,
  MoreHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"

// --- Types ---

interface Song {
  id: number
  title: string
  artist: string
  duration: string
  tracks: number
  isActive?: boolean
}

interface HistoryEntry {
  id: number
  title: string
  artist: string
  playedAt: string
  duration: string
}

// --- Demo data ---

const DEMO_SONGS: Song[] = [
  { id: 1, title: "Amazing Grace", artist: "\u041f\u0440\u043e\u0435\u043a\u0442 1", duration: "5:12", tracks: 8, isActive: true },
  { id: 2, title: "How Great Is Our God", artist: "\u041f\u0440\u043e\u0435\u043a\u0442 1", duration: "6:04", tracks: 6 },
  { id: 3, title: "10,000 Reasons", artist: "\u041f\u0440\u043e\u0435\u043a\u0442 2", duration: "5:42", tracks: 8 },
  { id: 4, title: "What A Beautiful Name", artist: "\u041f\u0440\u043e\u0435\u043a\u0442 2", duration: "5:30", tracks: 7 },
  { id: 5, title: "Goodness of God", artist: "\u041f\u0440\u043e\u0435\u043a\u0442 3", duration: "4:58", tracks: 8 },
  { id: 6, title: "Build My Life", artist: "\u041f\u0440\u043e\u0435\u043a\u0442 3", duration: "5:20", tracks: 5 },
  { id: 7, title: "Great Are You Lord", artist: "\u041f\u0440\u043e\u0435\u043a\u0442 3", duration: "6:15", tracks: 8 },
]

const DEMO_HISTORY: HistoryEntry[] = [
  { id: 1, title: "Amazing Grace", artist: "\u041f\u0440\u043e\u0435\u043a\u0442 1", playedAt: "\u0421\u0435\u0433\u043e\u0434\u043d\u044f, 19:45", duration: "5:12" },
  { id: 2, title: "How Great Is Our God", artist: "\u041f\u0440\u043e\u0435\u043a\u0442 1", playedAt: "\u0421\u0435\u0433\u043e\u0434\u043d\u044f, 19:38", duration: "6:04" },
  { id: 3, title: "Build My Life", artist: "\u041f\u0440\u043e\u0435\u043a\u0442 3", playedAt: "\u0412\u0447\u0435\u0440\u0430, 20:10", duration: "5:20" },
  { id: 4, title: "10,000 Reasons", artist: "\u041f\u0440\u043e\u0435\u043a\u0442 2", playedAt: "\u0412\u0447\u0435\u0440\u0430, 20:02", duration: "5:42" },
  { id: 5, title: "What A Beautiful Name", artist: "\u041f\u0440\u043e\u0435\u043a\u0442 2", playedAt: "15.02.2026, 18:30", duration: "5:30" },
]

type Tab = "songs" | "history" | "settings"

// --- Settings Panel ---

function SettingsPanel() {
  const [outputDevice, setOutputDevice] = useState("\u0412\u0441\u0442\u0440\u043e\u0435\u043d\u043d\u044b\u0439 \u0432\u044b\u0445\u043e\u0434")
  const [clickDevice, setClickDevice] = useState("\u0422\u043e\u0442 \u0436\u0435")
  const [autoplay, setAutoplay] = useState(false)
  const [fadeTime, setFadeTime] = useState(2)

  return (
    <div className="flex h-full flex-col gap-0 overflow-y-auto">
      {/* Audio output */}
      <div className="border-b border-border px-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <Volume2 className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {"\u0410\u0443\u0434\u0438\u043e \u0432\u044b\u0445\u043e\u0434"}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">{"\u041e\u0441\u043d\u043e\u0432\u043d\u043e\u0439 \u0432\u044b\u0445\u043e\u0434"}</span>
            <select
              value={outputDevice}
              onChange={(e) => setOutputDevice(e.target.value)}
              className="rounded border border-border bg-secondary px-2 py-1 text-xs text-foreground outline-none"
            >
              <option>{"\u0412\u0441\u0442\u0440\u043e\u0435\u043d\u043d\u044b\u0439 \u0432\u044b\u0445\u043e\u0434"}</option>
              <option>{"HDMI"}</option>
              <option>{"USB Audio"}</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">{"\u041a\u043b\u0438\u043a / \u041c\u043e\u043d\u0438\u0442\u043e\u0440"}</span>
            <select
              value={clickDevice}
              onChange={(e) => setClickDevice(e.target.value)}
              className="rounded border border-border bg-secondary px-2 py-1 text-xs text-foreground outline-none"
            >
              <option>{"\u0422\u043e\u0442 \u0436\u0435"}</option>
              <option>{"USB Audio"}</option>
              <option>{"Bluetooth"}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Playback */}
      <div className="border-b border-border px-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <Monitor className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {"\u0412\u043e\u0441\u043f\u0440\u043e\u0438\u0437\u0432\u0435\u0434\u0435\u043d\u0438\u0435"}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-sm text-foreground">{"\u0410\u0432\u0442\u043e\u0432\u043e\u0441\u043f\u0440\u043e\u0438\u0437\u0432\u0435\u0434\u0435\u043d\u0438\u0435 \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0435\u0433\u043e"}</span>
            <button
              onClick={() => setAutoplay(!autoplay)}
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors",
                autoplay ? "bg-foreground" : "bg-muted"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 size-4 rounded-full transition-all",
                  autoplay ? "left-[18px] bg-background" : "left-0.5 bg-muted-foreground"
                )}
              />
            </button>
          </label>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">{"\u0424\u0435\u0439\u0434 (\u0441\u0435\u043a.)"}</span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={10}
                value={fadeTime}
                onChange={(e) => setFadeTime(Number(e.target.value))}
                className="h-3 w-20"
              />
              <span className="w-5 text-right font-mono text-xs text-foreground">{fadeTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Network / MIDI */}
      <div className="border-b border-border px-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <Wifi className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {"\u0421\u0435\u0442\u044c / MIDI"}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">{"MIDI \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435"}</span>
            <span className="text-xs text-muted-foreground">{"\u041e\u0442\u043a\u043b\u044e\u0447\u0435\u043d\u043e"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">{"OSC"}</span>
            <span className="text-xs text-muted-foreground">{"\u041e\u0442\u043a\u043b\u044e\u0447\u0435\u043d\u043e"}</span>
          </div>
        </div>
      </div>

      {/* File */}
      <div className="px-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <Save className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {"\u0424\u0430\u0439\u043b\u044b"}
          </span>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent">
            <FolderOpen className="size-3.5" />
            {"\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043f\u0440\u043e\u0435\u043a\u0442"}
          </button>
          <button className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent">
            <Save className="size-3.5" />
            {"\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c"}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Songs Panel ---

function SongsPanel({ onSelectSong }: { onSelectSong: (song: Song) => void }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {DEMO_SONGS.map((song) => (
        <button
          key={song.id}
          onClick={() => onSelectSong(song)}
          className={cn(
            "group flex items-center gap-3 border-b border-border px-4 py-2.5 text-left transition-colors hover:bg-accent/40",
            song.isActive && "bg-accent/30"
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center">
            {song.isActive ? (
              <CheckCircle2 className="size-5 text-foreground" />
            ) : (
              <Circle className="size-5 text-muted-foreground/40" />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className={cn(
              "truncate text-sm",
              song.isActive ? "font-semibold text-foreground" : "text-foreground"
            )}>
              {song.title}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {song.artist}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground">
              {song.tracks} {"\u0442\u0440."}
            </span>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">{song.duration}</span>
            <GripVertical className="size-4 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </button>
      ))}
    </div>
  )
}

// --- History Panel ---

function HistoryPanel() {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {DEMO_HISTORY.map((entry) => (
        <div
          key={entry.id}
          className="group flex items-center gap-3 border-b border-border px-4 py-2.5"
        >
          <div className="flex size-8 shrink-0 items-center justify-center">
            <PlayCircle className="size-5 text-muted-foreground/50" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm text-foreground">{entry.title}</span>
            <span className="truncate text-xs text-muted-foreground">{entry.artist}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="size-3" />
              <span className="text-[10px]">{entry.playedAt}</span>
            </div>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">{entry.duration}</span>
            <button className="opacity-0 transition-opacity group-hover:opacity-100">
              <Trash2 className="size-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        </div>
      ))}
      {DEMO_HISTORY.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8">
          <History className="size-8 text-muted-foreground/30" />
          <span className="text-sm text-muted-foreground">{"\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u043f\u0443\u0441\u0442\u0430"}</span>
        </div>
      )}
    </div>
  )
}

// --- Main Drawer ---

interface BottomDrawerProps {
  onSelectSong?: (song: Song) => void
}

export function BottomDrawer({ onSelectSong }: BottomDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("songs")
  const [isPinned, setIsPinned] = useState(false)

  const handleTabClick = useCallback((tab: Tab) => {
    if (activeTab === tab && isOpen) {
      setIsOpen(false)
      setIsPinned(false)
    } else {
      setActiveTab(tab)
      setIsOpen(true)
      setIsPinned(true)
    }
  }, [activeTab, isOpen])

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "songs", label: "\u041f\u0435\u0441\u043d\u0438", icon: <Music2 className="size-4" /> },
    { id: "history", label: "\u0418\u0441\u0442\u043e\u0440\u0438\u044f", icon: <History className="size-4" /> },
    { id: "settings", label: "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438", icon: <Settings className="size-4" /> },
  ]

  return (
    <div
      className="group/drawer relative flex flex-col"
      onMouseEnter={() => { if (!isPinned) setIsOpen(true) }}
      onMouseLeave={() => { if (!isPinned) setIsOpen(false) }}
    >
      {/* Slide-up panel */}
      <div
        className={cn(
          "overflow-hidden border-t border-border bg-card transition-all duration-300 ease-in-out",
          isOpen ? "h-[280px]" : "h-0"
        )}
      >
        {/* Panel header */}
        <div className="flex h-8 items-center justify-between border-b border-border px-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {tabs.find(t => t.id === activeTab)?.label}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setIsPinned(!isPinned) }}
              className={cn(
                "flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground",
                isPinned && "bg-accent text-foreground"
              )}
              title={isPinned ? "\u041e\u0442\u043a\u0440\u0435\u043f\u0438\u0442\u044c" : "\u0417\u0430\u043a\u0440\u0435\u043f\u0438\u0442\u044c"}
            >
              {isPinned ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
            </button>
            <button
              onClick={() => { setIsOpen(false); setIsPinned(false) }}
              className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          </div>
        </div>
        {/* Panel content */}
        <div className="h-[calc(280px-32px)]">
          {activeTab === "songs" && <SongsPanel onSelectSong={onSelectSong || (() => {})} />}
          {activeTab === "history" && <HistoryPanel />}
          {activeTab === "settings" && <SettingsPanel />}
        </div>
      </div>

      {/* Tab bar - always visible */}
      <div className="flex h-10 items-stretch border-t border-border bg-secondary">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 text-xs transition-colors",
              activeTab === tab.id && isOpen
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
