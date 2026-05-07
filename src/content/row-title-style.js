import { ROW_TITLE_SELECTOR, ROW_TITLE_STYLE_ID } from './constants.js'
import { canCurrentUserViewAllStats } from './auth.js'
import { isTargetPage } from './routing.js'

export function removeRowTitleInteractionStyle() {
  const existing = document.getElementById(ROW_TITLE_STYLE_ID)
  if (existing) {
    existing.remove()
  }
}

export function ensureRowTitleInteractionStyle() {
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

export async function refreshRowTitleInteractionStyle() {
  if (!isTargetPage()) {
    removeRowTitleInteractionStyle()
    return
  }

  const canViewAllStats = await canCurrentUserViewAllStats()
  if (!canViewAllStats) {
    removeRowTitleInteractionStyle()
    return
  }

  ensureRowTitleInteractionStyle()
}
