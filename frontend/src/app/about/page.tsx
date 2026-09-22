"use client"

import {
  Download,
  Github,
  Heart,
  Coffee,
  Shield,
  Zap,
  Code,
  Layers,
  Terminal,
  Database,
  Cloud,
  ExternalLink,
  Info,
  Scale,
  Cpu,
  Workflow
} from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { AppShell } from "@/components/layout/AppShell"
import { cn } from "@/lib/utils"

const features = [
  { name: "Plugin Architecture", icon: Layers, description: "Extensible extractor system to add new site engines without touching core downloader pipelines." },
  { name: "Universal Downloader", icon: Cloud, description: "Download from YouTube, Reddit, Twitter, Instagram, Facebook, Terabox, and arbitrary direct HTTP/HTTPS links." },
  { name: "Real-time WebSocket Sync", icon: Zap, description: "Instant live progress updates streaming download velocity, accurate ETA calculation, and status changes." },
  { name: "Intelligent Queue Management", icon: Database, description: "Configurable parallel concurrency limits, priority scheduling, automatic retries, and persistence." },
  { name: "FFmpeg Pipeline", icon: Terminal, description: "Lossless muxing of high-res video and audio tracks, container conversion, and audio-only extraction." },
  { name: "Robust Security", icon: Shield, description: "Full SSRF mitigation, private subnet filtering, filename sanitization, and path traversal protection." },
  { name: "Modern Glass UI", icon: Code, description: "Next.js 14, Tailwind CSS, shadcn/ui components, responsive mobile drawer, and vibrant dark palette." },
  { name: "Browser Companion", icon: Download, description: "Manifest V3 Chrome/Edge extension for single-click media capture and background queueing." },
]

const techStack = [
  {
    category: "Backend Services",
    items: ["FastAPI", "Python 3.11+", "yt-dlp", "SQLAlchemy", "SQLite", "FFmpeg", "WebSockets"],
  },
  {
    category: "Frontend Application",
    items: ["Next.js 14 (App Router)", "React 18", "TypeScript", "Tailwind CSS", "shadcn/ui", "Zustand Store"],
  },
  {
    category: "Deployment & Runtime",
    items: ["Docker Container", "Docker Compose", "Uvicorn ASGI", "Windows & Linux Native"],
  },
]

