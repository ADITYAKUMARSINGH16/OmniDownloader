"use client"

import {
  Globe,
  Youtube,
  Twitter,
  Instagram,
  Facebook,
  HardDrive,
  Link2,
  Music,
  Check,
  ExternalLink,
  Code2,
  Layers,
  Sparkles,
  ArrowRight,
  Zap
} from "lucide-react"
import { Reddit } from "@/components/icons"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AppShell } from "@/components/layout/AppShell"
import Link from "next/link"

const supportedSites = [
  {
    name: "YouTube",
    icon: Youtube,
    color: "text-red-400",
    gradient: "from-red-500/20 to-red-600/5",
    iconBg: "bg-red-500/10 text-red-400 border-red-500/30",
    domains: ["youtube.com", "youtu.be", "music.youtube.com"],
    features: ["Videos (up to 8K)", "Playlists", "Shorts", "YouTube Music", "Live Streams", "Auto Subtitles"],
    description: "Download ultra high-resolution video streams up to 8K 60fps, studio audio extraction, and full playlists with lossless FFmpeg muxing.",
  },
  {
    name: "Reddit",
    icon: Reddit,
    color: "text-orange-400",
    gradient: "from-orange-500/20 to-orange-600/5",
    iconBg: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    domains: ["reddit.com", "v.redd.it"],
    features: ["HLS Video Audio Merge", "GIFs", "Image Galleries", "Single Posts"],
    description: "Autonomous audio and video DASH/HLS merging for native Reddit video players (v.redd.it) and high-resolution albums.",
  },
  {
    name: "Twitter / X",
    icon: Twitter,
    color: "text-sky-400",
    gradient: "from-sky-500/20 to-sky-600/5",
    iconBg: "bg-sky-500/10 text-sky-400 border-sky-500/30",
    domains: ["twitter.com", "x.com"],
    features: ["High Bitrate MP4", "GIF Animations", "Images", "Thread Media"],
    description: "Extract multi-bitrate video clips and animations from tweets, threads, and quote posts with instant resolution picking.",
  },
  {
    name: "Instagram",
    icon: Instagram,
    color: "text-pink-400",
    gradient: "from-pink-500/20 to-rose-600/5",
    iconBg: "bg-pink-500/10 text-pink-400 border-pink-500/30",
    domains: ["instagram.com", "instagr.am"],
    features: ["Reels", "Posts & Carousels", "Stories", "IGTV", "Original Audio"],
    description: "Download public Instagram Reels, standard video posts, and multi-slide carousel media in original upload quality.",
  },
  {
    name: "Facebook",
    icon: Facebook,
    color: "text-blue-400",
    gradient: "from-blue-500/20 to-indigo-600/5",
    iconBg: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    domains: ["facebook.com", "fb.watch"],
    features: ["Watch Videos", "Reels", "Public Posts", "HD Streams"],
    description: "Full support for public Facebook Watch videos, page posts, and short reels in SD and HD resolutions.",
  },
  {
    name: "Terabox",
    icon: HardDrive,
    color: "text-teal-400",
    gradient: "from-teal-500/20 to-emerald-600/5",
    iconBg: "bg-teal-500/10 text-teal-400 border-teal-500/30",
    domains: ["terabox.com", "teraboxapp.com", "1024terabox.com"],
    features: ["Direct Cloud Links", "Large Archives", "MP4 Media", "Bypass Wait"],
    description: "Resolve and stream direct downloads from Terabox cloud storage shares without requiring slow proprietary client software.",
  },
  {
    name: "JioSaavn",
    icon: Music,
    color: "text-emerald-400",
    gradient: "from-emerald-500/20 to-teal-600/5",
    iconBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    domains: ["jiosaavn.com", "saavn.com"],
    features: ["Songs (up to 320kbps)", "Featured Playlists", "Albums", "Artist Collections", "M4A Lossless"],
    description: "Lossless studio audio extraction with full album art metadata, featuring 320kbps streams and batch playlist ingestion.",
  },
  {
    name: "Spotify",
    icon: Music,
    color: "text-green-400",
    gradient: "from-green-500/20 to-emerald-600/5",
    iconBg: "bg-green-500/10 text-green-400 border-green-500/30",
    domains: ["spotify.com", "open.spotify.com"],
    features: ["Tracks", "Playlists", "Albums", "Lossless ID3 Tags", "320kbps MP3", "High-Res Artwork"],
    description: "Intelligent Spotify track and playlist ingestion with high-bitrate audio stream matching, 640x640 album artwork, and automated ID3 tagging.",
  },
  {
    name: "Direct HTTP/S Links",
    icon: Link2,
    color: "text-accent-primary",
    gradient: "from-accent-primary/20 to-accent-secondary/5",
    iconBg: "bg-accent-primary/10 text-accent-primary border-accent-primary/30",
    domains: ["Any HTTP / HTTPS Endpoint"],
    features: ["Resume Range Requests", "Chunked Transfers", "Zip & ISO", "Raw Media"],
    description: "Universal direct downloader with multipart 32-thread chunk acceleration, HTTP Range resume support, and mime auto-detection.",
  },
]

