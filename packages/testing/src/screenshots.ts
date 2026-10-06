/**
 * Public `@stratawp/testing/screenshots` entry. Must not import Playwright at
 * load time (it is an optional peer); `capture.ts` loads it lazily.
 */
export * from './screenshots/options'
export * from './screenshots/naming'
export * from './screenshots/capture'
export { runScreenshotsCli, parseArgs, writeShots, USAGE } from './screenshots/run'
export type { RunIo, RunDeps } from './screenshots/run'
