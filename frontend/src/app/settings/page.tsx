"use client"

import { useState, useEffect } from "react"
import {
  Download,
  Settings,
  Save,
  HardDrive,
  Moon,
  Sun,
  Monitor,
  Trash2,
  Sliders,
  Palette,
  ShieldAlert,
  Folder,
  Loader2,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Settings as SettingsType, SettingsUpdate } from "@/types"
import { api } from "@/services/api"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/useToast"
import { AppShell } from "@/components/layout/AppShell"
import { useTheme } from "next-themes"

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isOpeningFolder, setIsOpeningFolder] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await api.getSettings()
        if (data.download_dir) {
          data.download_dir = data.download_dir.replace(/^["']+|["']+$/g, "").trim()
        }
        setSettings(data)
      } catch (e) {
        console.error("Failed to load settings:", e)
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    if (!settings) return
    setIsSaving(true)
    try {
      const cleanDir = settings.download_dir
        ? settings.download_dir.replace(/^["']+|["']+$/g, "").trim()
        : ""

      const update: SettingsUpdate = {
        download_dir: cleanDir,
        max_concurrent_downloads: settings.max_concurrent_downloads,
        retry_count: settings.retry_count,
        preferred_video_format: settings.preferred_video_format,
        preferred_audio_format: settings.preferred_audio_format,
        default_quality: settings.default_quality,
        auto_merge_audio_video: settings.auto_merge_audio_video,
        delete_temp_files: settings.delete_temp_files,
        theme: settings.theme,
      }
      const saved = await api.updateSettings(update)
      setSettings(saved)
      toast({
        title: "Settings Saved",
        description: "Your preferences have been successfully updated.",
      })
    } catch (e: any) {
      console.error("Failed to save settings:", e)
      toast({
        title: "Error",
        description: e.response?.data?.detail || e.message || "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenFolder = async () => {
    if (!settings?.download_dir) return
    setIsOpeningFolder(true)
    try {
      const cleanPath = settings.download_dir.replace(/^["']+|["']+$/g, "").trim()
      const res = await api.openFolder(undefined, cleanPath)
      if (res.success) {
        toast({
          title: "Folder Opened",
          description: `Opened destination folder: ${res.folder || cleanPath}`,
        })
      } else {
        toast({
          title: "Could not open folder",
          description: res.error || "Please verify the path exists.",
          variant: "destructive",
        })
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.response?.data?.detail || e.message || "Failed to open folder.",
        variant: "destructive",
      })
    } finally {
      setIsOpeningFolder(false)
    }
  }

  const handleSettingChange = (key: keyof SettingsType, value: any) => {
    if (!settings) return
    if (key === "download_dir" && typeof value === "string") {
      value = value.replace(/^["']+|["']+$/g, "").trim()
    }
    setSettings({ ...settings, [key]: value })
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
          <div>
            <h1 className="text-3xl font-bold font-heading tracking-tight flex items-center gap-3">
              <span className="p-2 rounded-xl gradient-primary shadow-sm text-white inline-flex">
                <Settings className="h-6 w-6" />
              </span>
              Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure download directories, defaults, formats, and system behaviors
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="gradient-primary text-white shadow-md hover:shadow-lg transition-all gap-2 self-start sm:self-auto"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-card/70 border border-border/40 p-1 rounded-xl grid grid-cols-4 w-full sm:w-auto sm:inline-grid">
            <TabsTrigger value="general" className="rounded-lg gap-2 text-xs sm:text-sm">
              <Folder className="h-4 w-4 hidden sm:inline" />
              General
            </TabsTrigger>
            <TabsTrigger value="downloads" className="rounded-lg gap-2 text-xs sm:text-sm">
              <Sliders className="h-4 w-4 hidden sm:inline" />
              Downloads
            </TabsTrigger>
            <TabsTrigger value="appearance" className="rounded-lg gap-2 text-xs sm:text-sm">
              <Palette className="h-4 w-4 hidden sm:inline" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="advanced" className="rounded-lg gap-2 text-xs sm:text-sm">
              <ShieldAlert className="h-4 w-4 hidden sm:inline" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card className="border-border/40 bg-card/60 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg font-heading">Download Directory</CardTitle>
                <CardDescription>Directory where downloaded media files and assets are saved</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="download_dir">Destination Folder Path</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <HardDrive className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="download_dir"
                        value={settings?.download_dir || ""}
                        onChange={(e) => handleSettingChange("download_dir", e.target.value)}
                        onBlur={(e) => {
                          const cleaned = e.target.value.replace(/^["']+|["']+$/g, "").trim()
                          if (cleaned !== e.target.value) {
                            handleSettingChange("download_dir", cleaned)
                          }
                        }}
                        placeholder="e.g. C:\Users\YourName\Downloads or ./downloads"
                        className="pl-10 bg-background/50 border-border/40 font-mono text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleOpenFolder}
                      disabled={!settings?.download_dir || isOpeningFolder}
                      className="gap-2 shrink-0 border-border/40 hover:bg-accent"
                      title="Open this folder in file explorer"
                    >
                      {isOpeningFolder ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Folder className="h-4 w-4" />
                      )}
                      Open Folder
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supports local relative or absolute system paths. Quotes from &quot;Copy as path&quot; are automatically stripped.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/60 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg font-heading">Default Media Formats</CardTitle>
                <CardDescription>Default container and encoding formats for downloaded media</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="preferred_video_format">Preferred Video Container</Label>
                  <Select
                    value={settings?.preferred_video_format || "mp4"}
                    onValueChange={(v) => handleSettingChange("preferred_video_format", v)}
                  >
                    <SelectTrigger className="bg-background/50 border-border/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp4">MP4 (Recommended / Universal)</SelectItem>
                      <SelectItem value="mkv">MKV (High Compatibility)</SelectItem>
                      <SelectItem value="webm">WebM (Open Source)</SelectItem>
                      <SelectItem value="mov">MOV (Apple QuickTime)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferred_audio_format">Preferred Audio Format</Label>
                  <Select
                    value={settings?.preferred_audio_format || "mp3"}
                    onValueChange={(v) => handleSettingChange("preferred_audio_format", v)}
                  >
                    <SelectTrigger className="bg-background/50 border-border/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp3">MP3 (Universal Audio)</SelectItem>
                      <SelectItem value="m4a">M4A (AAC Stream)</SelectItem>
                      <SelectItem value="flac">FLAC (Lossless)</SelectItem>
                      <SelectItem value="wav">WAV (Uncompressed)</SelectItem>
                      <SelectItem value="opus">OPUS (Efficient)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Downloads Tab */}
          <TabsContent value="downloads" className="space-y-6">
            <Card className="border-border/40 bg-card/60 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg font-heading">Concurrency & Queuing</CardTitle>
                <CardDescription>Manage active transfer limits and automatic retry behavior</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="max_concurrent_downloads">Max Concurrent Downloads</Label>
                  <Input
                    id="max_concurrent_downloads"
                    type="number"
                    min={1}
                    max={10}
                    value={settings?.max_concurrent_downloads || 2}
                    onChange={(e) => handleSettingChange("max_concurrent_downloads", parseInt(e.target.value) || 1)}
                    className="bg-background/50 border-border/40"
                  />
                  <p className="text-xs text-muted-foreground">Range: 1 to 10 parallel downloads</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retry_count">Max Retry Attempts</Label>
                  <Input
                    id="retry_count"
                    type="number"
                    min={0}
                    max={10}
                    value={settings?.retry_count ?? 3}
                    onChange={(e) => handleSettingChange("retry_count", parseInt(e.target.value) || 0)}
                    className="bg-background/50 border-border/40"
                  />
                  <p className="text-xs text-muted-foreground">Automatic retries on connection error</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/60 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg font-heading">Default Quality Target</CardTitle>
                <CardDescription>Target resolution when multiple video qualities are available</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-xs space-y-2">
                  <Label>Quality Preset</Label>
                  <Select
                    value={settings?.default_quality || "1080p"}
                    onValueChange={(v) => handleSettingChange("default_quality", v)}
                  >
                    <SelectTrigger className="bg-background/50 border-border/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="best">Best Available (Highest)</SelectItem>
                      <SelectItem value="2160p">2160p (4K Ultra HD)</SelectItem>
                      <SelectItem value="1440p">1440p (2K Quad HD)</SelectItem>
                      <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                      <SelectItem value="720p">720p (HD)</SelectItem>
                      <SelectItem value="480p">480p (Standard)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/60 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg font-heading">Processing Rules</CardTitle>
                <CardDescription>FFmpeg merging and temporary file handling</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-border/20">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Auto-Merge Video & Audio</Label>
                    <p className="text-xs text-muted-foreground">
                      Use FFmpeg to seamlessly combine separate video and high-bitrate audio streams
                    </p>
                  </div>
                  <Switch
                    checked={settings?.auto_merge_audio_video ?? true}
                    onCheckedChange={(v) => handleSettingChange("auto_merge_audio_video", v)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-border/20">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Clean Up Temporary Files</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically remove partial parts and conversion artifacts upon completion
                    </p>
                  </div>
                  <Switch
                    checked={settings?.delete_temp_files ?? true}
                    onCheckedChange={(v) => handleSettingChange("delete_temp_files", v)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <Card className="border-border/40 bg-card/60 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg font-heading">Theme Palette</CardTitle>
                <CardDescription>Select your preferred visual style and appearance mode</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: "dark", label: "Dark Mode", desc: "Sleek slate & vibrant accents", icon: Moon },
                    { value: "light", label: "Light Mode", desc: "Clean and high-contrast", icon: Sun },
                    { value: "system", label: "System", desc: "Follow OS preference", icon: Monitor },
                  ].map((t) => {
                    const isSelected = (settings?.theme || "dark") === t.value
                    const Icon = t.icon
                    return (
                      <button
                        type="button"
                        key={t.value}
                        onClick={() => {
                          handleSettingChange("theme", t.value)
                          setTheme(t.value)
                        }}
                        className={cn(
                          "relative flex flex-col items-center p-5 rounded-xl border text-center transition-all duration-200",
                          isSelected
                            ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/20"
                            : "border-border/40 bg-background/30 hover:border-border hover:bg-background/60"
                        )}
                      >
                        {isSelected && (
                          <span className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full gradient-primary flex items-center justify-center text-white">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                        <Icon className={cn("h-7 w-7 mb-2.5", isSelected ? "text-primary" : "text-muted-foreground")} />
                        <span className="text-sm font-semibold">{t.label}</span>
                        <span className="text-xs text-muted-foreground mt-1">{t.desc}</span>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <Card className="border-border/40 bg-card/60 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg font-heading">Application Preferences</CardTitle>
                <CardDescription>System integration and update checks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-border/20">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Desktop Notifications</Label>
                    <p className="text-xs text-muted-foreground">Alert when downloads finish or fail</p>
                  </div>
                  <Switch defaultChecked={true} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-border/20">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Auto-Check for yt-dlp Updates</Label>
                    <p className="text-xs text-muted-foreground">Keep extractor engines up to date for maximum site support</p>
                  </div>
                  <Switch defaultChecked={true} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-rose-500/30 bg-rose-950/10 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg font-heading text-rose-400 flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>Irreversible and destructive data actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-background/40 border border-rose-500/20">
                  <div>
                    <h5 className="text-sm font-semibold text-foreground">Clear All Download History</h5>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Permanently wipes all historical download records and logs from the database
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5 self-start sm:self-auto flex-shrink-0"
                    onClick={async () => {
                      if (confirm("Are you sure you want to permanently clear all history?")) {
                        try {
                          await api.clearHistory()
                          toast({ title: "History Cleared", description: "All records wiped" })
                        } catch (e) {
                          toast({ title: "Error", description: "Failed to clear history", variant: "destructive" })
                        }
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear History
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}