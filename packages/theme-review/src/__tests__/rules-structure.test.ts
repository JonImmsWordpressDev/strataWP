import { afterEach, describe, expect, it } from 'vitest'
import {
  THEME_001,
  THEME_002,
  THEME_003,
  THEME_004,
  THEME_005,
  THEME_006,
  THEME_007,
  THEME_013,
} from '../rules/structure'
import { cleanupThemes, goodClassicFiles, goodHybridFiles, pngBuffer, without } from './helpers'
import { runRule } from './rule-helpers'

afterEach(cleanupThemes)

const messages = (results: { message: string }[]) => results.map((r) => r.message)

const HEADER = (fields: string[]) => `/*\n${fields.join('\n')}\n*/\n`
const REQUIRED = [
  'Theme Name: X',
  'Version: 1.0.0',
  'License: GPL-2.0-or-later',
  'License URI: https://www.gnu.org/licenses/gpl-2.0.html',
  'Text Domain: x',
]

describe('THEME-001 required style.css headers', () => {
  it('passes on a good theme', () => {
    expect(runRule(THEME_001, goodHybridFiles())).toEqual([])
  })

  it('reports a missing style.css', () => {
    const results = runRule(THEME_001, without(goodHybridFiles(), 'style.css'))
    expect(messages(results)).toEqual(['style.css is missing'])
  })

  it('names each missing required header', () => {
    const files = { ...goodHybridFiles(), 'style.css': HEADER(['Theme Name: X', 'Version: 1']) }
    const out = messages(runRule(THEME_001, files))
    expect(out).toContain('style.css is missing the required header "License"')
    expect(out).toContain('style.css is missing the required header "License URI"')
    expect(out).toContain('style.css is missing the required header "Text Domain"')
    expect(out).toHaveLength(3)
  })

  it('parses Windows line endings and asterisk-prefixed header lines', () => {
    const css = ['/**', ...REQUIRED.map((l) => ` * ${l}`), ' */'].join('\r\n')
    expect(runRule(THEME_001, { ...goodHybridFiles(), 'style.css': css })).toEqual([])
  })

  it('defaults to error severity', () => {
    expect(THEME_001.severity).toBe('error')
  })
})

describe('THEME-002 recommended style.css headers', () => {
  it('passes on a good theme', () => {
    expect(runRule(THEME_002, goodHybridFiles())).toEqual([])
  })

  it('warns once per missing recommended header', () => {
    const files = { ...goodHybridFiles(), 'style.css': HEADER(REQUIRED) }
    const out = messages(runRule(THEME_002, files))
    expect(out).toHaveLength(5)
    expect(out.join('\n')).toContain('"Tested up to"')
    expect(out.join('\n')).toContain('"Requires PHP"')
  })

  it('stays quiet when style.css is missing (THEME-001 reports that)', () => {
    expect(runRule(THEME_002, without(goodHybridFiles(), 'style.css'))).toEqual([])
  })
})

describe('THEME-003 screenshot', () => {
  it('passes for a 1200x900 PNG', () => {
    expect(runRule(THEME_003, goodHybridFiles())).toEqual([])
  })

  it('errors when the screenshot is missing', () => {
    const [finding] = runRule(THEME_003, without(goodHybridFiles(), 'screenshot.png'))
    expect(finding?.severity).toBe('error')
    expect(finding?.message).toBe('screenshot.png is missing')
  })

  it('warns about the wrong size and names the actual size', () => {
    const [finding] = runRule(THEME_003, {
      ...goodHybridFiles(),
      'screenshot.png': pngBuffer(1536, 1024),
    })
    expect(finding?.severity).toBe('warning')
    expect(finding?.message).toContain('1536×1024')
    expect(finding?.message).toContain('1200×900')
  })

  it('warns when the file is not a valid PNG', () => {
    const [finding] = runRule(THEME_003, {
      ...goodHybridFiles(),
      'screenshot.png': Buffer.from('nope'),
    })
    expect(finding?.severity).toBe('warning')
    expect(finding?.message).toContain('not a valid PNG')
  })
})

describe('THEME-004 index.php', () => {
  it('passes when index.php exists', () => {
    expect(runRule(THEME_004, goodClassicFiles())).toEqual([])
  })

  it('errors when a classic theme has no index.php', () => {
    const results = runRule(THEME_004, without(goodClassicFiles(), 'index.php'))
    expect(messages(results)).toEqual(['index.php is missing'])
  })

  it('does not apply to block themes', () => {
    expect(THEME_004.appliesTo).not.toContain('block')
  })
})

describe('THEME-005 readme.txt', () => {
  it('passes when readme.txt exists', () => {
    expect(runRule(THEME_005, goodHybridFiles())).toEqual([])
  })

  it('warns when readme.txt is missing', () => {
    expect(THEME_005.severity).toBe('warning')
    expect(messages(runRule(THEME_005, without(goodHybridFiles(), 'readme.txt')))).toEqual([
      'readme.txt is missing',
    ])
  })
})

