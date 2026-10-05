# AI Tooling PR 1 (Review, Type Detection, Agent Layer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@stratawp/theme-review` (a dependency-light theme checker with a theme-type detector), a blocking CI self-check over the six StrataWP themes, the review MCP tools and CLI command, the agent layer (skill, `AGENTS.md`, `ai-setup` theme-type recording, directions file), and the template wiring.

**Architecture:** A new pure-Node package holds the rule engine (13 registered rules, each tagged with the theme types it applies to), the detector, a text/JSON formatter and a `stratawp-review` command. `@stratawp/cli` and `@stratawp/mcp` wrap it. Templates depend on it and run it through `pnpm review`. Heuristic rules are warnings; only errors (and warnings under `--strict`) fail.

**Tech Stack:** TypeScript, tsup, Vitest, Node built-ins only (no runtime dependencies), `@modelcontextprotocol/sdk` + zod (MCP), commander (CLI), pnpm and Turborepo.

**Spec:** `docs/superpowers/specs/2026-10-05-ai-tooling-design.md` (Workstream A). Workstream B (screenshots and visual compare) gets its own plan after this PR is reviewed.

## Global Constraints

- pnpm only. Never `npm` or `yarn`.
- Stage files by **explicit path**, never `git add -A` or `git add .`.
- No attribution of any kind in commit messages or PR text: no `Co-Authored-By`, no "Generated with" line.
- No mention of any external project in code, comments, docs, commits, or branch names.
- All work is on branch `feat/ai-tooling` (the approved spec is already committed there).
- `@stratawp/theme-review` has **no runtime dependencies** (Node built-ins only).
- Heuristic rules (THEME-008, 009, 011) are warnings so only `--strict` fails on them. Errors fail the command.
- Exit codes: 0 pass, 1 errors (or warnings under `--strict`), 2 usage or file problem.
- Review JSON shape (snapshot-tested): `{ themeDir, themeType, typeSource: "detected"|"override", summary: { errors, warnings, infos }, findings: [{ ruleId, severity, message, file?, line? }], disclaimer }`.
- Config lives in the theme's `package.json` under `stratawp`: `themeType`, `review.ignore` (globs), `review.rules` (severity overrides `off|info|warn|error`). Always ignored: `vendor/`, `node_modules/`, `dist/`, `*-generated.*`.
- The six StrataWP themes (3 examples, 3 CLI templates) must have **zero review errors** before the CI step is enabled. If the measured error count exceeds 10, stop and ask the maintainer before changing any theme.
- MCP constraints carried from the earlier AI-readiness spec: stdio transport, all logging to stderr, read-only tools, contract-first snapshot regenerated and committed.
- `@stratawp/theme-review` is a **new published package**: first publish is manual from the maintainer's Terminal (security-key approval), then the trusted-publisher entry with "Allow npm publish" ticked, before the release tag. `@stratawp/mcp` is private.
- Prettier (`pnpm format:check`) covers `ts`, `tsx`, `md`, `json`; run `pnpm exec prettier --write` on files you create before committing. ESLint (`pnpm lint`) covers `packages/**` TypeScript and scripts.

## Review Focus

Spec-implied conditions no headline test covers. Each has a pinned test in the owning task.

1. The theme directory does not exist, or `stratawp.themeType` / a rule severity in `package.json` is invalid: one clear message and exit 2, never a stack trace (Tasks 1 and 5).
2. A rule that throws on an odd file is isolated: reported as an `INTERNAL` warning while every other rule still runs (Task 5).
3. `style.css` with Windows line endings, or header lines without leading asterisks, still parses (Tasks 2 and 3).
4. PHP files with apostrophes in HTML text, `//` inside URL strings, and commented-out code produce no false findings (Tasks 2 and 4).
5. A symlink loop inside the theme directory is not followed and does not hang (Task 2).

## Deviations from the spec (flagged for the maintainer)

- **Fixtures:** test themes are built per test in temp directories by a helper instead of committed `__fixtures__/` folders. Same coverage, less file noise.
- **`ai-setup`:** the template copy already has a `claude` target and Codex is already listed as native, and the monorepo root is not a theme. So no new targets are added; the change is theme-type recording in the three template copies only (which are byte-identical to each other).
- **CI:** the self-check is a new step in the existing `js` job (after `pnpm build`), not a separate job. It blocks identically and reuses the build.
- **`INTERNAL` finding severity:** a crashing rule is a `warning`, so a bug in the tool never fails a user's CI by itself.
- **Template dependency pin:** `templateDependencies` gets a hand-stamped `^0.0.0` placeholder for `@stratawp/theme-review`, because the 0.0.0 guard in `sync-template-vendor.mjs` refuses to stamp an unreleased package. The release step re-stamps it after `pnpm version-packages`.
- Task 10 amends the spec to match these.

## File Structure

**Create**
- `packages/theme-review/package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `README.md`
- `packages/theme-review/src/` — `types.ts`, `errors.ts`, `config.ts`, `detect.ts`, `glob.ts`, `png.ts`, `php.ts`, `context.ts`, `review.ts`, `format.ts`, `run.ts`, `cli.ts`, `index.ts`
- `packages/theme-review/src/rules/` — `structure.ts` (THEME-001 to 007, 013), `php-scan.ts` (THEME-008 to 012), `index.ts`
- `packages/theme-review/src/__tests__/` — `helpers.ts`, `rule-helpers.ts`, and one test file per module
- `scripts/review-themes.mjs`
- `packages/cli/src/commands/theme-review.ts`, `packages/cli/src/__tests__/theme-review-command.test.ts`, `packages/cli/src/ai-setup-theme-type.test.ts`
- `.ai/skills/theme-review/SKILL.md` (root and in each of the three templates)
- `docs/ai-tooling.md`, `.changeset/ai-tooling-review.md`

**Modify**
- `package.json` (root scripts), `.github/workflows/ci.yml`
- `packages/cli/package.json`, `packages/cli/src/index.ts`, `packages/cli/scripts/sync-template-vendor.mjs`
- `packages/mcp/package.json`, `packages/mcp/src/tools.ts`, `packages/mcp/src/server.test.ts`, `packages/mcp/contracts/tools.snapshot.json`
- Template files (identical across the three templates): `scripts/ai-setup.mjs`, `AGENTS.md`, `.ai/SKILLS.md`, `.ai/developer-directions.md`, `package.json`
- `packages/cli/src/ai-scaffold.test.ts`, `packages/cli/src/quality-gates-scaffold.test.ts`, `packages/cli/src/__tests__/customize-theme.test.ts`
- `AGENTS.md`, `.ai/SKILLS.md`, `.ai/developer-directions.md`, `.ai/skills/agent-code-review/SKILL.md`, `.ai/PROJECT_RULES.md`, `CLAUDE.md`, the spec

---

### Task 1: Package scaffold, types, config, and theme-type detector

**Files:**
- Create: `packages/theme-review/package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`
- Create: `packages/theme-review/src/types.ts`, `errors.ts`, `config.ts`, `detect.ts`
- Test: `packages/theme-review/src/__tests__/helpers.ts`, `detect.test.ts`, `config.test.ts`

**Interfaces:**
- Produces (used by every later task): `ThemeType`, `Severity`, `SeverityOverride`, `Finding`, `RuleResult`, `Rule`, `ThemeContext`, `Report` (from `types.ts`); `ReviewError` (from `errors.ts`); `readConfig(themeDir): ReviewConfig`, `isThemeType(value): value is ThemeType`, `THEME_TYPES` (from `config.ts`); `detectTheme(themeDir, override?): { themeType, typeSource }`, `assertDirectory(dir)` (from `detect.ts`); test helpers `makeTheme`, `cleanupThemes`, `pngBuffer`, `without`, `goodHybridFiles`, `goodBlockFiles`, `goodClassicFiles`, `Files` (from `__tests__/helpers.ts`).

- [ ] **Step 1: Create the package files**

`packages/theme-review/package.json`:

```json
{
  "name": "@stratawp/theme-review",
  "version": "0.0.0",
  "description": "Theme review checks for StrataWP themes, approximating the WordPress.org theme guidelines",
  "author": "Jon Imms",
  "license": "GPL-3.0-or-later",
  "type": "module",
  "keywords": ["wordpress", "theme", "review", "block-theme", "stratawp"],
  "repository": {
    "type": "git",
    "url": "https://github.com/JonImmsWordpressDev/StrataWP.git",
    "directory": "packages/theme-review"
  },
  "bin": {
    "stratawp-review": "./dist/cli.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "tsup": "^8.0.1",
    "typescript": "^5.3.3",
    "vitest": "^1.0.4"
  },
  "engines": {
    "node": ">=18.18"
  }
}
```

`packages/theme-review/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "incremental": false,
    "composite": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "src/**/__tests__/**", "**/*.test.ts"]
}
```

`packages/theme-review/tsup.config.ts`:

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
})
```

`packages/theme-review/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 2: Write the shared types, errors, and test helpers**

`packages/theme-review/src/types.ts`:

```ts
export type ThemeType = 'block' | 'classic' | 'hybrid'
export type Severity = 'error' | 'warning' | 'info'
export type SeverityOverride = Severity | 'off'

export interface Finding {
  ruleId: string
  severity: Severity
  message: string
  file?: string
  line?: number
}

/** What a rule returns. `severity` overrides the rule's default for this finding. */
export interface RuleResult {
  message: string
  file?: string
  line?: number
  severity?: Severity
}

export interface ThemeContext {
  themeDir: string
  themeType: ThemeType
  /** `Text Domain` from style.css, if declared. */
  textDomain: string | undefined
  /** style.css header fields, keys lowercased (e.g. `theme name`). */
  styleHeader: Record<string, string>
  /** Theme-relative POSIX paths, after ignores are applied. */
  files: string[]
  exists(rel: string): boolean
  read(rel: string): string | undefined
  readBytes(rel: string): Buffer | undefined
}

export interface Rule {
  id: string
  description: string
  /** Default severity for findings that do not set their own. */
  severity: Severity
  appliesTo: ThemeType[]
  check(ctx: ThemeContext): RuleResult[]
}

export interface Report {
  themeDir: string
  themeType: ThemeType
  typeSource: 'detected' | 'override'
  summary: { errors: number; warnings: number; infos: number }
  findings: Finding[]
  disclaimer: string
}
```

`packages/theme-review/src/errors.ts`:

```ts
/** A usage or file problem; the CLI turns it into exit code 2. */
export class ReviewError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReviewError'
  }
}
```

`packages/theme-review/src/__tests__/helpers.ts`:

```ts
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

export type Files = Record<string, string | Buffer>

const created: string[] = []

/** Writes `files` into a fresh temp directory and returns its path. */
export function makeTheme(files: Files): string {
  const dir = mkdtempSync(join(tmpdir(), 'sw-review-'))
  created.push(dir)
  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, content)
  }
  return dir
}

export function cleanupThemes(): void {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** A minimal valid PNG header (signature + IHDR) of the given size. */
export function pngBuffer(width: number, height: number): Buffer {
  const buf = Buffer.alloc(33)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0)
  buf.writeUInt32BE(13, 8)
  buf.write('IHDR', 12, 'ascii')
  buf.writeUInt32BE(width, 16)
  buf.writeUInt32BE(height, 20)
  return buf
}

export function without(files: Files, ...keys: string[]): Files {
  const copy: Files = { ...files }
  for (const key of keys) delete copy[key]
  return copy
}

const STYLE_CSS = `/*
Theme Name: Fixture Theme
Description: A fixture theme
Author: Tester
Version: 1.0.0
License: GNU General Public License v2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Text Domain: fixture-theme
Tested up to: 6.9
Requires at least: 6.5
Requires PHP: 8.1
*/
`

/** A theme with both PHP and block templates that passes every rule. */
export function goodHybridFiles(): Files {
  return {
    'style.css': STYLE_CSS,
    'screenshot.png': pngBuffer(1200, 900),
    'readme.txt': '=== Fixture Theme ===\n',
    'index.php': '<?php\n// Silence is golden.\n',
    'header.php': '<!doctype html><html><head><?php wp_head(); ?></head><body>\n',
    'footer.php': '<?php wp_footer(); ?></body></html>\n',
    'functions.php': `<?php
function fixture_theme_setup() {
	add_theme_support( 'title-tag' );
}
add_action( 'after_setup_theme', 'fixture_theme_setup' );
`,
    'templates/index.html': '<!-- wp:post-content /-->\n',
    'theme.json': JSON.stringify({ $schema: 'https://schemas.wp.org/trunk/theme.json', version: 3 }),
    'patterns/hero.php': `<?php
/**
 * Title: Hero
 * Slug: fixture-theme/hero
 * Categories: featured
 */
?>
<p><?php echo esc_html__( 'Hello', 'fixture-theme' ); ?></p>
`,
  }
}

/** A block theme: no classic template markers (index.php alone does not count). */
export function goodBlockFiles(): Files {
  return without(goodHybridFiles(), 'header.php', 'footer.php')
}

/** A classic theme: no block templates, theme.json, or patterns. */
export function goodClassicFiles(): Files {
  return without(goodHybridFiles(), 'templates/index.html', 'theme.json', 'patterns/hero.php')
}
```

- [ ] **Step 3: Write the failing tests**

`packages/theme-review/src/__tests__/config.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { readConfig } from '../config'
import { ReviewError } from '../errors'
import { cleanupThemes, makeTheme } from './helpers'

afterEach(cleanupThemes)

const pkg = (stratawp: unknown) => JSON.stringify({ name: 'x', stratawp })

describe('readConfig', () => {
  it('returns defaults when there is no package.json', () => {
    expect(readConfig(makeTheme({ 'style.css': '/* */' }))).toEqual({
      themeType: undefined,
      ignore: [],
      rules: {},
    })
  })

  it('returns defaults when package.json has no stratawp field', () => {
    expect(readConfig(makeTheme({ 'package.json': '{"name":"x"}' })).rules).toEqual({})
  })

  it('reads themeType, ignore globs, and rule overrides (warn means warning)', () => {
    const config = readConfig(
      makeTheme({
        'package.json': pkg({
          themeType: 'block',
          review: { ignore: ['legacy/**'], rules: { 'THEME-005': 'off', 'THEME-008': 'warn' } },
        }),
      })
    )
    expect(config.themeType).toBe('block')
    expect(config.ignore).toEqual(['legacy/**'])
    expect(config.rules).toEqual({ 'THEME-005': 'off', 'THEME-008': 'warning' })
  })

  it('rejects an unknown themeType with a clear message', () => {
    expect(() => readConfig(makeTheme({ 'package.json': pkg({ themeType: 'headless' }) }))).toThrow(
      /Invalid stratawp\.themeType "headless".*block, classic or hybrid/
    )
  })

  it('rejects an invalid rule severity naming the rule', () => {
    const dir = makeTheme({ 'package.json': pkg({ review: { rules: { 'THEME-001': 'fatal' } } }) })
    expect(() => readConfig(dir)).toThrow(/Invalid severity "fatal" for rule THEME-001/)
  })

  it('reports malformed package.json as a ReviewError', () => {
    expect(() => readConfig(makeTheme({ 'package.json': '{nope' }))).toThrow(ReviewError)
  })
})
```

`packages/theme-review/src/__tests__/detect.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { ReviewError } from '../errors'
import { detectTheme } from '../detect'
import { cleanupThemes, makeTheme } from './helpers'

afterEach(cleanupThemes)

describe('detectTheme', () => {
  it('detects a block theme from templates/*.html', () => {
    const dir = makeTheme({ 'templates/index.html': '<!-- -->', 'theme.json': '{}' })
    expect(detectTheme(dir)).toEqual({ themeType: 'block', typeSource: 'detected' })
  })

  it('detects a classic theme from PHP template files', () => {
    const dir = makeTheme({ 'index.php': '<?php', 'header.php': '<?php', 'footer.php': '<?php' })
    expect(detectTheme(dir)).toEqual({ themeType: 'classic', typeSource: 'detected' })
  })

  it('detects a hybrid theme when both kinds of marker exist', () => {
    const dir = makeTheme({ 'templates/index.html': '<!-- -->', 'header.php': '<?php' })
    expect(detectTheme(dir)).toEqual({ themeType: 'hybrid', typeSource: 'detected' })
  })

  it('does not count index.php alone as a classic marker', () => {
    const dir = makeTheme({ 'templates/index.html': '<!-- -->', 'index.php': '<?php' })
    expect(detectTheme(dir).themeType).toBe('block')
  })

  it('falls back to classic when no markers exist', () => {
    expect(detectTheme(makeTheme({ 'style.css': '/* */' })).themeType).toBe('classic')
  })

  it('honours the package.json override', () => {
    const dir = makeTheme({
      'templates/index.html': '<!-- -->',
      'package.json': JSON.stringify({ stratawp: { themeType: 'hybrid' } }),
    })
    expect(detectTheme(dir)).toEqual({ themeType: 'hybrid', typeSource: 'override' })
  })

  it('lets an explicit override argument beat package.json', () => {
    const dir = makeTheme({ 'package.json': JSON.stringify({ stratawp: { themeType: 'hybrid' } }) })
    expect(detectTheme(dir, 'classic')).toEqual({ themeType: 'classic', typeSource: 'override' })
  })

  it('throws a ReviewError when the directory does not exist', () => {
    expect(() => detectTheme('/definitely/not/a/theme')).toThrow(ReviewError)
    expect(() => detectTheme('/definitely/not/a/theme')).toThrow(/Theme directory not found/)
  })

  it('rejects an invalid themeType in package.json', () => {
    const dir = makeTheme({ 'package.json': JSON.stringify({ stratawp: { themeType: 'nope' } }) })
    expect(() => detectTheme(dir)).toThrow(/Invalid stratawp\.themeType/)
  })
})
```

- [ ] **Step 4: Install and run to verify failure**

Run: `pnpm install && pnpm --filter @stratawp/theme-review test`
Expected: install succeeds (lockfile updates); tests FAIL with `Failed to resolve import "../config"` (modules not written yet).

- [ ] **Step 5: Implement config and detector**

`packages/theme-review/src/config.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ReviewError } from './errors'
import type { SeverityOverride, ThemeType } from './types'