export default function AboutPage() {
  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-10 max-w-5xl space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl gradient-primary shadow-xl p-4 text-white mx-auto animate-pulse-glow">
            <Zap className="h-12 w-12" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold font-heading tracking-tight">
            <span className="gradient-text">OmniDownload</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            A fast, modern, and open-source universal media and file download manager. Built with an extensible plugin architecture, real-time WebSocket progress tracking, and automated audio/video post-processing.
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" size="sm" className="gap-2 text-xs" asChild>
              <Link href="https://github.com/ADITYAKUMARSINGH16/OmniDownloader" target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4" />
                <span>GitHub Repository</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="gap-2 text-xs" asChild>
              <Link href="https://github.com/ADITYAKUMARSINGH16/OmniDownloader" target="_blank" rel="noopener noreferrer">
                <Heart className="h-4 w-4 text-rose-400" />
                <span>Contribute</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="features" className="space-y-6">
          <TabsList className="bg-card/70 border border-border/40 p-1 rounded-xl grid grid-cols-4 w-full max-w-2xl mx-auto">
            <TabsTrigger value="features" className="rounded-lg gap-1.5 text-xs sm:text-sm">
              <Zap className="h-3.5 w-3.5 hidden sm:inline" />
              Features
            </TabsTrigger>
            <TabsTrigger value="tech" className="rounded-lg gap-1.5 text-xs sm:text-sm">
              <Cpu className="h-3.5 w-3.5 hidden sm:inline" />
              Stack
            </TabsTrigger>
            <TabsTrigger value="architecture" className="rounded-lg gap-1.5 text-xs sm:text-sm">
              <Workflow className="h-3.5 w-3.5 hidden sm:inline" />
              Architecture
            </TabsTrigger>
            <TabsTrigger value="legal" className="rounded-lg gap-1.5 text-xs sm:text-sm">
              <Scale className="h-3.5 w-3.5 hidden sm:inline" />
              Legal & License
            </TabsTrigger>
          </TabsList>

          {/* Features Tab */}
          <TabsContent value="features">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => {
                const Icon = feature.icon
                return (
                  <div
                    key={feature.name}
                    className="group rounded-xl border border-border/40 bg-card/60 p-5 hover:border-primary/30 hover:bg-card/90 transition-all duration-300 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h4 className="font-bold text-sm font-heading mb-1.5">{feature.name}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          {/* Tech Stack Tab */}
          <TabsContent value="tech">
            <div className="grid gap-6 md:grid-cols-3">
              {techStack.map((stack) => (
                <Card key={stack.category} className="border-border/40 bg-card/60 shadow-sm backdrop-blur">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-heading">{stack.category}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {stack.items.map((item) => (
                        <span
                          key={item}
                          className="px-2.5 py-1 text-xs rounded-lg bg-primary/10 text-primary border border-primary/20 font-medium"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Architecture Tab */}
          <TabsContent value="architecture" className="space-y-6">
            {/* System Architecture Diagram */}
            <Card className="border-border/40 bg-card/60 shadow-sm backdrop-blur overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg font-heading">System Architecture</CardTitle>
                <CardDescription>High-level component layout and communication flow</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Top Label */}
                <div className="relative rounded-xl border-2 border-primary/30 bg-gradient-to-b from-primary/5 to-transparent p-1">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold tracking-wide uppercase whitespace-nowrap">
                    OmniDownload Core
                  </div>

                  {/* 3-Column Layer */}
                  <div className="grid md:grid-cols-3 gap-3 pt-4 px-2 pb-2">
                    {/* Frontend */}
                    <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                          <Code className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-blue-300">Frontend Web UI</h4>
                          <p className="text-[10px] text-muted-foreground">Next.js 14 &middot; React 18</p>
                        </div>
                      </div>
                      <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                        <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-blue-400 shrink-0" />Interactive Dashboard</li>
                        <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-blue-400 shrink-0" />Live Progress Queue</li>
                        <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-blue-400 shrink-0" />History &amp; File Access</li>
                        <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-blue-400 shrink-0" />Settings Management</li>
                        <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-blue-400 shrink-0" />Format Picker Cards</li>
                        <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-blue-400 shrink-0" />Analytics Dashboard</li>
                      </ul>
                    </div>

                    {/* Backend */}
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                          <Terminal className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-emerald-300">FastAPI Backend</h4>
                          <p className="text-[10px] text-muted-foreground">Python 3.11+ &middot; Uvicorn</p>
                        </div>
                      </div>
                      <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                        <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-emerald-400 shrink-0" />REST API Endpoints</li>
                        <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-emerald-400 shrink-0" />WebSocket Hub</li>
                        <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-emerald-400 shrink-0" />Extractor Registry (13+)</li>
                        <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-emerald-400 shrink-0" />Background Queue Worker</li>
                        <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-emerald-400 shrink-0" />FFmpeg Audio/Video Pipeline</li>
                        <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-emerald-400 shrink-0" />HLS Stream Assembler</li>
                        <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-emerald-400 shrink-0" />SlowAPI Rate Limiter</li>
                        <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-emerald-400 shrink-0" />SQLite Persistence</li>
                      </ul>
                    </div>

                    {/* Extension */}
                    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
                          <Download className="h-4 w-4 text-violet-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-violet-300">Browser Extension</h4>
                          <p className="text-[10px] text-muted-foreground">Manifest V3 &middot; Chrome/Edge</p>
                        </div>
                      </div>
                      <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                        <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-violet-400 shrink-0" />Context Menu Capture</li>
                        <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-violet-400 shrink-0" />Media Interception</li>
                        <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-violet-400 shrink-0" />Queue Forwarding</li>
                        <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-violet-400 shrink-0" />API Key Auth</li>
                      </ul>
                    </div>
                  </div>

                  {/* Connection Indicators */}
                  <div className="hidden md:flex justify-center gap-6 py-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                      <span>HTTP / REST</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>WebSocket</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
                      <span>X-API-Key</span>
                    </div>
                  </div>
                </div>

                {/* Data Flow Layer */}
                <div className="rounded-xl border border-border/30 bg-muted/20 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Database className="h-3.5 w-3.5 text-amber-400" />
                    Data &amp; Storage Layer
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { name: "SQLite DB", desc: "Settings, downloads, history" },
                      { name: "File System", desc: "Media output & temp chunks" },
                      { name: "cookies.txt", desc: "Auth sessions for extractors" },
                      { name: "FFmpeg Binary", desc: "Mux, transcode, HLS assembly" },
                    ].map((item) => (
                      <div key={item.name} className="rounded-lg bg-background/50 border border-border/30 p-2.5 text-center">
                        <div className="text-[11px] font-semibold text-foreground">{item.name}</div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Download Pipeline */}
            <Card className="border-border/40 bg-card/60 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg font-heading">Download Pipeline Sequence</CardTitle>
                <CardDescription>End-to-end flow from URL submission to saved output file</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { step: "1", label: "URL Input", color: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
                    { step: "2", label: "SSRF Check", color: "bg-rose-500/15 text-rose-400 border-rose-500/25" },
                    { step: "3", label: "Registry Lookup", color: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
                    { step: "4", label: "Metadata Analysis", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
                    { step: "5", label: "Format Selection", color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25" },
                    { step: "6", label: "Queue Task", color: "bg-violet-500/15 text-violet-400 border-violet-500/25" },
                    { step: "7", label: "Stream Transfer", color: "bg-orange-500/15 text-orange-400 border-orange-500/25" },
                    { step: "8", label: "FFmpeg Merge", color: "bg-pink-500/15 text-pink-400 border-pink-500/25" },
                    { step: "9", label: "Output File", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" },
                  ].map((item, index) => (
                    <div key={item.step} className="flex items-center gap-1.5">
                      <div className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold whitespace-nowrap", item.color)}>
                        <span className="h-4 w-4 rounded-full bg-current/20 flex items-center justify-center text-[9px] font-bold opacity-80">{item.step}</span>
                        {item.label}
                      </div>
                      {index < 8 && (
                        <svg className="h-3 w-4 text-muted-foreground/50 shrink-0" viewBox="0 0 16 12" fill="none">
                          <path d="M1 6h12M10 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Extractor Registry */}
            <Card className="border-border/40 bg-card/60 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg font-heading">Extractor Registry</CardTitle>
                <CardDescription>Plugin-based site engines registered in the extraction pipeline</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: "YouTube", color: "bg-red-500/10 text-red-400 border-red-500/20" },
                    { name: "Instagram", color: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
                    { name: "Twitter/X", color: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
                    { name: "Reddit", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
                    { name: "Facebook", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
                    { name: "TikTok", color: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20" },
                    { name: "SoundCloud", color: "bg-orange-500/10 text-orange-300 border-orange-500/20" },
                    { name: "Pinterest", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
                    { name: "Vimeo", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
                    { name: "Terabox", color: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
                    { name: "HLS / M3U8", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
                    { name: "Direct HTTP", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
                    { name: "Generic (yt-dlp)", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
                  ].map((ext) => (
                    <span key={ext.name} className={cn("px-2.5 py-1 text-[11px] font-semibold rounded-lg border", ext.color)}>
                      {ext.name}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Legal Tab */}
          <TabsContent value="legal" className="space-y-6">
            <Card className="border-border/40 bg-card/60 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg font-heading">License & Compliance Guidelines</CardTitle>
                <CardDescription>Responsible usage of media downloader software</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-muted-foreground leading-relaxed">
                <p>
                  OmniDownload is designed and distributed for personal archival, fair use educational research, and offline viewing of content you own or have explicit authorization to download.
                </p>
                <div className="p-4 rounded-xl bg-muted/40 border border-border/40 font-mono text-xs text-foreground">
                  <div className="font-semibold text-primary mb-1">MIT License</div>
                  <div>Copyright (c) 2024-2026 Aditya Kumar Singh.</div>
                  <div className="mt-1 text-muted-foreground">
                    Permission is hereby granted, free of charge, to any person obtaining a copy of this software to deal in the Software without restriction.
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}