describe('THEME-006 block theme essentials', () => {
  it('passes on a good hybrid theme', () => {
    expect(runRule(THEME_006, goodHybridFiles())).toEqual([])
  })

  it('errors when templates/index.html is missing', () => {
    const files = {
      ...without(goodHybridFiles(), 'templates/index.html'),
      'templates/page.html': '<!-- -->',
    }
    expect(messages(runRule(THEME_006, files))).toEqual(['templates/index.html is missing'])
  })

  it('errors when theme.json is missing', () => {
    expect(messages(runRule(THEME_006, without(goodHybridFiles(), 'theme.json')))).toEqual([
      'theme.json is missing',
    ])
  })

  it('errors when theme.json is not valid JSON', () => {
    const out = messages(runRule(THEME_006, { ...goodHybridFiles(), 'theme.json': '{nope' }))
    expect(out).toEqual(['theme.json is not valid JSON'])
  })

  it('errors when theme.json lacks $schema or version', () => {
    const out = messages(runRule(THEME_006, { ...goodHybridFiles(), 'theme.json': '{}' }))
    expect(out).toContain('theme.json is missing "$schema"')
    expect(out).toContain('theme.json is missing "version"')
  })

  it.each([['null'], ['[]'], ['"text"'], ['42'], ['true']])(
    'errors without throwing when theme.json is %s',
    (raw) => {
      const files = { ...goodHybridFiles(), 'theme.json': raw }
      expect(messages(runRule(THEME_006, files))).toEqual(['theme.json must be a JSON object'])
    }
  )

  it('counts version 0 as present', () => {
    const files = {
      ...goodHybridFiles(),
      'theme.json': JSON.stringify({ $schema: 'x', version: 0 }),
    }
    expect(runRule(THEME_006, files)).toEqual([])
  })

  it('does not apply to classic themes', () => {
    expect(THEME_006.appliesTo).not.toContain('classic')
  })
})

describe('THEME-007 patterns', () => {
  const pattern = (header: string[]) =>
    `<?php\n/**\n${header.map((l) => ` * ${l}`).join('\n')}\n */\n?>\n<p>x</p>\n`

  it('passes on a good pattern', () => {
    expect(runRule(THEME_007, goodHybridFiles())).toEqual([])
  })

  it('warns when Title or Slug is missing', () => {
    const files = { ...goodHybridFiles(), 'patterns/a.php': pattern(['Categories: featured']) }
    const out = messages(runRule(THEME_007, files))
    expect(out).toContain('patterns/a.php is missing a "Title:" header')
    expect(out).toContain('patterns/a.php is missing a "Slug:" header')
  })

  it("warns when the slug namespace is not the theme's text domain", () => {
    const files = {
      ...goodHybridFiles(),
      'patterns/a.php': pattern(['Title: A', 'Slug: other/a']),
    }
    const out = messages(runRule(THEME_007, files))
    expect(out).toEqual([
      'patterns/a.php: slug namespace "other" does not match the text domain "fixture-theme"',
    ])
  })

  it('warns when the slug has no namespace', () => {
    const files = {
      ...goodHybridFiles(),
      'patterns/a.php': pattern(['Title: A', 'Slug: plain']),
    }
    expect(messages(runRule(THEME_007, files))).toEqual([
      'patterns/a.php: slug "plain" should be namespaced like "fixture-theme/name"',
    ])
  })

  it('finds the header after a preceding license comment', () => {
    const body = `<?php\n/**\n * Copyright notice, all rights reserved.\n */\n/**\n * Title: A\n * Slug: fixture-theme/a\n */\n?>\n<p>x</p>\n`
    expect(runRule(THEME_007, { ...goodHybridFiles(), 'patterns/a.php': body })).toEqual([])
  })

  it('finds Title and Slug when a long Description pushes the comment end past 4096 chars', () => {
    const body = pattern(['Title: A', 'Slug: fixture-theme/a', `Description: ${'x'.repeat(5000)}`])
    expect(runRule(THEME_007, { ...goodHybridFiles(), 'patterns/a.php': body })).toEqual([])
  })

  it('finds Title and Slug in a header cut off by the 8192 character limit', () => {
    const body = pattern(['Title: A', 'Slug: fixture-theme/a', `Description: ${'x'.repeat(9000)}`])
    expect(runRule(THEME_007, { ...goodHybridFiles(), 'patterns/a.php': body })).toEqual([])
  })

  it('ignores patterns in subfolders', () => {
    const files = { ...goodHybridFiles(), 'patterns/sub/a.php': '<?php // nothing' }
    expect(runRule(THEME_007, files)).toEqual([])
  })
})

describe('THEME-013 wp_head and wp_footer', () => {
  it('passes when templates call both', () => {
    expect(runRule(THEME_013, goodHybridFiles())).toEqual([])
  })

  it('errors when nothing calls wp_head()', () => {
    const files = { ...goodHybridFiles(), 'header.php': '<html><head></head><body>' }
    expect(messages(runRule(THEME_013, files))).toEqual([
      'No template calls wp_head(); add it to header.php',
    ])
  })

  it('errors when nothing calls wp_footer()', () => {
    const files = { ...goodHybridFiles(), 'footer.php': '</body></html>' }
    expect(messages(runRule(THEME_013, files))).toEqual([
      'No template calls wp_footer(); add it to footer.php',
    ])
  })

  it('does not count commented-out calls', () => {
    const files = { ...goodHybridFiles(), 'header.php': '<?php // wp_head(); ?><html>' }
    expect(messages(runRule(THEME_013, files))).toEqual([
      'No template calls wp_head(); add it to header.php',
    ])
  })

  it('does not apply to block themes', () => {
    expect(THEME_013.appliesTo).not.toContain('block')
  })
})
