import { describe, it, expect } from 'vitest'
import { generateBlockAttributeTypes, generateBlockTypesBundle } from '../block-types'

describe('generateBlockTypesBundle', () => {
  it('emits every interface and a map keyed by block name, sorted', () => {
    const out = generateBlockTypesBundle([
      {
        name: 'strata-basic/hero',
        attributes: { title: { type: 'string', default: 'Hi' }, url: { type: 'string' } },
      },
      { name: 'strata-basic/feature-card', attributes: { count: { type: 'integer' } } },
    ])

    expect(out).toContain(
      '/** strata-basic/feature-card */\nexport interface FeatureCardAttributes {\n  count?: number\n}\n'
    )
    expect(out).toContain(
      '/** strata-basic/hero */\nexport interface HeroAttributes {\n  title: string\n  url?: string\n}\n'
    )
    expect(out).toContain(
      "export interface BlockAttributesMap {\n  'strata-basic/feature-card': FeatureCardAttributes\n  'strata-basic/hero': HeroAttributes\n}\n"
    )
    expect(out.indexOf('FeatureCardAttributes {')).toBeLessThan(out.indexOf('HeroAttributes {'))
  })

  it('adds the namespace when two blocks share a slug', () => {
    const out = generateBlockTypesBundle([{ name: 'acme/hero' }, { name: 'other-ns/hero' }])
    expect(out).toContain('export interface AcmeHeroAttributes {}')
    expect(out).toContain('export interface OtherNsHeroAttributes {}')
    expect(out).toContain(
      "  'acme/hero': AcmeHeroAttributes\n  'other-ns/hero': OtherNsHeroAttributes\n"
    )
  })

  it('keeps the per-block file unchanged', () => {
    const { content } = generateBlockAttributeTypes({
      name: 'strata-basic/hero',
      attributes: { title: { type: 'string', default: 'Hi' } },
    })
    expect(content).toContain('export interface HeroAttributes {\n  title: string\n}\n')
  })
})
