"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Download, Globe, Settings, Info, Menu, X, Zap, Layers, BarChart3, Boxes, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { BrowserExtensionModal } from "@/components/layout/BrowserExtensionModal"
import { ThemeSwitcher, useOmniTheme, OMNI_THEMES } from "@/components/layout/ThemeSwitcher"
import { CommandPalette } from "@/components/layout/CommandPalette"

interface NavItem {
  id: string
  name: string
  href: string
  icon: any
}

const navigation: NavItem[] = [
  { id: "overview", name: "Overview", href: "/", icon: Boxes },
  { id: "downloader", name: "Downloader", href: "/?view=console", icon: Download },
  { id: "queue", name: "Queue", href: "/queue", icon: Layers },
  { id: "dashboard", name: "Analytics", href: "/dashboard", icon: BarChart3 },
  { id: "sites", name: "Sites", href: "/sites", icon: Globe },
  { id: "settings", name: "Settings", href: "/settings", icon: Settings },
  { id: "about", name: "About", href: "/about", icon: Info },
]

export function AppShell({
  children,
  activeTab,
}: {
  children: React.ReactNode
  activeTab?: string
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [currentViewParam, setCurrentViewParam] = useState<string | null>(null)
  const currentTheme = useOmniTheme()
  const activeThemeMeta = OMNI_THEMES.find((t) => t.id === currentTheme) || OMNI_THEMES[0]

  useEffect(() => {
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search)
      setCurrentViewParam(search.get("view"))
    }
  }, [pathname])

  const isItemActive = (item: NavItem) => {
    if (activeTab) {
      return item.id === activeTab
    }
    if (pathname === "/landing") {
      return item.id === "overview"
    }
    if (pathname === "/") {
      if (currentViewParam === "console") {
        return item.id === "downloader"
      }
      return item.id === "overview"
    }
    const itemPath = item.href.split("?")[0]
    return pathname === item.href || (itemPath !== "/" && pathname.startsWith(itemPath))
  }

  // Listen for Ctrl+K / Cmd+K global hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setCommandOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative selection:bg-accent-primary/30 selection:text-foreground">
      {/* Ambient background glow mesh */}
      <div className="fixed inset-0 pointer-events-none bg-ambient-aurora z-0 opacity-80" />
      <div className="fixed inset-0 pointer-events-none bg-noise z-0" />

      {/* Top Luxury HUD Header */}
      <header className="sticky top-0 z-40 header-hud transition-colors duration-300">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo & Telemetry Indicator */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="relative h-8 w-8 rounded-xl gradient-primary flex items-center justify-center shadow-[0_0_16px_rgb(var(--accent-primary)/0.5)] group-hover:shadow-[0_0_24px_rgb(var(--accent-primary)/0.8)] transition-all duration-300 border border-white/20">
              <Zap className="h-4 w-4 text-white drop-shadow-sm" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-wider text-white font-heading uppercase drop-shadow-sm">
                Omni<span className="text-accent-primary">Download</span>
              </span>
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-velocity/10 border border-accent-velocity/25 text-[10px] font-mono font-bold text-accent-velocity tracking-wider uppercase shadow-[0_0_10px_rgb(var(--accent-velocity)/0.15)]">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-velocity shadow-[0_0_8px_rgb(var(--accent-velocity))] inline-block animate-pulse" />
                <span>{activeThemeMeta.tag}</span>
              </div>
            </div>
          </Link>

          {/* Desktop Nav Switcher */}
          <div className="hidden lg:flex items-center gap-3">
            <nav className="flex items-center gap-1 nav-capsule-pill p-1 rounded-full">
              {navigation.map((item) => {
                const isActive = isItemActive(item)
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer select-none",
                      isActive
                        ? "bg-accent-primary text-white active-tab-specular font-bold border border-white/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/[0.08] font-semibold"
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-white" : "text-muted-foreground")} />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Unified Utility Toolbar */}
            <div className="flex items-center gap-1 p-1 rounded-full nav-capsule-pill">
              {/* Quick Command Trigger Button */}
              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-all duration-150 cursor-pointer"
                title="Open Command Palette (Ctrl+K)"
              >
                <Search className="w-3.5 h-3.5 text-accent-primary shrink-0" />
                <span className="hidden xl:inline text-foreground/90">Command</span>
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border/60 text-muted-foreground font-bold tracking-tight">
                  ⌘K
                </kbd>
              </button>

              <div className="w-px h-3.5 bg-border/60 shrink-0" />

              {/* Live Palette Switcher */}
              <ThemeSwitcher />

              <div className="w-px h-3.5 bg-border/60 shrink-0" />

              {/* Browser Extension Modal */}
              <BrowserExtensionModal
                triggerVariant="ghost"
                triggerClassName="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-accent-primary to-accent-secondary hover:brightness-110 shadow-md shadow-accent-primary/30 border border-white/20 transition-all duration-150 h-auto cursor-pointer"
              />
            </div>
          </div>

          {/* Medium Desktop Compact Nav */}
          <div className="hidden md:flex lg:hidden items-center gap-2">
            <nav className="flex items-center gap-1 nav-capsule-pill p-1 rounded-full">
              {navigation.slice(0, 4).map((item) => {
                const isActive = isItemActive(item)
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0",
                      isActive
                        ? "bg-accent-primary text-white active-tab-specular font-bold border border-white/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/[0.08]"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>
            <div className="flex items-center gap-1 p-1 rounded-full nav-capsule-pill">
              <ThemeSwitcher compact />
              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/[0.08]"
                title="Command Palette"
              >
                <Search className="w-3.5 h-3.5 text-accent-primary" />
              </button>
              <BrowserExtensionModal
                triggerVariant="ghost"
                triggerClassName="p-1.5 rounded-full text-muted-foreground hover:bg-white/[0.08] h-auto"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground hover:bg-white/[0.08] rounded-full h-8 w-8"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>

          {/* Mobile Menu & Theme Toggle */}
          <div className="flex md:hidden items-center gap-1.5">
            <div className="flex items-center gap-1 p-1 rounded-full nav-capsule-pill">
              <ThemeSwitcher compact />
              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/[0.08]"
                title="Command Palette"
              >
                <Search className="w-3.5 h-3.5 text-accent-primary" />
              </button>
              <BrowserExtensionModal
                triggerVariant="ghost"
                triggerClassName="p-1.5 rounded-full text-muted-foreground hover:bg-white/[0.08] h-auto"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground hover:bg-white/[0.08] rounded-full h-8 w-8"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border/40 omni-glass-card animate-spring-up mx-3 mb-3 rounded-2xl overflow-hidden shadow-2xl">
            <nav className="container mx-auto px-4 py-3 space-y-1">
              {navigation.map((item) => {
                const isActive = isItemActive(item)
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                      isActive
                        ? "bg-accent-primary text-white shadow-lg shadow-accent-primary/30 font-bold border border-white/25"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/[0.12]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Global Command Palette */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

      {/* Main Content Area */}
      <main className="animate-spring-up flex-1 relative z-10">
        {children}
      </main>

      {/* Global Cyber Luxury Footer */}
      <footer className="border-t border-border/60 py-8 mt-auto bg-surface/70 backdrop-blur-md relative z-10 transition-colors duration-300">
        <div className="container mx-auto px-4 max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-lg gradient-primary flex items-center justify-center text-white text-[10px] font-bold shadow-xs">
              Ω
            </div>
            <div>
              <p className="font-semibold text-foreground/90">OMNIDOWNLOAD TURBO ACCELERATOR</p>
              <p className="text-[10px] font-mono text-muted-foreground/80">v2.4.0 • Zero-Throttle Engine • Local-First Architecture</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link
              href="/"
              className="text-muted-foreground hover:text-accent-primary transition-colors flex items-center gap-1"
            >
              <Boxes className="h-3.5 w-3.5" />
              <span>Overview</span>
            </Link>
            <span className="text-muted-foreground/30">•</span>
            <Link
              href="/?view=console"
              className="text-muted-foreground hover:text-accent-primary transition-colors flex items-center gap-1"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Downloader</span>
            </Link>
            <span className="text-muted-foreground/30">•</span>
            <Link
              href="/sites"
              className="text-muted-foreground hover:text-accent-primary transition-colors flex items-center gap-1"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>1,000+ Extractors</span>
            </Link>
            <span className="text-muted-foreground/30">•</span>
            <Link
              href="https://github.com/ADITYAKUMARSINGH16"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/90 hover:text-accent-primary transition-colors font-medium"
            >
              Aditya Kumar Singh
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
