const API_BASE = 'http://localhost:8000/api'
const STORAGE_KEY = 'omnidownload_config'

async function getConfig() {
  const result = await chrome.storage.sync.get(STORAGE_KEY)
  return result[STORAGE_KEY] || { apiUrl: API_BASE }
}

async function setConfig(config) {
  await chrome.storage.sync.set({ [STORAGE_KEY]: config })
}

chrome.runtime.onInstalled.addListener(() => {
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

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const config = await getConfig()
  let url = info.linkUrl || info.pageUrl || info.selectionText
  
  if (!url) return
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return
  }
  
  try {
    const response = await fetch(`${config.apiUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    })
    
    const data = await response.json()
    
    if (data.error) {
      showNotification(tab.id, 'Error', data.error.message)
      return
    }
    
    const downloadResponse = await fetch(`${config.apiUrl}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url, 
        format_id: data.formats[0]?.format_id 
      })
    })
    
    const downloadData = await downloadResponse.json()
    
    if (downloadData.error) {
      showNotification(tab.id, 'Error', downloadData.error.message)
      return
    }
    
    showNotification(tab.id, 'Success', `Download started: ${data.title}`)
    
    chrome.runtime.sendMessage({ 
      type: 'DOWNLOAD_STARTED', 
      downloadId: downloadData.id,
      title: data.title
    })
  } catch (error) {
    console.error('OmniDownload error:', error)
    showNotification(tab.id, 'Error', 'Failed to connect to OmniDownload')
  }
})

function showNotification(tabId, title, message) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: (title, message) => {
      const notification = document.createElement('div')
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2147483647;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 16px 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 300px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `
      notification.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
        <div style="color: #666; font-size: 14px;">${message}</div>
      `
      document.body.appendChild(notification)
      setTimeout(() => notification.remove(), 5000)
    },
    args: [title, message]
  })
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

chrome.action.onClicked.addListener(async (tab) => {
  const config = await getConfig()
  
  if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
    try {
      const response = await fetch(`${config.apiUrl}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: tab.url })
      })
      
      const data = await response.json()
      
      if (data.error) {
        showNotification(tab.id, 'Error', data.error.message)
        return
      }
      
      const downloadResponse = await fetch(`${config.apiUrl}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: tab.url, 
          format_id: data.formats[0]?.format_id 
        })
      })
      
      const downloadData = await downloadResponse.json()
      
      if (downloadData.error) {
        showNotification(tab.id, 'Error', downloadData.error.message)
        return
      }
      
      showNotification(tab.id, 'Success', `Download started: ${data.title}`)
    } catch (error) {
      console.error('OmniDownload error:', error)
      showNotification(tab.id, 'Error', 'Failed to connect to OmniDownload')
    }
  }
})