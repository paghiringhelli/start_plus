const OVERLAY_ID = 'start-plus-overlay'
const TARGET_HOST = 'startweb.118-vaud.ch'
const TARGET_HASH_PATH = '/planning/statistiques'
const REQUIRED_QUERY = {
  numeroCentre: '529',
  itemId: 'activitePersonnel',
}

const PLANNING_STATUS = [
  { code: 1,  libelle: 'GR_SERV',         couleur: '#c8ff00', bulle_d_aide: 'Groupe de service',         priorite_etat: 10  },
  { code: 2,  libelle: 'RENF_1',          couleur: '#aae1ff', bulle_d_aide: 'Renfort 1',                 priorite_etat: 20  },
  { code: 3,  libelle: 'RENF_2',          couleur: '#33a8ff', bulle_d_aide: 'Renfort 2',                 priorite_etat: 25  },
  { code: 7,  libelle: 'ABSENT',          couleur: '#000000', bulle_d_aide: 'Absent',                    priorite_etat: 100 },
  { code: 9,  libelle: 'RENF_3',          couleur: '#3d79c2', bulle_d_aide: 'Renfort 3',                 priorite_etat: 30  },
  { code: 10, libelle: 'RENF_4',          couleur: '#475185', bulle_d_aide: 'Renfort 4',                 priorite_etat: 35  },
  { code: 11, libelle: 'RENF_5',          couleur: '#475185', bulle_d_aide: 'Renfort 5',                 priorite_etat: 40  },
  { code: 26, libelle: 'DISPO_ALARME',    couleur: '#ffe100', bulle_d_aide: 'Disponible pour alarme',    priorite_etat: 15  },
  { code: 28, libelle: 'CADRE_ECA',       couleur: '#a851ff', bulle_d_aide: 'Cadre cours ECAFORM',       priorite_etat: 100 },
  { code: 29, libelle: 'ELEVE_ECA',       couleur: '#cf9fff', bulle_d_aide: 'Élève cours ECAFORM',       priorite_etat: 100 },
  { code: 30, libelle: 'EXERCICE',        couleur: '#5a3282', bulle_d_aide: 'Cours SDIS',                priorite_etat: 100 },
  { code: 31, libelle: 'GARDE',           couleur: '#ff96c8', bulle_d_aide: 'Garde',                     priorite_etat: 100 },
  { code: 32, libelle: 'RESERVE',         couleur: '#ff8000', bulle_d_aide: 'Réserve pour alarme',       priorite_etat: 62  },
  { code: 35, libelle: 'MAL_ACC',         couleur: '#000000', bulle_d_aide: 'Maladie Accident',          priorite_etat: 100 },
  { code: 37, libelle: 'PLAN_SPECIALIST', couleur: '#e6e6e6', bulle_d_aide: 'Planning spécialiste',      priorite_etat: 100 },
  { code: 38, libelle: 'NON_RENSEIGNE',   couleur: '#afafaf', bulle_d_aide: 'Non renseigné',             priorite_etat: 100 },
  { code: 40, libelle: 'PERM_SEULE',      couleur: '#00ff00', bulle_d_aide: 'Permanence seule',          priorite_etat: 5   },
  { code: 41, libelle: 'GR_SERV_MANUEL',  couleur: '#008000', bulle_d_aide: 'Groupe de service manuel',  priorite_etat: 9   },
  { code: 42, libelle: 'INTERVENTIONS',   couleur: '#2596be', bulle_d_aide: 'Interventions',             priorite_etat: 0   },
  { code: 43, libelle: 'PLAN_SPEC_ACTIF', couleur: '#ff0000', bulle_d_aide: 'Spécialiste actif',         priorite_etat: 100 },
  { code: 44, libelle: 'OCCUPE',          couleur: '#5b5b5b', bulle_d_aide: 'Occupé',                    priorite_etat: 100 },
]

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
    // Column headers live in #rowFixed .colTitle (sibling of #scrollable).
    const headerCells = Array.from(table.querySelectorAll('#rowFixed .colTitle'))
      .map((c) => (c.textContent || '').trim())

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

      const segmentsByLabel = new Map()
      let total = 0

      dataCells.forEach((cell, cellIndex) => {
        const value = parseDurationHours(cell.textContent || '')
        if (value === null || value === 0) {
          return
        }

        const headerText = (headerCells[cellIndex] || '').trim()
        const normalizedHeader = headerText.toUpperCase() === 'VIERGE' ? 'ABSENT' : headerText
        const status = PLANNING_STATUS.find(
          (s) => s.libelle.toLowerCase() === normalizedHeader.toLowerCase(),
        )

        const libelle = status?.libelle || normalizedHeader || `col_${cellIndex}`
        const existing = segmentsByLabel.get(libelle)

        if (existing) {
          existing.value += value
          existing.display = formatHoursToHm(existing.value)
        } else {
          segmentsByLabel.set(libelle, {
            libelle,
            couleur: status?.couleur || '#cbd5e1',
            bulle_d_aide: status?.bulle_d_aide || normalizedHeader || `Column ${cellIndex + 1}`,
            priorite_etat: status?.priorite_etat ?? 999,
            value,
            display: formatHoursToHm(value),
          })
        }

        total += value
      })

      const segments = Array.from(segmentsByLabel.values())

      if (segments.length === 0) {
        continue
      }

      segments.sort((a, b) => a.priorite_etat - b.priorite_etat)

      rows.push({
        label,
        segments,
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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function showSearchView(panel, dataset) {
  const body = panel.querySelector('#start-plus-body')

  const listItems = dataset
    .map(
      (item, i) =>
        `<button data-index="${i}" type="button" style="text-align:left;width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;cursor:pointer;font:14px/1.4 'Segoe UI',sans-serif;color:#0f172a;">${escapeHtml(item.label)}</button>`,
    )
    .join('')

  body.innerHTML = `
    <div style="margin-bottom:10px;">
      <input id="start-plus-search" type="text" placeholder="Search person\u2026" autocomplete="off"
        style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;color:#0f172a;outline:none;" />
    </div>
    <div id="start-plus-person-list" style="display:grid;gap:4px;max-height:380px;overflow-y:auto;">${listItems}</div>
  `

  const searchInput = body.querySelector('#start-plus-search')
  const list = body.querySelector('#start-plus-person-list')

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase()
    for (const btn of list.querySelectorAll('button[data-index]')) {
      const idx = Number(btn.dataset.index)
      btn.style.display = dataset[idx].label.toLowerCase().includes(q) ? '' : 'none'
    }
  })

  for (const btn of list.querySelectorAll('button[data-index]')) {
    btn.addEventListener('click', () => {
      showGraphView(panel, dataset, dataset[Number(btn.dataset.index)])
    })
  }

  searchInput.focus()
}

