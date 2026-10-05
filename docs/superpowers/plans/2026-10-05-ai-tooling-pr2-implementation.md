# AI Tooling PR 2 (Screenshots and Visual Compare) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give humans, CI and agents the same screenshots of a running StrataWP theme (capture), plus an opt-in, CI-recorded visual compare gate.

**Architecture:** A browser-free core in `@stratawp/testing` (option parsing, file naming, a capture loop with injectable browser, a CLI runner) is wrapped three ways: the `stratawp-screenshots` bin, an MCP `capture_screenshots` tool that returns images in memory, and a thin `stratawp screenshots` command in `@stratawp/cli`. Compare is a second Playwright preset, `createVisualConfig`, used by a dispatch-only `visual.yml` that records baselines on the CI runner (so fonts match) or compares against them. A capture step in `smoke.yml` proves capture works on every PR.

**Tech Stack:** TypeScript, tsup, Vitest, Playwright (`@playwright/test`, Chromium only), `@modelcontextprotocol/sdk` + zod, commander, GitHub Actions, pnpm + Turborepo.

**Spec:** `docs/superpowers/specs/2026-10-05-ai-tooling-design.md` (Workstream B, plus Testing, Rollout order and Risks). PR 1 shipped as #48.

## Global Constraints

- pnpm only; never `npm` or `yarn`. Stage by explicit path, never `git add -A` or `git add .`.
- No attribution of any kind in commits or PR text: no `Co-Authored-By`, no "Generated with Claude Code".
- No mention of any external starter theme or project in code, comments, docs, commits or branch names.
- No embedded LLM and no provider keys. MCP stays on stdio with all logging to stderr (stdout is the JSON-RPC channel; the built-bin stdout hygiene test must keep passing).
- New MCP tools go through the contract-first snapshot: regenerate with `pnpm --filter @stratawp/mcp snapshot`; `pnpm contracts:check` must be in sync.
- `capture_screenshots` is read-only: it sends GET requests to the given site and writes no files. Caps: at most 6 images per call, at most 2 widths, viewport-sized (not full-page) captures.
- Compare is opt-in and never part of a default blocking gate. Chromium only. No baselines are committed in this PR.
- Output defaults to `.stratawp/screenshots/` (git-ignored). Routes and widths default from `package.json` `stratawp.screenshots`; defaults are `/` and `/this-page-does-not-exist-404/`, widths `1280` and `390`.
- `@stratawp/testing` already publishes through trusted publishing; this PR adds no new package.
- Prettier covers json/ts/md/yml in this repo: run `pnpm exec prettier --check <files>` on everything touched.
- Heuristics fail soft: one failing route or width never stops the others; the summary lists failures and the exit code is non-zero if any failed.

## Review Focus

Failure modes the spec implies but a straight implementation would not test, most likely first:

1. **A route that is a full URL or `//host/path`** must be rejected with a clear message and never fetched (the capture URL is `baseUrl + route` by plain concatenation, never URL resolution). Tests in Task 1 (rejection) and Task 2 (concatenation).
2. **Two routes that slug to the same filename** (`/a-b` and `/a/b`, or `/` and `/%%%`) must not overwrite each other. Test in Task 1.
3. **Site down, Playwright missing, or Chromium not installed** gives one actionable message and exit 1, never a stack trace; the browser, contexts and pages are always closed even when a page throws. Tests in Task 2.
4. **`@stratawp/testing/screenshots` must load without `@playwright/test` installed** (it is an optional peer; the MCP server and the CLI must start and report a clear error instead of crashing at import). Test in Task 2 (no static Playwright import in the screenshots sources) plus a built-output check.
5. **Over-cap or malformed MCP input** (more than 6 images, more than 2 widths, `file:///` or credentialed `baseUrl`, non-path routes) returns an error result and never launches a browser; a partial failure is not an error but lists failures; image payloads are valid base64 PNG. Tests in Task 5.
6. **Malformed `package.json` config** (`stratawp.screenshots.routes` as a string, invalid JSON, a UTF-8 BOM) exits 2 naming the field, or tolerates the BOM. Test in Task 2.

## Deviations from the spec (decided here, recorded in the decision log in Task 6)

- **CLI wrapper uses `pnpm exec stratawp-screenshots`** instead of importing `@stratawp/testing`. Importing would put Vitest, jsdom and Testing Library on every CLI install. Generated themes already have `@stratawp/testing` as a dev dependency, so the bin is there.
- **MCP depends on `@stratawp/testing` (workspace, private package)** and imports only the `./screenshots` subpath; Playwright is loaded lazily inside it.
- **Capture core returns PNG buffers; the CLI writes files, the MCP tool never does.** This keeps the MCP tool read-only.
- **`checkSiteReachable` gains an optional label** so its error says "StrataWP screenshots" rather than "smoke tests".
- **Visual baselines path** is `e2e/visual/__screenshots__/{testFileName}/{arg}{ext}` (single Chromium project, so no project name in the path).
- **`.ai` ignore:** `__screenshots__` is added to the `.aiignore` files so agents do not read PNG baselines.
- **Dispatch workflows only run once they exist on the default branch.** The maintainer's first `record` run happens after this PR merges; the PR checklist says so.

## File Structure

New, in `packages/testing/src/`:

- `screenshots/options.ts` — defaults, `ScreenshotOptionsError`, `parseRoutes`, `parseWidths`, `normalizeBaseUrl`, `readScreenshotConfig`, `resolveCaptureOptions`. Pure.
- `screenshots/naming.ts` — `routeSlug`, `planShots` (collision-safe filenames). Pure.
- `screenshots/capture.ts` — browser-like interfaces, `viewportFor`, `launchChromium`, `capturePages`. Playwright only via dynamic import.
- `screenshots/run.ts` — `parseArgs`, `runScreenshotsCli`, `writeShots`, `USAGE`. Testable with injected capture and IO.
- `screenshots.ts` — the public `./screenshots` entry (re-exports).
- `screenshots-cli.ts` — the `stratawp-screenshots` bin (shebang in source).
- Tests in `src/__tests__/`: `screenshots-options.test.ts`, `screenshots-naming.test.ts`, `screenshots-capture.test.ts`, `screenshots-run.test.ts`, `screenshots-hygiene.test.ts`, `visual-config.test.ts`.

Modified: `packages/testing/{package.json,tsup.config.ts,README.md}`, `packages/testing/src/{config.ts,global-setup.ts}`, `.gitignore`, `.aiignore` files, `packages/cli/src/index.ts`, `packages/cli/src/commands/screenshots.ts` (new), `packages/mcp/src/{tools.ts,server.ts,server.test.ts}`, `packages/mcp/package.json`, `packages/mcp/contracts/tools.snapshot.json`, the example theme and three templates (visual config, spec, `test:visual` script), `.github/workflows/smoke.yml`, new `.github/workflows/visual.yml`, skills, `AGENTS.md`, `.ai/SKILLS.md`, `docs/ai-tooling.md`, `CLAUDE.md`, `.changeset/ai-tooling-visual.md`, `.ai/PROJECT_RULES.md`, the spec.

---

### Task 1: Option parsing and file naming (pure core)

**Files:**
- Create: `packages/testing/src/screenshots/options.ts`
- Create: `packages/testing/src/screenshots/naming.ts`
- Test: `packages/testing/src/__tests__/screenshots-options.test.ts`
- Test: `packages/testing/src/__tests__/screenshots-naming.test.ts`

**Interfaces:**
- Produces (used by Tasks 2 and 5):
  - `DEFAULT_BASE_URL: string`, `DEFAULT_ROUTES: readonly string[]`, `DEFAULT_WIDTHS: readonly number[]`, `DEFAULT_OUT_DIR: string`
  - `class ScreenshotOptionsError extends Error`
  - `interface CaptureOptions { baseUrl: string; routes: string[]; widths: number[] }`
  - `parseList(value: string): string[]`
  - `parseRoutes(input: unknown, source?: string): string[]`
  - `parseWidths(input: unknown, source?: string): number[]`
  - `normalizeBaseUrl(input: string): string`
  - `readScreenshotConfig(pkg: unknown): { routes?: string[]; widths?: number[] }`
  - `interface CaptureInput { baseUrl?: string; routes?: string | string[]; widths?: string | number[] }`
  - `resolveCaptureOptions(input: CaptureInput, env: NodeJS.ProcessEnv, config?: { routes?: string[]; widths?: number[] }): CaptureOptions`
  - `routeSlug(route: string): string`, `interface PlannedShot { route: string; width: number; name: string }`, `planShots(routes: string[], widths: number[]): PlannedShot[]`

- [ ] **Step 1: Write the failing option tests**

