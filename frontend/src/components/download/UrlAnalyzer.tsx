"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Download, Loader2, Search, X, Video, Music, Image, FileText, Archive, AlertCircle, Clock, Check, Sparkles, Link2, CheckCircle2, XCircle, ArrowRight, Headphones, ClipboardPaste, CalendarClock, Play, ExternalLink, Eye, EyeOff, Layers, Zap, Magnet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn, formatBytes, formatDuration, getErrorMessage } from "@/lib/utils"
import { AnalyzeResponse, Format, ContentType, BatchDownloadResponse, BatchDownloadResult } from "@/types"
import { useDownloadStore } from "@/hooks/useStore"
import { api } from "@/services/api"
import { useRouter } from "next/navigation"

const typeIcons: Record<ContentType, typeof Video> = {
  video: Video,
  audio: Music,
  image: Image,
  document: FileText,
  archive: Archive,
  torrent: Magnet,
  unknown: FileText,
}

export function UrlAnalyzer() {
  // Unified input state
  const [inputText, setInputText] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isDownloadingSingle, setIsDownloadingSingle] = useState(false)
  const [isDownloadingAll, setIsDownloadingAll] = useState(false)
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [batchResults, setBatchResults] = useState<BatchDownloadResponse | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<Format | null>(null)
  const [formatFilter, setFormatFilter] = useState<"all" | "video" | "audio">("all")

  // Scheduling & Preview state
  const [scheduleOption, setScheduleOption] = useState<string>("now")
  const [customScheduleTime, setCustomScheduleTime] = useState<string>("")
  const [showPreview, setShowPreview] = useState(false)

  // Audio extraction state
  const [audioFormat, setAudioFormat] = useState("mp3")
  const [audioBitrate, setAudioBitrate] = useState("320k")
  const [isExtractingAudio, setIsExtractingAudio] = useState(false)

  // Drag-and-drop & clipboard state
  const [isDragging, setIsDragging] = useState(false)
  const [detectedClipboardUrl, setDetectedClipboardUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { setAnalyzing, setAnalyzeError } = useDownloadStore()
  const router = useRouter()

  // Parse all valid URLs from the unified input (lines or whitespace)
  const parsedUrls = useMemo(() => {
    return inputText
      .split(/[\n\r]+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && (line.startsWith("http://") || line.startsWith("https://") || line.startsWith("magnet:?")))
  }, [inputText])

  const handleTorrentUpload = async (file: File) => {
    setIsAnalyzing(true)
    setAnalyzing(true)
    setError(null)
    setAnalyzeError(null)
    setAnalysis(null)
    setSelectedFormat(null)
    setBatchResults(null)
    setInputText(file.name)

    try {
      const result = await api.uploadTorrentFile(file)
      if (result.error) {
        throw new Error(result.error.message)
      }
      setAnalysis(result)
      if (result.formats.length > 0) {
        setSelectedFormat(result.formats[0])
      }
    } catch (e: any) {
      const errorMsg = getErrorMessage(e, "Failed to analyze .torrent file")
      setError(errorMsg)
      setAnalyzeError(errorMsg)
    } finally {
      setIsAnalyzing(false)
      setAnalyzing(false)
    }
  }

  const isBatchMode = parsedUrls.length > 1
  const singleUrl = parsedUrls.length === 1 ? parsedUrls[0] : inputText.trim()

  // Multi-image gallery detection from analysis
  const imageFormats = useMemo(() => {
    if (!analysis || !analysis.formats) return []
    return analysis.formats.filter((f) => !f.is_video && !f.is_audio)
  }, [analysis])

  const isMultiImageGallery = imageFormats.length > 1

  const getScheduledAtIso = (): string | undefined => {
    if (scheduleOption === "now") return undefined
    const now = new Date()
    if (scheduleOption === "30m") {
      return new Date(now.getTime() + 30 * 60 * 1000).toISOString()
    }
    if (scheduleOption === "1h") {
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString()
    }
    if (scheduleOption === "2h") {
      return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()
    }
    if (scheduleOption === "midnight") {
      const midnight = new Date()
      midnight.setHours(24, 0, 0, 0)
      return midnight.toISOString()
    }
    if (scheduleOption === "2am") {
      const twoAm = new Date()
      if (twoAm.getHours() >= 2) {
        twoAm.setDate(twoAm.getDate() + 1)
      }
      twoAm.setHours(2, 0, 0, 0)
      return twoAm.toISOString()
    }
    if (scheduleOption === "custom" && customScheduleTime) {
      const customDate = new Date(customScheduleTime)
      if (!isNaN(customDate.getTime()) && customDate > now) {
        return customDate.toISOString()
      }
    }
    return undefined
  }

  // Auto-detect URL from clipboard on window focus
  useEffect(() => {
    const handleFocus = async () => {
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText()
          const trimmed = text.trim()
          if (
            trimmed &&
            (trimmed.startsWith("http://") || trimmed.startsWith("https://")) &&
            trimmed !== inputText &&
            !parsedUrls.includes(trimmed)
          ) {
            setDetectedClipboardUrl(trimmed)
          }
        }
      } catch {
        // Permission denied or clipboard empty
      }
    }

    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [inputText, parsedUrls])

  const handlePasteClipboard = (clipUrl: string) => {
    setInputText(clipUrl)
    setDetectedClipboardUrl(null)
    executeAnalyze(clipUrl)
  }

  const executeAnalyze = async (targetUrl: string) => {
    if (!targetUrl.trim()) return

    setIsAnalyzing(true)
    setAnalyzing(true)
    setError(null)
    setAnalyzeError(null)
    setAnalysis(null)
    setSelectedFormat(null)
    setBatchResults(null)

    try {
      const result = await api.analyzeUrl(targetUrl)
      if (result.error) {
        throw new Error(result.error.message)
      }
      setAnalysis(result)
      if (result.formats.length > 0) {
        const bestVideo = result.formats.find((f) => f.is_video) || result.formats[0]
        setSelectedFormat(bestVideo)
      }
    } catch (e: any) {
      const errorMsg = getErrorMessage(e, "Failed to analyze URL")
      setError(errorMsg)
      setAnalyzeError(errorMsg)
    } finally {
      setIsAnalyzing(false)
      setAnalyzing(false)
    }
  }

  const handleAnalyzeOrDownload = async () => {
    if (isBatchMode) {
      handleBatchDownload()
    } else {
      executeAnalyze(singleUrl)
    }
  }

  // Quick direct download for single URL without full analysis
  const handleQuickDownload = async () => {
    if (!singleUrl.trim()) return
    setIsDownloadingSingle(true)
    setError(null)
    try {
      const scheduledAt = getScheduledAtIso()
      const res = await api.batchDownload({
        urls: [singleUrl.trim()],
        scheduled_at: scheduledAt,
      })
      if (res.queued > 0) {
        router.push("/queue")
      } else if (res.failed > 0) {
        setError(res.results[0]?.error || "Failed to start download")
      }
    } catch (e: any) {
      setError(getErrorMessage(e, "Failed to start download"))
    } finally {
      setIsDownloadingSingle(false)
    }
  }

  const handleDownload = async () => {
    if (!selectedFormat || !analysis) return
    setIsDownloadingSingle(true)
    try {
      const scheduledAt = getScheduledAtIso()
      const response = await api.startDownload({
        url: singleUrl,
        format_id: selectedFormat.format_id,
        title: analysis.title,
        thumbnail: analysis.thumbnail,
        duration: analysis.duration,
        format: selectedFormat.quality,
        file_size: selectedFormat.filesize,
        is_video: selectedFormat.is_video,
        is_audio: selectedFormat.is_audio,
        scheduled_at: scheduledAt,
        metadata: analysis.metadata,
      })
      router.push(`/queue?id=${response.id}`)
    } catch (e: any) {
      setError(getErrorMessage(e, "Failed to start download"))
    } finally {
      setIsDownloadingSingle(false)
    }
  }

  // Download all photos from gallery
  const handleDownloadAllImages = async () => {
    if (!analysis || imageFormats.length === 0) return

    setIsDownloadingAll(true)
    setError(null)
    try {
      const scheduledAt = getScheduledAtIso()
      const urls = imageFormats.map((f) => {
        if (f.format_id && (f.format_id.startsWith("http://") || f.format_id.startsWith("https://"))) {
          return f.format_id
        }
        return singleUrl
      })

      const result = await api.batchDownload({
        urls,
        scheduled_at: scheduledAt,
      })

      if (result.queued > 0) {
        router.push("/queue")
      } else if (result.failed > 0) {
        const firstErr = result.results.find((r) => r.status === "failed")?.error
        setError(firstErr || "Failed to queue gallery photos")
      }
    } catch (e: any) {
      setError(getErrorMessage(e, "Failed to download gallery photos"))
    } finally {
      setIsDownloadingAll(false)
    }
  }

  // Batch download handler
  const handleBatchDownload = async () => {
    if (parsedUrls.length === 0) return

    setIsBatchProcessing(true)
    setError(null)
    setBatchResults(null)

    try {
      const scheduledAt = getScheduledAtIso()
      const result = await api.batchDownload({ 
        urls: parsedUrls,
        scheduled_at: scheduledAt,
      })
      setBatchResults(result)
      if (result.queued > 0) {
        setTimeout(() => {
          router.push("/queue")
        }, 1500)
      }
    } catch (e: any) {
      setError(getErrorMessage(e, "Failed to process batch downloads"))
    } finally {
      setIsBatchProcessing(false)
    }
  }

  const handleExtractAudio = async () => {
    if (!analysis) return

    setIsExtractingAudio(true)
    try {
      const scheduledAt = getScheduledAtIso()
      const response = await api.startDownload({
        url: singleUrl,
        audio_only: true,
        audio_format: audioFormat,
        audio_bitrate: audioBitrate,
        title: analysis.title,
        thumbnail: analysis.thumbnail,
        duration: analysis.duration,
        format: `Audio ${audioFormat.toUpperCase()} (${audioBitrate})`,
        is_audio: true,
        is_video: false,
        scheduled_at: scheduledAt,
      })
      router.push(`/queue?id=${response.id}`)
    } catch (e: any) {
      setError(getErrorMessage(e, "Failed to start audio extraction"))
    } finally {
      setIsExtractingAudio(false)
    }
  }

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    // Check for dropped .torrent file
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      if (file.name.toLowerCase().endsWith(".torrent")) {
        handleTorrentUpload(file)
        return
      }
    }

    const text = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text/uri-list")
    if (text) {
      const trimmed = text.trim()
      setInputText(trimmed)
      if (
        !trimmed.includes("\n") &&
        (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("magnet:?"))
      ) {
        executeAnalyze(trimmed)
      }
    }
  }

  const handleClear = () => {
    setInputText("")
    setAnalysis(null)
    setSelectedFormat(null)
    setError(null)
    setBatchResults(null)
  }

  const getDomain = (u: string) => {
    try {
      return new URL(u).hostname.replace("www.", "")
    } catch {
      return u.substring(0, 30)
    }
  }

  return (
    <div className="relative">
      {/* Subtle background glow */}
      <div className="absolute -inset-4 rounded-3xl gradient-hero opacity-60 blur-2xl -z-10" />
      
      <Card
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm shadow-xl transition-all duration-300",
          isDragging && "border-primary ring-2 ring-primary/40 bg-primary/5"
        )}
      >
        {/* Drag and Drop Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 rounded-xl bg-background/90 backdrop-blur-sm border-2 border-dashed border-primary flex flex-col items-center justify-center gap-2 pointer-events-none animate-in fade-in">
            <div className="p-4 rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-8 w-8 animate-bounce" />
            </div>
            <h4 className="text-lg font-bold">Drop Links to Download</h4>
            <p className="text-xs text-muted-foreground">Release mouse to paste and process automatically</p>
          </div>
        )}

        {/* Top gradient accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] gradient-primary" />
        
        <CardHeader className="text-center pb-3">
          <CardTitle className="text-2xl md:text-3xl font-heading font-bold tracking-tight">
            Download Anything You Own
          </CardTitle>
          <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-2xl mx-auto">
            Paste one URL or multiple URLs from YouTube, TikTok, SoundCloud, Twitter, Instagram, Reddit, Facebook, or any direct media link
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Clipboard Auto-Detect Prompt */}
          {detectedClipboardUrl && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/30 text-xs animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 truncate pr-2">
                <ClipboardPaste className="h-4 w-4 text-primary shrink-0" />
                <span className="text-muted-foreground">Link on clipboard:</span>
                <span className="font-mono font-medium text-foreground truncate max-w-[200px] sm:max-w-[320px]">
                  {detectedClipboardUrl}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  className="h-7 text-xs gradient-primary text-white px-3 font-medium rounded-lg shadow-sm"
                  onClick={() => handlePasteClipboard(detectedClipboardUrl)}
                >
                  Paste & Analyze
                </Button>
                <button
                  onClick={() => setDetectedClipboardUrl(null)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ===== UNIFIED SMART INPUT ===== */}
          <div className="relative group">
            <div className="absolute -inset-0.5 rounded-2xl gradient-primary opacity-0 group-focus-within:opacity-30 blur transition-opacity duration-300" />
            <div className="relative bg-background/60 rounded-2xl border border-border/60 focus-within:border-primary/60 transition-all duration-300 overflow-hidden shadow-inner p-2 space-y-2">
              
              {/* Smart Textarea that handles single or multiple lines smoothly */}
              <div className="relative flex items-start">
                <textarea
                  placeholder="Paste link here (or paste multiple links, one per line)..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !isBatchMode && inputText.trim()) {
                      e.preventDefault()
                      handleAnalyzeOrDownload()
                    }
                  }}
                  disabled={isAnalyzing || isBatchProcessing}
                  rows={isBatchMode ? Math.min(Math.max(parsedUrls.length + 1, 3), 6) : 1}
                  className="w-full px-3 py-2.5 bg-transparent text-sm md:text-base outline-none resize-none font-sans placeholder:text-muted-foreground/60 disabled:opacity-50 leading-relaxed max-h-48 overflow-y-auto"
                />

                {inputText && (
                  <button
                    onClick={handleClear}
                    className="p-2 mr-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors shrink-0 mt-0.5"
                    title="Clear input"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Bottom Control Bar in Input */}
              <div className="flex items-center justify-between pt-1 border-t border-border/30 px-1">
                <div className="flex items-center gap-2">
                  {isBatchMode ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold">
                      <Zap className="h-3.5 w-3.5 fill-primary" />
                      {parsedUrls.length} URLs Detected
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      Press Enter to analyze or click Download
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Single URL Actions */}
                  {!isBatchMode && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".torrent"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleTorrentUpload(e.target.files[0])
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isAnalyzing || isDownloadingSingle}
                        className="rounded-xl h-9 text-xs px-2.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 gap-1.5 font-medium border border-border/40"
                        title="Upload a .torrent file"
                      >
                        <Magnet className="h-3.5 w-3.5 text-amber-500" />
                        <span className="hidden sm:inline">Torrent</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleQuickDownload}
                        disabled={isAnalyzing || isDownloadingSingle || !inputText.trim()}
                        className="rounded-xl h-9 text-xs px-3.5 border-border/60 hover:border-primary/40 gap-1.5 font-medium"
                      >
                        {isDownloadingSingle ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        Quick Download
                      </Button>

                      <Button
                        type="button"
                        onClick={handleAnalyzeOrDownload}
                        disabled={isAnalyzing || !inputText.trim()}
                        className="rounded-xl px-5 h-9 text-xs font-semibold gradient-primary text-white border-0 shadow-md hover:shadow-lg hover:opacity-90 transition-all duration-200"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Search className="h-3.5 w-3.5 mr-1.5" />
                            Analyze Formats
                          </>
                        )}
                      </Button>
                    </>
                  )}

                  {/* Batch Download Actions */}
                  {isBatchMode && (
                    <Button
                      type="button"
                      onClick={handleBatchDownload}
                      disabled={isBatchProcessing || parsedUrls.length === 0}
                      className={cn(
                        "rounded-xl px-6 h-9 text-xs font-bold text-white border-0 shadow-md hover:shadow-lg hover:opacity-95 transition-all duration-200 gap-1.5",
                        scheduleOption === "now" ? "gradient-primary" : "bg-gradient-to-r from-purple-600 to-indigo-600"
                      )}
                    >
                      {isBatchProcessing ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Processing {parsedUrls.length} URLs...
                        </>
                      ) : (
                        <>
                          <Download className="h-3.5 w-3.5" />
                          Download All ({parsedUrls.length} URLs)
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2.5 animate-scale-in">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ===== BATCH RESULTS (When batch downloaded) ===== */}
          {batchResults && (
            <div className="space-y-3 animate-slide-up">
              <Separator className="opacity-50" />
              
              <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/30 border border-border/30">
                <div className="flex items-center gap-4 flex-1">
                  <span className="text-sm font-medium">
                    {batchResults.total} URL{batchResults.total !== 1 ? "s" : ""} processed
                  </span>
                  {batchResults.queued > 0 && (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-500">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {batchResults.queued} queued
                    </span>
                  )}
                  {batchResults.failed > 0 && (
                    <span className="flex items-center gap-1 text-xs font-medium text-destructive">
                      <XCircle className="h-3.5 w-3.5" />
                      {batchResults.failed} failed
                    </span>
                  )}
                </div>
                {batchResults.queued > 0 && (
                  <button
                    onClick={() => router.push("/queue")}
                    className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                  >
                    View Queue <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {batchResults.results.map((result, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg border transition-all duration-200",
                      result.status === "queued"
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-destructive/20 bg-destructive/5"
                    )}
                  >
                    <div
                      className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-xs",
                        result.status === "queued" ? "text-emerald-500" : "text-destructive"
                      )}
                    >
                      {result.status === "queued" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{result.title || getDomain(result.url)}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{result.url}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0">
                      {result.status === "queued" ? "Queued" : result.error || "Failed"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== SINGLE URL ANALYSIS RESULTS ===== */}
          {analysis && !isBatchMode && (
            <div className="space-y-5 animate-slide-up">
              <Separator className="opacity-50" />
              
              {/* Media Info Card */}
              <div className="p-4 rounded-xl bg-accent/30 border border-border/30 space-y-3">
                <div className="flex items-start gap-4">
                  {analysis.thumbnail && (
                    <div className="relative h-28 w-44 sm:w-48 shrink-0 rounded-lg overflow-hidden bg-muted shadow-md group">
                      <img
                        src={analysis.thumbnail}
                        alt={analysis.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      {analysis.duration && (
                        <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/75 rounded text-[10px] text-white font-medium">
                          {formatDuration(analysis.duration)}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-base md:text-lg leading-snug line-clamp-2">{analysis.title}</h4>
                    <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {(() => {
                            const TypeIcon = typeIcons[analysis.type]
                            return <TypeIcon className="h-3 w-3" />
                          })()}
                          {analysis.type.charAt(0).toUpperCase() + analysis.type.slice(1)}
                        </span>
                        {analysis.source && (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent text-xs font-medium capitalize">
                            {analysis.source}
                          </span>
                        )}
                        {analysis.source === "torrent" || analysis.type === "torrent" ? (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-medium">
                            <Magnet className="h-3 w-3" />
                            P2P BitTorrent
                          </span>
                        ) : analysis.source === "generic" ? (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-medium">
                            <Zap className="h-3 w-3 fill-emerald-500/20" />
                            Turbo 8x
                          </span>
                        ) : null}
                        {analysis.duration && !analysis.thumbnail && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDuration(analysis.duration)}
                          </span>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => setShowPreview(!showPreview)}
                        className="h-7 text-xs px-2.5 gap-1.5 border-primary/40 hover:border-primary hover:bg-primary/10 text-primary font-medium rounded-lg"
                      >
                        {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {showPreview ? "Hide Preview" : "Preview Media"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Inline Media Preview Player */}
                {showPreview && (
                  <div className="p-3.5 rounded-xl bg-card/90 border border-primary/30 backdrop-blur-md space-y-2.5 animate-scale-in">
                    <div className="flex items-center justify-between text-xs pb-1 border-b border-border/40">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Play className="w-3.5 h-3.5 text-primary" />
                        Media Stream Preview
                      </span>
                      <a
                        href={singleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                      >
                        Open Source <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {analysis.type === "video" ? (
                      <div className="relative aspect-video max-h-64 w-full rounded-lg overflow-hidden bg-black flex items-center justify-center shadow-inner">
                        {analysis.thumbnail && (
                          <img
                            src={analysis.thumbnail}
                            alt={analysis.title}
                            className="w-full h-full object-contain"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3">
                          <p className="text-white font-semibold text-xs line-clamp-1">{analysis.title}</p>
                          <p className="text-white/70 text-[10px] mt-0.5">
                            {analysis.duration ? formatDuration(analysis.duration) : "Live Stream"} • {analysis.source}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-secondary/40 border border-border/40 flex items-center gap-3">
                        {analysis.thumbnail ? (
                          <img
                            src={analysis.thumbnail}
                            alt={analysis.title}
                            className="w-12 h-12 rounded-lg object-cover shadow-sm shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center text-white shrink-0">
                            <Music className="w-5 h-5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs line-clamp-1">{analysis.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {analysis.duration ? formatDuration(analysis.duration) : "Audio Stream"} • {analysis.source}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] text-emerald-400 font-medium">Ready for high-bitrate download</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Photo Gallery Download All Banner (When multiple photos are present) */}
              {isMultiImageGallery && (
                <div className="p-4 rounded-xl border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-purple-500/10 to-accent/30 space-y-3.5 animate-scale-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-primary/20 text-primary shadow-sm flex items-center justify-center shrink-0">
                        <Layers className="h-5 w-5 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm md:text-base font-bold text-foreground">
                            Photo Gallery Detected
                          </h4>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary text-white shadow-xs">
                            {imageFormats.length} Photos
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Download all full-resolution photos simultaneously with 1 click
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={handleDownloadAllImages}
                      disabled={isDownloadingAll || isAnalyzing}
                      className="w-full sm:w-auto h-11 px-5 rounded-xl font-bold gradient-primary text-white shadow-lg hover:shadow-xl hover:opacity-95 transition-all duration-200 shrink-0 flex items-center justify-center gap-2"
                    >
                      {isDownloadingAll ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Queuing {imageFormats.length} Photos...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Download All {imageFormats.length} Photos
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Mini Photo Previews Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pt-1">
                    {imageFormats.map((fmt, idx) => {
                      const isSelected = selectedFormat?.format_id === fmt.format_id
                      const thumbSrc = fmt.format_id.startsWith("http") ? fmt.format_id : analysis.thumbnail
                      return (
                        <div
                          key={fmt.format_id || idx}
                          onClick={() => setSelectedFormat(fmt)}
                          className={cn(
                            "relative group rounded-lg overflow-hidden border cursor-pointer transition-all duration-200 aspect-square bg-muted/40 flex flex-col justify-end p-2",
                            isSelected
                              ? "border-primary ring-2 ring-primary/50 shadow-md scale-[1.02]"
                              : "border-border/40 hover:border-primary/40 hover:scale-[1.01]"
                          )}
                        >
                          {thumbSrc && (
                            <img
                              src={thumbSrc}
                              alt={`Photo ${idx + 1}`}
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          <div className="relative z-10 flex items-center justify-between text-white text-[11px] font-semibold">
                            <span>Photo #{idx + 1}</span>
                            <span className="uppercase text-[9px] bg-black/60 px-1 py-0.5 rounded font-mono">
                              {fmt.extension}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Format Selector */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-semibold text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Available Formats
                  </h5>
                  <div className="flex items-center gap-0.5 bg-accent/60 p-1 rounded-lg text-xs">
                    {[
                      { key: "all" as const, label: `All (${analysis.formats.length})`, icon: null },
                      { key: "video" as const, label: `Video (${analysis.formats.filter(f => f.is_video).length})`, icon: Video },
                      { key: "audio" as const, label: `Audio (${analysis.formats.filter(f => f.is_audio).length})`, icon: Music },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setFormatFilter(tab.key)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-md font-medium transition-all duration-200 flex items-center gap-1.5",
                          formatFilter === tab.key
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {tab.icon && <tab.icon className="h-3 w-3" />}
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {analysis.formats
                    .filter((format) => {
                      if (formatFilter === "video") return format.is_video
                      if (formatFilter === "audio") return format.is_audio
                      return true
                    })
                    .map((format, idx) => {
                      const isSelected = selectedFormat?.format_id === format.format_id
                      const FormatIcon = typeIcons[format.is_video ? "video" : format.is_audio ? "audio" : "unknown"]
                      return (
                        <div
                          key={format.format_id}
                          onClick={() => setSelectedFormat(format)}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200 select-none",
                            isSelected
                              ? "border-primary/60 bg-primary/10 ring-1 ring-primary/40 shadow-sm"
                              : "border-border/40 bg-card/40 hover:border-primary/30 hover:bg-accent/30"
                          )}
                          style={{ animationDelay: `${idx * 30}ms` }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200",
                                isSelected ? "gradient-primary text-white shadow-sm" : "bg-accent/60 text-muted-foreground"
                              )}
                            >
                              <FormatIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm">{format.quality}</p>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent font-mono font-medium text-muted-foreground uppercase">
                                  {format.extension}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {format.filesize ? formatBytes(format.filesize) : "Variable size"}
                                {format.width && format.height && ` • ${format.width}×${format.height}`}
                                {format.fps && ` • ${Math.round(format.fps)}fps`}
                                {format.bitrate && ` • ${Math.round(format.bitrate / 1000)}kbps`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pr-1">
                            <div
                              className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                                isSelected
                                  ? "border-primary bg-primary text-white"
                                  : "border-muted-foreground/30"
                              )}
                            >
                              {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>

              {/* Scheduling Controls */}
              <div className="p-3.5 rounded-xl border border-border/50 bg-secondary/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <CalendarClock className="w-4 h-4 text-primary" />
                    Download Schedule
                  </span>
                  {scheduleOption !== "now" && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 animate-fade-in">
                      Scheduled Execution
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                  {[
                    { key: "now", label: "Start Now" },
                    { key: "30m", label: "In 30 Min" },
                    { key: "1h", label: "In 1 Hour" },
                    { key: "2am", label: "Night (2 AM)" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setScheduleOption(item.key)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-200 select-none",
                        scheduleOption === item.key
                          ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                          : "border-border/40 bg-background/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setScheduleOption("custom")}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-200 whitespace-nowrap",
                      scheduleOption === "custom"
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border/40 bg-background/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Custom Time
                  </button>
                  {scheduleOption === "custom" && (
                    <input
                      type="datetime-local"
                      value={customScheduleTime}
                      onChange={(e) => setCustomScheduleTime(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="flex-1 px-3 py-1.5 text-xs bg-background/80 border border-border/60 rounded-lg outline-none focus:border-primary text-foreground font-mono"
                    />
                  )}
                </div>
              </div>

              {/* Download Button */}
              {selectedFormat && (
                <div className="pt-1">
                  <Button 
                    size="lg" 
                    className={cn(
                      "w-full font-semibold text-base shadow-lg text-white border-0 hover:opacity-90 hover:shadow-xl transition-all duration-300 h-12 rounded-xl",
                      scheduleOption === "now" ? "gradient-primary" : "bg-gradient-to-r from-purple-600 to-indigo-600"
                    )} 
                    onClick={handleDownload}
                    disabled={isAnalyzing || isDownloadingSingle}
                  >
                    {isDownloadingSingle ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Starting Download...
                      </>
                    ) : (
                      <>
                        {scheduleOption === "now" ? (
                          <Download className="mr-2 h-5 w-5" />
                        ) : (
                          <CalendarClock className="mr-2 h-5 w-5" />
                        )}
                        {scheduleOption === "now" ? "Download" : "Schedule Download"}{" "}
                        {selectedFormat.quality} ({selectedFormat.extension.toUpperCase()})
                        {selectedFormat.filesize ? ` • ${formatBytes(selectedFormat.filesize)}` : ""}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Dedicated Audio Extraction Card */}
              <div className="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Headphones className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">Audio-Only Extraction</h4>
                      <p className="text-xs text-muted-foreground">Extract pure audio without video stream</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={audioFormat}
                      onChange={(e) => setAudioFormat(e.target.value)}
                      className="text-xs bg-background/80 border border-border/60 rounded-lg px-2.5 py-1.5 font-medium outline-none focus:border-primary"
                    >
                      <option value="mp3">MP3</option>
                      <option value="m4a">M4A</option>
                      <option value="flac">FLAC</option>
                      <option value="wav">WAV</option>
                      <option value="opus">OPUS</option>
                    </select>
                    <select
                      value={audioBitrate}
                      onChange={(e) => setAudioBitrate(e.target.value)}
                      className="text-xs bg-background/80 border border-border/60 rounded-lg px-2.5 py-1.5 font-medium outline-none focus:border-primary"
                    >
                      <option value="320k">320 kbps (Studio)</option>
                      <option value="192k">192 kbps (Standard)</option>
                      <option value="128k">128 kbps (Compact)</option>
                    </select>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExtractAudio}
                  disabled={isAnalyzing || isExtractingAudio}
                  className="w-full h-10 rounded-lg border-primary/40 hover:border-primary hover:bg-primary/10 text-primary font-medium gap-2 transition-all duration-200"
                >
                  {isExtractingAudio ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Extracting Audio...
                    </>
                  ) : (
                    <>
                      <Music className="h-4 w-4" />
                      Extract & Download as {audioFormat.toUpperCase()} ({audioBitrate})
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}