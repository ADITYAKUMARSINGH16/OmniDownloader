"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, Download, Layers, BarChart3, Globe, Settings, Info, Boxes, Sparkles, ArrowRight, CornerDownLeft, Palette, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { OMNI_THEMES, applyTheme, OmniTheme } from "./ThemeSwitcher"

interface CommandAction {
  id: string
  title: string
  category: "Navigation" | "Quick Action" | "Theme"
  icon: any
  href?: string
  action?: () => void
  keywords?: string[]
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (open) {
      setQuery("")
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const isUrl = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q.startsWith("http://") || q.startsWith("https://") || q.startsWith("magnet:?")
  }, [query])

  const staticActions: CommandAction[] = useMemo(() => [
    {
      id: "nav-overview",
      title: "Overview & 3D Acceleration Core",
      category: "Navigation",
      icon: Boxes,
      href: "/",
      keywords: ["overview", "home", "landing", "3d", "showcase", "engine"],
    },
    {
      id: "nav-console",
      title: "Downloader Workspace Console",
      category: "Navigation",
      icon: Download,
      href: "/?view=console",
      keywords: ["download", "console", "url", "analyze", "media", "workspace"],
    },
    {
      id: "nav-queue",
      title: "Active Downloads Queue",
      category: "Navigation",
      icon: Layers,
      href: "/queue",
      keywords: ["queue", "active", "telemetry", "progress", "buffer"],
    },
    {
      id: "nav-history",
      title: "Download History & Exports",
      category: "Navigation",
      icon: BarChart3,
      href: "/history",
      keywords: ["history", "past", "records", "csv", "json"],
    },
    {
      id: "nav-dashboard",
      title: "Analytics & Bandwidth Dashboard",
      category: "Navigation",
      icon: BarChart3,
      href: "/dashboard",
      keywords: ["analytics", "stats", "charts", "bandwidth", "data"],
    },
    {
      id: "nav-sites",
      title: "Supported Sites (1,000+ Platforms)",
      category: "Navigation",
      icon: Globe,
      href: "/sites",
      keywords: ["sites", "extractors", "youtube", "reddit", "instagram", "twitter", "terabox"],
    },
    {
      id: "nav-settings",
      title: "Settings & Cookie Sync",
      category: "Navigation",
      icon: Settings,
      href: "/settings",
      keywords: ["settings", "preferences", "cookies", "api key", "aria2"],
    },
    {
      id: "nav-about",
      title: "Architecture & System Specs",
      category: "Navigation",
      icon: Info,
      href: "/about",
      keywords: ["about", "specs", "license", "version", "architecture"],
    },
    ...OMNI_THEMES.map((t) => ({
      id: `theme-${t.id}`,
      title: `Theme: ${t.name} (${t.tag})`,
      category: "Theme" as const,
      icon: Palette,
      action: () => applyTheme(t.id),
      keywords: ["theme", "color", "palette", t.id, t.name.toLowerCase(), t.tag.toLowerCase()],
    })),
  ], [])

  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return staticActions
    return staticActions.filter((action) => {
      if (action.title.toLowerCase().includes(q)) return true
      if (action.keywords?.some((k) => k.includes(q))) return true
      return false
    })
  }, [query, staticActions])

  const executeAction = (action: CommandAction) => {
    onOpenChange(false)
    if (action.action) {
      action.action()
    } else if (action.href) {
      router.push(action.href)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      const total = isUrl ? filteredActions.length + 1 : filteredActions.length
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, total))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      const total = isUrl ? filteredActions.length + 1 : filteredActions.length
      setSelectedIndex((prev) => (prev - 1 + total) % Math.max(1, total))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (isUrl && selectedIndex === 0) {
        onOpenChange(false)
        router.push(`/?view=console&url=${encodeURIComponent(query.trim())}`)
      } else {
        const actionIdx = isUrl ? selectedIndex - 1 : selectedIndex
        if (filteredActions[actionIdx]) {
          executeAction(filteredActions[actionIdx])
        }
      }
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="fixed inset-0" onClick={() => onOpenChange(false)} />

      <div className="relative w-full max-w-xl rounded-2xl omni-glass-card shadow-2xl overflow-hidden animate-spring-up flex flex-col z-10 border border-border/60">
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 border-b border-border/40 bg-elevated/50">
          <Search className="w-5 h-5 text-accent-primary shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a URL to analyze, or search destinations..."
            className="w-full py-4 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-medium"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground bg-surface/80 px-2 py-0.5 rounded border border-border/40">
              <span>ESC</span>
            </div>
          )}
        </div>

        {/* Quick URL Action pill if URL detected */}
        {isUrl && (
          <div className="p-3 border-b border-border/40 bg-accent-primary/10">
            <button
              type="button"
              onClick={() => {
                onOpenChange(false)
                router.push(`/?view=console&url=${encodeURIComponent(query.trim())}`)
              }}
              className={cn(
                "w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all duration-150",
                selectedIndex === 0
                  ? "bg-accent-primary text-white shadow-md shadow-accent-primary/25"
                  : "bg-surface/80 text-foreground hover:bg-surface border border-accent-primary/30"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Download className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                    <span>ANALYZE & DOWNLOAD URL</span>
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-black/20 font-mono">Instant</span>
                  </div>
                  <div className="text-[11px] opacity-80 truncate max-w-sm mt-0.5">{query.trim()}</div>
                </div>
              </div>
              <CornerDownLeft className="w-4 h-4 shrink-0 opacity-70" />
            </button>
          </div>
        )}

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredActions.length === 0 && !isUrl ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No matching destinations. Paste a URL or try &quot;queue&quot;, &quot;settings&quot;, or &quot;3d&quot;.
            </div>
          ) : (
            filteredActions.map((action, idx) => {
              const actualIdx = isUrl ? idx + 1 : idx
              const isSelected = selectedIndex === actualIdx
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => executeAction(action)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all duration-150",
                    isSelected
                      ? "bg-accent-primary/15 text-foreground border border-accent-primary/35"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
                        isSelected
                          ? "bg-accent-primary/20 text-accent-primary border-accent-primary/40"
                          : "bg-elevated text-muted-foreground border-border/30"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <div className="text-foreground font-semibold">{action.title}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{action.category}</div>
                    </div>
                  </div>
                  {isSelected && <ArrowRight className="w-4 h-4 text-accent-primary shrink-0" />}
                </button>
              )
            })
          )}
        </div>

        {/* Bottom Bar with Theme Quick Selector */}
        <div className="p-3 border-t border-border/40 bg-elevated/40 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground font-medium">Palette:</span>
            <div className="flex items-center gap-1 ml-1">
              {OMNI_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => applyTheme(theme.id)}
                  title={theme.name}
                  className="w-4 h-4 rounded-full border border-foreground/20 hover:scale-125 transition-transform shadow-xs"
                  style={{
                    background: `linear-gradient(135deg, ${theme.primaryHex}, ${theme.secondaryHex})`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
        </div>
      </div>
    </div>
  )
}
