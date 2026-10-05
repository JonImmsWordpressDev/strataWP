import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { capturePages } from './capture'
import type { CaptureResult, Shot } from './capture'
import {
  DEFAULT_OUT_DIR,
  ScreenshotOptionsError,
  readScreenshotConfig,
  resolveCaptureOptions,
} from './options'
import type { CaptureOptions } from './options'

export const USAGE = `Usage: stratawp-screenshots capture [options]

Captures viewport-sized PNG screenshots of a running site.

Options:
  --routes=/,/blog      Site paths (default: from package.json stratawp.screenshots, then / and a 404)
  --widths=1280,390     Viewport widths in pixels (default: from package.json, then 1280 and 390)
  --out=dir             Output directory (default: ${DEFAULT_OUT_DIR})
  --base-url=url        Site URL (default: WP_BASE_URL, then http://localhost:8888)
  -h, --help            Show this help

Exit codes: 0 all captured, 1 a capture failed or the site/browser is unavailable, 2 usage or config problem.`

const FLAGS = ['routes', 'widths', 'out', 'base-url'] as const
type FlagName = (typeof FLAGS)[number]

export interface RunIo {
  cwd: string
  env: NodeJS.ProcessEnv
  out: (text: string) => void
  err: (text: string) => void
}

export interface RunDeps {
  capture?: (options: CaptureOptions) => Promise<CaptureResult>
  writeShots?: (dir: string, shots: Shot[]) => Promise<void>
}

export function parseArgs(argv: string[]): {
  command: string | undefined
  flags: Partial<Record<FlagName, string>>
  help: boolean
} {
  const flags: Partial<Record<FlagName, string>> = {}
  let command: string | undefined
  let help = false

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index] as string
    if (arg === '--help' || arg === '-h') {
      help = true
      continue
    }
    if (arg.startsWith('--')) {
      const equals = arg.indexOf('=')
      const name = equals === -1 ? arg.slice(2) : arg.slice(2, equals)
      if (!FLAGS.includes(name as FlagName)) {
        throw new ScreenshotOptionsError(`Unknown option --${name}`)
      }
      let value = equals === -1 ? undefined : arg.slice(equals + 1)
      if (value === undefined) {
        value = argv[index + 1]
        if (value === undefined || value.startsWith('--')) {
          throw new ScreenshotOptionsError(`--${name} needs a value`)
        }
        index++
      }
      if (value === '') {
        throw new ScreenshotOptionsError(`--${name} needs a value`)
      }
      flags[name as FlagName] = value
      continue
    }
    if (command === undefined) {
      command = arg
    } else {
      throw new ScreenshotOptionsError(`Unexpected argument "${arg}"`)
    }
  }
  return { command, flags, help }
}

export async function writeShots(dir: string, shots: Shot[]): Promise<void> {
  await mkdir(dir, { recursive: true })
  for (const shot of shots) {
    await writeFile(join(dir, shot.name), shot.png)
  }
}

async function readPackageConfig(cwd: string) {
  let raw: string
  try {
    raw = await readFile(join(cwd, 'package.json'), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw error
  }
  let pkg: unknown
  try {
    pkg = JSON.parse(raw.replace(/^﻿/, ''))
  } catch {
    throw new ScreenshotOptionsError('package.json is not valid JSON')
  }
  return readScreenshotConfig(pkg)
}

/** Returns the process exit code. Never throws and never prints a stack trace. */
export async function runScreenshotsCli(
  argv: string[],
  io: RunIo,
  deps: RunDeps = {}
): Promise<number> {
  try {
    const { command, flags, help } = parseArgs(argv)
    if (help) {
      io.out(USAGE)
      return 0
    }
    if (command === undefined) {
      io.err(USAGE)
      return 2
    }
    if (command !== 'capture') {
      throw new ScreenshotOptionsError(`Unknown command "${command}"`)
    }

    const config = await readPackageConfig(io.cwd)
    const options = resolveCaptureOptions(
      { baseUrl: flags['base-url'], routes: flags.routes, widths: flags.widths },
      io.env,
      config
    )
    const outDir = resolve(io.cwd, flags.out ?? DEFAULT_OUT_DIR)

    const result = await (deps.capture ?? capturePages)(options)
    if (result.shots.length > 0) {
      await (deps.writeShots ?? writeShots)(outDir, result.shots)
      io.out(`Captured ${result.shots.length} screenshot(s) in ${relative(io.cwd, outDir) || '.'}:`)
      for (const shot of result.shots) {
        io.out(`  ${shot.name}  ${shot.route} at ${shot.width}px`)
      }
    }
    for (const failure of result.failures) {
      io.err(`FAILED ${failure.route} at ${failure.width}px: ${failure.message}`)
    }
    return result.failures.length > 0 || result.shots.length === 0 ? 1 : 0
  } catch (error) {
    io.err(error instanceof Error ? error.message : String(error))
    return error instanceof ScreenshotOptionsError ? 2 : 1
  }
}
