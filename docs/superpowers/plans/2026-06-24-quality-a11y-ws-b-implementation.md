# Phase 3 WS-B — Playwright + axe-core front-end a11y — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate `examples/basic-theme` on **zero WCAG 2.1 A/AA axe violations** via Playwright + `@axe-core/playwright` running against the built theme on `@wordpress/env` in a new hard-blocking CI workflow — the automated a11y testing Triple XXX never runs.

**Architecture:** First fix the legacy-`frost` naming that renders `<main>` empty (a correctness prerequisite). Add a shared `makeAxeBuilder` fixture to `@stratawp/testing`, a dedicated single-engine `playwright.a11y.config.ts` + a11y spec dir in `examples/basic-theme`, and a `wait-for-http` readiness poller. Fix the known a11y defects in the theme's patterns / `theme.json` / SCSS so the scan passes. Wire a new `a11y.yml` that boots wp-env (reusing the perf.yml recipe), seeds content, and runs the scan as a required check.

**Tech Stack:** `@playwright/test ^1.58.2`, `@axe-core/playwright ^4.11.3` (axe-core 4.11.x); `@wordpress/env` (Docker); Node 20; pnpm + Turbo 1.x.

**Codename discipline:** competitor = **Triple XXX** in committed artifacts; never the real name. Stage files explicitly — **never `git add -A` / `git add .`** (a ruflo post-edit hook auto-scrubs the competitor name and an untracked `docs/superpowers/plans/2026-04-26-*.md` stray file embeds it). **"Frost" is a different, legitimately-credited prior-art theme (WP Engine) — do NOT scrub it; only fix the `frost/*` slug + `'frost'` text-domain bugs.**

**Reference:** Spec `docs/superpowers/specs/2026-06-24-quality-a11y-design.md` (§4 WS-B).

---

## ⚠️ Sequencing prerequisite (read first)

Build this **after PR #19 (WS-A) and PR #20 (codename hygiene) are merged to `main`.** Then:

```bash
git checkout feat/a11y-e2e
git fetch origin && git rebase origin/main
```

Why: WS-B rewrites the `'frost'` text domain across the same 43 pattern files WS-A reformatted with `phpcbf`, and touches `CLAUDE.md`/`Accessibility.php` that #20 also edits. Rebasing onto the merged base avoids large conflicts. After rebase, the pattern files are tab-indented (WS-A) and competitor-clean (#20) — line numbers below that reference `patterns/*.php` are approximate; locate edits by the quoted content, not the line number. The `.html` templates, `theme.json`, and `_forms.scss` are NOT touched by WS-A/#20, so their references are stable.

---

## File structure

**Create:**
- `packages/testing/src/axe.ts` — `makeAxeBuilder` fixture (exported via the `./playwright` subpath).
- `examples/basic-theme/playwright.a11y.config.ts` — single-chromium config, `testDir: ./e2e/a11y`, `baseURL` :8888, no `webServer`.
- `examples/basic-theme/e2e/a11y/frontend.spec.ts` — the front-end a11y scan.
- `scripts/wait-for-http.mjs` — poll a URL until HTTP 200 (bounded retry).
- `.github/workflows/a11y.yml` — the new hard-blocking a11y workflow.

**Modify:**
- `packages/testing/package.json` (deps), `packages/testing/src/playwright.ts` (re-export `makeAxeBuilder`).
- `examples/basic-theme/templates/{home,index,archive,search,single,404}.html` (slug fix + `<main>` id), `examples/basic-theme/patterns/page-pricing.php` (slug fix).
- `examples/basic-theme/patterns/*.php` (text-domain `'frost'`→`'strata-basic'`), `examples/basic-theme/functions.php` (register pattern categories).
- `examples/basic-theme/patterns/page-home.php` (h1, dedupe id, button hrefs), `examples/basic-theme/parts/header.html` (skip-link), `examples/basic-theme/patterns/footer-default.php` (real hrefs).
- `examples/basic-theme/theme.json` (link styling + h1 sizing), `examples/basic-theme/src/scss/_forms.scss` (+ a global focus-visible partial).
- root `package.json` (`test:e2e`), `turbo.json` (`e2e` task), `.gitignore` (report dirs), `CLAUDE.md` (Testing/Accessibility sections).

---

## Task 1: Fix the `frost` render blocker + i18n reconciliation

