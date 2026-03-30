const OVERLAY_ID = 'start-plus-overlay'
const TARGET_HOST = 'startweb.118-vaud.ch'
const TARGET_HASH_PATH = '/planning/statistiques'
const REQUIRED_QUERY = {
  numeroCentre: '529',
  itemId: 'activitePersonnel',
}

const OVERLAY_STYLE = `
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  background: rgba(5, 13, 31, 0.62);
  backdrop-filter: blur(3px);
  display: grid;
  place-items: center;
  padding: 16px;
`

function isOverlayNode(node) {
  if (node instanceof Element) {
    return node.id === OVERLAY_ID || node.closest(`#${OVERLAY_ID}`) !== null
  }

  const parent = node?.parentElement
  return parent ? parent.id === OVERLAY_ID || parent.closest(`#${OVERLAY_ID}`) !== null : false
}

const PANEL_STYLE = `
  width: min(960px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  overflow: auto;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 24px 60px rgba(2, 8, 23, 0.35);
  padding: 16px 18px 20px;
  font: 14px/1.4 'Segoe UI', sans-serif;
  color: #0f172a;
`

let dismissedByUser = false

function parseHashRoute() {
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

function isTargetPage() {
  if (location.hostname !== TARGET_HOST) {
    return false
  }

  const route = parseHashRoute()
  if (!route || route.path !== TARGET_HASH_PATH) {
    return false
  }

  return Object.entries(REQUIRED_QUERY).every(
    ([key, value]) => route.query.get(key) === value,
  )
}

async function isEnabled() {
  const data = await chrome.storage.sync.get({ start_plus_enabled: true })
  return data.start_plus_enabled
}

function isLikelyAuthenticated() {
  return document.querySelector('app-root, [id*="app"], [class*="layout"]') !== null
}

function parseNumber(rawText) {
  const cleaned = rawText
    .replace(/\u00a0/g, ' ')
    .replace(/[^0-9,.-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')

  const value = Number.parseFloat(cleaned)
  return Number.isFinite(value) ? value : null
}

function parseDurationHours(rawText) {
  const text = rawText.replace(/\u00a0/g, ' ').trim()
  const match = text.match(/^(-?\d+)h\s*(\d+)min$/i)
  if (!match) {
    return null
  }

  const hours = Number.parseInt(match[1], 10)
  const minutes = Number.parseInt(match[2], 10)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null
  }

  const sign = hours < 0 ? -1 : 1
  return hours + sign * (minutes / 60)
}

function formatHoursToHm(value) {
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  const totalMinutes = Math.round(abs * 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${sign}${hours}h ${minutes}min`
}

function extractMyStartStatDataset() {
  const tables = Array.from(document.querySelectorAll('.table.container-table'))
  let bestRows = []

  for (const table of tables) {
    const rowLabels = Array.from(table.querySelectorAll('#colFixed .rowTitle')).map((node) =>
      (node.textContent || '').trim(),
    )
    const dataRows = Array.from(table.querySelectorAll('#scrollable .rowData'))

    if (rowLabels.length === 0 || dataRows.length === 0) {
      continue
    }

    const rowCount = Math.min(rowLabels.length, dataRows.length)
    const rows = []

    for (let index = 0; index < rowCount; index += 1) {
      const label = rowLabels[index]
      if (!label) {
        continue
      }

      const dataCells = Array.from(dataRows[index].querySelectorAll('.data'))
      if (dataCells.length === 0) {
        continue
      }

      const values = dataCells
        .map((cell) => parseDurationHours(cell.textContent || ''))
        .filter((value) => value !== null)

      if (values.length === 0) {
        continue
      }

      const total = values.reduce((acc, value) => acc + value, 0)
      rows.push({
        label,
        value: total,
        display: formatHoursToHm(total),
      })
    }

    if (rows.length > bestRows.length) {
      bestRows = rows
    }
  }

  return bestRows
}

function extractRowsFromContainer(container) {
  const rowCandidates = Array.from(container.querySelectorAll(':scope > div, :scope > [role="row"]'))
  if (rowCandidates.length < 2) {
    return []
  }

  const rows = []

  for (const row of rowCandidates) {
    const cells = Array.from(row.querySelectorAll(':scope > div, :scope > [role="cell"], :scope > span'))
    if (cells.length < 2) {
      continue
    }

    const label = cells[0].textContent?.trim()
    if (!label) {
      continue
    }

    const valueCandidates = cells
      .slice(1)
      .map((cell) => parseNumber(cell.textContent || ''))
      .filter((value) => value !== null)

    if (valueCandidates.length === 0) {
      continue
    }

    rows.push({
      label,
      value: valueCandidates[0],
      display: String(valueCandidates[0]),
    })
  }

  return rows
}

function findBestDataset() {
  const myStartRows = extractMyStartStatDataset()
  if (myStartRows.length > 0) {
    return myStartRows
  }

  const tableLikeNodes = Array.from(document.querySelectorAll('div[role="table"], div[class*="table"], div[class*="grid"]'))
  let bestRows = []

  for (const node of tableLikeNodes) {
    const rows = extractRowsFromContainer(node)
    if (rows.length > bestRows.length) {
      bestRows = rows
    }
  }

  return bestRows
}

function removeOverlay() {
  const existing = document.getElementById(OVERLAY_ID)
  if (existing) {
    existing.remove()
  }
}

function isElementVisible(element) {
  if (!(element instanceof HTMLElement)) {
    return false
  }

  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false
  }

  return element.getClientRects().length > 0
}

function getInputValues(selector) {
  return Array.from(document.querySelectorAll(selector))
    .filter((input) => input instanceof HTMLInputElement)
    .sort((a, b) => {
      const aVisible = isElementVisible(a)
      const bVisible = isElementVisible(b)
      if (aVisible === bVisible) {
        return 0
      }
      return aVisible ? -1 : 1
    })
    .map((input) => input.value.trim())
    .filter(Boolean)
}

function normalizeTimeDisplay(rawTime) {
  const match = rawTime.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!match) {
    return rawTime
  }

  return `${match[1].padStart(2, '0')}:${match[2]}`
}

function normalizeDateDisplay(rawDate) {
  // Some pages include full timestamps in date inputs; keep only HH:MM when present.
  return rawDate.replace(/(\d{1,2}:\d{2})(?::\d{2}(?:[.,]\d{1,3})?)?/g, '$1')
}

function splitDateAndTime(rawDate) {
  const trimmed = rawDate.trim()
  const match = trimmed.match(/^(.*?)(?:\s+(\d{1,2}:\d{2})(?::\d{2}(?:[.,]\d{1,3})?)?)?$/)
  if (!match) {
    return {
      datePart: trimmed,
      timePart: '',
    }
  }

  return {
    datePart: (match[1] || '').trim(),
    timePart: (match[2] || '').trim(),
  }
}

function parseTimeToSeconds(rawTime) {
  const match = rawTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) {
    return null
  }

  const hours = Number.parseInt(match[1], 10)
  const minutes = Number.parseInt(match[2], 10)
  const seconds = Number.parseInt(match[3] || '0', 10)

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return null
  }

  return (hours * 3600) + (minutes * 60) + seconds
}

function sanitizeSubtitleDisplay(text) {
  return text.replace(/(\d{1,2}:\d{2})(?::\d{2}(?:[.,]\d{1,3})?)?/g, '$1')
}

function buildDateRangeSubtitle() {
  const dateValues = getInputValues('input.datePicker')
  const timeValues = getInputValues('input[type="time"]')

  const startDateRaw = dateValues[0] || ''
  const endDateRaw = dateValues[1] || ''
  const startDateSplit = splitDateAndTime(startDateRaw)
  const endDateSplit = splitDateAndTime(endDateRaw)

  const startDate = normalizeDateDisplay(startDateSplit.datePart)
  const endDate = normalizeDateDisplay(endDateSplit.datePart)
  const startTimeRaw = timeValues[0] || startDateSplit.timePart || ''
  const endTimeRaw = timeValues[1] || endDateSplit.timePart || ''
  const startTime = normalizeTimeDisplay(startTimeRaw)
  const endTime = normalizeTimeDisplay(endTimeRaw)

  const start = [startDate, startTime].filter(Boolean).join(' ')
  const end = [endDate, endTime].filter(Boolean).join(' ')

  const startSeconds = parseTimeToSeconds(startTimeRaw)
  const endSeconds = parseTimeToSeconds(endTimeRaw)
  let durationMinutes = null

  if (startSeconds !== null && endSeconds !== null) {
    let diffSeconds = endSeconds - startSeconds
    if (diffSeconds < 0) {
      diffSeconds += 24 * 3600
    }
    durationMinutes = Math.round(diffSeconds / 60)
  }

  if (start && end) {
    return {
      subtitle: sanitizeSubtitleDisplay(`${start} - ${end}`),
      durationMinutes,
    }
  }

  if (start || end) {
    return {
      subtitle: sanitizeSubtitleDisplay(start || end),
      durationMinutes,
    }
  }

  return {
    subtitle: 'Current period',
    durationMinutes,
  }
}

function renderBarsHtml(data) {
  const maxAbsValue = Math.max(...data.map((item) => Math.abs(item.value)), 1)
  return data
    .map((item) => {
      const width = Math.max((Math.abs(item.value) / maxAbsValue) * 100, 2)
      const color = item.value < 0 ? 'linear-gradient(90deg,#f97316,#dc2626)' : 'linear-gradient(90deg,#0ea5e9,#2563eb)'
      return `
        <div style="display:grid;grid-template-columns:220px 1fr 70px;gap:10px;align-items:center;">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.label}</span>
          <div style="height:14px;background:#e2e8f0;border-radius:999px;overflow:hidden;">
            <div style="height:100%;width:${width}%;background:${color};"></div>
          </div>
          <strong style="text-align:right;">${item.display ?? item.value}</strong>
        </div>
      `
    })
    .join('')
}

function mountOverlay(dataset) {
  removeOverlay()

  const { subtitle, durationMinutes } = buildDateRangeSubtitle()

  const overlay = document.createElement('div')
  overlay.id = OVERLAY_ID
  overlay.style.cssText = OVERLAY_STYLE
  if (durationMinutes !== null) {
    overlay.dataset.periodDurationMinutes = String(durationMinutes)
  }

  const panel = document.createElement('section')
  panel.style.cssText = PANEL_STYLE
  panel.innerHTML = `
    <header style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:14px;">
      <div>
        <h2 style="margin:0 0 4px;font-size:20px;">Start Plus</h2>
        <p style="margin:0;color:#334155;">${subtitle}</p>
      </div>
      <button id="start-plus-close" type="button" aria-label="Close overlay" style="border:1px solid #94a3b8;background:#ffffff;border-radius:8px;width:32px;height:32px;font-size:20px;line-height:1;cursor:pointer;">&times;</button>
    </header>
    <div style="display:grid;gap:8px;">${renderBarsHtml(dataset)}</div>
  `

  const closeButton = panel.querySelector('#start-plus-close')
  closeButton.addEventListener('click', () => {
    dismissedByUser = true
    overlay.remove()
  })
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      dismissedByUser = true
      overlay.remove()
    }
  })

  overlay.appendChild(panel)
  document.body.appendChild(overlay)
}

async function maybeRenderOverlay({ forceOpen = false } = {}) {
  if (!isTargetPage()) {
    removeOverlay()
    return { status: 'not-target-page' }
  }

  if (!isLikelyAuthenticated()) {
    return { status: 'not-authenticated' }
  }

  const enabled = await isEnabled()
  if (!enabled) {
    removeOverlay()
    return { status: 'disabled' }
  }

  if (dismissedByUser && !forceOpen) {
    removeOverlay()
    return { status: 'dismissed' }
  }

  const dataset = findBestDataset()
    .filter((row) => Number.isFinite(row.value))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 20)

  if (dataset.length === 0) {
    removeOverlay()
    return { status: 'no-data' }
  }

  dismissedByUser = false
  mountOverlay(dataset)
  return { status: 'opened', itemCount: dataset.length }
}

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
