import axios, { AxiosInstance, AxiosError } from "axios"
import type { 
  AnalyzeResponse, 
  DownloadInfo, 
  DownloadRequest, 
  DownloadResponse, 
  BatchDownloadRequest,
  BatchDownloadResponse,
  QueueStatus, 
  HistoryItem, 
  Settings, 
  SettingsUpdate,
  ApiKeyResponse,
  Extractor,
  ProgressUpdate,
  CookieStatus,
  AnalyticsStats,
  Aria2Status
} from "@/types"


const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api"

class ApiService {
  private client: AxiosInstance
  private ws: WebSocket | null = null
  private progressCallbacks: Map<string, (progress: ProgressUpdate) => void> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    })

    this.client.interceptors.request.use((config) => {
      if (typeof window !== "undefined") {
        const storedKey = localStorage.getItem("omni_api_key")
        if (storedKey) {
          config.headers["X-API-Key"] = storedKey
        }
      }
      return config
    })

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.data) {
          return Promise.reject(error.response.data)
        }
        return Promise.reject(error)
      }
    )
  }

  async analyzeUrl(url: string): Promise<AnalyzeResponse> {
    const response = await this.client.post<AnalyzeResponse>("/analyze", { url })
    return response.data
  }

  async uploadTorrentFile(file: File): Promise<AnalyzeResponse> {
    const formData = new FormData()
    formData.append("file", file)
    const response = await this.client.post<AnalyzeResponse>("/torrent/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return response.data
  }

  async getAria2Status(): Promise<Aria2Status> {
    const response = await this.client.get<Aria2Status>("/system/aria2-status")
    return response.data
  }

  async startDownload(request: DownloadRequest): Promise<DownloadResponse> {
    const response = await this.client.post<DownloadResponse>("/download", request)
    return response.data
  }

  async batchDownload(request: BatchDownloadRequest): Promise<BatchDownloadResponse> {
    const response = await this.client.post<BatchDownloadResponse>("/batch-download", request)
    return response.data
  }

  async getDownload(id: string): Promise<DownloadInfo> {
    const response = await this.client.get<DownloadInfo>(`/download/${id}`)
    return response.data
  }

  async pauseDownload(id: string): Promise<void> {
    await this.client.post(`/download/${id}/pause`)
  }

  async resumeDownload(id: string): Promise<void> {
    await this.client.post(`/download/${id}/resume`)
  }

  async cancelDownload(id: string): Promise<void> {
    await this.client.post(`/download/${id}/cancel`)
  }

  async deleteDownload(id: string): Promise<void> {
    await this.client.delete(`/download/${id}`)
  }

  async retryDownload(id: string): Promise<void> {
    await this.client.post(`/download/${id}/retry`)
  }

  async getQueue(): Promise<QueueStatus> {
    const response = await this.client.get<QueueStatus>("/queue")
    return response.data
  }

  async getHistory(params?: {
    limit?: number
    offset?: number
    search?: string
    source?: string
    status?: string
    sort_by?: string
    sort_order?: string
  }): Promise<HistoryItem[]> {
    const response = await this.client.get<HistoryItem[]>("/history", { params })
    return response.data
  }

  async clearHistory(): Promise<void> {
    await this.client.delete("/history")
  }

  async getSettings(): Promise<Settings> {
    const response = await this.client.get<Settings>("/settings")
    return response.data
  }

  async updateSettings(settings: SettingsUpdate): Promise<Settings> {
    const response = await this.client.put<Settings>("/settings", settings)
    return response.data
  }

  async generateApiKey(): Promise<ApiKeyResponse> {
    const response = await this.client.post<ApiKeyResponse>("/settings/api-key/generate")
    return response.data
  }

  async deleteApiKey(): Promise<{ success: boolean; message: string }> {
    const response = await this.client.delete<{ success: boolean; message: string }>("/settings/api-key")
    return response.data
  }

  async getExtractors(): Promise<{ extractors: Extractor[] }> {
    const response = await this.client.get<{ extractors: Extractor[] }>("/extractors")
    return response.data
  }

  async openFolder(id?: string, path?: string): Promise<{ success: boolean; path?: string; folder?: string; error?: string }> {
    const response = await this.client.post<{ success: boolean; path?: string; folder?: string; error?: string }>("/open-folder", {
      download_id: id,
      path,
    })
    return response.data
  }

  async getCookiesStatus(): Promise<CookieStatus> {
    const response = await this.client.get<CookieStatus>("/settings/cookies")
    return response.data
  }

  async uploadCookies(file?: File, rawContent?: string): Promise<{ success: boolean; message: string }> {
    const formData = new FormData()
    if (file) {
      formData.append("file", file)
    }
    if (rawContent) {
      formData.append("raw_content", rawContent)
    }
    const response = await this.client.post<{ success: boolean; message: string }>("/settings/cookies", formData)
    return response.data
  }

  async deleteCookies(): Promise<{ success: boolean; message: string }> {
    const response = await this.client.delete<{ success: boolean; message: string }>("/settings/cookies")
    return response.data
  }

  async exportHistory(format: "json" | "csv" = "json"): Promise<Blob> {
    const response = await this.client.get(`/history/export?format=${format}`, {
      responseType: "blob",
    })
    return response.data
  }

  async importHistory(file: File): Promise<{ success: boolean; imported_count: number }> {
    const formData = new FormData()
    formData.append("file", file)
    const response = await this.client.post<{ success: boolean; imported_count: number }>("/history/import", formData)
    return response.data
  }

  async getAnalyticsStats(): Promise<AnalyticsStats> {
    const response = await this.client.get<AnalyticsStats>("/analytics/stats")
    return response.data
  }

  getDownloadFileUrl(id: string): string {
    return `${API_BASE}/download/${id}/file`
  }

  private getWsUrl(clientId: string): string {
    if (typeof window === "undefined") return ""
    if (API_BASE.startsWith("http")) {
      return `${API_BASE.replace(/^http/, "ws")}/ws/${clientId}`
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const host = window.location.hostname || "localhost"
    return `${protocol}//${host}:8000/api/ws/${clientId}`
  }

  connectWebSocket(clientId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.getWsUrl(clientId)
      if (!wsUrl) return resolve()
      
      try {
        this.ws = new WebSocket(wsUrl)
        
        this.ws.onopen = () => {
          this.reconnectAttempts = 0
          resolve()
        }
        
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === "progress" && data.download_id) {
              const callback = this.progressCallbacks.get(data.download_id)
              if (callback) {
                callback(data)
              }
            }
          } catch (e) {
            console.error("Failed to parse WebSocket message:", e)
          }
        }
        
        this.ws.onclose = () => {
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            setTimeout(() => this.connectWebSocket(clientId), 1000 * this.reconnectAttempts)
          }
        }
        
        this.ws.onerror = (error) => {
          reject(error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  subscribeToProgress(downloadId: string, callback: (progress: ProgressUpdate) => void): void {
    this.progressCallbacks.set(downloadId, callback)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "subscribe", download_id: downloadId }))
    }
  }

  unsubscribeFromProgress(downloadId: string): void {
    this.progressCallbacks.delete(downloadId)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "unsubscribe", download_id: downloadId }))
    }
  }
}

export const api = new ApiService()