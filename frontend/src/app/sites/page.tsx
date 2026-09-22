"use client"

import {
  Globe,
  Youtube,
  Twitter,
  Instagram,
  Facebook,
  HardDrive,
  Link2,
  Check,
  ExternalLink,
  Code2,
  Layers,
  Sparkles
} from "lucide-react"
import { Reddit } from "@/components/icons"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AppShell } from "@/components/layout/AppShell"

const supportedSites = [
  {
    name: "YouTube",
    icon: Youtube,
    color: "text-red-400",
    gradient: "from-red-500/20 to-red-600/5",
    iconBg: "bg-red-500/10 text-red-400 border-red-500/20",
    domains: ["youtube.com", "youtu.be", "youtube-nocookie.com", "music.youtube.com"],
    features: ["Videos (up to 8K)", "Playlists", "Shorts", "YouTube Music", "Live Streams", "Auto Subtitles"],
    description: "Download high-resolution video streams up to 8K 60fps, audio extraction, and full playlists with automatic FFmpeg merging.",
  },
  {
    name: "Reddit",
    icon: Reddit,
    color: "text-orange-400",
    gradient: "from-orange-500/20 to-orange-600/5",
    iconBg: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    domains: ["reddit.com", "v.redd.it"],
    features: ["HLS Video Audio Merge", "GIFs", "Image Galleries", "Single Posts"],
    description: "Full audio/video dash merging for native Reddit video players (v.redd.it) and high-res image albums.",
  },
  {
    name: "Twitter / X",
    icon: Twitter,
    color: "text-sky-400",
    gradient: "from-sky-500/20 to-sky-600/5",
    iconBg: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    domains: ["twitter.com", "x.com"],
    features: ["High Bitrate MP4", "GIF Animations", "Images", "Thread Media"],
    description: "Extract multi-bitrate video clips and animations from posts, tweets, and quote tweets with instant resolution picking.",
  },
  {
    name: "Instagram",
    icon: Instagram,
    color: "text-pink-400",
    gradient: "from-pink-500/20 to-rose-600/5",
    iconBg: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    domains: ["instagram.com", "instagr.am"],
    features: ["Reels", "Posts & Carousels", "Stories", "IGTV", "Original Audio"],
    description: "Download public Instagram Reels, standard video posts, and carousel media in original upload quality.",
  },
  {
    name: "Facebook",
    icon: Facebook,
    color: "text-blue-400",
    gradient: "from-blue-500/20 to-indigo-600/5",
    iconBg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    domains: ["facebook.com", "fb.watch"],
    features: ["Watch Videos", "Reels", "Public Posts", "HD Streams"],
    description: "Support for public Facebook Watch videos, page posts, and short reels in SD and HD resolutions.",
  },
  {
    name: "Terabox",
    icon: HardDrive,
    color: "text-teal-400",
    gradient: "from-teal-500/20 to-emerald-600/5",
    iconBg: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    domains: ["terabox.com", "teraboxapp.com", "1024terabox.com", "freeterabox.com"],
    features: ["Direct Cloud Links", "Large Archives", "MP4 Media", "Bypass Wait"],
    description: "Resolve and stream direct downloads from Terabox cloud storage shares without requiring slow proprietary clients.",
  },
  {
    name: "Direct Links",
    icon: Link2,
    color: "text-violet-400",
    gradient: "from-violet-500/20 to-purple-600/5",
    iconBg: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    domains: ["Any HTTP / HTTPS URL"],
    features: ["Resume Range Requests", "Chunked Transfers", "Zip & Iso", "Raw Media"],
    description: "Universal direct downloader with multipart chunk acceleration, HTTP Range resume support, and mime detection.",
  },
]

export default function SitesPage() {
  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl space-y-8">
        {/* Header */}
        <div className="pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl gradient-primary shadow-sm text-white inline-flex">
              <Globe className="h-6 w-6" />
            </span>
            <h1 className="text-3xl font-bold font-heading tracking-tight">Supported Platforms</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            OmniDownload features an extensible modular extractor architecture powered by yt-dlp and custom parsers,
            allowing direct high-speed downloads from all major media platforms.
          </p>
        </div>

        {/* Platform Cards Grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {supportedSites.map((site) => {
            const Icon = site.icon
            return (
              <div
                key={site.name}
                className="group relative rounded-xl border border-border/40 bg-card/60 hover:bg-card/90 hover:border-primary/30 p-5 transition-all duration-300 shadow-sm flex flex-col justify-between overflow-hidden"
              >
                {/* Background glow */}
                <div
                  className={cn(
                    "absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-20 blur-3xl bg-gradient-to-br transition-opacity group-hover:opacity-40",
                    site.gradient
                  )}
                />

                <div className="relative space-y-4">
                  {/* Card Title & Icon */}
                  <div className="flex items-center gap-3">
                    <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center border shadow-sm", site.iconBg)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg font-heading group-hover:text-primary transition-colors">
                        {site.name}
                      </h3>
                      <p className="text-[11px] font-mono text-muted-foreground truncate max-w-[200px]">
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
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Features
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {site.features.map((feature) => (
                        <span
                          key={feature}
                          className="px-2 py-0.5 text-[11px] rounded-md bg-muted/60 text-foreground/80 border border-border/40 group-hover:border-primary/20 transition-colors"
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
        <Card className="border-border/40 bg-card/60 shadow-sm backdrop-blur overflow-hidden">
          <CardHeader className="border-b border-border/30 bg-muted/20 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Code2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-heading">Extending Site Extractors</CardTitle>
                  <CardDescription className="text-xs">
                    How to add native extractors to OmniDownload's plugin pipeline
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                asChild
              >
                <a
                  href="https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>1000+ yt-dlp Sites</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Adding support for a new custom site or proprietary cloud storage service is simple. All extractors inherit from the base extractor interface and register themselves automatically on server startup:
            </p>
            <div className="bg-muted/40 rounded-xl p-4 border border-border/40 font-mono text-xs text-muted-foreground space-y-2">
              <div className="text-emerald-400 font-semibold">// 1. Create file backend/extractors/custom_site.py</div>
              <div>class CustomSiteExtractor(BaseExtractor):</div>
              <div className="pl-4">def supports(self, url: str) -&gt; bool: ...</div>
              <div className="pl-4">async def _extract_info(self, url: str) -&gt; MediaMetadata: ...</div>
              <div className="text-emerald-400 font-semibold pt-1">// 2. Register in extractor registry</div>
              <div>ExtractorRegistry.register(CustomSiteExtractor())</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}