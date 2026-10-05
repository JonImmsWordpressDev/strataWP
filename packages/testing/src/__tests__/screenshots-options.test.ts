// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  DEFAULT_BASE_URL,
  DEFAULT_ROUTES,
  DEFAULT_WIDTHS,
  ScreenshotOptionsError,
  normalizeBaseUrl,
  parseList,
  parseRoutes,
  parseWidths,
  readScreenshotConfig,
  resolveCaptureOptions,
} from '../screenshots/options'

describe('parseList', () => {
  it('splits on commas, trims, and drops empty parts', () => {
    expect(parseList(' /, /blog ,,/about ')).toEqual(['/', '/blog', '/about'])
  })
})

describe('parseRoutes', () => {
  it('accepts a comma string or an array and dedupes in first-seen order', () => {
    expect(parseRoutes('/,/blog,/')).toEqual(['/', '/blog'])
    expect(parseRoutes(['/a', '/b', '/a'])).toEqual(['/a', '/b'])
  })

  it.each([
    'https://evil.example/x',
    '//evil.example/x',
    'blog',
    '/has space',
    '/' + 'x'.repeat(250),
  ])('rejects %s as not a site path', (route) => {
    expect(() => parseRoutes([route])).toThrow(ScreenshotOptionsError)
    expect(() => parseRoutes([route])).toThrow(/not a site path/)
  })

  it('rejects an empty list and non-string entries, naming the source', () => {
    expect(() => parseRoutes([], 'stratawp.screenshots.routes')).toThrow(
      /stratawp\.screenshots\.routes must be a non-empty list/
    )
    expect(() => parseRoutes([1 as unknown as string])).toThrow(/not a site path/)
    expect(() => parseRoutes(undefined)).toThrow(/non-empty list/)
  })
})

describe('parseWidths', () => {
  it('accepts a comma string or numbers and dedupes', () => {
    expect(parseWidths('1280, 390,1280')).toEqual([1280, 390])
    expect(parseWidths([768, 768, 1024])).toEqual([768, 1024])
  })

  it.each([['abc'], ['12.5'], ['100'], ['5000'], ['-300']])('rejects %s', (value) => {
    expect(() => parseWidths(value)).toThrow(/is not a width between 200 and 3840/)
  })

  it('rejects an empty list', () => {
    expect(() => parseWidths([])).toThrow(/non-empty list/)
  })
})

describe('normalizeBaseUrl', () => {
  it('strips trailing slashes, query and hash but keeps a sub-path install', () => {
    expect(normalizeBaseUrl('http://localhost:8888/')).toBe('http://localhost:8888')
    expect(normalizeBaseUrl('https://example.test/wp/?a=1#x')).toBe('https://example.test/wp')
  })

  it.each(['file:///etc/passwd', 'ftp://host/', 'javascript:alert(1)'])(
    'rejects the non-http scheme in %s',
    (value) => {
      expect(() => normalizeBaseUrl(value)).toThrow(/http:\/\/ or https:\/\//)
    }
  )

  it('rejects credentials and garbage', () => {
    expect(() => normalizeBaseUrl('http://user:pw@localhost:8888')).toThrow(/credentials/)
    expect(() => normalizeBaseUrl('not a url')).toThrow(/not a valid URL/)
  })
})

describe('readScreenshotConfig', () => {
  it('returns nothing when the package has no stratawp.screenshots block', () => {
    expect(readScreenshotConfig(undefined)).toEqual({})
    expect(readScreenshotConfig({})).toEqual({})
    expect(readScreenshotConfig({ stratawp: {} })).toEqual({})
  })

  it('reads and validates routes and widths', () => {
    expect(
      readScreenshotConfig({
        stratawp: { screenshots: { routes: ['/', '/blog'], widths: [1024] } },
      })
    ).toEqual({ routes: ['/', '/blog'], widths: [1024] })
  })

  it.each([
    [{ stratawp: 'x' }, /"stratawp" must be an object/],
    [{ stratawp: { screenshots: [] } }, /"stratawp.screenshots" must be an object/],
    [
      { stratawp: { screenshots: { routes: '/' } } },
      /stratawp\.screenshots\.routes must be an array/,
    ],
    [
      { stratawp: { screenshots: { widths: '1280' } } },
      /stratawp\.screenshots\.widths must be an array/,
    ],
    [{ stratawp: { screenshots: { routes: ['nope'] } } }, /stratawp\.screenshots\.routes: "nope"/],
  ])('rejects a wrong shape: %j', (pkg, message) => {
    expect(() => readScreenshotConfig(pkg)).toThrow(message)
  })
})

describe('resolveCaptureOptions', () => {
  it('falls back to the documented defaults', () => {
    expect(resolveCaptureOptions({}, {})).toEqual({
      baseUrl: DEFAULT_BASE_URL,
      routes: [...DEFAULT_ROUTES],
      widths: [...DEFAULT_WIDTHS],
    })
  })

  it('prefers flags over package.json config, and WP_BASE_URL over the default', () => {
    const config = { routes: ['/from-config'], widths: [1024] }
    expect(resolveCaptureOptions({}, { WP_BASE_URL: 'http://site.test/' }, config)).toEqual({
      baseUrl: 'http://site.test',
      routes: ['/from-config'],
      widths: [1024],
    })
    expect(
      resolveCaptureOptions(
        { baseUrl: 'http://flag.test', routes: '/x', widths: '390' },
        { WP_BASE_URL: 'http://site.test' },
        config
      )
    ).toEqual({ baseUrl: 'http://flag.test', routes: ['/x'], widths: [390] })
  })
})
