const SUPPORTED_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'music.youtube.com',
  'reddit.com',
  'v.redd.it',
  'twitter.com',
  'x.com',
  'instagram.com',
  'instagr.am',
  'facebook.com',
  'fb.watch',
  'terabox.com',
  'teraboxapp.com',
  '1024terabox.com',
  'freeterabox.com',
]

function isSupportedUrl(url) {
  try {
    const hostname = new URL(url).hostname.replace('www.', '')
    return SUPPORTED_DOMAINS.some(domain => hostname.includes(domain))
  } catch {
    return false
  }
}

function findMediaElements() {
  const mediaUrls = new Set()
  
  document.querySelectorAll('video, audio').forEach(el => {
    if (el.src && isSupportedUrl(el.src)) {
      mediaUrls.add(el.src)
    }
    el.querySelectorAll('source').forEach(source => {
      if (source.src && isSupportedUrl(source.src)) {
        mediaUrls.add(source.src)
      }
    })
  })
  
  document.querySelectorAll('a[href]').forEach(link => {
    if (isSupportedUrl(link.href)) {
      mediaUrls.add(link.href)
    }
  })
  
  return Array.from(mediaUrls)
}

function createDownloadButton(url) {
  const button = document.createElement('button')
  button.textContent = '⬇ OmniDownload'
  button.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 9999;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    opacity: 0;
    transition: opacity 0.2s;
  `
  button.addEventListener('click', (e) => {
    e.stopPropagation()
    e.preventDefault()
    chrome.runtime.sendMessage({
      type: 'DOWNLOAD_URL',
      url: url
    })
  })
  return button
}

function attachDownloadButtons() {
  const mediaUrls = findMediaElements()
  
  mediaUrls.forEach(url => {
    const links = document.querySelectorAll(`a[href="${url}"]`)
    links.forEach(link => {
      if (link.dataset.omnidownloadAdded) return
      link.dataset.omnidownloadAdded = 'true'
      link.style.position = 'relative'
      const btn = createDownloadButton(url)
      link.appendChild(btn)
      link.addEventListener('mouseenter', () => btn.style.opacity = '1')
      link.addEventListener('mouseleave', () => btn.style.opacity = '0')
    })
    
    const videos = document.querySelectorAll(`video[src="${url}"], audio[src="${url}"]`)
    videos.forEach(video => {
      if (video.dataset.omnidownloadAdded) return
      video.dataset.omnidownloadAdded = 'true'
      video.style.position = 'relative'
      const container = video.parentElement
      if (container) {
        container.style.position = 'relative'
        const btn = createDownloadButton(url)
        container.appendChild(btn)
        container.addEventListener('mouseenter', () => btn.style.opacity = '1')
        container.addEventListener('mouseleave', () => btn.style.opacity = '0')
      }
    })
  })
}

let observer = new MutationObserver(() => {
  attachDownloadButtons()
})

observer.observe(document.body, {
  childList: true,
  subtree: true
})

attachDownloadButtons()

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_MEDIA_URLS') {
    sendResponse({ urls: findMediaElements() })
  }
})