const DEFAULT_API_BASE = 'http://127.0.0.1:8000/api'
const STORAGE_KEY = 'omnidownload_config'

async function getConfig() {
  const result = await chrome.storage.sync.get([STORAGE_KEY, 'omni_api_key'])
  const config = result[STORAGE_KEY] || { apiUrl: DEFAULT_API_BASE }
  if (result.omni_api_key && !config.apiKey) {
    config.apiKey = result.omni_api_key
  }
  return config
}

async function setConfig(config) {
  await chrome.storage.sync.set({ [STORAGE_KEY]: config })
}

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
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return
  }
  
  const headers = { 'Content-Type': 'application/json' }
  if (config.apiKey) {
    headers['X-API-Key'] = config.apiKey
  }

  try {
    const response = await fetch(`${config.apiUrl}/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url })
    })
    
    const data = await response.json()
    
    if (!response.ok || data.error) {
      showNotification(tab.id, 'Error', data.error?.message || data.detail?.error?.message || 'Failed to analyze URL')
      return
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
      })
    })
    
    const downloadData = await downloadResponse.json()
    
    if (!downloadResponse.ok || downloadData.error) {
      showNotification(tab.id, 'Error', downloadData.error?.message || 'Failed to queue download')
      return
    }
    
    showNotification(tab.id, 'OmniDownload', `✓ Queued download: ${data.title || 'Media'}`)
    
    chrome.runtime.sendMessage({ 
      type: 'DOWNLOAD_STARTED', 
      downloadId: downloadData.id,
      title: data.title
    }).catch(() => {})
  } catch (error) {
    console.error('OmniDownload error:', error)
    showNotification(tab.id, 'OmniDownload', 'Failed to connect to OmniDownload backend')
  }
})

function showNotification(tabId, title, message) {
  if (!tabId) return
  chrome.scripting.executeScript({
    target: { tabId },
    func: (title, message) => {
      const notification = document.createElement('div')
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2147483647;
        background: #1e1b4b;
        color: white;
        border: 1px solid #4338ca;
        border-radius: 8px;
        padding: 12px 16px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        max-width: 320px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `
      notification.innerHTML = `
        <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">${title}</div>
        <div style="color: #c7d2fe; font-size: 12px;">${message}</div>
      `
      document.body.appendChild(notification)
      setTimeout(() => notification.remove(), 4000)
    },
    args: [title, message]
  }).catch(() => {})
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_CONFIG') {
    getConfig().then(config => sendResponse(config))
    return true
  }
  
  if (message.type === 'SET_CONFIG') {
    setConfig(message.config).then(() => sendResponse({ success: true }))
    return true
  }
})