import planningStatusCsv from '../resources/planning_status.csv?raw'

const OVERLAY_ID = 'start-plus-overlay'
const ROW_TITLE_SELECTOR = '.table.container-table #colFixed .rowTitle'
const ROW_TITLE_STYLE_ID = 'start-plus-row-title-style'
const TARGET_HOST = 'startweb.118-vaud.ch'
const TARGET_HASH_PATH = '/planning/statistiques'
const REQUIRED_QUERY = {
  numeroCentre: '529',
  itemId: 'activitePersonnel',
}
const YEARLY_TARGET_HOURS = Number(
  import.meta.env.YEARLY_TARGET_HOURS ?? import.meta.env.VITE_YEARLY_TARGET_HOURS,
) || 1716

const DEFAULT_PLANNING_STATUS = [
  { code: 1,  libelle: 'GR_SERV',         couleur: '#c8ff00', bulle_d_aide: 'Groupe de service',         priorite_etat: 10  },
  { code: 2,  libelle: 'RENF_1',          couleur: '#aae1ff', bulle_d_aide: 'Renfort 1',                 priorite_etat: 20  },
  { code: 3,  libelle: 'RENF_2',          couleur: '#33a8ff', bulle_d_aide: 'Renfort 2',                 priorite_etat: 25  },
  { code: 7,  libelle: 'ABSENT',          couleur: '#000000', bulle_d_aide: 'Absent',                    priorite_etat: 109 },
  { code: 9,  libelle: 'RENF_3',          couleur: '#3d79c2', bulle_d_aide: 'Renfort 3',                 priorite_etat: 30  },
  { code: 10, libelle: 'RENF_4',          couleur: '#475185', bulle_d_aide: 'Renfort 4',                 priorite_etat: 35  },
  { code: 11, libelle: 'RENF_5',          couleur: '#475185', bulle_d_aide: 'Renfort 5',                 priorite_etat: 40  },
  { code: 26, libelle: 'DISPO_ALARME',    couleur: '#ffe100', bulle_d_aide: 'Disponible pour alarme',    priorite_etat: 15  },
  { code: 28, libelle: 'CADRE_ECA',       couleur: '#a851ff', bulle_d_aide: 'Cadre cours ECAFORM',       priorite_etat: 100 },
  { code: 29, libelle: 'ELEVE_ECA',       couleur: '#cf9fff', bulle_d_aide: 'Élève cours ECAFORM',       priorite_etat: 101 },
  { code: 30, libelle: 'EXERCICE',        couleur: '#5a3282', bulle_d_aide: 'Cours SDIS',                priorite_etat: 102 },
  { code: 31, libelle: 'GARDE',           couleur: '#ff96c8', bulle_d_aide: 'Garde',                     priorite_etat: 103 },
  { code: 32, libelle: 'RESERVE',         couleur: '#ff8000', bulle_d_aide: 'Réserve pour alarme',       priorite_etat: 62  },
  { code: 35, libelle: 'MAL_ACC',         couleur: '#000000', bulle_d_aide: 'Maladie Accident',          priorite_etat: 114 },
  { code: 37, libelle: 'PLAN_SPECIALIST', couleur: '#e6e6e6', bulle_d_aide: 'Planning spécialiste',      priorite_etat: 112 },
  { code: 38, libelle: 'NON_RENSEIGNE',   couleur: '#afafaf', bulle_d_aide: 'Non renseigné',             priorite_etat: 110 },
  { code: 40, libelle: 'PERM_SEULE',      couleur: '#00ff00', bulle_d_aide: 'Permanence seule',          priorite_etat: 5   },
  { code: 41, libelle: 'GR_SERV_MANUEL',  couleur: '#008000', bulle_d_aide: 'Groupe de service manuel',  priorite_etat: 9   },
  { code: 42, libelle: 'INTERVENTIONS',   couleur: '#2596be', bulle_d_aide: 'Interventions',             priorite_etat: 0   },
  { code: 43, libelle: 'PLAN_SPEC_ACTIF', couleur: '#ff0000', bulle_d_aide: 'Spécialiste actif',         priorite_etat: 4   },
  { code: 44, libelle: 'OCCUPE',          couleur: '#5b5b5b', bulle_d_aide: 'Occupé',                    priorite_etat: 113 },
]