Create `packages/testing/src/__tests__/screenshots-options.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  DEFAULT_BASE_URL,
  DEFAULT_ROUTES,
  DEFAULT_WIDTHS,
  ScreenshotOptionsError,
  normalizeBaseUrl,
  parseList,
  parseRoutes,
  parseWidths,
  readScreenshotConfig,
  resolveCaptureOptions,
} from '../screenshots/options'

describe('parseList', () => {
  it('splits on commas, trims, and drops empty parts', () => {
    expect(parseList(' /, /blog ,,/about ')).toEqual(['/', '/blog', '/about'])
  })
})

describe('parseRoutes', () => {
  it('accepts a comma string or an array and dedupes in first-seen order', () => {
    expect(parseRoutes('/,/blog,/')).toEqual(['/', '/blog'])
    expect(parseRoutes(['/a', '/b', '/a'])).toEqual(['/a', '/b'])
  })

  it.each([
    'https://evil.example/x',
    '//evil.example/x',
    'blog',
    '/has space',
    '/' + 'x'.repeat(250),
  ])('rejects %s as not a site path', (route) => {
    expect(() => parseRoutes([route])).toThrow(ScreenshotOptionsError)
    expect(() => parseRoutes([route])).toThrow(/not a site path/)
  })

  it('rejects an empty list and non-string entries, naming the source', () => {
    expect(() => parseRoutes([], 'stratawp.screenshots.routes')).toThrow(
      /stratawp\.screenshots\.routes must be a non-empty list/
    )
    expect(() => parseRoutes([1 as unknown as string])).toThrow(/not a site path/)
    expect(() => parseRoutes(undefined)).toThrow(/non-empty list/)
  })
})

describe('parseWidths', () => {
  it('accepts a comma string or numbers and dedupes', () => {
    expect(parseWidths('1280, 390,1280')).toEqual([1280, 390])
    expect(parseWidths([768, 768, 1024])).toEqual([768, 1024])
  })

  it.each([['abc'], ['12.5'], ['100'], ['5000'], ['-300']])('rejects %s', (value) => {
    expect(() => parseWidths(value)).toThrow(/is not a width between 200 and 3840/)
  })

  it('rejects an empty list', () => {
    expect(() => parseWidths([])).toThrow(/non-empty list/)
  })
})

describe('normalizeBaseUrl', () => {
  it('strips trailing slashes, query and hash but keeps a sub-path install', () => {
    expect(normalizeBaseUrl('http://localhost:8888/')).toBe('http://localhost:8888')
    expect(normalizeBaseUrl('https://example.test/wp/?a=1#x')).toBe('https://example.test/wp')
  })

  it.each(['file:///etc/passwd', 'ftp://host/', 'javascript:alert(1)'])(
    'rejects the non-http scheme in %s',
    (value) => {
      expect(() => normalizeBaseUrl(value)).toThrow(/http:\/\/ or https:\/\//)
    }
  )

  it('rejects credentials and garbage', () => {
    expect(() => normalizeBaseUrl('http://user:pw@localhost:8888')).toThrow(/credentials/)
    expect(() => normalizeBaseUrl('not a url')).toThrow(/not a valid URL/)
  })
})

describe('readScreenshotConfig', () => {
  it('returns nothing when the package has no stratawp.screenshots block', () => {
    expect(readScreenshotConfig(undefined)).toEqual({})
    expect(readScreenshotConfig({})).toEqual({})
    expect(readScreenshotConfig({ stratawp: {} })).toEqual({})
  })

  it('reads and validates routes and widths', () => {
    expect(
      readScreenshotConfig({
        stratawp: { screenshots: { routes: ['/', '/blog'], widths: [1024] } },
      })
    ).toEqual({ routes: ['/', '/blog'], widths: [1024] })
  })

  it.each([
    [{ stratawp: 'x' }, /"stratawp" must be an object/],
    [{ stratawp: { screenshots: [] } }, /"stratawp.screenshots" must be an object/],
    [{ stratawp: { screenshots: { routes: '/' } } }, /stratawp\.screenshots\.routes must be an array/],
    [{ stratawp: { screenshots: { widths: '1280' } } }, /stratawp\.screenshots\.widths must be an array/],
    [{ stratawp: { screenshots: { routes: ['nope'] } } }, /stratawp\.screenshots\.routes: "nope"/],
  ])('rejects a wrong shape: %j', (pkg, message) => {
    expect(() => readScreenshotConfig(pkg)).toThrow(message)
  })
})

describe('resolveCaptureOptions', () => {
  it('falls back to the documented defaults', () => {
    expect(resolveCaptureOptions({}, {})).toEqual({
      baseUrl: DEFAULT_BASE_URL,
      routes: [...DEFAULT_ROUTES],
      widths: [...DEFAULT_WIDTHS],
    })
  })

  it('prefers flags over package.json config, and WP_BASE_URL over the default', () => {
    const config = { routes: ['/from-config'], widths: [1024] }
    expect(resolveCaptureOptions({}, { WP_BASE_URL: 'http://site.test/' }, config)).toEqual({
      baseUrl: 'http://site.test',
      routes: ['/from-config'],
      widths: [1024],
    })
    expect(
      resolveCaptureOptions(
        { baseUrl: 'http://flag.test', routes: '/x', widths: '390' },
        { WP_BASE_URL: 'http://site.test' },
        config
      )
    ).toEqual({ baseUrl: 'http://flag.test', routes: ['/x'], widths: [390] })
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @stratawp/testing exec vitest run src/__tests__/screenshots-options.test.ts`
Expected: FAIL (cannot resolve `../screenshots/options`).

- [ ] **Step 3: Implement `options.ts`**

Create `packages/testing/src/screenshots/options.ts`:

```ts
export const DEFAULT_BASE_URL = 'http://localhost:8888'
export const DEFAULT_ROUTES: readonly string[] = ['/', '/this-page-does-not-exist-404/']
export const DEFAULT_WIDTHS: readonly number[] = [1280, 390]
export const DEFAULT_OUT_DIR = '.stratawp/screenshots'

const MIN_WIDTH = 200
const MAX_WIDTH = 3840
const MAX_ROUTE_LENGTH = 200

/** Bad user input: the CLI maps this to exit code 2, the MCP tool to an error result. */
export class ScreenshotOptionsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScreenshotOptionsError'
  }
}

export interface CaptureOptions {
  baseUrl: string
  routes: string[]
  widths: number[]
}

export function parseList(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

function dedupe<T>(items: T[]): T[] {
  return [...new Set(items)]
}

/**
 * Routes are site paths, appended to the base URL by plain concatenation.
 * Anything that could change the host (a scheme, `//host`) is rejected.
 */
export function parseRoutes(input: unknown, source = 'routes'): string[] {
  const items = typeof input === 'string' ? parseList(input) : input
  if (!Array.isArray(items) || items.length === 0) {
    throw new ScreenshotOptionsError(
      `${source} must be a non-empty list of paths such as "/" or "/blog"`
    )
  }
  const routes = items.map((item) => {
    if (
      typeof item !== 'string' ||
      !item.startsWith('/') ||
      item.startsWith('//') ||
      /\s/.test(item) ||
      item.length > MAX_ROUTE_LENGTH
    ) {
      throw new ScreenshotOptionsError(
        `${source}: "${String(item)}" is not a site path. Use a path that starts with a single "/", for example "/blog"; full URLs are not accepted`
      )
    }
    return item
  })
  return dedupe(routes)
}

export function parseWidths(input: unknown, source = 'widths'): number[] {
  const items = typeof input === 'string' ? parseList(input) : input
  if (!Array.isArray(items) || items.length === 0) {
    throw new ScreenshotOptionsError(`${source} must be a non-empty list of pixel widths`)
  }
  const widths = items.map((item) => {
    const value = typeof item === 'string' && /^\d+$/.test(item) ? Number(item) : item
    if (
      typeof value !== 'number' ||
      !Number.isInteger(value) ||
      value < MIN_WIDTH ||
      value > MAX_WIDTH
    ) {
      throw new ScreenshotOptionsError(
        `${source}: "${String(item)}" is not a width between ${MIN_WIDTH} and ${MAX_WIDTH} pixels`
      )
    }
    return value
  })
  return dedupe(widths)
}

export function normalizeBaseUrl(input: string): string {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new ScreenshotOptionsError(`base URL "${input}" is not a valid URL`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ScreenshotOptionsError(`base URL "${input}" must start with http:// or https://`)
  }
  if (url.username || url.password) {
    throw new ScreenshotOptionsError('base URL must not contain credentials')
  }
  return url.origin + url.pathname.replace(/\/+$/, '')
}

function asObject(value: unknown, label: string): Record<string, unknown> | undefined {
  if (value === undefined) return undefined
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ScreenshotOptionsError(`package.json ${label} must be an object`)
  }
  return value as Record<string, unknown>
}

/** Reads `stratawp.screenshots` from a parsed package.json. Wrong shapes name the field. */
export function readScreenshotConfig(pkg: unknown): { routes?: string[]; widths?: number[] } {
  if (pkg === null || typeof pkg !== 'object') return {}
  const stratawp = asObject((pkg as Record<string, unknown>).stratawp, '"stratawp"')
  const screenshots = asObject(stratawp?.screenshots, '"stratawp.screenshots"')
  if (!screenshots) return {}

  const result: { routes?: string[]; widths?: number[] } = {}
  if (screenshots.routes !== undefined) {
    if (!Array.isArray(screenshots.routes)) {
      throw new ScreenshotOptionsError('stratawp.screenshots.routes must be an array')
    }
    result.routes = parseRoutes(screenshots.routes, 'stratawp.screenshots.routes')
  }
  if (screenshots.widths !== undefined) {
    if (!Array.isArray(screenshots.widths)) {
      throw new ScreenshotOptionsError('stratawp.screenshots.widths must be an array')
    }
    result.widths = parseWidths(screenshots.widths, 'stratawp.screenshots.widths')
  }
  return result
}

export interface CaptureInput {
  baseUrl?: string
  routes?: string | string[]
  widths?: string | number[]
}

/** Precedence: explicit input, then package.json config, then env (base URL only), then defaults. */
export function resolveCaptureOptions(
  input: CaptureInput,
  env: NodeJS.ProcessEnv,
  config: { routes?: string[]; widths?: number[] } = {}
): CaptureOptions {
  return {
    baseUrl: normalizeBaseUrl(input.baseUrl ?? env.WP_BASE_URL ?? DEFAULT_BASE_URL),
    routes:
      input.routes !== undefined
        ? parseRoutes(input.routes)
        : (config.routes ?? [...DEFAULT_ROUTES]),
    widths:
      input.widths !== undefined
        ? parseWidths(input.widths)
        : (config.widths ?? [...DEFAULT_WIDTHS]),
  }
}
```

- [ ] **Step 4: Run option tests**

Run: `pnpm --filter @stratawp/testing exec vitest run src/__tests__/screenshots-options.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing naming tests**

Create `packages/testing/src/__tests__/screenshots-naming.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { planShots, routeSlug } from '../screenshots/naming'

describe('routeSlug', () => {
  it.each([
    ['/', 'home'],
    ['/blog/Hello-World/', 'blog-hello-world'],
    ['/?s=a', 's-a'],
    ['/this-page-does-not-exist-404/', 'this-page-does-not-exist-404'],
    ['/%%%', 'home'],
  ])('%s -> %s', (route, slug) => {
    expect(routeSlug(route)).toBe(slug)
  })

  it('caps the length and never ends with a dash', () => {
    const slug = routeSlug('/' + 'a-'.repeat(80))
    expect(slug.length).toBeLessThanOrEqual(60)
    expect(slug.endsWith('-')).toBe(false)
  })
})

describe('planShots', () => {
  it('plans route-major, one shot per width, named slug-width.png', () => {
    expect(planShots(['/', '/blog'], [1280, 390]).map((shot) => shot.name)).toEqual([
      'home-1280.png',
      'home-390.png',
      'blog-1280.png',
      'blog-390.png',
    ])
  })

  it('never lets two routes share a filename', () => {
    const names = planShots(['/a-b', '/a/b', '/', '/%%%'], [1280, 390]).map((shot) => shot.name)
    expect(new Set(names).size).toBe(names.length)
    expect(names).toContain('a-b-1280.png')
    expect(names).toContain('a-b-2-1280.png')
  })

  it('carries the original route and width on each planned shot', () => {
    expect(planShots(['/x'], [390])).toEqual([{ route: '/x', width: 390, name: 'x-390.png' }])
  })
})
```

