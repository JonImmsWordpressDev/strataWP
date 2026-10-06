import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import stylelint from 'stylelint'
import stylelintConfig from '@stratawp/stylelint-config'
import { customizeTheme, type ThemeConfig } from '../customize-theme.js'
import { SKIP_DIRS } from '../utils/theme-tokens.js'

/**
 * End-to-end regression test for issue #31: a scaffolded theme must use the
 * user's slug as its only text domain / namespace token. Runs customizeTheme
 * against a real copy of the bundled basic-theme template, exactly as the
 * create-stratawp flow does.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const templatePath = path.join(__dirname, '..', '..', 'templates', 'basic-theme')

async function collectFilesContaining(dir: string, tokens: string[]): Promise<string[]> {
  const offenders: string[] = []
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        offenders.push(...(await collectFilesContaining(fullPath, tokens)))
      }
    } else if (entry.name !== 'screenshot.png') {
      const content = await fs.readFile(fullPath, 'utf-8')
      for (const token of tokens) {
        if (content.includes(token)) {
          offenders.push(`${fullPath}: ${token}`)
        }
      }
    }
  }
  return offenders
}

describe('customizeTheme', () => {
  let themePath: string

  const config: ThemeConfig = {
    name: 'Issue 31 Theme',
    slug: 'issue31-theme',
    description: 'Regression test theme',
    author: 'Test',
    template: 'basic',
    cssFramework: 'unocss',
    typescript: true,
    testing: false,
  }

  beforeAll(async () => {
    const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'stratawp-create-'))
    themePath = path.join(parent, config.slug)
    await fs.copy(templatePath, themePath, {
      filter: (src) => !src.split(path.sep).some((part) => SKIP_DIRS.has(part)),
    })
    await customizeTheme(themePath, config)
  })

  afterAll(async () => {
    await fs.remove(path.dirname(themePath))
  })

  it('stamps the slug as the Text Domain in style.css', async () => {
    const styleCss = await fs.readFile(path.join(themePath, 'style.css'), 'utf-8')
    expect(styleCss).toMatch(/^Text Domain: issue31-theme$/m)
  })

  it('uses the slug in functions.php i18n calls', async () => {
    const functionsPhp = await fs.readFile(path.join(themePath, 'functions.php'), 'utf-8')
    expect(functionsPhp).toContain("'issue31-theme'")
  })

  it('leaves no template token anywhere in the scaffolded theme', async () => {
    const offenders = await collectFilesContaining(themePath, ['strata-basic', 'strata_basic'])
    expect(offenders).toEqual([])
  })

  it('namespaces the bundled block under the slug', async () => {
    const blockJson = await fs.readJson(path.join(themePath, 'src/blocks/hero/block.json'))
    expect(blockJson.name).toBe('issue31-theme/hero')
  })

  describe('quality gate dependencies', () => {
    const GATE_PACKAGES = [
      '@stratawp/vite-plugin',
      '@stratawp/stylelint-config',
      '@stratawp/testing',
      '@stratawp/theme-review',
    ]

    it.each(GATE_PACKAGES)('pins %s from templateDependencies', async (name) => {
      const cliPkg = await fs.readJson(path.join(__dirname, '..', '..', 'package.json'))
      const pkg = await fs.readJson(path.join(themePath, 'package.json'))
      // A missing templateDependencies key silently falls back to 'latest'.
      expect(cliPkg.templateDependencies[name]).toBeTruthy()
      expect(pkg.devDependencies[name]).toBe(cliPkg.templateDependencies[name])
      expect(pkg.devDependencies[name]).not.toMatch(/^workspace:/)
      expect(pkg.devDependencies[name]).not.toBe('latest')
    })

    it('scaffolded themes run the theme review cleanly (zero errors)', async () => {
      const { reviewTheme } = await import('@stratawp/theme-review')
      const report = reviewTheme(themePath)
      expect(report.summary.errors).toBe(0)
      // The CLI templates are classified hybrid (block theme plus PHP includes).
      expect(report.themeType).toBe('hybrid')
      expect(report.typeSource).toBe('detected')

      // Negative control on a copy: the rules must demonstrably run on a
      // scaffolded directory, so removing readme.txt has to surface a finding.
      const copy = path.join(path.dirname(themePath), 'review-control')
      await fs.copy(themePath, copy, {
        filter: (src) => !src.split(path.sep).some((part) => SKIP_DIRS.has(part)),
      })
      await fs.remove(path.join(copy, 'readme.txt'))
      const control = reviewTheme(copy)
      expect(control.findings.map((f) => f.message)).toContain('readme.txt is missing')
    })
  })

  it('scaffolds CSS that passes the shipped Stylelint preset', async () => {
    const result = await stylelint.lint({
      files: path.join(themePath, 'src/**/*.{css,scss}'),
      config: stylelintConfig,
      configBasedir: themePath,
      ignorePattern: ['**/dist/**', '**/vendor/**', '**/node_modules/**'],
    })
    expect(result.results.length).toBeGreaterThan(0)
    const problems = result.results.flatMap((r) =>
      r.warnings.map((w) => `${path.relative(themePath, r.source ?? '')}: ${w.rule}`)
    )
    expect(problems).toEqual([])
  })
})

