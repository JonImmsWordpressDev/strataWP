# StrataWP Performance System — Design Spec (Phase 2)

- **Date:** 2026-06-22
- **Branch:** `feat/performance` (off `main` @ `e03219c`)
- **Status:** Draft — awaiting review
- **Sub-project 2 of the framework-hardening program.** Comparison target is codenamed **Triple XXX**.

## 1. Goal

Make StrataWP's performance optimizations **actually fire on the rendered page**, add the one build-time capability it completely lacks (an image/WebP pipeline), and **prove the result with an enforced Lighthouse CI budget** — the gate Triple XXX defines but never runs. Today StrataWP's perf is largely aspirational scaffolding; this phase turns it into measured, enforced reality.

North star (scorecard rematch): on the **performance** dimension StrataWP must move from "inert/declared" to "fires + measured + gated", meeting or beating Triple XXX's published budget with evidence in CI.

## 2. Current reality (verified by recon)

What actually reaches the browser today (basic theme, production) is only: emoji/bloat removal, `defer` on the single `stratawp-main` script, and empty-by-default resource-hint plumbing. Everything else advertised is dead:

- **Correctness bug:** `Assets::enqueue_assets` keys CSS on `manifest['src/css/main.css']`, which doesn't exist — the compiled `dist/css/main.*.css` is **never enqueued in production**. The theme ships its JS but not its own stylesheet. (Prerequisite fix; perf is moot if CSS doesn't load.)
- **Critical CSS:** dead. `packages/vite-plugin/src/plugins/critical-css.ts` requires `critical`, which is **not installed**, so it always no-ops; no `dist/critical/` is produced.
- **Generated perf PHP is orphaned:** `inc/preload-generated.php` and `inc/lazy-loading-generated.php` are emitted by the Vite build but **never `require()`d** (only `inc/blocks-generated.php` is wired, via `Blocks.php`). Their hooks never run.
- **Async/non-render-blocking CSS:** the `media=print`/onload swap in `lazy-loading.ts` is shipped **commented out**; all CSS that loads is render-blocking.
- **ConditionalStyles:** targets `comments.css`/`sidebar.css`/`widgets.css` that the build never emits; not in the default component list; only `basic-theme` instantiates it → emits nothing.
- **No image pipeline at all** — no `sharp`/webp/avif/srcset anywhere.
- **No Lighthouse CI** — no `.lighthouserc`, no `@lhci/cli`, no `test:perf`, nothing gates perf.
- **Split-brain resource hints:** a filter-driven implementation in `core/Components/Performance.php` and a second hardcoded one in the dead generated PHP — only the (empty-by-default) PHP one runs.

Triple XXX target (`/tmp/repo-analysis/wprig`): CSS `rel=preload`/onload swap with per-template `preload_callback` gating (`inc/Styles`), per-handle async/defer via `wp_script_add_data`, responsive `sizes` tuning (`inc/Image_Sizes`), a build-time `sharp` pipeline (jpeg mozjpeg q75 progressive; png q80 level9 adaptive; svgo multipass `removeViewBox:false`) that also emits parallel `.webp`, PWA precache flags, and `.lighthouserc.cjs` (`perf/a11y/bp/seo ≥0.9`, LCP≤2500, CLS≤0.1, TBT≤300, 3 runs) — **not enforced in their CI**.

## 3. Scope

Four workstreams. **This spec's first implementation plan covers WS1 + WS2** (perf that fires + the image pipeline — both provable via rendered-HTML/build-output assertions without standing up WordPress in CI). **WS3 + WS4** (critical CSS + the enforced Lighthouse gate) follow as a second plan, because the gate needs a WordPress-in-CI harness that is its own meaningful effort.

**Out of scope:** `@stratawp/sync` (frozen); Phases 3–5; any perf work in `explorer`/`headless`.

## 4. Workstreams

### WS1 — Correctness + perf that actually fires (PHP, `packages/core`)

