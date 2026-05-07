import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createPrivateKey, sign as signWithKey } from 'node:crypto'
import { homedir } from 'node:os'
import sshpk from 'sshpk'

function getArgValue(args, name, defaultValue = '') {
  const index = args.indexOf(name)
  if (index < 0 || index + 1 >= args.length) {
    return defaultValue
  }

  return args[index + 1]
}

function getArgValues(args, name) {
  const values = []
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name && index + 1 < args.length) {
      values.push(args[index + 1])
    }
  }
  return values
}

function printHelp() {
  console.log(`Usage: node scripts/generate-authz-policy.mjs [options]

Required:
  --user-id <matricule>         Authorized matricule (repeat for multiple)

Optional:
  --private-key <path>          Path to RSA private key (PEM/OpenSSH)
                                Default: ~/.ssh/id_rsa
  --user-file <path>            File with one NIP per line (supports comments with #)
  --expires-at <ISO-8601>       Expiration timestamp (default: +5 years)
  --passphrase <text>           Private key passphrase if encrypted
  --out <path>                  Output file (default: dist/authz-policy.json)

Examples:
  node scripts/generate-authz-policy.mjs --private-key .secrets/authz-private.pem --user-id 45484
  node scripts/generate-authz-policy.mjs --private-key .secrets/authz-private.pem --user-id 45484 --user-id 12345 --out dist/authz-policy.json
`)
}

function loadPrivateKey(privateKeyText, passphrase = '') {
  try {
    return createPrivateKey({
      key: privateKeyText,
      format: 'pem',
      passphrase: passphrase || undefined,
    })
  } catch {
    // Fall through to OpenSSH parsing.
  }

  try {
    const parsed = sshpk.parsePrivateKey(
      privateKeyText,
      'auto',
      passphrase ? { passphrase } : undefined,
    )
    return createPrivateKey(parsed.toString('pem'))
  } catch {
    throw new Error('Unable to read private key. Use a valid PEM/OpenSSH RSA key and passphrase if needed.')
  }
}

function getDefaultExpiryIso() {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 5)
  return date.toISOString()
}

function normalizeUserId(value) {
  return String(value || '')
    .replace(/[^0-9A-Za-z_-]/g, '')
    .trim()
}

function readUserIdsFromFile(filePath) {
  const absolute = resolve(filePath)
  const content = readFileSync(absolute, 'utf8')
  const userIds = []

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const userId = normalizeUserId(trimmed)
    if (userId) {
      userIds.push(userId)
    }
  }

  return userIds
}

function main() {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    printHelp()
    return
  }

  const defaultKeyPath = resolve(homedir(), '.ssh', 'id_rsa')
  const privateKeyPath = getArgValue(args, '--private-key', defaultKeyPath)
  const userFilePath = getArgValue(args, '--user-file')
  const passphrase = getArgValue(args, '--passphrase')
  const outPath = getArgValue(args, '--out', 'dist/authz-policy.json')
  const expiresAt = getArgValue(args, '--expires-at', getDefaultExpiryIso())
  const cliUserIds = getArgValues(args, '--user-id').map(normalizeUserId).filter(Boolean)
  const fileUserIds = userFilePath && existsSync(resolve(userFilePath)) ? readUserIdsFromFile(userFilePath) : []
  const userIds = [...new Set([...cliUserIds, ...fileUserIds])]

  if (userIds.length === 0) {
    throw new Error('At least one --user-id <matricule> or --user-file <path> is required.')
  }

  const expiresMs = Date.parse(expiresAt)
  if (!Number.isFinite(expiresMs)) {
    throw new Error('Invalid --expires-at value. Use ISO-8601 format.')
  }

  const absolutePrivateKeyPath = resolve(privateKeyPath)
  if (!existsSync(absolutePrivateKeyPath)) {
    throw new Error(`Private key file not found: ${absolutePrivateKeyPath}`)
  }

  const privateKeyText = readFileSync(absolutePrivateKeyPath, 'utf8')
  const privateKey = loadPrivateKey(privateKeyText, passphrase)

  const payload = {
    version: 1,
    expiresAt,
    allowedUserIds: userIds,
  }
  const payloadText = JSON.stringify(payload)
  const payloadB64 = Buffer.from(payloadText, 'utf8').toString('base64')

  const signature = signWithKey('sha256', Buffer.from(payloadText, 'utf8'), {
    key: privateKey,
  })
  const signatureB64 = signature.toString('base64')

  const output = {
    payloadB64,
    signatureB64,
  }

  const absoluteOut = resolve(outPath)
  mkdirSync(dirname(absoluteOut), { recursive: true })
  writeFileSync(absoluteOut, `${JSON.stringify(output, null, 2)}\n`, 'utf8')

  console.log(`Wrote signed policy: ${absoluteOut}`)
  console.log(`Private key: ${absolutePrivateKeyPath}`)
  console.log(`Allowed user IDs: ${userIds.join(', ')}`)
  console.log(`Expires at: ${expiresAt}`)
}

try {
  main()
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
