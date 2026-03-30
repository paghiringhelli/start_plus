import './style.css'

const STORAGE_KEY = 'start_plus_enabled'

const app = document.querySelector('#app')

app.innerHTML = `
  <section class="settings">
    <h1>MyStart+ Settings</h1>
    <label class="toggle-row">
      <input id="enabled" type="checkbox" />
      Enable extension behavior on pages
    </label>
    <p id="saved" class="saved"></p>
  </section>
`

const enabledCheckbox = document.querySelector('#enabled')
const savedText = document.querySelector('#saved')

async function loadSettings() {
  const data = await chrome.storage.sync.get({ [STORAGE_KEY]: true })
  enabledCheckbox.checked = data[STORAGE_KEY]
}

async function saveSettings(value) {
  await chrome.storage.sync.set({ [STORAGE_KEY]: value })
  savedText.textContent = 'Saved.'
  setTimeout(() => {
    savedText.textContent = ''
  }, 1200)
}

enabledCheckbox.addEventListener('change', (event) => {
  saveSettings(event.target.checked)
})

loadSettings()