1. **Fix the CSS enqueue bug.** In `Assets`, enqueue the JS entry's `css[]` array from the Vite manifest (so `dist/css/main.*.css` actually loads), or register `src/css/main.css` as a real Vite input. Add a regression test.
2. **Async, non-render-blocking CSS** (Triple XXX's headline technique), implemented in PHP in the StrataWP idiom: emit non-critical stylesheets as `rel=preload as=style onload="this.rel='stylesheet'"` with a `<noscript>` fallback, gated by a `stratawp_preloading_styles_enabled` filter and per-handle `preload_callback`. Port the mechanism from `inc/Styles/Component.php`. Fold this into `ConditionalStyles` (and add it to the **default component list**).
3. **Consolidate resource hints** into the `Performance` component (single source of truth via `stratawp_dns_prefetch_hints` / `stratawp_preconnect_hints`); delete the duplicate generated-PHP hint code. Ship a sensible default (preconnect to the fonts origin only when fonts are actually requested).
4. **Real async + broader defer:** implement `async` (currently only `defer` exists) and drive both via `stratawp_async_scripts` / `stratawp_defer_scripts` filters instead of the single hardcoded handle.
5. **Responsive `sizes` tuning:** hook `wp_calculate_image_sizes` / `wp_get_attachment_image_attributes` to emit accurate `sizes` (cheap CLS/LCP win), porting `inc/Image_Sizes`.
6. **PWA precache parity:** `wp_style_add_data($h,'precache',true)` / `wp_script_add_data(...)` on enqueued assets so a service worker can cache them.
7. **Resolve the dead generated PHP:** stop emitting orphaned hook-registering files. Preferred idiom — the Vite plugin emits **data** (a small fonts/preload manifest); the hand-written `Performance`/`ConditionalStyles` components consume it via filters. Delete `preload-generated.php` / `lazy-loading-generated.php` generation (keep `blocks-generated.php`).
8. **Tests:** Brain Monkey unit tests for every new/changed behavior (enqueue fix, preload swap markup, async/defer filter logic, sizes, precache, hint consolidation). Update CLAUDE.md so the `Performance` description matches reality.

### WS2 — Image / WebP pipeline (Vite, `packages/vite-plugin`)

1. New `strataWPImages` plugin (`src/plugins/images.ts`) using **`sharp`** (TS + `closeBundle`, matching the existing plugin idiom): optimize rasters and emit sibling `.webp` (and optionally `.avif`). Port Triple XXX settings 1:1 (jpeg mozjpeg q75 progressive; png q80 level9 adaptive; `svgo` multipass `removeViewBox:false`; webp q75). Drive `src/images → dist/images` with mtime-skip.
2. Add `sharp` + `svgo` to `vite-plugin` deps; expose an `images` option on the orchestrator; add a root `pnpm images` task.
3. PHP helper (core) to serve modern formats / `srcset` where applicable (e.g. a `<picture>`/`image_downsize` filter or a template tag), so the emitted webp is actually used.
4. **Tests:** vite-plugin tests asserting webp siblings + optimized output are produced from a fixture; PHP test for the format/srcset helper.

### WS3 — Critical CSS (deferred to 2nd plan)

Replace the uninstalled `critical` with the maintained **`beasties`** (critters successor, no headless-browser chain), actually extract + inline critical CSS in `wp_head`, and ensure the generated include is wired. Pair with WS1's async swap for the non-critical remainder.

### WS4 — Enforced Lighthouse CI gate (deferred to 2nd plan — the "beat them" win)

Add `@lhci/cli` + `.lighthouserc.cjs` starting from Triple XXX's budget as a **floor**, then tighten (e.g. `perf ≥0.95`, LCP≤2000, TBT≤200; add `modern-image-formats`, `uses-responsive-images`, `unused-css-rules` as error). Add a CI `perf` job that boots WordPress (via `@wordpress/env`) with a built example theme, runs `pnpm build` then `pnpm test:perf`, and is a **required check** — the enforcement Triple XXX never did.

## 5. Key decisions (my call unless you redline)

1. **Stage it:** WS1+WS2 ship first (provable without WP-in-CI); WS3+WS4 second. Keeps each PR reviewable and lands firing-perf + images fast.
2. **Fold perf into the PHP component system; Vite emits data, not hook-registering PHP.** Cleaner than `require_once`-ing generated files and removes the split-brain.
3. **`sharp` for images** (same engine Triple XXX uses; best quality controls) over imagemin wrappers.
4. **`beasties` for critical CSS** (WS3) — no puppeteer/penthouse browser dependency.
5. **`@wordpress/env` for the WS4 Lighthouse harness** — the standard WP-in-CI tool; accept it adds a Docker-based CI job.
6. **Budget: match-then-beat** — adopt their thresholds verbatim first (proves parity), then tighten in the same PR.

## 6. Definition of done

- **WS1/WS2 (this plan):** the basic theme renders with its CSS actually enqueued; non-critical CSS loads async (verified in rendered HTML); `async`/`defer` driven by filters; responsive `sizes` present; webp siblings produced by the build (verified in `dist/`) and consumed by the theme; no orphaned generated PHP remains; all new PHP/JS behavior unit-tested; CLAUDE.md perf claims match reality; full CI gate (from Phase 1) stays green.
- **WS3/WS4 (next plan):** critical CSS inlined; `pnpm test:perf` runs Lighthouse against a built theme in CI as a **required check**, green at a budget ≥ Triple XXX's, with image/CSS audits enforced.

## 7. Risks & mitigations

- **`sharp` native build in CI** (same class as the `better-sqlite3` issue): pin a version with prebuilds for the CI Node matrix; verify on Node 18–24.
- **Async CSS swap causing FOUC:** ship the `<noscript>` fallback and gate behind the `stratawp_preloading_styles_enabled` filter; only swap genuinely non-critical handles.
- **WP-in-CI flakiness (WS4):** isolate the perf job (non-blocking until stable, then promote to required); cache the wp-env image.
- **Touching the default component list / Assets enqueue** could affect existing example themes — covered by unit tests + the existing CI gate, and validated by building all three example themes.
- **Critical CSS scope creep (WS3):** kept in a separate plan precisely so WS1/WS2 aren't blocked by it.
