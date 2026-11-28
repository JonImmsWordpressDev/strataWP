import { describe, expect, it } from 'vitest'
import {
  isSafeRedirectPath,
  signPreviewToken,
  signWebhookBody,
  timingSafeEqual,
  verifyPreviewToken,
  verifyWebhookSignature,
} from '../signing.js'
import { verifyPreviewSecret } from '../preview.js'

const SECRET = 'test-secret'

// Same vector as packages/core/tests/Unit/HeadlessTest.php, so a token signed
// by WordPress verifies here.
const VECTOR_CLAIMS = { id: 42, type: 'post', path: '/hello-world/', exp: 2000000000 }
const VECTOR_TOKEN =
  'eyJpZCI6NDIsInR5cGUiOiJwb3N0IiwicGF0aCI6Ii9oZWxsby13b3JsZC8iLCJleHAiOjIwMDAwMDAwMDB9.AyThuIdOtG2wF6uzsGd6H2uqSQa8fSIvEJ3Gxqw2gig'

describe('preview tokens', () => {
  it('matches the WordPress-side vector', async () => {
    expect(await signPreviewToken(VECTOR_CLAIMS, SECRET)).toBe(VECTOR_TOKEN)
    expect(await verifyPreviewToken(VECTOR_TOKEN, SECRET, 1)).toEqual(VECTOR_CLAIMS)
  })

  it('verifies a token WordPress signed with escaped slashes', async () => {
    // wp_json_encode() escapes "/" by default; the signature covers the
    // encoded part as sent, so the JSON spelling does not matter.
    const payload = Buffer.from(
      '{"id":7,"type":"page","path":"\\/about\\/","exp":2000000000}'
    ).toString('base64url')
    const { createHmac } = await import('node:crypto')
    const token = `${payload}.${createHmac('sha256', SECRET).update(payload).digest('base64url')}`
    expect(await verifyPreviewToken(token, SECRET, 1)).toEqual({
      id: 7,
      type: 'page',
      path: '/about/',
      exp: 2000000000,
    })
  })

  it('rejects expired, tampered, wrong-secret and malformed tokens', async () => {
    const token = await signPreviewToken({ ...VECTOR_CLAIMS, exp: 1000 }, SECRET)
    expect(await verifyPreviewToken(token, SECRET, 999)).not.toBeNull()
    expect(await verifyPreviewToken(token, SECRET, 1001)).toBeNull()
    expect(await verifyPreviewToken(token, 'other', 999)).toBeNull()
    expect(await verifyPreviewToken(token, '', 999)).toBeNull()
    expect(await verifyPreviewToken(`${token}x`, SECRET, 999)).toBeNull()
    expect(await verifyPreviewToken('nodot', SECRET, 999)).toBeNull()
    expect(await verifyPreviewToken('', SECRET, 999)).toBeNull()
  })
})

describe('webhook signatures', () => {
  it('matches a Node HMAC of the raw body', async () => {
    const body = '{"event":"update","id":1}'
    const { createHmac } = await import('node:crypto')
    const expected = `sha256=${createHmac('sha256', SECRET).update(body).digest('hex')}`
    expect(await signWebhookBody(body, SECRET)).toBe(expected)
    expect(await verifyWebhookSignature(body, expected, SECRET)).toBe(true)
  })

  it('rejects a changed body, a missing header or an empty secret', async () => {
    const signature = await signWebhookBody('{"id":1}', SECRET)
    expect(await verifyWebhookSignature('{"id":2}', signature, SECRET)).toBe(false)
    expect(await verifyWebhookSignature('{"id":1}', null, SECRET)).toBe(false)
    expect(await verifyWebhookSignature('{"id":1}', signature, '')).toBe(false)
  })
})

describe('helpers', () => {
  it('timingSafeEqual compares whole strings', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true)
    expect(timingSafeEqual('abc', 'abd')).toBe(false)
    expect(timingSafeEqual('abc', 'ab')).toBe(false)
    expect(timingSafeEqual('', 'a')).toBe(false)
  })

  it('verifyPreviewSecret never matches an empty configured secret', () => {
    expect(verifyPreviewSecret('s', 's')).toBe(true)
    expect(verifyPreviewSecret('s', 't')).toBe(false)
    expect(verifyPreviewSecret('', '')).toBe(false)
  })

  it('isSafeRedirectPath allows only same-site paths', () => {
    expect(isSafeRedirectPath('/hello-world/')).toBe(true)
    expect(isSafeRedirectPath('/?p=9')).toBe(true)
    expect(isSafeRedirectPath('//evil.example.com')).toBe(false)
    expect(isSafeRedirectPath('/\\evil.example.com')).toBe(false)
    expect(isSafeRedirectPath('https://evil.example.com')).toBe(false)
    expect(isSafeRedirectPath('relative')).toBe(false)
  })
})
