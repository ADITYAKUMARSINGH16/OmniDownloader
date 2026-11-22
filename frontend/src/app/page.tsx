"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Download,
  CheckCircle,
  TrendingUp,
  Youtube,
  Twitter,
  Instagram,
  Facebook,
  HardDrive,
  Link2,
  ChevronRight,
  Zap,
  ArrowDownToLine,
  Puzzle,
  Boxes,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Activity,
  Globe,
  Music,
} from "lucide-react"
import { Reddit } from "@/components/icons"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UrlAnalyzer } from "@/components/download/UrlAnalyzer"
import { DownloadQueue } from "@/components/download/DownloadQueue"
import { cn, formatBytes } from "@/lib/utils"
import { useDownloadStore } from "@/hooks/useStore"
import { AppShell } from "@/components/layout/AppShell"
import { BrowserExtensionModal } from "@/components/layout/BrowserExtensionModal"
import { EngineDeconstructionLanding } from "@/components/landing/EngineDeconstructionLanding"

const sites = [
  { name: "YouTube", icon: Youtube, color: "text-red-400", desc: "4K/8K & Playlists" },
  { name: "Spotify", icon: Music, color: "text-green-400", desc: "Tracks & Playlists" },
  { name: "JioSaavn", icon: Music, color: "text-emerald-400", desc: "320k Lossless Audio" },
  { name: "Reddit", icon: Reddit, color: "text-orange-400", desc: "HLS Audio/Video" },
  { name: "Twitter / X", icon: Twitter, color: "text-sky-400", desc: "HD Video & Threads" },
  { name: "Instagram", icon: Instagram, color: "text-pink-400", desc: "Reels & Carousels" },
  { name: "Facebook", icon: Facebook, color: "text-blue-400", desc: "Watch & Stories" },
  { name: "Terabox", icon: HardDrive, color: "text-teal-400", desc: "Direct Cloud Link" },
  { name: "Direct HTTP/S", icon: Link2, color: "text-violet-400", desc: "Multipart Chunks" },
]

function HomeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { queue } = useDownloadStore()

  // Directly derive view from reactive Next.js searchParams
  const view: "landing" | "console" = searchParams.get("view") === "console" ? "console" : "landing"

  const handleLaunchConsole = () => {
    router.push("/?view=console")
  }

  const handleReturnToLanding = () => {
    router.push("/")
  }

  const activeCount = queue.filter((d) => ["downloading", "queued"].includes(d.status)).length
  const completedCount = queue.filter((d) => d.status === "completed").length
  const totalBytes = queue.reduce((acc, d) => acc + (d.downloaded_size || d.file_size || 0), 0)
  const failedCount = queue.filter((d) => d.status === "failed").length
  const totalFinished = completedCount + failedCount
  const successRate = totalFinished > 0 ? Math.round((completedCount / totalFinished) * 100) : 100

  const stats = [
    {
      label: "Active Pipelines",
      value: activeCount.toString(),
      subtext: `${activeCount} concurrent streams`,
      icon: Zap,
      accent: "text-accent-primary",
      border: "hover:border-accent-primary/40",
      gradient: "from-accent-primary/20 to-accent-secondary/5",
      iconBg: "gradient-primary"
    },
    {
      label: "Completed",
      value: completedCount.toString(),
      subtext: `${failedCount} failed`,
      icon: CheckCircle,
      accent: "text-emerald-400",
      border: "hover:border-emerald-500/40",
      gradient: "from-emerald-500/20 to-teal-600/5",
      iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600"
    },
    {
      label: "Transferred",
      value: totalBytes > 0 ? formatBytes(totalBytes) : "0 B",
      subtext: "Bandwidth aggregated",
      icon: ArrowDownToLine,
      accent: "text-accent-velocity",
      border: "hover:border-accent-velocity/40",
      gradient: "from-accent-velocity/20 to-sky-600/5",
      iconBg: "bg-gradient-to-br from-accent-velocity to-cyan-600"
    },
    {
      label: "Success Rate",
      value: `${successRate}%`,
      subtext: "Zero payload corruption",
      icon: TrendingUp,
      accent: "text-amber-400",
      border: "hover:border-amber-500/40",
      gradient: "from-amber-500/20 to-orange-600/5",
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-600"
    },
  ]

  // Render Unified Product Landing Page
  if (view === "landing") {
    return (
      <AppShell activeTab="overview">
        <EngineDeconstructionLanding
          onLaunchConsole={handleLaunchConsole}
          activeQueueCount={activeCount}
          totalDownloadedFormatted={totalBytes > 0 ? formatBytes(totalBytes) : "0 B"}
          successRate={successRate}
        />
      </AppShell>
    )
  }

  // Render Downloader Workspace Console
  return (
    <AppShell activeTab="downloader">
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl space-y-8 animate-fade-in">
        {/* Page Hero Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/60">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] bg-accent-primary/10 border border-accent-primary/25 text-accent-primary shadow-xs mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>QUANTUM ACCELERATOR // DOWNLINK CONSOLE</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-heading text-foreground">
              Downloader <span className="gradient-text">Workspace</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Segmented multi-threaded streaming, deep DRM-free protocol extraction, and lossless local FFmpeg muxing.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleReturnToLanding}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface/80 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-elevated transition-all cursor-pointer"
            >
              <Boxes className="h-4 w-4 text-accent-primary" />
              <span>Overview &amp; 3D Showcase</span>
            </button>
            <Link
              href="/queue"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface/80 border border-border/60 text-foreground hover:bg-elevated transition-all"
            >
              <Layers className="h-4 w-4 text-accent-velocity" />
              <span>Queue ({activeCount})</span>
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold gradient-primary text-white shadow-md hover:opacity-95 transition-all"
            >
              <Activity className="h-4 w-4" />
              <span>Live Telemetry</span>
            </Link>
          </div>
        </div>

        {/* Stats Row - 4 Luxury Cyber Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className={cn(
                  "relative group omni-glass-card squircle-card p-5 shadow-lg transition-all duration-300 overflow-hidden",
                  stat.border
                )}
              >
                {/* Background radial gradient glow */}
                <div
                  className={cn(
                    "absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-15 blur-2xl bg-gradient-to-br transition-opacity group-hover:opacity-35",
                    stat.gradient
                  )}
                />

                <div className="relative flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      {stat.label}
                    </span>
                    <p className="text-3xl font-extrabold font-heading tracking-tight text-foreground mt-1">
                      {stat.value}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {stat.subtext}
                    </p>
                  </div>
                  <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center text-white shadow-md shrink-0", stat.iconBg)}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Main Workspace Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Column: URL Analyzer & Recent Downloads */}
          <div className="lg:col-span-2 space-y-6">
            <UrlAnalyzer />
            
            <Card className="omni-glass-card shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-base font-bold font-heading flex items-center justify-between text-foreground">
                  <span className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
                      <Download className="h-4 w-4" />
                    </div>
                    Recent Active Downloads
                  </span>
                  <Link
                    href="/queue"
                    className="text-xs font-semibold text-primary hover:text-accent-velocity transition-colors flex items-center gap-1 group"
                  >
                    <span>Full Queue</span>
                    <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <DownloadQueue compact={true} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Browser Extension Promo Card */}
            <div className="relative rounded-2xl omni-glass-card p-5 shadow-xl overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-2xl gradient-primary" />
              
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white shadow-md">
                  <Puzzle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-heading text-foreground">Browser Extension</h3>
                  <p className="text-[11px] text-muted-foreground">Chrome, Brave, Edge & Opera</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Capture video and audio streams directly while browsing YouTube, Twitter, Instagram, or Reddit with 1-click context menus.
              </p>

              <BrowserExtensionModal>
                <button className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl gradient-primary text-white text-xs font-bold uppercase tracking-wider shadow-md hover:opacity-95 transition-all">
                  <Puzzle className="h-3.5 w-3.5" />
                  <span>Get Browser Extension</span>
                </button>
              </BrowserExtensionModal>
            </div>

            {/* Supported Sites Glass Card */}
            <div className="rounded-2xl omni-glass-card p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <h3 className="text-sm font-bold font-heading text-foreground flex items-center gap-2">
                  <Globe className="h-4 w-4 text-accent-velocity" />
                  Supported Media Sites
                </h3>
                <Link
                  href="/sites"
                  className="text-[11px] font-semibold text-primary hover:text-accent-velocity flex items-center gap-1"
                >
                  <span>1,000+ All</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="space-y-1">
                {sites.map((site) => (
                  <Link
                    key={site.name}
                    href="/sites"
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <site.icon className={cn("h-4 w-4 shrink-0", site.color)} />
                      <span className="font-medium text-foreground">{site.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground/60 group-hover:text-primary transition-colors">
                      {site.desc}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  )
}