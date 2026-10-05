// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { planShots, routeSlug } from '../screenshots/naming'

describe('routeSlug', () => {
  it.each([
    ['/', 'home'],
    ['/blog/Hello-World/', 'blog-hello-world'],
    ['/?s=a', 's-a'],
    ['/this-page-does-not-exist-404/', 'this-page-does-not-exist-404'],
    ['/%%%', 'home'],
  ])('%s -> %s', (route, slug) => {
    expect(routeSlug(route)).toBe(slug)
  })

  it('caps the length and never ends with a dash', () => {
    const slug = routeSlug('/' + 'a-'.repeat(80))
    expect(slug.length).toBeLessThanOrEqual(60)
    expect(slug.endsWith('-')).toBe(false)
  })
})

describe('planShots', () => {
  it('plans route-major, one shot per width, named slug-width.png', () => {
    expect(planShots(['/', '/blog'], [1280, 390]).map((shot) => shot.name)).toEqual([
      'home-1280.png',
      'home-390.png',
      'blog-1280.png',
      'blog-390.png',
    ])
  })

  it('never lets two routes share a filename', () => {
    const names = planShots(['/a-b', '/a/b', '/', '/%%%'], [1280, 390]).map((shot) => shot.name)
    expect(new Set(names).size).toBe(names.length)
    expect(names).toContain('a-b-1280.png')
    expect(names).toContain('a-b-2-1280.png')
  })

  it('carries the original route and width on each planned shot', () => {
    expect(planShots(['/x'], [390])).toEqual([{ route: '/x', width: 390, name: 'x-390.png' }])
  })
})
