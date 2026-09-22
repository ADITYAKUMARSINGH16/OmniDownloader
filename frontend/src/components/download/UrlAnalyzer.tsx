"use client"

import { useState } from "react"
import { Download, Loader2, Search, X, Video, Music, Image, FileText, Archive, AlertCircle, Clock, Check, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn, formatBytes, formatDuration } from "@/lib/utils"
import { AnalyzeResponse, Format, ContentType } from "@/types"
import { useDownloadStore } from "@/hooks/useStore"
import { api } from "@/services/api"
import { useRouter } from "next/navigation"

const typeIcons: Record<ContentType, typeof Video> = {
  video: Video,
  audio: Music,
  image: Image,
  document: FileText,
  archive: Archive,
  unknown: FileText,
}

export function UrlAnalyzer() {
  const [url, setUrl] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<Format | null>(null)
  const [formatFilter, setFormatFilter] = useState<"all" | "video" | "audio">("all")
  const { setAnalyzing, setAnalyzeError } = useDownloadStore()
  const router = useRouter()

  const handleAnalyze = async () => {
    if (!url.trim()) return
    
    setIsAnalyzing(true)
    setAnalyzing(true)
    setError(null)
    setAnalyzeError(null)
    setAnalysis(null)
    setSelectedFormat(null)

    try {
      const result = await api.analyzeUrl(url)
      if (result.error) {
        throw new Error(result.error.message)
      }
      setAnalysis(result)
      if (result.formats.length > 0) {
        // Automatically preselect the highest quality video format
        const bestVideo = result.formats.find((f) => f.is_video) || result.formats[0]
        setSelectedFormat(bestVideo)
      }
    } catch (e: any) {
      const errorMsg = e.error?.message || e.message || "Failed to analyze URL"
      setError(errorMsg)
      setAnalyzeError(errorMsg)
    } finally {
      setIsAnalyzing(false)
      setAnalyzing(false)
    }
  }

  const handleDownload = async () => {
    if (!selectedFormat || !analysis) return
    
    try {
      const response = await api.startDownload({
        url,
        format_id: selectedFormat.format_id,
        title: analysis.title,
        thumbnail: analysis.thumbnail,
        duration: analysis.duration,
        format: selectedFormat.quality,
        file_size: selectedFormat.filesize,
        is_video: selectedFormat.is_video,
        is_audio: selectedFormat.is_audio,
      })
      router.push(`/queue?id=${response.id}`)
    } catch (e: any) {
      setError(e.error?.message || "Failed to start download")
    }
  }

  const handleClear = () => {
    setUrl("")
    setAnalysis(null)
    setSelectedFormat(null)
    setError(null)
  }

  return (
    <div className="relative">
      {/* Subtle background glow */}
      <div className="absolute -inset-4 rounded-3xl gradient-hero opacity-60 blur-2xl -z-10" />
      
      <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
        {/* Top gradient accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] gradient-primary" />
        
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl md:text-3xl font-heading font-bold tracking-tight">
            Download Anything You Own
          </CardTitle>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Paste a URL from YouTube, Reddit, Twitter, Instagram, Facebook, Terabox, or any direct file link
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* URL Input with glow */}
          <div className="relative group">
            <div className="absolute -inset-0.5 rounded-xl gradient-primary opacity-0 group-focus-within:opacity-30 blur transition-opacity duration-300" />
            <div className="relative flex items-center bg-background/50 rounded-xl border border-border/60 focus-within:border-primary/50 transition-all duration-300 overflow-hidden">
              <input
                type="text"
                placeholder="Paste URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                disabled={isAnalyzing}
                className="flex-1 px-4 py-3.5 bg-transparent text-sm md:text-base outline-none placeholder:text-muted-foreground/60 disabled:opacity-50"
              />
              <div className="flex items-center gap-1 pr-2">
                {url && (
                  <button
                    onClick={handleClear}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !url.trim()}
                  className="rounded-lg px-5 h-10 gradient-primary text-white border-0 shadow-md hover:shadow-lg hover:opacity-90 transition-all duration-200 disabled:opacity-40"
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-1.5" />
                  )}
                  {isAnalyzing ? "Analyzing..." : "Analyze"}
                </Button>
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2.5 animate-scale-in">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-5 animate-slide-up">
              <Separator className="opacity-50" />
              
              {/* Media Info Card */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-accent/30 border border-border/30">
                {analysis.thumbnail && (
                  <div className="relative h-28 w-48 flex-shrink-0 rounded-lg overflow-hidden bg-muted shadow-lg group">
                    <img
                      src={analysis.thumbnail}
                      alt={analysis.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* Gradient overlay */}
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
                  <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
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
                    {analysis.duration && !analysis.thumbnail && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDuration(analysis.duration)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

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

              {/* Download Button */}
              {selectedFormat && (
                <div className="pt-2">
                  <Button 
                    size="lg" 
                    className="w-full font-semibold text-base shadow-lg gradient-primary text-white border-0 hover:opacity-90 hover:shadow-xl transition-all duration-300 h-12 rounded-xl" 
                    onClick={handleDownload}
                    disabled={isAnalyzing}
                  >
                    <Download className="mr-2 h-5 w-5" />
                    Download {selectedFormat.quality} ({selectedFormat.extension.toUpperCase()})
                    {selectedFormat.filesize && ` • ${formatBytes(selectedFormat.filesize)}`}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}