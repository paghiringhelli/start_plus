import { AUTHZ_POLICY_FILE, AUTHZ_PUBLIC_KEY } from './constants.js'
import { getCurrentUserId, normalizeUserId } from './user-identity.js'

function base64ToUint8Array(base64Value) {
  const normalized = String(base64Value || '')
    .trim()
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  if (!normalized) {
    return new Uint8Array(0)
  }

  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const decoded = atob(padded)
  const bytes = new Uint8Array(decoded.length)
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index)
  }

  return bytes
}

function decodeUtf8(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
    return ''
  }

  return new TextDecoder().decode(bytes)
}

function toBase64Url(bytes) {
  let binary = ''
  for (const value of bytes) {
    binary += String.fromCharCode(value)
  }
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function parseSshRsaPublicKey(rawValue) {
  const parts = String(rawValue || '').trim().split(/\s+/)
  if (parts.length < 2 || parts[0] !== 'ssh-rsa') {
    return null
  }

  const bytes = base64ToUint8Array(parts[1])
  let offset = 0

  const readUint32 = () => {
    if (offset + 4 > bytes.length) return null
    const value =
      (bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]
    offset += 4
    return value >>> 0
  }

  const readField = () => {
    const length = readUint32()
    if (length === null || offset + length > bytes.length) {
      return null
    }
    const value = bytes.slice(offset, offset + length)
    offset += length
    return value
  }

  const type = readField()
  const exponent = readField()
  const modulus = readField()
  if (!type || !exponent || !modulus) {
    return null
  }

  const typeText = new TextDecoder().decode(type)
  if (typeText !== 'ssh-rsa') {
    return null
  }

  const trimLeadingZero = (value) => {
    let index = 0
    while (index < value.length - 1 && value[index] === 0) {
      index += 1
    }
    return value.slice(index)
  }

  return {
    kty: 'RSA',
    e: toBase64Url(trimLeadingZero(exponent)),
    n: toBase64Url(trimLeadingZero(modulus)),
    alg: 'RS256',
    ext: true,
  }
}

function parsePemPublicKeyToSpkiB64(rawValue) {
  const text = String(rawValue || '').trim()
  if (!text.startsWith('-----BEGIN PUBLIC KEY-----')) {
    return ''
  }

  return text
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s+/g, '')
}

function parseAuthzPolicy(payloadText) {
  const parsed = JSON.parse(payloadText)
  if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) {
    return null
  }

  const expiresAt = String(parsed.expiresAt || '').trim()
  const expiresAtMs = Date.parse(expiresAt)
  if (!Number.isFinite(expiresAtMs)) {
    return null
  }

  const allowedUserIds = Array.isArray(parsed.allowedUserIds)
    ? parsed.allowedUserIds.map(normalizeUserId).filter(Boolean)
    : []

  return {
    expiresAt,
    expiresAtMs,
    allowedUserIds: new Set(allowedUserIds),
  }
}

async function importAuthzPublicKey(rawValue) {
  const sshJwk = parseSshRsaPublicKey(rawValue)
  if (sshJwk) {
    return crypto.subtle.importKey(
      'jwk',
      sshJwk,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['verify'],
    )
  }

  const pemSpkiB64 = parsePemPublicKeyToSpkiB64(rawValue)
  const spkiB64 = pemSpkiB64 || String(rawValue || '').trim()
  const publicKeyBytes = base64ToUint8Array(spkiB64)
  if (publicKeyBytes.length === 0) {
    return null
  }

  return crypto.subtle.importKey(
    'spki',
    publicKeyBytes,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['verify'],
  )
}

async function verifyAuthzSignature(payloadText, signatureBytes, rawPublicKey) {
  const key = await importAuthzPublicKey(rawPublicKey)
  if (!key) {
    return false
  }

  return crypto.subtle.verify(
    {
      name: 'RSASSA-PKCS1-v1_5',
    },
    key,
    signatureBytes,
    new TextEncoder().encode(payloadText),
  )
}

async function _fetchAndVerifyAuthzPolicy() {
  try {
    const publicKeyText = String(AUTHZ_PUBLIC_KEY || '').trim()
    if (!publicKeyText) {
      return {
        verified: false,
        policy: null,
        reason: 'invalid-embedded-public-key',
      }
    }

    const response = await fetch(chrome.runtime.getURL(AUTHZ_POLICY_FILE), { cache: 'no-store' })
    if (!response.ok) {
      return {
        verified: false,
        policy: null,
        reason: 'missing-policy-file',
      }
    }

    const signedPolicy = await response.json()
    const payloadB64 = String(signedPolicy?.payloadB64 || '').trim()
    const signatureB64 = String(signedPolicy?.signatureB64 || '').trim()
    if (!payloadB64 || !signatureB64) {
      return {
        verified: false,
        policy: null,
        reason: 'invalid-policy-file',
      }
    }

    const payloadBytes = base64ToUint8Array(payloadB64)
    const payloadText = decodeUtf8(payloadBytes)
    const signatureBytes = base64ToUint8Array(signatureB64)

    const signatureValid = await verifyAuthzSignature(payloadText, signatureBytes, publicKeyText)
    if (!signatureValid) {
      return {
        verified: false,
        policy: null,
        reason: 'invalid-signature',
      }
    }

    const policy = parseAuthzPolicy(payloadText)
    if (!policy) {
      return {
        verified: false,
        policy: null,
        reason: 'invalid-payload',
      }
    }

    if (Date.now() > policy.expiresAtMs) {
      return {
        verified: false,
        policy,
        reason: 'expired',
      }
    }

    return {
      verified: true,
      policy,
      reason: 'ok',
    }
  } catch {
    return {
      verified: false,
      policy: null,
      reason: 'verification-error',
    }
  }
}

let _authzPolicyPromise = null

function getVerifiedAuthzPolicy() {
  if (!_authzPolicyPromise) {
    _authzPolicyPromise = _fetchAndVerifyAuthzPolicy()
  }
  return _authzPolicyPromise
}

export async function canCurrentUserViewAllStats() {
  const authz = await getVerifiedAuthzPolicy()

  if (!authz.verified || !authz.policy) {
    return false
  }

  const userId = normalizeUserId(getCurrentUserId())
  return Boolean(userId) && authz.policy.allowedUserIds.has(userId)
}