**Files:** the 6 templates + `patterns/page-pricing.php` (slugs); `patterns/*.php` (text domain); `functions.php` (categories).

- [ ] **Step 1: Fix the 7 `wp:pattern` slug references (the blocking bug)**

Replace `frost/` → `strata-basic/` in exactly these `wp:pattern` slugs (parts/header.html and parts/footer.html are already correct — leave them):
- `templates/home.html`: `"slug":"frost/page-home"` → `"strata-basic/page-home"`
- `templates/index.html`: `"slug":"frost/posts"` → `"strata-basic/posts"`
- `templates/archive.html`: `"slug":"frost/posts"` → `"strata-basic/posts"`
- `templates/search.html`: `"slug":"frost/posts"` → `"strata-basic/posts"`
- `templates/single.html`: `"slug":"frost/comments"` → `"strata-basic/comments"`
- `templates/404.html`: `"slug":"frost/404"` → `"strata-basic/404"`
- `patterns/page-pricing.php`: `"slug":"frost/pricing-three-columns-dark"` → `"strata-basic/pricing-three-columns-dark"`

- [ ] **Step 2: Verify the slug fix**

Run: `grep -rn '"slug":"frost/' examples/basic-theme/templates examples/basic-theme/parts examples/basic-theme/patterns`
Expected: **no output** (zero unregistered `frost/` slug references remain).

- [ ] **Step 3: Fix the `'frost'` text domain across patterns**

The theme's text domain is `strata-basic` (style.css), but pattern gettext calls use `'frost'` (439 occurrences in 43 files). Bulk-replace ONLY the quoted text-domain token:

```bash
cd examples/basic-theme && sed -i '' "s/'frost'/'strata-basic'/g" patterns/*.php && cd "$(git rev-parse --show-toplevel)"
```

This leaves legitimate "Frost" attribution content untouched (e.g. `https://wordpress.org/themes/frost/`, "Made with Frost" copy in `page-link.php`) — those are not the quoted `'frost'` token.

- [ ] **Step 4: Verify the text-domain fix**

Run: `grep -rn "'frost'" examples/basic-theme/patterns`
Expected: **no output**. Then confirm the legit Frost attribution survived: `grep -rn "frostwp\|Made with Frost\|themes/frost" examples/basic-theme/patterns/page-link.php` should still return its lines.

- [ ] **Step 5: Register the two pattern categories (cleanliness)**

`frost-page` (4 patterns) and `frost-pricing` (6 patterns) are referenced in pattern `Categories:` headers but never registered (WordPress silently buckets them as Uncategorized). Register them in `examples/basic-theme/functions.php` — add, inside an `init` hook callback (place near the existing theme setup; if none, add a new `add_action( 'init', ... )`):

```php
register_block_pattern_category(
	'frost-page',
	array( 'label' => __( 'Pages', 'strata-basic' ) )
);
register_block_pattern_category(
	'frost-pricing',
	array( 'label' => __( 'Pricing', 'strata-basic' ) )
);
```

(Keeping the `frost-*` slug is fine — these are internal category ids, and "Frost" is credited prior art, not the competitor. The goal is only that they resolve to a registered category.)

- [ ] **Step 6: Verify the theme still lints (WS-A gate intact)**

Run: `pnpm lint:php`
Expected: exit 0 (the text-domain edits and the `functions.php` addition stay WPCS-clean; if `register_block_pattern_category` calls trip a sniff, fix formatting until green).

- [ ] **Step 7: Boot wp-env and confirm `<main>` now renders content**

```bash
docker info >/dev/null 2>&1 || open -a Docker  # ensure Docker is running
pnpm --filter @stratawp/vite-plugin build
( cd examples/basic-theme && COMPOSER_MIRROR_PATH_REPOS=1 composer install --no-interaction && pnpm build )
pnpm exec wp-env start
pnpm exec wp-env run cli wp theme activate basic-theme
node scripts/wait-for-http.mjs http://localhost:8888/   # created in Task 2 — run Task 2 Step 4 first if not present, or curl manually
curl -s http://localhost:8888/ | grep -c "wp-block" 
```
Expected: the home page HTML now contains many `wp-block-*` elements inside `<main>` (non-zero count), i.e. the `page-home` pattern resolves. (If you haven't built Task 2's poller yet, just `curl -s http://localhost:8888/ | grep "Experience the next generation"` should match the hero text.)

- [ ] **Step 8: Commit**

