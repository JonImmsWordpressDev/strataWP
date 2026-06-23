# Performance WS2 — Implementation Plan (image/WebP pipeline + orphaned-PHP cleanup)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Give `@stratawp/vite-plugin` a real build-time image pipeline (`sharp` optimize + `.webp` siblings + `svgo`) — the single biggest concrete gap vs the comparison target (codename **Triple XXX**) — and stop the plugin emitting orphaned, never-`require()`d perf PHP, while preserving the one genuinely useful build optimization (`manualChunks`).

**Architecture:** All changes in `packages/vite-plugin`. New `strataWPImages` Vite plugin (build-time `closeBundle`, ported 1:1 from Triple XXX `/tmp/repo-analysis/wprig/scripts/tasks/images.js`). The orphaned generators (`preload.ts`, `lazy-loading.ts`'s PHP writer, `critical-css.ts`'s PHP loader) get removed/disabled; `manualChunks` moves into the core plugin so it survives. Critical CSS proper is **WS3** (a separate plan, via `beasties`) — here we just stop the dead version from emitting PHP.

**Tech Stack:** Vite 5 plugin (TS), `sharp` (raster + webp), `svgo` (svg), `fast-glob` (already a dep), `node:fs/promises`. Vitest for tests.

**Spec:** `docs/superpowers/specs/2026-06-22-performance-design.md` (WS2). **Branch:** `feat/image-pipeline` (off `main` after WS1 merged).

**Conventions:**
- All paths under `packages/vite-plugin`. Run from there: `pnpm build` (tsup), `pnpm typecheck`, `pnpm test`, `pnpm lint` (from repo root: `pnpm lint`).
- After each task: `pnpm --filter @stratawp/vite-plugin build && pnpm --filter @stratawp/vite-plugin typecheck && pnpm --filter @stratawp/vite-plugin test` green, then commit.
- Repo-wide gate before the final commit: from repo root `pnpm build && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`.

---

## Task 1: Add `sharp`/`svgo` and the `strataWPImages` plugin

**Files:**
- Modify: `package.json` (deps)
- Create: `src/plugins/images.ts`
- Create: `src/plugins/__tests__/images.test.ts`

- [ ] **Step 1: Add dependencies**

Run (from `packages/vite-plugin`):
```bash
pnpm add sharp@^0.33.5 svgo@^3.3.2
```
(`sharp` uses N-API prebuilds — works across the Node 18/20/22/24 CI matrix. `fast-glob` is already a dependency.)

- [ ] **Step 2: Create the image plugin**

Create `src/plugins/images.ts`:
```ts
/**
 * StrataWP Images Plugin
 *
 * Build-time raster optimization (sharp), SVG optimization (svgo), and
 * sibling .webp generation. Ported from the WP Rig image task. Runs in
 * `closeBundle` so it operates on the theme's source images independently
 * of Vite's import graph.
 */
import type { Plugin } from 'vite'
import path from 'node:path'
import { stat, mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import fg from 'fast-glob'
import sharp from 'sharp'
import { optimize as svgoOptimize } from 'svgo'
import type { ImageOptions } from '../types'

export function strataWPImages(options: ImageOptions = {}): Plugin {
  const {
    enabled = true,
    src = 'src/images',
    dest = 'dist/images',
    webp = true,
    quality = {},
  } = options
  const jpegQuality = quality.jpeg ?? 75
  const pngQuality = quality.png ?? 80
  const webpQuality = quality.webp ?? 75

  let root = process.cwd()

  return {
    name: 'stratawp:images',
    apply: 'build',

    configResolved(config) {
      root = config.root
    },

    async closeBundle() {
      if (!enabled) {
        return
      }

      const srcRoot = path.resolve(root, src)
      const destRoot = path.resolve(root, dest)

      const files = await fg('**/*.{jpg,jpeg,png,gif,svg}', {
        cwd: srcRoot,
        caseSensitiveMatch: false,
        onlyFiles: true,
      })

      for (const rel of files) {
        const srcFile = path.join(srcRoot, rel)
        const destFile = path.join(destRoot, rel)
        const ext = path.extname(rel).toLowerCase()

        await mkdir(path.dirname(destFile), { recursive: true })

        if (await isNewer(srcFile, destFile)) {
          try {
            if (ext === '.svg') {
              const code = await readFile(srcFile, 'utf8')
              const result = svgoOptimize(code, {
                multipass: true,
                plugins: [
                  { name: 'preset-default', params: { overrides: { removeViewBox: false } } },
                ],
              })
              await writeFile(destFile, result.data, 'utf8')
            } else if (ext === '.jpg' || ext === '.jpeg') {
              await sharp(srcFile, { sequentialRead: true })
                .rotate()
                .jpeg({ quality: jpegQuality, mozjpeg: true, progressive: true })
                .toFile(destFile)
            } else if (ext === '.png') {
              await sharp(srcFile, { sequentialRead: true })
                .rotate()
                .png({ quality: pngQuality, compressionLevel: 9, adaptiveFiltering: true })
                .toFile(destFile)
            } else {
              await copyFile(srcFile, destFile)
            }
          } catch {
            // sharp/svgo failure → copy through unchanged so the build never breaks.
            await copyFile(srcFile, destFile)
          }
        }

        // Sibling .webp for raster photos.
        if (webp && (ext === '.jpg' || ext === '.jpeg' || ext === '.png')) {
          const webpFile = destFile.replace(/\.[^.]+$/i, '.webp')
          if (await isNewer(srcFile, webpFile)) {
            try {
              await sharp(srcFile, { sequentialRead: true })
                .webp({ quality: webpQuality })
                .toFile(webpFile)
            } catch {
              // Skip webp for this file on failure; don't break the build.
            }
          }
        }
      }
    },
  }
}

async function isNewer(src: string, dest: string): Promise<boolean> {
  try {
    const [s, d] = await Promise.all([stat(src), stat(dest)])
    return s.mtimeMs > d.mtimeMs
  } catch {
    return true // dest missing (or unreadable) → (re)generate
  }
}
```

