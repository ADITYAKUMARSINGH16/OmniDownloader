"use client"

import { useState, useEffect, useRef } from "react"
import { Download, Loader2, AlertCircle, CheckCircle, XCircle, PauseCircle, Clock, Trash2, RotateCcw, FolderOpen, Copy, ExternalLink, Play, ArrowDownToLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatBytes, formatSpeed, formatETA, getStatusColor } from "@/lib/utils"
import { DownloadInfo, DownloadStatus } from "@/types"
import { useDownloadStore } from "@/hooks/useStore"
import { api } from "@/services/api"
import { cn } from "@/lib/utils"
import { CyberneticMediaPlayer } from "./CyberneticMediaPlayer"

function DownloadItem({ download, onPlay }: { download: DownloadInfo; onPlay?: (d: DownloadInfo) => void }) {
  const { updateDownload, removeDownload } = useDownloadStore()
  const cardRef = useRef<HTMLDivElement>(null)
  const isActive = ["downloading", "queued"].includes(download.status)
  const isCompleted = download.status === "completed"
  const isFailed = download.status === "failed"
  const isMuxing = download.status === "downloading" && download.progress >= 99

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    cardRef.current.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`)
    cardRef.current.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`)
  }

  const handlePause = async () => {
    try {
      await api.pauseDownload(download.id)
      updateDownload(download.id, { status: "paused" })
    } catch (e) {
      console.error("Failed to pause:", e)
    }
  }

  const handleResume = async () => {
    try {
      await api.resumeDownload(download.id)
      updateDownload(download.id, { status: "downloading" })
    } catch (e) {
      console.error("Failed to resume:", e)
    }
  }

  const handleCancel = async () => {
    try {
      await api.cancelDownload(download.id)
      updateDownload(download.id, { status: "cancelled" })
    } catch (e) {
      console.error("Failed to cancel:", e)
    }
  }

  const handleRetry = async () => {
    try {
      await api.retryDownload(download.id)
      updateDownload(download.id, { status: "queued", progress: 0, error: undefined })
    } catch (e) {
      console.error("Failed to retry:", e)
    }
  }

  const handleDelete = async () => {
    try {
      await api.deleteDownload(download.id)
      removeDownload(download.id)
    } catch (e) {
      console.error("Failed to delete:", e)
    }
  }

  const handleOpenFolder = async () => {
    try {
      await api.openFolder(download.id, download.output_path)
    } catch (e) {
      console.error("Failed to open folder:", e)
    }
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(download.url)
  }

  const handleOpenSource = () => {
    window.open(download.url, "_blank")
  }

  const statusConfig = {
    downloading: { icon: Loader2, label: "Downloading", dotColor: "bg-accent-velocity", animate: true },
    completed: { icon: CheckCircle, label: "Completed", dotColor: "bg-emerald-400", animate: false },
    failed: { icon: XCircle, label: "Failed", dotColor: "bg-red-400", animate: false },
    paused: { icon: PauseCircle, label: "Paused", dotColor: "bg-amber-400", animate: false },
    queued: { icon: Clock, label: "Queued", dotColor: "bg-slate-400", animate: false },
    cancelled: { icon: XCircle, label: "Cancelled", dotColor: "bg-slate-400", animate: false },
    scheduled: { icon: Clock, label: "Scheduled", dotColor: "bg-accent-primary", animate: false },
  }

  const status = statusConfig[download.status] || statusConfig.queued

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={cn(
        "omni-glass-card relative group rounded-xl border transition-all duration-300 overflow-hidden",
        isActive ? "border-accent-primary/30 bg-surface/80" : "border-border/40 bg-surface/50",
        isMuxing && "border-accent-muxing/50 bg-accent-muxing/[0.04]",
        "hover:border-accent-primary/40 hover:shadow-xl"
      )}
    >
      {/* Active download top gradient line */}
      {download.status === "downloading" && (
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-[2.5px] transition-all",
            isMuxing
              ? "bg-accent-muxing animate-mux-pulse shadow-[0_0_12px_rgba(var(--accent-muxing)/0.8)]"
              : "bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-velocity animate-progress-gradient"
          )}
          style={{ backgroundSize: "200% 100%" }}
        />
      )}
      {isCompleted && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-accent-velocity" />
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Thumbnail */}
          {download.thumbnail ? (
            <div className="relative h-16 w-28 flex-shrink-0 rounded-lg overflow-hidden bg-muted/50 shadow-sm border border-border/40">
              <img
                src={download.thumbnail}
                alt={download.title || "Thumbnail"}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              {/* Progress overlay on thumbnail */}
              {download.status === "downloading" && download.progress > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                  <div
                    className={cn(
                      "h-full transition-all duration-300",
                      isMuxing
                        ? "bg-accent-muxing"
                        : "bg-gradient-to-r from-accent-primary to-accent-velocity"
                    )}
                    style={{ width: `${Math.min(99, download.progress)}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="h-16 w-28 flex-shrink-0 rounded-lg bg-surface flex items-center justify-center border border-border/40">
              <ArrowDownToLine className="h-6 w-6 text-muted-foreground/40" />
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm leading-snug line-clamp-1">{download.title || download.filename || "Unknown"}</h4>
                <p className="text-xs text-muted-foreground/70 truncate mt-0.5 font-mono">{download.url}</p>
              </div>
              
              {/* More Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="sr-only">More options</span>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="5" r="1" />
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="12" cy="19" r="1" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleOpenFolder} disabled={!download.output_path}>
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Open Folder
                  </DropdownMenuItem>
                  {download.output_path && (
                    <DropdownMenuItem onClick={() => window.open(api.getDownloadFileUrl(download.id), "_blank")}>
                      <Download className="mr-2 h-4 w-4" />
                      Save / Open File
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleCopyUrl}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy URL
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleOpenSource}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Source
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Status + Stats Row */}
            <div className="mt-2.5 flex items-center gap-2 text-xs flex-wrap">
              {/* Status badge */}
              {isMuxing ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold text-xs bg-accent-muxing/15 text-accent-muxing border border-accent-muxing/30 animate-mux-pulse shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-muxing animate-ping" />
                  ⚡ Muxing Streams (99%)
                </span>
              ) : (
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium text-xs border border-border/40",
                  getStatusColor(download.status)
                )}>
                  {status.animate ? (
                    <span className={cn("h-1.5 w-1.5 rounded-full animate-dot-pulse", status.dotColor)} />
                  ) : (
                    <status.icon className="h-3 w-3" />
                  )}
                  {status.label}
                </span>
              )}

              {/* Download stats */}
              {download.file_size > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-elevated/80 border border-border/40 font-mono tabular-nums text-[11px] text-muted-foreground">
                  {formatBytes(download.downloaded_size)} / {formatBytes(download.file_size)}
                </span>
              )}
              
              {download.speed > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-accent-velocity/10 border border-accent-velocity/20 font-mono tabular-nums text-[11px] text-accent-velocity font-semibold flex items-center gap-1">
                  ▼ {formatSpeed(download.speed)}
                </span>
              )}
              
              {download.eta > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-elevated/80 border border-border/40 font-mono tabular-nums text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatETA(download.eta)}
                </span>
              )}
            </div>

            {/* Dual-Layer Progress bar for active downloads */}
            {isActive && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className={cn(
                    "font-medium transition-colors",
                    isMuxing ? "text-accent-muxing font-semibold animate-mux-pulse flex items-center gap-1" : "text-muted-foreground"
                  )}>
                    {isMuxing
                      ? "⚡ MUXING AUDIO & VIDEO STREAMS (99%)"
                      : download.status === "downloading"
                      ? "Downloading streams..."
                      : "Waiting in queue..."}
                  </span>
                  <span className={cn(
                    "font-mono tabular-nums font-bold",
                    isMuxing ? "text-accent-muxing" : "text-foreground"
                  )}>
                    {download.status === "downloading"
                      ? `${Math.min(99, Math.round(download.progress))}%`
                      : `${Math.round(download.progress)}%`}
                  </span>
                </div>

                {/* Primary Progress Track */}
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface border border-border/50">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300 relative",
                      isMuxing
                        ? "bg-accent-muxing animate-mux-pulse shadow-[0_0_12px_rgba(var(--accent-muxing)/0.7)]"
                        : "bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-velocity shadow-[0_0_10px_rgba(var(--accent-velocity)/0.5)]"
                    )}
                    style={{ width: `${Math.max(2, Math.min(download.status === "downloading" ? 99 : 100, download.progress))}%` }}
                  >
                    {/* Specular shimmer overlay sweep */}
                    {download.status === "downloading" && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer-fast" />
                    )}
                  </div>
                </div>

                {/* 16-Segment Micro-LED Hardware Track */}
                {download.status === "downloading" && (
                  <div className="flex gap-1 w-full pt-0.5">
                    {Array.from({ length: 16 }).map((_, idx) => {
                      const isLit = download.progress >= (idx + 1) * 6.25
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "h-1 flex-1 rounded-[1.5px] transition-all duration-200",
                            isMuxing
                              ? (isLit ? "bg-accent-muxing/90 shadow-[0_0_6px_rgba(var(--accent-muxing)/0.6)]" : "bg-elevated/40 border border-border/30")
                              : isLit
                              ? "bg-accent-velocity shadow-[0_0_6px_rgba(var(--accent-velocity)/0.5)]"
                              : "bg-elevated/50 border border-border/30"
                          )}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {download.error && (
              <div className="mt-2.5 text-xs text-destructive flex items-center gap-1.5 p-2 rounded-lg bg-destructive/10">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="line-clamp-1">{download.error}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-3 flex gap-2">
              {download.status === "downloading" && (
                <Button variant="outline" size="sm" onClick={handlePause} className="h-7 text-xs rounded-lg">
                  <PauseCircle className="mr-1 h-3.5 w-3.5" />
                  Pause
                </Button>
              )}
              {download.status === "paused" && (
                <Button size="sm" onClick={handleResume} className="h-7 text-xs rounded-lg gradient-primary text-white border-0">
                  <Play className="mr-1 h-3.5 w-3.5" />
                  Resume
                </Button>
              )}
              {["queued", "downloading", "paused"].includes(download.status) && (
                <Button variant="outline" size="sm" onClick={handleCancel} className="h-7 text-xs rounded-lg text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10">
                  <XCircle className="mr-1 h-3.5 w-3.5" />
                  Cancel
                </Button>
              )}
              {isFailed && (
                <>
                  <Button variant="outline" size="sm" onClick={handleRetry} className="h-7 text-xs rounded-lg">
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                    Retry
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDelete} className="h-7 text-xs rounded-lg text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10">
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Remove
                  </Button>
                </>
              )}
              {(isCompleted || download.status === "cancelled") && (
                <>
                  {isCompleted && (
                    <Button size="sm" onClick={() => onPlay?.(download)} className="h-7 text-xs rounded-lg gradient-primary text-white border-0 shadow-xs hover:opacity-95">
                      <Play className="mr-1 h-3.5 w-3.5 fill-white" />
                      Play / Preview
                    </Button>
                  )}
                  {download.output_path && (
                    <Button variant="outline" size="sm" onClick={handleOpenFolder} className="h-7 text-xs rounded-lg">
                      <FolderOpen className="mr-1 h-3.5 w-3.5" />
                      Open Folder
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleDelete} className="h-7 text-xs rounded-lg text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10">
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Remove
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DownloadQueue({ compact = false }: { compact?: boolean }) {
  const { queue, setQueue, updateDownload } = useDownloadStore()
  const [isLoading, setIsLoading] = useState(true)
  const [showAllCompleted, setShowAllCompleted] = useState(!compact)
  const [playingDownload, setPlayingDownload] = useState<DownloadInfo | null>(null)
  const [isRetryingAll, setIsRetryingAll] = useState(false)
  const [isClearingAll, setIsClearingAll] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleRetryAllFailed = async () => {
    setIsRetryingAll(true)
    try {
      await api.retryAllFailed()
      const current = useDownloadStore.getState().queue
      setQueue(current.map(d => d.status === "failed" ? { ...d, status: "queued", error: undefined, progress: 0 } : d))
    } catch (err) {
      console.error("Failed to retry all:", err)
    } finally {
      setIsRetryingAll(false)
    }
  }

  const handleClearAllFailed = async () => {
    setIsClearingAll(true)
    try {
      await api.clearAllFailed()
      const current = useDownloadStore.getState().queue
      setQueue(current.filter(d => d.status !== "failed"))
    } catch (err) {
      console.error("Failed to clear all:", err)
    } finally {
      setIsClearingAll(false)
    }
  }

  // Connect WebSocket for real-time progress updates
  useEffect(() => {
    const clientId = `queue-${Date.now()}`

    if (typeof window === "undefined") return

    const apiBase = process.env.NEXT_PUBLIC_API_URL || ""
    let wsUrl: string
    if (apiBase.startsWith("http")) {
      wsUrl = `${apiBase.replace(/^http/, "ws")}/ws/${clientId}`
    } else {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      const host = window.location.hostname || "localhost"
      wsUrl = `${protocol}//${host}:8000/api/ws/${clientId}`
    }

    let attempts = 0

    function connect() {
      try {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          attempts = 0
          const currentQueue = useDownloadStore.getState().queue
          currentQueue.forEach((d) => {
            if (d.status === "downloading" || d.status === "queued") {
              ws.send(JSON.stringify({ type: "subscribe", download_id: d.id }))
            }
          })
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            const downloadId = data.download_id || data.id
            if (data.type === "progress" && downloadId) {
              const currentQueue = useDownloadStore.getState().queue
              const existing = currentQueue.find((d) => d.id === downloadId)

              const incomingStatus = (data.status || existing?.status || "downloading") as DownloadStatus
              const isActive = incomingStatus === "downloading"

              // 1. Handle progress clamping while allowing 99% during FFmpeg post-processing (when speed === 0)
              let nextProgress = existing?.progress || 0
              if (incomingStatus === "completed") {
                nextProgress = 100
              } else if (incomingStatus === "paused" || incomingStatus === "failed") {
                nextProgress = (data.progress != null && data.progress > 0) ? data.progress : (existing?.progress || 0)
              } else if (isActive && typeof data.progress === "number") {
                const isPostProcessing = data.progress >= 99 && (data.speed === 0 || !data.speed)
                if (isPostProcessing) {
                  nextProgress = 99
                } else if (data.progress < 99) {
                  const validExisting = (existing?.progress && existing.progress < 99) ? existing.progress : 0
                  nextProgress = Math.min(98.9, Math.max(validExisting, data.progress))
                }
              }

              // 2. Prevent downloaded_size from locking to 100% when a download is restarting or in-progress
              const incomingDownloaded = data.downloaded_size ?? data.downloaded ?? 0
              const incomingFileSize = data.file_size ?? data.total ?? 0

              let nextDownloadedSize = incomingDownloaded
              if (isActive) {
                const hasStaleFullDownload = (existing?.downloaded_size || 0) >= (existing?.file_size || Infinity) && nextProgress < 98
                const validExistingDownloaded = hasStaleFullDownload ? 0 : (existing?.downloaded_size || 0)
                nextDownloadedSize = Math.max(validExistingDownloaded, incomingDownloaded)
              } else if (incomingStatus === "completed") {
                nextDownloadedSize = incomingDownloaded || existing?.downloaded_size || incomingFileSize || 0
              } else {
                nextDownloadedSize = incomingDownloaded || existing?.downloaded_size || 0
              }

              // 3. Dynamically grow file_size if actual stream bytes exceed initial estimate (fixes 219.68 MB / 2.88 MB)
              const nextFileSize = Math.max(
                existing?.file_size || 0,
                incomingFileSize,
                nextDownloadedSize
              )

              // 4. If byte telemetry was omitted by extractor/protocol, accurately interpolate from progress percentage
              if (isActive && nextDownloadedSize === 0 && nextFileSize > 0 && nextProgress > 0) {
                nextDownloadedSize = Math.round((nextProgress / 100) * nextFileSize)
              }
              if (incomingStatus === "completed" && nextFileSize > 0) {
                nextDownloadedSize = nextFileSize
              }

              // 5. Zero out speed and ETA during post-processing (99%) or terminal/paused states
              const isMuxing = isActive && nextProgress >= 99 && !data.speed
              const nextSpeed = (!isActive || isMuxing) ? 0 : (data.speed ?? existing?.speed ?? 0)
              const nextEta = (!isActive || isMuxing) ? 0 : (data.eta ?? existing?.eta ?? 0)

              const updates: Partial<DownloadInfo> = {
                status: incomingStatus,
                progress: nextProgress,
                downloaded_size: nextDownloadedSize,
                file_size: nextFileSize,
                speed: nextSpeed,
                eta: nextEta,
              }
              if (data.error != null) updates.error = data.error
              if (data.filename != null) updates.filename = data.filename
              if (data.output_path != null) updates.output_path = data.output_path
              updateDownload(downloadId, updates)

              // Browser System Notification
              if (typeof window !== "undefined" && "Notification" in window) {
                if (data.status === "completed" && Notification.permission === "granted") {
                  new Notification("OmniDownloader: Download Complete 🎉", {
                    body: "Your media download has finished successfully!",
                    icon: "/favicon.ico",
                  })
                } else if (data.status === "failed" && Notification.permission === "granted") {
                  new Notification("OmniDownloader: Download Failed ❌", {
                    body: data.error || "A download encountered an error.",
                    icon: "/favicon.ico",
                  })
                }
              }
            }
          } catch {
            // ignore parse errors
          }
        }

        ws.onclose = () => {
          wsRef.current = null
          if (attempts < 5) {
            attempts++
            reconnectTimerRef.current = setTimeout(connect, 2000 * attempts)
          }
        }

        ws.onerror = () => {
          // onclose will fire after this
        }
      } catch {
        if (attempts < 5) {
          attempts++
          reconnectTimerRef.current = setTimeout(connect, 2000 * attempts)
        }
      }
    }

    connect()

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [updateDownload])

  // Poll the queue from the DB as a fallback (every 3 seconds) with live state merge
  useEffect(() => {
    const loadQueue = async () => {
      try {
        const data = await api.getQueue()
        const currentQueue = useDownloadStore.getState().queue
        const merged = data.downloads.map((serverItem) => {
          const localItem = currentQueue.find((d) => d.id === serverItem.id)
          if (serverItem.status === "downloading" && localItem?.status === "downloading") {
            const hasStaleLocalFull = (localItem.downloaded_size || 0) >= (localItem.file_size || Infinity) && serverItem.progress < 98
            const validLocalDownloaded = hasStaleLocalFull ? 0 : (localItem.downloaded_size || 0)
            let mergedDownloaded = Math.max(validLocalDownloaded, serverItem.downloaded_size || 0)
            const mergedFileSize = Math.max(localItem.file_size || 0, serverItem.file_size || 0, mergedDownloaded)
            const mergedProgress = Math.min(99, Math.max(localItem.progress || 0, serverItem.progress || 0))

            if (mergedDownloaded === 0 && mergedFileSize > 0 && mergedProgress > 0) {
              mergedDownloaded = Math.round((mergedProgress / 100) * mergedFileSize)
            }

            return {
              ...serverItem,
              progress: mergedProgress,
              downloaded_size: mergedDownloaded,
              file_size: mergedFileSize,
              // Keep live WS speed/eta if we are in 99% muxing state
              speed: mergedProgress >= 99 ? 0 : (localItem.speed || serverItem.speed),
              eta: mergedProgress >= 99 ? 0 : (localItem.eta || serverItem.eta),
            }
          }
          return serverItem
        })
        setQueue(merged)
      } catch (e) {
        console.error("Failed to load queue:", e)
      } finally {
        setIsLoading(false)
      }
    }

    loadQueue()
    const interval = setInterval(loadQueue, 3000)
    return () => clearInterval(interval)
  }, [setQueue])

  const activeDownloads = queue.filter(d => ["downloading", "queued", "paused"].includes(d.status))
  const completedDownloads = queue.filter(d => d.status === "completed")
  const failedDownloads = queue.filter(d => d.status === "failed")

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading downloads...</p>
      </div>
    )
  }

  if (queue.length === 0) {
    return (
      <div className="text-center py-16 animate-fade-in">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-accent/50 mb-4">
          <Download className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold">No downloads yet</h3>
        <p className="text-muted-foreground mt-1 text-sm">Paste a URL on the dashboard to start downloading</p>
      </div>
    )
  }

  const displayedCompleted = compact && !showAllCompleted
    ? completedDownloads.slice(0, 3)
    : completedDownloads

  return (
    <div className="space-y-6">
      {activeDownloads.length > 0 && (
        <div className="animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 rounded-full bg-blue-400 animate-dot-pulse" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Active ({activeDownloads.length})
            </h3>
          </div>
          <div className="space-y-2">
            {activeDownloads.map((download) => (
              <DownloadItem key={download.id} download={download} />
            ))}
          </div>
        </div>
      )}
      
      {completedDownloads.length > 0 && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Completed ({completedDownloads.length})
              </h3>
            </div>
            {compact && completedDownloads.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary h-7 px-2"
                onClick={() => setShowAllCompleted(!showAllCompleted)}
              >
                {showAllCompleted ? "Show Less" : `Show All (${completedDownloads.length})`}
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {displayedCompleted.map((download) => (
              <DownloadItem key={download.id} download={download} onPlay={setPlayingDownload} />
            ))}
          </div>
        </div>
      )}
      
      {failedDownloads.length > 0 && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-3.5 w-3.5 text-red-400" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Failed ({failedDownloads.length})
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryAllFailed}
                disabled={isRetryingAll}
                className="h-7 text-xs rounded-lg gap-1 border-primary/30 hover:bg-primary/10 text-primary"
              >
                {isRetryingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                Retry All Failed
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAllFailed}
                disabled={isClearingAll}
                className="h-7 text-xs rounded-lg gap-1 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                {isClearingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                Clear All
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {failedDownloads.map((download) => (
              <DownloadItem key={download.id} download={download} />
            ))}
          </div>
        </div>
      )}

      {playingDownload && (
        <CyberneticMediaPlayer
          download={playingDownload}
          onClose={() => setPlayingDownload(null)}
        />
      )}
    </div>
  )
}