```bash
git add examples/basic-theme/templates examples/basic-theme/patterns examples/basic-theme/functions.php
git commit -m "fix(basic): reconcile frost->strata-basic pattern slugs + text domain (render blocker)"
```

---

## Task 2: Build the a11y harness (deps, fixture, config, poller, spec) — RED

**Files:** `packages/testing/package.json`, `packages/testing/src/axe.ts`, `packages/testing/src/playwright.ts`, `examples/basic-theme/playwright.a11y.config.ts`, `examples/basic-theme/e2e/a11y/frontend.spec.ts`, `scripts/wait-for-http.mjs`.

- [ ] **Step 1: Add deps**

Run:
```bash
pnpm --filter @stratawp/testing add -D @axe-core/playwright@^4.11.3
pnpm --filter @stratawp/testing add -D @playwright/test@^1.58.2
pnpm exec playwright install --with-deps chromium
```
Expected: lockfile updates; chromium installed.

- [ ] **Step 2: Create the AxeBuilder fixture**

Create `packages/testing/src/axe.ts`:

```ts
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'

/** WCAG 2.1 A/AA tag set used for the blocking gate. */
export const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const

/**
 * Build an axe scanner scoped to WCAG 2.1 A/AA, excluding the wp-env admin bar.
 * Centralized so the tag set + any documented disables live in one audited place.
 */
export function makeAxeBuilder(page: Page): AxeBuilder {
	return new AxeBuilder({ page })
		.withTags([...WCAG_AA_TAGS])
		.exclude('#wpadminbar')
}
```

Then re-export it from `packages/testing/src/playwright.ts` (add alongside the existing re-exports):

```ts
export { makeAxeBuilder, WCAG_AA_TAGS } from './axe'
```

- [ ] **Step 3: Build the testing package**

Run: `pnpm --filter @stratawp/testing build`
Expected: succeeds; `@stratawp/testing/playwright` now exports `makeAxeBuilder`.

- [ ] **Step 4: Create the readiness poller**

Create `scripts/wait-for-http.mjs`:

```js
#!/usr/bin/env node
// Poll a URL until it returns HTTP 200, or fail after a bounded timeout.
// Usage: node scripts/wait-for-http.mjs <url> [timeoutMs] [intervalMs]
const url = process.argv[2]
const timeoutMs = Number(process.argv[3] ?? 120000)
const intervalMs = Number(process.argv[4] ?? 2000)
if (!url) {
	console.error('usage: wait-for-http.mjs <url> [timeoutMs] [intervalMs]')
	process.exit(2)
}
const deadline = Date.now() + timeoutMs
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let lastErr = ''
while (Date.now() < deadline) {
	try {
		const res = await fetch(url)
		if (res.ok) {
			console.log(`ready: ${url} -> ${res.status}`)
			process.exit(0)
		}
		lastErr = `status ${res.status}`
	} catch (e) {
		lastErr = String(e?.message ?? e)
	}
	await sleep(intervalMs)
}
console.error(`timed out waiting for ${url} (${lastErr})`)
process.exit(1)
```

- [ ] **Step 5: Create the single-engine a11y Playwright config**

Create `examples/basic-theme/playwright.a11y.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

/** Front-end accessibility scan against the theme on @wordpress/env (:8888). */
export default defineConfig({
	testDir: './e2e/a11y',
	timeout: 30_000,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	reporter: process.env.CI
		? [['github'], ['html', { open: 'never' }], ['blob']]
		: [['list']],
	use: {
		baseURL: process.env.WP_BASE_URL || 'http://localhost:8888',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
```

- [ ] **Step 6: Write the a11y spec**

Create `examples/basic-theme/e2e/a11y/frontend.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { makeAxeBuilder } from '@stratawp/testing/playwright'

// Public front-end routes that must be free of WCAG 2.1 A/AA violations.
// Run unauthenticated; the harness seeds a published page + post + sets a
// static front page (see a11y.yml), so these all render real markup.
const routes = [
	{ name: 'home', path: '/' },
	{ name: 'blog', path: '/?page_id=' }, // overwritten below when seeded; see note
	{ name: 'search', path: '/?s=test' },
	{ name: '404', path: '/this-page-does-not-exist-404' },
]

for (const route of routes) {
	test(`a11y: ${route.name} (${route.path})`, async ({ page }) => {
		await page.goto(route.path, { waitUntil: 'domcontentloaded' })
		await page.evaluate(() => document.fonts.ready)
		await expect(page.locator('main')).toBeVisible()
		const results = await makeAxeBuilder(page).analyze()
		expect(results.violations).toEqual([])
	})
}
```

