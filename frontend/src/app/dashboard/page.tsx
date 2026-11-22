"use client"

import { useEffect, useState, useRef } from "react"
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
  Zap,
  Activity,
  Boxes
} from "lucide-react"
import { api } from "@/services/api"
import { AnalyticsStats } from "@/types"
import { formatBytes, cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AppShell } from "@/components/layout/AppShell"

function BentoCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    cardRef.current.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`)
    cardRef.current.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`)
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={cn(
        "omni-glass-card relative overflow-hidden rounded-2xl border border-border/50 bg-surface/70 p-5 shadow-xl transition-all duration-300 hover:border-accent-primary/40 hover:shadow-2xl",
        className
      )}
    >
      {children}
    </div>
  )
}

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
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/40">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] bg-accent-primary/10 border border-accent-primary/25 text-accent-primary shadow-sm mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>TELEMETRY ENGINE // REAL-TIME PERFORMANCE</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-heading text-foreground">
              Analytics & <span className="bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-velocity bg-clip-text text-transparent">Telemetry</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Real-time line-rate throughput metrics, bandwidth aggregation, and platform extraction performance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchStats(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface border border-border/60 text-foreground hover:bg-elevated transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-accent-velocity")} />
              <span>Refresh</span>
            </button>
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-accent-primary hover:bg-accent-primary/90 text-white shadow-[0_0_20px_rgba(var(--accent-primary)/0.35)] transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>New Download</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl border border-destructive/40 bg-destructive/10 text-destructive text-sm flex items-center justify-between backdrop-blur-md">
            <span>Failed to connect to analytics engine: {error}</span>
            <Button variant="outline" size="sm" onClick={() => fetchStats(true)} className="rounded-xl">
              Retry
            </Button>
          </div>
        )}

        {/* 4 Cybernetic KPI Bento Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Processed */}
          <BentoCard>
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-25 blur-2xl bg-accent-primary" />
            <div className="relative flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Total Processed
                </span>
                <p className="text-3xl font-extrabold font-heading tracking-tight text-foreground mt-1 tabular-nums">
                  {loading ? "..." : (stats?.total_downloads ?? 0)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5 font-mono">
                  <span className="text-emerald-400 font-semibold">{stats?.completed_downloads ?? 0} completed</span>
                  <span>•</span>
                  <span className="text-rose-400">{stats?.failed_downloads ?? 0} failed</span>
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-accent-primary/15 border border-accent-primary/30 flex items-center justify-center text-accent-primary shadow-md shrink-0">
                <DownloadCloud className="w-5 h-5" />
              </div>
            </div>
          </BentoCard>

          {/* Card 2: Total Bandwidth */}
          <BentoCard>
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-25 blur-2xl bg-accent-velocity" />
            <div className="relative flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Data Downloaded
                </span>
                <p className="text-3xl font-extrabold font-heading tracking-tight text-accent-velocity mt-1 tabular-nums">
                  {loading ? "..." : formatBytes(stats?.total_bytes ?? 0)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                  15.2 Tbps line-rate fabric
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-accent-velocity/15 border border-accent-velocity/30 flex items-center justify-center text-accent-velocity shadow-md shrink-0">
                <HardDrive className="w-5 h-5" />
              </div>
            </div>
          </BentoCard>

          {/* Card 3: Success Rate */}
          <BentoCard>
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-25 blur-2xl bg-emerald-500" />
            <div className="relative flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Success Rate
                </span>
                <p className="text-3xl font-extrabold font-heading tracking-tight text-emerald-400 mt-1 tabular-nums">
                  {loading ? "..." : `${stats?.success_rate ?? 100}%`}
                </p>
                <div className="w-28 bg-elevated rounded-full h-1.5 mt-2 overflow-hidden border border-border/40">
                  <div 
                    className="bg-emerald-400 h-1.5 rounded-full transition-all duration-500 shadow-[0_0_8px_#10b981]" 
                    style={{ width: `${Math.min(stats?.success_rate ?? 100, 100)}%` }} 
                  />
                </div>
              </div>
              <div className="h-11 w-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </BentoCard>

          {/* Card 4: Active & Scheduled */}
          <BentoCard>
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-25 blur-2xl bg-accent-muxing" />
            <div className="relative flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Active & Scheduled
                </span>
                <p className="text-3xl font-extrabold font-heading tracking-tight text-accent-muxing mt-1 tabular-nums">
                  {loading ? "..." : ((stats?.active_downloads ?? 0) + (stats?.scheduled_downloads ?? 0))}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2 font-mono">
                  <span className="text-accent-muxing font-medium">{stats?.active_downloads ?? 0} running</span>
                  <span>•</span>
                  <span className="text-accent-secondary font-medium">{stats?.scheduled_downloads ?? 0} scheduled</span>
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-accent-muxing/15 border border-accent-muxing/30 flex items-center justify-center text-accent-muxing shadow-md shrink-0">
                <Layers className="w-5 h-5" />
              </div>
            </div>
          </BentoCard>
        </div>

        {/* Main Grid: 7-Day Chart & Status Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 7-Day Activity Spectrum Chart */}
          <BentoCard className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/40">
              <div>
                <h2 className="text-base font-bold font-heading text-foreground flex items-center gap-2.5">
                  <BarChart3 className="w-5 h-5 text-accent-velocity" />
                  7-Day Download Activity Timeline
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Payload frequency and aggregated byte volume over the last 7 calendar days
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-accent-velocity/10 text-accent-velocity border border-accent-velocity/30 uppercase tracking-wider">
                PAST 7 DAYS
              </span>
            </div>

            {loading ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-xs">
                Synchronizing telemetry timeline...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-border/40">
                  {stats?.daily_activity.map((item) => {
                    const barHeight = Math.max(Math.round((item.count / maxDailyCount) * 100), 8)
                    const dayName = new Date(item.date).toLocaleDateString(undefined, { weekday: "short" })
                    const dateStr = new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })

                    return (
                      <div key={item.date} className="flex-1 flex flex-col items-center gap-2 group relative">
                        {/* Tooltip */}
                        <div className="absolute -top-12 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-surface text-foreground border border-border/80 px-3 py-1.5 rounded-xl text-xs shadow-2xl whitespace-nowrap">
                          <p className="font-bold">{dateStr}: {item.count} downloads</p>
                          <p className="text-[10px] text-accent-velocity font-mono">{formatBytes(item.bytes)}</p>
                        </div>

                        {/* Bar */}
                        <div className="w-full max-w-[44px] bg-elevated/40 rounded-t-xl h-36 flex items-end p-1 border border-border/20">
                          <div
                            className="w-full rounded-t-lg bg-gradient-to-t from-accent-primary via-accent-secondary to-accent-velocity transition-all duration-500 group-hover:brightness-125 shadow-[0_0_12px_rgba(var(--accent-velocity)/0.4)]"
                            style={{ height: `${item.count > 0 ? barHeight : 6}%` }}
                          />
                        </div>

                        {/* Label */}
                        <div className="text-center">
                          <span className="text-xs font-semibold text-foreground block">{dayName}</span>
                          <span className="text-[10px] font-mono text-muted-foreground block">{dateStr}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground px-2 pt-1 font-mono">
                  <span>Total 7-day volume: <strong className="text-foreground">{stats?.daily_activity.reduce((acc, d) => acc + d.count, 0) || 0} downloads</strong></span>
                  <span>Data transferred: <strong className="text-accent-velocity">{formatBytes(stats?.daily_activity.reduce((acc, d) => acc + d.bytes, 0) || 0)}</strong></span>
                </div>
              </div>
            )}
          </BentoCard>

          {/* Status Distribution */}
          <BentoCard className="p-6 flex flex-col justify-between">
            <div>
              <div className="pb-4 border-b border-border/40 mb-5">
                <h2 className="text-base font-bold font-heading text-foreground flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Status Distribution
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Historical and active pipeline state split
                </p>
              </div>

              <div className="space-y-4">
                {/* Completed */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                    </span>
                    <span className="font-mono font-bold text-foreground tabular-nums">{stats?.completed_downloads ?? 0}</span>
                  </div>
                  <div className="h-2 w-full bg-elevated rounded-full overflow-hidden border border-border/30">
                    <div 
                      className="h-full bg-emerald-400 rounded-full transition-all duration-500 shadow-[0_0_8px_#10b981]"
                      style={{ width: `${stats?.total_downloads ? ((stats.completed_downloads / stats.total_downloads) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                {/* Active */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-accent-muxing">
                      <Zap className="w-3.5 h-3.5" /> In Progress
                    </span>
                    <span className="font-mono font-bold text-foreground tabular-nums">{stats?.active_downloads ?? 0}</span>
                  </div>
                  <div className="h-2 w-full bg-elevated rounded-full overflow-hidden border border-border/30">
                    <div 
                      className="h-full bg-accent-muxing rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(var(--accent-muxing)/0.6)]"
                      style={{ width: `${stats?.total_downloads ? ((stats.active_downloads / stats.total_downloads) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                {/* Scheduled */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-accent-secondary">
                      <Clock className="w-3.5 h-3.5" /> Scheduled
                    </span>
                    <span className="font-mono font-bold text-foreground tabular-nums">{stats?.scheduled_downloads ?? 0}</span>
                  </div>
                  <div className="h-2 w-full bg-elevated rounded-full overflow-hidden border border-border/30">
                    <div 
                      className="h-full bg-accent-secondary rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(var(--accent-secondary)/0.6)]"
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
                    <span className="font-mono font-bold text-foreground tabular-nums">{stats?.failed_downloads ?? 0}</span>
                  </div>
                  <div className="h-2 w-full bg-elevated rounded-full overflow-hidden border border-border/30">
                    <div 
                      className="h-full bg-rose-500 rounded-full transition-all duration-500"
                      style={{ width: `${stats?.total_downloads ? ((stats.failed_downloads / stats.total_downloads) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-border/40 mt-6 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">View all pipelines</span>
              <Link href="/queue" className="text-xs text-accent-velocity font-semibold hover:underline inline-flex items-center gap-1">
                Go to Queue <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </BentoCard>
        </div>

        {/* Row 2: Media Sources & Format Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Media Sources */}
          <BentoCard className="p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/40">
              <div>
                <h2 className="text-base font-bold font-heading text-foreground">Top Media Platforms</h2>
                <p className="text-xs text-muted-foreground">Streams analyzed and resolved</p>
              </div>
              <Link href="/sites" className="text-xs text-accent-primary hover:text-accent-secondary flex items-center gap-1 font-semibold">
                All 1000+ <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Synchronizing source metrics...</div>
            ) : (stats?.sources.length ?? 0) === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No download sources recorded yet. Start downloading to see platform metrics!
              </div>
            ) : (
              <div className="space-y-3.5">
                {stats?.sources.map((src) => (
                  <div key={src.source} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-accent-velocity shadow-[0_0_6px_rgba(var(--accent-velocity)/0.8)]" />
                        {src.source}
                      </span>
                      <span className="font-mono text-muted-foreground tabular-nums">
                        {src.count} ({src.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-elevated rounded-full overflow-hidden border border-border/30">
                      <div 
                        className="h-full bg-gradient-to-r from-accent-primary to-accent-velocity rounded-full transition-all duration-500" 
                        style={{ width: `${src.percentage}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </BentoCard>

          {/* Formats Distribution */}
          <BentoCard className="p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/40">
              <div>
                <h2 className="text-base font-bold font-heading text-foreground">Container & Codec Encodings</h2>
                <p className="text-xs text-muted-foreground">Demuxed audio & video profiles</p>
              </div>
              <Link href="/queue" className="text-xs text-accent-primary hover:text-accent-secondary flex items-center gap-1 font-semibold">
                Queue <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Loading formats...</div>
            ) : (stats?.formats.length ?? 0) === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No format history recorded yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {stats?.formats.map((fmt) => (
                  <div 
                    key={fmt.format} 
                    className="p-3.5 rounded-xl border border-border/50 bg-elevated/40 flex flex-col justify-between hover:border-accent-primary/40 transition-colors shadow-xs"
                  >
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-accent-primary">
                      {fmt.format}
                    </span>
                    <div className="mt-3">
                      <span className="text-2xl font-extrabold tracking-tight text-foreground font-heading tabular-nums">
                        {fmt.count}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground ml-1">files</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </BentoCard>
        </div>
      </div>
    </AppShell>
  )
}
