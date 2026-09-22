"use client"

import { useState, useEffect } from "react"
import {
  Download,
  History,
  Search,
  Trash2,
  RotateCcw,
  FolderOpen,
  Copy,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  MoreVertical,
  Calendar,
  HardDrive,
  FileVideo,
  AlertCircle,
  FileDown,
  FileUp,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { formatBytes, formatDuration, getStatusColor } from "@/lib/utils"
import type { HistoryItem as HistoryItemType } from "@/types"
import { api } from "@/services/api"
import { cn } from "@/lib/utils"
import { AppShell } from "@/components/layout/AppShell"
import { toast } from "@/hooks/useToast"

function HistoryItem({ item, onDeleted }: { item: HistoryItemType; onDeleted: () => void }) {
  const handleOpenFolder = async () => {
    try {
      await api.openFolder(item.id, item.output_path)
    } catch (e) {
      console.error("Failed to open folder:", e)
      toast({
        title: "Error",
        description: "Failed to open folder on server",
        variant: "destructive",
      })
    }
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(item.url)
    toast({
      title: "Copied",
      description: "URL copied to clipboard",
    })
  }

  const handleOpenSource = () => {
    window.open(item.url, "_blank")
  }

  const handleRedownload = async () => {
    try {
      await api.startDownload({ url: item.url })
      toast({
        title: "Download Started",
        description: "Added to download queue",
      })
    } catch (e) {
      console.error("Failed to redownload:", e)
      toast({
        title: "Error",
        description: "Failed to restart download",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    try {
      await api.deleteDownload(item.id)
      onDeleted()
      toast({
        title: "Deleted",
        description: "Download record removed",
      })
    } catch (e) {
      console.error("Failed to delete:", e)
    }
  }

  return (
    <div className="group relative rounded-xl border border-border/40 bg-card/60 hover:bg-card/90 hover:border-primary/30 transition-all duration-300 p-4 shadow-sm overflow-hidden">
      <div className="flex items-start gap-4">
        {/* Thumbnail or Fallback Icon */}
        <div className="relative h-18 w-28 flex-shrink-0 rounded-lg overflow-hidden bg-muted/60 border border-border/30 flex items-center justify-center">
          {item.thumbnail ? (
            <img
              src={item.thumbnail}
              alt={item.title || "Thumbnail"}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <FileVideo className="h-8 w-8 text-muted-foreground/50" />
          )}
          {item.duration && (
            <div className="absolute bottom-1 right-1 bg-black/80 backdrop-blur-sm text-[10px] font-mono text-white px-1.5 py-0.5 rounded">
              {formatDuration(item.duration)}
            </div>
          )}
        </div>

        {/* Info Column */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                {item.title || item.filename || "Unknown Title"}
              </h4>
              <p className="text-xs text-muted-foreground truncate font-mono mt-0.5 opacity-80">
                {item.url}
              </p>
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-70 group-hover:opacity-100"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur border-border/60">
                <DropdownMenuItem onClick={handleOpenFolder} disabled={!item.output_path}>
                  <FolderOpen className="mr-2 h-4 w-4 text-amber-400" />
                  Open in Folder
                </DropdownMenuItem>
                {item.output_path && (
                  <DropdownMenuItem onClick={() => window.open(api.getDownloadFileUrl(item.id), "_blank")}>
                    <Download className="mr-2 h-4 w-4 text-primary" />
                    Save / Download File
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleCopyUrl}>
                  <Copy className="mr-2 h-4 w-4 text-sky-400" />
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleOpenSource}>
                  <ExternalLink className="mr-2 h-4 w-4 text-emerald-400" />
                  Open Source Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRedownload}>
                  <RotateCcw className="mr-2 h-4 w-4 text-violet-400" />
                  Download Again
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Record
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Badges / Meta */}
          <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-[11px]",
                getStatusColor(item.status)
              )}
            >
              {item.status === "completed" && <CheckCircle className="h-3 w-3" />}
              {item.status === "failed" && <XCircle className="h-3 w-3" />}
              {item.status === "cancelled" && <Clock className="h-3 w-3" />}
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </span>

            {item.file_size > 0 && (
              <span className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md">
                <HardDrive className="h-3 w-3 text-muted-foreground" />
                {formatBytes(item.file_size)}
              </span>
            )}

            <span className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              {new Date(item.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          {item.error && (
            <div className="mt-2.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-md px-2.5 py-1.5 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{item.error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItemType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sourceFilter, setSourceFilter] = useState("")

  const loadHistory = async () => {
    try {
      const data = await api.getHistory({
        limit: 100,
        search: search || undefined,
        source: sourceFilter || undefined,
      })
      setHistory(data)
    } catch (e) {
      console.error("Failed to load history:", e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [search, sourceFilter])

  const handleClearHistory = async () => {
    if (confirm("Are you sure you want to clear all history records?")) {
      try {
        await api.clearHistory()
        setHistory([])
        toast({
          title: "History Cleared",
          description: "All history records have been deleted",
        })
      } catch (e) {
        console.error("Failed to clear history:", e)
        toast({
          title: "Error",
          description: "Failed to clear history",
          variant: "destructive",
        })
      }
    }
  }

  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const handleExport = async (format: "json" | "csv") => {
    setIsExporting(true)
    try {
      const blob = await api.exportHistory(format)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `omnidownload_history.${format}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast({
        title: "Export Complete",
        description: `Exported history as omnidownload_history.${format}`,
      })
    } catch (e: any) {
      toast({
        title: "Export Failed",
        description: e.message || "Failed to export history",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    try {
      const res = await api.importHistory(file)
      toast({
        title: "Import Complete",
        description: `Successfully imported ${res.imported_count} record(s)`,
      })
      await loadHistory()
    } catch (e: any) {
      toast({
        title: "Import Failed",
        description: e.response?.data?.detail || e.message || "Failed to import history",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
      e.target.value = ""
    }
  }

  const completedCount = history.filter((h) => h.status === "completed").length
  const failedCount = history.filter((h) => h.status === "failed").length
  const totalBytes = history.reduce((acc, h) => acc + (h.file_size || 0), 0)

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
          <div>
            <h1 className="text-3xl font-bold font-heading tracking-tight flex items-center gap-3">
              <span className="p-2 rounded-xl gradient-primary shadow-sm text-white inline-flex">
                <History className="h-6 w-6" />
              </span>
              Download History
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Browse, filter, and access previously downloaded files and records
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Stat Badges */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>{completedCount} Completed</span>
            </div>
            {failedCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400">
                <XCircle className="h-3.5 w-3.5" />
                <span>{failedCount} Failed</span>
              </div>
            )}
            {totalBytes > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border/50 text-xs font-medium text-muted-foreground">
                <HardDrive className="h-3.5 w-3.5" />
                <span>{formatBytes(totalBytes)}</span>
              </div>
            )}

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={history.length === 0 || isExporting}
                  className="gap-1.5 text-xs border-border/40"
                >
                  {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  Export as CSV (.csv)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("json")}>
                  Export as JSON (.json)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Import Button */}
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json,.csv"
                onChange={handleImportFile}
                disabled={isImporting}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                asChild
                disabled={isImporting}
                className="gap-1.5 text-xs border-border/40"
              >
                <span>
                  {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
                  Import
                </span>
              </Button>
            </label>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearHistory}
              disabled={history.length === 0}
              className="gap-1.5 text-xs ml-auto sm:ml-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
        </div>


        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search history by title, URL or filename..."
              className="pl-10 bg-card/60 border-border/40 focus-visible:ring-primary/40"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full sm:w-44 px-3.5 py-2 text-sm border border-border/40 bg-card/60 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          >
            <option value="">All Sources</option>
            <option value="youtube">YouTube</option>
            <option value="reddit">Reddit</option>
            <option value="twitter">Twitter / X</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="terabox">Terabox</option>
            <option value="generic">Direct Links</option>
          </select>
        </div>

        {/* Content Area */}
        <Card className="border-border/40 bg-card/60 shadow-sm backdrop-blur">
          <CardContent className="p-4 sm:p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
                <p className="text-sm">Loading download history...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-16">
                <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-muted/40 border border-border/40 flex items-center justify-center text-muted-foreground/60">
                  <History className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold font-heading">No history found</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  {search || sourceFilter
                    ? "No downloads match your active search or source filter criteria."
                    : "Completed downloads and tasks will automatically be saved and displayed here."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <HistoryItem key={item.id} item={item} onDeleted={loadHistory} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}