> Note: keep the route list to URLs that are guaranteed to render (`/`, `/?s=...`, a 404). Add a single-post and single-page route only after Task 4's seeding lands a known slug; reference them by the seeded slug (e.g. `/hello-world/`, `/sample-page/`) rather than guessing IDs.

- [ ] **Step 7: Run the scan locally — expect RED (defects present)**

With wp-env running + theme active (Task 1 Step 7), seed minimal content and scan:
```bash
pnpm exec wp-env run cli wp post create --post_type=page --post_title='Sample Page' --post_status=publish --post_name=sample-page
pnpm exec wp-env run cli wp post create --post_title='Hello World' --post_status=publish --post_name=hello-world
node scripts/wait-for-http.mjs http://localhost:8888/
pnpm exec playwright test --config examples/basic-theme/playwright.a11y.config.ts
```
Expected: **FAIL** — the home scan reports violations (e.g. `page-has-heading-one`, `duplicate-id`, `link-name`/`link-in-text-block`, `bypass`). Capture the violation ids; they drive Task 3.

- [ ] **Step 8: Commit the harness (red is fine — it documents the defects)**

```bash
git add packages/testing/package.json packages/testing/src/axe.ts packages/testing/src/playwright.ts examples/basic-theme/playwright.a11y.config.ts examples/basic-theme/e2e/a11y scripts/wait-for-http.mjs pnpm-lock.yaml
git commit -m "test(a11y): axe harness — AxeBuilder fixture, single-chromium config, readiness poller"
```

---

## Task 3: Fix the a11y defects — GREEN

