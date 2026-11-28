/**
 * Signing helpers shared with the StrataWP core `Headless` component.
 *
 * Preview token: base64url(JSON claims) + '.' + base64url(HMAC-SHA256 of the
 * first part). Webhook: `X-StrataWP-Signature: sha256=<hex HMAC-SHA256 of the
 * raw body>`. Both use the shared secret and run on Web Crypto, so they work
 * in Node 18+ and edge runtimes.
 */

export const SIGNATURE_HEADER = 'x-stratawp-signature'

/** Claims carried by a preview token from WordPress. */
export interface PreviewTokenClaims {
  id: number
  type: string
  /** Path of the post on the public site, e.g. `/hello-world/`. */
  path: string
  /** Expiry, Unix seconds. */
  exp: number
}

/** Body of the revalidation webhook WordPress sends on publish changes. */
export interface RevalidateWebhookPayload {
  event: 'publish' | 'update' | 'unpublish' | 'trash'
  id: number
  type: string
  slug: string
  path: string
  /** When WordPress sent it, Unix seconds. */
  timestamp: number
}

const encoder = new TextEncoder()

// Node 18 only exposes Web Crypto as `require('node:crypto').webcrypto`; Node
// 19+, edge runtimes and browsers have `globalThis.crypto`.
async function subtle(): Promise<SubtleCrypto> {
  if (globalThis.crypto?.subtle) return globalThis.crypto.subtle
  const { webcrypto } = await import(/* webpackIgnore: true */ 'node:crypto')
  return webcrypto.subtle as SubtleCrypto
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const crypto = await subtle()
  const key = await crypto.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return new Uint8Array(await crypto.sign('HMAC', key, encoder.encode(data)))
}

function toBase64url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64url(value: string): string | null {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) return null
  try {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Compare two strings in time that depends only on their length, not on
 * where they first differ.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const left = encoder.encode(a)
  const right = encoder.encode(b)
  let diff = left.length ^ right.length
  for (let i = 0; i < left.length; i++) {
    diff |= left[i] ^ (right[i] ?? 0)
  }
  return diff === 0
}

/** Sign preview claims the way WordPress does (mainly for tests and tooling). */
export async function signPreviewToken(
  claims: PreviewTokenClaims,
  secret: string
): Promise<string> {
  const payload = toBase64url(encoder.encode(JSON.stringify(claims)))
  return `${payload}.${toBase64url(await hmac(secret, payload))}`
}

/**
 * Verify a preview token from WordPress. Returns its claims, or null when the
 * signature does not match, the claims are malformed or the token expired.
 */
export async function verifyPreviewToken(
  token: string,
  secret: string,
  now: number = Math.floor(Date.now() / 1000)
): Promise<PreviewTokenClaims | null> {
  if (!secret) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const expected = toBase64url(await hmac(secret, parts[0]))
  if (!timingSafeEqual(expected, parts[1])) return null

  const json = fromBase64url(parts[0])
  if (json === null) return null

  let claims: unknown
  try {
    claims = JSON.parse(json)
  } catch {
    return null
  }

  if (!claims || typeof claims !== 'object') return null
  const { id, type, path, exp } = claims as Record<string, unknown>
  if (typeof id !== 'number' || typeof type !== 'string' || typeof path !== 'string') return null
  if (typeof exp !== 'number' || exp < now) return null

  return { id, type, path, exp }
}

/** Signature header value for a webhook body: `sha256=<hex>`. */
export async function signWebhookBody(body: string, secret: string): Promise<string> {
  return `sha256=${toHex(await hmac(secret, body))}`
}

/** Check a webhook's `X-StrataWP-Signature` header against its raw body. */
export async function verifyWebhookSignature(
  body: string,
  signature: string | null | undefined,
  secret: string
): Promise<boolean> {
  if (!secret || !signature) return false
  return timingSafeEqual(await signWebhookBody(body, secret), signature)
}

/**
 * A same-site path that is safe to redirect to: starts with one `/`, no
 * scheme, host or backslash, so a token can never send the browser off-site.
 */
export function isSafeRedirectPath(path: string): boolean {
  return /^\/(?![/\\])/.test(path) && !/[\\\s]/.test(path)
}
