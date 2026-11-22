import { useState, useEffect } from "react"
import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { DownloadInfo, HistoryItem, Settings, QueueStatus } from "@/types"

interface DownloadState {
  _hasHydrated: boolean
  setHasHydrated: (state: boolean) => void
  queue: DownloadInfo[]
  history: HistoryItem[]
  settings: Settings | null
  activeDownloadId: string | null
  isAnalyzing: boolean
  analyzeError: string | null
  
  setQueue: (queue: DownloadInfo[]) => void
  addDownload: (download: DownloadInfo) => void
  updateDownload: (id: string, updates: Partial<DownloadInfo>) => void
  removeDownload: (id: string) => void
  setActiveDownload: (id: string | null) => void
  
  setHistory: (history: HistoryItem[]) => void
  addHistoryItem: (item: HistoryItem) => void
  removeHistoryItem: (id: string) => void
  clearHistory: () => void
  
  setSettings: (settings: Settings) => void
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  
  setAnalyzing: (isAnalyzing: boolean) => void
  setAnalyzeError: (error: string | null) => void
}

export const useDownloadStore = create<DownloadState>()(
  persist(
    (set) => ({
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      queue: [],
      history: [],
      settings: null,
      activeDownloadId: null,
      isAnalyzing: false,
      analyzeError: null,
      
      setQueue: (queue) => set({ queue }),
      addDownload: (download) => set((state) => ({ queue: [download, ...state.queue] })),
      updateDownload: (id, updates) => set((state) => ({
        queue: state.queue.map((d) => d.id === id ? { ...d, ...updates } : d)
      })),
      removeDownload: (id) => set((state) => ({
        queue: state.queue.filter((d) => d.id !== id)
      })),
      setActiveDownload: (id) => set({ activeDownloadId: id }),
      
      setHistory: (history) => set({ history }),
      addHistoryItem: (item) => set((state) => ({ history: [item, ...state.history] })),
      removeHistoryItem: (id) => set((state) => ({
        history: state.history.filter((h) => h.id !== id)
      })),
      clearHistory: () => set({ history: [] }),
      
      setSettings: (settings) => set({ settings }),
      updateSetting: (key, value) => set((state) => ({
        settings: state.settings ? { ...state.settings, [key]: value } : null
      })),
      
      setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
      setAnalyzeError: (error) => set({ analyzeError: error }),
    }),
    {
      name: "omnidownload-store",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
      partialize: (state) => ({
        settings: state.settings,
        history: state.history.slice(0, 100),
      }),
    }
  )
)

export function useStoreHydration() {
  const [hydrated, setHydrated] = useState(false)
  const storeHydrated = useDownloadStore((s) => s._hasHydrated)

  useEffect(() => {
    setHydrated(true)
  }, [])

  return hydrated && storeHydrated
}