export default function SitesPage() {
  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/40">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] bg-accent-primary/10 border border-accent-primary/25 text-accent-primary shadow-sm mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>MODULAR EXTRACTOR PROTOCOLS // 1,000+ SITES</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-heading text-foreground">
              Supported Platforms & <span className="bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-velocity bg-clip-text text-transparent">Stream Adapters</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Extensible extractor architecture powered by yt-dlp and custom stream sniffers, allowing direct unthrottled downloads from all major media sources.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-accent-primary hover:bg-accent-primary/90 text-white shadow-[0_0_20px_rgba(var(--accent-primary)/0.35)] transition-all"
            >
              <Zap className="h-4 w-4" />
              <span>Paste A Link</span>
            </Link>
          </div>
        </div>

        {/* Platform Cards Grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {supportedSites.map((site) => {
            const Icon = site.icon
            return (
              <div
                key={site.name}
                className="omni-glass-card group relative rounded-2xl border border-border/50 bg-surface/70 p-6 transition-all duration-300 shadow-xl hover:border-accent-primary/40 hover:shadow-2xl flex flex-col justify-between overflow-hidden"
              >
                {/* Background ambient radial glow */}
                <div
                  className={cn(
                    "absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-15 blur-3xl bg-gradient-to-br transition-opacity group-hover:opacity-35",
                    site.gradient
                  )}
                />

                <div className="relative space-y-4">
                  {/* Card Title & Icon */}
                  <div className="flex items-center gap-3.5">
                    <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center border shadow-md shrink-0", site.iconBg)}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg font-heading text-foreground group-hover:text-accent-primary transition-colors">
                        {site.name}
                      </h3>
                      <p className="text-[11px] font-mono text-muted-foreground truncate max-w-[210px]">
                        {site.domains.slice(0, 2).join(", ")}
                        {site.domains.length > 2 && "..."}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {site.description}
                  </p>

                  {/* Feature Badges */}
                  <div className="space-y-2 pt-1 border-t border-border/30">
                    <span className="text-[9.5px] font-mono font-bold uppercase tracking-[0.16em] text-muted-foreground/70 block">
                      CAPABILITIES
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {site.features.map((feature) => (
                        <span
                          key={feature}
                          className="px-2.5 py-1 text-[10.5px] rounded-lg bg-elevated/60 text-foreground border border-border/40 group-hover:border-accent-primary/30 transition-colors"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Developer Plugin Architecture Card */}
        <div className="omni-glass-card rounded-2xl border border-border/60 bg-surface/70 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent-primary/10 border border-accent-primary/25 text-accent-primary shadow-sm">
                <Code2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-heading text-foreground">Extending Site Extractors</h3>
                <p className="text-xs text-muted-foreground">
                  How to add native stream extractors to OmniDownload&apos;s plugin pipeline
                </p>
              </div>
            </div>
            <a
              href="https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface border border-border/60 text-foreground hover:bg-elevated transition-all w-fit shadow-xs"
            >
              <span>1000+ yt-dlp Sites</span>
              <ExternalLink className="h-3.5 w-3.5 text-accent-velocity" />
            </a>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Adding support for a new custom streaming site or proprietary cloud storage service is straightforward. All extractors inherit from the base extractor interface and register themselves automatically:
            </p>
            <div className="bg-elevated/80 rounded-xl p-4 sm:p-5 border border-border/60 font-mono text-xs text-foreground/80 space-y-2 overflow-x-auto shadow-inner">
              <div className="text-emerald-400 font-semibold">{"// 1. Create file backend/extractors/custom_site.py"}</div>
              <div><span className="text-accent-secondary">class</span> <span className="text-accent-velocity">CustomSiteExtractor</span>(<span className="text-accent-primary">BaseExtractor</span>):</div>
              <div className="pl-4"><span className="text-accent-secondary">def</span> <span className="text-amber-400">supports</span>(self, url: str) -&gt; bool: ...</div>
              <div className="pl-4"><span className="text-accent-secondary">async def</span> <span className="text-amber-400">_extract_info</span>(self, url: str) -&gt; MediaMetadata: ...</div>
              <div className="text-emerald-400 font-semibold pt-2">{"// 2. Register in extractor registry"}</div>
              <div><span className="text-accent-primary">ExtractorRegistry</span>.<span className="text-amber-400">register</span>(<span className="text-accent-velocity">CustomSiteExtractor</span>())</div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}