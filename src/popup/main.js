import './style.css'

const app = document.querySelector('#app')

app.innerHTML = `
  <section class="panel">
    <h1>Start Plus</h1>
    <p>Open the MyStart overlay on the active tab.</p>
    <button id="open-overlay" type="button">Open Overlay</button>
    <p id="status" class="status">Ready.</p>
  </section>
`

const status = document.querySelector('#status')
const openOverlayButton = document.querySelector('#open-overlay')

openOverlayButton.addEventListener('click', async () => {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (!activeTab?.id) {
      status.textContent = 'No active tab found.'
      return
    }

    const response = await chrome.tabs.sendMessage(activeTab.id, {
      type: 'START_PLUS_OPEN_OVERLAY',
    })

    switch (response?.status) {
      case 'opened':
        status.textContent = `Overlay opened (${response.itemCount} rows).`
        break
      case 'no-data':
        status.textContent = 'No data available on this page yet.'
        break
      case 'not-target-page':
        status.textContent = 'This tab is not the MyStart statistics page.'
        break
      case 'disabled':
        status.textContent = 'Extension is disabled in options.'
        break
      default:
        status.textContent = 'Unable to open overlay on this tab.'
        break
    }
  } catch (error) {
    status.textContent = `Error: ${error.message}`
  }
})