export const THEME_TYPES: readonly ThemeType[] = ['block', 'classic', 'hybrid']

const OVERRIDES = ['off', 'info', 'warn', 'warning', 'error']

export interface ReviewConfig {
  themeType: ThemeType | undefined
  ignore: string[]
  rules: Record<string, SeverityOverride>
}

export function isThemeType(value: unknown): value is ThemeType {
  return typeof value === 'string' && (THEME_TYPES as readonly string[]).includes(value)
}

/** Reads the `stratawp` field of the theme's package.json (all of it optional). */
export function readConfig(themeDir: string): ReviewConfig {
  const config: ReviewConfig = { themeType: undefined, ignore: [], rules: {} }
  const pkgPath = join(themeDir, 'package.json')
  if (!existsSync(pkgPath)) {
    return config
  }

  let pkg: any
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  } catch {
    throw new ReviewError(`package.json in ${themeDir} is not valid JSON`)
  }

  const stratawp = pkg?.stratawp
  if (!stratawp || typeof stratawp !== 'object') {
    return config
  }

  if (stratawp.themeType !== undefined) {
    if (!isThemeType(stratawp.themeType)) {
      throw new ReviewError(
        `Invalid stratawp.themeType "${String(stratawp.themeType)}" in package.json (expected block, classic or hybrid)`
      )
    }
    config.themeType = stratawp.themeType
  }

  const review = stratawp.review
  if (review && typeof review === 'object') {
    if (Array.isArray(review.ignore)) {
      config.ignore = review.ignore.filter((glob: unknown): glob is string => typeof glob === 'string')
    }
    if (review.rules && typeof review.rules === 'object') {
      for (const [id, value] of Object.entries(review.rules)) {
        if (typeof value !== 'string' || !OVERRIDES.includes(value)) {
          throw new ReviewError(
            `Invalid severity "${String(value)}" for rule ${id} in package.json stratawp.review.rules (expected off, info, warn or error)`
          )
        }
        config.rules[id] = value === 'warn' ? 'warning' : (value as SeverityOverride)
      }
    }
  }

  return config
}
```

`packages/theme-review/src/detect.ts`:

```ts
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isThemeType, readConfig } from './config'
import { ReviewError } from './errors'
import type { ThemeType } from './types'

/** Root PHP templates that mark a classic (or hybrid) theme. `index.php` alone does not count. */
export const CLASSIC_MARKERS = [
  'header.php',
  'footer.php',
  'sidebar.php',
  'home.php',
  'single.php',
  'page.php',
  'archive.php',
  'search.php',
  '404.php',
] as const

export interface ThemeTypeResult {
  themeType: ThemeType
  typeSource: 'detected' | 'override'
}

export function assertDirectory(dir: string): void {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    throw new ReviewError(`Theme directory not found: ${dir}`)
  }
}

function hasBlockTemplates(themeDir: string): boolean {
  const dir = join(themeDir, 'templates')
  return existsSync(dir) && readdirSync(dir).some((name) => name.endsWith('.html'))
}

function hasClassicTemplates(themeDir: string): boolean {
  return CLASSIC_MARKERS.some((file) => existsSync(join(themeDir, file)))
}

/**
 * Block markers only means block, PHP markers only means classic, both means
 * hybrid. A theme with neither is treated as classic.
 */
export function detectThemeTypeFromFiles(themeDir: string): ThemeType {
  const block = hasBlockTemplates(themeDir)
  const classic = hasClassicTemplates(themeDir)
  if (block && classic) return 'hybrid'
  if (block) return 'block'
  return 'classic'
}

/**
 * Resolves the theme type: an explicit `override` argument wins, then
 * `stratawp.themeType` in package.json, then detection from the files.
 */
export function detectTheme(themeDir: string, override?: ThemeType): ThemeTypeResult {
  const dir = resolve(themeDir)
  assertDirectory(dir)

  if (override !== undefined) {
    if (!isThemeType(override)) {
      throw new ReviewError(`Invalid theme type "${String(override)}" (expected block, classic or hybrid)`)
    }
    return { themeType: override, typeSource: 'override' }
  }

  const configured = readConfig(dir).themeType
  if (configured) {
    return { themeType: configured, typeSource: 'override' }
  }

  return { themeType: detectThemeTypeFromFiles(dir), typeSource: 'detected' }
}
```

- [ ] **Step 6: Run to verify they pass, then check quality gates**

```bash
pnpm --filter @stratawp/theme-review test
pnpm exec prettier --write packages/theme-review
pnpm exec eslint packages/theme-review/src
```

Expected: tests PASS (15 tests across `config` and `detect`); ESLint 0 errors. (`typecheck` is run in Task 5 once the package has an `index.ts`.)

- [ ] **Step 7: Commit**

```bash
git add packages/theme-review/package.json packages/theme-review/tsconfig.json packages/theme-review/tsup.config.ts packages/theme-review/vitest.config.ts packages/theme-review/src/types.ts packages/theme-review/src/errors.ts packages/theme-review/src/config.ts packages/theme-review/src/detect.ts packages/theme-review/src/__tests__/helpers.ts packages/theme-review/src/__tests__/config.test.ts packages/theme-review/src/__tests__/detect.test.ts pnpm-lock.yaml
git commit -m "feat(theme-review): add package scaffold, config reader, and theme-type detector"
```

---

### Task 2: Context builder and low-level helpers (glob, PNG, PHP scanning)

**Files:**
- Create: `packages/theme-review/src/glob.ts`, `png.ts`, `php.ts`, `context.ts`
- Test: `packages/theme-review/src/__tests__/glob.test.ts`, `png.test.ts`, `php.test.ts`, `context.test.ts`

**Interfaces:**
- Consumes: Task 1's `ThemeContext`, `ThemeType`, `ReviewConfig`, test helpers.
- Produces: `globToRegExp(glob): RegExp`; `readPngSize(buf): { width, height } | undefined`; `phpOnly(source): string` (everything that is not PHP code, and all comments, blanked with spaces; newlines and string literals kept); `lineOf(source, index): number`; `extractCalls(code, names): { name, args, index }[]`; `parseStyleHeader(css)`; `buildContext(themeDir, themeType, config): ThemeContext`.

- [ ] **Step 1: Write the failing tests**

`packages/theme-review/src/__tests__/glob.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { globToRegExp } from '../glob'

describe('globToRegExp', () => {
  it('matches generated files at any depth with **/*-generated.*', () => {
    const re = globToRegExp('**/*-generated.*')
    expect(re.test('inc/blocks-generated.php')).toBe(true)
    expect(re.test('x-generated.php')).toBe(true)
    expect(re.test('inc/blocks.php')).toBe(false)
  })

  it('matches everything below a folder with folder/**', () => {
    const re = globToRegExp('legacy/**')
    expect(re.test('legacy/a/b.php')).toBe(true)
    expect(re.test('other/legacy/a.php')).toBe(false)
  })

  it('keeps * inside one path segment', () => {
    const re = globToRegExp('*.txt')
    expect(re.test('readme.txt')).toBe(true)
    expect(re.test('a/readme.txt')).toBe(false)
  })

  it('escapes regex metacharacters', () => {
    expect(globToRegExp('a.b').test('axb')).toBe(false)
    expect(globToRegExp('a.b').test('a.b')).toBe(true)
  })
})
```

`packages/theme-review/src/__tests__/png.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readPngSize } from '../png'
import { pngBuffer } from './helpers'

describe('readPngSize', () => {
  it('reads width and height from the IHDR chunk', () => {
    expect(readPngSize(pngBuffer(1200, 900))).toEqual({ width: 1200, height: 900 })
  })

  it('returns undefined for a non-PNG', () => {
    expect(readPngSize(Buffer.from('definitely not a png file at all'))).toBeUndefined()
  })

  it('returns undefined for a truncated buffer', () => {
    expect(readPngSize(pngBuffer(10, 10).subarray(0, 12))).toBeUndefined()
  })
})
```

`packages/theme-review/src/__tests__/php.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { extractCalls, lineOf, phpOnly } from '../php'

describe('phpOnly', () => {
  it('blanks HTML outside PHP tags, including apostrophes in text', () => {
    const out = phpOnly(`<p>Don't panic</p>\n<?php echo 1; ?>\n<p>won't</p>`)
    expect(out).not.toContain("Don't")
    expect(out).not.toContain("won't")
    expect(out).toContain('echo 1;')
  })

  it('blanks comments but keeps newlines so line numbers stay stable', () => {
    const src = `<?php\n// __( 'x', 'frost' );\n/* __( 'y', 'frost' ); */\n# __( 'z', 'frost' );\necho 1;`
    const out = phpOnly(src)
    expect(out).not.toContain('frost')
    expect(out.split('\n')).toHaveLength(src.split('\n').length)
  })

  it('keeps string literals, including // inside URLs', () => {
    const out = phpOnly(`<?php $u = 'https://example.com/a'; $v = "http://x.test";`)
    expect(out).toContain('https://example.com/a')
    expect(out).toContain('http://x.test')
  })

  it('does not treat PHP 8 attributes as comments', () => {
    expect(phpOnly(`<?php #[Attr]\nfunction foo() {}`)).toContain('#[Attr]')
  })

  it('stops a line comment at a closing tag', () => {
    const out = phpOnly(`<?php // note ?><p>visible</p><?php echo 2;`)
    expect(out).toContain('echo 2;')
    expect(out).not.toContain('visible')
  })

  it('treats <?= as PHP', () => {
    expect(phpOnly(`<b><?= esc_html__( 'a', 'd' ) ?></b>`)).toContain("esc_html__( 'a', 'd' )")
  })
})

describe('extractCalls', () => {
  const code = (s: string) => phpOnly(`<?php ${s}`)

  it('extracts top-level arguments, respecting quotes and nesting', () => {
    const calls = extractCalls(code(`echo __( 'a, b', 'dom' );`), ['__'])
    expect(calls).toHaveLength(1)
    expect(calls[0]?.args).toEqual(["'a, b'", "'dom'"])
  })

  it('handles nested calls and arrays', () => {
    const calls = extractCalls(code(`esc_html__( sprintf( 'x %s', array( 1, 2 ) ), 'dom' );`), ['esc_html__'])
    expect(calls[0]?.args).toEqual(["sprintf( 'x %s', array( 1, 2 ) )", "'dom'"])
  })

  it('handles multi-line calls', () => {
    const calls = extractCalls(code(`_e(\n\t'hello',\n\t'dom'\n);`), ['_e'])
    expect(calls[0]?.args).toEqual(["'hello'", "'dom'"])
  })

  it('ignores method calls and function declarations', () => {
    const calls = extractCalls(code(`$this->__( 'a', 'b' ); Foo::__( 'c', 'd' ); function __( $a ) {}`), ['__'])
    expect(calls).toHaveLength(0)
  })

  it('does not match a name that is the tail of a longer identifier', () => {
    expect(extractCalls(code(`esc_html__( 'a', 'd' );`), ['__'])).toHaveLength(0)
  })
})

describe('lineOf', () => {
  it('returns the 1-based line of an index', () => {
    expect(lineOf('a\nb\nc', 0)).toBe(1)
    expect(lineOf('a\nb\nc', 2)).toBe(2)
    expect(lineOf('a\nb\nc', 4)).toBe(3)
  })
})
```

`packages/theme-review/src/__tests__/context.test.ts`:

```ts
import { mkdirSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildContext, parseStyleHeader } from '../context'
import { cleanupThemes, makeTheme } from './helpers'

afterEach(cleanupThemes)

const config = { themeType: undefined, ignore: [] as string[], rules: {} }

describe('parseStyleHeader', () => {
  it('parses plain header lines', () => {
    expect(parseStyleHeader('/*\nTheme Name: A\nText Domain: a-b\n*/')).toEqual({
      'theme name': 'A',
      'text domain': 'a-b',
    })
  })

  it('parses Windows line endings and lines with leading asterisks', () => {
    const css = '/**\r\n * Theme Name: A\r\n * License URI: https://x.test/l\r\n */\r\nbody{}'
    expect(parseStyleHeader(css)).toEqual({ 'theme name': 'A', 'license uri': 'https://x.test/l' })
  })

  it('only reads the first comment block', () => {
    expect(parseStyleHeader('/* Theme Name: A */\n/* Version: 9 */')).toEqual({ 'theme name': 'A' })
  })

  it('returns an empty object when there is no comment', () => {
    expect(parseStyleHeader('body { color: red }')).toEqual({})
  })
})

