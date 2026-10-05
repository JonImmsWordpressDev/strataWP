import { isThemeType } from './config'
import { ReviewError } from './errors'
import { formatReport } from './format'
import { exitCodeFor, reviewTheme } from './review'
import type { ThemeType } from './types'

export interface Io {
  out(text: string): void
  err(text: string): void
}

export const USAGE = `Usage: stratawp-review [dir] [--json] [--strict] [--type=block|classic|hybrid]

Reviews a theme against an approximation of the WordPress.org theme guidelines.

  dir        Theme directory (default: current directory)
  --json     Print the report as JSON
  --strict   Fail on warnings as well as errors
  --type     Override the detected theme type

Exit codes: 0 pass, 1 errors (or warnings with --strict), 2 usage or file problem.`

export function runCli(argv: string[], io: Io): number {
  let dir = '.'
  let json = false
  let strict = false
  let typeArg: string | undefined

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string
    if (arg === '--help' || arg === '-h') {
      io.out(USAGE)
      return 0
    } else if (arg === '--json') {
      json = true
    } else if (arg === '--strict') {
      strict = true
    } else if (arg.startsWith('--type=')) {
      typeArg = arg.slice('--type='.length)
    } else if (arg === '--type') {
      const value = argv[++i]
      if (value === undefined) {
        io.err(`--type needs a value (block, classic or hybrid)\n\n${USAGE}`)
        return 2
      }
      typeArg = value
    } else if (arg.startsWith('-')) {
      io.err(`Unknown option: ${arg}\n\n${USAGE}`)
      return 2
    } else {
      dir = arg
    }
  }

  try {
    let type: ThemeType | undefined
    if (typeArg !== undefined) {
      if (!isThemeType(typeArg)) {
        throw new ReviewError(`Invalid --type "${typeArg}" (expected block, classic or hybrid)`)
      }
      type = typeArg
    }

    const report = reviewTheme(dir, { type })
    io.out(json ? JSON.stringify(report, null, 2) : formatReport(report))
    return exitCodeFor(report, strict)
  } catch (error) {
    io.err(error instanceof Error ? error.message : String(error))
    return 2
  }
}
