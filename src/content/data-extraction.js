import { parseDurationHours, formatHoursToHm } from './date-time.js'
import { PLANNING_STATUS_BY_LIBELLE } from './planning-status.js'

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

function parseNumber(rawText) {
  const cleaned = rawText
    .replace(/\u00a0/g, ' ')
    .replace(/[^0-9,.-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')

  const value = Number.parseFloat(cleaned)
  return Number.isFinite(value) ? value : null
}

function extractMyStartStatDataset() {
  const tables = Array.from(document.querySelectorAll('.table.container-table'))
  /** @type {DatasetRow[]} */
  let bestRows = []

  for (const table of tables) {
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
    /** @type {DatasetRow[]} */
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

  /** @type {DatasetRow[]} */
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

export function findBestDataset() {
  const myStartRows = extractMyStartStatDataset()
  if (myStartRows.length > 0) {
    return myStartRows
  }

  const tableLikeNodes = Array.from(document.querySelectorAll('div[role="table"], div[class*="table"], div[class*="grid"]'))
  /** @type {DatasetRow[]} */
  let bestRows = []

  for (const node of tableLikeNodes) {
    const rows = extractRowsFromContainer(node)
    if (rows.length > bestRows.length) {
      bestRows = rows
    }
  }

  return bestRows
}
