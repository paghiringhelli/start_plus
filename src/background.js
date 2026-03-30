chrome.runtime.onInstalled.addListener(() => {
  console.log('MyStart+ installed.')
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'PING') {
    const tabId = sender?.tab?.id
    sendResponse({ message: `PONG from service worker${tabId ? ` (tab ${tabId})` : ''}` })
  }
})
