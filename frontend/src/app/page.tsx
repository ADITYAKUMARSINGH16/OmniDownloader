"use client"

import { Download, CheckCircle, TrendingUp, Youtube, Twitter, Instagram, Facebook, HardDrive, Link2, ChevronRight, Zap, ArrowDownToLine } from "lucide-react"
import { Reddit } from "@/components/icons"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UrlAnalyzer } from "@/components/download/UrlAnalyzer"
import { DownloadQueue } from "@/components/download/DownloadQueue"
import { cn, formatBytes } from "@/lib/utils"
import { useDownloadStore } from "@/hooks/useStore"
import { AppShell } from "@/components/layout/AppShell"

const sites = [
  { name: "YouTube", icon: Youtube, color: "text-red-400" },
  { name: "Reddit", icon: Reddit, color: "text-orange-400" },
  { name: "Twitter/X", icon: Twitter, color: "text-sky-400" },
  { name: "Instagram", icon: Instagram, color: "text-pink-400" },
  { name: "Facebook", icon: Facebook, color: "text-blue-400" },
  { name: "Terabox", icon: HardDrive, color: "text-teal-400" },
  { name: "Direct Links", icon: Link2, color: "text-violet-400" },
]

export default function DashboardPage() {
  const { queue } = useDownloadStore()

  const activeCount = queue.filter((d) => ["downloading", "queued"].includes(d.status)).length
  const completedCount = queue.filter((d) => d.status === "completed").length
  const totalBytes = queue.reduce((acc, d) => acc + (d.downloaded_size || d.file_size || 0), 0)
  const failedCount = queue.filter((d) => d.status === "failed").length
  const totalFinished = completedCount + failedCount
  const successRate = totalFinished > 0 ? Math.round((completedCount / totalFinished) * 100) : 100

  const stats = [
    { label: "Active", value: activeCount.toString(), icon: Zap, gradient: "from-violet-500 to-blue-500" },
    { label: "Completed", value: completedCount.toString(), icon: CheckCircle, gradient: "from-emerald-500 to-green-400" },
    { label: "Downloaded", value: totalBytes > 0 ? formatBytes(totalBytes) : "0 B", icon: ArrowDownToLine, gradient: "from-blue-500 to-cyan-400" },
    { label: "Success Rate", value: `${successRate}%`, icon: TrendingUp, gradient: "from-amber-500 to-orange-400" },
  ]

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="relative group rounded-xl border border-border/40 bg-card/60 p-4 hover:border-primary/20 hover:shadow-md transition-all duration-300 overflow-hidden"
              >
                {/* Subtle gradient bg */}
                <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.06] blur-2xl bg-gradient-to-br", stat.gradient)} />
                <div className="relative flex items-center gap-3">
                  <div className={cn("h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm", stat.gradient)}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-heading tracking-tight">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            <UrlAnalyzer />
            
            <Card className="border-border/40 bg-card/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-heading flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-primary" />
                    Recent Downloads
                  </span>
                  <Link
                    href="/queue"
                    className="text-sm font-normal text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group"
                  >
                    View all
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DownloadQueue compact={true} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="border-border/40 bg-card/60 shadow-sm overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-heading">Supported Sites</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {sites.map((site) => (
                    <Link
                      key={site.name}
                      href="/sites"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all duration-200 group"
                    >
                      <site.icon className={cn("h-5 w-5 shrink-0", site.color)} />
                      <span className="flex-1">{site.name}</span>
                      <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  )
}