function showGraphView(panel, dataset, selectedItem) {
  const body = panel.querySelector('#start-plus-body')

  body.innerHTML = `
    <div style="margin-bottom:12px;display:flex;align-items:center;gap:10px;">
      <button id="start-plus-back" type="button" aria-label="Back" style="border:1px solid #94a3b8;background:#ffffff;border-radius:8px;width:32px;height:32px;font-size:20px;line-height:1;cursor:pointer;">&#8249;</button>
      <span style="font-weight:600;font-size:15px;">${escapeHtml(selectedItem.label)}</span>
    </div>
    <div>${renderStackedBarHtml(selectedItem)}</div>
  `

  body.querySelector('#start-plus-back').addEventListener('click', () => {
    showSearchView(panel, dataset)
  })
}

function renderStackedBarHtml(item, thresholdPct = 50) {
  if (!item.segments || item.segments.length === 0) {
    return `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="flex:1;height:24px;background:#e2e8f0;border-radius:999px;overflow:hidden;">
          <div style="height:100%;width:100%;background:linear-gradient(90deg,#0ea5e9,#2563eb);"></div>
        </div>
        <strong style="white-space:nowrap;">${escapeHtml(item.display)}</strong>
      </div>
    `
  }

  const total = item.segments.reduce((sum, s) => sum + Math.abs(s.value), 0) || 1

  const barSegments = item.segments
    .map((s) => {
      const pct = (Math.abs(s.value) / total) * 100
      return `<div title="${escapeHtml(s.bulle_d_aide)}: ${escapeHtml(s.display)}" style="height:100%;width:${pct}%;background:${s.couleur};flex-shrink:0;"></div>`
    })
    .join('')

  const legendItems = item.segments
    .map(
      (s) => `
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="width:12px;height:12px;border-radius:3px;flex-shrink:0;background:${s.couleur};border:1px solid rgba(0,0,0,0.12);"></span>
          <span style="flex:1;">${escapeHtml(s.bulle_d_aide)}</span>
          <strong>${escapeHtml(s.display)}</strong>
        </div>
      `,
    )
    .join('')

  const clampedPct = Math.min(Math.max(thresholdPct, 0), 100)

  return `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
      <div style="position:relative;flex:1;height:24px;">
        <div style="display:flex;width:100%;height:100%;border-radius:999px;overflow:hidden;background:#e2e8f0;">
          ${barSegments}
        </div>
        <div title="Seuil: ${clampedPct}%" style="position:absolute;top:-8px;bottom:-8px;left:${clampedPct}%;width:2px;background:#dc2626;transform:translateX(-50%);border-radius:2px;pointer-events:none;"></div>
      </div>
      <strong style="white-space:nowrap;">${escapeHtml(item.display)}</strong>
    </div>
    <div style="display:grid;gap:6px;font-size:13px;">
      ${legendItems}
    </div>
  `
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
    <div id="start-plus-body"></div>
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

  showSearchView(panel, dataset)
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
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))

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