- [ ] **Step 3: Write the test**

Create `src/plugins/__tests__/images.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import path from 'node:path'
import os from 'node:os'
import { mkdtemp, mkdir, rm, stat } from 'node:fs/promises'
import sharp from 'sharp'
import { strataWPImages } from '../images'

describe('strataWPImages', () => {
  let dir: string

  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'sw-images-'))
    await mkdir(path.join(dir, 'src/images'), { recursive: true })
    // A real 64x64 png fixture so sharp has something to optimize.
    await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 200, g: 100, b: 50 } },
    })
      .png()
      .toFile(path.join(dir, 'src/images/hero.png'))
  })

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  async function exists(p: string): Promise<boolean> {
    try {
      await stat(p)
      return true
    } catch {
      return false
    }
  }

  it('optimizes a raster and emits a sibling .webp', async () => {
    const plugin = strataWPImages()
    // Simulate Vite resolving the config root to our temp dir.
    ;(plugin as any).configResolved({ root: dir })
    await (plugin as any).closeBundle()

    expect(await exists(path.join(dir, 'dist/images/hero.png'))).toBe(true)
    expect(await exists(path.join(dir, 'dist/images/hero.webp'))).toBe(true)
  })

  it('does nothing when disabled', async () => {
    const plugin = strataWPImages({ enabled: false, dest: 'dist/images-off' })
    ;(plugin as any).configResolved({ root: dir })
    await (plugin as any).closeBundle()
    expect(await exists(path.join(dir, 'dist/images-off'))).toBe(false)
  })
})
```

- [ ] **Step 4: Run build + test**

Run (from `packages/vite-plugin`):
```bash
pnpm build && pnpm test -- images
```
Expected: build OK; both image tests PASS (the `.webp` sibling is produced).

- [ ] **Step 5: Commit**

```bash
git add packages/vite-plugin/package.json packages/vite-plugin/pnpm-lock.yaml packages/vite-plugin/src/plugins/images.ts packages/vite-plugin/src/plugins/__tests__/images.test.ts pnpm-lock.yaml
git commit -m "feat(vite-plugin): sharp image pipeline with webp siblings + svgo"
```
(The lockfile is at the repo root; include whichever lockfile actually changed.)

---

## Task 2: Add the `ImageOptions` type and wire it into `PerformanceOptions`

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add the `ImageOptions` interface** to `src/types.ts` (after `PreloadOptions`):
```ts
/**
 * Image Pipeline Options
 */
export interface ImageOptions {
  /**
   * Enable the build-time image pipeline
   * @default true
   */
  enabled?: boolean

  /**
   * Source images directory (relative to project root)
   * @default 'src/images'
   */
  src?: string

  /**
   * Output directory (relative to project root)
   * @default 'dist/images'
   */
  dest?: string

  /**
   * Emit sibling .webp for jpg/png
   * @default true
   */
  webp?: boolean

  /**
   * Per-format quality (0-100)
   */
  quality?: {
    jpeg?: number
    png?: number
    webp?: number
  }
}
```

