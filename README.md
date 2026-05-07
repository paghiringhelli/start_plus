# MyStart+ Chrome Extension (Vite)

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
- `npm run build` creates a production build in `dist/`.
- `npm run preview` previews Vite output as a regular web app (optional).

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

## Signed authorization for "all stats"

Only users present in the signed authorization list can access other people's stats.
If a user is not in that list, they do not have access.

Configuration:

- `dist/authz-policy.json`: signed policy file loaded at runtime.
- Public key is pinned in `src/content/constants.js` and bundled into `dist/assets/content.js`.

Update without rebuild:

- Regenerate a new signed `authz-policy.json` with your private key.
- Replace only `dist/authz-policy.json` on the deployed machine.

Rotate public key (requires rebuild):

- Update the pinned `AUTHZ_PUBLIC_KEY` value in `src/content/constants.js`.
- Rebuild and redeploy the extension.

Local auto-generation on build:

- Put authorized NIPs in `authorized-nips.local` (one per line).
- `npm run build` automatically regenerates `public/authz-policy.json` before building.
- Default private key path used by the signer: `~/.ssh/id_rsa`.
- Override key path manually when needed:

```powershell
npm run authz:sign -- --private-key "C:\Users\<you>\\.ssh\\id_rsa" --user-file authorized-nips.local --out public/authz-policy.json
```

Signature algorithm currently used by the extension:

- RSA PKCS#1 v1.5 with SHA-256.

Authorization rule:

- Signature must verify.
- Payload must be valid and not expired.
- Current user must be listed in `allowedUserIds`.
- Otherwise, access to other people's stats is denied.

Important:

- If embedded public key, policy file, signature, or payload is invalid, access is denied.

Signed file format (`dist/authz-policy.json`):

```json
{
	"payloadB64": "<base64-utf8-json-payload>",
	"signatureB64": "<base64-signature>"
}
```

Payload JSON format (`version: 1` inside `payloadB64`):

```json
{
	"version": 1,
	"expiresAt": "2026-12-31T23:59:59Z",
	"allowedUserIds": ["45484", "12345"]
}
```

Notes:

- `allowedUserIds` should contain stable IDs (recommended).

Generate a signed policy file:

```powershell
npm run authz:sign -- --private-key .secrets/authz-private.pem --user-id 45484 --out dist/authz-policy.json
```

Works directly with modern OpenSSH private keys (for example `C:\Users\<you>\\.ssh\\id_rsa`) without conversion.
If your key is encrypted, add `--passphrase "..."`.

To update permissions on a deployed machine, regenerate and replace only `dist/authz-policy.json`.

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
- `src/content.js`: thin content-script bootstrap (startup and listeners).
- `src/content/*`: modular content-script implementation.
- `popup.html` + `src/popup/*`: extension popup UI.
- `options.html` + `src/options/*`: options page UI.

## Content module map

The content script is split into focused modules under `src/content/`:

- `constants.js`: selectors, IDs, route constants, authz key, and styling constants.
- `state.js`: shared mutable UI state (overlay dismissed flag).
- `planning-status.js`: CSV parsing and planning status lookup map.
- `routing.js`: hash-route parsing, target-page checks, and center-hash helpers.
- `user-identity.js`: current-user ID/display-name extraction and normalization.
- `auth.js`: signed policy verification and authorization gates.
- `date-time.js`: date/time parsing, formatting, and threshold computations.
- `name-matching.js`: user-name normalization and dataset row matching.
- `dom-utils.js`: DOM utility helpers (visibility, input extraction, HTML escaping).
- `data-extraction.js`: table parsing and dataset shaping.
- `ui-center-menu.js`: floating center picker rendering and refresh logic.
- `row-title-style.js`: clickable row-title style injection and refresh logic.
- `overlay-ui.js`: overlay rendering and click-to-open behavior.

## Dev loop

1. Run `npm run dev`.
2. In `chrome://extensions`, click **Reload** on the extension after file changes.
3. Re-open popup/page to see updates.
