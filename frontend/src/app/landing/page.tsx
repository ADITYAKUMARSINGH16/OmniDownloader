"use client"

import { EngineDeconstructionLanding } from "@/components/landing/EngineDeconstructionLanding"
import { useDownloadStore } from "@/hooks/useStore"
import { formatBytes } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/layout/AppShell"

export default function LandingPage() {
  const router = useRouter()
  const { queue } = useDownloadStore()

  const activeCount = queue.filter((d) => ["downloading", "queued"].includes(d.status)).length
  const completedCount = queue.filter((d) => d.status === "completed").length
  const totalBytes = queue.reduce((acc, d) => acc + (d.downloaded_size || d.file_size || 0), 0)
  const failedCount = queue.filter((d) => d.status === "failed").length
  const totalFinished = completedCount + failedCount
  const successRate = totalFinished > 0 ? Math.round((completedCount / totalFinished) * 100) : 100

  return (
    <AppShell activeTab="overview">
      <EngineDeconstructionLanding
        onLaunchConsole={() => router.push("/?view=console")}
        activeQueueCount={activeCount}
        totalDownloadedFormatted={totalBytes > 0 ? formatBytes(totalBytes) : "0 B"}
        successRate={successRate}
      />
    </AppShell>
  )
}
