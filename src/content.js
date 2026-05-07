import { maybeRenderCenterMenu } from './content/ui-center-menu.js'
import { maybeRenderOverlay, maybeRenderOverlayFromNameClick } from './content/overlay-ui.js'
import { refreshRowTitleInteractionStyle } from './content/row-title-style.js'

refreshRowTitleInteractionStyle().catch((error) => {
  console.warn('Unable to refresh row title interaction style.', error)
})

maybeRenderCenterMenu().catch((error) => {
  console.warn('Unable to render center switch menu.', error)
})

window.addEventListener('hashchange', () => {
  refreshRowTitleInteractionStyle().catch((error) => {
    console.warn('Unable to refresh row title interaction style after route change.', error)
  })

  maybeRenderCenterMenu().catch((error) => {
    console.warn('Unable to refresh center switch menu after route change.', error)
  })
})

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync' || !Object.hasOwn(changes, 'start_plus_enabled')) {
    return
  }

  maybeRenderCenterMenu().catch((error) => {
    console.warn('Unable to refresh center switch menu after settings change.', error)
  })
})

document.addEventListener('click', (event) => {
  maybeRenderOverlayFromNameClick(event).catch((error) => {
    console.warn('Unable to open MyStart+ overlay from table name click.', error)
  })
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'START_PLUS_OPEN_OVERLAY') {
    return undefined
  }

  maybeRenderOverlay({ forceOpen: true })
    .then((result) => {
      sendResponse(result)
    })
    .catch((error) => {
      sendResponse({ status: 'error', message: error.message })
    })

  return true
})
