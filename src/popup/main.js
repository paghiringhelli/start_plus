import './style.css'

const app = document.querySelector('#app')
const TARGET_HOST = 'startweb.118-vaud.ch'
const TARGET_HASH_PATH = '#/planning/statistiques'
const REQUIRED_ITEM_ID = 'activitePersonnel'
const ALLOWED_CENTER_IDS = new Set(['528', '529', '530', '531'])

const CENTER_LINKS = [
  { label: 'Jongny', centerId: '531' },
  { label: 'Montreux', centerId: '528' },
  { label: 'St-Legier', centerId: '530' },
  { label: 'Vevey', centerId: '529' },
]

function buildTargetUrl(centerId) {
  const query = new URLSearchParams({
    numeroCentre: centerId,
    itemId: REQUIRED_ITEM_ID,
  })

  return `https://startweb.118-vaud.ch/#/planning/statistiques?${query.toString()}`
}

function isAuthorizedStatsPage(url) {
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== TARGET_HOST) {
      return false
    }

    if (!parsed.hash.startsWith(`${TARGET_HASH_PATH}?`)) {
      return false
    }

    const hashQuery = parsed.hash.slice(`${TARGET_HASH_PATH}?`.length)
    const params = new URLSearchParams(hashQuery)
    const centerId = params.get('numeroCentre')
    const itemId = params.get('itemId')

    return ALLOWED_CENTER_IDS.has(centerId) && itemId === REQUIRED_ITEM_ID
  } catch {
    return false
  }
}

function renderCenterLinks() {
  app.innerHTML = `
    <section class="panel">
      <h1>MyStart+</h1>
      <p>Choisissez un centre.</p>
      <div class="link-grid">
        ${CENTER_LINKS.map((center) => `
          <button class="center-link" data-center-id="${center.centerId}" type="button">${center.label}</button>
        `).join('')}
      </div>
    </section>
  `

  const centerButtons = Array.from(document.querySelectorAll('.center-link'))

  centerButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const centerId = button.getAttribute('data-center-id')
      if (!centerId) {
        return
      }

      try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })

        if (!activeTab?.id) {
          return
        }

        await chrome.tabs.update(activeTab.id, {
          url: buildTargetUrl(centerId),
        })

        window.close()
      } catch (error) {
        console.warn('Unable to open selected center from popup.', error)
      }
    })
  })
}

function getCenterLabelFromUrl(url) {
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== TARGET_HOST) return ''
    if (!parsed.hash.startsWith(`${TARGET_HASH_PATH}?`)) return ''
    const hashQuery = parsed.hash.slice(`${TARGET_HASH_PATH}?`.length)
    const params = new URLSearchParams(hashQuery)
    const centerId = params.get('numeroCentre')
    const found = CENTER_LINKS.find(c => c.centerId === centerId)
    return found ? `Centre : ${found.label}` : ''
  } catch {
    return ''
  }
}

function renderStatsAction(centerLabel) {
  app.innerHTML = `
    <section class="panel">
      <h1>MyStart+</h1>
      <p>${centerLabel}</p>
      <button id="open-stats" class="center-link single-action" type="button">Afficher mes stats</button>
    </section>
  `

  const openStatsButton = document.querySelector('#open-stats')
  openStatsButton.addEventListener('click', async () => {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!activeTab?.id) {
        return
      }

      await chrome.tabs.sendMessage(activeTab.id, {
        type: 'START_PLUS_OPEN_OVERLAY',
      })

      window.close()
    } catch (error) {
      console.warn('Unable to open stats overlay from popup.', error)
    }
  })
}

async function initPopup() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })

  if (activeTab?.url && isAuthorizedStatsPage(activeTab.url)) {
    const centerLabel = getCenterLabelFromUrl(activeTab.url)
    renderStatsAction(centerLabel)
    return
  }

  renderCenterLinks()
}

initPopup().catch((error) => {
  console.warn('Unable to initialize popup.', error)
  renderCenterLinks()
})
