const DEFAULT_API_BASE = 'http://127.0.0.1:8000/api'
const STORAGE_KEY = 'omnidownload_config'

// In-memory fallback stream sniffer storage per tab
const tabStreamsFallback = new Map()

async function getStoredTabStreams(tabId) {
  if (!tabId || tabId < 0) return []
  try {
    if (chrome.storage && chrome.storage.session) {
      const key = `streams_${tabId}`
      const result = await chrome.storage.session.get(key)
      return result[key] || []
    }
  } catch (e) {
    console.debug('storage.session get failed, using fallback', e)
  }
  return tabStreamsFallback.get(tabId) || []
}

async function saveStoredTabStreams(tabId, streams) {
  if (!tabId || tabId < 0) return
  const capped = streams.slice(-10) // Store latest 10 streams per tab
  tabStreamsFallback.set(tabId, capped)
  try {
    if (chrome.storage && chrome.storage.session) {
      const key = `streams_${tabId}`
      await chrome.storage.session.set({ [key]: capped })
    }
  } catch (e) {
    console.debug('storage.session set failed', e)
  }
}

async function removeStoredTabStreams(tabId) {
  if (!tabId) return
  tabStreamsFallback.delete(tabId)
  try {
    if (chrome.storage && chrome.storage.session) {
      await chrome.storage.session.remove(`streams_${tabId}`)
    }
  } catch (e) {}
}

// -------------------------------------------------------------
// Network Stream Sniffer (HLS .m3u8 & DASH .mpd)
// -------------------------------------------------------------
const STREAM_PATTERNS = [
  { ext: '.m3u8', type: 'HLS' },
  { ext: '.mpd', type: 'DASH' },
]

function isStreamUrl(url) {
  if (!url || typeof url !== 'string') return null
  const cleanUrl = url.split('?')[0].toLowerCase()
  for (const p of STREAM_PATTERNS) {
    if (cleanUrl.endsWith(p.ext) || url.toLowerCase().includes(p.ext)) {
      return p.type
    }
  }
  return null
}

function extractHeaders(requestHeaders) {
  const headers = {}
  if (!Array.isArray(requestHeaders)) return headers

  const relevant = ['user-agent', 'referer', 'origin']
  for (const h of requestHeaders) {
    const nameLower = (h.name || '').toLowerCase()
    if (relevant.includes(nameLower) && h.value) {
      if (nameLower === 'user-agent') headers['User-Agent'] = h.value
      else if (nameLower === 'referer') headers['Referer'] = h.value
      else if (nameLower === 'origin') headers['Origin'] = h.value
    }
  }
  return headers
}

// 1. Capture stream manifest URLs immediately on beforeRequest
if (chrome.webRequest && chrome.webRequest.onBeforeRequest) {
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      if (!details.tabId || details.tabId < 0) return
      const streamType = isStreamUrl(details.url)
      if (!streamType) return

      getStoredTabStreams(details.tabId).then(async (streams) => {
        const existing = streams.find((s) => s.url === details.url)
        if (existing) return

        const streamEntry = {
          id: 'stream_' + Math.random().toString(36).substring(2, 9),
          url: details.url,
          type: streamType,
          headers: {},
          timestamp: Date.now(),
        }

        streams.push(streamEntry)
        const updated = streams.slice(-10)
        await saveStoredTabStreams(details.tabId, updated)

        // Update badge on extension action icon
        chrome.action.setBadgeText({ tabId: details.tabId, text: String(updated.length) })
        chrome.action.setBadgeBackgroundColor({ tabId: details.tabId, color: '#4f46e5' })

        // Notify content script of newly sniffed stream
        chrome.tabs.sendMessage(details.tabId, {
          type: 'STREAM_SNIFFED',
          stream: streamEntry,
          count: updated.length,
        }).catch(() => {})
      })
    },
    { urls: ['<all_urls>'] }
  )
}

// 2. Enrich streams with headers (Referer, User-Agent) on sendHeaders
if (chrome.webRequest && chrome.webRequest.onSendHeaders) {
  chrome.webRequest.onSendHeaders.addListener(
    (details) => {
      if (!details.tabId || details.tabId < 0) return
      const streamType = isStreamUrl(details.url)
      if (!streamType) return

      const headers = extractHeaders(details.requestHeaders)
      if (!Object.keys(headers).length) return

      getStoredTabStreams(details.tabId).then(async (streams) => {
        const target = streams.find((s) => s.url === details.url)
        if (target) {
          target.headers = { ...target.headers, ...headers }
          await saveStoredTabStreams(details.tabId, streams)
        }
      })
    },
    { urls: ['<all_urls>'] },
    ['requestHeaders', 'extraHeaders']
  )
}

// Clean up streams when tab is closed or reloaded
chrome.tabs.onRemoved.addListener((tabId) => {
  removeStoredTabStreams(tabId)
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    removeStoredTabStreams(tabId)
    chrome.action.setBadgeText({ tabId, text: '' })
  }
})

// -------------------------------------------------------------
// Context Menus
// -------------------------------------------------------------
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'omnidownload-link',
      title: 'Download with OmniDownload',
      contexts: ['link'],
    })

    chrome.contextMenus.create({
      id: 'omnidownload-page',
      title: 'Download this Page with OmniDownload',
      contexts: ['page'],
    })

    chrome.contextMenus.create({
      id: 'omnidownload-selection',
      title: 'Download Selected URL with OmniDownload',
      contexts: ['selection'],
    })
  })
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const config = await getConfig()
  let url = info.linkUrl || info.pageUrl || info.selectionText

  if (!url) return
  if (!url.startsWith('http://') && !url.startsWith('https://')) return

  await triggerDownload(url, tab?.id, tab?.title)
})

