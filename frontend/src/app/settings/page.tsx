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
  Check,
  Gauge,
  Key,
  Upload,
  FileText,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Settings as SettingsType, SettingsUpdate, CookieStatus } from "@/types"
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
  const [cookieStatus, setCookieStatus] = useState<CookieStatus | null>(null)
  const [isUploadingCookies, setIsUploadingCookies] = useState(false)
  const [cookieText, setCookieText] = useState("")
  const [showCookiePaste, setShowCookiePaste] = useState(false)
  const [isGeneratingKey, setIsGeneratingKey] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [data, cookies] = await Promise.all([
          api.getSettings(),
          api.getCookiesStatus().catch(() => null),
        ])
        if (data.download_dir) {
          data.download_dir = data.download_dir.replace(/^["']+|["']+$/g, "").trim()
        }
        if (data.api_key && typeof window !== "undefined") {
          localStorage.setItem("omni_api_key", data.api_key)
        }
        setSettings(data)
        if (cookies) setCookieStatus(cookies)
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
        max_download_speed: settings.max_download_speed,
        retry_count: settings.retry_count,
        preferred_video_format: settings.preferred_video_format,
        preferred_audio_format: settings.preferred_audio_format,
        default_quality: settings.default_quality,
        auto_merge_audio_video: settings.auto_merge_audio_video,
        delete_temp_files: settings.delete_temp_files,
        theme: settings.theme,
        api_key: settings.api_key,
        require_api_key: settings.require_api_key,
        rate_limit_per_minute: settings.rate_limit_per_minute,
      }
      const saved = await api.updateSettings(update)
      setSettings(saved)
      if (saved.api_key && typeof window !== "undefined") {
        localStorage.setItem("omni_api_key", saved.api_key)
      }
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

  const handleGenerateKey = async () => {
    setIsGeneratingKey(true)
    try {
      const res = await api.generateApiKey()
      if (settings) {
        setSettings({ ...settings, api_key: res.api_key })
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("omni_api_key", res.api_key)
      }
      toast({
        title: "API Key Generated",
        description: "New token generated and stored for API requests.",
      })
    } catch (err: any) {
      toast({
        title: "Generation Failed",
        description: err.message || "Failed to generate API key",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingKey(false)
    }
  }

  const handleDeleteKey = async () => {
    if (!confirm("Revoke this API Key? External applications using it will lose access.")) return
    try {
      await api.deleteApiKey()
      if (settings) {
        setSettings({ ...settings, api_key: undefined, require_api_key: false })
      }
      if (typeof window !== "undefined") {
        localStorage.removeItem("omni_api_key")
      }
      toast({
        title: "API Key Revoked",
        description: "API Key removed and requirement disabled.",
      })
    } catch (err: any) {
      toast({
        title: "Revocation Failed",
        description: err.message || "Failed to revoke API key",
        variant: "destructive",
      })
    }
  }

  const handleCopyKey = () => {
    if (!settings?.api_key) return
    navigator.clipboard.writeText(settings.api_key)
    setIsCopied(true)
    toast({ title: "Copied", description: "API token copied to clipboard." })
    setTimeout(() => setIsCopied(false), 2000)
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
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-primary" />
                  Bandwidth Limiter (Speed Throttle)
                </CardTitle>
                <CardDescription>Limit maximum download speed to avoid saturating your connection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { label: "Unlimited", value: null },
                    { label: "1 MB/s", value: 1024 },
                    { label: "2.5 MB/s", value: 2560 },
                    { label: "5 MB/s", value: 5120 },
                    { label: "10 MB/s", value: 10240 },
                  ].map((preset) => {
                    const isSelected = (settings?.max_download_speed ?? null) === preset.value
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleSettingChange("max_download_speed", preset.value)}
                        className={cn(
                          "px-3 py-2 rounded-lg text-xs font-semibold border transition-all duration-200",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-border/40 bg-background/30 text-muted-foreground hover:bg-background/60"
                        )}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                </div>
                <div className="space-y-1.5 pt-2">
                  <Label htmlFor="custom_speed">Custom Bandwidth Cap (KB/s)</Label>
                  <Input
                    id="custom_speed"
                    type="number"
                    min={100}
                    placeholder="e.g. 2048 (leave empty for unlimited)"
                    value={settings?.max_download_speed ?? ""}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value) : null
                      handleSettingChange("max_download_speed", val)
                    }}
                    className="max-w-xs bg-background/50 border-border/40"
                  />
                  <p className="text-xs text-muted-foreground">
                    Current limit: {settings?.max_download_speed ? `${(settings.max_download_speed / 1024).toFixed(1)} MB/s (${settings.max_download_speed} KB/s)` : "No limit (Full speed)"}
                  </p>
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

            {/* API Access & Rate Limiting Card */}
            <Card className="border-border/40 bg-card/60 shadow-sm backdrop-blur">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-heading flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    API Access & Rate Limiting
                  </CardTitle>
                  {settings?.api_key ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Key Active
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      No Key Generated
                    </span>
                  )}
                </div>
                <CardDescription>
                  Configure API token authentication and request throttling (SlowAPI) for external apps, CLI tools, and browser extensions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Active Key Display & Actions */}
                <div className="space-y-2">
                  <Label>Active API Key</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        readOnly
                        value={settings?.api_key || ""}
                        placeholder="No key generated yet. Click generate to create one."
                        className="font-mono text-sm bg-background/50 border-border/40 pr-20"
                      />
                      {settings?.api_key && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowApiKey(!showApiKey)}
                            title={showApiKey ? "Hide Key" : "Reveal Key"}
                          >
                            {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={handleCopyKey}
                            title="Copy API Key"
                          >
                            {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGenerateKey}
                        disabled={isGeneratingKey}
                        className="gap-2 border-border/40 hover:bg-accent"
                      >
                        {isGeneratingKey ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        {settings?.api_key ? "Rotate Key" : "Generate Key"}
                      </Button>
                      {settings?.api_key && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleDeleteKey}
                          className="gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/20"
                          title="Revoke and delete API Key"
                        >
                          <Trash2 className="h-4 w-4" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pass this key in your request header: <code className="text-primary font-mono">X-API-Key: omni_live_...</code> or <code className="text-primary font-mono">Authorization: Bearer omni_live_...</code>
                  </p>
                </div>

                {/* Authentication Switch & Rate Limit Settings */}
                <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border/30">
                  <div className="flex items-center justify-between p-3.5 rounded-lg bg-background/30 border border-border/20">
                    <div className="space-y-0.5 pr-2">
                      <Label className="text-sm font-medium">Require API Key for External Access</Label>
                      <p className="text-xs text-muted-foreground">
                        Block unauthenticated external requests with HTTP 401/403
                      </p>
                    </div>
                    <Switch
                      checked={Boolean(settings?.require_api_key)}
                      disabled={!settings?.api_key}
                      onCheckedChange={(v) => handleSettingChange("require_api_key", v)}
                    />
                  </div>

                  <div className="space-y-2 p-3.5 rounded-lg bg-background/30 border border-border/20">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="rate_limit_per_minute" className="text-sm font-medium">
                        SlowAPI Throttle (Requests/min)
                      </Label>
                      <span className="text-xs font-mono text-muted-foreground">
                        {settings?.rate_limit_per_minute || 60}/min
                      </span>
                    </div>
                    <Input
                      id="rate_limit_per_minute"
                      type="number"
                      min={10}
                      max={600}
                      step={10}
                      value={settings?.rate_limit_per_minute || 60}
                      onChange={(e) => handleSettingChange("rate_limit_per_minute", parseInt(e.target.value) || 60)}
                      className="bg-background/50 border-border/40 font-mono text-sm h-8"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Rate limit bucket tracked per API key or client IP address
                    </p>
                  </div>
                </div>

                {/* Developer Integration Code Example */}
                <div className="rounded-lg bg-background/50 border border-border/30 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      cURL Quickstart Example
                    </span>
                    <span className="font-mono text-[11px]">POST /api/analyze</span>
                  </div>
                  <pre className="p-2.5 rounded bg-muted/30 text-[11px] font-mono text-muted-foreground overflow-x-auto select-all leading-relaxed">
{`curl -X POST http://localhost:8000/api/analyze \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${settings?.api_key || "<YOUR_API_KEY>"}" \\
  -d '{"url": "https://example.com/live/playlist.m3u8"}'`}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/60 shadow-sm backdrop-blur">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-heading flex items-center gap-2">
                    <Key className="h-5 w-5 text-primary" />
                    Authentication & Cookies (cookies.txt)
                  </CardTitle>
                  {cookieStatus?.exists ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Active ({cookieStatus.line_count} cookies)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      No cookies loaded
                    </span>
                  )}
                </div>
                <CardDescription className="space-y-1">
                  <p>Import Netscape-format cookies to download age-restricted, premium, or private videos from YouTube, Instagram, etc.</p>
                  <p className="text-[11px] text-primary/90 font-medium">💡 Quickest method: Click &quot;🔑 Sync Browser Cookies&quot; in the OmniDownload browser extension popup to sync your active session in 1 click.</p>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".txt"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setIsUploadingCookies(true)
                          try {
                            await api.uploadCookies(file)
                            const status = await api.getCookiesStatus()
                            setCookieStatus(status)
                            toast({ title: "Cookies Uploaded", description: "Cookie file active for media extractors." })
                          } catch (err: any) {
                            toast({ title: "Upload Failed", description: err.message, variant: "destructive" })
                          } finally {
                            setIsUploadingCookies(false)
                          }
                        }
                      }}
                    />
                    <Button variant="outline" size="sm" asChild className="gap-2 border-border/40 hover:bg-accent" disabled={isUploadingCookies}>
                      <span>
                        {isUploadingCookies ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Upload cookies.txt
                      </span>
                    </Button>
                  </label>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCookiePaste(!showCookiePaste)}
                    className="gap-2 border-border/40 hover:bg-accent"
                  >
                    <FileText className="h-4 w-4" />
                    {showCookiePaste ? "Hide Editor" : "Paste Cookies Text"}
                  </Button>

                  {cookieStatus?.exists && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (confirm("Delete stored cookies?")) {
                          await api.deleteCookies()
                          const status = await api.getCookiesStatus()
                          setCookieStatus(status)
                          toast({ title: "Cookies Removed" })
                        }
                      }}
                      className="gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/20 ml-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove Cookies
                    </Button>
                  )}
                </div>

                {showCookiePaste && (
                  <div className="space-y-2 pt-2 animate-in fade-in">
                    <textarea
                      rows={5}
                      placeholder="# Netscape HTTP Cookie File&#10;.youtube.com&#9;TRUE&#9;/&#9;TRUE&#9;1740000000&#9;VISITOR_INFO1_LIVE&#9;xyz..."
                      value={cookieText}
                      onChange={(e) => setCookieText(e.target.value)}
                      className="w-full p-3 font-mono text-xs rounded-xl bg-background/60 border border-border/60 outline-none focus:border-primary resize-none leading-relaxed"
                    />
                    <Button
                      size="sm"
                      disabled={!cookieText.trim() || isUploadingCookies}
                      onClick={async () => {
                        setIsUploadingCookies(true)
                        try {
                          await api.uploadCookies(undefined, cookieText)
                          setCookieText("")
                          setShowCookiePaste(false)
                          const status = await api.getCookiesStatus()
                          setCookieStatus(status)
                          toast({ title: "Cookies Saved", description: "Active for all extractors." })
                        } catch (err: any) {
                          toast({ title: "Save Failed", description: err.message, variant: "destructive" })
                        } finally {
                          setIsUploadingCookies(false)
                        }
                      }}
                      className="gap-2 gradient-primary text-white text-xs h-8"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save Pasted Cookies
                    </Button>
                  </div>
                )}
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