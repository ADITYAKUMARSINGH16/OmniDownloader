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
              <Link href="https://github.com/omnidownload" target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4" />
                <span>GitHub Repository</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="gap-2 text-xs" asChild>
              <Link href="https://github.com/omnidownload/issues" target="_blank" rel="noopener noreferrer">
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
            <Card className="border-border/40 bg-card/60 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg font-heading">System Pipeline & Extractor Hierarchy</CardTitle>
                <CardDescription>Modular design separating URL extraction, transfer engines, and post-processing</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted/40 p-4 rounded-xl overflow-x-auto text-xs font-mono text-foreground border border-border/30 leading-relaxed">
{`┌─────────────────────────────────────────────────────────────────────────┐
│                           OmniDownload Core                             │
├─────────────────────────┬───────────────────────┬───────────────────────┤
│    Frontend Web UI      │      FastAPI App      │     Extension (MV3)   │
│      (Next.js 14)       │     (Python 3.11)     │      (Chrome/Edge)    │
├─────────────────────────┼───────────────────────┼───────────────────────┤
│ • Interactive Dashboard │ • REST Endpoints      │ • Context Menu Item   │
│ • Live Progress Queue   │ • WebSocket Hub       │ • Media Interception  │
│ • History & File Access │ • Extractor Registry  │ • Queue Forwarding    │
│ • Settings Management   │ • Background Worker   │                       │
│ • Format Picker Cards   │ • FFmpeg Audio/Video  │                       │
│                         │ • SQLite DB Storage   │                       │
└─────────────────────────┴───────────────────────┴───────────────────────┘

Pipeline Sequence:
1. URL Input ➔ 2. SSRF Check ➔ 3. Registry Lookup ➔ 4. Metadata Analysis
5. Format Selection ➔ 6. Queue Task ➔ 7. Stream Transfer ➔ 8. FFmpeg Merge ➔ 9. Output File`}
                </pre>
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
                  <div>Copyright (c) 2024 OmniDownload Contributors.</div>
                  <div className="mt-1 text-muted-foreground">
                    Permission is hereby granted, free of charge, to any person obtaining a copy of this software to deal in the Software without restriction.
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="pt-6 border-t border-border/40 text-center text-xs text-muted-foreground space-y-1">
          <p>Built with ❤️ by OmniDownload open-source community</p>
          <p>
            Powered by yt-dlp, FFmpeg, FastAPI, and Next.js
          </p>
        </div>
      </div>
    </AppShell>
  )
}