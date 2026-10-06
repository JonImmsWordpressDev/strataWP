import { afterEach, describe, expect, it } from 'vitest'
import { buildArgs, screenshotsCommand } from '../commands/screenshots.js'

afterEach(() => {
  process.exitCode = undefined
})

describe('buildArgs', () => {
  it('always starts with capture and forwards only the flags that were given', () => {
    expect(buildArgs({})).toEqual(['capture'])
    expect(
      buildArgs({ routes: '/,/blog', widths: '390', out: 'shots', baseUrl: 'http://x.test' })
    ).toEqual([
      'capture',
      '--routes=/,/blog',
      '--widths=390',
      '--out=shots',
      '--base-url=http://x.test',
    ])
  })
})

describe('screenshotsCommand', () => {
  it('runs the theme-local bin through pnpm exec and passes the exit code through', async () => {
    let call: { command: string; args: string[] } | undefined
    await screenshotsCommand(
      { routes: '/' },
      {
        spawn: ((command: string, args: string[]) => {
          call = { command, args }
          return { status: 1 }
        }) as never,
      }
    )
    expect(call).toEqual({
      command: 'pnpm',
      args: ['exec', 'stratawp-screenshots', 'capture', '--routes=/'],
    })
    expect(process.exitCode).toBe(1)
  })

  it('exits 2 with a hint when pnpm cannot be started', async () => {
    await screenshotsCommand(
      {},
      { spawn: (() => ({ status: null, error: new Error('spawn pnpm ENOENT') })) as never }
    )
    expect(process.exitCode).toBe(2)
  })

  it('exits 0 on success', async () => {
    await screenshotsCommand({}, { spawn: (() => ({ status: 0 })) as never })
    expect(process.exitCode).toBe(0)
  })
})
