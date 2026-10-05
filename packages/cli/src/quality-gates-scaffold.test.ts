import { describe, it, expect } from 'vitest'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import stylelint from 'stylelint'
import config from '@stratawp/stylelint-config'

/**
 * Every bundled template must ship the quality gates, and its own CSS must
 * pass the preset it ships with, so a fresh theme starts green.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const templatesDir = path.join(__dirname, '..', 'templates')
const TEMPLATES = ['basic-theme', 'advanced-theme', 'store-theme']

const REQUIRED_FILES = [
  'stylelint.config.js',
  '.stylelintignore',
  'playwright.smoke.config.ts',
  'e2e/smoke/layout.spec.ts',
  'playwright.visual.config.ts',
  'e2e/visual/layout.visual.spec.ts',
]

describe.each(TEMPLATES)('%s quality gates', (templateName) => {
  const templatePath = path.join(templatesDir, templateName)

  it.each(REQUIRED_FILES)('ships %s', (file) => {
    expect(fs.existsSync(path.join(templatePath, file))).toBe(true)
  })

  it('ships the same visual spec and config as the example theme', () => {
    const exampleDir = path.join(__dirname, '..', '..', '..', 'examples', 'basic-theme')
    for (const file of ['playwright.visual.config.ts', 'e2e/visual/layout.visual.spec.ts']) {
      expect(fs.readFileSync(path.join(templatePath, file), 'utf8')).toBe(
        fs.readFileSync(path.join(exampleDir, file), 'utf8')
      )
    }
  })

  it('wires lint:css and test:e2e and declares the gate dependencies', () => {
    const pkg = fs.readJsonSync(path.join(templatePath, 'package.json'))
    expect(pkg.scripts['lint:css']).toBe('stylelint "src/**/*.{css,scss}"')
    expect(pkg.scripts['test:e2e']).toBe('playwright test --config playwright.smoke.config.ts')
    expect(pkg.scripts['test:visual']).toBe('playwright test --config playwright.visual.config.ts')
    expect(pkg.devDependencies['@stratawp/stylelint-config']).toBeTruthy()
    expect(pkg.scripts['review']).toBe('stratawp-review')
    expect(pkg.scripts['ai:check']).toBe('pnpm build && pnpm review')
    expect(pkg.devDependencies['@stratawp/theme-review']).toBeTruthy()
    expect(pkg.devDependencies['@stratawp/testing']).toBeTruthy()
    expect(pkg.devDependencies['@playwright/test']).toBeTruthy()
    expect(pkg.devDependencies['stylelint']).toBeTruthy()
  })

  it("passes the shipped Stylelint preset on the template's own CSS", async () => {
    const result = await stylelint.lint({
      files: path.join(templatePath, 'src/**/*.{css,scss}'),
      config,
      configBasedir: templatePath,
      ignorePattern: ['**/dist/**', '**/vendor/**', '**/node_modules/**'],
    })
    expect(result.results.length).toBeGreaterThan(0)
    const problems = result.results.flatMap((r) =>
      r.warnings.map((w) => `${path.relative(templatePath, r.source ?? '')}: ${w.rule}`)
    )
    expect(problems).toEqual([])
  })
})
