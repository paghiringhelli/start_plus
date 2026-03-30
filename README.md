# Start Plus Chrome Extension (Vite)

Chrome extension for MyStart that reads data from a div-based HTML table on the target statistics page and displays an overlay with graphs.

## Target page

The content script is scoped to:

- Host: `https://startweb.118-vaud.ch/*`
- SPA route: `#/planning/statistiques`
- Required query params:
	- `numeroCentre=529`
	- `itemId=activitePersonnel`

The overlay is rendered only when:

- The user enabled extension behavior in Options.
- The current page matches the route above.
- The app appears to be in logged-in/app mode.

## Scripts

- `npm run dev` builds in watch mode for extension development.
- `npm run build` creates a production build in `dist/`.
- `npm run preview` previews Vite output as a regular web app (optional).

## Restricted Windows setup

If your company policy blocks `npm` in PATH, use the included PowerShell helper:

1. Install Node in `C:\\DATA\\nodejs` (already done on this machine).
2. From the project folder, run:

```powershell
.\build.ps1
```

Optional (if Node is in another folder):

```powershell
.\build.ps1 -NodeRoot 'C:\\MyTools\\nodejs'
```

## Load in Chrome

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `dist/` folder.

## Project structure

- `public/manifest.json`: Chrome extension manifest.
- `src/background.js`: service worker.
- `src/content.js`: content script that detects table-like data and renders the overlay graph.
- `popup.html` + `src/popup/*`: extension popup UI.
- `options.html` + `src/options/*`: options page UI.

## Dev loop

1. Run `npm run dev`.
2. In `chrome://extensions`, click **Reload** on the extension after file changes.
3. Re-open popup/page to see updates.