- [ ] **Step 6: Run to verify failure**

Run: `pnpm --filter @stratawp/testing exec vitest run src/__tests__/screenshots-naming.test.ts`
Expected: FAIL (cannot resolve `../screenshots/naming`).

- [ ] **Step 7: Implement `naming.ts`**

Create `packages/testing/src/screenshots/naming.ts`:

```ts
export function routeSlug(route: string): string {
  const slug = route
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')
  return slug === '' ? 'home' : slug
}

export interface PlannedShot {
  route: string
  width: number
  name: string
}

/** Route-major plan. Filenames are unique even when two routes slug alike. */
export function planShots(routes: string[], widths: number[]): PlannedShot[] {
  const used = new Set<string>()
  const planned: PlannedShot[] = []
  for (const route of routes) {
    const slug = routeSlug(route)
    for (const width of widths) {
      let name = `${slug}-${width}.png`
      for (let attempt = 2; used.has(name); attempt++) {
        name = `${slug}-${attempt}-${width}.png`
      }
      used.add(name)
      planned.push({ route, width, name })
    }
  }
  return planned
}
```

- [ ] **Step 8: Run both test files, typecheck and format**

Run: `pnpm --filter @stratawp/testing exec vitest run src/__tests__/screenshots-options.test.ts src/__tests__/screenshots-naming.test.ts && pnpm --filter @stratawp/testing typecheck && pnpm exec prettier --check packages/testing/src/screenshots packages/testing/src/__tests__/screenshots-options.test.ts packages/testing/src/__tests__/screenshots-naming.test.ts`
Expected: all pass. If Prettier reports files, run `pnpm exec prettier --write` on those paths and re-run.

- [ ] **Step 9: Commit**

```bash
git add packages/testing/src/screenshots/options.ts packages/testing/src/screenshots/naming.ts packages/testing/src/__tests__/screenshots-options.test.ts packages/testing/src/__tests__/screenshots-naming.test.ts
git commit -m "feat(testing): add screenshot option parsing and collision-safe file naming"
```

---

### Task 2: Capture runner, CLI runner and the `stratawp-screenshots` bin

**Files:**
- Create: `packages/testing/src/screenshots/capture.ts`
- Create: `packages/testing/src/screenshots/run.ts`
- Create: `packages/testing/src/screenshots.ts`
- Create: `packages/testing/src/screenshots-cli.ts`
- Modify: `packages/testing/src/global-setup.ts` (optional label on the reachability error)
- Modify: `packages/testing/tsup.config.ts`, `packages/testing/package.json`
- Modify: `.gitignore` (add `.stratawp/`)
- Test: `packages/testing/src/__tests__/screenshots-capture.test.ts`, `screenshots-run.test.ts`, `screenshots-hygiene.test.ts`

**Interfaces:**
- Consumes (Task 1): `CaptureOptions`, `ScreenshotOptionsError`, `planShots`, `resolveCaptureOptions`, `readScreenshotConfig`, `DEFAULT_OUT_DIR`.
- Produces (used by Tasks 5 and 6): from `@stratawp/testing/screenshots`: everything exported by Task 1's two modules, plus
  - `interface Shot { route: string; width: number; name: string; png: Uint8Array }`
  - `interface CaptureFailure { route: string; width: number; message: string }`
  - `interface CaptureResult { shots: Shot[]; failures: CaptureFailure[] }`
  - `interface CaptureDeps { launch: () => Promise<BrowserLike>; checkReachable: (url: string) => Promise<void> }`
  - `capturePages(options: CaptureOptions, deps?: Partial<CaptureDeps>): Promise<CaptureResult>`
  - `viewportFor(width: number): { width: number; height: number }`
  - `runScreenshotsCli(argv: string[], io: RunIo, deps?: RunDeps): Promise<number>`

- [ ] **Step 1: Write the failing capture tests**

Create `packages/testing/src/__tests__/screenshots-capture.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { capturePages, viewportFor } from '../screenshots/capture'
import type { BrowserLike } from '../screenshots/capture'

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function fakeBrowser(options: { failOn?: string } = {}) {
  const log = {
    viewports: [] as Array<{ width: number; height: number }>,
    urls: [] as string[],
    closed: { pages: 0, contexts: 0, browser: 0 },
  }
  const browser: BrowserLike = {
    async newContext({ viewport }) {
      log.viewports.push(viewport)
      return {
        async newPage() {
          return {
            async goto(url) {
              log.urls.push(url)
              if (options.failOn && url.endsWith(options.failOn)) {
                throw new Error('net::ERR_TIMED_OUT')
              }
            },
            async evaluate() {
              return undefined
            },
            async screenshot() {
              return PNG
            },
            async close() {
              log.closed.pages++
            },
          }
        },
        async close() {
          log.closed.contexts++
        },
      }
    },
    async close() {
      log.closed.browser++
    },
  }
  return { browser, log }
}

const options = { baseUrl: 'http://localhost:8888', routes: ['/', '/blog/'], widths: [1280, 390] }
const reachable = async () => undefined

describe('viewportFor', () => {
  it('uses a desktop height from 768px up and a phone height below', () => {
    expect(viewportFor(1280)).toEqual({ width: 1280, height: 800 })
    expect(viewportFor(390)).toEqual({ width: 390, height: 844 })
  })
})

describe('capturePages', () => {
  it('captures every route at every width by plain concatenation, one context per width', async () => {
    const { browser, log } = fakeBrowser()
    const result = await capturePages(options, {
      launch: async () => browser,
      checkReachable: reachable,
    })
    expect(result.failures).toEqual([])
    expect(result.shots.map((shot) => shot.name)).toEqual([
      'home-1280.png',
      'home-390.png',
      'blog-1280.png',
      'blog-390.png',
    ])
    expect(log.urls).toEqual([
      'http://localhost:8888/',
      'http://localhost:8888/',
      'http://localhost:8888/blog/',
      'http://localhost:8888/blog/',
    ])
    expect(log.viewports).toHaveLength(2)
    expect(result.shots[0]?.png).toBe(PNG)
  })

  it('keeps going when one route fails and lists the failure', async () => {
    const { browser } = fakeBrowser({ failOn: '/blog/' })
    const result = await capturePages(options, {
      launch: async () => browser,
      checkReachable: reachable,
    })
    expect(result.shots.map((shot) => shot.name)).toEqual(['home-1280.png', 'home-390.png'])
    expect(result.failures).toEqual([
      { route: '/blog/', width: 1280, message: 'net::ERR_TIMED_OUT' },
      { route: '/blog/', width: 390, message: 'net::ERR_TIMED_OUT' },
    ])
  })

  it('closes every page, context and the browser even when pages throw', async () => {
    const { browser, log } = fakeBrowser({ failOn: '/' })
    await capturePages(options, { launch: async () => browser, checkReachable: reachable })
    expect(log.closed).toEqual({ pages: 4, contexts: 2, browser: 1 })
  })

  it('records a failure instead of throwing when a context cannot be created', async () => {
    const browser: BrowserLike = {
      async newContext() {
        throw new Error('context boom')
      },
      async close() {},
    }
    const result = await capturePages(
      { ...options, routes: ['/'], widths: [1280] },
      { launch: async () => browser, checkReachable: reachable }
    )
    expect(result.shots).toEqual([])
    expect(result.failures[0]?.message).toBe('context boom')
  })

  it('stops before launching a browser when the site is unreachable', async () => {
    let launched = false
    await expect(
      capturePages(options, {
        checkReachable: async () => {
          throw new Error('site is down')
        },
        launch: async () => {
          launched = true
          return fakeBrowser().browser
        },
      })
    ).rejects.toThrow('site is down')
    expect(launched).toBe(false)
  })

  it('propagates a launch failure unchanged', async () => {
    await expect(
      capturePages(options, {
        checkReachable: reachable,
        launch: async () => {
          throw new Error('Could not start Chromium (x)')
        },
      })
    ).rejects.toThrow('Could not start Chromium')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @stratawp/testing exec vitest run src/__tests__/screenshots-capture.test.ts`
Expected: FAIL (cannot resolve `../screenshots/capture`).

- [ ] **Step 3: Give the reachability error an optional label**

Edit `packages/testing/src/global-setup.ts`. Change the signature and message:

```ts
export async function checkSiteReachable(
  url: string,
  fetchImpl: typeof fetch = fetch,
  context = 'smoke tests'
): Promise<void> {
```

and replace the thrown message prefix `StrataWP smoke tests: ${url} is not reachable (${detail}). ` with `StrataWP ${context}: ${url} is not reachable (${detail}). ` (keep the rest of the message unchanged, so the existing assertions on `wp-env start` and `WP_BASE_URL` still match).

- [ ] **Step 4: Implement `capture.ts`**

Create `packages/testing/src/screenshots/capture.ts`:

