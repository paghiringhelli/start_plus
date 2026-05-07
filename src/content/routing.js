import {
  ALLOWED_CENTER_IDS,
  REQUIRED_ITEM_ID,
  TARGET_HASH_PATH,
  TARGET_HOST,
} from './constants.js'

export function parseHashRoute() {
  if (!location.hash.startsWith('#')) {
    return null
  }

  const value = location.hash.slice(1)
  const [pathPart, queryPart = ''] = value.split('?')
  const searchParams = new URLSearchParams(queryPart)

  return {
    path: pathPart,
    query: searchParams,
  }
}

export function isTargetPage() {
  if (location.hostname !== TARGET_HOST) {
    return false
  }

  const route = parseHashRoute()
  if (!route || route.path !== TARGET_HASH_PATH) {
    return false
  }

  const centerId = route.query.get('numeroCentre')
  const itemId = route.query.get('itemId')

  return ALLOWED_CENTER_IDS.has(centerId) && itemId === REQUIRED_ITEM_ID
}

let _enabledCache

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && 'start_plus_enabled' in changes) {
    _enabledCache = undefined
  }
})

export async function isEnabled() {
  if (_enabledCache !== undefined) return _enabledCache
  const data = await chrome.storage.sync.get({ start_plus_enabled: true })
  _enabledCache = data.start_plus_enabled
  return _enabledCache
}

export function isLikelyAuthenticated() {
  const root = document.querySelector('app-root')
  if (root && root.children.length > 0) return true
  return document.querySelector('[class*="layout"]') !== null
}

export function buildCenterHash(centerId) {
  const query = new URLSearchParams({
    numeroCentre: centerId,
    itemId: REQUIRED_ITEM_ID,
  })

  return `#${TARGET_HASH_PATH}?${query.toString()}`
}

export function shouldShowCenterMenu() {
  if (location.hostname !== TARGET_HOST) {
    return false
  }

  const route = parseHashRoute()
  if (!route || route.path !== TARGET_HASH_PATH) {
    return false
  }

  const centerId = route.query.get('numeroCentre')
  const itemId = route.query.get('itemId')
  return itemId === REQUIRED_ITEM_ID && !ALLOWED_CENTER_IDS.has(centerId)
}
