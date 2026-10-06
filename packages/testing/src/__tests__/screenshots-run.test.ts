// @vitest-environment node
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { parseArgs, runScreenshotsCli } from '../screenshots/run'
import type { RunDeps } from '../screenshots/run'
import type { CaptureOptions } from '../screenshots/options'
import type { CaptureResult } from '../screenshots/capture'

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47])

let cwd: string
let out: string[]
let err: string[]
let seen: CaptureOptions | undefined

beforeEach(async () => {
  cwd = await mkdtemp(join(tmpdir(), 'stratawp-shots-'))
  out = []
  err = []
  seen = undefined
})

function io(env: NodeJS.ProcessEnv = {}) {
  return { cwd, env, out: (t: string) => out.push(t), err: (t: string) => err.push(t) }
}

function deps(result: CaptureResult): RunDeps {
  return {
    capture: async (options) => {
      seen = options
      return result
    },
  }
}

const oneShot: CaptureResult = {
  shots: [{ route: '/', width: 1280, name: 'home-1280.png', png: PNG }],
  failures: [],
}

describe('parseArgs', () => {
  it('reads --flag=value and --flag value', () => {
    expect(parseArgs(['capture', '--routes=/,/blog', '--widths', '390'])).toEqual({
      command: 'capture',
      flags: { routes: '/,/blog', widths: '390' },
      help: false,
    })
  })

  it('rejects unknown flags, a missing value, an empty value and extra arguments', () => {
    expect(() => parseArgs(['capture', '--nope=1'])).toThrow(/Unknown option --nope/)
    expect(() => parseArgs(['capture', '--routes'])).toThrow(/--routes needs a value/)
    expect(() => parseArgs(['capture', '--routes', '--widths=1'])).toThrow(/--routes needs a value/)
    expect(() => parseArgs(['capture', '--out='])).toThrow(/--out needs a value/)
    expect(() => parseArgs(['capture', 'again'])).toThrow(/Unexpected argument/)
  })
})

describe('runScreenshotsCli', () => {
  it('writes the captured files under --out and exits 0', async () => {
    const code = await runScreenshotsCli(['capture', '--out=shots'], io(), deps(oneShot))
    expect(code).toBe(0)
    expect(await readdir(join(cwd, 'shots'))).toEqual(['home-1280.png'])
    expect(Array.from(await readFile(join(cwd, 'shots', 'home-1280.png')))).toEqual(Array.from(PNG))
    expect(out.join('\n')).toMatch(/Captured 1 screenshot/)
  })

  it('exits 1 and lists failures when any route failed, still writing the others', async () => {
    const result: CaptureResult = {
      shots: oneShot.shots,
      failures: [{ route: '/blog', width: 390, message: 'timeout' }],
    }
    const code = await runScreenshotsCli(['capture', '--out=shots'], io(), deps(result))
    expect(code).toBe(1)
    expect(err.join('\n')).toMatch(/FAILED \/blog at 390px: timeout/)
    expect(await readdir(join(cwd, 'shots'))).toEqual(['home-1280.png'])
  })

  it('exits 1 when nothing was captured', async () => {
    const code = await runScreenshotsCli(['capture'], io(), deps({ shots: [], failures: [] }))
    expect(code).toBe(1)
  })

  it('exits 1 with the message, not a stack, when capture throws', async () => {
    const code = await runScreenshotsCli(['capture'], io(), {
      capture: async () => {
        throw new Error('StrataWP screenshots: http://localhost:8888 is not reachable')
      },
    })
    expect(code).toBe(1)
    expect(err.join('\n')).toMatch(/is not reachable/)
    expect(err.join('\n')).not.toMatch(/\n\s+at /)
  })

  it('exits 2 on bad input without calling capture', async () => {
    for (const argv of [
      ['capture', '--routes=https://evil.example/'],
      ['capture', '--widths=abc'],
      ['capture', '--base-url=file:///etc/passwd'],
      ['capture', '--nope'],
      ['capture', '--routes'],
      ['bogus'],
      [],
    ]) {
      expect(await runScreenshotsCli(argv, io(), deps(oneShot))).toBe(2)
    }
    expect(seen).toBeUndefined()
  })

  it('prints usage and exits 0 for --help', async () => {
    expect(await runScreenshotsCli(['--help'], io())).toBe(0)
    expect(out.join('\n')).toMatch(/Usage: stratawp-screenshots capture/)
  })

  it('uses package.json config when no flags are given, and flags override it', async () => {
    await writeFile(
      join(cwd, 'package.json'),
      JSON.stringify({
        stratawp: { screenshots: { routes: ['/from-config'], widths: [1024] } },
      })
    )
    await runScreenshotsCli(['capture', '--out=shots'], io(), deps(oneShot))
    expect(seen).toMatchObject({ routes: ['/from-config'], widths: [1024] })

    await runScreenshotsCli(['capture', '--routes=/x', '--out=shots'], io(), deps(oneShot))
    expect(seen).toMatchObject({ routes: ['/x'], widths: [1024] })
  })

  it('takes the base URL from WP_BASE_URL when no flag is given', async () => {
    await runScreenshotsCli(
      ['capture', '--out=shots'],
      io({ WP_BASE_URL: 'http://site.test/' }),
      deps(oneShot)
    )
    expect(seen?.baseUrl).toBe('http://site.test')
  })

  it('exits 2 naming the field for a malformed config, invalid JSON, and tolerates a BOM', async () => {
    await writeFile(
      join(cwd, 'package.json'),
      JSON.stringify({ stratawp: { screenshots: { routes: '/' } } })
    )
    expect(await runScreenshotsCli(['capture'], io(), deps(oneShot))).toBe(2)
    expect(err.join('\n')).toMatch(/stratawp\.screenshots\.routes must be an array/)

    await writeFile(join(cwd, 'package.json'), '{ nope')
    expect(await runScreenshotsCli(['capture'], io(), deps(oneShot))).toBe(2)
    expect(err.join('\n')).toMatch(/package\.json is not valid JSON/)

    await writeFile(join(cwd, 'package.json'), '\uFEFF{"name":"x"}')
    expect(await runScreenshotsCli(['capture', '--out=shots'], io(), deps(oneShot))).toBe(0)
  })

  it('exits 1 before capturing when --out is an existing file', async () => {
    await writeFile(join(cwd, 'taken'), 'x')
    let called = false
    const code = await runScreenshotsCli(['capture', '--out=taken'], io(), {
      capture: async () => {
        called = true
        return oneShot
      },
    })
    expect(code).toBe(1)
    expect(called).toBe(false)
    expect(err.join('\n')).not.toBe('')
  })
})
