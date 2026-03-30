chrome.runtime.onInstalled.addListener(() => {
  console.log('Start Plus installed.')
})

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) {
    return
  }

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'START_PLUS_OPEN_OVERLAY',
    })
  } catch (error) {
    console.warn('Unable to open Start Plus overlay from action click.', error)
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'PING') {
    const tabId = sender?.tab?.id
    sendResponse({ message: `PONG from service worker${tabId ? ` (tab ${tabId})` : ''}` })
  }
})