```ts
import { checkSiteReachable } from '../global-setup'
import { planShots } from './naming'
import type { CaptureOptions } from './options'

/** The slice of Playwright the capture loop uses, so tests can fake it without a browser. */
export interface PageLike {
  goto(url: string, options: { waitUntil: 'load'; timeout: number }): Promise<unknown>
  evaluate(script: string): Promise<unknown>
  screenshot(options: { type: 'png'; fullPage: boolean }): Promise<Uint8Array>
  close(): Promise<void>
}

export interface ContextLike {
  newPage(): Promise<PageLike>
  close(): Promise<void>
}

export interface BrowserLike {
  newContext(options: { viewport: { width: number; height: number } }): Promise<ContextLike>
  close(): Promise<void>
}

export interface CaptureDeps {
  launch: () => Promise<BrowserLike>
  checkReachable: (url: string) => Promise<void>
}

export interface Shot {
  route: string
  width: number
  name: string
  png: Uint8Array
}

export interface CaptureFailure {
  route: string
  width: number
  message: string
}

export interface CaptureResult {
  shots: Shot[]
  failures: CaptureFailure[]
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function viewportFor(width: number): { width: number; height: number } {
  return { width, height: width >= 768 ? 800 : 844 }
}

/**
 * Playwright is an optional peer, so it is loaded here and only here. Importing
 * this module must never fail because Playwright is missing.
 */
export async function launchChromium(): Promise<BrowserLike> {
  let playwright: typeof import('@playwright/test')
  try {
    playwright = await import('@playwright/test')
  } catch {
    throw new Error('Screenshots need Playwright. Install it with: pnpm add -D @playwright/test')
  }
  try {
    return (await playwright.chromium.launch()) as unknown as BrowserLike
  } catch (error) {
    throw new Error(
      `Could not start Chromium (${errorMessage(error)}). ` +
        'Install the browser with: pnpm exec playwright install chromium'
    )
  }
}

/**
 * Captures viewport-sized PNGs. One failing route or width is recorded and the
 * rest continue; an unreachable site or a missing browser throws once, up front.
 */
export async function capturePages(
  options: CaptureOptions,
  deps: Partial<CaptureDeps> = {}
): Promise<CaptureResult> {
  const checkReachable =
    deps.checkReachable ?? ((url: string) => checkSiteReachable(url, fetch, 'screenshots'))
  const launch = deps.launch ?? launchChromium

  await checkReachable(options.baseUrl)
  const browser = await launch()
  const contexts = new Map<number, ContextLike>()
  const result: CaptureResult = { shots: [], failures: [] }

  try {
    for (const planned of planShots(options.routes, options.widths)) {
      let page: PageLike | undefined
      try {
        let context = contexts.get(planned.width)
        if (!context) {
          context = await browser.newContext({ viewport: viewportFor(planned.width) })
          contexts.set(planned.width, context)
        }
        page = await context.newPage()
        await page.goto(`${options.baseUrl}${planned.route}`, {
          waitUntil: 'load',
          timeout: 30_000,
        })
        await page.evaluate('document.fonts.ready.then(() => undefined)')
        const png = await page.screenshot({ type: 'png', fullPage: false })
        result.shots.push({ ...planned, png })
      } catch (error) {
        result.failures.push({
          route: planned.route,
          width: planned.width,
          message: errorMessage(error),
        })
      } finally {
        await page?.close().catch(() => undefined)
      }
    }
  } finally {
    for (const context of contexts.values()) {
      await context.close().catch(() => undefined)
    }
    await browser.close().catch(() => undefined)
  }
  return result
}
```

- [ ] **Step 5: Run capture tests**

Run: `pnpm --filter @stratawp/testing exec vitest run src/__tests__/screenshots-capture.test.ts src/__tests__/smoke-config.test.ts`
Expected: PASS (the smoke-config reachability tests still pass after the label change).

- [ ] **Step 6: Write the failing runner tests**

Create `packages/testing/src/__tests__/screenshots-run.test.ts`:

```ts
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
    expect(Array.from(await readFile(join(cwd, 'shots', 'home-1280.png')))).toEqual(
      Array.from(PNG)
    )
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
    await runScreenshotsCli(['capture', '--out=shots'], io({ WP_BASE_URL: 'http://site.test/' }), deps(oneShot))
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

    await writeFile(join(cwd, 'package.json'), '﻿{"name":"x"}')
    expect(await runScreenshotsCli(['capture', '--out=shots'], io(), deps(oneShot))).toBe(0)
  })
})
```

- [ ] **Step 7: Run to verify failure**

Run: `pnpm --filter @stratawp/testing exec vitest run src/__tests__/screenshots-run.test.ts`
Expected: FAIL (cannot resolve `../screenshots/run`).

- [ ] **Step 8: Implement `run.ts`**

Create `packages/testing/src/screenshots/run.ts`:

```ts
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
      io.out(
        `Captured ${result.shots.length} screenshot(s) in ${relative(io.cwd, outDir) || '.'}:`
      )
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
```

- [ ] **Step 9: Add the public entry, the bin, and the build wiring**

Create `packages/testing/src/screenshots.ts`:

```ts
/**
 * Public `@stratawp/testing/screenshots` entry. Must not import Playwright at
 * load time (it is an optional peer); `capture.ts` loads it lazily.
 */
export * from './screenshots/options'
export * from './screenshots/naming'
export * from './screenshots/capture'
export { runScreenshotsCli, parseArgs, writeShots, USAGE } from './screenshots/run'
export type { RunIo, RunDeps } from './screenshots/run'
```

Create `packages/testing/src/screenshots-cli.ts`:

```ts
#!/usr/bin/env node
import { runScreenshotsCli } from './screenshots/run'

void runScreenshotsCli(process.argv.slice(2), {
  cwd: process.cwd(),
  env: process.env,
  out: (text) => console.log(text),
  err: (text) => console.error(text),
}).then((code) => {
  process.exitCode = code
})
```

In `packages/testing/tsup.config.ts` add two entries to `entry`:

```ts
    screenshots: 'src/screenshots.ts',
    'screenshots-cli': 'src/screenshots-cli.ts',
```

In `packages/testing/package.json` add a `bin` block after `"exports"` and a `./screenshots` export:

```json
  "bin": {
    "stratawp-screenshots": "./dist/screenshots-cli.js"
  },
```

```json
    "./screenshots": {
      "types": "./dist/screenshots.d.ts",
      "import": "./dist/screenshots.js"
    }
```

(the export goes inside the existing `exports` object, after `./config`). Add `.stratawp/` to the root `.gitignore` under the Testing section.

- [ ] **Step 10: Write the hygiene test**

Create `packages/testing/src/__tests__/screenshots-hygiene.test.ts`:

```ts
// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const src = fileURLToPath(new URL('..', import.meta.url))
const files = [
  join(src, 'screenshots.ts'),
  join(src, 'screenshots-cli.ts'),
  ...readdirSync(join(src, 'screenshots')).map((name) => join(src, 'screenshots', name)),
]

describe('screenshots entry points', () => {
  it.each(files)('%s has no static import of @playwright/test', (file) => {
    const source = readFileSync(file, 'utf8')
    const staticImport = /^\s*(?:import|export)\s(?!type\b)[^;]*from\s+['"]@playwright\/test['"]/m
    expect(source).not.toMatch(staticImport)
  })

  it('loads Playwright only through a dynamic import in capture.ts', () => {
    const source = readFileSync(join(src, 'screenshots', 'capture.ts'), 'utf8')
    expect(source).toMatch(/await import\('@playwright\/test'\)/)
  })
})
```

- [ ] **Step 11: Run all testing tests, build, typecheck, format**

Run: `pnpm --filter @stratawp/testing test && pnpm --filter @stratawp/testing build && pnpm --filter @stratawp/testing typecheck && pnpm exec prettier --check packages/testing/src packages/testing/package.json packages/testing/tsup.config.ts .gitignore`
Expected: all pass. Fix Prettier findings with `--write` on the touched paths only.

- [ ] **Step 12: Verify the built output**

Run:

```bash
head -1 packages/testing/dist/screenshots-cli.js
ls -l packages/testing/dist/screenshots-cli.js
grep -nE "^import .*@playwright/test" packages/testing/dist/screenshots.js packages/testing/dist/screenshots-cli.js || echo "no static playwright import"
node packages/testing/dist/screenshots-cli.js --help | head -3
node packages/testing/dist/screenshots-cli.js capture --routes=https://evil.example/; echo "exit=$?"
node packages/testing/dist/screenshots-cli.js capture --base-url=http://127.0.0.1:9; echo "exit=$?"
```

Expected: the first line is `#!/usr/bin/env node` and the file is executable; "no static playwright import"; usage text; exit 2 with the "not a site path" message; exit 1 with "StrataWP screenshots: http://127.0.0.1:9 is not reachable" and no stack trace.

- [ ] **Step 13: End-to-end capture against a local server**

Run (scratch dir for output; the server is a throwaway Node one-liner on port 8899):

```bash
SCRATCH=$(mktemp -d)
node -e "require('http').createServer((q,s)=>{s.setHeader('content-type','text/html');s.end('<h1>hello</h1>')}).listen(8899)" &
SRV=$!
sleep 1
node packages/testing/dist/screenshots-cli.js capture --base-url=http://127.0.0.1:8899 --routes=/,/about --widths=390 --out="$SCRATCH"; echo "exit=$?"
kill $SRV
ls -l "$SCRATCH"
```

Expected: if Chromium is installed (`pnpm exec playwright install chromium` was run before), exit 0 and two PNGs (`home-390.png`, `about-390.png`) larger than 1 KB. If Chromium is not installed, exit 1 with "Could not start Chromium (...). Install the browser with: pnpm exec playwright install chromium"; install it with `pnpm exec playwright install chromium` and re-run. Report which happened.

- [ ] **Step 14: Commit**

```bash
git add packages/testing/src/screenshots/capture.ts packages/testing/src/screenshots/run.ts packages/testing/src/screenshots.ts packages/testing/src/screenshots-cli.ts packages/testing/src/global-setup.ts packages/testing/tsup.config.ts packages/testing/package.json packages/testing/src/__tests__/screenshots-capture.test.ts packages/testing/src/__tests__/screenshots-run.test.ts packages/testing/src/__tests__/screenshots-hygiene.test.ts .gitignore
git commit -m "feat(testing): add the stratawp-screenshots capture command"
```

---

### Task 3: Visual compare preset, specs and scripts

**Files:**
- Modify: `packages/testing/src/config.ts` (add `createVisualConfig`, share helpers)
- Test: `packages/testing/src/__tests__/visual-config.test.ts`
- Create (example theme and each of the three templates): `playwright.visual.config.ts`, `e2e/visual/layout.visual.spec.ts`
- Modify: `examples/basic-theme/package.json` and the three `packages/cli/templates/*-theme/package.json` (`test:visual` script)
- Modify: `packages/cli/src/quality-gates-scaffold.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `createVisualConfig(options: VisualConfigOptions): PlaywrightTestConfig` from `@stratawp/testing/config`, with `interface VisualConfigOptions { testDir: string; baseURL?: string; maxDiffPixelRatio?: number }`; the `test:visual` script and `e2e/visual/layout.visual.spec.ts` that Task 4's `visual.yml` runs.

- [ ] **Step 1: Write the failing config tests**

Create `packages/testing/src/__tests__/visual-config.test.ts`:

```ts
// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { createVisualConfig } from '../config'

const original = process.env.WP_BASE_URL

afterEach(() => {
  if (original === undefined) delete process.env.WP_BASE_URL
  else process.env.WP_BASE_URL = original
})

