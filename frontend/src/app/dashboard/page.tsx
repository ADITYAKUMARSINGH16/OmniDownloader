"use client"

import { useEffect, useState } from "react"
import { 
  BarChart3, 
  TrendingUp, 
  DownloadCloud, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  HardDrive, 
  RefreshCw, 
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Zap
} from "lucide-react"
import { api } from "@/services/api"
import { AnalyticsStats } from "@/types"
import { formatBytes } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AppShell } from "@/components/layout/AppShell"

export default function DashboardPage() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const data = await api.getAnalyticsStats()
      setStats(data)
      setError(null)
    } catch (err: any) {
      console.error("Failed to load analytics stats:", err)
      setError(err?.message || "Failed to load analytics")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const timer = setInterval(() => fetchStats(), 10000)
    return () => clearInterval(timer)
  }, [])

  const maxDailyCount = Math.max(...(stats?.daily_activity.map(d => d.count) || [1]), 1)

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-3.5 h-3.5" />
              Live Insights
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Auto-refreshes every 10s
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight gradient-text">
            Analytics & Telemetry
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time throughput metrics, bandwidth usage, and platform extraction performance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="gap-2 glass-hover"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-primary" : ""}`} />
            Refresh
          </Button>
          <Link href="/">
            <Button size="sm" className="gradient-primary gap-1.5 shadow-md">
              <Zap className="w-4 h-4" />
              New Download
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-center justify-between">
          <span>Failed to connect to analytics engine: {error}</span>
          <Button variant="outline" size="sm" onClick={() => fetchStats(true)}>
            Retry
          </Button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Downloads */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-5 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Processed
            </span>
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white shadow-sm">
              <DownloadCloud className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold tracking-tight">
              {loading ? "..." : (stats?.total_downloads ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="text-emerald-500 font-semibold">{stats?.completed_downloads ?? 0} completed</span>
              <span>•</span>
              <span className="text-rose-500">{stats?.failed_downloads ?? 0} failed</span>
            </p>
          </div>
        </div>

        {/* Card 2: Total Bandwidth */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-5 shadow-sm transition-all duration-300 hover:border-cyan-500/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Data Downloaded
            </span>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold tracking-tight text-cyan-400">
              {loading ? "..." : formatBytes(stats?.total_bytes ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Bandwidth aggregated across all streams
            </p>
          </div>
        </div>

        {/* Card 3: Success Rate */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-5 shadow-sm transition-all duration-300 hover:border-emerald-500/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Success Rate
            </span>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold tracking-tight text-emerald-400">
              {loading ? "..." : `${stats?.success_rate ?? 100}%`}
            </div>
            <div className="w-full bg-secondary/50 rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(stats?.success_rate ?? 100, 100)}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Card 4: Active & Scheduled */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-5 shadow-sm transition-all duration-300 hover:border-amber-500/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Active & Scheduled
            </span>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold tracking-tight text-amber-400">
              {loading ? "..." : ((stats?.active_downloads ?? 0) + (stats?.scheduled_downloads ?? 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <span className="text-amber-400 font-medium">{stats?.active_downloads ?? 0} running</span>
              <span>•</span>
              <span className="text-purple-400 font-medium">{stats?.scheduled_downloads ?? 0} scheduled</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: 7-Day Chart & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Activity Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                7-Day Activity Timeline
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Download frequency and volume over the last 7 calendar days
              </p>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-secondary text-muted-foreground">
              Past 7 Days
            </span>
          </div>

          {loading ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
              Loading timeline activity...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-border/40">
                {stats?.daily_activity.map((item, idx) => {
                  const barHeight = Math.max(Math.round((item.count / maxDailyCount) * 100), 8)
                  const dayName = new Date(item.date).toLocaleDateString(undefined, { weekday: "short" })
                  const dateStr = new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })

                  return (
                    <div key={item.date} className="flex-1 flex flex-col items-center gap-2 group relative">
                      {/* Tooltip */}
                      <div className="absolute -top-12 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground border border-border px-2.5 py-1 rounded-md text-xs shadow-md whitespace-nowrap">
                        <p className="font-semibold">{dateStr}: {item.count} downloads</p>
                        <p className="text-[10px] text-muted-foreground">{formatBytes(item.bytes)}</p>
                      </div>

                      {/* Bar */}
                      <div className="w-full max-w-[42px] bg-secondary/60 rounded-t-lg h-36 flex items-end p-1">
                        <div
                          className="w-full rounded-t-md gradient-primary transition-all duration-500 group-hover:brightness-125 group-hover:glow-sm"
                          style={{ height: `${item.count > 0 ? barHeight : 4}%` }}
                        />
                      </div>

                      {/* Label */}
                      <div className="text-center">
                        <span className="text-xs font-medium text-foreground block">{dayName}</span>
                        <span className="text-[10px] text-muted-foreground block">{dateStr}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground px-2 pt-1">
                <span>Total 7-day volume: <strong className="text-foreground">{stats?.daily_activity.reduce((acc, d) => acc + d.count, 0) || 0} downloads</strong></span>
                <span>Data transferred: <strong className="text-foreground">{formatBytes(stats?.daily_activity.reduce((acc, d) => acc + d.bytes, 0) || 0)}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Status Distribution */}
        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Download Status
            </h2>
            <p className="text-xs text-muted-foreground mb-6">
              Distribution across all historical and active jobs
            </p>

            <div className="space-y-4">
              {/* Completed */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                  </span>
                  <span className="font-semibold">{stats?.completed_downloads ?? 0}</span>
                </div>
                <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${stats?.total_downloads ? ((stats.completed_downloads / stats.total_downloads) * 100) : 0}%` }}
                  />
                </div>
              </div>

              {/* Active */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-amber-400">
                    <Zap className="w-3.5 h-3.5" /> In Progress
                  </span>
                  <span className="font-semibold">{stats?.active_downloads ?? 0}</span>
                </div>
                <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${stats?.total_downloads ? ((stats.active_downloads / stats.total_downloads) * 100) : 0}%` }}
                  />
                </div>
              </div>

              {/* Scheduled */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-purple-400">
                    <Clock className="w-3.5 h-3.5" /> Scheduled
                  </span>
                  <span className="font-semibold">{stats?.scheduled_downloads ?? 0}</span>
                </div>
                <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${stats?.total_downloads ? ((stats.scheduled_downloads / stats.total_downloads) * 100) : 0}%` }}
                  />
                </div>
              </div>

              {/* Failed */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-rose-400">
                    <XCircle className="w-3.5 h-3.5" /> Failed
                  </span>
                  <span className="font-semibold">{stats?.failed_downloads ?? 0}</span>
                </div>
                <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${stats?.total_downloads ? ((stats.failed_downloads / stats.total_downloads) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border/40 mt-6 flex justify-between items-center">
            <span className="text-xs text-muted-foreground">View full queue</span>
            <Link href="/queue" className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1">
              Go to Queue <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Row 2: Media Sources & Format Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Media Sources */}
        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">Top Content Sources</h2>
              <p className="text-xs text-muted-foreground">Platforms analyzed and extracted</p>
            </div>
            <Link href="/sites" className="text-xs text-primary hover:underline flex items-center gap-1">
              All 1000+ <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading sources...</div>
          ) : (stats?.sources.length ?? 0) === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No download sources recorded yet. Start downloading to see platform metrics!
            </div>
          ) : (
            <div className="space-y-3.5">
              {stats?.sources.map((src) => (
                <div key={src.source} className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-foreground flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      {src.source}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {src.count} ({src.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full gradient-primary rounded-full transition-all duration-500" 
                      style={{ width: `${src.percentage}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Formats Distribution */}
        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">Format Breakdown</h2>
              <p className="text-xs text-muted-foreground">Encodings, video containers, and audio files</p>
            </div>
            <Link href="/queue" className="text-xs text-primary hover:underline flex items-center gap-1">
              Downloads <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading formats...</div>
          ) : (stats?.formats.length ?? 0) === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No format history recorded yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {stats?.formats.map((fmt) => (
                <div 
                  key={fmt.format} 
                  className="p-3.5 rounded-xl border border-border/50 bg-secondary/30 flex flex-col justify-between hover:border-primary/40 transition-colors"
                >
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
                    {fmt.format}
                  </span>
                  <div className="mt-3">
                    <span className="text-2xl font-extrabold tracking-tight">
                      {fmt.count}
                    </span>
                    <span className="text-[11px] text-muted-foreground ml-1">files</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </AppShell>
  )
}
