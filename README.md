# MyStart+Admin Chrome Extension (Vite)

Chrome extension for MyStart that reads data from a div-based HTML table on the target statistics page and displays an overlay with graphs.

## Target page

The content script is scoped to:

- Host: `https://startweb.118-vaud.ch/*`
- SPA route: `#/planning/statistiques`
- Required query params:
	- `numeroCentre` in `528`, `529`, `530`, `531`
	- `itemId=activitePersonnel`

The overlay is rendered only when:

- The user enabled extension behavior in Options.
- The current page matches the route above.
- The app appears to be in logged-in/app mode.

## Scripts

- `npm run dev` builds in watch mode for extension development.
- `npm run build` creates an unpacked production build in `dist/`.
- `npm run build:main` creates `dist/` and signs `dist_main.crx` with the main extension key.
- `npm run build:admin` creates `dist/` and signs `dist_admin.crx` with the admin extension key.
- `npm run preview` previews Vite output as a regular web app (optional).

## Signed releases

Main and admin are separate Chrome extension identities. Each must always be signed with its own private key so Chrome recognizes later builds as updates.

Store the keys outside this repository:

- Main: `%USERPROFILE%\.ssh\start_plus_main.pem`
- Admin: `%USERPROFILE%\.ssh\start_plus_admin.pem`

### Create the signing keys

On Windows, Chrome can create the keys without OpenSSL. Run `npm run build`, then open `chrome://extensions`, enable **Developer mode**, and click **Pack extension**. Select the `dist/` folder and leave **Private key file** empty. Chrome creates `dist.pem` beside the `dist/` folder. Move it to `%USERPROFILE%\.ssh\start_plus_main.pem`.

Repeat the same process for the admin branch, again leaving **Private key file** empty, then move the newly created `dist.pem` to `%USERPROFILE%\.ssh\start_plus_admin.pem`. Do not reuse a key between main and admin.

Alternatively, install OpenSSL with Windows Package Manager and generate both keys:

```powershell
winget install --id ShiningLight.OpenSSL.Light -e
New-Item -ItemType Directory -Force "$HOME\.ssh"
openssl genrsa -out "$HOME\.ssh\start_plus_main.pem" 2048
openssl genrsa -out "$HOME\.ssh\start_plus_admin.pem" 2048
```

Build the appropriate release explicitly:

```powershell
npm run build:main
npm run build:admin
```

For CI or a different local key location, set the matching environment variable before the build:

```powershell
$env:START_PLUS_MAIN_KEY_PATH = 'C:\secure\start_plus_main.pem'
npm run build:main

$env:START_PLUS_ADMIN_KEY_PATH = 'C:\secure\start_plus_admin.pem'
npm run build:admin
```

The build fails when the selected key is unavailable. Never commit either `.pem` file; both are already ignored. Back up each key in an approved secure secret store. Losing a key means you cannot ship updates for that extension's existing Chrome ID.

## Threshold configuration

The red threshold line is computed from the selected period duration with:

- `thresholdHours = yearlyTargetHours * periodDurationHours / yearHours`
- `yearHours = 8760` (normal year) or `8784` (leap year)

Set the yearly target in `.env`:

```env
YEARLY_TARGET_HOURS=1716
```

Also supported: `VITE_YEARLY_TARGET_HOURS`.

Use `.env.example` as a template.

## Restricted Windows setup

If your company policy blocks `npm` in PATH, use the included PowerShell helper:

1. Install Node in `C:\\DATA\\nodejs` (already done on this machine).
2. From the project folder, run:

```powershell
.\build.ps1
```

Create a signed release by selecting its target:

```powershell
.\build.ps1 -Target main
.\build.ps1 -Target admin
```

Optional (if Node is in another folder):

```powershell
.\build.ps1 -NodeRoot 'C:\MyTools\nodejs' -Target main
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
