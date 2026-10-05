import { spawnSync } from 'node:child_process'

export interface ScreenshotsOptions {
  routes?: string
  widths?: string
  out?: string
  baseUrl?: string
}

export interface ScreenshotsDeps {
  spawn?: typeof spawnSync
}

export function buildArgs(options: ScreenshotsOptions): string[] {
  const args = ['capture']
  if (options.routes) args.push(`--routes=${options.routes}`)
  if (options.widths) args.push(`--widths=${options.widths}`)
  if (options.out) args.push(`--out=${options.out}`)
  if (options.baseUrl) args.push(`--base-url=${options.baseUrl}`)
  return args
}

/**
 * Thin wrapper: runs the theme's own `stratawp-screenshots` bin (from the
 * @stratawp/testing dev dependency every generated theme has), so the CLI does
 * not pull Vitest and jsdom onto every install.
 */
export async function screenshotsCommand(
  options: ScreenshotsOptions,
  deps: ScreenshotsDeps = {}
): Promise<void> {
  const spawn = deps.spawn ?? spawnSync
  const result = spawn('pnpm', ['exec', 'stratawp-screenshots', ...buildArgs(options)], {
    stdio: 'inherit',
  })
  if (result.error) {
    console.error(
      `Could not run "pnpm exec stratawp-screenshots" (${result.error.message}). ` +
        'Run this from a theme that has @stratawp/testing installed.'
    )
    process.exitCode = 2
    return
  }
  process.exitCode = result.status ?? 1
}