describe('buildContext', () => {
  it('lists files as sorted POSIX paths and skips vendor, node_modules, dist, .git', () => {
    const dir = makeTheme({
      'b.php': '',
      'a.php': '',
      'vendor/x.php': '',
      'node_modules/y.js': '',
      'dist/z.js': '',
      '.git/config': '',
      'inc/c.php': '',
    })
    expect(buildContext(dir, 'classic', config).files).toEqual(['a.php', 'b.php', 'inc/c.php'])
  })

  it('applies generated-file and configured ignores', () => {
    const dir = makeTheme({ 'inc/blocks-generated.php': '', 'legacy/old.php': '', 'keep.php': '' })
    const ctx = buildContext(dir, 'classic', { ...config, ignore: ['legacy/**'] })
    expect(ctx.files).toEqual(['keep.php'])
  })

  it('exposes style header, text domain, read, readBytes and exists', () => {
    const dir = makeTheme({ 'style.css': '/*\nText Domain: dom\n*/', 'a.txt': 'hello' })
    const ctx = buildContext(dir, 'classic', config)
    expect(ctx.textDomain).toBe('dom')
    expect(ctx.read('a.txt')).toBe('hello')
    expect(ctx.readBytes('a.txt')?.length).toBe(5)
    expect(ctx.read('missing.txt')).toBeUndefined()
    expect(ctx.exists('a.txt')).toBe(true)
    expect(ctx.exists('missing.txt')).toBe(false)
  })

  it('does not follow a symlink loop inside the theme', () => {
    const dir = makeTheme({ 'a.php': '' })
    mkdirSync(join(dir, 'real'))
    symlinkSync(dir, join(dir, 'real', 'loop'))
    expect(buildContext(dir, 'classic', config).files).toEqual(['a.php'])
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @stratawp/theme-review test`
Expected: the four new test files FAIL to resolve `../glob`, `../png`, `../php`, `../context`.

- [ ] **Step 3: Implement the helpers**

`packages/theme-review/src/glob.ts`:

```ts
/** Converts a small glob (`**`, `*`, `?`) to an anchored RegExp over POSIX paths. */
export function globToRegExp(glob: string): RegExp {
  let out = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob.charAt(i)
    if (c === '*') {
      if (glob.charAt(i + 1) === '*') {
        if (glob.charAt(i + 2) === '/') {
          out += '(?:.*/)?'
          i += 2
        } else {
          out += '.*'
          i += 1
        }
      } else {
        out += '[^/]*'
      }
    } else if (c === '?') {
      out += '[^/]'
    } else {
      out += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp(`^${out}$`)
}
```

`packages/theme-review/src/png.ts`:

```ts
const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** Reads the dimensions from a PNG's IHDR chunk without decoding the image. */
export function readPngSize(buf: Buffer): { width: number; height: number } | undefined {
  if (buf.length < 24) return undefined
  if (!buf.subarray(0, 8).equals(SIGNATURE)) return undefined
  if (buf.toString('ascii', 12, 16) !== 'IHDR') return undefined
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}
```

`packages/theme-review/src/php.ts`:

```ts
const blank = (text: string): string => text.replace(/[^\n]/g, ' ')

/**
 * Returns `source` with everything that is not PHP code replaced by spaces:
 * HTML outside `<?php`/`<?=` tags and all comments. Newlines are kept so line
 * numbers stay stable, and string literals are kept so callers can read them.
 */
export function phpOnly(source: string): string {
  let out = ''
  let i = 0
  let inPhp = false
  const n = source.length

  while (i < n) {
    if (!inPhp) {
      const start = source.indexOf('<?', i)
      if (start === -1) {
        out += blank(source.slice(i))
        break
      }
      const tag = /^<\?(?:php\b|=)/i.exec(source.slice(start, start + 6))
      if (!tag) {
        out += blank(source.slice(i, start + 2))
        i = start + 2
        continue
      }
      out += blank(source.slice(i, start + tag[0].length))
      i = start + tag[0].length
      inPhp = true
      continue
    }

    const c = source.charAt(i)
    const next = source.charAt(i + 1)

    if (c === '?' && next === '>') {
      out += '  '
      i += 2
      inPhp = false
      continue
    }

    if ((c === '/' && next === '/') || (c === '#' && next !== '[')) {
      let j = i
      while (j < n && source.charAt(j) !== '\n' && !(source.charAt(j) === '?' && source.charAt(j + 1) === '>')) {
        j++
      }
      out += blank(source.slice(i, j))
      i = j
      continue
    }

    if (c === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2)
      const j = end === -1 ? n : end + 2
      out += blank(source.slice(i, j))
      i = j
      continue
    }

    if (c === "'" || c === '"') {
      let j = i + 1
      while (j < n && source.charAt(j) !== c) {
        if (source.charAt(j) === '\\') j++
        j++
      }
      out += source.slice(i, Math.min(j + 1, n))
      i = j + 1
      continue
    }

    out += c
    i++
  }

  return out
}

/** 1-based line number of `index` in `source`. */
export function lineOf(source: string, index: number): number {
  return source.slice(0, index).split('\n').length
}

export interface Call {
  name: string
  args: string[]
  index: number
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Reads the top-level, comma-separated arguments of the call whose `(` is at `open`. */
function readArgs(code: string, open: number): string[] | undefined {
  const args: string[] = []
  let depth = 0
  let current = ''

  for (let i = open; i < code.length; i++) {
    const c = code.charAt(i)

    if (c === '"' || c === "'") {
      let j = i + 1
      while (j < code.length && code.charAt(j) !== c) {
        if (code.charAt(j) === '\\') j++
        j++
      }
      current += code.slice(i, j + 1)
      i = j
      continue
    }

    if (c === '(' || c === '[' || c === '{') {
      depth++
      if (depth === 1) continue
    } else if (c === ')' || c === ']' || c === '}') {
      depth--
      if (depth === 0) {
        if (current.trim() !== '' || args.length > 0) args.push(current.trim())
        return args
      }
    } else if (c === ',' && depth === 1) {
      args.push(current.trim())
      current = ''
      continue
    }

    current += c
  }

  return undefined
}

/**
 * Finds calls to the named PHP functions in already-sanitized code (see
 * `phpOnly`). Method calls (`->`, `::`) and function declarations are skipped.
 */
export function extractCalls(code: string, names: readonly string[]): Call[] {
  const re = new RegExp(`(?<![\\w$>:])(${names.map(escapeRe).join('|')})\\s*\\(`, 'g')
  const calls: Call[] = []

  for (const match of code.matchAll(re)) {
    const index = match.index ?? 0
    const before = code.slice(Math.max(0, index - 12), index)
    if (/function\s+&?\s*$/.test(before)) continue
    const open = index + match[0].length - 1
    const args = readArgs(code, open)
    if (args) calls.push({ name: match[1] as string, args, index })
  }

  return calls
}
```

`packages/theme-review/src/context.ts`:

```ts
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ReviewConfig } from './config'
import { globToRegExp } from './glob'
import type { ThemeContext, ThemeType } from './types'

/** Directories never reviewed, at any depth. */
const PRUNE = new Set(['vendor', 'node_modules', 'dist', '.git', '.turbo', '.vite'])

const ALWAYS_IGNORE = ['**/*-generated.*']

function walk(root: string, rel = ''): string[] {
  const out: string[] = []
  for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name
    if (entry.isSymbolicLink()) continue
    if (entry.isDirectory()) {
      if (!PRUNE.has(entry.name)) out.push(...walk(root, relPath))
      continue
    }
    if (entry.isFile()) out.push(relPath)
  }
  return out.sort()
}

/** Parses the first comment block of style.css into lowercase-keyed fields. */
export function parseStyleHeader(css: string): Record<string, string> {
  const header: Record<string, string> = {}
  const block = /\/\*([\s\S]*?)\*\//.exec(css)
  if (!block) return header

  for (const raw of (block[1] ?? '').split(/\r?\n/)) {
    const line = raw.replace(/^\s*\*?\s*/, '')
    const match = /^([A-Za-z][A-Za-z0-9 _-]*?)\s*:\s*(.+?)\s*$/.exec(line)
    if (match) header[(match[1] as string).toLowerCase()] = match[2] as string
  }
  return header
}

export function buildContext(themeDir: string, themeType: ThemeType, config: ReviewConfig): ThemeContext {
  const ignore = [...ALWAYS_IGNORE, ...config.ignore].map(globToRegExp)
  const files = walk(themeDir).filter((file) => !ignore.some((re) => re.test(file)))

  const cache = new Map<string, Buffer | undefined>()
  const readBytes = (rel: string): Buffer | undefined => {
    if (!cache.has(rel)) {
      try {
        cache.set(rel, readFileSync(join(themeDir, rel)))
      } catch {
        cache.set(rel, undefined)
      }
    }
    return cache.get(rel)
  }
  const read = (rel: string): string | undefined => readBytes(rel)?.toString('utf8')

  const styleHeader = parseStyleHeader(read('style.css') ?? '')

  return {
    themeDir,
    themeType,
    textDomain: styleHeader['text domain'],
    styleHeader,
    files,
    exists: (rel) => existsSync(join(themeDir, rel)),
    read,
    readBytes,
  }
}
```

- [ ] **Step 4: Run to verify they pass, then quality gates**

```bash
pnpm --filter @stratawp/theme-review test
pnpm exec prettier --write packages/theme-review
pnpm exec eslint packages/theme-review/src
```

Expected: all tests PASS (the four new files plus Task 1's); ESLint 0 errors. If a `phpOnly` or `extractCalls` test fails, fix the implementation, not the assertion; each test states the intended behavior.

- [ ] **Step 5: Prove the symlink test is not vacuous**

Temporarily change `if (entry.isSymbolicLink()) continue` in `context.ts` to `if (false) continue`, run `pnpm --filter @stratawp/theme-review exec vitest run src/__tests__/context.test.ts`, and confirm the symlink-loop test FAILS or the run errors out (loop or `ELOOP`). Restore the line and confirm the file passes again. Record both outputs in your report.

- [ ] **Step 6: Commit**

```bash
git add packages/theme-review/src/glob.ts packages/theme-review/src/png.ts packages/theme-review/src/php.ts packages/theme-review/src/context.ts packages/theme-review/src/__tests__/glob.test.ts packages/theme-review/src/__tests__/png.test.ts packages/theme-review/src/__tests__/php.test.ts packages/theme-review/src/__tests__/context.test.ts
git commit -m "feat(theme-review): add context builder, glob, PNG, and PHP scanning helpers"
```

---

### Task 3: Structural rules (THEME-001 to 007, 013)

**Files:**
- Create: `packages/theme-review/src/rules/structure.ts`
- Test: `packages/theme-review/src/__tests__/rule-helpers.ts`, `rules-structure.test.ts`

**Interfaces:**
- Consumes: Task 1 types and helpers; Task 2's `phpOnly`, `readPngSize`, `ThemeContext`.
- Produces: exported rule constants `THEME_001`, `THEME_002`, `THEME_003`, `THEME_004`, `THEME_005`, `THEME_006`, `THEME_007`, `THEME_013` (each a `Rule`); test helper `runRule(rule, files, type?): RuleResult[]`.

- [ ] **Step 1: Write the failing tests**

`packages/theme-review/src/__tests__/rule-helpers.ts`:

```ts
import { buildContext } from '../context'
import { readConfig } from '../config'
import { detectTheme } from '../detect'
import type { Rule, RuleResult, ThemeType } from '../types'
import { makeTheme, type Files } from './helpers'

/** Runs one rule against a theme built from `files` (type detected unless given). */
export function runRule(rule: Rule, files: Files, type?: ThemeType): RuleResult[] {
  const dir = makeTheme(files)
  const { themeType } = detectTheme(dir, type)
  return rule.check(buildContext(dir, themeType, readConfig(dir)))
}
```

`packages/theme-review/src/__tests__/rules-structure.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest'
import {
  THEME_001,
  THEME_002,
  THEME_003,
  THEME_004,
  THEME_005,
  THEME_006,
  THEME_007,
  THEME_013,
} from '../rules/structure'
import { cleanupThemes, goodClassicFiles, goodHybridFiles, pngBuffer, without } from './helpers'
import { runRule } from './rule-helpers'

afterEach(cleanupThemes)

const messages = (results: { message: string }[]) => results.map((r) => r.message)

const HEADER = (fields: string[]) => `/*\n${fields.join('\n')}\n*/\n`
const REQUIRED = [
  'Theme Name: X',
  'Version: 1.0.0',
  'License: GPL-2.0-or-later',
  'License URI: https://www.gnu.org/licenses/gpl-2.0.html',
  'Text Domain: x',
]

describe('THEME-001 required style.css headers', () => {
  it('passes on a good theme', () => {
    expect(runRule(THEME_001, goodHybridFiles())).toEqual([])
  })

  it('reports a missing style.css', () => {
    const results = runRule(THEME_001, without(goodHybridFiles(), 'style.css'))
    expect(messages(results)).toEqual(['style.css is missing'])
  })

  it('names each missing required header', () => {
    const files = { ...goodHybridFiles(), 'style.css': HEADER(['Theme Name: X', 'Version: 1']) }
    const out = messages(runRule(THEME_001, files))
    expect(out).toContain('style.css is missing the required header "License"')
    expect(out).toContain('style.css is missing the required header "License URI"')
    expect(out).toContain('style.css is missing the required header "Text Domain"')
    expect(out).toHaveLength(3)
  })

  it('parses Windows line endings and asterisk-prefixed header lines', () => {
    const css = ['/**', ...REQUIRED.map((l) => ` * ${l}`), ' */'].join('\r\n')
    expect(runRule(THEME_001, { ...goodHybridFiles(), 'style.css': css })).toEqual([])
  })

  it('defaults to error severity', () => {
    expect(THEME_001.severity).toBe('error')
  })
})

describe('THEME-002 recommended style.css headers', () => {
  it('passes on a good theme', () => {
    expect(runRule(THEME_002, goodHybridFiles())).toEqual([])
  })

  it('warns once per missing recommended header', () => {
    const files = { ...goodHybridFiles(), 'style.css': HEADER(REQUIRED) }
    const out = messages(runRule(THEME_002, files))
    expect(out).toHaveLength(5)
    expect(out.join('\n')).toContain('"Tested up to"')
    expect(out.join('\n')).toContain('"Requires PHP"')
  })

  it('stays quiet when style.css is missing (THEME-001 reports that)', () => {
    expect(runRule(THEME_002, without(goodHybridFiles(), 'style.css'))).toEqual([])
  })
})

describe('THEME-003 screenshot', () => {
  it('passes for a 1200x900 PNG', () => {
    expect(runRule(THEME_003, goodHybridFiles())).toEqual([])
  })

  it('errors when the screenshot is missing', () => {
    const [finding] = runRule(THEME_003, without(goodHybridFiles(), 'screenshot.png'))
    expect(finding?.severity).toBe('error')
    expect(finding?.message).toBe('screenshot.png is missing')
  })

  it('warns about the wrong size and names the actual size', () => {
    const [finding] = runRule(THEME_003, { ...goodHybridFiles(), 'screenshot.png': pngBuffer(1536, 1024) })
    expect(finding?.severity).toBe('warning')
    expect(finding?.message).toContain('1536×1024')
    expect(finding?.message).toContain('1200×900')
  })

  it('warns when the file is not a valid PNG', () => {
    const [finding] = runRule(THEME_003, { ...goodHybridFiles(), 'screenshot.png': Buffer.from('nope') })
    expect(finding?.severity).toBe('warning')
    expect(finding?.message).toContain('not a valid PNG')
  })
})

describe('THEME-004 index.php', () => {
  it('passes when index.php exists', () => {
    expect(runRule(THEME_004, goodClassicFiles())).toEqual([])
  })

  it('errors when a classic theme has no index.php', () => {
    const results = runRule(THEME_004, without(goodClassicFiles(), 'index.php'))
    expect(messages(results)).toEqual(['index.php is missing'])
  })

  it('does not apply to block themes', () => {
    expect(THEME_004.appliesTo).not.toContain('block')
  })
})

describe('THEME-005 readme.txt', () => {
  it('passes when readme.txt exists', () => {
    expect(runRule(THEME_005, goodHybridFiles())).toEqual([])
  })

  it('warns when readme.txt is missing', () => {
    expect(THEME_005.severity).toBe('warning')
    expect(messages(runRule(THEME_005, without(goodHybridFiles(), 'readme.txt')))).toEqual([
      'readme.txt is missing',
    ])
  })
})

describe('THEME-006 block theme essentials', () => {
  it('passes on a good hybrid theme', () => {
    expect(runRule(THEME_006, goodHybridFiles())).toEqual([])
  })

  it('errors when templates/index.html is missing', () => {
    const files = { ...without(goodHybridFiles(), 'templates/index.html'), 'templates/page.html': '<!-- -->' }
    expect(messages(runRule(THEME_006, files))).toEqual(['templates/index.html is missing'])
  })

  it('errors when theme.json is missing', () => {
    expect(messages(runRule(THEME_006, without(goodHybridFiles(), 'theme.json')))).toEqual([
      'theme.json is missing',
    ])
  })

  it('errors when theme.json is not valid JSON', () => {
    const out = messages(runRule(THEME_006, { ...goodHybridFiles(), 'theme.json': '{nope' }))
    expect(out).toEqual(['theme.json is not valid JSON'])
  })

  it('errors when theme.json lacks $schema or version', () => {
    const out = messages(runRule(THEME_006, { ...goodHybridFiles(), 'theme.json': '{}' }))
    expect(out).toContain('theme.json is missing "$schema"')
    expect(out).toContain('theme.json is missing "version"')
  })

  it('does not apply to classic themes', () => {
    expect(THEME_006.appliesTo).not.toContain('classic')
  })
})

describe('THEME-007 patterns', () => {
  const pattern = (header: string[]) => `<?php\n/**\n${header.map((l) => ` * ${l}`).join('\n')}\n */\n?>\n<p>x</p>\n`

  it('passes on a good pattern', () => {
    expect(runRule(THEME_007, goodHybridFiles())).toEqual([])
  })

  it('warns when Title or Slug is missing', () => {
    const files = { ...goodHybridFiles(), 'patterns/a.php': pattern(['Categories: featured']) }
    const out = messages(runRule(THEME_007, files))
    expect(out).toContain('patterns/a.php is missing a "Title:" header')
    expect(out).toContain('patterns/a.php is missing a "Slug:" header')
  })

  it("warns when the slug namespace is not the theme's text domain", () => {
    const files = { ...goodHybridFiles(), 'patterns/a.php': pattern(['Title: A', 'Slug: other/a']) }
    const out = messages(runRule(THEME_007, files))
    expect(out).toEqual(['patterns/a.php: slug namespace "other" does not match the text domain "fixture-theme"'])
  })

  it('warns when the slug has no namespace', () => {
    const files = { ...goodHybridFiles(), 'patterns/a.php': pattern(['Title: A', 'Slug: plain']) }
    expect(messages(runRule(THEME_007, files))).toEqual(['patterns/a.php: slug "plain" should be namespaced like "fixture-theme/name"'])
  })

  it('ignores patterns in subfolders', () => {
    const files = { ...goodHybridFiles(), 'patterns/sub/a.php': '<?php // nothing' }
    expect(runRule(THEME_007, files)).toEqual([])
  })
})

describe('THEME-013 wp_head and wp_footer', () => {
  it('passes when templates call both', () => {
    expect(runRule(THEME_013, goodHybridFiles())).toEqual([])
  })

  it('errors when nothing calls wp_head()', () => {
    const files = { ...goodHybridFiles(), 'header.php': '<html><head></head><body>' }
    expect(messages(runRule(THEME_013, files))).toEqual(['No template calls wp_head(); add it to header.php'])
  })

  it('errors when nothing calls wp_footer()', () => {
    const files = { ...goodHybridFiles(), 'footer.php': '</body></html>' }
    expect(messages(runRule(THEME_013, files))).toEqual(['No template calls wp_footer(); add it to footer.php'])
  })

  it('does not count commented-out calls', () => {
    const files = { ...goodHybridFiles(), 'header.php': '<?php // wp_head(); ?><html>' }
    expect(messages(runRule(THEME_013, files))).toEqual(['No template calls wp_head(); add it to header.php'])
  })

  it('does not apply to block themes', () => {
    expect(THEME_013.appliesTo).not.toContain('block')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @stratawp/theme-review exec vitest run src/__tests__/rules-structure.test.ts`
Expected: FAIL, `Failed to resolve import "../rules/structure"`.

- [ ] **Step 3: Implement the structural rules**

`packages/theme-review/src/rules/structure.ts`:

```ts
import { phpOnly } from '../php'
import { readPngSize } from '../png'
import type { Rule, RuleResult, ThemeType } from '../types'

const ALL: ThemeType[] = ['block', 'classic', 'hybrid']

const HEADER_NAMES: Record<string, string> = {
  'theme name': 'Theme Name',
  version: 'Version',
  license: 'License',
  'license uri': 'License URI',
  'text domain': 'Text Domain',
  'tested up to': 'Tested up to',
  'requires at least': 'Requires at least',
  'requires php': 'Requires PHP',
  description: 'Description',
  author: 'Author',
}

const REQUIRED_HEADERS = ['theme name', 'version', 'license', 'license uri', 'text domain']
const RECOMMENDED_HEADERS = ['tested up to', 'requires at least', 'requires php', 'description', 'author']

export const THEME_001: Rule = {
  id: 'THEME-001',
  description: 'style.css has the required theme headers',
  severity: 'error',
  appliesTo: ALL,
  check(ctx) {
    if (!ctx.exists('style.css')) {
      return [{ message: 'style.css is missing', file: 'style.css' }]
    }
    return REQUIRED_HEADERS.filter((key) => !ctx.styleHeader[key]).map((key) => ({
      message: `style.css is missing the required header "${HEADER_NAMES[key]}"`,
      file: 'style.css',
    }))
  },
}

export const THEME_002: Rule = {
  id: 'THEME-002',
  description: 'style.css has the recommended theme headers',
  severity: 'warning',
  appliesTo: ALL,
  check(ctx) {
    if (!ctx.exists('style.css')) return []
    return RECOMMENDED_HEADERS.filter((key) => !ctx.styleHeader[key]).map((key) => ({
      message: `style.css is missing the recommended header "${HEADER_NAMES[key]}"`,
      file: 'style.css',
    }))
  },
}

export const THEME_003: Rule = {
  id: 'THEME-003',
  description: 'screenshot.png exists and is 1200×900',
  severity: 'error',
  appliesTo: ALL,
  check(ctx) {
    const bytes = ctx.readBytes('screenshot.png')
    if (!bytes) {
      return [{ message: 'screenshot.png is missing', file: 'screenshot.png', severity: 'error' }]
    }
    const size = readPngSize(bytes)
    if (!size) {
      return [{ message: 'screenshot.png is not a valid PNG file', file: 'screenshot.png', severity: 'warning' }]
    }
    if (size.width !== 1200 || size.height !== 900) {
      return [
        {
          message: `screenshot.png is ${size.width}×${size.height}; WordPress.org recommends 1200×900`,
          file: 'screenshot.png',
          severity: 'warning',
        },
      ]
    }
    return []
  },
}

export const THEME_004: Rule = {
  id: 'THEME-004',
  description: 'index.php exists',
  severity: 'error',
  appliesTo: ['classic', 'hybrid'],
  check(ctx) {
    return ctx.exists('index.php') ? [] : [{ message: 'index.php is missing', file: 'index.php' }]
  },
}

export const THEME_005: Rule = {
  id: 'THEME-005',
  description: 'readme.txt exists',
  severity: 'warning',
  appliesTo: ALL,
  check(ctx) {
    return ctx.exists('readme.txt') ? [] : [{ message: 'readme.txt is missing', file: 'readme.txt' }]
  },
}

export const THEME_006: Rule = {
  id: 'THEME-006',
  description: 'block themes have templates/index.html and a valid theme.json',
  severity: 'error',
  appliesTo: ['block', 'hybrid'],
  check(ctx) {
    const findings: RuleResult[] = []

    if (!ctx.exists('templates/index.html')) {
      findings.push({ message: 'templates/index.html is missing', file: 'templates/index.html' })
    }

    const text = ctx.read('theme.json')
    if (text === undefined) {
      findings.push({ message: 'theme.json is missing', file: 'theme.json' })
      return findings
    }

    let json: Record<string, unknown>
    try {
      json = JSON.parse(text) as Record<string, unknown>
    } catch {
      findings.push({ message: 'theme.json is not valid JSON', file: 'theme.json' })
      return findings
    }

    if (json['$schema'] === undefined) {
      findings.push({ message: 'theme.json is missing "$schema"', file: 'theme.json' })
    }
    if (json['version'] === undefined || json['version'] === null) {
      findings.push({ message: 'theme.json is missing "version"', file: 'theme.json' })
    }
    return findings
  },
}

export const THEME_007: Rule = {
  id: 'THEME-007',
  description: 'pattern files declare a Title and a namespaced Slug that matches the text domain',
  severity: 'warning',
  appliesTo: ['block', 'hybrid'],
  check(ctx) {
    const findings: RuleResult[] = []
    const patterns = ctx.files.filter((file) => /^patterns\/[^/]+\.php$/.test(file))

    for (const file of patterns) {
      const head = (ctx.read(file) ?? '').slice(0, 4096)
      const block = /\/\*\*?([\s\S]*?)\*\//.exec(head)?.[1] ?? ''
      const title = /^\s*\*?\s*Title:\s*(.+)$/im.exec(block)
      const slug = /^\s*\*?\s*Slug:\s*(\S+)/im.exec(block)?.[1]

      if (!title) {
        findings.push({ message: `${file} is missing a "Title:" header`, file })
      }
      if (!slug) {
        findings.push({ message: `${file} is missing a "Slug:" header`, file })
        continue
      }
      if (!slug.includes('/')) {
        findings.push({
          message: `${file}: slug "${slug}" should be namespaced like "${ctx.textDomain ?? 'theme'}/name"`,
          file,
        })
        continue
      }
      const namespace = slug.split('/')[0] as string
      if (ctx.textDomain && namespace !== ctx.textDomain) {
        findings.push({
          message: `${file}: slug namespace "${namespace}" does not match the text domain "${ctx.textDomain}"`,
          file,
        })
      }
    }
    return findings
  },
}

export const THEME_013: Rule = {
  id: 'THEME-013',
  description: 'classic and hybrid themes call wp_head() and wp_footer()',
  severity: 'error',
  appliesTo: ['classic', 'hybrid'],
  check(ctx) {
    const code = ctx.files
      .filter((file) => file.endsWith('.php'))
      .map((file) => phpOnly(ctx.read(file) ?? ''))
    const findings: RuleResult[] = []

    if (!code.some((text) => /\bwp_head\s*\(/.test(text))) {
      findings.push({ message: 'No template calls wp_head(); add it to header.php', file: 'header.php' })
    }
    if (!code.some((text) => /\bwp_footer\s*\(/.test(text))) {
      findings.push({ message: 'No template calls wp_footer(); add it to footer.php', file: 'footer.php' })
    }
    return findings
  },
}
```

- [ ] **Step 4: Run to verify they pass, then quality gates**

```bash
pnpm --filter @stratawp/theme-review test
pnpm exec prettier --write packages/theme-review
pnpm exec eslint packages/theme-review/src
```

Expected: PASS. Each rule test fails if its rule is removed or weakened; to confirm, temporarily make `THEME_001.check` return `[]`, run `rules-structure.test.ts`, confirm the 001 failure tests go red, restore. Report the output.

- [ ] **Step 5: Commit**

```bash
git add packages/theme-review/src/rules/structure.ts packages/theme-review/src/__tests__/rule-helpers.ts packages/theme-review/src/__tests__/rules-structure.test.ts
git commit -m "feat(theme-review): add structural rules THEME-001 to 007 and 013"
```

---

### Task 4: PHP-scanning rules (THEME-008 to 012)

**Files:**
- Create: `packages/theme-review/src/rules/php-scan.ts`
- Test: `packages/theme-review/src/__tests__/rules-php.test.ts`

**Interfaces:**
- Consumes: Task 2's `phpOnly`, `extractCalls`, `lineOf`; Task 1's types; Task 3's `runRule`.
- Produces: `THEME_008`, `THEME_009`, `THEME_010`, `THEME_011`, `THEME_012` (each a `Rule`).

- [ ] **Step 1: Write the failing tests**

`packages/theme-review/src/__tests__/rules-php.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { THEME_008, THEME_009, THEME_010, THEME_011, THEME_012 } from '../rules/php-scan'
import { cleanupThemes, goodHybridFiles } from './helpers'
import { runRule } from './rule-helpers'

afterEach(cleanupThemes)

const php = (body: string) => `<?php\n${body}\n`
const withFile = (name: string, content: string) => ({ ...goodHybridFiles(), [name]: content })
const messages = (results: { message: string }[]) => results.map((r) => r.message)

describe('THEME-008 text domain', () => {
  it('passes on a good theme', () => {
    expect(runRule(THEME_008, goodHybridFiles())).toEqual([])
  })

  it('groups wrong-domain calls per file and domain, with the first line and a count', () => {
    const files = withFile('inc/a.php', php(`echo __( 'x', 'frost' );\necho __( 'y', 'frost' );`))
    const results = runRule(THEME_008, files)
    expect(results).toHaveLength(1)
    expect(results[0]?.message).toBe(`Text domain "frost" does not match the theme's "fixture-theme" (2 calls)`)
    expect(results[0]?.file).toBe('inc/a.php')
    expect(results[0]?.line).toBe(2)
  })

  it('reads the domain from the right argument for _x, _n and _nx', () => {
    const files = withFile(
      'inc/a.php',
      php(`_x( 'a', 'ctx', 'bad1' );\n_n( 'a', 'b', 3, 'bad2' );\n_nx( 'a', 'b', 3, 'ctx', 'bad3' );`)
    )
    const out = messages(runRule(THEME_008, files)).join('\n')
    expect(out).toContain('"bad1"')
    expect(out).toContain('"bad2"')
    expect(out).toContain('"bad3"')
  })

  it('ignores non-literal domains, method calls, and commented-out calls', () => {
    const files = withFile(
      'inc/a.php',
      php(`__( 'x', $domain );\n$this->__( 'x', 'frost' );\n// __( 'x', 'frost' );\n/* _e( 'x', 'frost' ); */`)
    )
    expect(runRule(THEME_008, files)).toEqual([])
  })

  it('does nothing when style.css declares no text domain', () => {
    const files = { ...withFile('inc/a.php', php(`__( 'x', 'frost' );`)), 'style.css': '/* Theme Name: X */' }
    expect(runRule(THEME_008, files)).toEqual([])
  })
})

describe('THEME-009 prefixing', () => {
  it('passes on a good theme', () => {
    expect(runRule(THEME_009, goodHybridFiles())).toEqual([])
  })

  it('flags unprefixed top-level functions and names the expected prefix', () => {
    const out = messages(runRule(THEME_009, withFile('inc/a.php', php(`function add_resource_hints() {}`))))
    expect(out).toEqual(['Function "add_resource_hints" is not prefixed with "fixture_theme_"'])
  })

  it('accepts prefixed functions, classes, and constants', () => {
    const files = withFile(
      'inc/a.php',
      php(`function fixture_theme_x() {}\nclass FixtureThemeThing {}\ndefine( 'FIXTURE_THEME_VERSION', '1' );`)
    )
    expect(runRule(THEME_009, files)).toEqual([])
  })

  it('flags unprefixed classes and constants', () => {
    const files = withFile('inc/a.php', php(`class Foo_Bar {}\ndefine( 'MY_CONST', 1 );`))
    const out = messages(runRule(THEME_009, files))
    expect(out.some((m) => m.includes('Class "Foo_Bar"'))).toBe(true)
    expect(out.some((m) => m.includes('Constant "MY_CONST"'))).toBe(true)
  })

  it('skips files that declare a namespace', () => {
    const files = withFile('inc/a.php', php(`namespace Foo;\nfunction anything() {}\nclass Whatever {}`))
    expect(runRule(THEME_009, files)).toEqual([])
  })

  it('does not flag indented methods inside a prefixed class', () => {
    const files = withFile('inc/a.php', php(`class FixtureThemeThing {\n\tfunction run() {}\n}`))
    expect(runRule(THEME_009, files)).toEqual([])
  })

  it('ignores declarations inside comments', () => {
    const files = withFile('inc/a.php', php(`// function bad_name() {}\n/* class Bad {} */`))
    expect(runRule(THEME_009, files)).toEqual([])
  })
})

describe('THEME-010 plugin territory', () => {
  it('passes on a good theme', () => {
    expect(runRule(THEME_010, goodHybridFiles())).toEqual([])
  })

  it.each(['register_post_type', 'register_taxonomy', 'add_shortcode'])('flags %s()', (fn) => {
    const results = runRule(THEME_010, withFile('inc/a.php', php(`${fn}( 'x', array() );`)))
    expect(results).toHaveLength(1)
    expect(results[0]?.message).toContain(`${fn}()`)
    expect(results[0]?.line).toBe(2)
  })

  it('ignores commented-out calls', () => {
    expect(runRule(THEME_010, withFile('inc/a.php', php(`// register_post_type( 'x' );`)))).toEqual([])
  })
})

describe('THEME-011 remote assets', () => {
  it('passes on a good theme', () => {
    expect(runRule(THEME_011, goodHybridFiles())).toEqual([])
  })

  it('flags remote URLs passed to enqueue/register functions', () => {
    const files = withFile('inc/a.php', php(`wp_enqueue_script( 'x', 'https://cdn.example.com/x.js' );`))
    const results = runRule(THEME_011, files)
    expect(results).toHaveLength(1)
    expect(results[0]?.message).toContain('wp_enqueue_script()')
    expect(results[0]?.message).toContain('https://cdn.example.com/x.js')
  })

  it('does not flag local asset helpers', () => {
    const files = withFile('inc/a.php', php(`wp_enqueue_style( 'y', get_theme_file_uri( 'a.css' ) );`))
    expect(runRule(THEME_011, files)).toEqual([])
  })

  it('flags remote script tags and remote stylesheet links, including protocol-relative ones', () => {
    const files = withFile(
      'header.php',
      `<?php wp_head(); ?><script src="https://cdn.example.com/a.js"></script>\n<link rel="stylesheet" href="//fonts.example.com/a.css">`
    )
    expect(runRule(THEME_011, files)).toHaveLength(2)
  })

  it('does not flag preconnect links or relative scripts', () => {
    const files = withFile(
      'header.php',
      `<?php wp_head(); ?><link rel="preconnect" href="https://fonts.googleapis.com"><script src="/js/a.js"></script>`
    )
    expect(runRule(THEME_011, files)).toEqual([])
  })
})

describe('THEME-012 risky functions', () => {
  it('passes on a good theme', () => {
    expect(runRule(THEME_012, goodHybridFiles())).toEqual([])
  })

  it('reports eval() and create_function() as errors', () => {
    const files = withFile('inc/a.php', php(`eval( '1' );\n$f = create_function( '', '' );`))
    const results = runRule(THEME_012, files)
    expect(results).toHaveLength(2)
    expect(results.every((r) => r.severity === 'error')).toBe(true)
  })

  it('reports base64_decode() as a warning', () => {
    const [finding] = runRule(THEME_012, withFile('inc/a.php', php(`$x = base64_decode( 'eA==' );`)))
    expect(finding?.severity).toBe('warning')
  })

  it('ignores method calls and comments', () => {
    const files = withFile('inc/a.php', php(`$this->eval( 1 );\n// eval( 'x' );`))
    expect(runRule(THEME_012, files)).toEqual([])
  })
})

describe('HTML text and URLs do not confuse the PHP scanners', () => {
  it('produces no findings for apostrophes in HTML, // in URLs, and commented-out code', () => {
    const files = withFile(
      'inc/mixed.php',
      `<p>Don't <?php echo 1; ?> won't</p>\n<?php // __( 'x', 'frost' );\n$u = 'https://example.com/a'; function fixture_theme_ok() {}\n`
    )
    for (const rule of [THEME_008, THEME_009, THEME_010, THEME_012]) {
      expect(runRule(rule, files)).toEqual([])
    }
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @stratawp/theme-review exec vitest run src/__tests__/rules-php.test.ts`
Expected: FAIL, `Failed to resolve import "../rules/php-scan"`.

- [ ] **Step 3: Implement the PHP-scanning rules**

`packages/theme-review/src/rules/php-scan.ts`:

```ts
import { extractCalls, lineOf, phpOnly } from '../php'
import type { Rule, RuleResult, ThemeContext, ThemeType } from '../types'

const ALL: ThemeType[] = ['block', 'classic', 'hybrid']

const phpFiles = (ctx: ThemeContext): string[] => ctx.files.filter((file) => file.endsWith('.php'))
const codeOf = (ctx: ThemeContext, file: string): string => phpOnly(ctx.read(file) ?? '')

/** Index of the text-domain argument for each gettext function. */
const DOMAIN_ARG: Record<string, number> = {
  __: 1,
  _e: 1,
  esc_html__: 1,
  esc_html_e: 1,
  esc_attr__: 1,
  esc_attr_e: 1,
  _x: 2,
  esc_html_x: 2,
  esc_attr_x: 2,
  _n: 3,
  _nx: 4,
}

export const THEME_008: Rule = {
  id: 'THEME-008',
  description: "gettext calls use the theme's declared text domain",
  severity: 'warning',
  appliesTo: ALL,
  check(ctx) {
    const expected = ctx.textDomain
    if (!expected) return []
    const findings: RuleResult[] = []

    for (const file of phpFiles(ctx)) {
      const code = codeOf(ctx, file)
      const groups = new Map<string, { count: number; line: number }>()

      for (const call of extractCalls(code, Object.keys(DOMAIN_ARG))) {
        const arg = call.args[DOMAIN_ARG[call.name] as number]
        const literal = arg === undefined ? null : /^(['"])([^'"]*)\1$/.exec(arg)
        if (!literal) continue
        const domain = literal[2] as string
        if (domain === expected) continue
        const group = groups.get(domain)
        if (group) {
          group.count++
        } else {
          groups.set(domain, { count: 1, line: lineOf(code, call.index) })
        }
      }

      for (const [domain, group] of groups) {
        findings.push({
          message: `Text domain "${domain}" does not match the theme's "${expected}" (${group.count} call${group.count === 1 ? '' : 's'})`,
          file,
          line: group.line,
        })
      }
    }
    return findings
  },
}

export const THEME_009: Rule = {
  id: 'THEME-009',
  description: 'top-level PHP functions, classes and constants are prefixed or namespaced',
  severity: 'warning',
  appliesTo: ALL,
  check(ctx) {
    const textDomain = ctx.textDomain
    if (!textDomain) return []

    const prefix = textDomain.toLowerCase().replace(/[^a-z0-9]+/g, '_')
    const pascal = textDomain
      .split(/[^a-zA-Z0-9]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
    const findings: RuleResult[] = []

    for (const file of phpFiles(ctx)) {
      const code = codeOf(ctx, file)
      if (/^\s*namespace\s+[\w\\]+\s*[;{]/m.test(code)) continue

      for (const match of code.matchAll(/^function\s+&?\s*(\w+)\s*\(/gm)) {
        const name = match[1] as string
        if (!name.toLowerCase().startsWith(prefix)) {
          findings.push({
            message: `Function "${name}" is not prefixed with "${prefix}_"`,
            file,
            line: lineOf(code, match.index ?? 0),
          })
        }
      }

      for (const match of code.matchAll(/^(?:abstract\s+|final\s+)?class\s+(\w+)/gm)) {
        const name = match[1] as string
        if (!name.startsWith(pascal) && !name.toLowerCase().startsWith(prefix)) {
          findings.push({
            message: `Class "${name}" is not prefixed with "${pascal}" or namespaced`,
            file,
            line: lineOf(code, match.index ?? 0),
          })
        }
      }

      const constants = [
        ...code.matchAll(/^\s*define\s*\(\s*['"](\w+)['"]/gm),
        ...code.matchAll(/^const\s+(\w+)\s*=/gm),
      ]
      for (const match of constants) {
        const name = match[1] as string
        if (!name.toLowerCase().startsWith(prefix)) {
          findings.push({
            message: `Constant "${name}" is not prefixed with "${prefix.toUpperCase()}_"`,
            file,
            line: lineOf(code, match.index ?? 0),
          })
        }
      }
    }
    return findings
  },
}

export const THEME_010: Rule = {
  id: 'THEME-010',
  description: 'custom post types, taxonomies and shortcodes belong in a plugin',
  severity: 'warning',
  appliesTo: ALL,
  check(ctx) {
    const findings: RuleResult[] = []
    const re = /(?<![\w$>:])(register_post_type|register_taxonomy|add_shortcode)\s*\(/g

    for (const file of phpFiles(ctx)) {
      const code = codeOf(ctx, file)
      for (const match of code.matchAll(re)) {
        findings.push({
          message: `${match[1]}() is plugin territory; WordPress.org expects custom post types, taxonomies and shortcodes in a plugin`,
          file,
          line: lineOf(code, match.index ?? 0),
        })
      }
    }
    return findings
  },
}

const ENQUEUE_FUNCTIONS = ['wp_enqueue_script', 'wp_enqueue_style', 'wp_register_script', 'wp_register_style']

export const THEME_011: Rule = {
  id: 'THEME-011',
  description: 'scripts and styles are bundled with the theme, not loaded from remote hosts',
  severity: 'warning',
  appliesTo: ALL,
  check(ctx) {
    const findings: RuleResult[] = []

    for (const file of ctx.files.filter((f) => f.endsWith('.php') || f.endsWith('.html'))) {
      const raw = ctx.read(file) ?? ''

      if (file.endsWith('.php')) {
        const code = phpOnly(raw)
        for (const call of extractCalls(code, ENQUEUE_FUNCTIONS)) {
          const src = call.args[1]
          if (src && /^['"](?:https?:)?\/\//i.test(src)) {
            findings.push({
              message: `${call.name}() loads a remote asset (${src.slice(1, -1)}); bundle assets with the theme instead`,
              file,
              line: lineOf(code, call.index),
            })
          }
        }
      }

      for (const match of raw.matchAll(/<(script|link)\b[^>]*>/gi)) {
        const tag = match[0]
        if ((match[1] as string).toLowerCase() === 'link' && !/rel\s*=\s*["']stylesheet["']/i.test(tag)) {
          continue
        }
        const url = /\b(?:src|href)\s*=\s*["']((?:https?:)?\/\/[^"']+)["']/i.exec(tag)
        if (url) {
          findings.push({
            message: `Remote ${(match[1] as string).toLowerCase()} asset (${url[1]}); bundle assets with the theme instead`,
            file,
            line: lineOf(raw, match.index ?? 0),
          })
        }
      }
    }
    return findings
  },
}

export const THEME_012: Rule = {
  id: 'THEME-012',
  description: 'no eval() or create_function(); base64_decode() is discouraged',
  severity: 'error',
  appliesTo: ALL,
  check(ctx) {
    const findings: RuleResult[] = []

    for (const file of phpFiles(ctx)) {
      const code = codeOf(ctx, file)

      for (const match of code.matchAll(/(?<![\w$>:])(eval|create_function)\s*\(/g)) {
        findings.push({
          message: `${match[1]}() is not allowed in themes`,
          file,
          line: lineOf(code, match.index ?? 0),
          severity: 'error',
        })
      }
      for (const match of code.matchAll(/(?<![\w$>:])base64_decode\s*\(/g)) {
        findings.push({
          message: 'base64_decode() is discouraged in themes; it is often used to hide code',
          file,
          line: lineOf(code, match.index ?? 0),
          severity: 'warning',
        })
      }
    }
    return findings
  },
}
```

- [ ] **Step 4: Run to verify they pass, then quality gates**

```bash
pnpm --filter @stratawp/theme-review test
pnpm exec prettier --write packages/theme-review
pnpm exec eslint packages/theme-review/src
```

Expected: PASS. Prove Review Focus 4 is not vacuous: temporarily replace `phpOnly(ctx.read(file) ?? '')` in `codeOf` with the raw `ctx.read(file) ?? ''`, run `rules-php.test.ts`, confirm the "HTML text and URLs" test and the commented-out-code tests go red, then restore. Report the outputs.

- [ ] **Step 5: Commit**

```bash
git add packages/theme-review/src/rules/php-scan.ts packages/theme-review/src/__tests__/rules-php.test.ts
git commit -m "feat(theme-review): add PHP-scanning rules THEME-008 to 012"
```

---

### Task 5: Review engine, formatter, command, and public API

**Files:**
- Create: `packages/theme-review/src/rules/index.ts`, `review.ts`, `format.ts`, `run.ts`, `cli.ts`, `index.ts`, `packages/theme-review/README.md`
- Test: `packages/theme-review/src/__tests__/review.test.ts`, `run.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1 to 4.
- Produces (public API, used by Tasks 6 to 9): `reviewTheme(themeDir, options?: { type?: ThemeType; rules?: Rule[] }): Report`; `exitCodeFor(report, strict): number`; `formatReport(report): string`; `runCli(argv, io): number` with `io: { out(text), err(text) }`; `detectTheme`; `RULES: Rule[]`; `DISCLAIMER`; `ReviewError`; `THEME_TYPES`; the shared types. The `stratawp-review` binary (`dist/cli.js`).

- [ ] **Step 1: Write the failing tests**

`packages/theme-review/src/__tests__/review.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { ReviewError } from '../errors'
import { DISCLAIMER, exitCodeFor, reviewTheme } from '../review'
import type { Rule } from '../types'
import { cleanupThemes, goodBlockFiles, goodClassicFiles, goodHybridFiles, makeTheme, without } from './helpers'

afterEach(cleanupThemes)

describe('reviewTheme', () => {
  it.each([
    ['hybrid', goodHybridFiles],
    ['block', goodBlockFiles],
    ['classic', goodClassicFiles],
  ] as const)('reports no findings for a good %s theme', (type, factory) => {
    const report = reviewTheme(makeTheme(factory()))
    expect(report.themeType).toBe(type)
    expect(report.typeSource).toBe('detected')
    expect(report.findings).toEqual([])
    expect(report.summary).toEqual({ errors: 0, warnings: 0, infos: 0 })
    expect(report.disclaimer).toBe(DISCLAIMER)
  })

  it('has the documented JSON shape', () => {
    const files = { ...without(goodHybridFiles(), 'readme.txt') }
    const report = reviewTheme(makeTheme(files))
    expect(Object.keys(report).sort()).toEqual([
      'disclaimer',
      'findings',
      'summary',
      'themeDir',
      'themeType',
      'typeSource',
    ])
    expect(report.findings).toHaveLength(1)
    expect(Object.keys(report.findings[0] as object).sort()).toEqual(['file', 'message', 'ruleId', 'severity'])
    expect(report.findings[0]).toMatchObject({ ruleId: 'THEME-005', severity: 'warning', file: 'readme.txt' })
  })

  it('sorts errors before warnings, then by rule id and file', () => {
    const files = without(goodHybridFiles(), 'readme.txt', 'style.css')
    const ids = reviewTheme(makeTheme(files)).findings.map((f) => `${f.severity}:${f.ruleId}`)
    expect(ids[0]).toBe('error:THEME-001')
    expect(ids.indexOf('warning:THEME-005')).toBeGreaterThan(ids.indexOf('error:THEME-001'))
  })

  it('applies an explicit type override and records it', () => {
    const report = reviewTheme(makeTheme(goodHybridFiles()), { type: 'block' })
    expect(report.themeType).toBe('block')
    expect(report.typeSource).toBe('override')
  })

  it('lets package.json turn a rule off or change its severity', () => {
    const files = {
      ...without(goodHybridFiles(), 'readme.txt', 'screenshot.png'),
      'package.json': JSON.stringify({
        stratawp: { review: { rules: { 'THEME-005': 'off', 'THEME-003': 'warn' } } },
      }),
    }
    const report = reviewTheme(makeTheme(files))
    expect(report.findings.map((f) => f.ruleId)).toEqual(['THEME-003'])
    expect(report.findings[0]?.severity).toBe('warning')
  })

  it('honours review.ignore globs', () => {
    const files = {
      ...goodHybridFiles(),
      'legacy/old.php': '<?php eval( $x );',
      'package.json': JSON.stringify({ stratawp: { review: { ignore: ['legacy/**'] } } }),
    }
    expect(reviewTheme(makeTheme(files)).findings).toEqual([])
  })

  it('only runs rules that apply to the theme type', () => {
    const report = reviewTheme(makeTheme(without(goodClassicFiles(), 'index.php')))
    expect(report.findings.some((f) => f.ruleId === 'THEME-004')).toBe(true)
    const block = reviewTheme(makeTheme(without(goodBlockFiles(), 'index.php')))
    expect(block.findings.some((f) => f.ruleId === 'THEME-004')).toBe(false)
  })

  it('isolates a rule that throws: INTERNAL warning, other rules still run', () => {
    const boom: Rule = {
      id: 'THEME-999',
      description: 'always throws',
      severity: 'error',
      appliesTo: ['block', 'classic', 'hybrid'],
      check() {
        throw new Error('kaboom')
      },
    }
    const ok: Rule = {
      id: 'THEME-998',
      description: 'always finds one thing',
      severity: 'warning',
      appliesTo: ['block', 'classic', 'hybrid'],
      check: () => [{ message: 'still ran' }],
    }
    const report = reviewTheme(makeTheme(goodHybridFiles()), { rules: [boom, ok] })
    const internal = report.findings.find((f) => f.ruleId === 'INTERNAL')
    expect(internal?.severity).toBe('warning')
    expect(internal?.message).toContain('THEME-999')
    expect(internal?.message).toContain('kaboom')
    expect(report.findings.some((f) => f.message === 'still ran')).toBe(true)
  })

  it('throws a ReviewError for a missing directory', () => {
    expect(() => reviewTheme('/definitely/not/a/theme')).toThrow(ReviewError)
  })
})

describe('exitCodeFor', () => {
  const report = (errors: number, warnings: number) =>
    ({ summary: { errors, warnings, infos: 0 } }) as Parameters<typeof exitCodeFor>[0]

  it('is 0 with only warnings, 1 with errors', () => {
    expect(exitCodeFor(report(0, 3), false)).toBe(0)
    expect(exitCodeFor(report(1, 0), false)).toBe(1)
  })

  it('fails on warnings only with strict', () => {
    expect(exitCodeFor(report(0, 1), true)).toBe(1)
    expect(exitCodeFor(report(0, 0), true)).toBe(0)
  })
})
```

`packages/theme-review/src/__tests__/run.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { runCli } from '../run'
import { cleanupThemes, goodHybridFiles, makeTheme, without } from './helpers'

afterEach(cleanupThemes)

function run(argv: string[]) {
  const out: string[] = []
  const err: string[] = []
  const code = runCli(argv, { out: (t) => out.push(t), err: (t) => err.push(t) })
  return { code, out: out.join('\n'), err: err.join('\n') }
}

describe('runCli', () => {
  it('prints a text report and exits 0 for a good theme', () => {
    const { code, out } = run([makeTheme(goodHybridFiles())])
    expect(code).toBe(0)
    expect(out).toContain('Theme type: hybrid (detected)')
    expect(out).toContain('No findings.')
    expect(out).toContain('approximates the WordPress.org theme guidelines')
  })

  it('prints JSON with --json', () => {
    const { code, out } = run([makeTheme(goodHybridFiles()), '--json'])
    expect(code).toBe(0)
    const parsed = JSON.parse(out)
    expect(parsed.themeType).toBe('hybrid')
    expect(parsed.findings).toEqual([])
  })

  it('exits 1 when there are errors', () => {
    const { code, out } = run([makeTheme(without(goodHybridFiles(), 'style.css'))])
    expect(code).toBe(1)
    expect(out).toContain('THEME-001')
    expect(out).toContain('style.css is missing')
  })

  it('exits 0 for warnings only, and 1 with --strict', () => {
    const dir = makeTheme(without(goodHybridFiles(), 'readme.txt'))
    expect(run([dir]).code).toBe(0)
    expect(run([dir, '--strict']).code).toBe(1)
  })

  it('accepts --type=… and --type …', () => {
    const dir = makeTheme(goodHybridFiles())
    expect(run([dir, '--type=block', '--json']).out).toContain('"themeType": "block"')
    expect(run([dir, '--type', 'classic', '--json']).out).toContain('"themeType": "classic"')
  })

  it('exits 2 with a clear message for a missing directory', () => {
    const { code, err } = run(['/definitely/not/a/theme'])
    expect(code).toBe(2)
    expect(err).toContain('Theme directory not found')
    expect(err).not.toContain('    at ')
  })

  it('exits 2 for an invalid --type', () => {
    const { code, err } = run([makeTheme(goodHybridFiles()), '--type=headless'])
    expect(code).toBe(2)
    expect(err).toContain('Invalid --type "headless"')
  })

  it('exits 2 for an invalid themeType in package.json', () => {
    const dir = makeTheme({ ...goodHybridFiles(), 'package.json': JSON.stringify({ stratawp: { themeType: 'nope' } }) })
    const { code, err } = run([dir])
    expect(code).toBe(2)
    expect(err).toContain('Invalid stratawp.themeType "nope"')
  })

  it('exits 2 for an unknown option', () => {
    const { code, err } = run(['--frobnicate'])
    expect(code).toBe(2)
    expect(err).toContain('Unknown option: --frobnicate')
  })

  it('prints usage with --help and exits 0', () => {
    const { code, out } = run(['--help'])
    expect(code).toBe(0)
    expect(out).toContain('Usage: stratawp-review')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @stratawp/theme-review exec vitest run src/__tests__/review.test.ts src/__tests__/run.test.ts`
Expected: FAIL, `Failed to resolve import "../review"` / `"../run"`.

- [ ] **Step 3: Implement the registry, engine, formatter, command, and index**

`packages/theme-review/src/rules/index.ts`:

```ts
import type { Rule } from '../types'
import { THEME_008, THEME_009, THEME_010, THEME_011, THEME_012 } from './php-scan'
import {
  THEME_001,
  THEME_002,
  THEME_003,
  THEME_004,
  THEME_005,
  THEME_006,
  THEME_007,
  THEME_013,
} from './structure'

/** Every rule, in id order. Add new rules here and nowhere else. */
export const RULES: Rule[] = [
  THEME_001,
  THEME_002,
  THEME_003,
  THEME_004,
  THEME_005,
  THEME_006,
  THEME_007,
  THEME_008,
  THEME_009,
  THEME_010,
  THEME_011,
  THEME_012,
  THEME_013,
]
```

`packages/theme-review/src/review.ts`:

```ts
import { resolve } from 'node:path'
import { readConfig } from './config'
import { buildContext } from './context'
import { assertDirectory, detectTheme } from './detect'
import { RULES } from './rules'
import type { Finding, Report, Rule, Severity, ThemeType } from './types'

export const DISCLAIMER =
  'This review approximates the WordPress.org theme guidelines using static checks. It is not a certification, and passing it does not guarantee acceptance.'

const ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 }

export interface ReviewOptions {
  /** Overrides detection and package.json. */
  type?: ThemeType
  /** Test hook: replaces the registered rule set. */
  rules?: Rule[]
}

export function reviewTheme(themeDir: string, options: ReviewOptions = {}): Report {
  const dir = resolve(themeDir)
  assertDirectory(dir)

  const config = readConfig(dir)
  const { themeType, typeSource } = detectTheme(dir, options.type)
  const ctx = buildContext(dir, themeType, config)
  const findings: Finding[] = []

  for (const rule of options.rules ?? RULES) {
    if (!rule.appliesTo.includes(themeType)) continue
    const override = config.rules[rule.id]
    if (override === 'off') continue

    let results
    try {
      results = rule.check(ctx)
    } catch (error) {
      findings.push({
        ruleId: 'INTERNAL',
        severity: 'warning',
        message: `Rule ${rule.id} crashed and was skipped: ${error instanceof Error ? error.message : String(error)}`,
      })
      continue
    }

    for (const result of results) {
      findings.push({
        ruleId: rule.id,
        severity: override ?? result.severity ?? rule.severity,
        message: result.message,
        ...(result.file !== undefined && { file: result.file }),
        ...(result.line !== undefined && { line: result.line }),
      })
    }
  }

  findings.sort(
    (a, b) =>
      ORDER[a.severity] - ORDER[b.severity] ||
      a.ruleId.localeCompare(b.ruleId) ||
      (a.file ?? '').localeCompare(b.file ?? '') ||
      (a.line ?? 0) - (b.line ?? 0)
  )

  return {
    themeDir: dir,
    themeType,
    typeSource,
    summary: {
      errors: findings.filter((f) => f.severity === 'error').length,
      warnings: findings.filter((f) => f.severity === 'warning').length,
      infos: findings.filter((f) => f.severity === 'info').length,
    },
    findings,
    disclaimer: DISCLAIMER,
  }
}

/** 0 pass; 1 on errors (or on warnings when `strict`). */
export function exitCodeFor(report: Report, strict: boolean): number {
  if (report.summary.errors > 0) return 1
  if (strict && report.summary.warnings > 0) return 1
  return 0
}
```

`packages/theme-review/src/format.ts`:

```ts
import type { Report } from './types'

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`

export function formatReport(report: Report): string {
  const lines = [
    `StrataWP theme review: ${report.themeDir}`,
    `Theme type: ${report.themeType} (${report.typeSource})`,
    '',
  ]

  if (report.findings.length === 0) {
    lines.push('No findings.')
  }
  for (const finding of report.findings) {
    const where = finding.file ? `  (${finding.file}${finding.line ? `:${finding.line}` : ''})` : ''
    lines.push(`${finding.severity.padEnd(7)} ${finding.ruleId.padEnd(9)} ${finding.message}${where}`)
  }

  lines.push(
    '',
    `${plural(report.summary.errors, 'error')}, ${plural(report.summary.warnings, 'warning')}, ${plural(report.summary.infos, 'info')}`,
    '',
    report.disclaimer
  )
  return lines.join('\n')
}
```

`packages/theme-review/src/run.ts`:

```ts
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
      typeArg = argv[++i]
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
    if (error instanceof ReviewError) {
      io.err(error.message)
      return 2
    }
    throw error
  }
}
```

`packages/theme-review/src/cli.ts`:

```ts
import { runCli } from './run'

process.exitCode = runCli(process.argv.slice(2), {
  out: (text) => console.log(text),
  err: (text) => console.error(text),
})
```

`packages/theme-review/src/index.ts`:

```ts
export { reviewTheme, exitCodeFor, DISCLAIMER } from './review'
export type { ReviewOptions } from './review'
export { formatReport } from './format'
export { runCli } from './run'
export type { Io } from './run'
export { detectTheme } from './detect'
export type { ThemeTypeResult } from './detect'
export { THEME_TYPES, isThemeType } from './config'
export { ReviewError } from './errors'
export { RULES } from './rules'
export type {
  Finding,
  Report,
  Rule,
  RuleResult,
  Severity,
  SeverityOverride,
  ThemeContext,
  ThemeType,
} from './types'
```

`packages/theme-review/README.md`:

````markdown
# @stratawp/theme-review

Theme review checks for StrataWP themes. It approximates the WordPress.org theme guidelines with static checks. It is **not** a certification.

```bash
pnpm add -D @stratawp/theme-review
pnpm exec stratawp-review            # review the current directory
pnpm exec stratawp-review --json     # machine-readable report
pnpm exec stratawp-review --strict   # fail on warnings too
```

Exit codes: `0` pass, `1` errors (or warnings with `--strict`), `2` usage or file problem.

## Theme types

The checker detects whether a theme is `block`, `classic` or `hybrid` (block templates plus PHP templates) and applies the rules that fit. Override it in `package.json`:

```json
{
  "stratawp": {
    "themeType": "hybrid",
    "review": {
      "ignore": ["legacy/**"],
      "rules": { "THEME-005": "off", "THEME-009": "info" }
    }
  }
}
```

Always ignored: `vendor/`, `node_modules/`, `dist/`, and `*-generated.*` files.

## Rules

| Id | Applies to | Check | Default |
| --- | --- | --- | --- |
| THEME-001 | all | `style.css` has Theme Name, Version, License, License URI, Text Domain | error |
| THEME-002 | all | `style.css` has Tested up to, Requires at least, Requires PHP, Description, Author | warning |
| THEME-003 | all | `screenshot.png` exists and is 1200×900 | error / warning |
| THEME-004 | classic, hybrid | `index.php` exists | error |
| THEME-005 | all | `readme.txt` exists | warning |
| THEME-006 | block, hybrid | `templates/index.html` and a valid `theme.json` with `$schema` and `version` | error |
| THEME-007 | block, hybrid | pattern headers have Title and a Slug namespaced to the text domain | warning |
| THEME-008 | all | gettext calls use the declared text domain | warning |
| THEME-009 | all | top-level functions, classes and constants are prefixed or namespaced | warning |
| THEME-010 | all | no `register_post_type`, `register_taxonomy` or `add_shortcode` | warning |
| THEME-011 | all | no remote scripts or styles | warning |
| THEME-012 | all | no `eval()` / `create_function()` (error); `base64_decode()` (warning) | error / warning |
| THEME-013 | classic, hybrid | `wp_head()` and `wp_footer()` are called | error |

Output escaping is left to PHPCS, which checks it properly.
````

- [ ] **Step 4: Run to verify they pass, build, typecheck, lint**

```bash
pnpm --filter @stratawp/theme-review test
pnpm --filter @stratawp/theme-review build
pnpm --filter @stratawp/theme-review typecheck
pnpm exec prettier --write packages/theme-review
pnpm exec eslint packages/theme-review/src
node packages/theme-review/dist/cli.js --help
```

Expected: all tests PASS; build produces `dist/cli.js` and `dist/index.js`; typecheck clean; ESLint 0 errors; `--help` prints the usage text and exits 0.

- [ ] **Step 5: Prove Review Focus 2 and 1 are not vacuous**

Temporarily remove the `try { … } catch` around `rule.check(ctx)` in `review.ts` (call `rule.check(ctx)` directly) and confirm the "isolates a rule that throws" test goes red; restore. Temporarily make `assertDirectory` a no-op and confirm the missing-directory tests go red (or error with a raw `ENOENT`); restore. Report both outputs.

- [ ] **Step 6: Commit**

```bash
git add packages/theme-review/src/rules/index.ts packages/theme-review/src/review.ts packages/theme-review/src/format.ts packages/theme-review/src/run.ts packages/theme-review/src/cli.ts packages/theme-review/src/index.ts packages/theme-review/src/__tests__/review.test.ts packages/theme-review/src/__tests__/run.test.ts packages/theme-review/README.md
git commit -m "feat(theme-review): add review engine, formatter, stratawp-review command, and public API"
```

---

### Task 6: Self-check on the six themes, root script, and CI step

**Files:**
- Create: `scripts/review-themes.mjs`
- Modify: `package.json` (root), `.github/workflows/ci.yml`; theme files only if the measurement shows errors

**Interfaces:**
- Consumes: Task 5's built `packages/theme-review/dist/cli.js`.
- Produces: root script `review` (exit 0 when all six themes have zero errors), used by CI and by Tasks 8 and 10.

- [ ] **Step 1: Add the root script**

`scripts/review-themes.mjs`:

```js
#!/usr/bin/env node
// Runs the StrataWP theme review over every theme location in this repo.
// Requires a prior build of @stratawp/theme-review (pnpm build).
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cli = resolve(root, 'packages/theme-review/dist/cli.js')

const LOCATIONS = [
  'packages/cli/templates/basic-theme',
  'examples/basic-theme',
  'packages/cli/templates/store-theme',
  'examples/store-theme',
  'packages/cli/templates/advanced-theme',
  'examples/advanced-theme',
]

if (!existsSync(cli)) {
  console.error(`Theme review is not built (${cli} not found). Run "pnpm build" first.`)
  process.exit(1)
}

let failed = false
for (const loc of LOCATIONS) {
  const dir = resolve(root, loc)
  if (!existsSync(dir)) {
    console.error(`Location not found: ${loc}`)
    failed = true
    continue
  }
  process.stdout.write(`\n=== review: ${loc} ===\n`)
  try {
    execFileSync(process.execPath, [cli, dir], { stdio: 'inherit' })
  } catch {
    failed = true
  }
}
process.exit(failed ? 1 : 0)
```

In root `package.json` add to `scripts`, after `lint:php`:

```json
    "review": "node scripts/review-themes.mjs",
```

- [ ] **Step 2: Measure (decision gate)**

```bash
pnpm --filter @stratawp/theme-review build
OUT="$TMPDIR/review-baseline.txt"; pnpm review > "$OUT" 2>&1; echo "exit=$?"
grep -cE '^error ' "$OUT"; grep -cE '^warning ' "$OUT"
grep -E '^error ' "$OUT" | sort | uniq -c | sort -rn | head -20
```

Expected from the pre-measurement: **zero errors** and warnings only (screenshot size on all six themes, missing `readme.txt` on all six, text domain mismatches such as `frost` and `stratawp`, unprefixed functions, remote assets, custom post types in the advanced theme).

**Decision gate:** if the error count is greater than 10, **stop and report the counts to the maintainer** before changing any theme. If it is between 1 and 10, continue to Step 3. If it is 0, skip to Step 4.

- [ ] **Step 3: Fix errors (only if Step 2 found some)**

For each error: fix it in the **template** first (`packages/cli/templates/<name>-theme`), then check the twin with `cmp` (`examples/<name>-theme/<same path>`): if byte-identical before your change, `cp` the fixed file to the twin; otherwise fix both separately. Never hide an error by adding a `review.rules` override or `review.ignore` entry in a theme's `package.json`. If an error is a false positive of a rule, stop and report it so the rule can be fixed. Re-run `pnpm review` until exit 0.

- [ ] **Step 4: Wire CI**

In `.github/workflows/ci.yml`, in the `js` job, add after `- run: pnpm lint:css`:

```yaml
      - name: Theme review (zero errors on all StrataWP themes)
        run: pnpm review
```

- [ ] **Step 5: Verify and commit**

```bash
pnpm review; echo "exit=$?"
pnpm exec prettier --check .github/workflows/ci.yml package.json
```

Expected: `exit=0` and Prettier clean. Commit theme fixes (if any) separately from wiring, by explicit paths:

```bash
git add scripts/review-themes.mjs package.json .github/workflows/ci.yml
git commit -m "ci: add blocking theme review over all StrataWP themes"
```

---

### Task 7: CLI command and MCP tools

**Files:**
- Create: `packages/cli/src/commands/theme-review.ts`, `packages/cli/src/__tests__/theme-review-command.test.ts`
- Modify: `packages/cli/package.json`, `packages/cli/src/index.ts`, `packages/mcp/package.json`, `packages/mcp/src/tools.ts`, `packages/mcp/src/server.test.ts`, `packages/mcp/contracts/tools.snapshot.json`

**Interfaces:**
- Consumes: Task 5's `runCli`, `reviewTheme`, `exitCodeFor`, `formatReport`, `detectTheme`, `ReviewError`, `THEME_TYPES`.
- Produces: `stratawp theme:review [dir] [--json] [--strict] [--type <type>]`; MCP tools `review_theme({ themeDir, type?, strict? })` and `detect_theme_type({ themeDir })` (both read-only; errors return `isError: true`).

- [ ] **Step 1: Add the dependencies**

In `packages/cli/package.json` `dependencies` (alphabetical), add `"@stratawp/theme-review": "workspace:^"`. In `packages/mcp/package.json` `dependencies`, add `"@stratawp/theme-review": "workspace:*"`. Run `pnpm install`.

- [ ] **Step 2: Write the failing tests**

`packages/cli/src/__tests__/theme-review-command.test.ts`:

```ts
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
```

In `packages/mcp/src/server.test.ts`, replace the existing test named `exposes exactly the four scaffold_* tools, each with an inputSchema` (its `names` expectation lists the four scaffold tools) so the expectation becomes the six names below, keeping the rest of that test's body (the inputSchema check) unchanged:

```ts
    expect(names).toEqual([
      'detect_theme_type',
      'review_theme',
      'scaffold_block',
      'scaffold_component',
      'scaffold_part',
      'scaffold_template',
    ])
```

and rename that test to `exposes the scaffold_* and theme review tools, each with an inputSchema`. Then append this describe block at the end of the file:

```ts
describe('@stratawp/mcp theme review tools', () => {
  it('review_theme returns a structured report with zero errors for the basic-theme example', async () => {
    const result = await client.callTool({
      name: 'review_theme',
      arguments: { themeDir: BASIC_THEME_DIR },
    })
    expect(result.isError).toBeFalsy()
    const report = result.structuredContent as {
      themeType: string
      passed: boolean
      summary: { errors: number }
      findings: unknown[]
      disclaimer: string
    }
    expect(report.summary.errors).toBe(0)
    expect(report.passed).toBe(true)
    expect(report.themeType).toBe('hybrid')
    expect(Array.isArray(report.findings)).toBe(true)
    expect(report.disclaimer).toContain('approximates')
  })

  it('review_theme with strict fails when warnings exist', async () => {
    const result = await client.callTool({
      name: 'review_theme',
      arguments: { themeDir: BASIC_THEME_DIR, strict: true },
    })
    const report = result.structuredContent as { passed: boolean; summary: { warnings: number } }
    expect(report.summary.warnings).toBeGreaterThan(0)
    expect(report.passed).toBe(false)
  })

  it('review_theme returns an error result for a missing directory', async () => {
    const result = await client.callTool({
      name: 'review_theme',
      arguments: { themeDir: '/definitely/not/a/theme' },
    })
    expect(result.isError).toBe(true)
    const text = (result.content as Array<{ text: string }>)[0]?.text ?? ''
    expect(text).toContain('Theme directory not found')
  })

  it('detect_theme_type reports the type and its source', async () => {
    const result = await client.callTool({
      name: 'detect_theme_type',
      arguments: { themeDir: BASIC_THEME_DIR },
    })
    expect(result.structuredContent).toEqual({ themeType: 'hybrid', typeSource: 'detected' })
  })

  it('review_theme rejects a themeDir of the wrong type', async () => {
    const result = await client.callTool({ name: 'review_theme', arguments: { themeDir: 42 } })
    expect(result.isError).toBe(true)
  })
})
```

- [ ] **Step 3: Run to verify failure**

```bash
pnpm --filter @stratawp/theme-review build
pnpm --filter @stratawp/cli exec vitest run src/__tests__/theme-review-command.test.ts
pnpm --filter @stratawp/mcp exec vitest run src/server.test.ts
```

Expected: the CLI test FAILS to resolve `../commands/theme-review.js`; the MCP tests FAIL (the tool names expectation and the new describe block).

- [ ] **Step 4: Implement the CLI command**

`packages/cli/src/commands/theme-review.ts`:

```ts
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
```

In `packages/cli/src/index.ts` add the import next to the other command imports:

```ts
import { themeReviewCommand } from './commands/theme-review'
```

and register the command after the `part:new` registration block:

```ts
program
  .command('theme:review [dir]')
  .description('Review a theme against the WordPress.org theme guidelines (approximate)')
  .option('--json', 'Print the report as JSON')
  .option('--strict', 'Fail on warnings as well as errors')
  .option('--type <type>', 'Override the detected theme type: block | classic | hybrid')
  .action(themeReviewCommand)
```

- [ ] **Step 5: Implement the MCP tools**

In `packages/mcp/src/tools.ts`, add to the imports:

```ts
import {
  detectTheme,
  exitCodeFor,
  formatReport,
  reviewTheme,
  THEME_TYPES,
} from '@stratawp/theme-review'
```

Update the file's header comment sentence "Each `scaffold_*` tool is backed by …" by appending: `The review tools (`review_theme`, `detect_theme_type`) are read-only wrappers over `@stratawp/theme-review`.` Then add, before the closing brace of `registerTools`:

```ts
  const themeTypeSchema = z.enum([...THEME_TYPES] as [string, ...string[]])

  server.registerTool(
    'review_theme',
    {
      title: 'Review a theme against the WordPress.org theme guidelines',
      description:
        'Runs the StrataWP theme review (read-only) on a theme directory and returns structured findings. It approximates the WordPress.org theme guidelines with static checks and is not a certification. `passed` is false when there are errors, or warnings when `strict` is true.',
      inputSchema: {
        themeDir: z.string().describe('Absolute path to the theme directory to review'),
        type: themeTypeSchema
          .optional()
          .describe('Override the detected theme type: block, classic or hybrid'),
        strict: z.boolean().optional().describe('Treat warnings as failures in `passed`'),
      },
      outputSchema: {
        themeType: themeTypeSchema,
        typeSource: z.enum(['detected', 'override']),
        passed: z.boolean(),
        summary: z.object({ errors: z.number(), warnings: z.number(), infos: z.number() }),
        findings: z.array(
          z.object({
            ruleId: z.string(),
            severity: z.enum(['error', 'warning', 'info']),
            message: z.string(),
            file: z.string().optional(),
            line: z.number().optional(),
          })
        ),
        disclaimer: z.string(),
      },
    },
    async ({ themeDir, type, strict }) => {
      try {
        const report = reviewTheme(themeDir, { type: type as (typeof THEME_TYPES)[number] | undefined })
        const passed = exitCodeFor(report, strict ?? false) === 0
        return {
          structuredContent: {
            themeType: report.themeType,
            typeSource: report.typeSource,
            passed,
            summary: report.summary,
            findings: report.findings,
            disclaimer: report.disclaimer,
          },
          content: [{ type: 'text' as const, text: formatReport(report) }],
        }
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: error instanceof Error ? error.message : String(error) }],
        }
      }
    }
  )

  server.registerTool(
    'detect_theme_type',
    {
      title: 'Detect whether a theme is block, classic, or hybrid',
      description:
        'Read-only. Classifies a theme directory as block, classic or hybrid (both block templates and PHP templates) and says whether the answer was detected or came from a stratawp.themeType override in package.json.',
      inputSchema: {
        themeDir: z.string().describe('Absolute path to the theme directory'),
      },
      outputSchema: {
        themeType: themeTypeSchema,
        typeSource: z.enum(['detected', 'override']),
      },
    },
    async ({ themeDir }) => {
      try {
        const result = detectTheme(themeDir)
        return {
          structuredContent: { themeType: result.themeType, typeSource: result.typeSource },
          content: [
            { type: 'text' as const, text: `${result.themeType} (${result.typeSource})` },
          ],
        }
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: error instanceof Error ? error.message : String(error) }],
        }
      }
    }
  )
```

- [ ] **Step 6: Run to verify they pass; regenerate and check the contract snapshot**

```bash
pnpm --filter @stratawp/cli test
pnpm --filter @stratawp/mcp build
pnpm --filter @stratawp/mcp test
pnpm --filter @stratawp/mcp typecheck && pnpm --filter @stratawp/cli typecheck
pnpm --filter @stratawp/mcp snapshot
git diff --stat -- packages/mcp/contracts/tools.snapshot.json
pnpm contracts:check
pnpm exec prettier --write packages/cli/src/commands/theme-review.ts packages/cli/src/__tests__/theme-review-command.test.ts packages/mcp/src/tools.ts packages/mcp/src/server.test.ts packages/mcp/contracts/tools.snapshot.json
pnpm exec eslint packages/cli/src/commands packages/mcp/src
```

Expected: all PASS (the full mcp suite including the stdout-hygiene test, which proves the new tools write nothing to stdout); the snapshot diff shows two added tools; `pnpm contracts:check` exits 0 after the snapshot is regenerated and staged; typecheck and ESLint clean. If the `themeTypeSchema` cast or the `type` cast fails typecheck, adjust the casts but keep behavior and the schema unchanged.

- [ ] **Step 7: Commit**

```bash
git add packages/cli/package.json packages/cli/src/commands/theme-review.ts packages/cli/src/index.ts packages/cli/src/__tests__/theme-review-command.test.ts packages/mcp/package.json packages/mcp/src/tools.ts packages/mcp/src/server.test.ts packages/mcp/contracts/tools.snapshot.json pnpm-lock.yaml
git commit -m "feat(cli,mcp): add theme:review command and review_theme/detect_theme_type tools"
```

---

### Task 8: Agent layer (skills, AGENTS.md, ai-setup theme type, directions)

**Files:**
- Create: `.ai/skills/theme-review/SKILL.md` (root and the three templates), `packages/cli/src/ai-setup-theme-type.test.ts`
- Modify: root `AGENTS.md`, `.ai/SKILLS.md`, `.ai/developer-directions.md`, `.ai/skills/agent-code-review/SKILL.md`; in each template `AGENTS.md`, `.ai/SKILLS.md`, `.ai/developer-directions.md`, `scripts/ai-setup.mjs`; `packages/cli/src/ai-scaffold.test.ts`

**Interfaces:**
- Consumes: `detectTheme` from `@stratawp/theme-review` (loaded dynamically by the template script).
- Produces: a `**Theme type**` line in each theme's `.ai/agent-state.md` written by `ai-setup`; the `theme-review` skill; updated agent docs. Templates' agent files are byte-identical across the three templates: edit the basic template, then `cp` to `store-theme` and `advanced-theme`.

- [ ] **Step 1: Write the failing tests**

In `packages/cli/src/ai-scaffold.test.ts`, add `'.ai/skills/theme-review/SKILL.md',` to the `REQUIRED_FILES` array (after the `'.ai/skills/deployment/SKILL.md',` entry).

`packages/cli/src/ai-setup-theme-type.test.ts`:

```ts
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

/**
 * Runs a template's scripts/ai-setup.mjs in a temp theme with a stub
 * @stratawp/theme-review, to check it records the theme type in agent-state.md.
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE = join(__dirname, '..', 'templates', 'basic-theme')
const dirs: string[] = []

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function makeTheme({ withReview }: { withReview: boolean }): string {
  const dir = mkdtempSync(join(tmpdir(), 'sw-aisetup-'))
  dirs.push(dir)
  mkdirSync(join(dir, 'scripts'))
  mkdirSync(join(dir, '.ai'))
  cpSync(join(TEMPLATE, 'scripts', 'ai-setup.mjs'), join(dir, 'scripts', 'ai-setup.mjs'))
  cpSync(join(TEMPLATE, '.ai', 'agent-state.md'), join(dir, '.ai', 'agent-state.md'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 't', type: 'module' }))

  if (withReview) {
    const pkg = join(dir, 'node_modules', '@stratawp', 'theme-review')
    mkdirSync(pkg, { recursive: true })
    writeFileSync(
      join(pkg, 'package.json'),
      JSON.stringify({ name: '@stratawp/theme-review', type: 'module', main: 'index.js', exports: './index.js' })
    )
    writeFileSync(
      join(pkg, 'index.js'),
      "export function detectTheme() { return { themeType: 'hybrid', typeSource: 'detected' } }\n"
    )
  }
  return dir
}

const run = (dir: string, ...args: string[]) =>
  execFileSync(process.execPath, [join(dir, 'scripts', 'ai-setup.mjs'), ...args], {
    cwd: dir,
    encoding: 'utf8',
  })

const state = (dir: string) => readFileSync(join(dir, '.ai', 'agent-state.md'), 'utf8')

describe('template ai-setup theme-type recording', () => {
  it('records the detected theme type in agent-state.md', () => {
    const dir = makeTheme({ withReview: true })
    const output = run(dir, '--agents=claude')
    expect(output).toContain('Theme type: hybrid (detected)')
    expect(state(dir)).toContain('- **Theme type**: hybrid (detected)')
  })

  it('places the line in the Onboarding Status list, after Last Updated', () => {
    const dir = makeTheme({ withReview: true })
    run(dir, '--agents=claude')
    const lines = state(dir).split('\n')
    const updated = lines.findIndex((l) => l.startsWith('- **Last Updated**'))
    expect(lines[updated + 1]).toBe('- **Theme type**: hybrid (detected)')
  })

  it('is idempotent: running twice leaves exactly one Theme type line', () => {
    const dir = makeTheme({ withReview: true })
    run(dir, '--agents=claude')
    run(dir, '--agents=claude', '--force')
    expect(state(dir).match(/\*\*Theme type\*\*/g)).toHaveLength(1)
  })

  it('does not overwrite an existing CLAUDE.md without --force', () => {
    const dir = makeTheme({ withReview: true })
    writeFileSync(join(dir, 'CLAUDE.md'), 'my own notes\n')
    run(dir, '--agents=claude')
    expect(readFileSync(join(dir, 'CLAUDE.md'), 'utf8')).toBe('my own notes\n')
  })

  it('degrades gracefully when @stratawp/theme-review is not installed', () => {
    const dir = makeTheme({ withReview: false })
    const before = state(dir)
    const output = run(dir, '--agents=claude')
    expect(output).toContain('@stratawp/theme-review is not installed')
    expect(state(dir)).toBe(before)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @stratawp/cli exec vitest run src/ai-scaffold.test.ts src/ai-setup-theme-type.test.ts`
Expected: FAIL: the three `theme-review/SKILL.md` existence checks, and the ai-setup tests (no theme-type recording yet).

- [ ] **Step 3: Update the template `ai-setup.mjs` (basic template first)**

In `packages/cli/templates/basic-theme/scripts/ai-setup.mjs`:

1. Change the import line `import { existsSync, mkdirSync, writeFileSync } from 'node:fs'` to:

```js
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
```

2. Add this function after `writeAgentFile` and before `const opts = parseArgs(process.argv.slice(2))`:

```js
// Records the theme type (block, classic or hybrid) in .ai/agent-state.md so
// agents know which review rules apply. Detection lives in
// @stratawp/theme-review; without it this step is skipped.
async function recordThemeType() {
  const statePath = resolve(root, '.ai/agent-state.md')
  if (!existsSync(statePath)) return

  let detectTheme
  try {
    ;({ detectTheme } = await import('@stratawp/theme-review'))
  } catch {
    console.log(
      '  • Theme type: @stratawp/theme-review is not installed — run `pnpm install` to enable detection'
    )
    return
  }

  let result
  try {
    result = detectTheme(root)
  } catch (error) {
    console.log(`  ! Theme type: ${error.message}`)
    return
  }

  const line = `- **Theme type**: ${result.themeType} (${result.typeSource})`
  const state = readFileSync(statePath, 'utf8')
  const existing = /^- \*\*Theme type\*\*:.*$/m
  const lastUpdated = /^(- \*\*Last Updated\*\*:.*)$/m

  let next
  if (existing.test(state)) next = state.replace(existing, line)
  else if (lastUpdated.test(state)) next = state.replace(lastUpdated, `$1\n${line}`)
  else next = `${state.trimEnd()}\n\n${line}\n`

  if (next !== state) writeFileSync(statePath, next)
  console.log(`  ✓ Theme type: ${result.themeType} (${result.typeSource}) recorded in .ai/agent-state.md`)
}
```

3. Call it right after `const opts = parseArgs(process.argv.slice(2))` (so it runs even when nothing is selected):

```js
await recordThemeType()
```

Then copy to the other templates:

```bash
cp packages/cli/templates/basic-theme/scripts/ai-setup.mjs packages/cli/templates/store-theme/scripts/ai-setup.mjs
cp packages/cli/templates/basic-theme/scripts/ai-setup.mjs packages/cli/templates/advanced-theme/scripts/ai-setup.mjs
```

- [ ] **Step 4: Write the theme-review skills**

`packages/cli/templates/basic-theme/.ai/skills/theme-review/SKILL.md`:

````markdown
---
description: Review this theme against the WordPress.org theme guidelines with `pnpm review`, then fix the findings.
globs: style.css, theme.json, templates/**/*, parts/**/*, patterns/**/*, **/*.php
---

# Theme Review

`pnpm review` runs the StrataWP theme checker (`@stratawp/theme-review`) on this theme. It approximates the WordPress.org theme guidelines with static checks. It is **not** a certification.

## When to run it

- Before declaring any task complete that touched `style.css`, `theme.json`, templates, parts, patterns, PHP files, or the screenshot.
- After renaming a theme or changing its text domain.

## Steps

1. Read the **Theme type** line in `.ai/agent-state.md` (block, classic or hybrid). Rules apply per type.
2. Run `pnpm review`. Add `--json` for machine-readable output and `--strict` to fail on warnings too.
3. Fix every **error**. Errors make the command exit 1.
4. Fix **warnings** that are real and cheap. If a heuristic warning is a false positive for this theme, change its severity in `package.json` under `stratawp.review.rules` (`off`, `info`, `warn` or `error`) instead of contorting the code.
5. Re-run until clean, and quote the summary line (`N errors, N warnings, N info`) in your final report. Do not claim a pass you did not run.

## What it checks

| Id | Check | Default |
| --- | --- | --- |
| THEME-001 | `style.css` has Theme Name, Version, License, License URI, Text Domain | error |
| THEME-002 | `style.css` has Tested up to, Requires at least, Requires PHP, Description, Author | warning |
| THEME-003 | `screenshot.png` exists and is 1200×900 | error / warning |
| THEME-004 | `index.php` exists (classic, hybrid) | error |
| THEME-005 | `readme.txt` exists | warning |
| THEME-006 | `templates/index.html` and a valid `theme.json` (block, hybrid) | error |
| THEME-007 | Pattern headers have Title and a Slug namespaced to the text domain | warning |
| THEME-008 | gettext calls use this theme's text domain | warning |
| THEME-009 | Top-level functions, classes and constants are prefixed or namespaced | warning |
| THEME-010 | No `register_post_type`, `register_taxonomy`, `add_shortcode` | warning |
| THEME-011 | No remote scripts or styles | warning |
| THEME-012 | No `eval()` / `create_function()`; `base64_decode()` discouraged | error / warning |
| THEME-013 | `wp_head()` and `wp_footer()` are called (classic, hybrid) | error |

Output escaping is not checked here; PHPCS covers it.

## Configuration (`package.json`)

```json
{
  "stratawp": {
    "themeType": "hybrid",
    "review": {
      "ignore": ["legacy/**"],
      "rules": { "THEME-005": "off" }
    }
  }
}
```

Always ignored: `vendor/`, `node_modules/`, `dist/`, and `*-generated.*`.

## MCP

If the `@stratawp/mcp` server is available, the `review_theme` and `detect_theme_type` tools give the same verdicts as `pnpm review`.
````

Copy it to the other two templates:

```bash
mkdir -p packages/cli/templates/store-theme/.ai/skills/theme-review packages/cli/templates/advanced-theme/.ai/skills/theme-review
cp packages/cli/templates/basic-theme/.ai/skills/theme-review/SKILL.md packages/cli/templates/store-theme/.ai/skills/theme-review/SKILL.md
cp packages/cli/templates/basic-theme/.ai/skills/theme-review/SKILL.md packages/cli/templates/advanced-theme/.ai/skills/theme-review/SKILL.md
```

`.ai/skills/theme-review/SKILL.md` (monorepo root; create the folder first):

````markdown
---
description: Run and extend the StrataWP theme review (`pnpm review`, `packages/theme-review`).
globs: packages/theme-review/**/*, packages/cli/templates/**/*, examples/**/*
---

# Theme Review (monorepo)

`@stratawp/theme-review` is the checker behind `pnpm review`. It approximates the WordPress.org theme guidelines with static checks and is not a certification.

## Running it

- `pnpm build` first (the root script runs the built `packages/theme-review/dist/cli.js`).
- `pnpm review` reviews all six themes (3 examples, 3 CLI templates). It must report **zero errors**; CI blocks on it. Warnings do not fail.
- One theme: `node packages/theme-review/dist/cli.js examples/basic-theme --json`.
- Template files are byte-identical across the three templates for agent files; when you change a theme file, check the example twin with `cmp`.

## Changing a rule

1. Edit `packages/theme-review/src/rules/structure.ts` (metadata and structure) or `php-scan.ts` (PHP heuristics).
2. Add a pass case and a fail case in `packages/theme-review/src/__tests__/`, using the helpers in `helpers.ts` (`goodHybridFiles()`, `runRule()`).
3. Register new rules only in `src/rules/index.ts`, and document them in the package README and the skill tables.
4. Heuristic rules must default to `warning`. A rule may only be an `error` if a false positive is essentially impossible.
5. Run `pnpm --filter @stratawp/theme-review test`, `pnpm build`, then `pnpm review`.

## Hard rules

- No runtime dependencies in `@stratawp/theme-review` (Node built-ins only).
- Never silence a finding in an example or template by adding `review.rules` or `review.ignore` to its `package.json`; fix the theme or the rule.
- MCP tools stay read-only; regenerate the snapshot with `pnpm --filter @stratawp/mcp snapshot` when tool schemas change.
````

- [ ] **Step 5: Update the agent docs**

Root `AGENTS.md`, pillar 5: after the line `- Run \`pnpm ai:check\` before submitting to ensure compliance with ESLint, Prettier, TypeScript, and the unit test suite. See the [**Code Quality skill**](.ai/skills/code-quality/SKILL.md).` add:

```
- If you changed an example theme or CLI template (templates, patterns, `style.css`, `theme.json`, PHP), run `pnpm review`: it must report zero errors. See the [**Theme Review skill**](.ai/skills/theme-review/SKILL.md).
```

and in `## Capabilities & Tooling` add:

```
- **Theme review (MCP):** the `@stratawp/mcp` server also exposes read-only `review_theme` and `detect_theme_type` tools backed by `@stratawp/theme-review`.
```

Root `.ai/SKILLS.md`, under `## 🧪 Workflow & Quality`, add before the Onboarding Guide line:

```
- [**Theme Review**](skills/theme-review/SKILL.md): Run and extend the theme checker (`pnpm review`).
```

Root `.ai/skills/agent-code-review/SKILL.md`, Step 3: replace

```
- [ ] Surface-specific suites run when applicable (`pnpm test:e2e` for rendered output, `pnpm test:perf` for loading behavior, `pnpm lint:php` for theme PHP).
```

with

```
- [ ] Surface-specific suites run when applicable (`pnpm test:e2e` for rendered output, `pnpm test:perf` for loading behavior, `pnpm lint:php` for theme PHP, `pnpm review` for theme metadata, templates and patterns).
```

Template `AGENTS.md` (edit the basic template, then `cp` to the others): in pillar 1, add as a new last bullet:

```
- `.ai/agent-state.md` records this theme's **Theme type** (block, classic or hybrid), detected automatically by `pnpm ai:setup`. Review rules differ by type.
```

in pillar 5, after the `pnpm ai:check` bullet add:

```
- Run `pnpm review` when you change `style.css`, `theme.json`, templates, patterns, or PHP. It must report zero errors; see the [**Theme Review skill**](.ai/skills/theme-review/SKILL.md).
```

and in `## Skills & Resources` change the skill directory bullet to: `- [**Skill directory**](.ai/SKILLS.md) — recipes for this theme's architecture, blocks & patterns, deployment, and theme review.`

Template `.ai/SKILLS.md`: add after the `## ⚙️ Operations` section:

```
## ✅ Quality

- [**Theme Review**](skills/theme-review/SKILL.md): Run `pnpm review` and fix findings against the WordPress.org guidelines.
```

Copy the three edited template files to the other templates:

```bash
for t in store advanced; do
  cp packages/cli/templates/basic-theme/AGENTS.md packages/cli/templates/$t-theme/AGENTS.md
  cp packages/cli/templates/basic-theme/.ai/SKILLS.md packages/cli/templates/$t-theme/.ai/SKILLS.md
done
```

- [ ] **Step 6: Write the directions files**

Template `.ai/developer-directions.md`: insert directly after the first `---` line (the one that follows the `[!TIP]` block) this section, then copy the file to the other two templates:

```markdown
## ✅ Standing rules (prefilled, edit freely)

- Run `pnpm ai:check` and `pnpm review` before finishing. `pnpm review` must report zero errors.
- Keep the text domain equal to the theme slug in `style.css`, in every gettext call, and in pattern slug namespaces.
- Do not add remote scripts or styles; bundle assets with the theme.
- Read the **Theme type** line in `.ai/agent-state.md` before changing templates: block themes use `templates/*.html`, classic themes use PHP templates, hybrid themes use both.

---
```

Root `.ai/developer-directions.md`: replace the whole file with:

```markdown
# Developer Directions for AI Agents

Standing rules for every AI agent working in this repository. Agents read this during onboarding and must follow it.

> [!NOTE]
> Drafted from `CLAUDE.md` and the maintainer's standing instructions. **Maintainer: review the wording.**

---

## 🎨 Design & Aesthetic Guidelines

- This repository is a framework; example themes should stay neutral and token-driven.
- **Design Tokens:** check each theme's `theme.json` first before hardcoding colors or spacing.

---

## 💻 Coding Conventions & Structural Overrides

- **PHP:** `packages/core` follows WordPress Coding Standards (tabs, Yoda, escaped output) and must pass PHPStan with no new baseline entries.
- **CSS:** `@stratawp/stylelint-config` is a blocking gate (nesting depth 3, specificity `0,3,1`). Never add `stylelint-disable` comments to pass it.
- **TypeScript:** strict mode, ESM, Prettier-formatted.
- **Builds:** pnpm only. Run `pnpm ai:check` before finishing; run `pnpm review` when you change an example theme or CLI template.

---

## 🚀 Project Priorities & Roadmap

- **Shipped:** quality gates (AVIF, Stylelint preset, cross-browser smoke tests). In progress: AI tooling (theme review, then screenshots and visual compare).
- **Planned:** design tokens, blocks and components, Site Editor sync, child-theme generator.
- **Strict constraints:**
  - Never deploy to production from this monorepo; production themes live in separate repositories.
  - Stage files by explicit path; never `git add -A` or `git add .`.
  - No attribution of any kind in commits or PR descriptions: no `Co-Authored-By` trailer and no "Generated with" line.
  - Do not mention external projects or competitors in code, comments, docs, commits, or branch names.
  - A new published npm package needs a manual first publish and a trusted-publisher entry before its release tag (see `.ai/skills/releases/SKILL.md`).

---

## 📝 Custom Guidelines / Miscellaneous

- Specs and plans for features live in `docs/superpowers/specs` and `docs/superpowers/plans`; contract-first applies to non-trivial work.
```

```bash
for t in store advanced; do
  cp packages/cli/templates/basic-theme/.ai/developer-directions.md packages/cli/templates/$t-theme/.ai/developer-directions.md
done
```

- [ ] **Step 7: Run to verify they pass, then quality gates**

```bash
pnpm --filter @stratawp/cli test
pnpm exec prettier --write AGENTS.md .ai packages/cli/templates/basic-theme/AGENTS.md packages/cli/templates/basic-theme/.ai packages/cli/templates/store-theme/AGENTS.md packages/cli/templates/store-theme/.ai packages/cli/templates/advanced-theme/AGENTS.md packages/cli/templates/advanced-theme/.ai
for t in store advanced; do
  for f in AGENTS.md scripts/ai-setup.mjs .ai/SKILLS.md .ai/developer-directions.md .ai/skills/theme-review/SKILL.md; do
    cmp -s packages/cli/templates/basic-theme/$f packages/cli/templates/$t-theme/$f && echo "$t $f identical" || echo "$t $f DIFFERS"
  done
done
pnpm format:check 2>&1 | grep -v '^\[warn\] \.superpowers' | tail -5
```

Expected: cli tests PASS (including the five ai-setup cases and the extended REQUIRED_FILES); every template pair reports `identical`; `format:check` shows no files other than git-ignored `.superpowers/` scratch. If Prettier rewrote a template file, re-copy it to the other two templates and re-run the `cmp` loop.

- [ ] **Step 8: Commit (explicit paths)**

```bash
git add AGENTS.md .ai/SKILLS.md .ai/developer-directions.md .ai/skills/agent-code-review/SKILL.md .ai/skills/theme-review/SKILL.md
git add packages/cli/src/ai-scaffold.test.ts packages/cli/src/ai-setup-theme-type.test.ts
for t in basic store advanced; do
  git add packages/cli/templates/$t-theme/AGENTS.md packages/cli/templates/$t-theme/scripts/ai-setup.mjs packages/cli/templates/$t-theme/.ai/SKILLS.md packages/cli/templates/$t-theme/.ai/developer-directions.md packages/cli/templates/$t-theme/.ai/skills/theme-review/SKILL.md
done
git commit -m "feat(ai): add theme-review skill, theme-type recording in ai-setup, and refreshed agent docs"
```

---

### Task 9: Templates, dependency stamping, and scaffold tests

**Files:**
- Modify: `packages/cli/templates/{basic,store,advanced}-theme/package.json`, `packages/cli/package.json`, `packages/cli/scripts/sync-template-vendor.mjs`, `packages/cli/src/quality-gates-scaffold.test.ts`, `packages/cli/src/__tests__/customize-theme.test.ts`

**Interfaces:**
- Consumes: Task 5's `stratawp-review` binary name; Task 8's agent files.
- Produces: generated themes get `@stratawp/theme-review` as a dev dependency, a `review` script, and `ai:check` that runs it; `templateDependencies` includes the new package.

- [ ] **Step 1: Write the failing test changes**

In `packages/cli/src/quality-gates-scaffold.test.ts`, inside the `it('wires lint:css and test:e2e and declares the gate dependencies'` test, add after the existing `stylelint` assertion:

```ts
    expect(pkg.scripts['review']).toBe('stratawp-review')
    expect(pkg.scripts['ai:check']).toBe('pnpm build && pnpm review')
    expect(pkg.devDependencies['@stratawp/theme-review']).toBeTruthy()
```

In `packages/cli/src/__tests__/customize-theme.test.ts`, add `'@stratawp/theme-review',` to the `GATE_PACKAGES` array (the list at about line 90 containing `@stratawp/vite-plugin`, `@stratawp/stylelint-config`, `@stratawp/testing`). Then, immediately after that `it.each(GATE_PACKAGES)(...)` test, add:

```ts
  it('scaffolded themes run the theme review cleanly (zero errors)', async () => {
    const { reviewTheme } = await import('@stratawp/theme-review')
    const report = reviewTheme(themePath)
    expect(report.summary.errors).toBe(0)
    expect(report.findings.length).toBeGreaterThan(0)
  })
```

(`findings.length > 0` guards against a silent no-op: the templates always produce some warnings, such as the screenshot size.) Task 7 already added `@stratawp/theme-review` as a dependency of `packages/cli`, which is sufficient for this test's import; no further dependency change is needed.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @stratawp/cli exec vitest run src/quality-gates-scaffold.test.ts src/__tests__/customize-theme.test.ts`
Expected: FAIL: templates lack the script and dependency; `templateDependencies` lacks `@stratawp/theme-review`.

- [ ] **Step 3: Update the templates and stamping**

In each of the three templates' `package.json`:
- `scripts.ai:check` changes from `"pnpm build"` to `"pnpm build && pnpm review"`.
- Add `"review": "stratawp-review",` to `scripts` (after `test:e2e`).
- Add `"@stratawp/theme-review": "workspace:*",` to `devDependencies` (alphabetical: after `@stratawp/stylelint-config`, before `@stratawp/testing`).

In `packages/cli/package.json`, add to `templateDependencies` (hand-stamped placeholder; the release step re-stamps it, because `sync-template-vendor.mjs` refuses unreleased 0.0.0 packages):

```json
    "@stratawp/theme-review": "^0.0.0"
```

In `packages/cli/scripts/sync-template-vendor.mjs`, add the package to the `templatePackages` map:

```js
  '@stratawp/theme-review': 'theme-review',
```

(keep the other three entries).

- [ ] **Step 4: Run to verify they pass, then quality gates**

```bash
pnpm install
pnpm --filter @stratawp/cli test
pnpm --filter @stratawp/cli typecheck
pnpm exec prettier --write packages/cli/package.json packages/cli/templates/basic-theme/package.json packages/cli/templates/store-theme/package.json packages/cli/templates/advanced-theme/package.json
pnpm lint && pnpm lint:css && pnpm review
node packages/cli/scripts/sync-template-vendor.mjs; echo "exit=$?"
git status --short
```

Expected: cli tests PASS (including the new zero-errors scaffold test); `pnpm review` exit 0. The final `sync-template-vendor.mjs` run **must fail with exit 1** and name `@stratawp/theme-review` at `0.0.0` (that is the intended guard; the release step fixes it). After that failed run, `git status --short` must show no tracked changes beyond your edits: if the script modified `packages/cli/package.json`'s `templateDependencies`, restore the hand-stamped line.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/package.json packages/cli/scripts/sync-template-vendor.mjs packages/cli/src/quality-gates-scaffold.test.ts packages/cli/src/__tests__/customize-theme.test.ts pnpm-lock.yaml
for t in basic store advanced; do git add packages/cli/templates/$t-theme/package.json; done
git commit -m "feat(cli): ship the theme review in generated themes"
```

---

### Task 10: Docs, changeset, decision log, spec amendment, and final verification

**Files:**
- Create: `docs/ai-tooling.md`, `.changeset/ai-tooling-review.md`
- Modify: `CLAUDE.md`, `.ai/PROJECT_RULES.md`, `docs/superpowers/specs/2026-10-05-ai-tooling-design.md`

- [ ] **Step 1: Write `docs/ai-tooling.md`**

Create the file with these sections (neutral wording; no external project names):
- **Theme review:** `pnpm review` in this repo (six themes) and `pnpm review` / `stratawp-review` in a generated theme; exit codes; `--json` and `--strict`; config in `package.json`; the 13-rule table copied from the package README; the honesty disclaimer.
- **Theme type:** how detection works (block, classic, hybrid markers), the `stratawp.themeType` override, and that `pnpm ai:setup` records it in `.ai/agent-state.md`.
- **For agents:** the `theme-review` skill, the `review_theme` and `detect_theme_type` MCP tools (inputs and structured output), and the CLI command `stratawp theme:review`.
- **CI:** the `pnpm review` step in the `js` job and what blocks it.

- [ ] **Step 2: Update `CLAUDE.md`, the changeset, and the decision log**

In `CLAUDE.md`: add `- **packages/theme-review**: Theme review checks and theme-type detection (\`pnpm review\`)` to the Monorepo Structure list; add `@stratawp/theme-review - Theme review checks` to the Published packages list; add to the AI-Assisted Development commands block a line `pnpm review    # Theme review (zero errors required on all StrataWP themes)`.

`.changeset/ai-tooling-review.md`:

```markdown
---
'@stratawp/theme-review': minor
'@stratawp/cli': minor
'create-stratawp': minor
---

Add `@stratawp/theme-review`, a theme checker that approximates the WordPress.org theme guidelines and detects whether a theme is block, classic, or hybrid. The CLI gains `stratawp theme:review`, and generated themes ship the checker with a `review` script. `pnpm ai:setup` records the detected theme type for agents.
```

`.ai/PROJECT_RULES.md`: read it, then append one dated entry (2026-10-05) in its existing format recording: theme review is a deterministic checker plus a skill; the review package is dependency-light and its heuristic rules are warnings; theme type is detected with a `stratawp.themeType` override and all six StrataWP themes classify as hybrid; the self-check is a blocking `pnpm review` step; the new package needs a manual first publish and a trusted-publisher entry before the release tag.

- [ ] **Step 3: Amend the spec to match what was built**

In `docs/superpowers/specs/2026-10-05-ai-tooling-design.md`:
- A5: replace the `ai-setup` bullet with: "The template copies of `scripts/ai-setup.mjs` record `**Theme type**: <type> (detected|override)` in `.ai/agent-state.md` (idempotent). The `claude` target already exists in the template copy and Codex is already listed as native, so no new targets are added; the monorepo root script is unchanged because the root is not a theme."
- A4: replace "A new blocking CI job runs it" with "A new blocking step in the `js` CI job runs it (after the build)".
- Testing: replace "fixture themes under `packages/theme-review/__fixtures__/`" with "test themes built per test in temp directories by a helper".
- A3: add a sentence: "A rule that crashes is reported as an `INTERNAL` warning."
- Release notes: add "Until the first release, `templateDependencies` carries a hand-stamped `^0.0.0` placeholder for the package; the release step re-stamps it."

- [ ] **Step 4: Final verification**

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm lint
pnpm lint:css
pnpm format:check 2>&1 | grep -v '\.superpowers' | tail -5
pnpm exec turbo test --force
pnpm review
pnpm contracts:check
(cd packages/core && composer phpcs && composer phpstan && composer test)
git status --short
```

Expected: every command exits 0 (`format:check` may flag only git-ignored `.superpowers/` scratch files); `pnpm review` reports zero errors on all six themes; `git status --short` shows only intended files. Fix any failure before committing.

- [ ] **Step 5: Commit**

```bash
git add docs/ai-tooling.md .changeset/ai-tooling-review.md CLAUDE.md .ai/PROJECT_RULES.md docs/superpowers/specs/2026-10-05-ai-tooling-design.md
git commit -m "docs: document AI tooling, add changeset and decision log entry"
```

- [ ] **Step 6: Hand-off notes for the PR description**

Include in the PR description (no attribution lines):
1. **Blocking release checklist:** manual first publish of `@stratawp/theme-review` from the maintainer's Terminal with the security key (`npm login`, then `npm publish --access public` in `packages/theme-review`); then add the trusted publisher (`JonImmsWordpressDev` / `strataWP` / `publish-npm.yml`) with "Allow npm publish" ticked; then `pnpm version-packages`, `pnpm install`, re-stamp `templateDependencies` with `node packages/cli/scripts/sync-template-vendor.mjs`, commit, tag. The CLI must not be released before `@stratawp/theme-review` is on npm because the templates pin it.
2. The measured warning counts from Task 6 (what the checker reports on the six themes), so the maintainer sees the follow-ups (screenshot size, `readme.txt`, text domains, unprefixed functions, remote assets).
3. The `developer-directions.md` wording is drafted and needs the maintainer's review.
4. The `INTERNAL` warning behavior and the dependency-free design.
