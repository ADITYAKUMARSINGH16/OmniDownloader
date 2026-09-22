const API_BASE = 'http://localhost:8000/api'
const HEALTH_URL = 'http://localhost:8000/health'
const APP_URL = 'http://localhost:3000'

document.addEventListener('DOMContentLoaded', async () => {
  const statusDot = document.getElementById('statusDot')
  const statusText = document.getElementById('statusText')
  const urlInput = document.getElementById('urlInput')
  const analyzeBtn = document.getElementById('analyzeBtn')
  const errorMsg = document.getElementById('errorMsg')
  const mediaCount = document.getElementById('mediaCount')
  const mediaList = document.getElementById('mediaList')
  const openAppBtn = document.getElementById('openAppBtn')
  const settingsBtn = document.getElementById('settingsBtn')

  // Check backend connection health
  async function checkConnection() {
    try {
      const res = await fetch(HEALTH_URL, { method: 'GET' })
      if (res.ok) {
        statusDot.className = 'status-dot'
        statusText.textContent = 'Connected to OmniDownload'
        return true
      }
    } catch (e) {
      // Backend not running
    }
    statusDot.className = 'status-dot disconnected'
    statusText.textContent = 'OmniDownload offline (start dev servers)'
    return false
  }

  await checkConnection()

  // Pre-fill active tab URL if available
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
      urlInput.value = tab.url
    }
  } catch (e) {
    console.debug('Could not get active tab:', e)
  }

  // Open web dashboard
  if (openAppBtn) {
    openAppBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: APP_URL })
    })
  }

  // Open settings
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: `${APP_URL}/settings` })
    })
  }

  // Analyze URL handler
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', async () => {
      const url = urlInput.value.trim()
      errorMsg.style.display = 'none'

      if (!url) {
        showError('Please enter a URL')
        return
      }

      analyzeBtn.disabled = true
      analyzeBtn.textContent = 'Analyzing...'

      try {
        const response = await fetch(`${API_BASE}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })

        const data = await response.json()

        if (!response.ok || data.error) {
          showError(data.error?.message || data.detail || 'Failed to analyze URL')
          return
        }

        renderMediaItem(data, url)
      } catch (err) {
        showError('Could not connect to OmniDownload backend')
      } finally {
        analyzeBtn.disabled = false
        analyzeBtn.textContent = 'Analyze'
      }
    })
  }

  function showError(msg) {
    errorMsg.textContent = msg
    errorMsg.style.display = 'block'
  }

  function renderMediaItem(data, url) {
    mediaCount.textContent = '1'
    mediaList.innerHTML = ''

    const item = document.createElement('div')
    item.style.cssText = `
      padding: 10px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      margin-bottom: 8px;
      background: #f9fafb;
    `

    const title = document.createElement('div')
    title.style.cssText = 'font-weight: 600; font-size: 13px; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;'
    title.textContent = data.title || 'Media File'

    const formatInfo = document.createElement('div')
    formatInfo.style.cssText = 'font-size: 11px; color: #6b7280; margin-bottom: 8px;'
    const formatCount = data.formats ? data.formats.length : 0
    formatInfo.textContent = `${data.source || 'Online Media'} • ${formatCount} format(s) available`

    const dlBtn = document.createElement('button')
    dlBtn.style.cssText = `
      width: 100%;
      background: #4f46e5;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
    `
    dlBtn.textContent = 'Start Download'

    dlBtn.addEventListener('click', async () => {
      dlBtn.disabled = true
      dlBtn.textContent = 'Queueing...'
      try {
        const bestFormat = data.formats?.[0]
        const res = await fetch(`${API_BASE}/download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            title: data.title,
            thumbnail: data.thumbnail,
            duration: data.duration,
            format_id: bestFormat?.format_id,
            format: bestFormat?.quality || 'best',
            file_size: bestFormat?.filesize,
            is_video: bestFormat?.is_video !== false,
            is_audio: bestFormat?.is_audio || false,
          }),
        })

        if (res.ok) {
          dlBtn.textContent = 'Queued!'
          dlBtn.style.background = '#10b981'
          setTimeout(() => {
            chrome.tabs.create({ url: `${APP_URL}/queue` })
          }, 600)
        } else {
          dlBtn.textContent = 'Failed to queue'
          dlBtn.style.background = '#ef4444'
        }
      } catch (e) {
        dlBtn.textContent = 'Connection error'
        dlBtn.style.background = '#ef4444'
      }
    })

    item.appendChild(title)
    item.appendChild(formatInfo)
    item.appendChild(dlBtn)
    mediaList.appendChild(item)
  }
})
