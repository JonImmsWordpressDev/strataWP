import { afterEach, describe, expect, it } from 'vitest'
import { runCli } from '../run'
import { cleanupThemes, goodClassicFiles, goodHybridFiles, makeTheme, without } from './helpers'

afterEach(cleanupThemes)

function run(argv: string[]) {
  const out: string[] = []
  const err: string[] = []
  const code = runCli(argv, { out: (t) => out.push(t), err: (t) => err.push(t) })
  return { code, out: out.join('\n'), err: err.join('\n') }
}

describe('runCli', () => {
  it('prints a text report and exits 0 for a good theme', () => {
    const { code, out } = run([makeTheme(goodHybridFiles())])
    expect(code).toBe(0)
    expect(out).toContain('Theme type: hybrid (detected)')
    expect(out).toContain('No findings.')
    expect(out).toContain('approximates the WordPress.org theme guidelines')
  })

  it('prints JSON with --json', () => {
    const { code, out } = run([makeTheme(goodHybridFiles()), '--json'])
    expect(code).toBe(0)
    const parsed = JSON.parse(out)
    expect(parsed.themeType).toBe('hybrid')
    expect(parsed.findings).toEqual([])
  })

  it('exits 1 when there are errors', () => {
    const { code, out } = run([makeTheme(without(goodHybridFiles(), 'style.css'))])
    expect(code).toBe(1)
    expect(out).toContain('THEME-001')
    expect(out).toContain('style.css is missing')
  })

  it('exits 0 for warnings only, and 1 with --strict', () => {
    const dir = makeTheme(without(goodHybridFiles(), 'readme.txt'))
    expect(run([dir]).code).toBe(0)
    expect(run([dir, '--strict']).code).toBe(1)
  })

  it('accepts --type=… and --type …', () => {
    const dir = makeTheme(goodHybridFiles())
    expect(run([dir, '--type=block', '--json']).out).toContain('"themeType": "block"')
    expect(run([dir, '--type', 'classic', '--json']).out).toContain('"themeType": "classic"')
  })

  it('exits 2 with a clear message for a missing directory', () => {
    const { code, err } = run(['/definitely/not/a/theme'])
    expect(code).toBe(2)
    expect(err).toContain('Theme directory not found')
    expect(err).not.toContain('    at ')
  })

  it('exits 2 for an invalid --type', () => {
    const { code, err } = run([makeTheme(goodHybridFiles()), '--type=headless'])
    expect(code).toBe(2)
    expect(err).toContain('Invalid --type "headless"')
  })

  it('exits 2 for an invalid themeType in package.json', () => {
    const dir = makeTheme({
      ...goodHybridFiles(),
      'package.json': JSON.stringify({ stratawp: { themeType: 'nope' } }),
    })
    const { code, err } = run([dir])
    expect(code).toBe(2)
    expect(err).toContain('Invalid stratawp.themeType "nope"')
  })

  it('exits 2 for an unknown option', () => {
    const { code, err } = run(['--frobnicate'])
    expect(code).toBe(2)
    expect(err).toContain('Unknown option: --frobnicate')
  })

  it('prints usage with --help and exits 0', () => {
    const { code, out } = run(['--help'])
    expect(code).toBe(0)
    expect(out).toContain('Usage: stratawp-review')
  })

  it('exits 2 when --type is the last argument with no value', () => {
    const { code, err } = run([makeTheme(goodHybridFiles()), '--type'])
    expect(code).toBe(2)
    expect(err).toContain('--type needs a value')
  })

  it('reports an unexpected failure as a message with exit 2, not a throw', () => {
    const dir = makeTheme({ ...goodClassicFiles(), templates: 'a regular file' })
    const { code, err } = run([dir])
    expect(code).toBe(2)
    expect(err).not.toBe('')
    expect(err).not.toContain('\n    at ')
  })
})