describe('createVisualConfig', () => {
  it('runs Chromium only, on one worker, with baselines next to the specs', () => {
    const config = createVisualConfig({ testDir: './e2e/visual' })
    expect(config.projects?.map((project) => project.name)).toEqual(['chromium'])
    expect(config.workers).toBe(1)
    expect(config.testDir).toBe('./e2e/visual')
    expect(config.snapshotPathTemplate).toBe('{testDir}/__screenshots__/{testFileName}/{arg}{ext}')
  })

  it('defaults maxDiffPixelRatio to 0.01, disables animations, and accepts an override', () => {
    const base = createVisualConfig({ testDir: '.' })
    expect(base.expect?.toHaveScreenshot?.maxDiffPixelRatio).toBe(0.01)
    expect(base.expect?.toHaveScreenshot?.animations).toBe('disabled')
    const loose = createVisualConfig({ testDir: '.', maxDiffPixelRatio: 0.05 })
    expect(loose.expect?.toHaveScreenshot?.maxDiffPixelRatio).toBe(0.05)
  })

  it.each([-0.1, 1.5, Number.NaN])('rejects maxDiffPixelRatio %s', (ratio) => {
    expect(() => createVisualConfig({ testDir: '.', maxDiffPixelRatio: ratio })).toThrow(
      /maxDiffPixelRatio/
    )
  })

  it('resolves the base URL from the option, then WP_BASE_URL, then wp-env', () => {
    delete process.env.WP_BASE_URL
    expect(createVisualConfig({ testDir: '.' }).use?.baseURL).toBe('http://localhost:8888')
    process.env.WP_BASE_URL = 'http://env.test'
    expect(createVisualConfig({ testDir: '.' }).use?.baseURL).toBe('http://env.test')
    expect(createVisualConfig({ testDir: '.', baseURL: 'http://opt.test' }).use?.baseURL).toBe(
      'http://opt.test'
    )
  })

  it('does not retry (a retry would hide a flaky baseline)', () => {
    expect(createVisualConfig({ testDir: '.' }).retries).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @stratawp/testing exec vitest run src/__tests__/visual-config.test.ts`
Expected: FAIL (`createVisualConfig` is not exported).

- [ ] **Step 3: Implement `createVisualConfig`**

In `packages/testing/src/config.ts`, factor out two helpers and add the new factory. Replace the `createSmokeConfig` body's inline `baseURL` and `globalSetup` expressions with the helpers and append the new function:

```ts
const GLOBAL_SETUP = fileURLToPath(new URL('./global-setup.js', import.meta.url))

function resolveBaseURL(baseURL?: string): string {
  return baseURL ?? process.env.WP_BASE_URL ?? 'http://localhost:8888'
}

export interface VisualConfigOptions {
  /** Directory containing the visual specs, relative to the config file. */
  testDir: string
  /** Defaults to WP_BASE_URL, then the wp-env URL. */
  baseURL?: string
  /** Fraction of pixels allowed to differ (0 to 1). Default 0.01. */
  maxDiffPixelRatio?: number
}

/**
 * Opt-in visual compare: Chromium only, `toHaveScreenshot`, baselines under
 * `<testDir>/__screenshots__/`. Baselines are recorded on the CI runner (see
 * `.github/workflows/visual.yml`) so fonts and rendering match.
 */
export function createVisualConfig(options: VisualConfigOptions): PlaywrightTestConfig {
  const ratio = options.maxDiffPixelRatio ?? 0.01
  if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) {
    throw new Error(`createVisualConfig: maxDiffPixelRatio must be between 0 and 1 (got ${ratio})`)
  }

  return defineConfig({
    testDir: options.testDir,
    timeout: 60_000,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
    globalSetup: GLOBAL_SETUP,
    snapshotPathTemplate: '{testDir}/__screenshots__/{testFileName}/{arg}{ext}',
    expect: {
      toHaveScreenshot: { maxDiffPixelRatio: ratio, animations: 'disabled' },
    },
    use: { baseURL: resolveBaseURL(options.baseURL) },
    projects: [{ name: 'chromium', use: { ...DEVICES.chromium } }],
  })
}
```

and in `createSmokeConfig` change `const baseURL = options.baseURL ?? process.env.WP_BASE_URL ?? 'http://localhost:8888'` to `const baseURL = resolveBaseURL(options.baseURL)` and `globalSetup: fileURLToPath(new URL('./global-setup.js', import.meta.url)),` to `globalSetup: GLOBAL_SETUP,`.

- [ ] **Step 4: Run the config tests**

Run: `pnpm --filter @stratawp/testing exec vitest run src/__tests__/visual-config.test.ts src/__tests__/smoke-config.test.ts && pnpm --filter @stratawp/testing typecheck`
Expected: PASS.

- [ ] **Step 5: Add the visual config and spec to the example theme and the three templates**

Create `playwright.visual.config.ts` in `examples/basic-theme/` and in each of `packages/cli/templates/basic-theme/`, `advanced-theme/`, `store-theme/` (identical content):

```ts
import { createVisualConfig } from '@stratawp/testing/config'

export default createVisualConfig({ testDir: './e2e/visual' })
```

Create `e2e/visual/layout.visual.spec.ts` in the same four themes (identical content):

```ts
import { test, expect } from '@playwright/test'

// Opt-in visual compare. Baselines are recorded on CI (the "Visual" workflow,
// mode "record") and committed under e2e/visual/__screenshots__/.
const routes = [
  { name: 'home', path: '/' },
  { name: '404', path: '/this-page-does-not-exist-404/' },
]
const widths = [1280, 390]

for (const route of routes) {
  for (const width of widths) {
    test(`${route.name} at ${width}px matches the baseline`, async ({ page }) => {
      await page.setViewportSize({ width, height: width >= 768 ? 800 : 844 })
      await page.goto(route.path, { waitUntil: 'load' })
      await page.evaluate(() => document.fonts.ready)
      await expect(page).toHaveScreenshot(`${route.name}-${width}.png`)
    })
  }
}
```

Add `"test:visual": "playwright test --config playwright.visual.config.ts"` to `scripts` in `examples/basic-theme/package.json` and in the three template `package.json` files (after `test:e2e` in the templates, after `test:smoke` in the example), keeping 2-space JSON formatting and the existing key order otherwise.

- [ ] **Step 6: Extend the scaffold test**

In `packages/cli/src/quality-gates-scaffold.test.ts`, add `'playwright.visual.config.ts'` and `'e2e/visual/layout.visual.spec.ts'` to `REQUIRED_FILES`, and add an assertion next to the existing `test:e2e` one:

```ts
    expect(pkg.scripts['test:visual']).toBe('playwright test --config playwright.visual.config.ts')
```

Also add a test that the visual spec and config are byte-identical across the three templates and the example theme (so the four copies cannot drift):

```ts
  it('ships the same visual spec and config as the example theme', () => {
    const exampleDir = path.join(__dirname, '..', '..', '..', 'examples', 'basic-theme')
    for (const file of ['playwright.visual.config.ts', 'e2e/visual/layout.visual.spec.ts']) {
      expect(fs.readFileSync(path.join(templatePath, file), 'utf8')).toBe(
        fs.readFileSync(path.join(exampleDir, file), 'utf8')
      )
    }
  })
```

(place it inside the existing `describe.each(TEMPLATES)` block where `templatePath` is already defined).

- [ ] **Step 7: Run tests, typecheck, review, format**

Run:

```bash
pnpm --filter @stratawp/testing test
pnpm --filter @stratawp/cli test
pnpm build && pnpm typecheck && pnpm review
pnpm exec prettier --check packages/testing/src/config.ts packages/testing/src/__tests__/visual-config.test.ts examples/basic-theme/playwright.visual.config.ts examples/basic-theme/e2e/visual examples/basic-theme/package.json packages/cli/templates/basic-theme/playwright.visual.config.ts packages/cli/templates/basic-theme/e2e/visual packages/cli/templates/basic-theme/package.json packages/cli/templates/advanced-theme/playwright.visual.config.ts packages/cli/templates/advanced-theme/e2e/visual packages/cli/templates/advanced-theme/package.json packages/cli/templates/store-theme/playwright.visual.config.ts packages/cli/templates/store-theme/e2e/visual packages/cli/templates/store-theme/package.json packages/cli/src/quality-gates-scaffold.test.ts
```

Expected: all pass; `pnpm review` still reports 0 errors on the six themes.

- [ ] **Step 8: Prove the visual config loads and lists specs**

Run: `cd examples/basic-theme && pnpm exec playwright test --config playwright.visual.config.ts --list`
Expected: lists the four tests under the `chromium` project and exits 0. If `--list` still triggers the global setup reachability check and fails with "not reachable", note that behavior in the report and rely on CI (Task 4) for end-to-end verification.

- [ ] **Step 9: Commit**

```bash
git add packages/testing/src/config.ts packages/testing/src/__tests__/visual-config.test.ts examples/basic-theme/playwright.visual.config.ts examples/basic-theme/e2e/visual/layout.visual.spec.ts examples/basic-theme/package.json packages/cli/templates/basic-theme/playwright.visual.config.ts packages/cli/templates/basic-theme/e2e/visual/layout.visual.spec.ts packages/cli/templates/basic-theme/package.json packages/cli/templates/advanced-theme/playwright.visual.config.ts packages/cli/templates/advanced-theme/e2e/visual/layout.visual.spec.ts packages/cli/templates/advanced-theme/package.json packages/cli/templates/store-theme/playwright.visual.config.ts packages/cli/templates/store-theme/e2e/visual/layout.visual.spec.ts packages/cli/templates/store-theme/package.json packages/cli/src/quality-gates-scaffold.test.ts
git commit -m "feat(testing): add an opt-in visual compare preset and ship it in the themes"
```

---

### Task 4: Workflows (`visual.yml` and a capture step in `smoke.yml`)

**Files:**
- Create: `.github/workflows/visual.yml`
- Modify: `.github/workflows/smoke.yml`

**Interfaces:**
- Consumes: the `stratawp-screenshots` bin built into `packages/testing/dist/screenshots-cli.js` (Task 2); `playwright.visual.config.ts` and the `test:visual` spec in `examples/basic-theme` (Task 3).
- Produces: nothing code depends on. These can only be fully verified on CI.

- [ ] **Step 1: Add the capture step to `smoke.yml`**

In `.github/workflows/smoke.yml`, insert after the "Run smoke tests on all three engines" step and before "Upload Playwright report":

```yaml
      - name: Capture screenshots (home and 404, desktop and mobile)
        working-directory: examples/basic-theme
        run: node ../../packages/testing/dist/screenshots-cli.js capture --out .stratawp/screenshots

      - name: Upload screenshots
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: smoke-screenshots
          path: examples/basic-theme/.stratawp/screenshots
          retention-days: 7
          if-no-files-found: ignore
```

(The capture step fails the job if capture breaks; Chromium was installed by the existing "Install Playwright browsers" step.)

- [ ] **Step 2: Create `visual.yml`**

Create `.github/workflows/visual.yml`:

```yaml
name: Visual (record or compare baselines)

on:
  workflow_dispatch:
    inputs:
      mode:
        description: 'record writes baselines and uploads them as an artifact to commit; compare fails on any diff'
        type: choice
        options:
          - record
          - compare
        default: compare

permissions:
  contents: read

concurrency:
  group: visual-${{ github.ref }}
  cancel-in-progress: true

jobs:
  visual:
    name: Visual ${{ inputs.mode }} (Chromium, wp-env)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: pnpm

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.3'
          tools: composer:v2
          coverage: none

      - run: pnpm install --frozen-lockfile

      - name: Build the Vite plugin (theme build dependency)
        run: pnpm --filter @stratawp/vite-plugin build

      - name: Build the testing package (visual preset)
        run: pnpm --filter @stratawp/testing build

      - name: Prepare example theme (copy core into vendor, build assets)
        working-directory: examples/basic-theme
        env:
          COMPOSER_MIRROR_PATH_REPOS: '1'
        run: |
          composer install --no-interaction --no-progress
          pnpm build

      - name: Start WordPress (wp-env)
        run: pnpm exec wp-env start

      - name: Activate theme + enable pretty permalinks
        run: |
          pnpm exec wp-env run cli wp theme activate basic-theme
          pnpm exec wp-env run cli wp rewrite structure '/%postname%/' --hard
          pnpm exec wp-env run cli wp rewrite flush --hard

      - name: Install Playwright browser
        working-directory: examples/basic-theme
        run: pnpm exec playwright install --with-deps chromium

      - name: Wait for WordPress to be ready
        run: node scripts/wait-for-http.mjs http://localhost:8888/ 120000

      - name: Record baselines
        if: ${{ inputs.mode == 'record' }}
        working-directory: examples/basic-theme
        run: pnpm exec playwright test --config playwright.visual.config.ts --update-snapshots

      - name: Upload recorded baselines (download, commit under e2e/visual/__screenshots__)
        if: ${{ inputs.mode == 'record' }}
        uses: actions/upload-artifact@v4
        with:
          name: visual-baselines
          path: examples/basic-theme/e2e/visual/__screenshots__
          retention-days: 14
          if-no-files-found: error

      - name: Compare against the committed baselines
        if: ${{ inputs.mode == 'compare' }}
        working-directory: examples/basic-theme
        run: pnpm exec playwright test --config playwright.visual.config.ts

      - name: Upload Playwright report
        if: ${{ inputs.mode == 'compare' && !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: playwright-visual-report
          path: examples/basic-theme/playwright-report
          retention-days: 7
          if-no-files-found: ignore
```

- [ ] **Step 3: Validate both files**

Run:

```bash
python3 -c "import yaml; [yaml.safe_load(open(f)) for f in ('.github/workflows/visual.yml', '.github/workflows/smoke.yml')]; print('yaml ok')"
pnpm exec prettier --check .github/workflows/visual.yml .github/workflows/smoke.yml
grep -n "visual" .github/workflows/ci.yml || echo "ci.yml does not reference visual (expected)"
```

Expected: `yaml ok`, Prettier clean (run `--write` on those two paths if it reports them), and the grep confirms `visual.yml` is dispatch-only and not wired into `ci.yml`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/visual.yml .github/workflows/smoke.yml
git commit -m "ci: add a dispatch-only visual workflow and a screenshot capture step to smoke"
```

---

### Task 5: MCP `capture_screenshots` tool and `stratawp screenshots` command

**Files:**
- Modify: `packages/mcp/package.json` (dependency on `@stratawp/testing`), `pnpm-lock.yaml`
- Modify: `packages/mcp/src/tools.ts`, `packages/mcp/src/server.ts`, `packages/mcp/src/server.test.ts`
- Modify: `packages/mcp/contracts/tools.snapshot.json` (regenerated)
- Create: `packages/cli/src/commands/screenshots.ts`
- Modify: `packages/cli/src/index.ts`
- Test: `packages/cli/src/__tests__/screenshots-command.test.ts`

**Interfaces:**
- Consumes (Tasks 1 and 2): from `@stratawp/testing/screenshots`: `capturePages`, `resolveCaptureOptions`, `ScreenshotOptionsError`, types `CaptureOptions`, `CaptureResult`.
- Produces:
  - `interface ToolDeps { capturePages?: (options: CaptureOptions) => Promise<CaptureResult> }`; `registerTools(server: McpServer, deps?: ToolDeps): void`; `createServer(rootDir?: string, deps?: ToolDeps): McpServer`.
  - MCP tool `capture_screenshots({ baseUrl: string, routes?: string[], widths?: number[] })` returning `structuredContent: { captured: {route,width,name,bytes}[], failures: {route,width,message}[] }` and `content` of one summary text block followed by a label text and a `{ type: 'image', mimeType: 'image/png', data }` block per shot.
  - Exports `MAX_SCREENSHOTS_PER_CALL = 6` and `MAX_WIDTHS_PER_CALL = 2` from `tools.ts`.
  - CLI command `stratawp screenshots [--routes <list>] [--widths <list>] [--out <dir>] [--base-url <url>]` backed by `screenshotsCommand` and `buildArgs`.

- [ ] **Step 1: Write the failing CLI wrapper tests**

Create `packages/cli/src/__tests__/screenshots-command.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @stratawp/cli exec vitest run src/__tests__/screenshots-command.test.ts`
Expected: FAIL (cannot resolve `../commands/screenshots.js`).

- [ ] **Step 3: Implement the CLI wrapper and register it**

Create `packages/cli/src/commands/screenshots.ts`:

```ts
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
```

In `packages/cli/src/index.ts`, add the import next to the other command imports (`import { screenshotsCommand } from './commands/screenshots.js'`, matching how `themeReviewCommand` is imported) and register after the `theme:review` command:

```ts
program
  .command('screenshots')
  .description('Capture viewport screenshots of a running site (home and 404 by default)')
  .option('--routes <list>', 'Comma-separated site paths, e.g. /,/blog')
  .option('--widths <list>', 'Comma-separated viewport widths, e.g. 1280,390')
  .option('--out <dir>', 'Output directory (default .stratawp/screenshots)')
  .option('--base-url <url>', 'Site URL (default WP_BASE_URL, then http://localhost:8888)')
  .action(screenshotsCommand)
```

- [ ] **Step 4: Run the CLI tests**

Run: `pnpm --filter @stratawp/cli exec vitest run src/__tests__/screenshots-command.test.ts && pnpm --filter @stratawp/cli typecheck`
Expected: PASS.

- [ ] **Step 5: Write the failing MCP tests**

In `packages/mcp/src/server.test.ts`, change the `connect` helper to accept an optional second argument and pass it through to `createServer`:

```ts
async function connect(
  rootDir?: string,
  deps?: ToolDeps
): Promise<{ client: Client; negotiatedVersion: string | undefined }> {
```

(add `import type { ToolDeps } from './tools'` and change the `createServer(rootDir)` call inside to `createServer(rootDir, deps)`). Update the first test, "exposes the scaffold_* and theme review tools, each with an inputSchema", so its expected tool-name list also contains `capture_screenshots`. Then append a new describe block:

```ts
describe('@stratawp/mcp capture_screenshots tool', () => {
  const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
  const shot = (route: string, width: number, name: string) => ({ route, width, name, png: PNG })

  function fakeDeps(result: {
    shots: ReturnType<typeof shot>[]
    failures: Array<{ route: string; width: number; message: string }>
  }) {
    const calls: unknown[] = []
    const deps: ToolDeps = {
      capturePages: async (options) => {
        calls.push(options)
        return result
      },
    }
    return { deps, calls }
  }

  it('returns image content (valid base64 PNG) plus structured results', async () => {
    const { deps, calls } = fakeDeps({ shots: [shot('/', 1280, 'home-1280.png')], failures: [] })
    const { client } = await connect(undefined, deps)
    const res = await client.callTool({
      name: 'capture_screenshots',
      arguments: { baseUrl: 'http://localhost:8888', routes: ['/'], widths: [1280] },
    })
    expect(res.isError).toBeFalsy()
    expect(calls).toHaveLength(1)
    const images = (res.content as Array<{ type: string; data?: string; mimeType?: string }>).filter(
      (block) => block.type === 'image'
    )
    expect(images).toHaveLength(1)
    expect(images[0]?.mimeType).toBe('image/png')
    expect(Array.from(Buffer.from(images[0]?.data ?? '', 'base64'))).toEqual(Array.from(PNG))
    expect(res.structuredContent).toEqual({
      captured: [{ route: '/', width: 1280, name: 'home-1280.png', bytes: PNG.byteLength }],
      failures: [],
    })
  })

  it('uses the documented defaults (home and 404 at 1280 and 390 = 4 images)', async () => {
    const { deps, calls } = fakeDeps({ shots: [shot('/', 1280, 'home-1280.png')], failures: [] })
    const { client } = await connect(undefined, deps)
    await client.callTool({
      name: 'capture_screenshots',
      arguments: { baseUrl: 'http://localhost:8888' },
    })
    expect(calls[0]).toEqual({
      baseUrl: 'http://localhost:8888',
      routes: ['/', '/this-page-does-not-exist-404/'],
      widths: [1280, 390],
    })
  })

  it('treats a partial failure as a result, listing the failure', async () => {
    const failure = { route: '/blog', width: 1280, message: 'timeout' }
    const { deps } = fakeDeps({ shots: [shot('/', 1280, 'home-1280.png')], failures: [failure] })
    const { client } = await connect(undefined, deps)
    const res = await client.callTool({
      name: 'capture_screenshots',
      arguments: { baseUrl: 'http://localhost:8888', routes: ['/', '/blog'], widths: [1280] },
    })
    expect(res.isError).toBeFalsy()
    expect((res.structuredContent as { failures: unknown[] }).failures).toEqual([failure])
  })

  it('returns an error result when every capture failed', async () => {
    const failure = { route: '/', width: 1280, message: 'timeout' }
    const { deps } = fakeDeps({ shots: [], failures: [failure] })
    const { client } = await connect(undefined, deps)
    const res = await client.callTool({
      name: 'capture_screenshots',
      arguments: { baseUrl: 'http://localhost:8888', routes: ['/'], widths: [1280] },
    })
    expect(res.isError).toBe(true)
    expect(JSON.stringify(res.content)).toMatch(/FAILED \/ at 1280px: timeout/)
  })

  it.each([
    ['more than 2 widths', { routes: ['/'], widths: [1280, 768, 390] }, /at most 2 widths/],
    [
      'more than 6 images',
      { routes: ['/a', '/b', '/c', '/d'], widths: [1280, 390] },
      /at most 6 screenshots/,
    ],
    ['a full-URL route', { routes: ['https://evil.example/'] }, /not a site path/],
    ['a protocol-relative route', { routes: ['//evil.example/'] }, /not a site path/],
    ['a bad width', { widths: [50] }, /is not a width/],
  ])('rejects %s without capturing', async (_label, extra, message) => {
    const { deps, calls } = fakeDeps({ shots: [], failures: [] })
    const { client } = await connect(undefined, deps)
    const res = await client.callTool({
      name: 'capture_screenshots',
      arguments: { baseUrl: 'http://localhost:8888', ...extra },
    })
    expect(res.isError).toBe(true)
    expect(JSON.stringify(res.content)).toMatch(message)
    expect(calls).toHaveLength(0)
  })

  it.each(['file:///etc/passwd', 'http://user:pw@localhost:8888', 'not a url'])(
    'rejects the baseUrl %s without capturing',
    async (baseUrl) => {
      const { deps, calls } = fakeDeps({ shots: [], failures: [] })
      const { client } = await connect(undefined, deps)
      const res = await client.callTool({ name: 'capture_screenshots', arguments: { baseUrl } })
      expect(res.isError).toBe(true)
      expect(calls).toHaveLength(0)
    }
  )

  it('returns an error result when capture itself throws (site down)', async () => {
    const { client } = await connect(undefined, {
      capturePages: async () => {
        throw new Error('StrataWP screenshots: http://localhost:8888 is not reachable')
      },
    })
    const res = await client.callTool({
      name: 'capture_screenshots',
      arguments: { baseUrl: 'http://localhost:8888' },
    })
    expect(res.isError).toBe(true)
    expect(JSON.stringify(res.content)).toMatch(/is not reachable/)
  })
})
```

- [ ] **Step 6: Add the dependency and run to verify failure**

In `packages/mcp/package.json` add `"@stratawp/testing": "workspace:*"` to `dependencies` (alphabetical, after `@stratawp/explorer`), then run `pnpm install` (the lockfile updates; this is expected and will be staged). Then:

Run: `pnpm --filter @stratawp/testing build && pnpm --filter @stratawp/mcp exec vitest run src/server.test.ts`
Expected: FAIL (`ToolDeps` and the `capture_screenshots` tool do not exist yet).

- [ ] **Step 7: Implement the tool**

In `packages/mcp/src/tools.ts`, add to the imports:

```ts
import {
  capturePages,
  resolveCaptureOptions,
  ScreenshotOptionsError,
  type CaptureOptions,
  type CaptureResult,
} from '@stratawp/testing/screenshots'
```

Update the header docblock with a line: `The \`capture_screenshots\` tool drives headless Chromium over the given site and returns images in memory; it writes no files.` Add above `registerTools`:

```ts
export const MAX_SCREENSHOTS_PER_CALL = 6
export const MAX_WIDTHS_PER_CALL = 2

/** Test seam: lets tests replace the browser-backed capture. */
export interface ToolDeps {
  capturePages?: (options: CaptureOptions) => Promise<CaptureResult>
}
```

Change the signature to `export function registerTools(server: McpServer, deps: ToolDeps = {}): void {` and register the tool at the end of the function body (after `detect_theme_type`):

```ts
  server.registerTool(
    'capture_screenshots',
    {
      title: 'Capture viewport screenshots of a running site',
      description:
        'Opens a running WordPress site in headless Chromium and returns viewport-sized PNG screenshots (not full-page) as image content. Read-only: it sends GET requests to the site and writes no files. Limits: at most 6 images per call (routes x widths) and at most 2 widths. Defaults: routes "/" and a 404 page; widths 1280 and 390. The site must already be running (for example wp-env on http://localhost:8888).',
      inputSchema: {
        baseUrl: z
          .string()
          .describe('Base URL of the running site, http or https, e.g. http://localhost:8888'),
        routes: z
          .array(z.string())
          .optional()
          .describe('Site paths that start with "/"; defaults to "/" and a 404 route'),
        widths: z
          .array(z.number().int())
          .optional()
          .describe('Viewport widths in pixels, at most 2; defaults to 1280 and 390'),
      },
      outputSchema: {
        captured: z.array(
          z.object({
            route: z.string(),
            width: z.number(),
            name: z.string(),
            bytes: z.number(),
          })
        ),
        failures: z.array(z.object({ route: z.string(), width: z.number(), message: z.string() })),
      },
    },
    async ({ baseUrl, routes, widths }) => {
      try {
        const options = resolveCaptureOptions({ baseUrl, routes, widths }, {})
        if (options.widths.length > MAX_WIDTHS_PER_CALL) {
          throw new ScreenshotOptionsError(
            `at most ${MAX_WIDTHS_PER_CALL} widths per call (got ${options.widths.length})`
          )
        }
        const total = options.routes.length * options.widths.length
        if (total > MAX_SCREENSHOTS_PER_CALL) {
          throw new ScreenshotOptionsError(
            `at most ${MAX_SCREENSHOTS_PER_CALL} screenshots per call (got ${total}: ${options.routes.length} routes x ${options.widths.length} widths)`
          )
        }

        const result = await (deps.capturePages ?? capturePages)(options)
        const failureLines = result.failures.map(
          (failure) => `FAILED ${failure.route} at ${failure.width}px: ${failure.message}`
        )
        if (result.shots.length === 0) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: ['No screenshots were captured.', ...failureLines].join('\n'),
              },
            ],
          }
        }

        const captured = result.shots.map(({ route, width, name, png }) => ({
          route,
          width,
          name,
          bytes: png.byteLength,
        }))
        return {
          structuredContent: { captured, failures: result.failures },
          content: [
            {
              type: 'text' as const,
              text: [
                `Captured ${captured.length} of ${total} screenshot(s) from ${options.baseUrl}.`,
                ...failureLines,
              ].join('\n'),
            },
            ...result.shots.flatMap((shot) => [
              {
                type: 'text' as const,
                text: `${shot.name} (${shot.route} at ${shot.width}px)`,
              },
              {
                type: 'image' as const,
                data: Buffer.from(shot.png).toString('base64'),
                mimeType: 'image/png',
              },
            ]),
          ],
        }
      } catch (error) {
        return {
          isError: true,
          content: [
            { type: 'text' as const, text: error instanceof Error ? error.message : String(error) },
          ],
        }
      }
    }
  )
```

In `packages/mcp/src/server.ts` change the signature and call:

```ts
import { registerTools, type ToolDeps } from './tools'

export function createServer(rootDir?: string, deps?: ToolDeps): McpServer {
  ...
  registerTools(server, deps)
```

- [ ] **Step 8: Run MCP tests, build, regenerate the snapshot**

Run:

```bash
pnpm --filter @stratawp/mcp exec vitest run
pnpm --filter @stratawp/mcp typecheck
pnpm --filter @stratawp/mcp build
pnpm --filter @stratawp/mcp snapshot
pnpm contracts:check
git diff --stat packages/mcp/contracts/tools.snapshot.json
```

Expected: all MCP tests pass (including the built-bin stdout hygiene test); the snapshot diff is additions only (the new `capture_screenshots` tool). `contracts:check` runs `git diff --exit-code` on the snapshot, so if it reports drift only because the regenerated file is uncommitted, commit first (Step 10) and re-run it.

- [ ] **Step 9: Format and full-package checks**

Run:

```bash
pnpm exec prettier --check packages/mcp/src packages/mcp/package.json packages/mcp/contracts/tools.snapshot.json packages/cli/src/commands/screenshots.ts packages/cli/src/index.ts packages/cli/src/__tests__/screenshots-command.test.ts
pnpm --filter @stratawp/cli test
pnpm build && pnpm typecheck
```

Expected: all pass (`pnpm exec prettier --write` on the listed paths if needed).

- [ ] **Step 10: Commit**

```bash
git add packages/mcp/package.json pnpm-lock.yaml packages/mcp/src/tools.ts packages/mcp/src/server.ts packages/mcp/src/server.test.ts packages/mcp/contracts/tools.snapshot.json packages/cli/src/commands/screenshots.ts packages/cli/src/index.ts packages/cli/src/__tests__/screenshots-command.test.ts
git commit -m "feat(mcp,cli): add the capture_screenshots tool and the screenshots command"
```

Then re-run `pnpm contracts:check` and confirm it exits 0.

---

### Task 6: Agent layer, docs, changeset, decision log and final verification

**Files:**
- Create: `.ai/skills/visual-checks/SKILL.md` (root) and `packages/cli/templates/{basic,advanced,store}-theme/.ai/skills/visual-checks/SKILL.md`
- Modify: `.ai/SKILLS.md` (root and the three templates' copies), `AGENTS.md` (root and templates), `.aiignore` (root and templates), `packages/testing/README.md`
- Modify: `docs/ai-tooling.md`, `CLAUDE.md`, `.ai/PROJECT_RULES.md`, `docs/superpowers/specs/2026-10-05-ai-tooling-design.md`
- Create: `.changeset/ai-tooling-visual.md`

**Interfaces:**
- Consumes: everything from Tasks 1 to 5 (names, flags, tool contract).
- Produces: documentation only.

- [ ] **Step 1: Mirror the PR 1 agent-layer shape**

Run `git show 5912be9 --stat` and read the diff of `.ai/skills/theme-review/SKILL.md`, the template copy, `.ai/SKILLS.md`, `AGENTS.md` and `.aiignore` handling in that commit, so the new files follow the same split: the root skill is written for people changing the monorepo; the template skill is written for someone working inside a generated theme. Template agent files must stay byte-identical across the three templates (check with `cmp`).

- [ ] **Step 2: Write the skills**

Root `.ai/skills/visual-checks/SKILL.md` (front matter in the same form as the theme-review skill: `description` and `globs`), covering:

- What it is: screenshots for looking at a theme (capture) and an opt-in compare gate (visual). Never a default blocking gate.
- Capture: `stratawp-screenshots capture` (flags `--routes`, `--widths`, `--out`, `--base-url`), defaults from `package.json` `stratawp.screenshots`, output `.stratawp/screenshots/`, needs a running site and Chromium (`pnpm exec playwright install chromium`), exit codes 0/1/2. MCP: `capture_screenshots` returns images; limits (6 images, 2 widths, viewport-sized); read-only; the site must already be running.
- Compare: `pnpm test:visual` in a theme; baselines under `e2e/visual/__screenshots__/`; **never record baselines locally**; record on CI with the Visual workflow (Actions, "Visual", mode `record`), download the `visual-baselines` artifact, commit it; mode `compare` fails on a diff.
- Hard rules: do not commit `.stratawp/`; do not hand-edit baselines; do not raise `maxDiffPixelRatio` to silence a failure without asking the maintainer; keep MCP tools read-only; regenerate the contract snapshot (`pnpm --filter @stratawp/mcp snapshot`) when the tool schema changes.
- Monorepo-only section: where the code lives (`packages/testing/src/screenshots/`, `src/config.ts`), how to add an option (parse in `options.ts` with a test, thread through `run.ts`, the CLI wrapper and the MCP schema together).

The three template copies describe usage inside a generated theme only (no monorepo paths): the `pnpm exec stratawp-screenshots` commands, `pnpm test:visual`, the baseline rules, and when to use which.

Update `.ai/SKILLS.md` (root and templates) with a one-line entry beside Theme Review, and add a sentence to `AGENTS.md` (root and templates; pillar 5 or the MCP paragraph, matching where the `review_theme` mention landed in commit 5912be9) naming `capture_screenshots` and pointing at the skill. Add `**/__screenshots__/` to `.aiignore` (root and the three templates) with a comment that PNG baselines are not for agents to read.

- [ ] **Step 3: Docs**

Extend `docs/ai-tooling.md` with a "Screenshots and visual checks" section: capture command and flags with an example; the `package.json` `stratawp.screenshots` block (`routes`, `widths`) and precedence (flag, then package.json, then env for base URL, then defaults); exit codes; the MCP tool (input, output shape, caps, read-only); `stratawp screenshots`; compare (`createVisualConfig` options, `test:visual`, the Visual workflow `record` and `compare` modes with the exact record, download and commit steps, why baselines are recorded on CI); the smoke job's capture step and `smoke-screenshots` artifact. Add a short "Why compare is opt-in" paragraph (pixel diffs flake across machines).

Add a "Screenshots" paragraph to `packages/testing/README.md` documenting the bin, the `./screenshots` entry and `createVisualConfig`. In `CLAUDE.md`: add `stratawp screenshots` under the CLI command list, add `pnpm test:visual` (note: needs baselines recorded on CI) next to the smoke command in the Testing block, extend the `@stratawp/testing` line in the monorepo structure list with "screenshots and visual compare", and add `capture_screenshots` to the MCP sentence in the AI-assisted development section.

- [ ] **Step 4: Changeset**

Create `.changeset/ai-tooling-visual.md`:

```md
---
'@stratawp/testing': minor
'@stratawp/cli': minor
'create-stratawp': minor
---

Add `stratawp-screenshots` (viewport screenshots of a running site, also via `stratawp screenshots`) and `createVisualConfig`, an opt-in Chromium visual compare preset. Generated themes ship a `test:visual` script, a visual spec and the `visual-checks` agent skill.
```

Run `pnpm exec changeset status` and confirm minor bumps for exactly those three packages (and that `@stratawp/mcp`, being private, is not required).

- [ ] **Step 5: Decision log and spec amendments**

Add a dated entry (2026-10-05) to `.ai/PROJECT_RULES.md` in the existing decision-log format, covering: capture core returns buffers and only the CLI writes files (MCP stays read-only); CLI wrapper shells out to `pnpm exec stratawp-screenshots` rather than depending on `@stratawp/testing`; MCP depends on `@stratawp/testing` (private package) and imports only the `./screenshots` subpath with Playwright loaded lazily; compare is opt-in, Chromium only, baselines recorded on CI and never locally; routes are plain paths concatenated onto the base URL and full URLs are rejected; caps (6 images, 2 widths); `__screenshots__` is in `.aiignore`.

Amend `docs/superpowers/specs/2026-10-05-ai-tooling-design.md`: in B1 note flag, then `package.json`, then env precedence and that routes must be paths; in B2 give the exact baseline path template and `retries: 0`; in B3 say `stratawp screenshots` runs the theme's own `stratawp-screenshots` bin through `pnpm exec`, and that `capture_screenshots` writes no files; add the `visual-checks` template copies to the Testing section; add to Release notes that `@stratawp/testing` and `@stratawp/cli` both bump minor, that the templates pin the new `@stratawp/testing` range (so it must be on the registry before the CLI is published), and that `visual.yml` can only be dispatched once it is on the default branch, so the first `record` run happens after merge.

- [ ] **Step 6: Final verification**

Run, in order, and report each result honestly:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm lint
pnpm lint:css
pnpm review
pnpm contracts:check
pnpm test
pnpm exec prettier --check .changeset/ai-tooling-visual.md docs/ai-tooling.md CLAUDE.md AGENTS.md .ai packages/testing/README.md docs/superpowers/specs/2026-10-05-ai-tooling-design.md
for t in advanced store; do cmp packages/cli/templates/basic-theme/AGENTS.md packages/cli/templates/$t-theme/AGENTS.md; cmp packages/cli/templates/basic-theme/.ai/skills/visual-checks/SKILL.md packages/cli/templates/$t-theme/.ai/skills/visual-checks/SKILL.md; done
git log --format=%B main..HEAD | grep -ciE 'co-authored|generated with'
grep -rniE 'wprig' --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.superpowers . | head
```

Expected: every command passes; `pnpm review` shows 0 errors on all six themes; the `cmp` calls print nothing; the attribution count is `0`; the last grep prints nothing. `pnpm format:check` may flag only git-ignored `.superpowers` scratch files; run Prettier directly on the files you changed instead of treating that as a failure. `pnpm test:visual` and the capture step in `smoke.yml` and `visual.yml` can only be verified on CI (no Docker locally); say so.

- [ ] **Step 7: Commit**

```bash
git add .ai/skills/visual-checks/SKILL.md packages/cli/templates/basic-theme/.ai/skills/visual-checks/SKILL.md packages/cli/templates/advanced-theme/.ai/skills/visual-checks/SKILL.md packages/cli/templates/store-theme/.ai/skills/visual-checks/SKILL.md .ai/SKILLS.md .ai/PROJECT_RULES.md AGENTS.md .aiignore packages/cli/templates/basic-theme/.ai/SKILLS.md packages/cli/templates/advanced-theme/.ai/SKILLS.md packages/cli/templates/store-theme/.ai/SKILLS.md packages/cli/templates/basic-theme/AGENTS.md packages/cli/templates/advanced-theme/AGENTS.md packages/cli/templates/store-theme/AGENTS.md packages/cli/templates/basic-theme/.aiignore packages/cli/templates/advanced-theme/.aiignore packages/cli/templates/store-theme/.aiignore packages/testing/README.md docs/ai-tooling.md CLAUDE.md docs/superpowers/specs/2026-10-05-ai-tooling-design.md .changeset/ai-tooling-visual.md
git commit -m "docs: document screenshots and visual checks, add the visual-checks skill and changeset"
```

(If a template does not have one of the listed files, for example `.ai/SKILLS.md`, drop that path from `git add` rather than creating the file, and say so in the report.)

- [ ] **Step 8: PR hand-off notes (write to the report file)**

Write, in the task report, the PR description material: summary of the six tasks; the CI-only verification caveat; the checklist items "run Visual workflow in `record` mode after merge, download `visual-baselines`, commit under `e2e/visual/__screenshots__/` (example theme and, if wanted, the templates)"; release notes (testing, cli, create-stratawp minor; no new package so no first-publish or trusted-publisher step; the CLI pins the new `@stratawp/testing` range, so publish order matters until `ci-publish.mjs` is reordered, a known follow-up); the known follow-ups (MCP strict tests depending on `basic-theme` warnings; reorder `ci-publish.mjs`; regenerate theme screenshots to 1200x900 and add `readme.txt`).

---

## Self-review (run against the spec)

- **B1 capture:** flags, defaults from `package.json`, `.stratawp/screenshots/` ignored, reuse of `checkSiteReachable`, one failing route does not stop others, non-zero exit on failure: Tasks 1 and 2.
- **B2 compare:** `createVisualConfig({ testDir, baseURL?, maxDiffPixelRatio? })`, Chromium only, `toHaveScreenshot`, baselines under `e2e/visual/__screenshots__/`, spec and `test:visual` in the example and templates, no baselines committed, `visual.yml` dispatch-only with `record` and `compare`, baselines recorded on the CI runner: Tasks 3 and 4.
- **B3 MCP, CLI, skill:** `capture_screenshots` with image content and caps (6 images, 2 widths, viewport-sized), snapshot regenerated, `stratawp screenshots`, `visual-checks` skill: Tasks 5 and 6.
- **Testing section:** unit tests for parsing, naming and failure aggregation with no browser (Tasks 1, 2); the `smoke.yml` capture step that fails the job if capture breaks (Task 4); compare verified only on CI (stated in Tasks 3, 4 and 6).
- **Rollout order:** capture command (1, 2), visual factory, spec and workflow (3, 4 first half), capture step in smoke (4), MCP tool and CLI wrapper (5), skill, docs and changeset (6). The visual workflow and the smoke step share Task 4 because they edit the same directory and are verified the same way (CI only).
- **Placeholders:** none; every code step contains the code. Task 6's prose steps (skills, docs) name exact contents because they are documents, with the PR 1 commit as the structural reference.
- **Type consistency:** `CaptureOptions`, `CaptureResult`, `Shot`, `CaptureFailure`, `ToolDeps`, `resolveCaptureOptions(input, env, config?)`, `capturePages(options, deps?)`, `runScreenshotsCli(argv, io, deps?)` and `createServer(rootDir?, deps?)` are used with the same signatures across Tasks 1, 2 and 5.
- **Review Focus coverage:** items 1, 2, 6 in Task 1/2 tests; 3, 4 in Task 2 tests and the Step 12/13 checks; 5 in Task 5 tests.