- [ ] **Step 2: Add `images` to `PerformanceOptions`** (in `src/types.ts`):
```ts
  /**
   * Build-time image optimization (sharp + webp + svgo)
   * @default true
   */
  images?: boolean | ImageOptions
```

- [ ] **Step 3: typecheck + commit**
```bash
pnpm --filter @stratawp/vite-plugin typecheck
git add packages/vite-plugin/src/types.ts
git commit -m "feat(vite-plugin): ImageOptions type for the image pipeline"
```

---

## Task 3: Rewire the orchestrator — add images, preserve manualChunks, stop orphaned PHP

The default `performance: { criticalCSS: true, lazyLoading: true, preload: true }` makes the build write `inc/{preload,lazy-loading,critical-css}-generated.php` that NOTHING in core ever `require()`s (verified: core only loads `blocks-generated.php`). The only non-orphaned thing is `lazy-loading.ts`'s `manualChunks`. So: move `manualChunks` into the core plugin, delete the dead generators, add the image plugin.

**Files:**
- Modify: `src/index.ts` (core `config()` gets `manualChunks`; default `performance`; add `strataWPImages`)
- Modify: `src/plugins/performance.ts` (drop lazy-loading/preload; add images; critical-css off by default)
- Delete: `src/plugins/preload.ts`, `src/plugins/lazy-loading.ts`
- Keep: `src/plugins/critical-css.ts` (inert; WS3 replaces it with `beasties`) — but it must NOT run/emit by default.

- [ ] **Step 1: Move `manualChunks` into the core plugin**

In `src/index.ts`, inside `strataWPCore`'s `config()` return, add `manualChunks` to `build.rollupOptions.output` (alongside the existing `entryFileNames`/`chunkFileNames`/`assetFileNames`):
```ts
              manualChunks: (id: string) => {
                if (id.includes('@wordpress/')) {
                  return 'wordpress'
                }
                if (id.includes('node_modules')) {
                  return 'vendor'
                }
              },
```
(Order matters: check `@wordpress/` before the generic `node_modules` so WP packages land in the `wordpress` chunk.)

- [ ] **Step 2: Rewrite `performance.ts`** to only orchestrate critical-css (off) + images (on):
```ts
/**
 * Performance Orchestrator
 */
import type { Plugin } from 'vite'
import type { PerformanceOptions } from '../types'
import { strataWPCriticalCSS } from './critical-css'
import { strataWPImages } from './images'

export function strataWPPerformance(options: PerformanceOptions = {}): Plugin[] {
  const plugins: Plugin[] = []

  // Critical CSS — OFF by default (WS3 reimplements via beasties). Only added
  // when a theme explicitly opts in.
  if (options.criticalCSS === true || typeof options.criticalCSS === 'object') {
    const criticalOptions =
      typeof options.criticalCSS === 'object' ? options.criticalCSS : { enabled: true }
    plugins.push(strataWPCriticalCSS(criticalOptions))
  }

  // Image pipeline — ON by default.
  if (options.images !== false) {
    const imageOptions = typeof options.images === 'object' ? options.images : {}
    plugins.push(strataWPImages(imageOptions))
  }

  return plugins
}
```

- [ ] **Step 3: Update `index.ts` default `performance`** to:
```ts
    performance = {
      criticalCSS: false,
      images: true,
    },
```
Also remove the now-deleted plugins from the `export { ... }` block at the bottom of `index.ts` if `strataWPLazyLoading`/`strataWPPreload` are exported (they are not currently exported by name — only `strataWPPerformance` is — so no export change needed; verify).

- [ ] **Step 4: Delete the dead generators**
```bash
git rm packages/vite-plugin/src/plugins/preload.ts packages/vite-plugin/src/plugins/lazy-loading.ts
```
(Leave `critical-css.ts` for WS3.) If `LazyLoadingOptions`/`PreloadOptions` in `types.ts` are now unused and the typecheck/lint flags them, leave them in place (harmless exported types) OR remove them if clean — your call, keep typecheck green.

- [ ] **Step 5: Verify build + manualChunks + no orphaned PHP**

