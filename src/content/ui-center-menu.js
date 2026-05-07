import { CENTER_LINKS, CENTER_MENU_ID } from './constants.js'
import { buildCenterHash, isEnabled, isLikelyAuthenticated, shouldShowCenterMenu } from './routing.js'

export function removeCenterMenu() {
  const existing = document.getElementById(CENTER_MENU_ID)
  if (existing) {
    existing.remove()
  }
}

function mountCenterMenu() {
  removeCenterMenu()

  const menu = document.createElement('aside')
  menu.id = CENTER_MENU_ID
  menu.style.cssText = `
    position: fixed;
    right: 14px;
    bottom: 14px;
    z-index: 2147483646;
    width: min(220px, calc(100vw - 28px));
    border-radius: 10px;
    border: 1px solid rgba(15, 23, 42, 0.18);
    background: #ffffff;
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.2);
    padding: 10px;
    font: 13px/1.35 'Segoe UI', sans-serif;
    color: #0f172a;
  `

  const title = document.createElement('p')
  title.textContent = 'Choisir un centre'
  title.style.cssText = 'margin:0 0 8px;font-weight:600;font-size:13px;'
  menu.appendChild(title)

  const buttonGroup = document.createElement('div')
  buttonGroup.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px;'

  for (const link of CENTER_LINKS) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = link.label
    button.style.cssText = `
      border: 1px solid #167cbc;
      border-radius: 8px;
      background: #167cbc;
      color: #ffffff;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      padding: 7px 8px;
    `
    button.addEventListener('click', () => {
      location.hash = buildCenterHash(link.centerId)
      removeCenterMenu()
    })
    buttonGroup.appendChild(button)
  }

  menu.appendChild(buttonGroup)
  document.body.appendChild(menu)
}

export async function maybeRenderCenterMenu() {
  if (!shouldShowCenterMenu()) {
    removeCenterMenu()
    return
  }

  if (!isLikelyAuthenticated()) {
    removeCenterMenu()
    return
  }

  const enabled = await isEnabled()
  if (!enabled) {
    removeCenterMenu()
    return
  }

  mountCenterMenu()
}
