"use client"

import { AppShell } from "@/components/layout/AppShell"
import { DownloadQueue } from "@/components/download/DownloadQueue"
import { useDownloadStore } from "@/hooks/useStore"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowDownToLine, Zap, CheckCircle, Clock, Sparkles, Plus, HardDrive, RefreshCw, Layers } from "lucide-react"
import { formatBytes } from "@/lib/utils"
import Link from "next/link"

export default function QueuePage() {
  const { queue } = useDownloadStore()

  const activeCount = queue.filter((d) => ["downloading", "queued"].includes(d.status)).length
  const scheduledCount = queue.filter((d) => d.status === "scheduled").length
  const completedCount = queue.filter((d) => d.status === "completed").length
  const failedCount = queue.filter((d) => d.status === "failed").length
  const totalBytes = queue.reduce((acc, d) => acc + (d.downloaded_size || d.file_size || 0), 0)

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl space-y-8 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/40">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] bg-accent-primary/10 border border-accent-primary/25 text-accent-primary shadow-sm mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>STREAM ACCELERATION // QUEUE MONITOR</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-heading text-foreground">
              Download <span className="bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-velocity bg-clip-text text-transparent">Queue & Pipelines</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Real-time segmented chunk tracking, concurrent worker throughput, and file reassembly status.
            </p>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-accent-primary hover:bg-accent-primary/90 text-white shadow-[0_0_20px_rgba(var(--accent-primary)/0.35)] transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>New Download</span>
            </Link>
          </div>
        </div>

        {/* Telemetry Metric Pills Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          {/* Active */}
          <div className="omni-glass-card rounded-2xl border border-border/50 bg-surface/60 p-4 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Active Pipelines
              </span>
              <p className="text-2xl font-extrabold text-accent-primary font-heading mt-0.5">
                {activeCount}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-accent-primary/10 border border-accent-primary/25 flex items-center justify-center text-accent-primary shadow-sm">
              <Zap className="h-5 w-5" />
            </div>
          </div>

          {/* Completed */}
          <div className="omni-glass-card rounded-2xl border border-border/50 bg-surface/60 p-4 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Completed
              </span>
              <p className="text-2xl font-extrabold text-emerald-400 font-heading mt-0.5">
                {completedCount}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shadow-sm">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>

          {/* Transferred */}
          <div className="omni-glass-card rounded-2xl border border-border/50 bg-surface/60 p-4 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Total Bandwidth
              </span>
              <p className="text-2xl font-extrabold text-accent-velocity font-heading mt-0.5">
                {totalBytes > 0 ? formatBytes(totalBytes) : "0 B"}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-accent-velocity/10 border border-accent-velocity/25 flex items-center justify-center text-accent-velocity shadow-sm">
              <ArrowDownToLine className="h-5 w-5" />
            </div>
          </div>

          {/* Scheduled / Failed */}
          <div className="omni-glass-card rounded-2xl border border-border/50 bg-surface/60 p-4 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Scheduled / Failed
              </span>
              <p className="text-2xl font-extrabold text-amber-400 font-heading mt-0.5">
                {scheduledCount} <span className="text-xs text-rose-400 font-normal">/ {failedCount}</span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shadow-sm">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Queue Component in Luxury Glass Container */}
        <div className="omni-glass-card rounded-2xl border border-border/60 bg-surface/60 shadow-2xl overflow-hidden p-4 sm:p-6">
          <DownloadQueue />
        </div>
      </div>
    </AppShell>
  )
}