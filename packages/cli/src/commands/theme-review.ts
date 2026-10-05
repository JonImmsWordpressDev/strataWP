import { runCli } from '@stratawp/theme-review'

interface ThemeReviewOptions {
  json?: boolean
  strict?: boolean
  type?: string
}

/** Thin wrapper over the theme-review package so the CLI and the standalone command agree. */
export async function themeReviewCommand(
  dir: string | undefined,
  options: ThemeReviewOptions
): Promise<void> {
  const argv: string[] = []
  if (dir) argv.push(dir)
  if (options.json) argv.push('--json')
  if (options.strict) argv.push('--strict')
  if (options.type) argv.push(`--type=${options.type}`)

  process.exitCode = runCli(argv, {
    out: (text) => console.log(text),
    err: (text) => console.error(text),
  })
}
