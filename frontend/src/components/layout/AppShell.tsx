"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Download, History, Globe, Settings, Info, Menu, X, Zap, Layers, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { BrowserExtensionModal } from "@/components/layout/BrowserExtensionModal"

const navigation = [
  { name: "Downloader", href: "/", icon: Download },
  { name: "Downloads", href: "/queue", icon: Layers },
  { name: "Analytics", href: "/dashboard", icon: BarChart3 },
  { name: "Supported Sites", href: "/sites", icon: Globe },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "About", href: "/about", icon: Info },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 glass-strong">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-lg group-hover:glow-sm transition-shadow duration-300">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight gradient-text">
              OmniDownload
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-3">
            <nav className="flex items-center gap-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                    )}
                  >
                    {isActive && (
                      <span className="absolute inset-0 rounded-lg gradient-primary opacity-90" />
                    )}
                    <span className="relative flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </span>
                  </Link>
                )
              })}
            </nav>

            <BrowserExtensionModal />
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <BrowserExtensionModal />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border/50 animate-slide-down">
            <nav className="container mx-auto px-4 py-3 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "gradient-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
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

      {/* Main Content */}
      <main className="animate-fade-in flex-1">
        {children}
      </main>

      {/* Global Footer */}
      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground space-y-1 mt-auto bg-card/30">
        <p>
          Built with <span className="text-rose-500 animate-pulse inline-block">❤️</span> by{" "}
          <Link
            href="https://github.com/ADITYAKUMARSINGH16"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground font-semibold hover:text-primary transition-colors underline underline-offset-4 decoration-primary/40 hover:decoration-primary"
          >
            Aditya Kumar Singh
          </Link>
        </p>
        <p className="text-[11px] text-muted-foreground/70">
          Powered by yt-dlp, FFmpeg, FastAPI, and Next.js
        </p>
      </footer>
    </div>
  )
}
