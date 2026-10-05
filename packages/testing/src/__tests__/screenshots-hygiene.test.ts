// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const src = fileURLToPath(new URL('..', import.meta.url))
const files = [
  join(src, 'screenshots.ts'),
  join(src, 'screenshots-cli.ts'),
  ...readdirSync(join(src, 'screenshots')).map((name) => join(src, 'screenshots', name)),
]

describe('screenshots entry points', () => {
  it.each(files)('%s has no static import of @playwright/test', (file) => {
    const source = readFileSync(file, 'utf8')
    const staticImport = /^\s*(?:import|export)\s(?!type\b)[^;]*from\s+['"]@playwright\/test['"]/m
    expect(source).not.toMatch(staticImport)
  })

  it('loads Playwright only through a dynamic import in capture.ts', () => {
    const source = readFileSync(join(src, 'screenshots', 'capture.ts'), 'utf8')
    expect(source).toMatch(/await import\('@playwright\/test'\)/)
  })
})
