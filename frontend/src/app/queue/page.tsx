"use client"

import { AppShell } from "@/components/layout/AppShell"
import { DownloadQueue } from "@/components/download/DownloadQueue"
import { useDownloadStore } from "@/hooks/useStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownToLine, Zap, CheckCircle, Clock } from "lucide-react"
import { formatBytes } from "@/lib/utils"

export default function QueuePage() {
  const { queue } = useDownloadStore()

  const activeCount = queue.filter((d) => ["downloading", "queued"].includes(d.status)).length
  const completedCount = queue.filter((d) => d.status === "completed").length
  const totalBytes = queue.reduce((acc, d) => acc + (d.downloaded_size || d.file_size || 0), 0)

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
          <div>
            <h1 className="text-3xl font-bold font-heading tracking-tight flex items-center gap-3">
              <span className="p-2 rounded-xl gradient-primary shadow-sm text-white inline-flex">
                <ArrowDownToLine className="h-6 w-6" />
              </span>
              Download Queue
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time monitoring and control of active, pending, and completed downloads
            </p>
          </div>

          {/* Quick Stat Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
              <Zap className="h-3.5 w-3.5" />
              <span>{activeCount} Active</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>{completedCount} Completed</span>
            </div>
            {totalBytes > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border/50 text-xs font-medium text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatBytes(totalBytes)} Transferred</span>
              </div>
            )}
          </div>
        </div>

        {/* Queue Component */}
        <Card className="border-border/40 bg-card/60 shadow-sm backdrop-blur">
          <CardContent className="p-4 sm:p-6">
            <DownloadQueue />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}