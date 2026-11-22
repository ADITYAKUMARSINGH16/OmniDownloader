// OmniDownloader Content Script — Floating Download Badge & Web Player Overlay

;(function () {
  'use strict'

  let currentTabStreams = []
  let hideTimers = new WeakMap()

  // Fetch initial sniffed streams from background
  function refreshTabStreams() {
    chrome.runtime.sendMessage({ type: 'GET_TAB_STREAMS' }, (response) => {
      if (chrome.runtime.lastError) return
      if (response && Array.isArray(response.streams)) {
        currentTabStreams = response.streams
        updateAllFloatingBadges()
      }
    })
  }

  // Listen for live sniffed streams from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'STREAM_SNIFFED') {
      if (message.stream && !currentTabStreams.some((s) => s.url === message.stream.url)) {
        currentTabStreams.push(message.stream)
        updateAllFloatingBadges()
      }
    }
  })

  // Create an SVG download icon
  function createDownloadSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'omnidownload-logo-icon')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.innerHTML = `
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    `
    return svg
  }

  // Create SVG chevron
  function createChevronSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'omnidownload-chevron')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.innerHTML = `<polyline points="6 9 12 15 18 9"></polyline>`
    return svg
  }

  // Find optimal player container to mount floating badge inside
  function getPlayerContainer(video) {
    if (!video) return null

    // Common player containers
    const playerSelectors = [
      '.html5-video-player', // YouTube
      '.video-js',           // Video.js
      '.jwplayer',           // JW Player
      '[data-player]',       // Generic
      '.plyr',               // Plyr
      'div[class*="player"]',
      'div[class*="videoContainer"]'
    ]

    for (const sel of playerSelectors) {
      const container = video.closest(sel)
      if (container && container !== document.body) {
        return container
      }
    }

    // Default to direct parent
    const parent = video.parentElement
    if (parent && parent !== document.body && parent.tagName !== 'HTML') {
      return parent
    }
    return video
  }

  // Build the floating badge element
  function createFloatingBadge(video) {
    const badge = document.createElement('div')
    badge.className = 'omnidownload-floating-badge'
    badge.dataset.omnidownloadAttached = 'true'

    const btnGroup = document.createElement('div')
    btnGroup.className = 'omnidownload-btn-group'

    // Main download button
    const mainBtn = document.createElement('button')
    mainBtn.className = 'omnidownload-main-btn'
    mainBtn.appendChild(createDownloadSvg())

    const btnText = document.createElement('span')
    btnText.className = 'omnidownload-btn-text'
    btnText.textContent = 'Download Video'
    mainBtn.appendChild(btnText)

    const streamTag = document.createElement('span')
    streamTag.className = 'omnidownload-stream-tag'
    streamTag.style.display = 'none'
    mainBtn.appendChild(streamTag)

    // Dropdown toggle button
    const dropdownToggle = document.createElement('button')
    dropdownToggle.className = 'omnidownload-dropdown-toggle'
    dropdownToggle.title = 'Select quality or format'
    dropdownToggle.appendChild(createChevronSvg())
    dropdownToggle.style.display = 'none'

    btnGroup.appendChild(mainBtn)
    btnGroup.appendChild(dropdownToggle)

    // Dropdown menu
    const menu = document.createElement('div')
    menu.className = 'omnidownload-menu'

    badge.appendChild(btnGroup)
    badge.appendChild(menu)

    // Feedback animation helper
    function showSuccessFeedback(label = '✓ Queued in OmniDownload') {
      btnGroup.classList.add('omnidownload-success')
      btnText.textContent = label
      dropdownToggle.style.display = 'none'
      menu.classList.remove('omnidownload-show')

      setTimeout(() => {
        btnGroup.classList.remove('omnidownload-success')
        btnText.textContent = 'Download Video'
        updateBadgeUI()
      }, 2600)
    }

    // Main button click handler
    mainBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      e.preventDefault()

      // If we have captured streams, use the latest one
      if (currentTabStreams.length > 0) {
        const stream = currentTabStreams[currentTabStreams.length - 1]
        chrome.runtime.sendMessage(
          {
            type: 'DOWNLOAD_STREAM',
            url: stream.url,
            headers: stream.headers,
            streamType: stream.type,
            title: document.title.replace(/ - YouTube$/, '').trim(),
            pageUrl: window.location.href,
          },
          (res) => {
            if (res && res.success !== false) {
              showSuccessFeedback('✓ Stream Queued!')
            } else {
              showSuccessFeedback('Download Sent')
            }
          }
        )
        return
      }

      // If video has direct src (not blob:)
      if (video.src && !video.src.startsWith('blob:')) {
        chrome.runtime.sendMessage(
          {
            type: 'DOWNLOAD_URL',
            url: video.src,
            title: document.title,
          },
          () => showSuccessFeedback('✓ Queued!')
        )
        return
      }

      // Standard media page download
      chrome.runtime.sendMessage(
        {
          type: 'DOWNLOAD_URL',
          url: window.location.href,
          title: document.title,
        },
        () => showSuccessFeedback('✓ Analyzing Page...')
      )
    })

    // Toggle dropdown menu
    dropdownToggle.addEventListener('click', (e) => {
      e.stopPropagation()
      e.preventDefault()
      const isOpen = menu.classList.contains('omnidownload-show')
      if (isOpen) {
        menu.classList.remove('omnidownload-show')
        dropdownToggle.classList.remove('omnidownload-open')
      } else {
        renderMenuItems()
        menu.classList.add('omnidownload-show')
        dropdownToggle.classList.add('omnidownload-open')
      }
    })

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!badge.contains(e.target)) {
        menu.classList.remove('omnidownload-show')
        dropdownToggle.classList.remove('omnidownload-open')
      }
    })

    // Render dropdown menu items
    function renderMenuItems() {
      menu.innerHTML = ''

      const header = document.createElement('div')
      header.className = 'omnidownload-menu-header'
      header.innerHTML = `
        <span>Detected Streams</span>
        <span style="font-size: 10px; color: #818cf8;">${currentTabStreams.length} found</span>
      `
      menu.appendChild(header)

      // List each sniffed stream
      currentTabStreams.forEach((stream, idx) => {
        const item = document.createElement('button')
        item.className = 'omnidownload-menu-item'
        const shortUrl = stream.url.split('?')[0].split('/').pop() || 'Manifest'
        item.innerHTML = `
          <div style="display: flex; flex-direction: column; min-width: 0;">
            <span style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 190px;">
              ${stream.type} Stream #${idx + 1}
            </span>
            <span style="font-size: 10px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 190px;">
              ${shortUrl}
            </span>
          </div>
          <span class="omnidownload-menu-badge ${stream.type.toLowerCase()}">${stream.type}</span>
        `
        item.addEventListener('click', (e) => {
          e.stopPropagation()
          chrome.runtime.sendMessage(
            {
              type: 'DOWNLOAD_STREAM',
              url: stream.url,
              headers: stream.headers,
              streamType: stream.type,
              title: document.title,
            },
            () => showSuccessFeedback(`✓ ${stream.type} Queued!`)
          )
        })
        menu.appendChild(item)
      })

      // Audio only extraction option
      const audioItem = document.createElement('button')
      audioItem.className = 'omnidownload-menu-item'
      audioItem.style.borderTop = '1px solid rgba(255,255,255,0.08)'
      audioItem.style.marginTop = '4px'
      audioItem.style.paddingTop = '6px'
      audioItem.innerHTML = `
        <span>🎵 Extract Audio (MP3)</span>
        <span class="omnidownload-menu-badge">AUDIO</span>
      `
      audioItem.addEventListener('click', (e) => {
        e.stopPropagation()
        const targetUrl = currentTabStreams[0]?.url || window.location.href
        chrome.runtime.sendMessage(
          {
            type: 'DOWNLOAD_STREAM',
            url: targetUrl,
            headers: currentTabStreams[0]?.headers || {},
            isAudioOnly: true,
            title: document.title,
          },
          () => showSuccessFeedback('✓ Audio Queued!')
        )
      })
      menu.appendChild(audioItem)
    }

    // Update UI based on current streams
    function updateBadgeUI() {
      if (currentTabStreams.length > 0) {
        const latest = currentTabStreams[currentTabStreams.length - 1]
        streamTag.textContent = latest.type
        streamTag.style.display = 'inline-block'
        dropdownToggle.style.display = 'inline-flex'
      } else {
        streamTag.style.display = 'none'
        dropdownToggle.style.display = 'none'
      }
    }

    updateBadgeUI()
    badge._updateBadgeUI = updateBadgeUI

    return badge
  }

  // Attach floating badge and hover events to a video element
  function attachToVideo(video) {
    if (video.dataset.omnidownloadTracked) return
    video.dataset.omnidownloadTracked = 'true'

    // Skip tiny videos / tracking pixels
    if (video.offsetWidth > 0 && video.offsetWidth < 160 && video.offsetHeight < 100) {
      return
    }

    const container = getPlayerContainer(video)
    if (!container) return

    // Ensure container has positioning context
    const computedStyle = window.getComputedStyle(container)
    if (computedStyle.position === 'static') {
      container.style.position = 'relative'
    }

    // Create and attach the badge
    const badge = createFloatingBadge(video)
    container.appendChild(badge)

    function showBadge() {
      badge.classList.add('omnidownload-visible')
      clearTimeout(hideTimers.get(badge))

      // Auto-hide after 3.5s of no mouse movement over video
      const timer = setTimeout(() => {
        // Do not auto-hide if menu is open
        const menu = badge.querySelector('.omnidownload-menu')
        if (menu && menu.classList.contains('omnidownload-show')) return
        badge.classList.remove('omnidownload-visible')
      }, 3500)
      hideTimers.set(badge, timer)
    }

    function hideBadge() {
      const menu = badge.querySelector('.omnidownload-menu')
      if (menu && menu.classList.contains('omnidownload-show')) return
      badge.classList.remove('omnidownload-visible')
    }

    // Show on mouse interaction over container or video
    container.addEventListener('mouseenter', showBadge)
    container.addEventListener('mousemove', showBadge)
    container.addEventListener('mouseleave', hideBadge)
    video.addEventListener('play', showBadge)
  }

  function updateAllFloatingBadges() {
    const badges = document.querySelectorAll('.omnidownload-floating-badge')
    badges.forEach((b) => {
      if (typeof b._updateBadgeUI === 'function') {
        b._updateBadgeUI()
      }
    })
  }

  // Scan document for video tags
  function scanForVideos() {
    const videos = document.querySelectorAll('video')
    videos.forEach((video) => attachToVideo(video))
  }

  // Observe dynamically inserted video elements (SPA navigation, lazy players)
  const observer = new MutationObserver(() => {
    scanForVideos()
  })

  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true,
  })

  // Initial scan and stream load
  scanForVideos()
  refreshTabStreams()

  // SPA navigation handlers
  window.addEventListener('yt-navigate-finish', () => {
    setTimeout(() => {
      refreshTabStreams()
      scanForVideos()
    }, 600)
  })

  window.addEventListener('popstate', () => {
    setTimeout(() => {
      refreshTabStreams()
      scanForVideos()
    }, 600)
  })
})()