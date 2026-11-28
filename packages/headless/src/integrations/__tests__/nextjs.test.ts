import { beforeEach, describe, expect, it, vi } from 'vitest'

const draft = { isEnabled: false, enable: vi.fn(), disable: vi.fn() }
const cache = { revalidatePath: vi.fn(), revalidateTag: vi.fn() }

vi.mock('next/headers.js', () => ({ draftMode: async () => draft }))
vi.mock('next/cache.js', () => cache)

const { createDraftModeRoute, createExitDraftModeRoute, createRevalidateRoute, isPreview } =
  await import('../nextjs.js')
const { signPreviewToken, signWebhookBody } = await import('../../utils/signing.js')

const SECRET = 'test-secret'
const now = () => Math.floor(Date.now() / 1000)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createDraftModeRoute', () => {
  const GET = createDraftModeRoute({ secret: SECRET })

  it('enables draft mode and redirects to the post path', async () => {
    const token = await signPreviewToken(
      { id: 9, type: 'post', path: '/my-draft/', exp: now() + 60 },
      SECRET
    )
    const res = await GET(new Request(`https://front.test/api/draft?token=${token}`))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('/my-draft/')
    expect(draft.enable).toHaveBeenCalledOnce()
  })

  it('rejects a bad token without enabling draft mode', async () => {
    const res = await GET(new Request('https://front.test/api/draft?token=nope'))
    expect(res.status).toBe(401)
    expect(draft.enable).not.toHaveBeenCalled()
  })

  it('refuses an off-site path even with a valid signature', async () => {
    const token = await signPreviewToken(
      { id: 9, type: 'post', path: '//evil.example.com/', exp: now() + 60 },
      SECRET
    )
    const res = await GET(new Request(`https://front.test/api/draft?token=${token}`))
    expect(res.status).toBe(400)
    expect(draft.enable).not.toHaveBeenCalled()
  })

  it('uses resolvePath when given', async () => {
    const route = createDraftModeRoute({ secret: SECRET, resolvePath: (c) => `/preview/${c.id}` })
    const token = await signPreviewToken(
      { id: 3, type: 'page', path: '/', exp: now() + 60 },
      SECRET
    )
    const res = await route(new Request(`https://front.test/api/draft?token=${token}`))
    expect(res.headers.get('location')).toBe('/preview/3')
  })
})

describe('createExitDraftModeRoute', () => {
  it('disables draft mode and only redirects on-site', async () => {
    const GET = createExitDraftModeRoute()
    const res = await GET(new Request('https://front.test/api/exit-draft?path=//evil.example.com'))
    expect(draft.disable).toHaveBeenCalledOnce()
    expect(res.headers.get('location')).toBe('/')
  })
})

describe('createRevalidateRoute', () => {
  const POST = createRevalidateRoute({ secret: SECRET })

  async function webhook(payload: object, secret = SECRET) {
    const body = JSON.stringify(payload)
    return POST(
      new Request('https://front.test/api/revalidate', {
        method: 'POST',
        body,
        headers: { 'X-StrataWP-Signature': await signWebhookBody(body, secret) },
      })
    )
  }

  const payload = { event: 'update', id: 5, type: 'page', slug: 'about', path: '/about/' }

  it('revalidates the path and tags for a signed, fresh webhook', async () => {
    const res = await webhook({ ...payload, timestamp: now() })
    expect(res.status).toBe(200)
    expect(cache.revalidatePath).toHaveBeenCalledWith('/about/')
    expect(cache.revalidateTag).toHaveBeenCalledWith('wp:page')
    expect(cache.revalidateTag).toHaveBeenCalledWith('wp:page:5')
  })

  it('rejects a bad signature and a stale timestamp', async () => {
    expect((await webhook({ ...payload, timestamp: now() }, 'other')).status).toBe(401)
    expect((await webhook({ ...payload, timestamp: now() - 3600 })).status).toBe(401)
    expect(cache.revalidatePath).not.toHaveBeenCalled()
  })

  it('hands the payload to onRevalidate instead of the defaults', async () => {
    const onRevalidate = vi.fn()
    const route = createRevalidateRoute({ secret: SECRET, onRevalidate })
    const body = JSON.stringify({ ...payload, timestamp: now() })
    await route(
      new Request('https://front.test/api/revalidate', {
        method: 'POST',
        body,
        headers: { 'X-StrataWP-Signature': await signWebhookBody(body, SECRET) },
      })
    )
    expect(onRevalidate).toHaveBeenCalledWith(expect.objectContaining({ id: 5, event: 'update' }))
    expect(cache.revalidatePath).not.toHaveBeenCalled()
  })
})

describe('isPreview', () => {
  it('sees the App Router draft-mode cookie as well as the Pages Router one', () => {
    const jar = (name: string) => ({
      get: (n: string) => (n === name ? { value: '1' } : undefined),
    })
    expect(isPreview(jar('__prerender_bypass'))).toBe(true)
    expect(isPreview(jar('__next_preview_data'))).toBe(true)
    expect(isPreview(jar('other'))).toBe(false)
  })
})