describe.each(['basic', 'advanced', 'store'] as const)(
  'customizeTheme readme.txt (%s)',
  (template) => {
    let parent: string
    let themePath: string

    const config: ThemeConfig = {
      name: 'Acme Studio Theme',
      slug: 'acme-studio',
      description: 'A custom description for the readme test',
      author: 'Ada Lovelace',
      template,
      cssFramework: 'vanilla',
      typescript: true,
      testing: false,
    }

    beforeAll(async () => {
      parent = await fs.mkdtemp(path.join(os.tmpdir(), 'stratawp-readme-'))
      themePath = path.join(parent, config.slug)
      await fs.copy(path.join(__dirname, '..', '..', 'templates', `${template}-theme`), themePath, {
        filter: (src) => !src.split(path.sep).some((part) => SKIP_DIRS.has(part)),
      })
      await customizeTheme(themePath, config)
    })

    afterAll(async () => {
      await fs.remove(parent)
    })

    it('rewrites the title, description, contributors and copyright name', async () => {
      const readme = await fs.readFile(path.join(themePath, 'readme.txt'), 'utf-8')
      expect(readme).toMatch(/^=== Acme Studio Theme ===$/m)
      expect(readme).toMatch(/^Contributors: adalovelace$/m)
      expect(readme).toMatch(/^Tags:.*\n\nA custom description for the readme test\n/m)
      expect(readme).toMatch(/^Acme Studio Theme is distributed under the terms/m)
    })

    it('leaves the compatibility and license headers equal to style.css', async () => {
      const readme = await fs.readFile(path.join(themePath, 'readme.txt'), 'utf-8')
      const style = await fs.readFile(path.join(themePath, 'style.css'), 'utf-8')
      for (const field of [
        'Requires at least',
        'Tested up to',
        'Requires PHP',
        'License',
        'License URI',
      ]) {
        const value = style.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'))?.[1]?.trim()
        expect(value).toBeTruthy()
        expect(readme).toContain(`\n${field}: ${value}\n`)
      }
    })
  }
)

describe('customizeTheme without a readme.txt', () => {
  it('does not fail on templates that lack one', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'stratawp-noreadme-'))
    try {
      await fs.writeFile(path.join(dir, 'style.css'), '/*\nTheme Name: X\n*/\n')
      await expect(
        customizeTheme(dir, {
          name: 'Y',
          slug: 'y',
          description: 'd',
          author: 'a',
          template: 'minimal',
          cssFramework: 'vanilla',
          typescript: true,
          testing: false,
        })
      ).resolves.toBeUndefined()
    } finally {
      await fs.remove(dir)
    }
  })
})

describe.each(['basic', 'advanced', 'store'] as const)(
  'customizeTheme special characters (%s)',
  (template) => {
    const config: ThemeConfig = {
      name: 'Acme & Sons (Pty) Ltd.',
      slug: 'acme-sons',
      description: 'Costs $& more, $1 and \'quotes\' "dq" $$',
      author: 'Zoë Ünal-Smith',
      template,
      cssFramework: 'vanilla',
      typescript: true,
      testing: false,
    }
    let parent: string
    let themePath: string

    beforeAll(async () => {
      parent = await fs.mkdtemp(path.join(os.tmpdir(), 'stratawp-special-'))
      themePath = path.join(parent, config.slug)
      await fs.copy(path.join(__dirname, '..', '..', 'templates', `${template}-theme`), themePath, {
        filter: (src) => !src.split(path.sep).some((part) => SKIP_DIRS.has(part)),
      })
      await customizeTheme(themePath, config)
    })

    afterAll(async () => {
      await fs.remove(parent)
    })

    it('writes name, description and author verbatim to style.css and readme.txt', async () => {
      const style = await fs.readFile(path.join(themePath, 'style.css'), 'utf-8')
      const readme = await fs.readFile(path.join(themePath, 'readme.txt'), 'utf-8')
      expect(style).toContain(`\nTheme Name: ${config.name}\n`)
      expect(style).toContain(`\nDescription: ${config.description}\n`)
      expect(style).toContain(`\nAuthor: ${config.author}\n`)
      expect(readme).toContain(`=== ${config.name} ===`)
      expect(readme).toContain(`\n\n${config.description}\n`)
      expect(readme).toContain(`\n${config.name} is distributed under`)
      // The non-ASCII characters drop out of the slug rather than leaking in.
      expect(readme).toMatch(/^Contributors: zonal-smith$/m)
    })
  }
)