async function triggerDownload(url, tabId, pageTitle, extraMeta = {}) {
  const config = await getConfig()
  const headers = { 'Content-Type': 'application/json' }
  if (config.apiKey) {
    headers['X-API-Key'] = config.apiKey
  }

  try {
    const isStream = url.includes('.m3u8') || url.includes('.mpd')

    if (isStream) {
      // Direct stream download with metadata
      const res = await fetch(`${config.apiUrl}/download`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url,
          title: pageTitle || 'Web Stream',
          is_audio: Boolean(extraMeta.audio_only),
          is_video: !extraMeta.audio_only,
          metadata: extraMeta,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        showNotification(tabId, 'Error', data.error?.message || 'Failed to queue stream download')
        return { success: false, error: data.error }
      }
      showNotification(tabId, 'OmniDownload', `✓ Queued stream: ${pageTitle || 'HLS/DASH Stream'}`)
      return { success: true, id: data.id }
    }

    // Standard media page: analyze first
    const response = await fetch(`${config.apiUrl}/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url }),
    })
    const data = await response.json()

    if (!response.ok || data.error) {
      // Fallback: direct download if analysis was rejected
      const directRes = await fetch(`${config.apiUrl}/download`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url,
          title: pageTitle || 'Direct Download',
          metadata: extraMeta,
        }),
      })
      const directData = await directRes.json()
      if (directRes.ok && directData.id) {
        showNotification(tabId, 'OmniDownload', `✓ Queued download: ${pageTitle || 'Media'}`)
        return { success: true, id: directData.id }
      }
      showNotification(tabId, 'Error', data.error?.message || 'Failed to analyze URL')
      return { success: false, error: data.error }
    }

    const downloadResponse = await fetch(`${config.apiUrl}/download`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        url,
        format_id: data.formats?.[0]?.format_id,
        title: data.title,
        thumbnail: data.thumbnail,
        duration: data.duration,
        metadata: extraMeta,
      }),
    })

    const downloadData = await downloadResponse.json()
    if (!downloadResponse.ok || downloadData.error) {
      showNotification(tabId, 'Error', downloadData.error?.message || 'Failed to queue download')
      return { success: false, error: downloadData.error }
    }

    showNotification(tabId, 'OmniDownload', `✓ Queued download: ${data.title || 'Media'}`)
    return { success: true, id: downloadData.id }
  } catch (error) {
    console.error('OmniDownload background error:', error)
    showNotification(tabId, 'OmniDownload', 'Failed to connect to OmniDownload backend')
    return { success: false, error: error.message }
  }
}

function showNotification(tabId, title, message) {
  if (!tabId) return
  chrome.scripting
    .executeScript({
      target: { tabId },
      func: (title, message) => {
        const notification = document.createElement('div')
        notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2147483647;
        background: linear-gradient(135deg, #1e1b4b, #312e81);
        color: white;
        border: 1px solid #6366f1;
        border-radius: 10px;
        padding: 12px 18px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5), 0 0 15px rgba(99,102,241,0.4);
        max-width: 340px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        flex-direction: column;
        gap: 4px;
        backdrop-filter: blur(8px);
      `
        notification.innerHTML = `
        <div style="font-weight: 700; font-size: 13px; color: #ffffff; display: flex; align-items: center; gap: 6px;">
          <span style="color: #818cf8;">⚡</span> ${title}
        </div>
        <div style="color: #c7d2fe; font-size: 12px; line-height: 1.4;">${message}</div>
      `
        document.body.appendChild(notification)
        setTimeout(() => {
          notification.style.transition = 'opacity 0.4s ease, transform 0.4s ease'
          notification.style.opacity = '0'
          notification.style.transform = 'translateY(-10px)'
          setTimeout(() => notification.remove(), 400)
        }, 3600)
      },
      args: [title, message],
    })
    .catch(() => {})
}

// -------------------------------------------------------------
// Message Router
// -------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id || message.tabId

  if (message.type === 'GET_CONFIG') {
    getConfig().then((config) => sendResponse(config))
    return true
  }

  if (message.type === 'SET_CONFIG') {
    setConfig(message.config).then(() => sendResponse({ success: true }))
    return true
  }

  if (message.type === 'GET_TAB_STREAMS') {
    getStoredTabStreams(tabId).then((streams) => {
      sendResponse({ streams })
    })
    return true
  }

  if (message.type === 'DOWNLOAD_STREAM') {
    const streamMeta = {
      headers: message.headers || {},
      stream_type: message.streamType || 'HLS',
      page_url: sender.tab?.url || message.pageUrl,
      audio_only: message.isAudioOnly || false,
    }
    triggerDownload(message.url, tabId, message.title || sender.tab?.title, streamMeta).then((res) => {
      sendResponse(res)
    })
    return true
  }

  if (message.type === 'DOWNLOAD_URL') {
    triggerDownload(message.url, tabId, message.title || sender.tab?.title, message.metadata || {}).then(
      (res) => {
        sendResponse(res)
      }
    )
    return true
  }
})