function parsePlanningStatusCsv(csvText) {
  const lines = String(csvText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length <= 1) {
    return []
  }

  const rows = []
  for (const line of lines.slice(1)) {
    const parts = line.split(',').map((part) => part.trim())
    if (parts.length < 5) {
      continue
    }

    const code = Number.parseInt(parts[0], 10)
    const bulle_d_aide = parts[1]
    const priorite_etat = Number.parseInt(parts[2], 10)
    const libelle = parts[3]
    const couleur = parts[4].toLowerCase() === '#ffffff' && libelle.toUpperCase() === 'VIERGE'
      ? '#afafaf'
      : parts[4]

    if (!Number.isFinite(code) || !Number.isFinite(priorite_etat) || !libelle) {
      continue
    }

    rows.push({
      code,
      bulle_d_aide,
      priorite_etat,
      libelle,
      couleur,
    })
  }

  return rows
}

const PLANNING_STATUS = parsePlanningStatusCsv(planningStatusCsv)
const PLANNING_STATUS_BY_LIBELLE = new Map(
  (PLANNING_STATUS.length > 0 ? PLANNING_STATUS : DEFAULT_PLANNING_STATUS)
    .map((status) => [status.libelle.toLowerCase(), status]),
)

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
        const status = PLANNING_STATUS_BY_LIBELLE.get(normalizedHeader.toLowerCase())

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
  const match = String(rawTime || '').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:[.,]\d{1,3})?)?$/)
  if (!match) {
    return rawTime
  }

  return `${match[1].padStart(2, '0')}:${match[2]}`
}

function parseTimeParts(rawTime) {
  const match = String(rawTime || '').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2})(?:[.,]\d{1,3})?)?$/)
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

  return { hours, minutes, seconds }
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
  const timeParts = parseTimeParts(rawTime)
  if (!timeParts) {
    return null
  }

  return (timeParts.hours * 3600) + (timeParts.minutes * 60) + timeParts.seconds
}

function sanitizeSubtitleDisplay(text) {
  return text.replace(/(\d{1,2}:\d{2})(?::\d{2}(?:[.,]\d{1,3})?)?/g, '$1')
}

function parseDateDisplayParts(dateDisplay) {
  const match = String(dateDisplay || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) {
    return null
  }

  const day = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10)
  const year = Number.parseInt(match[3], 10)
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
    return null
  }

  return { day, month, year }
}

