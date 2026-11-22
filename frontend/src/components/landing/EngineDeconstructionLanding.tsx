"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  Zap,
  Boxes,
  Cpu,
  Layers,
  Sparkles,
  ArrowRight,
  ChevronDown,
  Download,
  Gauge,
  ShieldCheck,
  Globe,
  BarChart3,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  Terminal,
  Activity,
  Link2,
  Music,
  Film,
  Check,
  X,
  Play,
  Pause,
  Sliders,
  Shield,
  Clock,
  ArrowUpRight
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { BrowserExtensionModal } from "@/components/layout/BrowserExtensionModal"
import { Reddit } from "@/components/icons"

/* ============================================================
   OMNIDOWNLOAD — 3D HARDWARE ACCELERATION ENGINE STAGE
   (Dynamic Theme Sync, Interactive Milestone Controls & Momentum Physics)
============================================================ */

const STAGE_IMAGES = [
  "/assets/engine/stage_01_assembled.jpg",
  "/assets/engine/stage_02_exploded.jpg",
  "/assets/engine/stage_03_silicon.jpg",
  "/assets/engine/stage_04_optical.jpg",
  "/assets/engine/stage_05_stance.jpg"
]

const STAGE_MILESTONES = [
  {
    progress: 0.0,
    tag: "01",
    name: "01 Assembled",
    title: "Quantum Core",
    subtitle: "Universal Protocol Discovery",
    desc: "Autonomous extractor engine discovering fragmented DASH, HLS manifests, BitTorrent magnets, and HTTP/HTTPS file streams across 1,000+ sources."
  },
  {
    progress: 0.28,
    tag: "02",
    name: "02 Segmented",
    title: "Segmented Turbo",
    subtitle: "Parallel TCP Range Stacks",
    desc: "Slices payloads into dynamic byte ranges across 16 to 32 concurrent HTTP worker threads, saturating network bandwidth and bypassing server rate-limiting."
  },
  {
    progress: 0.54,
    tag: "03",
    name: "03 Silicon",
    title: "Stream Silicon",
    subtitle: "DASH 4K/8K Demuxing",
    desc: "Deep-packet media resolver automatically pairing isolated video-only tracks with uncompressed audio streams, eliminating corrupt fragment telemetry."
  },
  {
    progress: 0.76,
    tag: "04",
    name: "04 Protocol",
    title: "Protocol Fabric",
    subtitle: "Lossless FFmpeg Remux",
    desc: "Asynchronous FFmpeg subprocess pipeline losslessly multiplexing high-res video and audio tracks, embedding subtitles, and injecting MusicBrainz ID3 tags."
  },
  {
    progress: 0.98,
    tag: "05",
    name: "05 Velocity",
    title: "Max Velocity",
    subtitle: "Zero-Trust Line Saturation",
    desc: "Wire-rate transfer with non-blocking async SSRF protection, strict private IP defense, monotonic WebSocket progress ticks, and local-first storage."
  }
]

const COMPARISON_ROWS = [
  {
    feature: "Advertisements & Malicious Popups",
    omni: "Zero ads, zero telemetry, clean local open-source UI",
    traditional: "Heavy ad-injection, crypto miners, fake download buttons",
    omniGood: true
  },
  {
    feature: "4K, 8K & 60FPS Video Quality",
    omni: "Lossless DASH demuxing up to 4320p 8K with audio",
    traditional: "Capped at 720p or 1080p, audio omitted or paywalled",
    omniGood: true
  },
  {
    feature: "Download Velocity & Concurrency",
    omni: "Segmented HTTP acceleration (16–32 TCP chunk streams)",
    traditional: "Single-thread browser download throttled to 1–2 MB/s",
    omniGood: true
  },
  {
    feature: "User Privacy & Security",
    omni: "100% local processing, zero logging, strict SSRF sandbox",
    traditional: "Cloud server logging, link harvesting, cookie theft",
    omniGood: true
  },
  {
    feature: "Audio Tagging & Metadata",
    omni: "MusicBrainz canonical matching + Mutagen cover art",
    traditional: "Raw video titles with clickbait tags, missing tags",
    omniGood: true
  },
  {
    feature: "In-Browser Seeking (Multi-GB Files)",
    omni: "HTTP 206 Partial Content Range streaming",
    traditional: "Requires complete multi-gigabyte download before viewing",
    omniGood: true
  }
]

