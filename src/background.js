chrome.runtime.onInstalled.addListener(() => {
  console.log('MyStart+ installed.')
})

async function requestOverlayOpen(tabId) {
  return chrome.tabs.sendMessage(tabId, {
    type: 'START_PLUS_OPEN_OVERLAY',
  })
}

async function ensureContentScript(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['assets/content.js'],
  })
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) {
    return
  }

  try {
    await requestOverlayOpen(tab.id)
  } catch (error) {
    try {
      await ensureContentScript(tab.id)
      await requestOverlayOpen(tab.id)
    } catch (retryError) {
      console.warn('Unable to open MyStart+ overlay from action click.', retryError)
    }
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'PING') {
    const tabId = sender?.tab?.id
    sendResponse({ message: `PONG from service worker${tabId ? ` (tab ${tabId})` : ''}` })
  }
})