Run from `packages/vite-plugin`: `pnpm build && pnpm typecheck`.
Then a behavioral check — build a throwaway fixture theme or assert in a test (Step 6) that running the full plugin set does NOT create `inc/preload-generated.php` / `inc/lazy-loading-generated.php`. At minimum confirm the source files are gone and `performance.ts` no longer imports them.

- [ ] **Step 6: Add an orchestrator test**

Create `src/plugins/__tests__/performance.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { strataWPPerformance } from '../performance'

describe('strataWPPerformance defaults', () => {
  it('includes the images plugin and not the removed orphaned generators', () => {
    const names = strataWPPerformance().map((p) => p.name)
    expect(names).toContain('stratawp:images')
    expect(names).not.toContain('stratawp:preload')
    expect(names).not.toContain('stratawp:lazy-loading')
  })

  it('does not enable critical-css by default', () => {
    const names = strataWPPerformance().map((p) => p.name)
    expect(names).not.toContain('stratawp:critical-css')
  })

  it('adds critical-css only when explicitly enabled', () => {
    const names = strataWPPerformance({ criticalCSS: true }).map((p) => p.name)
    expect(names).toContain('stratawp:critical-css')
  })
})
```

- [ ] **Step 7: Run package gate + commit**
```bash
pnpm --filter @stratawp/vite-plugin build
pnpm --filter @stratawp/vite-plugin typecheck
pnpm --filter @stratawp/vite-plugin test
git add packages/vite-plugin/src/index.ts packages/vite-plugin/src/plugins/performance.ts packages/vite-plugin/src/plugins/__tests__/performance.test.ts packages/vite-plugin/src/types.ts
git commit -m "refactor(vite-plugin): move manualChunks to core, drop orphaned perf PHP generators, default images on"
```

---

## Task 4: Docs + full gate

**Files:**
- Modify: `CLAUDE.md` (vite-plugin "Performance optimization" section)

- [ ] **Step 1: Reconcile CLAUDE.md** — the `@stratawp/vite-plugin` "Performance optimization" bullet currently claims "Critical CSS extraction / Lazy loading configuration generation / Asset preloading hints". Update it to reality: "Build-time image optimization (sharp) with sibling WebP + SVGO; vendor/WordPress chunk splitting (manualChunks). (Critical CSS is planned via WS3.)" Remove claims about the deleted lazy-loading/preload generators.

- [ ] **Step 2: Coverage thresholds** — the vite-plugin now has new tested files. Run `pnpm --filter @stratawp/vite-plugin test:coverage`, and if the measured coverage rose, bump the ratcheted thresholds in `packages/vite-plugin/vitest.config.ts` up to ~2 points below the new measured numbers (keep green). If it dropped because new untested lines were added, leave thresholds and note it.

- [ ] **Step 3: Full repo gate (as CI runs it)** from repo root:
```bash
pnpm install --frozen-lockfile && pnpm build && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
```
Expected: all exit 0. (`docs/superpowers` is prettier-ignored, so plan/spec docs won't trip `format:check`.)

- [ ] **Step 4: Commit**
```bash
git add CLAUDE.md packages/vite-plugin/vitest.config.ts
git commit -m "docs(vite-plugin): align perf description with the real image pipeline"
```

---

## Self-Review

**Spec coverage (WS2):** sharp image pipeline + webp → Task 1 · `images` option/type → Task 2 · remove orphaned generated PHP (preserve manualChunks) → Task 3 · docs reconcile → Task 4 · tests → Tasks 1 & 3.

**Deferred (noted):** the PHP serve-side helper (`<picture>`/srcset consumption of the emitted webp) is intentionally out of WS2 — Triple XXX's pipeline likewise only *builds* optimized + webp; consuming them is a smaller follow-up. **WS3** redoes critical CSS via `beasties` (keeps `critical-css.ts` as the seam). **WS4** is the enforced Lighthouse gate.

**Risks:** `sharp` native build in CI — mitigated by its N-API prebuilds across Node 18-24 (verify in the CI run). Deleting `lazy-loading.ts`/`preload.ts` could break an import — Step 3 verifies `performance.ts` no longer imports them and the export block is unaffected.

**Type/name consistency:** plugin names `stratawp:images` (new), `stratawp:critical-css` (kept); option `images?: boolean | ImageOptions` on `PerformanceOptions`; `manualChunks` moved to core checks `@wordpress/` before `node_modules`.
