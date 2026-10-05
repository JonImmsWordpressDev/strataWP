import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

/**
 * Runs a template's scripts/ai-setup.mjs in a temp theme with a stub
 * @stratawp/theme-review, to check it records the theme type in agent-state.md.
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE = join(__dirname, '..', 'templates', 'basic-theme')
const dirs: string[] = []

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function makeTheme({ withReview }: { withReview: boolean }): string {
  const dir = mkdtempSync(join(tmpdir(), 'sw-aisetup-'))
  dirs.push(dir)
  mkdirSync(join(dir, 'scripts'))
  mkdirSync(join(dir, '.ai'))
  cpSync(join(TEMPLATE, 'scripts', 'ai-setup.mjs'), join(dir, 'scripts', 'ai-setup.mjs'))
  cpSync(join(TEMPLATE, '.ai', 'agent-state.md'), join(dir, '.ai', 'agent-state.md'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 't', type: 'module' }))

  if (withReview) {
    const pkg = join(dir, 'node_modules', '@stratawp', 'theme-review')
    mkdirSync(pkg, { recursive: true })
    writeFileSync(
      join(pkg, 'package.json'),
      JSON.stringify({
        name: '@stratawp/theme-review',
        type: 'module',
        main: 'index.js',
        exports: './index.js',
      })
    )
    writeFileSync(
      join(pkg, 'index.js'),
      "export function detectTheme() { return { themeType: 'hybrid', typeSource: 'detected' } }\n"
    )
  }
  return dir
}

const run = (dir: string, ...args: string[]) =>
  execFileSync(process.execPath, [join(dir, 'scripts', 'ai-setup.mjs'), ...args], {
    cwd: dir,
    encoding: 'utf8',
  })

const state = (dir: string) => readFileSync(join(dir, '.ai', 'agent-state.md'), 'utf8')

describe('template ai-setup theme-type recording', () => {
  it('records the detected theme type in agent-state.md', () => {
    const dir = makeTheme({ withReview: true })
    const output = run(dir, '--agents=claude')
    expect(output).toContain('Theme type: hybrid (detected)')
    expect(state(dir)).toContain('- **Theme type**: hybrid (detected)')
  })

  it('places the line in the Onboarding Status list, after Last Updated', () => {
    const dir = makeTheme({ withReview: true })
    run(dir, '--agents=claude')
    const lines = state(dir).split('\n')
    const updated = lines.findIndex((l) => l.startsWith('- **Last Updated**'))
    expect(lines[updated + 1]).toBe('- **Theme type**: hybrid (detected)')
  })

  it('is idempotent: running twice leaves exactly one Theme type line', () => {
    const dir = makeTheme({ withReview: true })
    run(dir, '--agents=claude')
    run(dir, '--agents=claude', '--force')
    expect(state(dir).match(/\*\*Theme type\*\*/g)).toHaveLength(1)
  })

  it('does not overwrite an existing CLAUDE.md without --force', () => {
    const dir = makeTheme({ withReview: true })
    writeFileSync(join(dir, 'CLAUDE.md'), 'my own notes\n')
    run(dir, '--agents=claude')
    expect(readFileSync(join(dir, 'CLAUDE.md'), 'utf8')).toBe('my own notes\n')
  })

  it('degrades gracefully when @stratawp/theme-review is not installed', () => {
    const dir = makeTheme({ withReview: false })
    const before = state(dir)
    const output = run(dir, '--agents=claude')
    expect(output).toContain('@stratawp/theme-review is not installed')
    expect(state(dir)).toBe(before)
  })
})
