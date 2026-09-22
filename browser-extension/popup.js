const DEFAULT_API_BASE = 'http://127.0.0.1:8000/api'
const DEFAULT_HEALTH_URL = 'http://127.0.0.1:8000/health'
const APP_URL = 'http://localhost:3000'

const SUPPORTED_HOSTS = [
  'youtube.com', 'youtu.be', 'music.youtube.com',
  'twitter.com', 'x.com',
  'instagram.com', 'instagr.am',
  'tiktok.com',
  'reddit.com', 'v.redd.it',
  'facebook.com', 'fb.watch',
  'soundcloud.com',
  'vimeo.com',
  'pinterest.com', 'pin.it',
  'terabox.com', '1024terabox.com', 'teraboxapp.com'
]

function isSupportedUrl(url) {
  if (!url || typeof url !== 'string') return false
  try {
    const host = new URL(url).hostname.toLowerCase()
    return SUPPORTED_HOSTS.some(h => host === h || host.endsWith('.' + h))
  } catch {
    return false
  }
}

function parseErrorMessage(errData, fallbackMsg = 'Failed to analyze URL') {
  if (!errData) return fallbackMsg
  if (typeof errData === 'string') return errData
  if (errData.detail?.error?.message) return errData.detail.error.message
  if (errData.error?.message) return errData.error.message
  if (typeof errData.detail === 'string') return errData.detail
  if (errData.message) return errData.message
  return fallbackMsg
}

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

  let apiKey = ''
  try {
    const stored = await chrome.storage.sync.get(['omni_api_key', 'omnidownload_config'])
    apiKey = stored.omni_api_key || stored.omnidownload_config?.apiKey || ''
  } catch (e) {
    console.debug('Could not load storage apiKey', e)
  }

  const getHeaders = () => {
    const headers = { 'Content-Type': 'application/json' }
    if (apiKey) {
      headers['X-API-Key'] = apiKey
    }
    return headers
  }

  // Check backend connection health
  async function checkConnection() {
    const endpoints = [
      'http://127.0.0.1:8000/health',
      'http://localhost:8000/health'
    ]

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, { method: 'GET' })
        if (res.ok) {
          statusDot.className = 'status-dot'
          statusText.textContent = 'Connected to OmniDownload'
          return ep.replace('/health', '/api')
        }
      } catch (e) {
        // try next endpoint
      }
    }
    statusDot.className = 'status-dot disconnected'
    statusText.textContent = 'OmniDownload offline (start dev servers)'
    return null
  }

  const activeApiBase = (await checkConnection()) || DEFAULT_API_BASE

  // Pre-fill active tab URL and detect page media
  let activeTabUrl = ''
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
      activeTabUrl = tab.url
      urlInput.value = activeTabUrl

      if (isSupportedUrl(activeTabUrl)) {
        // Automatically analyze the active supported page
        autoAnalyzePage(activeTabUrl, tab.title)
      }
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

  // 1-Click Browser Cookie Sync to OmniDownload Backend
  const syncCookiesBtn = document.getElementById('syncCookiesBtn')
  const cookieSyncMsg = document.getElementById('cookieSyncMsg')

  if (syncCookiesBtn) {
    syncCookiesBtn.addEventListener('click', async () => {
      syncCookiesBtn.disabled = true
      syncCookiesBtn.innerHTML = '<span>⏳</span><span>Syncing Cookies...</span>'
      if (cookieSyncMsg) cookieSyncMsg.style.display = 'none'

      try {
        const domains = [
          'youtube.com', 'google.com', 'instagram.com',
          'twitter.com', 'x.com', 'tiktok.com', 'facebook.com', 'reddit.com',
          'terabox.com', '1024terabox.com', 'teraboxapp.com', 'teraboxurl.com', 'teraboxshare.com'
        ]

        let totalCookieCount = 0
        let netscapeLines = [
          '# Netscape HTTP Cookie File',
          '# Automatically synced by OmniDownload Browser Extension',
          '# Timestamp: ' + new Date().toISOString(),
          ''
        ]

        for (const domain of domains) {
          try {
            const cookies = await chrome.cookies.getAll({ domain })
            if (cookies && cookies.length > 0) {
              totalCookieCount += cookies.length
              for (const c of cookies) {
                const d = c.domain || domain
                const flag = d.startsWith('.') ? 'TRUE' : 'FALSE'
                const path = c.path || '/'
                const secure = c.secure ? 'TRUE' : 'FALSE'
                const expiry = c.expirationDate ? Math.floor(c.expirationDate) : Math.floor(Date.now() / 1000 + 365 * 86400)
                const name = c.name || ''
                const value = c.value || ''
                netscapeLines.push(`${d}\t${flag}\t${path}\t${secure}\t${expiry}\t${name}\t${value}`)
              }
            }
          } catch (e) {
            console.debug(`Could not read cookies for ${domain}:`, e)
          }
        }

        if (totalCookieCount === 0) {
          if (cookieSyncMsg) {
            cookieSyncMsg.style.display = 'block'
            cookieSyncMsg.style.color = '#eab308'
            cookieSyncMsg.textContent = 'No active cookies found for YouTube/Instagram/X.'
          }
          return
        }

        const netscapeContent = netscapeLines.join('\n')
        const endpoint = activeApiBase.replace(/\/api$/, '') + '/api/settings/cookies'

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ raw_content: netscapeContent })
        })

        const data = await res.json()

        if (res.ok && data.success !== false) {
          syncCookiesBtn.innerHTML = '<span>✓</span><span>Cookies Synced!</span>'
          syncCookiesBtn.style.background = '#dcfce7'
          syncCookiesBtn.style.borderColor = '#86efac'
          syncCookiesBtn.style.color = '#15803d'

          if (cookieSyncMsg) {
            cookieSyncMsg.style.display = 'block'
            cookieSyncMsg.style.color = '#16a34a'
            cookieSyncMsg.textContent = `✓ ${totalCookieCount} cookies synced to backend`
          }
        } else {
          throw new Error(data.detail || 'Backend failed to save cookies')
        }
      } catch (err) {
        if (cookieSyncMsg) {
          cookieSyncMsg.style.display = 'block'
          cookieSyncMsg.style.color = '#dc2626'
          cookieSyncMsg.textContent = 'Failed to sync cookies: ' + (err.message || 'Connection error')
        }
      } finally {
        setTimeout(() => {
          syncCookiesBtn.disabled = false
          syncCookiesBtn.innerHTML = '<span>🔑</span><span>Sync Browser Cookies to OmniDownload</span>'
          syncCookiesBtn.style.background = '#f3f4f6'
          syncCookiesBtn.style.borderColor = '#e5e7eb'
          syncCookiesBtn.style.color = '#374151'
        }, 3000)
      }
    })
  }

  // Auto-analyze active page
  async function autoAnalyzePage(pageUrl, fallbackTitle) {
    mediaCount.textContent = '...'
    mediaList.innerHTML = `
      <div style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; display: flex; align-items: center; gap: 10px;">
        <div class="loading"></div>
        <div style="font-size: 12px; color: #4b5563;">Analyzing page media & gallery...</div>
      </div>
    `
    try {
      const response = await fetch(`${activeApiBase}/analyze`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ url: pageUrl }),
      })
      const data = await response.json()
      if (response.ok && data.success !== false && !data.error) {
        renderMediaItem(data, pageUrl)
      } else {
        renderFallbackDetectedMedia(pageUrl, fallbackTitle || 'Current Web Media')
      }
    } catch (e) {
      renderFallbackDetectedMedia(pageUrl, fallbackTitle || 'Current Web Media')
    }
  }

  // Fallback if direct auto-analyze is pending or fails
  function renderFallbackDetectedMedia(pageUrl, pageTitle) {
    mediaCount.textContent = '1'
    mediaList.innerHTML = ''

    const item = document.createElement('div')
    item.className = 'media-item'
    item.style.cssText = 'padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; display: flex; align-items: center; gap: 8px;'

    item.innerHTML = `
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 600; font-size: 13px; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${pageTitle.replace(/ - YouTube$/, '')}
        </div>
        <div style="font-size: 11px; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px;">
          ${pageUrl}
        </div>
      </div>
      <button id="quickAnalyzeBtn" style="padding: 6px 12px; background: #4f46e5; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; shrink: 0;">
        Analyze & Download
      </button>
    `

    const quickBtn = item.querySelector('#quickAnalyzeBtn')
    quickBtn.addEventListener('click', () => {
      urlInput.value = pageUrl
      analyzeBtn.click()
    })

    mediaList.appendChild(item)
  }

  // Analyze URL button handler
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', async () => {
      const targetUrl = urlInput.value.trim()
      errorMsg.style.display = 'none'

      if (!targetUrl) {
        showError('Please enter a media URL')
        return
      }

      analyzeBtn.disabled = true
      analyzeBtn.textContent = 'Analyzing...'

      try {
        const response = await fetch(`${activeApiBase}/analyze`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ url: targetUrl }),
        })

        const data = await response.json()

        if (!response.ok || data.success === false || data.error) {
          showError(parseErrorMessage(data, `Server returned error (${response.status})`))
          return
        }

        renderMediaItem(data, targetUrl)
      } catch (err) {
        showError('Could not communicate with OmniDownload backend (Check if backend is running on port 8000)')
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

  function renderMediaItem(data, targetUrl) {
    const imageFormats = (data.formats || []).filter(f => !f.is_video && !f.is_audio)
    const isMultiPhoto = imageFormats.length > 1

    mediaCount.textContent = isMultiPhoto ? `${imageFormats.length} Photos` : '1'
    mediaList.innerHTML = ''

    const item = document.createElement('div')
    item.style.cssText = `
      padding: 12px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #f9fafb;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `

    if (isMultiPhoto) {
      // Photo Gallery View
      item.innerHTML = `
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; items-center; gap: 6px; margin-bottom: 2px;">
              <span style="background: #4f46e5; color: white; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">
                GALLERY • ${imageFormats.length} PHOTOS
              </span>
            </div>
            <div style="font-weight: 600; font-size: 13px; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${data.title || 'Reddit Photo Gallery'}
            </div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">
              ${(data.source || 'reddit').toUpperCase()} • ${imageFormats.length} high-resolution photos
            </div>
          </div>
        </div>

        <button id="downloadAllPhotosBtn" style="width: 100%; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; border: none; padding: 9px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.25); transition: opacity 0.2s;">
          ⬇ Download All ${imageFormats.length} Photos
        </button>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 2px;">
          ${imageFormats.map((fmt, idx) => {
            const thumb = fmt.format_id.startsWith('http') ? fmt.format_id : data.thumbnail
            return `
              <div style="position: relative; aspect-ratio: 1; border-radius: 6px; overflow: hidden; border: 1px solid #d1d5db; background: #e5e7eb;">
                ${thumb ? `<img src="${thumb}" style="width: 100%; height: 100%; object-fit: cover;" alt="Photo ${idx+1}" />` : ''}
                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); color: white; font-size: 9px; font-weight: 600; text-align: center; padding: 2px 0;">
                  #${idx + 1}
                </div>
              </div>
            `
          }).join('')}
        </div>
      `

      const downloadAllBtn = item.querySelector('#downloadAllPhotosBtn')
      downloadAllBtn.addEventListener('click', async () => {
        downloadAllBtn.disabled = true
        downloadAllBtn.textContent = `Queueing ${imageFormats.length} Photos...`
        try {
          const urls = imageFormats.map(f => f.format_id.startsWith('http') ? f.format_id : targetUrl)
          const res = await fetch(`${activeApiBase}/batch-download`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ urls })
          })
          const resData = await res.json()

          if (res.ok && resData.queued > 0) {
            downloadAllBtn.textContent = `✓ Queued All ${resData.queued} Photos!`
            downloadAllBtn.style.background = '#10b981'
            setTimeout(() => {
              chrome.tabs.create({ url: `${APP_URL}/queue` })
            }, 700)
          } else {
            downloadAllBtn.textContent = 'Failed to queue'
            downloadAllBtn.style.background = '#ef4444'
            showError(parseErrorMessage(resData, 'Failed to queue gallery photos'))
          }
        } catch (e) {
          downloadAllBtn.textContent = 'Connection error'
          downloadAllBtn.style.background = '#ef4444'
          showError('Could not send batch download to backend')
        }
      })

    } else {
      // Single Video / Audio / Image View
      const title = document.createElement('div')
      title.style.cssText = 'font-weight: 600; font-size: 13px; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;'
      title.textContent = data.title || 'Media File'

      const formatInfo = document.createElement('div')
      formatInfo.style.cssText = 'font-size: 11px; color: #6b7280;'
      const formatCount = data.formats ? data.formats.length : 0
      formatInfo.textContent = `${(data.source || 'Media').toUpperCase()} • ${formatCount} format(s) available`

      const dlBtn = document.createElement('button')
      dlBtn.style.cssText = `
        width: 100%;
        background: #4f46e5;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      `
      dlBtn.textContent = '⬇ Download Now'

      dlBtn.addEventListener('click', async () => {
        dlBtn.disabled = true
        dlBtn.textContent = 'Queueing...'
        try {
          const bestFormat = data.formats?.[0]
          const res = await fetch(`${activeApiBase}/download`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
              url: targetUrl,
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

          const resData = await res.json()

          if (res.ok && resData.success !== false) {
            dlBtn.textContent = '✓ Queued Successfully!'
            dlBtn.style.background = '#10b981'
            setTimeout(() => {
              chrome.tabs.create({ url: `${APP_URL}/queue` })
            }, 600)
          } else {
            dlBtn.textContent = 'Failed to queue'
            dlBtn.style.background = '#ef4444'
            showError(parseErrorMessage(resData, 'Failed to queue download'))
          }
        } catch (e) {
          dlBtn.textContent = 'Connection error'
          dlBtn.style.background = '#ef4444'
          showError('Could not send download task to backend')
        }
      })

      item.appendChild(title)
      item.appendChild(formatInfo)
      item.appendChild(dlBtn)
    }

    mediaList.appendChild(item)
  }
})
