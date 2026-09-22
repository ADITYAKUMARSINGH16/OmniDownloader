"use client"

import { useState } from "react"
import {
  Puzzle,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Chrome,
  Folder,
  MousePointerClick,
  Download
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/useToast"

interface BrowserExtensionModalProps {
  children?: React.ReactNode
  triggerVariant?: "default" | "outline" | "ghost" | "secondary"
  triggerClassName?: string
}

export function BrowserExtensionModal({
  children,
  triggerVariant = "outline",
  triggerClassName,
}: BrowserExtensionModalProps) {
  const [open, setOpen] = useState(false)
  const [copiedPath, setCopiedPath] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)

  const extensionFolderName = "browser-extension"

  const handleCopyPath = () => {
    navigator.clipboard.writeText(extensionFolderName)
    setCopiedPath(true)
    toast({
      title: "Folder Name Copied",
      description: `Copied "${extensionFolderName}" to your clipboard.`,
    })
    setTimeout(() => setCopiedPath(false), 2000)
  }

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(true)
    toast({
      title: "URL Copied",
      description: `Paste "${url}" into your browser address bar.`,
    })
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ? (
          children
        ) : (
          <Button
            variant={triggerVariant}
            size="sm"
            className={triggerClassName || "gap-2 text-xs font-medium border-border/50 hover:border-primary/40 hover:bg-accent/80 transition-all"}
          >
            <Puzzle className="h-4 w-4 text-primary" />
            <span>Browser Extension</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-xl p-6 bg-card/95 border-border/50 backdrop-blur-xl shadow-2xl rounded-2xl">
        <DialogHeader className="space-y-3 pb-2 border-b border-border/40 text-left">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white shadow-md">
              <Puzzle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-heading font-bold flex items-center gap-2">
                OmniDownload Browser Extension
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Manifest V3
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                1-click download capture for Chrome, Brave, Edge, Opera, and Arc
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Feature Highlights */}
        <div className="grid grid-cols-3 gap-2.5 my-2">
          <div className="p-2.5 rounded-xl border border-border/40 bg-background/50 flex flex-col items-center text-center gap-1.5">
            <MousePointerClick className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">Right-Click Download</span>
            <span className="text-[11px] text-muted-foreground">Context menu on any video or link</span>
          </div>
          <div className="p-2.5 rounded-xl border border-border/40 bg-background/50 flex flex-col items-center text-center gap-1.5">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <span className="text-xs font-semibold">Media Sniffer</span>
            <span className="text-[11px] text-muted-foreground">Auto-detects streams on current tab</span>
          </div>
          <div className="p-2.5 rounded-xl border border-border/40 bg-background/50 flex flex-col items-center text-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-semibold">Local & Private</span>
            <span className="text-[11px] text-muted-foreground">Direct WebSocket to your local backend</span>
          </div>
        </div>

        {/* Installation Steps */}
        <div className="space-y-3 pt-1">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            3-Step Installation Guide
          </h4>

          {/* Step 1 */}
          <div className="flex gap-3 items-start p-3 rounded-xl border border-border/40 bg-background/40">
            <div className="h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              1
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <p className="text-xs font-medium">Open your browser extensions manager</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-[11px] bg-muted/60 px-2 py-0.5 rounded border border-border/40 font-mono text-foreground">
                  chrome://extensions
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyUrl("chrome://extensions")}
                  className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                >
                  {copiedUrl ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copiedUrl ? "Copied" : "Copy"}
                </Button>
                <span className="text-[11px] text-muted-foreground">or <code className="text-[11px]">edge://extensions</code></span>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-3 items-start p-3 rounded-xl border border-border/40 bg-background/40">
            <div className="h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              2
            </div>
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-xs font-medium">Enable Developer Mode</p>
              <p className="text-[11px] text-muted-foreground">
                Toggle the <strong className="text-foreground">Developer mode</strong> switch located in the top-right corner of the Extensions page.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-3 items-start p-3 rounded-xl border border-border/40 bg-background/40">
            <div className="h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              3
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <p className="text-xs font-medium">Click &ldquo;Load unpacked&rdquo; & select directory</p>
              <p className="text-[11px] text-muted-foreground">
                Click the <strong className="text-foreground">Load unpacked</strong> button and select the <code className="text-[11px] font-mono font-semibold text-primary">browser-extension</code> folder inside this project.
              </p>
              <div className="flex items-center gap-2 pt-0.5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyPath}
                  className="h-7 text-xs gap-1.5 font-mono"
                >
                  <Folder className="h-3.5 w-3.5 text-primary" />
                  <span>browser-extension</span>
                  {copiedPath ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400 ml-1" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
                  )}
                </Button>
                <span className="text-[11px] text-muted-foreground">
                  (inside OmniDownloader project root)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Backend API: http://localhost:8000</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="text-xs h-7"
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
