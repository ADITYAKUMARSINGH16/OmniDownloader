"use client"

import { useState, useEffect } from "react"
import { X, Play, Music, Film, Copy, Check, FolderOpen, ExternalLink, Activity, Info, Volume2, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api } from "@/services/api"
import { MediaProbeResponse } from "@/types"
import { formatBytes } from "@/lib/utils"

interface CyberneticMediaPlayerProps {
  download: {
    id: string
    title?: string
    filename?: string
    output_path?: string
    thumbnail?: string
    content_type?: string
    extension?: string
  } | null
  onClose: () => void
}

export function CyberneticMediaPlayer({ download, onClose }: CyberneticMediaPlayerProps) {
  const [probe, setProbe] = useState<MediaProbeResponse | null>(null)
  const [isLoadingProbe, setIsLoadingProbe] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!download) return

    let isMounted = true
    setIsLoadingProbe(true)

    api.getMediaProbe(download.id)
      .then((data) => {
        if (isMounted) setProbe(data)
      })
      .catch((err) => {
        console.warn("Probe metadata unavailable:", err)
      })
      .finally(() => {
        if (isMounted) setIsLoadingProbe(false)
      })

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      isMounted = false
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [download, onClose])

  if (!download) return null

  const isAudio = download.content_type === "audio" || ["mp3", "m4a", "flac", "wav", "aac", "opus"].includes(download.extension?.toLowerCase() || "")
  const streamUrl = api.getStreamUrl(download.id)

  const videoStream = probe?.streams?.find((s) => s.codec_type === "video")
  const audioStream = probe?.streams?.find((s) => s.codec_type === "audio")
  const formatInfo = probe?.format

  const handleCopyPath = () => {
    if (download.output_path) {
      navigator.clipboard.writeText(download.output_path)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleOpenFolder = async () => {
    try {
      await api.openFolder(download.id, download.output_path)
    } catch (err) {
      console.error("Open folder error:", err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="omni-glass-card relative w-full max-w-4xl rounded-2xl border border-accent-primary/40 bg-surface/95 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40 bg-elevated/40">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <div className="w-8 h-8 rounded-lg bg-accent-primary flex items-center justify-center text-white shrink-0 shadow-sm">
              {isAudio ? <Music className="w-4 h-4" /> : <Film className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm md:text-base font-bold text-foreground truncate">
                {download.title || download.filename || "Media Preview"}
              </h3>
              <p className="text-[11px] text-muted-foreground truncate">
                HTTP/1.1 Range Streaming • {download.filename || download.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {download.output_path && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPath}
                className="h-8 text-xs gap-1.5 rounded-lg border-border/50 hover:border-primary/40"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Path Copied" : "Copy Path"}
              </Button>
            )}

            {download.output_path && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenFolder}
                className="h-8 text-xs gap-1.5 rounded-lg border-border/50 hover:border-primary/40 hidden sm:flex"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Open Folder
              </Button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-border/40 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive flex items-center justify-center transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Media Playback Area */}
        <div className="relative bg-black flex items-center justify-center overflow-hidden min-h-[260px] max-h-[55vh]">
          {isAudio ? (
            <div className="w-full p-8 flex flex-col items-center justify-center space-y-6">
              <div className="relative w-32 h-32 rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-tr from-accent-primary via-accent-secondary to-accent-velocity flex items-center justify-center group">
                {download.thumbnail ? (
                  <img
                    src={download.thumbnail}
                    alt="Album Art"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Music className="w-12 h-12 text-white animate-pulse" />
                )}
                <div className="absolute inset-0 bg-black/20" />
              </div>

              <div className="w-full max-w-lg space-y-2">
                <audio
                  src={streamUrl}
                  controls
                  autoPlay
                  className="w-full accent-primary shadow-lg rounded-lg"
                />
              </div>
            </div>
          ) : (
            <video
              src={streamUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full max-h-[55vh] object-contain shadow-2xl"
            />
          )}
        </div>

        {/* Live Codec & Container Telemetry HUD */}
        <div className="p-4 border-t border-border/40 bg-accent/10 space-y-3 overflow-y-auto">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-primary" />
              Stream Probe Telemetry
            </span>
            <a
              href={streamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-primary hover:underline flex items-center gap-1"
            >
              Direct HTTP Stream <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs">
            {/* Container Format */}
            <div className="p-2.5 rounded-xl border border-border/30 bg-card/60 backdrop-blur-xs flex flex-col">
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Container</span>
              <span className="font-bold text-foreground mt-0.5 truncate">
                {formatInfo?.format_name?.toUpperCase() || download.extension?.toUpperCase() || "UNKNOWN"}
              </span>
            </div>

            {/* Video Codec */}
            {videoStream && (
              <div className="p-2.5 rounded-xl border border-border/30 bg-card/60 backdrop-blur-xs flex flex-col">
                <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Video Codec</span>
                <span className="font-bold text-foreground mt-0.5 truncate">
                  {videoStream.codec_name?.toUpperCase() || "RAW"}
                </span>
              </div>
            )}

            {/* Resolution */}
            {videoStream && videoStream.width && videoStream.height && (
              <div className="p-2.5 rounded-xl border border-border/30 bg-card/60 backdrop-blur-xs flex flex-col">
                <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Resolution</span>
                <span className="font-bold text-foreground mt-0.5">
                  {videoStream.width}×{videoStream.height}
                </span>
              </div>
            )}

            {/* Audio Codec */}
            {audioStream && (
              <div className="p-2.5 rounded-xl border border-border/30 bg-card/60 backdrop-blur-xs flex flex-col">
                <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Audio Codec</span>
                <span className="font-bold text-foreground mt-0.5 truncate">
                  {audioStream.codec_name?.toUpperCase() || "AUDIO"}
                </span>
              </div>
            )}

            {/* Channels & Sample Rate */}
            {audioStream && (
              <div className="p-2.5 rounded-xl border border-border/30 bg-card/60 backdrop-blur-xs flex flex-col">
                <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Sample Rate</span>
                <span className="font-bold text-foreground mt-0.5">
                  {audioStream.sample_rate ? `${Math.round(parseInt(audioStream.sample_rate) / 1000)} kHz` : "Standard"}
                  {audioStream.channels ? ` • ${audioStream.channels}ch` : ""}
                </span>
              </div>
            )}

            {/* Bitrate / Size */}
            <div className="p-2.5 rounded-xl border border-border/30 bg-card/60 backdrop-blur-xs flex flex-col">
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Bitrate</span>
              <span className="font-bold text-foreground mt-0.5 truncate">
                {formatInfo?.bit_rate ? `${Math.round(parseInt(formatInfo.bit_rate) / 1000)} kbps` : "Adaptive"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