Apply each fix, rebuild the theme (`cd examples/basic-theme && pnpm build`), and re-run the scan until `expect(violations).toEqual([])`. Locate `page-home.php` edits by quoted content (line numbers shifted by WS-A's phpcbf).

- [ ] **Step 1: `page-home.php` — promote hero to `<h1>`, dedupe id, add button hrefs**
  - Hero heading: the block whose text is `Experience the next generation of WordPress.` — change its heading block to `{"level":1}` so it renders `<h1>` (currently `<h2 ... has-max-72-font-size>`). Keep the `has-max-72-font-size` class so visual size is preserved (also see Step 3 for theme.json h1 sizing).
  - Duplicate id: two headings carry `id="text-on-left-image-on-right"` (one `Build with Frost` — leave that copy text, it's the prior-art name — and one `Experience the next generation…`). Give the second a unique anchor/id, e.g. `features-intro` (update both the block `"anchor"` and the rendered `id`), or remove the redundant anchor.
  - Hrefless buttons: the five `Get Started` button anchors render `<a class="wp-block-button__link ...">` with no `href`. Set a `url` on each `wp:button` so it renders `href="#"` (or a real destination) — fixes `link-name` + keyboard focusability.

- [ ] **Step 2: Skip link (bypass) — `parts/header.html` + `<main>` id**

Prepend a skip link as the first focusable element in `parts/header.html` (before the header pattern):
```html
<!-- wp:html --><a class="skip-link screen-reader-text" href="#wp--skip-link--target">Skip to content</a><!-- /wp:html -->
```
Give the `<main>` group a matching id in each template (`home.html`, `index.html`, `archive.html`, `search.html`, `single.html`, `page.html`, `404.html`): the `wp:group {"tagName":"main"}` block — add `"layout"` is unrelated; add an anchor so it renders `id="wp--skip-link--target"` (set the group block's `"anchor":"wp--skip-link--target"`). The `.skip-link` styles already exist in `src/scss/_reset.scss`; `.screen-reader-text` is inlined by core `Accessibility.php`.

- [ ] **Step 3: `theme.json` — link affordance + h1 sizing**
  - `settings`/`styles` → `elements.link`: add `"typography": { "textDecoration": "underline" }` AND set the link color to a distinct value (e.g. `var(--wp--preset--color--primary)`), so links differ from body text by both color and underline (WCAG 1.4.1).
  - h1 typography: the hero h1 uses `has-max-72-font-size`; ensure `styles.elements.h1` sizing doesn't shrink it below the intended hero size (or rely on the preset class). Verify visually after rebuild.

- [ ] **Step 4: Focus-visible — `_forms.scss` + global**

In `examples/basic-theme/src/scss/_forms.scss`, replace the `input:focus, textarea:focus { … outline: none; }` block with a real focus ring:
```scss
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
	outline: 2px solid var(--wp--preset--color--primary);
	outline-offset: 2px;
}
```
Add a global focus-visible rule for links and buttons (none exist today) — e.g. in `_reset.scss` or a new `_a11y.scss` imported by `main.scss`:
```scss
a:focus-visible,
.wp-element-button:focus-visible,
button:focus-visible {
	outline: 2px solid var(--wp--preset--color--primary);
	outline-offset: 2px;
}
```

- [ ] **Step 5: `footer-default.php` — real hrefs**

Replace the placeholder `href="#"` on the footer links (`Contact Us`, `Facebook`, `LinkedIn`, `Instagram`) with real URLs (or `#contact` anchors). The primary 1.4.1 remediation is the theme.json link styling (Step 3); this removes dead targets.

- [ ] **Step 6: Rebuild + re-scan until GREEN**

```bash
( cd examples/basic-theme && pnpm build )
pnpm exec playwright test --config examples/basic-theme/playwright.a11y.config.ts
```
Expected: PASS — `expect(violations).toEqual([])` on all scanned routes. If a `color-contrast` violation surfaces (e.g. placeholder text), fix the `theme.json` palette value rather than disabling the rule; if a node is a genuine framework false-positive, `.exclude()` that specific node in the spec with a comment — never blanket-disable.

- [ ] **Step 7: Commit**

```bash
git add examples/basic-theme/patterns examples/basic-theme/parts examples/basic-theme/templates examples/basic-theme/theme.json examples/basic-theme/src
git commit -m "fix(basic): resolve WCAG 2.1 A/AA axe violations (skip-link, h1, dup-id, link affordance, focus-visible, button hrefs)"
```

---

## Task 4: CI workflow `a11y.yml` (hard-blocking)

**Files:** `.github/workflows/a11y.yml`

- [ ] **Step 1: Create the workflow**

Create `.github/workflows/a11y.yml` (models perf.yml's boot; **no `continue-on-error`** — axe is deterministic):

```yaml
name: Accessibility (axe)

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

concurrency:
  group: a11y-${{ github.ref }}
  cancel-in-progress: true

jobs:
  axe:
    name: axe WCAG 2.1 A/AA (wp-env)
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

      - name: Build the testing package (axe fixture)
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

      - name: Activate theme + seed content
        run: |
          pnpm exec wp-env run cli wp theme activate basic-theme
          pnpm exec wp-env run cli wp rewrite flush --hard
          pnpm exec wp-env run cli wp post create --post_type=page --post_title='Sample Page' --post_status=publish --post_name=sample-page
          pnpm exec wp-env run cli wp post create --post_title='Hello World' --post_status=publish --post_name=hello-world

      - name: Install Playwright chromium
        run: pnpm exec playwright install --with-deps chromium

      - name: Wait for WordPress to be ready
        run: node scripts/wait-for-http.mjs http://localhost:8888/ 120000

      - name: Run axe accessibility scan
        run: pnpm exec playwright test --config examples/basic-theme/playwright.a11y.config.ts

      - name: Upload Playwright report
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: playwright-a11y-report
          path: examples/basic-theme/playwright-report
          retention-days: 7
```

- [ ] **Step 2: Validate YAML**

Run: `node -e "const s=require('fs').readFileSync('.github/workflows/a11y.yml','utf8'); console.log(/jobs:\s*\n\s+axe:/.test(s)?'ok':'CHECK indentation')"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/a11y.yml
git commit -m "ci(a11y): hard-blocking axe WCAG 2.1 A/AA gate on wp-env (the a11y testing Triple XXX never runs)"
```

---

## Task 5: Docs & wiring reconciliation

**Files:** root `package.json`, `turbo.json`, `.gitignore`, `CLAUDE.md`.

- [ ] **Step 1: Root `test:e2e` + turbo `e2e`**

Add to root `package.json` `scripts` (after `lint:php`): `"test:e2e": "playwright test --config examples/basic-theme/playwright.a11y.config.ts",`
Add an `e2e` task to `turbo.json`'s `pipeline` (Turbo 1.x key): `"e2e": { "cache": false }`.

- [ ] **Step 2: gitignore the report/results dirs**

Append to `.gitignore`:
```
playwright-report/
test-results/
```
Confirm `.prettierignore` already covers `dist`/coverage; add the two report dirs if prettier would otherwise scan them.

- [ ] **Step 3: Reconcile `CLAUDE.md`**

Update the **Testing** section: `pnpm test:e2e` now runs the axe a11y scan (document the wp-env prerequisite); remove the unimplemented `pnpm test:coverage` advertisement (no root script exists — either drop the line or note it's per-package). Update the **Accessibility Component** section to state that front-end a11y is now CI-gated via axe (WCAG 2.1 A/AA) on `examples/basic-theme`. **Do not** touch the "component-based architecture inspired by …" credit line — that is owned by the codename-hygiene PR (#20); only edit the Testing/Accessibility content. After editing, run `pnpm format` (CLAUDE.md is prettier-checked).

- [ ] **Step 4: aria-current note (no code change)**

The core `core/navigation` block already emits `aria-current="page"` for the active URL, so there is no hard axe failure. Do **not** edit `packages/core/src/Components/Accessibility.php` here (its docblock is owned by #20). If the stated-feature gap matters, file a follow-up; it is out of WS-B's axe scope.

- [ ] **Step 5: Commit**

```bash
git add package.json turbo.json .gitignore CLAUDE.md
git commit -m "docs(a11y): wire test:e2e + turbo e2e, gitignore reports, reconcile CLAUDE.md testing/a11y"
```

---

## Task 6: Full local gate + push + PR

- [ ] **Step 1: PHP + JS gates (Phase 1/2/WS-A intact)**

Run: `pnpm lint:php && ( cd packages/core && composer phpcs && composer phpstan && composer test ) && pnpm build && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`
Expected: all green. (`format:check` must stay green after the CLAUDE.md/TS edits.)

- [ ] **Step 2: Local axe gate green**

With wp-env running + theme rebuilt + content seeded:
Run: `pnpm exec playwright test --config examples/basic-theme/playwright.a11y.config.ts`
Expected: PASS, zero violations on all routes.

- [ ] **Step 3: Confirm clean, codename-safe tree**

Run: `git status -sb && git diff main..HEAD | grep -inE 'wp.?rig' || echo CLEAN` and `grep -rn '"slug":"frost/' examples/basic-theme || echo "no frost slugs"`
Expected: no competitor name in the diff; no `frost/` slugs; only intended files committed (no tooling artifacts / stray plan).

- [ ] **Step 4: Push + PR**

```bash
git push -u origin feat/a11y-e2e
```
PR title: `Phase 3 WS-B: Playwright + axe-core front-end a11y gate (the a11y testing Triple XXX never runs)`. Body: the frost render-blocker fix, the axe harness, the WCAG 2.1 A/AA fixes, the new hard-blocking `a11y.yml`. Then watch CI; the `axe` check must be green. Jon merges.

- [ ] **Step 5: `wp-env stop`** (clean up the local Docker env)

```bash
pnpm exec wp-env stop
```

---

## Self-review checklist (completed by plan author)

- **Spec coverage (WS-B DoD):** frost render blocker fixed + verified (Task 1) ✓; axe harness in `packages/testing` fixture + basic-theme config/spec (Task 2) ✓; wp-env `:8888` boot reused with `COMPOSER_MIRROR_PATH_REPOS=1` + new poller (Tasks 2/4) ✓; WCAG 2.1 A/AA `expect(violations).toEqual([])` (Tasks 2/3) ✓; known defects fixed (Task 3) ✓; hard-blocking `a11y.yml` (Task 4) ✓; root `test:e2e` + turbo `e2e` + gitignore + CLAUDE.md (Task 5) ✓; single chromium, pinned versions ✓.
- **Conflict-avoidance:** build after #19 + #20 merge + rebase (prerequisite section); WS-B avoids editing `Accessibility.php` docblock + the CLAUDE.md credit line (owned by #20); page-home edits located by content (phpcbf shifted lines).
- **Codename:** "Frost" (prior-art base theme) preserved; only `frost/*` slug + `'frost'` text-domain bugs fixed; no competitor name introduced; explicit `git add` only.
- **Decisions honored:** basic-theme only; full WCAG 2.1 A/AA hard gate; `best-practice` not in the blocking tag set; PHPStan-on-themes out; perf.yml `continue-on-error` untouched.
