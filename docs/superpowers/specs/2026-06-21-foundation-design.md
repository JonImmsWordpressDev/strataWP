# StrataWP Foundation — Design Spec (Phases 0 + 1)

- **Date:** 2026-06-21
- **Branch:** `feat/surpass-wprig` (off `main` @ `8e6f782`)
- **Status:** Draft — awaiting review
- **Sub-project 1 of the "surpass WP Rig" program.** Later phases (2 Performance, 3 Quality/a11y, 4 AI-readiness, 5 Doc truth-up) each get their own spec.

## 1. Goal

Make the StrataWP monorepo's quality posture **real and enforced**, so that every later claim ("it's tested", "it's typed", "it lints", "it's fast") is backed by a green CI gate rather than aspirational config. This is the dimension WP Rig wins not by being more ambitious but by *enforcing* — so we close it by enforcing.

The north star for the whole program is a **scorecard rematch**: each dimension WP Rig currently wins, StrataWP ties or beats *with evidence*. This sub-project delivers the evidence machinery (CI, tests, typecheck, lint, PHP QA) plus the cleanup that unblocks it.

## 2. Scope

**In scope (this spec):**
- Phase 0 — Focus & Hygiene: delete dead packages, fix version drift, fix the Node 25 install break, refresh the lockfile, normalize `engines`.
- Phase 1 — Credibility Foundation: real ESLint, enforced typecheck, enforced formatting, deterministic + coverage-gated tests, a real PHP QA stack (PHPUnit + PHPCS/WPCS + PHPStan), and a push/PR CI workflow that gates all of it (incl. a PHP version matrix).

**Out of scope (deferred):**
- `@stratawp/sync` security/perf/tests — **frozen**; travels to the future sync *plugin* project (this is where the plaintext-credential and insecure-FTP fixes belong). `sync` must remain *buildable* because `cli` imports concrete classes from it.
- Phases 2–5 (performance system, a11y/PHPCS-on-everything beyond core wiring, MCP/AI-readiness, doc rewrite). Phase 1 lays the rails; later phases ride them.
- Removing `explorer`/`headless` — **kept** (headless is a competitive moat vs WP Rig). They get minimal "not broken" wiring here (typecheck), full tests later.

## 3. Phase 0 — Focus & Hygiene

Mechanical, low-risk, unblocks CI. Order matters (lockfile last).

### 0.1 Delete the dead shells
- `git rm -r packages/ai packages/registry packages/studio` and delete any stray `dist/`, `node_modules/`, `.turbo/` in them.
- **Safe:** none have a `package.json`, none are workspace members, nothing in code/config/CI imports them — only docs reference them (scrubbed in 0.4 / Phase 5).
- **Accept:** `find packages -maxdepth 1 -type d` no longer lists ai/registry/studio.

### 0.2 Fix the `create-stratawp → cli` version drift (the big one)
- `packages/create-stratawp/package.json`: change `"@stratawp/cli": "^0.5.2"` → `"workspace:*"` (and document that the publish step rewrites it to `^<current>` via changesets).
- **Why:** `^0.5.2` excludes the workspace `2.0.0`, so pnpm pulls the *old published* CLI from npm, which transitively re-installs the supposedly-dead `@stratawp/ai` + `@stratawp/registry`. This single change both modernizes `npx create-stratawp` and completes the v2.0 "focus cut".
- **Accept:** after re-install, `@stratawp/ai` and `@stratawp/registry` appear **nowhere** in `pnpm-lock.yaml`.

### 0.3 Fix the Node 25 install break
- `packages/sync/package.json`: bump `better-sqlite3 ^9.4.0 → ^12.2.0` and `@types/better-sqlite3 → ^7.6.x`.
- **Why:** `better-sqlite3` 9.x has no Node 25 prebuilt binary and its native build fails; because `sync` is a workspace member, root `pnpm install` builds it, breaking the *whole* repo install. The 12.x line ships Node 24/25 prebuilds. Bumping (vs removing `sync`) keeps `cli`'s sync/rollback/deploy commands compiling.
- Belt-and-suspenders: see 0.5 engines cap.
- **Accept:** clean `pnpm install` on the local Node (18.20.4) **and** on Node 24/25 (verified in CI matrix) with no node-gyp failure.

### 0.4 Refresh + commit the lockfile
- Run `pnpm install`, commit the regenerated `pnpm-lock.yaml`.
- **Accept:** lockfile no longer records ai/registry; `pnpm install --frozen-lockfile` succeeds in CI.

