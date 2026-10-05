import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { themeReviewCommand } from '../commands/theme-review.js'

const dirs: string[] = []

afterEach(() => {
  process.exitCode = undefined
  vi.restoreAllMocks()
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function brokenTheme(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sw-cli-review-'))
  dirs.push(dir)
  writeFileSync(join(dir, 'index.php'), '<?php\n')
  return dir
}

describe('themeReviewCommand', () => {
  it('prints the JSON report and sets exit code 1 when there are errors', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    await themeReviewCommand(brokenTheme(), { json: true })

    const report = JSON.parse(String(log.mock.calls[0]?.[0]))
    expect(report.themeType).toBe('classic')
    expect(report.findings.some((f: { ruleId: string }) => f.ruleId === 'THEME-001')).toBe(true)
    expect(process.exitCode).toBe(1)
  })

  it('passes --type through and records the override', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    await themeReviewCommand(brokenTheme(), { json: true, type: 'block' })
    expect(JSON.parse(String(log.mock.calls[0]?.[0])).typeSource).toBe('override')
  })

  it('sets exit code 2 and prints the message for a missing directory', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    await themeReviewCommand('/definitely/not/a/theme', {})
    expect(String(err.mock.calls[0]?.[0])).toContain('Theme directory not found')
    expect(process.exitCode).toBe(2)
  })
})