function parseDateTimeToMs(dateDisplay, timeRaw) {
  const dateParts = parseDateDisplayParts(dateDisplay)
  if (!dateParts) {
    return null
  }

  const timeParts = parseTimeParts(timeRaw || '00:00')
  if (!timeParts) {
    return null
  }

  return new Date(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    timeParts.hours,
    timeParts.minutes,
    timeParts.seconds,
    0,
  ).getTime()
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function getHoursInYear(year) {
  return isLeapYear(year) ? 8784 : 8760
}

function computeThresholdHours(durationMinutes, periodYear) {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return 0
  }

  const durationHours = durationMinutes / 60
  return (YEARLY_TARGET_HOURS * durationHours) / getHoursInYear(periodYear)
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
  const startMs = parseDateTimeToMs(startDate, startTimeRaw)
  const endMs = parseDateTimeToMs(endDate, endTimeRaw)
  const startYear = parseDateDisplayParts(startDate)?.year || null
  const endYear = parseDateDisplayParts(endDate)?.year || null
  let durationMinutes = null

  if (startMs !== null && endMs !== null && endMs >= startMs) {
    durationMinutes = Math.round((endMs - startMs) / 60000)
  } else if (startSeconds !== null && endSeconds !== null) {
    let diffSeconds = endSeconds - startSeconds
    if (diffSeconds < 0) {
      diffSeconds += 24 * 3600
    }
    durationMinutes = Math.round(diffSeconds / 60)
  }

  if (start && end) {
    console.log('[MyStart+][Threshold Debug][Date Range]', {
      dateValues,
      timeValues,
      startDateRaw,
      endDateRaw,
      startDate,
      endDate,
      startTimeRaw,
      endTimeRaw,
      startTime,
      endTime,
      startSeconds,
      endSeconds,
      startMs,
      endMs,
      durationMinutes,
      startYear,
      endYear,
    })

    return {
      subtitle: sanitizeSubtitleDisplay(`${start} - ${end}`),
      durationMinutes,
      periodYear: startYear || endYear || new Date().getFullYear(),
    }
  }

  if (start || end) {
    console.log('[MyStart+][Threshold Debug][Partial Range]', {
      dateValues,
      timeValues,
      startDateRaw,
      endDateRaw,
      startDate,
      endDate,
      startTimeRaw,
      endTimeRaw,
      startTime,
      endTime,
      startSeconds,
      endSeconds,
      startMs,
      endMs,
      durationMinutes,
      startYear,
      endYear,
    })

    return {
      subtitle: sanitizeSubtitleDisplay(start || end),
      durationMinutes,
      periodYear: startYear || endYear || new Date().getFullYear(),
    }
  }

  console.log('[MyStart+][Threshold Debug][No Range]', {
    dateValues,
    timeValues,
    startDateRaw,
    endDateRaw,
    startDate,
    endDate,
    startTimeRaw,
    endTimeRaw,
    startTime,
    endTime,
    startSeconds,
    endSeconds,
    startMs,
    endMs,
    durationMinutes,
    startYear,
    endYear,
  })

  return {
    subtitle: 'Current period',
    durationMinutes,
    periodYear: new Date().getFullYear(),
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function normalizeNameText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokenizeName(value) {
  return normalizeNameText(value)
    .split(/\s+/)
    .filter(Boolean)
}

function getCurrentUserDisplayName() {
  const selectors = [
    'span.capitalize.ng-binding.ng-scope',
    '[data-ng-if="headerCtrl.getAuthSession().displayName"]',
  ]

  for (const selector of selectors) {
    const nodes = Array.from(document.querySelectorAll(selector))
    for (const node of nodes) {
      const text = (node.textContent || '').trim()
      if (text) {
        return text
      }
    }
  }

  return ''
}

function findBestMatchingDatasetItem(dataset, userDisplayName) {
  const userTokens = tokenizeName(userDisplayName)
  if (userTokens.length === 0) {
    return null
  }

  const userTokenSet = new Set(userTokens)
  const normalizedUser = normalizeNameText(userDisplayName)
  const sortedUserTokens = [...userTokenSet].sort().join(' ')
  let bestMatch = null

  for (const item of dataset) {
    const labelTokens = tokenizeName(item.label)
    if (labelTokens.length === 0) {
      continue
    }

    const labelTokenSet = new Set(labelTokens)
    const commonCount = [...userTokenSet].filter((token) => labelTokenSet.has(token)).length
    if (commonCount === 0) {
      continue
    }

    const userCoverage = commonCount / userTokenSet.size
    const labelCoverage = commonCount / labelTokenSet.size
    let score = (userCoverage * 0.7) + (labelCoverage * 0.3)
    const normalizedLabel = normalizeNameText(item.label)
    const sortedLabelTokens = [...labelTokenSet].sort().join(' ')

    if (normalizedLabel === normalizedUser) {
      score += 1
    } else if (sortedLabelTokens === sortedUserTokens) {
      score += 0.5
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        item,
        score,
        commonCount,
        userCoverage,
        labelCoverage,
      }
    }
  }

  if (!bestMatch) {
    return null
  }

  const isStrongMatch = (
    (bestMatch.commonCount >= 2 && bestMatch.userCoverage >= 0.66 && bestMatch.score >= 0.75) ||
    (bestMatch.userCoverage === 1 && bestMatch.labelCoverage >= 0.5)
  )

  if (!isStrongMatch) {
    console.log('[MyStart+][User Match] No reliable match', {
      userDisplayName,
      bestLabel: bestMatch.item.label,
      score: bestMatch.score,
      commonCount: bestMatch.commonCount,
      userCoverage: bestMatch.userCoverage,
      labelCoverage: bestMatch.labelCoverage,
    })
    return null
  }

  console.log('[MyStart+][User Match] Auto-opening user', {
    userDisplayName,
    matchedLabel: bestMatch.item.label,
    score: bestMatch.score,
    commonCount: bestMatch.commonCount,
    userCoverage: bestMatch.userCoverage,
    labelCoverage: bestMatch.labelCoverage,
  })

  return bestMatch.item
}

function findDatasetItemByLabel(dataset, rawLabel) {
  const normalizedLabel = normalizeNameText(rawLabel)
  if (!normalizedLabel) {
    return null
  }

  return dataset.find((item) => normalizeNameText(item.label) === normalizedLabel) || null
}

function showGraphView(panel, selectedItem, thresholdHours) {
  const body = panel.querySelector('#start-plus-body')

  body.innerHTML = `
    <div style="margin-bottom:12px;display:flex;align-items:center;gap:10px;">
      <span style="font-weight:600;font-size:15px;">${escapeHtml(selectedItem.label)}</span>
    </div>
    <div>${renderStackedBarHtml(selectedItem, thresholdHours)}</div>
  `
}

function renderStackedBarHtml(item, thresholdHours = 0) {
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

  const safeThresholdHours = Math.max(Number(thresholdHours) || 0, 0)
  const thresholdPct = (safeThresholdHours / total) * 100
  const clampedPct = Math.min(Math.max(thresholdPct, 0), 100)

  const mobilizableStatuses = new Set([
    'GR_SERV',
    'DISPO_ALARME',
    'RESERVE',
    'PERM_SEULE',
    'GR_SERV_MANUEL',
    'PLAN_SPEC_ACTIF',
  ])
  const mobilizableHours = item.segments.reduce((sum, segment) => {
    return mobilizableStatuses.has(String(segment.libelle || '').toUpperCase())
      ? sum + Math.abs(segment.value)
      : sum
  }, 0)
  const mobilizablePct = (mobilizableHours / total) * 100
  const clampedMobilizablePct = Math.min(Math.max(mobilizablePct, 0), 100)

  const thresholdSectionSeparator = `
    <div style="height:1px;margin:12px 0 6px;border-radius:999px;background:#e5e7eb;"></div>
  `
  const thresholdLegendItem = `
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="width:2px;height:12px;flex-shrink:0;background:#dc2626;border-radius:2px;margin-inline:5px;"></span>
      <span style="flex:1;">Heures demandées rapportées à la période</span>
      <strong>${escapeHtml(formatHoursToHm(safeThresholdHours))}</strong>
    </div>
  `
  const mobilizableLegendItem = `
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="width:2px;height:12px;flex-shrink:0;background:#2596be;border-radius:2px;margin-inline:5px;"></span>
      <span style="flex:1;">Heures mobilisables</span>
      <strong>${escapeHtml(formatHoursToHm(mobilizableHours))}</strong>
    </div>
  `

  return `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
      <div style="position:relative;flex:1;height:24px;">
        <div style="display:flex;width:100%;height:100%;border-radius:999px;overflow:hidden;background:#e2e8f0;">
          ${barSegments}
        </div>
        <div title="Seuil: ${escapeHtml(formatHoursToHm(safeThresholdHours))}" style="position:absolute;top:-8px;bottom:-8px;left:${clampedPct}%;width:2px;background:#dc2626;transform:translateX(-50%);border-radius:2px;pointer-events:none;"></div>
        <div title="Heures mobilisables: ${escapeHtml(formatHoursToHm(mobilizableHours))}" style="position:absolute;top:-9px;bottom:-9px;left:${clampedMobilizablePct}%;width:2px;background:#2596be;transform:translateX(-50%);border-radius:2px;pointer-events:none;"></div>
      </div>
      <strong style="white-space:nowrap;">${escapeHtml(item.display)}</strong>
    </div>
    <div style="display:grid;gap:6px;font-size:13px;">
      ${legendItems}
      ${thresholdSectionSeparator}
      ${thresholdLegendItem}
      ${mobilizableLegendItem}
    </div>
  `
}

function mountOverlay(dataset, preferredLabel = '') {
  removeOverlay()

  const { subtitle, durationMinutes, periodYear } = buildDateRangeSubtitle()
  const currentUserDisplayName = getCurrentUserDisplayName()
  const hoursInYear = getHoursInYear(periodYear)
  const durationHours = Number.isFinite(durationMinutes) ? durationMinutes / 60 : null
  const thresholdHours = computeThresholdHours(durationMinutes, periodYear)
  const preferredItem = findDatasetItemByLabel(dataset, preferredLabel)
  const matchedItem = findBestMatchingDatasetItem(dataset, currentUserDisplayName)

  console.log('[MyStart+][Threshold Debug][Equation]', {
    yearlyTargetHours: YEARLY_TARGET_HOURS,
    durationMinutes,
    durationHours,
    periodYear,
    hoursInYear,
    formula: '(yearlyTargetHours * durationHours) / hoursInYear',
    thresholdHours,
  })

  const overlay = document.createElement('div')
  overlay.id = OVERLAY_ID
  overlay.style.cssText = OVERLAY_STYLE
  if (durationMinutes !== null) {
    overlay.dataset.periodDurationMinutes = String(durationMinutes)
  }
  overlay.dataset.thresholdHours = String(thresholdHours)

  const panel = document.createElement('section')
  panel.style.cssText = PANEL_STYLE
  panel.innerHTML = `
    <header style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:14px;">
      <div>
        <h2 style="margin:0 0 4px;font-size:20px;">MyStart+</h2>
        <p style="margin:0;color:#334155;">${subtitle}</p>
      </div>
      <button id="start-plus-close" type="button" aria-label="Close overlay" style="border:1px solid #e2e8f0;background:#f8fafc;border-radius:8px;width:32px;height:32px;font-size:20px;line-height:1;cursor:pointer;">&times;</button>
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

  const selectedItem = preferredItem || matchedItem || dataset[0]
  showGraphView(panel, selectedItem, thresholdHours)
}

async function maybeRenderOverlay({ forceOpen = false, preferredLabel = '' } = {}) {
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
  mountOverlay(dataset, preferredLabel)
  return { status: 'opened', itemCount: dataset.length }
}

async function maybeRenderOverlayFromNameClick(event) {
  if (!isTargetPage() || isOverlayNode(event.target)) {
    return
  }

  const rowTitle = event.target instanceof Element
    ? event.target.closest(ROW_TITLE_SELECTOR)
    : null
  const label = (rowTitle?.textContent || '').trim()

  if (!label) {
    return
  }

  await maybeRenderOverlay({ forceOpen: true, preferredLabel: label })
}

function ensureRowTitleInteractionStyle() {
  if (document.getElementById(ROW_TITLE_STYLE_ID)) {
    return
  }

  const style = document.createElement('style')
  style.id = ROW_TITLE_STYLE_ID
  style.textContent = `
    ${ROW_TITLE_SELECTOR} {
      cursor: pointer;
      transition: filter 120ms ease, background-color 120ms ease;
    }

    ${ROW_TITLE_SELECTOR}:hover {
      background-color: rgba(15, 23, 42, 0.06);
      filter: brightness(0.97);
    }
  `

  document.head.appendChild(style)
}

ensureRowTitleInteractionStyle()

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