const PLATFORM_SHOWCASE = [
  { name: "YouTube", tag: "4K / 8K & Playlists", color: "text-red-400", bg: "bg-red-500/10 border-red-500/25" },
  { name: "Reddit", tag: "HLS Audio + Video", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/25" },
  { name: "Twitter / X", tag: "HD Video & Threads", color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/25" },
  { name: "Instagram", tag: "Reels & Carousels", color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/25" },
  { name: "Facebook", tag: "Watch & Stories", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/25" },
  { name: "TikTok", tag: "Watermark-Free HD", color: "text-teal-400", bg: "bg-teal-500/10 border-teal-500/25" },
  { name: "SoundCloud", tag: "Hi-Res Audio & Art", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/25" },
  { name: "TeraBox", tag: "Direct Cloud Bypass", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/25" },
  { name: "BitTorrent", tag: "Magnet URI & .torrent", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/25" },
  { name: "Direct HTTP/S", tag: "Multi-Chunk Turbo", color: "text-accent-velocity", bg: "bg-accent-velocity/10 border-accent-velocity/25" }
]

interface EngineDeconstructionLandingProps {
  onLaunchConsole?: () => void
  activeQueueCount?: number
  totalDownloadedFormatted?: string
  successRate?: number
}

export function EngineDeconstructionLanding({
  onLaunchConsole,
  activeQueueCount = 0,
  totalDownloadedFormatted = "0 B",
  successRate = 100
}: EngineDeconstructionLandingProps) {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Loaded image cache
  const imagesRef = useRef<HTMLImageElement[]>([])
  const [isReady, setIsReady] = useState(false)

  // Interactive stage state
  const [stageProgress, setStageProgress] = useState(0.0)
  const currentProgressRef = useRef(0.0)
  const targetProgressRef = useRef(0.0)
  const [activeMilestoneIndex, setActiveMilestoneIndex] = useState(0)
  const [isPlayingAuto, setIsPlayingAuto] = useState(false)

  // Hero Quick URL input state
  const [heroUrl, setHeroUrl] = useState("")

  // Dynamic Theme Colors synced to document data-theme
  const themeColorsRef = useRef({
    bg: "#09090b",
    primary: "255, 94, 26",
    secondary: "255, 46, 99",
    velocity: "0, 245, 160"
  })

  const updateThemeColors = useCallback(() => {
    if (typeof window === "undefined") return
    const style = getComputedStyle(document.documentElement)
    const bgRaw = style.getPropertyValue("--bg-base").trim()
    const pRaw = style.getPropertyValue("--accent-primary").trim()
    const sRaw = style.getPropertyValue("--accent-secondary").trim()
    const vRaw = style.getPropertyValue("--accent-velocity").trim()

    themeColorsRef.current = {
      bg: bgRaw ? `rgb(${bgRaw.replace(/\s+/g, ", ")})` : "#09090b",
      primary: pRaw ? pRaw.replace(/\s+/g, ", ") : "255, 94, 26",
      secondary: sRaw ? sRaw.replace(/\s+/g, ", ") : "255, 46, 99",
      velocity: vRaw ? vRaw.replace(/\s+/g, ", ") : "0, 245, 160"
    }
  }, [])

  /* ------------------------------------------------------------
     1. IMAGE PRELOADING
  ------------------------------------------------------------ */
  useEffect(() => {
    let count = 0
    const loadedImgs: HTMLImageElement[] = []

    STAGE_IMAGES.forEach((src, idx) => {
      const img = new Image()
      img.src = src

      const markDone = () => {
        count++
        if (count >= STAGE_IMAGES.length) {
          setIsReady(true)
        }
      }

      if (img.complete && img.naturalWidth > 0) {
        markDone()
      } else {
        img.onload = markDone
        img.onerror = markDone
      }
      loadedImgs[idx] = img
    })

    imagesRef.current = loadedImgs
    const fallbackTimer = setTimeout(() => setIsReady(true), 400)
    return () => clearTimeout(fallbackTimer)
  }, [])

  /* ------------------------------------------------------------
     2. DRAW IMAGE COVER ON CANVAS
  ------------------------------------------------------------ */
  const drawImageCover = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement,
      img: HTMLImageElement,
      alpha = 1,
      scaleMult = 1
    ) => {
      if (!img || !img.complete || img.naturalWidth === 0) return false

      const cw = canvas.width
      const ch = canvas.height
      const iw = img.naturalWidth
      const ih = img.naturalHeight

      const baseScale = Math.max(cw / iw, ch / ih)
      const finalScale = baseScale * scaleMult

      const drawWidth = iw * finalScale
      const drawHeight = ih * finalScale

      const x = (cw - drawWidth) / 2
      const y = (ch - drawHeight) / 2

      ctx.save()
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
      ctx.drawImage(img, x, y, drawWidth, drawHeight)
      ctx.restore()
      return true
    },
    []
  )

  /* ------------------------------------------------------------
     3. TELEMETRY & HUD OVERLAYS
  ------------------------------------------------------------ */
  const drawTelemetryGrid = useCallback(
    (ctx: CanvasRenderingContext2D, cw: number, ch: number, progress: number) => {
      const colors = themeColorsRef.current
      ctx.save()

      // Subtle grid
      ctx.strokeStyle = `rgba(${colors.primary}, 0.04)`
      ctx.lineWidth = 1
      const gridSize = 70
      ctx.beginPath()
      for (let x = 0; x < cw; x += gridSize) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, ch)
      }
      for (let y = 0; y < ch; y += gridSize) {
        ctx.moveTo(0, y)
        ctx.lineTo(cw, y)
      }
      ctx.stroke()

      // Precision corner reticles
      ctx.strokeStyle = `rgba(${colors.velocity}, 0.35)`
      ctx.lineWidth = 1.5

      // Top-left
      ctx.beginPath()
      ctx.moveTo(25, 55)
      ctx.lineTo(25, 25)
      ctx.lineTo(55, 25)
      ctx.stroke()

      // Top-right
      ctx.beginPath()
      ctx.moveTo(cw - 55, 25)
      ctx.lineTo(cw - 25, 25)
      ctx.lineTo(cw - 25, 55)
      ctx.stroke()

      // Bottom-left
      ctx.beginPath()
      ctx.moveTo(25, ch - 55)
      ctx.lineTo(25, ch - 25)
      ctx.lineTo(55, ch - 25)
      ctx.stroke()

      // Bottom-right
      ctx.beginPath()
      ctx.moveTo(cw - 55, ch - 25)
      ctx.lineTo(cw - 25, ch - 25)
      ctx.lineTo(cw - 25, ch - 55)
      ctx.stroke()

      // Laser sweep line
      const scanY = (progress * ch * 1.8) % ch
      const grad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30)
      grad.addColorStop(0, `rgba(${colors.primary}, 0)`)
      grad.addColorStop(0.5, `rgba(${colors.velocity}, 0.15)`)
      grad.addColorStop(1, `rgba(${colors.primary}, 0)`)
      ctx.fillStyle = grad
      ctx.fillRect(0, scanY - 30, cw, 60)

      ctx.strokeStyle = `rgba(${colors.velocity}, 0.5)`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, scanY)
      ctx.lineTo(cw, scanY)
      ctx.stroke()

      ctx.restore()
    },
    []
  )

  /* ------------------------------------------------------------
     4. RENDER CANVAS
  ------------------------------------------------------------ */
  const renderCanvas = useCallback(
    (progress: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d", { alpha: false })
      if (!ctx) return

      const cw = canvas.width
      const ch = canvas.height
      const colors = themeColorsRef.current

      ctx.fillStyle = colors.bg
      ctx.fillRect(0, 0, cw, ch)

      const images = imagesRef.current
      if (images && images.length > 0) {
        const totalStages = images.length
        const mapped = progress * (totalStages - 1)
        const stageA = Math.min(totalStages - 1, Math.floor(mapped))
        const stageB = Math.min(totalStages - 1, stageA + 1)
        const stageBlend = mapped - stageA

        const smoothBlend = stageBlend * stageBlend * (3 - 2 * stageBlend)
        const imgA = images[stageA]
        const imgB = images[stageB]

        const scaleA = 1 + smoothBlend * 0.03
        const scaleB = 1.03 - (1 - smoothBlend) * 0.03

        if (imgA && imgA.complete && imgA.naturalWidth > 0) {
          drawImageCover(ctx, canvas, imgA, 1 - smoothBlend * 0.9, scaleA)
        }
        if (stageA !== stageB && imgB && imgB.complete && imgB.naturalWidth > 0 && smoothBlend > 0.01) {
          drawImageCover(ctx, canvas, imgB, smoothBlend, scaleB)
        }
      }

      drawTelemetryGrid(ctx, cw, ch, progress)
    },
    [drawImageCover, drawTelemetryGrid]
  )

  /* ------------------------------------------------------------
     5. RESIZE & THEME OBSERVER
  ------------------------------------------------------------ */
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.max(1, Math.floor(rect.width * dpr))
    const h = Math.max(1, Math.floor(rect.height * dpr))

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
      renderCanvas(currentProgressRef.current)
    }
  }, [renderCanvas])

  useEffect(() => {
    updateThemeColors()
    const observer = new MutationObserver(() => {
      updateThemeColors()
      renderCanvas(currentProgressRef.current)
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"]
    })

    const canvas = canvasRef.current
    let ro: ResizeObserver | null = null
    if (canvas && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => resizeCanvas())
      ro.observe(canvas)
    }

    window.addEventListener("resize", resizeCanvas, { passive: true })
    resizeCanvas()
    return () => {
      observer.disconnect()
      if (ro) ro.disconnect()
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [updateThemeColors, renderCanvas, resizeCanvas])

  /* ------------------------------------------------------------
     6. SMOOTH PHYSICS & AUTOPLAY LOOP
  ------------------------------------------------------------ */
  useEffect(() => {
    let rafId: number

    const loop = () => {
      if (isPlayingAuto) {
        targetProgressRef.current += 0.002
        if (targetProgressRef.current > 1.0) {
          targetProgressRef.current = 0.0
        }
      }

      const diff = targetProgressRef.current - currentProgressRef.current
      if (Math.abs(diff) > 0.0005) {
        currentProgressRef.current += diff * 0.12
      } else {
        currentProgressRef.current = targetProgressRef.current
      }

      const p = currentProgressRef.current
      setStageProgress(p)

      // Find closest milestone
      const closestIdx = STAGE_MILESTONES.reduce((best, m, idx) => {
        return Math.abs(m.progress - p) < Math.abs(STAGE_MILESTONES[best].progress - p) ? idx : best
      }, 0)
      setActiveMilestoneIndex(closestIdx)

      renderCanvas(p)
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [isPlayingAuto, renderCanvas])

  const handleSelectMilestone = (idx: number) => {
    setIsPlayingAuto(false)
    targetProgressRef.current = STAGE_MILESTONES[idx].progress
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsPlayingAuto(false)
    targetProgressRef.current = parseFloat(e.target.value)
  }

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = heroUrl.trim()
    if (trimmed) {
      router.push(`/?view=console&url=${encodeURIComponent(trimmed)}`)
    } else if (onLaunchConsole) {
      onLaunchConsole()
    } else {
      router.push("/?view=console")
    }
  }

  const activeMilestone = STAGE_MILESTONES[activeMilestoneIndex]

  return (
    <div className="space-y-16 lg:space-y-24 py-6 md:py-10 animate-fade-in text-foreground">
      {/* =========================================================
          SECTION 1: HERO & DOWNLINK COMMAND BAR
      ========================================================= */}
      <section className="container mx-auto px-4 max-w-7xl">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-6">
          {/* Hardware Telemetry Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-primary/10 border border-accent-primary/25 text-accent-primary text-[10px] font-bold tracking-[0.18em] uppercase shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>UNIVERSAL STREAM &amp; FILE INGESTION PLATFORM</span>
          </div>

          {/* Mammoth Hero Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold font-heading tracking-tight leading-[1.02]">
            Download Any Media at <br />
            <span className="gradient-text">Wire-Rate Velocity</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Autonomous multi-threaded segmented downloading across 1,000+ streaming platforms.
            Lossless local FFmpeg remuxing, 4K/8K DASH stream synthesis, and zero artificial speed throttles.
          </p>

          {/* Functional URL Downlink Input Bar */}
          <form onSubmit={handleHeroSubmit} className="w-full max-w-2xl pt-2">
            <div className="flex items-center gap-2 p-2 rounded-2xl omni-glass-card shadow-2xl focus-within:border-accent-primary/50 focus-within:ring-2 focus-within:ring-accent-primary/20 transition-all">
              <Link2 className="w-5 h-5 text-accent-primary ml-2 shrink-0" />
              <input
                type="text"
                value={heroUrl}
                onChange={(e) => setHeroUrl(e.target.value)}
                placeholder="Paste any URL (YouTube, Twitter, Instagram, Reddit, direct file)..."
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-medium px-2"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl gradient-primary text-white text-xs font-bold uppercase tracking-wider shrink-0 shadow-md hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Analyze</span>
              </button>
            </div>
          </form>

          {/* Quick Action Navigation CTAs */}
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <button
              onClick={onLaunchConsole || (() => router.push("/?view=console"))}
              className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-accent-primary/25 hover:shadow-xl hover:opacity-95 transition-all cursor-pointer"
            >
              <Activity className="h-4 w-4" />
              <span>Launch Downloader Console</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <a
              href="#engine-stage"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-surface/80 border border-border/70 text-foreground text-xs font-semibold backdrop-blur-xl hover:bg-elevated transition-all"
            >
              <Boxes className="h-4 w-4 text-accent-velocity" />
              <span>Explore 3D Engine Architecture</span>
              <ChevronDown className="h-4 w-4" />
            </a>

            <BrowserExtensionModal>
              <button className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface/60 border border-border/50 text-muted-foreground hover:text-foreground text-xs font-semibold hover:bg-elevated transition-all cursor-pointer">
                <span>Browser Extension</span>
              </button>
            </BrowserExtensionModal>
          </div>

          {/* Telemetry Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-3xl pt-4">
            <div className="omni-glass-card p-3 rounded-xl text-center border border-border/40">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Line Throughput
              </span>
              <span className="text-base font-extrabold font-heading text-accent-velocity">
                15.2 TBPS CAP
              </span>
            </div>
            <div className="omni-glass-card p-3 rounded-xl text-center border border-border/40">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Concurrent Workers
              </span>
              <span className="text-base font-extrabold font-heading text-accent-primary">
                32 TCP CHUNKS
              </span>
            </div>
            <div className="omni-glass-card p-3 rounded-xl text-center border border-border/40">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Platform Engines
              </span>
              <span className="text-base font-extrabold font-heading text-emerald-400">
                1,000+ SITES
              </span>
            </div>
            <div className="omni-glass-card p-3 rounded-xl text-center border border-border/40">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Privacy Boundary
              </span>
              <span className="text-base font-extrabold font-heading text-amber-400">
                100% PRIVATE LOCAL
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 2: 3D ACCELERATION ENGINE DECONSTRUCTION STAGE
      ========================================================= */}
      <section id="engine-stage" className="container mx-auto px-4 max-w-7xl scroll-mt-20">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-3 border-b border-border/40">
            <div>
              <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-accent-velocity font-bold mb-1">
                <Boxes className="w-3.5 h-3.5" />
                <span>HARDWARE-ACCELERATED DECONSTRUCTION STAGE</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-tight text-foreground">
                3D Engine <span className="gradient-text">Exploded Architecture</span>
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
                Scrub the interactive timeline below to dissect how OmniDownloader orchestrates parallel TCP chunks, DASH stream demuxing, and hardware-accelerated remuxing.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsPlayingAuto(!isPlayingAuto)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border/60 bg-surface/80 hover:bg-elevated transition-all text-foreground cursor-pointer"
              >
                {isPlayingAuto ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-accent-primary" />
                    <span>Pause Auto-Scrub</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-accent-velocity" />
                    <span>Play Explosion</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Framed 3D Stage Viewport */}
          <div className="relative w-full h-[460px] sm:h-[580px] lg:h-[640px] rounded-3xl overflow-hidden border border-border/70 shadow-2xl omni-glass-card group">
            {/* Interactive Canvas */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full block"
            />

            {/* Stage Title Overlay (Top Left) */}
            <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-10 pointer-events-none">
              <div className="p-3.5 sm:p-4 rounded-2xl omni-glass-card border border-border/60 shadow-xl max-w-xs sm:max-w-sm backdrop-blur-xl">
                <div className="text-[10px] font-mono tracking-[0.2em] uppercase text-accent-velocity font-bold mb-1">
                  STAGE {activeMilestone.tag} • {activeMilestone.title}
                </div>
                <div className="text-sm sm:text-base font-extrabold font-heading text-foreground">
                  {activeMilestone.subtitle}
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-relaxed">
                  {activeMilestone.desc}
                </p>
              </div>
            </div>

            {/* Live Telemetry Pill Overlay (Top Right) */}
            <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-10 pointer-events-none hidden sm:block">
              <div className="p-3 rounded-2xl omni-glass-card border border-border/60 shadow-xl backdrop-blur-xl font-mono text-right text-[11px] space-y-1">
                <div className="text-accent-velocity font-bold flex items-center justify-end gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-velocity animate-pulse" />
                  <span>SATURATION 100%</span>
                </div>
                <div className="text-muted-foreground">
                  EXPLOSION: <span className="text-foreground font-bold">{Math.round(stageProgress * 100)}%</span>
                </div>
                <div className="text-muted-foreground">
                  FRAME: <span className="text-foreground font-bold">{Math.min(150, Math.round(stageProgress * 149) + 1)}</span> / 150
                </div>
              </div>
            </div>

            {/* Interactive Timeline Scrubber & Milestone Tabs (Bottom Center) */}
            <div className="absolute bottom-4 sm:bottom-6 left-4 right-4 sm:left-8 sm:right-8 z-10">
              <div className="p-3.5 sm:p-4 rounded-2xl omni-glass-card border border-border/70 shadow-2xl backdrop-blur-2xl space-y-3">
                {/* Milestone Buttons */}
                <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar">
                  {STAGE_MILESTONES.map((m, idx) => {
                    const isSelected = activeMilestoneIndex === idx
                    return (
                      <button
                        key={m.tag}
                        onClick={() => handleSelectMilestone(idx)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wider transition-all cursor-pointer whitespace-nowrap",
                          isSelected
                            ? "gradient-primary text-white shadow-md"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                        )}
                      >
                        <span className="font-mono text-[10px] opacity-75">{m.tag}</span>
                        <span>{m.title}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Range Slider Track */}
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0 uppercase">0% Assembled</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.005"
                    value={stageProgress}
                    onChange={handleSliderChange}
                    className="w-full h-1.5 bg-border/60 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0 uppercase">100% Exploded</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 3: CORE ENGINEERING CAPABILITIES (BENTO GRID)
      ========================================================= */}
      <section className="container mx-auto px-4 max-w-7xl">
        <div className="space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-accent-primary font-bold">
              <Cpu className="w-3.5 h-3.5" />
              <span>SUBSYSTEM ARCHITECTURE &amp; PERFORMANCE</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading tracking-tight text-foreground">
              Built for Extreme Velocity &amp; <span className="gradient-text">Absolute Fidelity</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Six core subsystems engineered to replace ad-ridden, paywalled web downloaders with an open, private powerhouse.
            </p>
          </div>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Bento Card 1: 4K/8K DASH */}
            <div className="omni-glass-card rounded-3xl p-6 sm:p-7 shadow-xl space-y-4 border border-border/60 relative overflow-hidden group">
              <div className="h-12 w-12 rounded-2xl gradient-primary flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                <Film className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold font-heading text-foreground">
                4K &amp; 8K Multi-Stream Merging
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Automatically isolates and losslessly muxes separated high-resolution video tracks (1440p, 2160p 4K, 4320p 8K) and best available audio streams via an async FFmpeg pipeline.
              </p>
              <div className="pt-2 flex flex-wrap gap-2 text-[10px] font-mono">
                <span className="px-2.5 py-1 rounded-lg bg-accent-primary/10 text-accent-primary border border-accent-primary/30 font-semibold">
                  Lossless Direct Copy
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-elevated text-muted-foreground border border-border/40">
                  DASH / WebM / MP4
                </span>
              </div>
            </div>

            {/* Bento Card 2: Segmented HTTP */}
            <div className="omni-glass-card rounded-3xl p-6 sm:p-7 shadow-xl space-y-4 border border-border/60 relative overflow-hidden group">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-accent-velocity to-cyan-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold font-heading text-foreground">
                Segmented HTTP Acceleration
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Splits direct file downloads into 8 to 32 simultaneous TCP byte-range chunk connections. Bypasses single-thread rate caps and saturates available network bandwidth.
              </p>
              <div className="pt-2 flex flex-wrap gap-2 text-[10px] font-mono">
                <span className="px-2.5 py-1 rounded-lg bg-accent-velocity/10 text-accent-velocity border border-accent-velocity/30 font-semibold">
                  32-Way Parallel HTTP
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-elevated text-muted-foreground border border-border/40">
                  HTTP Range Headers
                </span>
              </div>
            </div>

            {/* Bento Card 3: Audio Tagging */}
            <div className="omni-glass-card rounded-3xl p-6 sm:p-7 shadow-xl space-y-4 border border-border/60 relative overflow-hidden group">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                <Music className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold font-heading text-foreground">
                Smart Audio Tagging &amp; Art
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Strips clickbait noise from track titles, resolves canonical track metadata against the MusicBrainz Web API, and embeds high-resolution cover art into MP3, M4A, FLAC, and Opus containers.
              </p>
              <div className="pt-2 flex flex-wrap gap-2 text-[10px] font-mono">
                <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30 font-semibold">
                  MusicBrainz API
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-elevated text-muted-foreground border border-border/40">
                  Mutagen ID3 &amp; FLAC
                </span>
              </div>
            </div>

            {/* Bento Card 4: HTTP 206 Streaming */}
            <div className="omni-glass-card rounded-3xl p-6 sm:p-7 shadow-xl space-y-4 border border-border/60 relative overflow-hidden group">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                <Play className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold font-heading text-foreground">
                In-Browser Media Player
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Stream and scrub through multi-gigabyte completed video and audio downloads directly inside the browser using HTTP 206 Partial Content byte ranges and live FFprobe codec telemetry.
              </p>
              <div className="pt-2 flex flex-wrap gap-2 text-[10px] font-mono">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                  RFC 7233 Seeking
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-elevated text-muted-foreground border border-border/40">
                  FFprobe Inspection
                </span>
              </div>
            </div>

            {/* Bento Card 5: Smart Playlists */}
            <div className="omni-glass-card rounded-3xl p-6 sm:p-7 shadow-xl space-y-4 border border-border/60 relative overflow-hidden group">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold font-heading text-foreground">
                Playlists &amp; Subfolder Isolation
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Deep playlist and album analysis extracting lightweight item manifests without overhead. Ingest entire channels or albums into dedicated, sanitized subdirectories automatically.
              </p>
              <div className="pt-2 flex flex-wrap gap-2 text-[10px] font-mono">
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                  200-Item Batches
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-elevated text-muted-foreground border border-border/40">
                  Subfolder Partitioning
                </span>
              </div>
            </div>

            {/* Bento Card 6: Zero-Trust Security */}
            <div className="omni-glass-card rounded-3xl p-6 sm:p-7 shadow-xl space-y-4 border border-border/60 relative overflow-hidden group">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold font-heading text-foreground">
                Zero-Trust SSRF Defense
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Protects the local machine by resolving hostnames against private IPv4/IPv6 networks and loopbacks, intercepting HTTP 301/302 redirects, and sanitizing filenames against path traversal.
              </p>
              <div className="pt-2 flex flex-wrap gap-2 text-[10px] font-mono">
                <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold">
                  Async DNS Shield
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-elevated text-muted-foreground border border-border/40">
                  Redirect Inspection
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 4: SUPPORTED PLATFORMS SHOWCASE
      ========================================================= */}
      <section className="container mx-auto px-4 max-w-7xl">
        <div className="omni-glass-card rounded-3xl p-6 sm:p-10 border border-border/60 shadow-2xl space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-accent-velocity font-bold mb-1">
                <Globe className="w-3.5 h-3.5" />
                <span>EXPANDING PROTOCOL DIRECTORY</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-tight text-foreground">
                Supported Media &amp; <span className="gradient-text">Protocol Matrix</span>
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Deep protocol scrapers, cipher solvers, and stream parsers targeting 1,000+ online video, audio, and cloud hosts.
              </p>
            </div>

            <Link
              href="/sites"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-surface/80 border border-border/60 text-foreground hover:bg-elevated transition-all shrink-0"
            >
              <span>View All 1,000+ Platforms</span>
              <ArrowUpRight className="h-4 w-4 text-accent-velocity" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {PLATFORM_SHOWCASE.map((platform) => (
              <div
                key={platform.name}
                className="p-3.5 rounded-2xl bg-surface/60 border border-border/50 hover:border-accent-primary/40 transition-all space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs font-bold font-heading", platform.color)}>
                    {platform.name}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-velocity/80 group-hover:scale-125 transition-transform" />
                </div>
                <p className="text-[10px] font-mono text-muted-foreground truncate">
                  {platform.tag}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 5: TRADITIONAL WEB VS OMNIDOWNLOADER
      ========================================================= */}
      <section className="container mx-auto px-4 max-w-7xl">
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-tight text-foreground">
              Traditional Web Downloaders vs. <span className="gradient-text">OmniDownload</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              A transparent comparison between ad-riddled cloud proxies and local-first hardware acceleration.
            </p>
          </div>

          <div className="omni-glass-card rounded-3xl overflow-hidden border border-border/60 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-surface/80">
                    <th className="py-4 px-5 font-bold uppercase tracking-wider text-muted-foreground font-mono text-[10px]">
                      Capability / Feature
                    </th>
                    <th className="py-4 px-5 font-bold uppercase tracking-wider text-accent-velocity font-mono text-[10px]">
                      ⚡ OmniDownload Core
                    </th>
                    <th className="py-4 px-5 font-bold uppercase tracking-wider text-muted-foreground font-mono text-[10px]">
                      Traditional Web Services
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.feature} className="hover:bg-accent/20 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-foreground">
                        {row.feature}
                      </td>
                      <td className="py-3.5 px-5 font-medium text-emerald-400 flex items-center gap-2">
                        <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                        <span>{row.omni}</span>
                      </td>
                      <td className="py-3.5 px-5 text-muted-foreground">
                        <span className="flex items-center gap-2 text-rose-400/90">
                          <X className="h-4 w-4 shrink-0 text-rose-400" />
                          <span>{row.traditional}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 6: FINAL CALL TO ACTION BANNER
      ========================================================= */}
      <section className="container mx-auto px-4 max-w-7xl">
        <div className="relative rounded-3xl omni-glass-card p-8 sm:p-14 border border-border/70 shadow-2xl overflow-hidden text-center space-y-6">
          {/* Ambient background glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20 blur-3xl gradient-primary pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.2em] bg-accent-velocity/10 border border-accent-velocity/30 text-accent-velocity font-bold">
            READY FOR DEPLOYMENT
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold font-heading tracking-tight text-foreground max-w-2xl mx-auto">
            Experience Line-Rate Ingestion on <span className="gradient-text">Your Machine</span>
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Zero throttles. Zero telemetry. Download, remux, and catalog media from anywhere on the web in seconds.
          </p>

          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <button
              onClick={onLaunchConsole || (() => router.push("/?view=console"))}
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl gradient-primary text-white text-xs font-bold uppercase tracking-wider shadow-xl hover:scale-105 transition-all cursor-pointer"
            >
              <Activity className="h-4 w-4" />
              <span>Open Downloader Workspace</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <Link
              href="/queue"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-surface/80 border border-border/70 text-foreground text-xs font-semibold hover:bg-elevated transition-all"
            >
              <Layers className="h-4 w-4 text-accent-velocity" />
              <span>View Active Queue ({activeQueueCount})</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
