export type SmokeBrowser = 'chromium' | 'firefox' | 'webkit'

export const ALL_BROWSERS: SmokeBrowser[] = ['chromium', 'firefox', 'webkit']

/**
 * Which engines the smoke suite runs on.
 * Precedence: STRATAWP_E2E_BROWSERS > explicit > (all three in CI, else chromium).
 */
export function resolveBrowsers(
  env: NodeJS.ProcessEnv = process.env,
  explicit?: SmokeBrowser[]
): SmokeBrowser[] {
  const requested = env.STRATAWP_E2E_BROWSERS
  if (requested) {
    const valid = requested
      .split(',')
      .map((name) => name.trim())
      .filter((name): name is SmokeBrowser => ALL_BROWSERS.includes(name as SmokeBrowser))
    if (valid.length > 0) {
      return [...new Set(valid)]
    }
  }
  if (explicit && explicit.length > 0) {
    return explicit
  }
  return env.CI ? ALL_BROWSERS : ['chromium']
}
