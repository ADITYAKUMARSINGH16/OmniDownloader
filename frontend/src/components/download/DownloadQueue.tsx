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

function DownloadItem({ download }: { download: DownloadInfo }) {
  const { updateDownload, removeDownload } = useDownloadStore()
  const isActive = ["downloading", "queued"].includes(download.status)
  const isCompleted = download.status === "completed"
  const isFailed = download.status === "failed"

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
    downloading: { icon: Loader2, label: "Downloading", dotColor: "bg-blue-400", animate: true },
    completed: { icon: CheckCircle, label: "Completed", dotColor: "bg-emerald-400", animate: false },
    failed: { icon: XCircle, label: "Failed", dotColor: "bg-red-400", animate: false },
    paused: { icon: PauseCircle, label: "Paused", dotColor: "bg-amber-400", animate: false },
    queued: { icon: Clock, label: "Queued", dotColor: "bg-slate-400", animate: false },
    cancelled: { icon: XCircle, label: "Cancelled", dotColor: "bg-slate-400", animate: false },
  }

  const status = statusConfig[download.status] || statusConfig.queued

  return (
    <div className={cn(
      "relative group rounded-xl border transition-all duration-300 overflow-hidden",
      isActive ? "border-primary/30 bg-primary/[0.03]" : "border-border/40 bg-card/60",
      "hover:border-primary/20 hover:shadow-md"
    )}>
      {/* Active download top gradient line */}
      {download.status === "downloading" && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400 animate-progress-gradient" style={{ backgroundSize: "200% 100%" }} />
      )}
      {isCompleted && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-green-400" />
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Thumbnail */}
          {download.thumbnail ? (
            <div className="relative h-16 w-28 flex-shrink-0 rounded-lg overflow-hidden bg-muted/50 shadow-sm">
              <img
                src={download.thumbnail}
                alt={download.title || "Thumbnail"}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              {/* Progress overlay on thumbnail */}
              {download.status === "downloading" && download.progress > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-blue-400 transition-all duration-300"
                    style={{ width: `${download.progress}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="h-16 w-28 flex-shrink-0 rounded-lg bg-accent/40 flex items-center justify-center">
              <ArrowDownToLine className="h-6 w-6 text-muted-foreground/40" />
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm leading-snug line-clamp-1">{download.title || download.filename || "Unknown"}</h4>
                <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{download.url}</p>
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
            <div className="mt-2.5 flex items-center gap-3 text-xs flex-wrap">
              {/* Status badge */}
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-full font-medium",
                getStatusColor(download.status)
              )}>
                {status.animate ? (
                  <span className={cn("h-1.5 w-1.5 rounded-full animate-dot-pulse", status.dotColor)} />
                ) : (
                  <status.icon className="h-3 w-3" />
                )}
                {status.label}
              </span>

              {/* Download stats */}
              {download.file_size > 0 && (
                <span className="text-muted-foreground">
                  {formatBytes(download.downloaded_size)} / {formatBytes(download.file_size)}
                </span>
              )}
              
              {download.speed > 0 && (
                <span className="font-medium text-blue-400 flex items-center gap-1">
                  ▼ {formatSpeed(download.speed)}
                </span>
              )}
              
              {download.eta > 0 && (
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatETA(download.eta)}
                </span>
              )}
            </div>

            {/* Progress bar for active downloads */}
            {isActive && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {download.status === "downloading" ? "Downloading..." : "Waiting in queue..."}
                  </span>
                  <span className="font-mono font-semibold text-foreground">
                    {Math.round(download.progress)}%
                  </span>
                </div>
                <Progress
                  value={download.progress}
                  className="h-2"
                  variant={download.status === "downloading" ? "gradient" : "indeterminate"}
                />
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
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === "progress" && data.download_id) {
              const updates: Partial<DownloadInfo> = {
                progress: data.progress ?? 0,
                speed: data.speed ?? 0,
                eta: data.eta ?? 0,
                status: data.status as DownloadStatus,
              }
              if (data.downloaded != null) updates.downloaded_size = data.downloaded
              if (data.total != null && data.total > 0) updates.file_size = data.total
              updateDownload(data.download_id, updates)
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

  // Poll the queue from the DB as a fallback (every 3 seconds)
  useEffect(() => {
    const loadQueue = async () => {
      try {
        const data = await api.getQueue()
        setQueue(data.downloads)
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
              <DownloadItem key={download.id} download={download} />
            ))}
          </div>
        </div>
      )}
      
      {failedDownloads.length > 0 && (
        <div className="animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="h-3.5 w-3.5 text-red-400" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Failed ({failedDownloads.length})
            </h3>
          </div>
          <div className="space-y-2">
            {failedDownloads.map((download) => (
              <DownloadItem key={download.id} download={download} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}