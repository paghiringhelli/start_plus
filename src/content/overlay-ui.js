import { OVERLAY_ID, OVERLAY_STYLE, PANEL_STYLE, YEARLY_TARGET_HOURS, ROW_TITLE_SELECTOR } from './constants.js'
import { canCurrentUserViewAllStatsSecondaryGate } from './auth.js'
import { findBestDataset } from './data-extraction.js'
import { findBestMatchingDatasetItem, findDatasetItemByLabel } from './name-matching.js'
import { getCurrentUserDisplayName } from './user-identity.js'
import { escapeHtml, getInputValues } from './dom-utils.js'
import {
  computeThresholdHours,
  formatHoursToHm,
  normalizeDateDisplay,
  normalizeTimeDisplay,
  parseDateDisplayParts,
  parseDateTimeToMs,
  parseTimeToSeconds,
  sanitizeSubtitleDisplay,
  splitDateAndTime,
} from './date-time.js'
import { isOverlayDismissed, setOverlayDismissed } from './state.js'
import { isEnabled, isLikelyAuthenticated, isTargetPage } from './routing.js'
import { ensureRowTitleInteractionStyle } from './row-title-style.js'

/**
 * @typedef {Object} DatasetSegment
 * @property {string} libelle
 * @property {string} couleur
 * @property {string} bulle_d_aide
 * @property {number} priorite_etat
 * @property {number} value
 * @property {string} display
 */

/**
 * @typedef {Object} DatasetRow
 * @property {string} label
 * @property {number} value
 * @property {string} display
 * @property {DatasetSegment[]=} segments
 */

function isOverlayNode(node) {
  if (node instanceof Element) {
    return node.id === OVERLAY_ID || node.closest(`#${OVERLAY_ID}`) !== null
  }

  const parent = node?.parentElement
  return parent ? parent.id === OVERLAY_ID || parent.closest(`#${OVERLAY_ID}`) !== null : false
}

export function removeOverlay() {
  const existing = document.getElementById(OVERLAY_ID)
  if (existing) {
    existing.remove()
  }
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
    return {
      subtitle: sanitizeSubtitleDisplay(`${start} - ${end}`),
      durationMinutes,
      periodYear: startYear || endYear || new Date().getFullYear(),
    }
  }

  if (start || end) {
    return {
      subtitle: sanitizeSubtitleDisplay(start || end),
      durationMinutes,
      periodYear: startYear || endYear || new Date().getFullYear(),
    }
  }

  return {
    subtitle: 'Current period',
    durationMinutes,
    periodYear: new Date().getFullYear(),
  }
}

/**
 * @param {HTMLElement} panel
 * @param {DatasetRow} selectedItem
 * @param {number} thresholdHours
 */
function showGraphView(panel, selectedItem, thresholdHours) {
  const body = panel.querySelector('#start-plus-body')

  body.innerHTML = `
    <div style="margin-bottom:12px;display:flex;align-items:center;gap:10px;">
      <span style="font-weight:600;font-size:15px;">${escapeHtml(selectedItem.label)}</span>
    </div>
    <div>${renderStackedBarHtml(selectedItem, thresholdHours)}</div>
  `
}

/**
 * @param {DatasetRow} item
 * @param {number} thresholdHours
 * @returns {string}
 */
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

/**
 * @param {DatasetRow[]} dataset
 * @param {string} preferredLabel
 */
function mountOverlay(dataset, preferredLabel = '') {
  removeOverlay()

  const { subtitle, durationMinutes, periodYear } = buildDateRangeSubtitle()
  const currentUserDisplayName = getCurrentUserDisplayName()
  const thresholdHours = computeThresholdHours(durationMinutes, periodYear, YEARLY_TARGET_HOURS)
  const preferredItem = findDatasetItemByLabel(dataset, preferredLabel)
  const matchedItem = findBestMatchingDatasetItem(dataset, currentUserDisplayName)

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
    setOverlayDismissed(true)
    overlay.remove()
  })
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      setOverlayDismissed(true)
      overlay.remove()
    }
  })

  overlay.appendChild(panel)
  document.body.appendChild(overlay)

  const selectedItem = preferredItem || matchedItem || dataset[0]
  showGraphView(panel, selectedItem, thresholdHours)
}

/**
 * @param {{forceOpen?: boolean, preferredLabel?: string}=} options
 */
export async function maybeRenderOverlay({ forceOpen = false, preferredLabel = '' } = {}) {
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

  if (isOverlayDismissed() && !forceOpen) {
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

  if (forceOpen && preferredLabel && !(await canCurrentUserViewAllStatsSecondaryGate())) {
    return { status: 'not-authorized' }
  }

  setOverlayDismissed(false)
  mountOverlay(dataset, preferredLabel)
  return { status: 'opened', itemCount: dataset.length }
}

export async function maybeRenderOverlayFromNameClick(event) {
  if (!isTargetPage() || isOverlayNode(event.target)) {
    return
  }

  if (!(await canCurrentUserViewAllStatsSecondaryGate())) {
    return
  }

  ensureRowTitleInteractionStyle()

  const rowTitle = event.target instanceof Element
    ? event.target.closest(ROW_TITLE_SELECTOR)
    : null
  const label = (rowTitle?.textContent || '').trim()

  if (!label) {
    return
  }

  await maybeRenderOverlay({ forceOpen: true, preferredLabel: label })
}