### 0.5 Normalize `engines`
- Add a root `engines` (e.g. `"node": ">=18.18 <=24"` until 12.x prebuilds are confirmed on 25, then widen) so Node 25 users get a clear pnpm warning instead of a cryptic node-gyp error. Add `engines` to each *published* sub-package.
- Fix the placeholder author email `jon@example.com` in `packages/core/composer.json` while we're here.
- **Accept:** `engines` present at root + published packages; no placeholder emails.

## 4. Phase 1 — Credibility Foundation

### 4.1 ESLint — make lint real (currently phantom)
Today `cli`, `vite-plugin`, `testing` declare `"lint": "eslint src"` but ESLint is **not installed** (it silently resolves to the dev's global v9) and there's **no config** — so `turbo lint` errors every run.
- Add to root devDeps (pinned): `eslint@^9`, `typescript-eslint@^8`, `@eslint/js`, and (if used) `eslint-plugin-import`.
- Add a root **flat config** `eslint.config.js` (v9 flat is the current standard and matches the global already on PATH) with a shared TS ruleset; allow per-package overrides.
- Add `"lint": "eslint ."` to **every** TS package (cli, vite-plugin, testing, explorer, headless, sync, create-stratawp). Examples: lint their `*.config.ts` only.
- **Frozen code (`sync`):** it must still *typecheck* (cli imports it) and is included in lint for completeness, but since we're not investing in it, any lint flood there is **baselined via an eslint config override** (warn-not-error or scoped disable) rather than fixed — same ratchet philosophy as PHPCS. We do not spend effort cleaning frozen `sync` code.
- **Accept:** `pnpm -w exec eslint --version` resolves *inside* `node_modules`; `pnpm lint` exits 0 across all packages on a clean checkout with **no global ESLint** on PATH.

### 4.2 Typecheck — wire it into the graph
Today only `explorer`/`headless` have a `type-check` script and `turbo.json` has no matching task, so nothing is ever type-checked.
- Add `"typecheck": "tsc --noEmit"` to every TS package (rename the two `type-check` scripts to match).
- Add a `typecheck` task to `turbo.json` (no outputs, `dependsOn: ["^build"]` if project refs require it).
- **Accept:** `pnpm -w typecheck` runs `tsc --noEmit` in all TS packages and exits 0.

### 4.3 Formatting — enforce, don't just write
- Add `"format:check": "prettier --check \"**/*.{ts,tsx,md,json}\""` (keep `format` for `--write`).
- **Accept:** `pnpm format:check` exits 0; CI runs it.

### 4.4 Tests — make `pnpm test` green, deterministic, and coverage-gated
Today `pnpm test` is **red** (the `testing` package declares coverage thresholds but has zero tests; watch-mode `vitest` hangs in CI) and coverage is never generated.
- Change all per-package `test` scripts `vitest → vitest run`, and `test:coverage → vitest run --coverage`.
- **Dogfood the toolkit:** add real tests to `@stratawp/testing` for its 5 custom matchers + mock/helper utilities (it's a *shipped* testing package that is itself untested — embarrassing to leave, easy win).
- **Coverage strategy — ratchet, don't blanket.** Move the orphaned `80/80/75/80` block out of `packages/testing` into a shared base config (`vitest.workspace.ts` or a shared `vitest.base.ts`). Set initial per-package thresholds to *current coverage rounded down* so CI is green on day one, then raise them as Phases 2–4 add tests. A blanket 80% today would just make the board permanently red.
- Packages with no tests yet (explorer, headless, create-stratawp) get **no `test` script** for now (turbo skips them) rather than a fake passing one — the gap stays visible and honest; they get tests in later phases.
- **Accept:** `pnpm test` exits 0 deterministically (no watch hang); coverage is generated and thresholds enforced for packages that have tests; CI fails if coverage drops below the committed floor.

### 4.5 PHP QA stack — implement the declared-but-absent tooling
`core/composer.json` declares phpunit/phpcs/phpstan + scripts but there is **no `tests/`, no configs, no `composer.lock`, no `vendor/`** — pure aspiration.
- **PHPUnit:** add `packages/core/phpunit.xml`, create `packages/core/tests/`, add **Brain Monkey** (`brain/monkey`) + Mockery to `require-dev` for true unit tests of WP-function-calling components. Point `composer test` at the config.
- **Test priority (highest-risk-first):** `Components/Updates.php` (GitHub-release version compare + transient cache + update-transient injection) and `Components/Fonts.php` (1,134 LOC). Then `Assets`, `Performance`, `ConditionalStyles` (these matter for Phase 2). Aim for a meaningful starting coverage floor, ratcheted later.
- **PHPCS:** add `packages/core/phpcs.xml.dist` pulling in `wp-coding-standards/wpcs` + `phpcompatibility/phpcompatibility-wp` (neither currently required), targeting `src/`. Point `composer phpcs` at it.
- **PHPStan:** add `packages/core/phpstan.neon` with `szepeweb/phpstan-wordpress` + `php-stubs/wordpress-stubs`, target `src/`, start at a realistic level (e.g. 5) and ratchet. (Leverage the repo's local `wp-phpstan` skill.)
- Commit `packages/core/composer.lock`.
- **Accept:** `composer install && composer phpcs && composer phpstan && composer test` all green locally and in CI.

### 4.6 CI — the gate that ties it together
Today the only workflow is `release-theme.yml` (runs **only** on release publish). Nothing gates merges.
- Add `.github/workflows/ci.yml` triggered on `push` + `pull_request`:
  - **JS job:** `pnpm install --frozen-lockfile` → `pnpm build` → `pnpm typecheck` → `pnpm lint` → `pnpm format:check` → `pnpm test` (with coverage). Node matrix: 18, 20, 22 (add 24/25 once 0.3 verified).
  - **PHP job:** `composer install` → `composer phpcs` → `composer phpstan` → `composer test`. **PHP matrix: 8.1, 8.2, 8.3** (matches `core`'s `php >=8.1`).
- Document enabling branch protection on `main` requiring both jobs (a repo setting, noted for you to toggle).
- **Accept:** opening a PR runs both jobs; a deliberately-broken commit (type error / lint error / failing test / phpcs violation) fails the check.

## 5. Key decisions (my call unless you redline)

1. **ESLint flat config on v9** (not legacy `.eslintrc` on v8) — it's current and matches the v9 already on your PATH.
2. **PHP unit tests via Brain Monkey + PHPUnit 10** (lightweight, mocks WP functions) rather than a full `wp-phpunit` integration suite (heavier, needs a DB). Integration tests can come later if needed.
3. **Coverage = ratchet from current, not blanket 80%** — green board day one, thresholds rise per phase. Prevents a permanently-red CI that everyone learns to ignore.
4. **Fix Node 25 by bumping `better-sqlite3` to 12.x** (keeps `cli`↔`sync` coupling working) *and* add an `engines` cap as a clear-error fallback — do both.
5. **Packages without tests get no `test` script yet** (visible honest gap) rather than a fake-passing one.
6. **`sync` stays in-tree and buildable but frozen** — no investment here; its security fixes move to the future sync plugin.

## 6. Acceptance criteria (the "green board")

On a clean checkout with **no global tooling** on PATH:
- `pnpm install --frozen-lockfile` succeeds on Node 18/20/22 (and 24/25 after 0.3).
- `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` all exit 0.
- `cd packages/core && composer install && composer phpcs && composer phpstan && composer test` all exit 0 on PHP 8.1/8.2/8.3.
- `pnpm-lock.yaml` contains **no** `@stratawp/ai` / `@stratawp/registry`; `packages/{ai,registry,studio}` are gone.
- `npx`-equivalent of `create-stratawp` resolves the **current** CLI (workspace), not 0.5.2.
- A PR with an injected defect (TS error, lint error, failing JS test, PHPCS violation, failing PHP test) is **blocked** by CI.

## 7. Risks & mitigations

- **PHPCS/WPCS floods `core` with violations.** Likely. Mitigation: generate a `phpcs.xml.dist` baseline (or `--report=summary` triage), fix the cheap classes, baseline the rest, ratchet — don't block Phase 1 on zero violations.
- **PHPStan-WordPress noise** without proper stubs. Mitigation: start at level 5 with `wordpress-stubs`, baseline, ratchet.
- **Coverage thresholds set too high → red CI.** Mitigation: decision #3 (ratchet from current).
- **Bumping `better-sqlite3` shifts `sync` behavior.** Low risk (sync is frozen/out of scope), but its 6 existing tests must still pass; if 12.x breaks them, fall back to the `engines` cap + leave 9.x and document Node ≤24.
- **Flat-config migration touches every package.** Contained; verified by the "no global ESLint" acceptance check.

## 8. What this unlocks

With the rails down, Phase 2 (Performance) can prove its numbers via Lighthouse CI in the same gate, Phase 3 (a11y) plugs axe-core into the existing Playwright/CI setup, and every subsequent claim ships behind a green check. That is precisely the credibility gap the WP Rig review said "sinks adoption" — closed.
