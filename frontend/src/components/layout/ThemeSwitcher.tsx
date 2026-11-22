"use client"

import { useState, useEffect } from "react"
import { Palette, Check, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export type OmniTheme = "solaris" | "nordic" | "cashmere" | "boreal" | "matrix" | "crimson" | "daylight"
export type ColorTheme = OmniTheme

export interface ThemeOption {
  id: OmniTheme
  name: string
  tag: string
  primaryHex: string
  secondaryHex: string
  velocityHex: string
  bgHex: string
}

export const OMNI_THEMES: ThemeOption[] = [
  {
    id: "solaris",
    name: "Solaris Carbon",
    tag: "OLED Warm",
    primaryHex: "#FF5E1A",
    secondaryHex: "#FF2E63",
    velocityHex: "#00F5A0",
    bgHex: "#09090B",
  },
  {
    id: "nordic",
    name: "Nordic Slate",
    tag: "Deep Oceanic",
    primaryHex: "#9BA8AB",
    secondaryHex: "#CCD0CF",
    velocityHex: "#6EC8D7",
    bgHex: "#06141B",
  },
  {
    id: "cashmere",
    name: "Cashmere Dusk",
    tag: "Velvet Plum",
    primaryHex: "#C7A9A3",
    secondaryHex: "#E8D2C4",
    velocityHex: "#F7EFE7",
    bgHex: "#3E3239",
  },
  {
    id: "boreal",
    name: "Boreal Jade",
    tag: "Pine Emerald",
    primaryHex: "#8EB69B",
    secondaryHex: "#DAF1DE",
    velocityHex: "#52E7B0",
    bgHex: "#051F20",
  },
  {
    id: "matrix",
    name: "Acid Matrix",
    tag: "Cyber",
    primaryHex: "#00FF87",
    secondaryHex: "#A3E635",
    velocityHex: "#06B6D4",
    bgHex: "#050806",
  },
  {
    id: "crimson",
    name: "Crimson Overdrive",
    tag: "Plasma",
    primaryHex: "#F43F5E",
    secondaryHex: "#FB923C",
    velocityHex: "#38BDF8",
    bgHex: "#0B0608",
  },
  {
    id: "daylight",
    name: "Titanium Daylight",
    tag: "Frosted Light",
    primaryHex: "#0A84FF",
    secondaryHex: "#5E5CE6",
    velocityHex: "#059669",
    bgHex: "#F4F5F7",
  },
]

export const THEMES = OMNI_THEMES

export function applyTheme(themeId: OmniTheme) {
  if (typeof document === "undefined") return
  document.documentElement.setAttribute("data-theme", themeId)
  if (themeId === "daylight") {
    document.documentElement.classList.remove("dark")
  } else {
    document.documentElement.classList.add("dark")
  }
  try {
    localStorage.setItem("omni-color-theme", themeId)
    window.dispatchEvent(new CustomEvent("omni-theme-change", { detail: themeId }))
  } catch (e) {
    // localStorage may be disabled
  }
}

export function useOmniTheme(): OmniTheme {
  const [theme, setTheme] = useState<OmniTheme>("solaris")
  useEffect(() => {
    const update = () => {
      if (typeof document === "undefined") return
      const raw = document.documentElement.getAttribute("data-theme") as OmniTheme
      const valid = OMNI_THEMES.some((t) => t.id === raw) ? raw : "solaris"
      if (raw && !OMNI_THEMES.some((t) => t.id === raw)) {
        document.documentElement.setAttribute("data-theme", "solaris")
      }
      setTheme(valid)
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] })
    return () => observer.disconnect()
  }, [])
  return theme
}

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const currentTheme = useOmniTheme()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem("omni-color-theme") as OmniTheme
      if (saved && OMNI_THEMES.some((t) => t.id === saved)) {
        applyTheme(saved)
      } else {
        applyTheme("solaris")
      }
    } catch {
      applyTheme("solaris")
    }
  }, [])

  const handleSelect = (themeId: OmniTheme) => {
    applyTheme(themeId)
    setOpen(false)
  }

  const activeThemeMeta = OMNI_THEMES.find((t) => t.id === currentTheme) || OMNI_THEMES[0]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-white/[0.12] text-white/80 hover:text-white transition-all duration-150 text-xs font-semibold cursor-pointer",
          open && "bg-white/[0.18] text-white"
        )}
        title="Switch Color Palette"
      >
        <div
          className="w-3 h-3 rounded-full border border-white/60 shadow-sm shrink-0"
          style={{
            background: `linear-gradient(135deg, ${activeThemeMeta.primaryHex}, ${activeThemeMeta.secondaryHex})`,
            boxShadow: `0 0 8px ${activeThemeMeta.primaryHex}66`,
          }}
        />
        {!compact && (
          <span className="text-xs font-semibold tracking-wide text-white/90 hidden sm:inline-block">
            {activeThemeMeta.name.split(" ")[0]}
          </span>
        )}
        <Palette className="w-3 h-3 text-white/60 shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 p-2 rounded-2xl omni-glass-card shadow-2xl z-50 animate-spring-up border border-border/50">
            <div className="px-2 py-1.5 mb-1 flex items-center justify-between border-b border-white/20">
              <span className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground font-bold">
                Hardware Themes
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-accent-primary/20 text-accent-primary font-bold border border-accent-primary/30">
                Instant
              </span>
            </div>

            <div className="space-y-1">
              {OMNI_THEMES.map((theme) => {
                const isActive = theme.id === currentTheme
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleSelect(theme.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs font-medium transition-all duration-150 cursor-pointer",
                      isActive
                        ? "bg-accent-primary text-white font-bold shadow-md shadow-accent-primary/30 border border-white/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/[0.12]"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-4 h-4 rounded-full border border-white/40 shrink-0 shadow-xs"
                        style={{
                          background: `linear-gradient(135deg, ${theme.primaryHex}, ${theme.secondaryHex})`,
                        }}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-xs leading-none truncate">{theme.name}</div>
                        <div className="text-[10px] opacity-80 mt-0.5 font-mono">{theme.tag}</div>
                      </div>
                    </div>
                    {isActive && <Check className="w-3.5 h-3.5 text-white shrink-0 stroke-[2.5]" />}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
