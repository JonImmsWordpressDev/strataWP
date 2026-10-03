import path from 'node:path'
import { describe, it, expect } from 'vitest'
import stylelint from 'stylelint'
import config, { thresholds } from '../index.js'

const base = process.cwd()

async function lint(code, file = 'x.css') {
  const result = await stylelint.lint({
    code,
    codeFilename: path.join(base, file),
    config,
    configBasedir: base,
  })
  return result.results[0].warnings
}

const rulesOf = (warnings) => warnings.map((w) => w.rule)

describe('thresholds', () => {
  it('exposes the documented defaults', () => {
    expect(thresholds).toEqual({ maxNestingDepth: 3, maxSpecificity: '0,3,1' })
  })
})

describe('max-nesting-depth', () => {
  it('passes at the limit', async () => {
    const code = '.a { .b { .c { .d { color: red; } } } }'
    expect(rulesOf(await lint(code, 'ok.scss'))).not.toContain('max-nesting-depth')
  })

  it('fails past the limit', async () => {
    const code = '.a { .b { .c { .d { .e { color: red; } } } } }'
    expect(rulesOf(await lint(code, 'bad.scss'))).toContain('max-nesting-depth')
  })

  it('does not count pseudo-class nesting against the limit', async () => {
    const code = '.a { .b { .c { .d { &:hover { color: red; } } } } }'
    expect(rulesOf(await lint(code, 'pseudo.scss'))).not.toContain('max-nesting-depth')
  })

  it.each([
    { name: '@media', rule: '@media (min-width: 1px)' },
    { name: '@supports', rule: '@supports (display: grid)' },
    { name: '@container', rule: '@container (min-width: 1px)' },
    { name: '@include', rule: '@include m' },
  ])('does not count $name nesting against the limit', async ({ rule }) => {
    // Mixin definition comes first, then the test code with @include at 4th level
    const mixin = '@mixin m { color: red; }'
    const code = `.a { .b { .c { .d { ${rule} { color: red; } } } } }`
    const fullCode = rule === '@include m' ? `${mixin}\n${code}` : code
    expect(rulesOf(await lint(fullCode, 'x.scss'))).not.toContain('max-nesting-depth')
  })
})

describe('selector-max-specificity', () => {
  it('passes at the cap', async () => {
    expect(rulesOf(await lint('.a .b .c { color: red; }'))).not.toContain('selector-max-specificity')
  })

  it('fails above the cap', async () => {
    const warnings = await lint('.a .b .c .d { color: red; }')
    expect(rulesOf(warnings)).toContain('selector-max-specificity')
  })

  it('fails on an id selector', async () => {
    expect(rulesOf(await lint('#main { color: red; }'))).toContain('selector-max-specificity')
  })

  it('passes with type selector at the limit', async () => {
    expect(rulesOf(await lint('.a .b .c div { color: red; }'))).not.toContain('selector-max-specificity')
  })

  it('fails with type selector above the cap', async () => {
    const warnings = await lint('.a .b .c div span { color: red; }')
    expect(rulesOf(warnings)).toContain('selector-max-specificity')
  })
})

describe('selector-max-specificity WooCommerce exception', () => {
  // 0,5,2: five classes, two types (matches `.woocommerce table.cart .actions .coupon input[type="text"]`)
  const atMax = '.a .b .c .d .e f g { color: red; }'
  const aboveMax = '.a .b .c .d .e f g h { color: red; }'

  it('allows the measured maximum in a WooCommerce override file', async () => {
    expect(rulesOf(await lint(atMax, '_woocommerce.scss'))).not.toContain('selector-max-specificity')
  })

  it('fails one step above the maximum in a WooCommerce override file', async () => {
    expect(rulesOf(await lint(aboveMax, '_woocommerce.scss'))).toContain('selector-max-specificity')
  })

  it('still enforces the default cap in other files', async () => {
    expect(rulesOf(await lint(atMax, '_forms.scss'))).toContain('selector-max-specificity')
  })
})

describe('custom-property-pattern', () => {
  it('accepts project and WordPress-generated names', async () => {
    const code = ':root { --spacing-md: 1rem; --wp--preset--color--primary: #000; }'
    expect(rulesOf(await lint(code))).not.toContain('custom-property-pattern')
  })

  it('rejects camelCase and underscores', async () => {
    expect(rulesOf(await lint(':root { --Bad_Name: 1; }'))).toContain('custom-property-pattern')
  })
})

describe('scss support', () => {
  it('parses // comments, @use, @include and & without crashing', async () => {
    const code = [
      '@use "sass:math";',
      '// a line comment',
      '@mixin m { color: red; }',
      '.a { @include m; &__b { margin: 0; } }',
    ].join('\n')
    const warnings = await lint(code, 'syntax.scss')
    expect(warnings.filter((w) => w.rule === 'CssSyntaxError')).toEqual([])
  })
})
