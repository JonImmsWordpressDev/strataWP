# Phase 3 WS-A — WPCS across ALL PHP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring every non-core PHP surface (3 example themes + 3 CLI scaffold templates) to a green `WordPress-Extra` WPCS gate, enforced in CI, fixing real security issues along the way — without touching the existing core PHP QA.

**Architecture:** Add a per-theme `phpcs.xml.dist` (base `WordPress-Extra`, no `WordPress-Docs`, no configured `text_domain`, PSR-4 `FileName` ratchet) to each of the six locations. A root `scripts/lint-php.mjs` runs `packages/core/vendor/bin/phpcs` against each location with that location's ruleset (the CLI templates are not pnpm workspaces, so a root script — not turbo — is the source of truth). `phpcbf` clears ~99% of the debt (whitespace/arrays/formatting); the small residue is hand-fixed (security) or ratcheted (PSR-4 file names). A new CI `php-themes` job runs `pnpm lint:php`; the existing core `php` job is left untouched.

**Tech Stack:** PHP 8.4 / Composer; `squizlabs/php_codesniffer` 3.13.5 + `wp-coding-standards/wpcs` ^3.1 (already installed in `packages/core/vendor`); Node script for orchestration; GitHub Actions; pnpm + Turbo 1.x.

**Codename discipline:** the competitor is **Triple XXX** in every committed artifact. Stage files explicitly — **never `git add -A` / `git add .`** (an untracked `docs/superpowers/plans/2026-04-26-*.md` stray file embeds the competitor name and must never be committed).

**Reference:** Spec at `docs/superpowers/specs/2026-06-24-quality-a11y-design.md`.

---

## File structure

**Create:**
- `scripts/lint-php.mjs` — orchestrator: runs core's phpcs against each cleaned location.
- `packages/cli/templates/basic-theme/phpcs.xml.dist`
- `examples/basic-theme/phpcs.xml.dist`
- `packages/cli/templates/store-theme/phpcs.xml.dist`
- `examples/store-theme/phpcs.xml.dist`
- `packages/cli/templates/advanced-theme/phpcs.xml.dist`
- `examples/advanced-theme/phpcs.xml.dist`

**Modify:**
- `package.json` (root) — add `"lint:php"` script.
- `.github/workflows/ci.yml` — add the `php-themes` job.
- `examples/basic-theme/composer.json` — remove the duplicate `require` key.
- PHP under each theme (via `phpcbf` + targeted security fixes in `src/blocks/*/render.php`).

**The canonical per-theme `phpcs.xml.dist`** (only `name`/`<description>` differ per theme — `StrataWP Basic Theme` / `Store Theme` / `Advanced Theme`):

```xml
<?xml version="1.0"?>
<ruleset name="StrataWP Basic Theme">
  <description>WordPress coding standards for the StrataWP basic theme.</description>

  <file>.</file>

  <arg name="extensions" value="php"/>
  <arg name="colors"/>
  <arg value="sp"/>
  <arg name="parallel" value="8"/>

  <exclude-pattern>*/vendor/*</exclude-pattern>
  <exclude-pattern>*/node_modules/*</exclude-pattern>
  <exclude-pattern>*/dist/*</exclude-pattern>
  <exclude-pattern>*-generated.php</exclude-pattern>

  <config name="testVersion" value="8.1-"/>
  <config name="minimum_wp_version" value="6.5"/>

  <rule ref="WordPress-Extra"/>

  <!-- ratchet: PSR-4 theme classes use PascalCase file names for Composer autoloading; WP file-naming is not applicable to autoloaded class files -->
  <rule ref="WordPress.Files.FileName.NotHyphenatedLowercase">
    <severity>0</severity>
  </rule>
  <rule ref="WordPress.Files.FileName.InvalidClassFileName">
    <severity>0</severity>
  </rule>
</ruleset>
```

> **Note on `text_domain`:** deliberately NOT configured (per spec decision 4) — the legacy `frost` text domain would otherwise produce ~439 `TextDomainMismatch` errors per theme and self-block the gate. i18n enforcement is deferred; WS-B fixes basic-theme's text domain.

---

## Task 0: Commit the spec + this plan

**Files:**
- Commit: `docs/superpowers/specs/2026-06-24-quality-a11y-design.md`, `docs/superpowers/plans/2026-06-24-quality-a11y-ws-a-implementation.md`

- [ ] **Step 1: Confirm branch**

Run: `git branch --show-current`
Expected: `feat/quality-a11y`

- [ ] **Step 2: Commit the docs (explicit paths only)**

```bash
git add docs/superpowers/specs/2026-06-24-quality-a11y-design.md docs/superpowers/plans/2026-06-24-quality-a11y-ws-a-implementation.md
git commit -m "docs(quality-a11y): Phase 3 spec + WS-A plan"
```

Expected: one commit; `git status` shows only the pre-existing untracked tooling artifacts (`.claude*`, `*.rvf`, `*.db`, `.stratawp-snapshots/`, the stray `2026-04-26` plan) — none staged.

---

## Task 1: Lint infrastructure + first location (`packages/cli/templates/basic-theme`)

**Files:**
- Create: `scripts/lint-php.mjs`
- Modify: `package.json` (root)
- Create: `packages/cli/templates/basic-theme/phpcs.xml.dist`
- Modify (mechanical): PHP under `packages/cli/templates/basic-theme`

- [ ] **Step 1: Create the lint orchestrator with the first location**

Create `scripts/lint-php.mjs`:

```js
#!/usr/bin/env node
// Runs the core-provided phpcs binary against each cleaned theme location
// using that location's phpcs.xml.dist. Locations are added as they are
// brought to green (spec: "turn the gate on per-location").
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const phpcs = resolve(root, 'packages/core/vendor/bin/phpcs')

// Locations are appended as each is cleaned. Final state: all six.
const LOCATIONS = ['packages/cli/templates/basic-theme']

if (!existsSync(phpcs)) {
  console.error(`phpcs not found at ${phpcs}. Run "composer install" in packages/core first.`)
  process.exit(1)
}

let failed = false
for (const loc of LOCATIONS) {
  const dir = resolve(root, loc)
  process.stdout.write(`\n=== phpcs: ${loc} ===\n`)
  try {
    execFileSync(phpcs, ['--standard=phpcs.xml.dist'], { cwd: dir, stdio: 'inherit' })
  } catch {
    failed = true
  }
}
process.exit(failed ? 1 : 0)
```

- [ ] **Step 2: Add the root script**

In `package.json` (root), add to `"scripts"` after `"lint:fix"`:

```json
    "lint:php": "node scripts/lint-php.mjs",
```

- [ ] **Step 3: Create the ruleset for this location**

Create `packages/cli/templates/basic-theme/phpcs.xml.dist` using the canonical ruleset above (name `StrataWP Basic Theme`).

- [ ] **Step 4: Run the gate — verify it FAILS (the red state)**

Run: `pnpm lint:php`
Expected: FAIL — phpcs reports ~610 errors (dominated by `Generic.WhiteSpace.DisallowSpaceIndent`).

- [ ] **Step 5: Auto-fix the mechanical debt with phpcbf**

Run:
```bash
cd packages/cli/templates/basic-theme && "$(git rev-parse --show-toplevel)/packages/core/vendor/bin/phpcs" >/dev/null 2>&1; "$(git rev-parse --show-toplevel)/packages/core/vendor/bin/phpcbf" --standard=phpcs.xml.dist; cd "$(git rev-parse --show-toplevel)"
```
Expected: phpcbf reports ~475 violations fixed. (Exit code 1 from phpcbf means "files were fixed" — that is success, not failure.)

- [ ] **Step 6: Verify phpcbf left inline HTML / block delimiters untouched**

Run: `git diff --stat packages/cli/templates/basic-theme && git diff packages/cli/templates/basic-theme/patterns | grep -E '^\+.*<!-- wp:' | head`
Expected: the `grep` returns nothing (no `wp:*` block-delimiter lines were added/rewritten — only PHP-token whitespace changed). Spot-check one patterns diff visually to confirm only leading-whitespace changed inside `<?php ?>`.

- [ ] **Step 7: Commit the mechanical fix separately**

```bash
git add packages/cli/templates/basic-theme
git commit -m "chore(cli/basic): phpcbf WPCS auto-fixes (WordPress-Extra)"
```

- [ ] **Step 8: Re-run the gate and handle residue**

Run: `pnpm lint:php`
Expected: now passes (0 errors). The PSR-4 `FileName` residue is suppressed by the ratchet. If any `WordPress.Security.*` or other non-fixable error remains, fix it (see Task 3 for the security-fix patterns) before continuing.

- [ ] **Step 9: Commit the lint infrastructure + first green location**

```bash
git add scripts/lint-php.mjs package.json packages/cli/templates/basic-theme/phpcs.xml.dist
git commit -m "feat(qa): WPCS gate scaffolding + cli/basic template green (WordPress-Extra)"
```

---

## Task 2: `examples/basic-theme` (+ composer dup-require fix)

**Files:**
- Create: `examples/basic-theme/phpcs.xml.dist`
- Modify: `examples/basic-theme/composer.json`, `scripts/lint-php.mjs`
- Modify (mechanical): PHP under `examples/basic-theme`

- [ ] **Step 1: Create the ruleset**

Create `examples/basic-theme/phpcs.xml.dist` using the canonical ruleset (name `StrataWP Basic Theme`).

- [ ] **Step 2: Add the location to the orchestrator**

In `scripts/lint-php.mjs`, extend `LOCATIONS`:

```js
const LOCATIONS = [
  'packages/cli/templates/basic-theme',
  'examples/basic-theme',
]
```

- [ ] **Step 3: Run the gate — verify the new location FAILS**

Run: `pnpm lint:php`
Expected: `cli/templates/basic-theme` passes; `examples/basic-theme` FAILS (~419 errors).

- [ ] **Step 4: Auto-fix with phpcbf**

Run:
```bash
cd examples/basic-theme && "$(git rev-parse --show-toplevel)/packages/core/vendor/bin/phpcbf" --standard=phpcs.xml.dist; cd "$(git rev-parse --show-toplevel)"
```
Expected: ~417 fixed (phpcbf exit 1 = fixed = success).

- [ ] **Step 5: Fix the duplicate `require` key in composer.json**

`examples/basic-theme/composer.json` has two `"require"` keys; the second silently overrides the first and drops the `"php": ">=8.1"` constraint. Merge them into a single `"require"` object that keeps `stratawp/core` AND `"php": ">=8.1"`. Run `composer validate --no-check-publish` in that dir; expected: "valid" (no duplicate-key warning).

- [ ] **Step 6: Verify inline HTML untouched + handle residue**

Run: `pnpm lint:php`
Expected: both basic locations pass. Spot-check the patterns diff as in Task 1 Step 6.

- [ ] **Step 7: Commit**

```bash
git add examples/basic-theme scripts/lint-php.mjs
git commit -m "chore(examples/basic): WPCS green (phpcbf) + fix composer dup-require"
```

---

## Task 3: `store` theme — both copies (security fixes)

`packages/cli/templates/store-theme` and `examples/store-theme` are byte-identical PHP. Apply every change to **both** copies identically.

**Files:**
- Create: `packages/cli/templates/store-theme/phpcs.xml.dist`, `examples/store-theme/phpcs.xml.dist`
- Modify: `scripts/lint-php.mjs`
- Modify (mechanical + security): PHP under both store locations, esp. `src/blocks/{hero,feature-card,featured-products,product-categories}/render.php`

- [ ] **Step 1: Create both rulesets**

Create `packages/cli/templates/store-theme/phpcs.xml.dist` and `examples/store-theme/phpcs.xml.dist` using the canonical ruleset (name `StrataWP Store Theme`).

- [ ] **Step 2: Add both locations to the orchestrator**

In `scripts/lint-php.mjs`, append to `LOCATIONS`:

```js
  'packages/cli/templates/store-theme',
  'examples/store-theme',
```

- [ ] **Step 3: Run the gate — verify both store locations FAIL**

Run: `pnpm lint:php`
Expected: store locations FAIL (~774 errors each).

- [ ] **Step 4: phpcbf both copies**

```bash
ROOT="$(git rev-parse --show-toplevel)"
for d in packages/cli/templates/store-theme examples/store-theme; do (cd "$ROOT/$d" && "$ROOT/packages/core/vendor/bin/phpcbf" --standard=phpcs.xml.dist); done
```
Expected: ~766 fixed per copy.

- [ ] **Step 5: Re-run to see the security residue**

Run: `pnpm lint:php`
Expected: store locations now report only the security residue:
- `WordPress.WP.GlobalVariablesOverride`: `hero/render.php:9` (`$title`), `feature-card/render.php:9`, `featured-products/render.php:17,18` (`$orderby`, `$order`).
- `WordPress.Security.EscapeOutput.OutputNotEscaped`: `product-categories/render.php:40,62,63`; `featured-products/render.php:58,86,91`.

- [ ] **Step 6: Fix `GlobalVariablesOverride` by renaming the colliding locals**

These `render.php` files run in WordPress global scope, so `$title`/`$order`/`$orderby` assignments overwrite real WP globals. Rename each colliding variable to a theme-prefixed local throughout the file (e.g. `$title` → `$hero_title`, `$order` → `$fp_order`, `$orderby` → `$fp_orderby`, and the `feature-card` collision likewise). Update every reference in the same file. Verify per file:

Run: `"$(git rev-parse --show-toplevel)/packages/core/vendor/bin/phpcs" --standard=WordPress-Extra --sniffs=WordPress.WP.GlobalVariablesOverride examples/store-theme/src/blocks`
Expected: 0 errors.

- [ ] **Step 7: Fix `EscapeOutput`**

Apply per the escaping map:
- `echo $wrapper_attributes;` (output of `get_block_wrapper_attributes()`, known pre-escaped) → add an inline ignore on that line: `<?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() returns escaped HTML attributes. ?>`
- Plain-string output → wrap in `esc_html()` / `esc_attr()` / `esc_url()` as fits the context.
- Intentional HTML built in a variable (e.g. `$rating_html`) → wrap in `wp_kses_post()`.
- An object echoed directly (e.g. `$product`) → echo the correct string accessor and escape it (inspect the line; never `echo` an object).

Verify per file:

Run: `"$(git rev-parse --show-toplevel)/packages/core/vendor/bin/phpcs" --standard=WordPress-Extra --sniffs=WordPress.Security.EscapeOutput examples/store-theme/src/blocks`
Expected: 0 errors.

- [ ] **Step 8: Mirror every change into the cli template copy**

Ensure `packages/cli/templates/store-theme/src/blocks/*` received the identical edits. Verify the copies match:

Run: `diff -rq packages/cli/templates/store-theme/src examples/store-theme/src | grep -v generated`
Expected: no differences (ignoring `*-generated.php`).

- [ ] **Step 9: Verify the full gate green**

Run: `pnpm lint:php`
Expected: all four cleaned locations pass.

- [ ] **Step 10: Commit**

```bash
git add packages/cli/templates/store-theme examples/store-theme scripts/lint-php.mjs
git commit -m "fix(store): WPCS green — phpcbf + escape output + stop overriding WP globals"
```

---

## Task 4: `advanced` theme — both copies (security fixes)

`packages/cli/templates/advanced-theme` and `examples/advanced-theme` are byte-identical PHP. Apply every change to **both**.

**Files:**
- Create: `packages/cli/templates/advanced-theme/phpcs.xml.dist`, `examples/advanced-theme/phpcs.xml.dist`
- Modify: `scripts/lint-php.mjs`
- Modify (mechanical + security): PHP under both advanced locations, esp. `src/blocks/{hero,feature-card,portfolio-grid,team-members}/render.php`

- [ ] **Step 1: Create both rulesets**

Create both `phpcs.xml.dist` files using the canonical ruleset (name `StrataWP Advanced Theme`).

- [ ] **Step 2: Add both locations to the orchestrator**

In `scripts/lint-php.mjs`, append the final two:

```js
  'packages/cli/templates/advanced-theme',
  'examples/advanced-theme',
```

`LOCATIONS` now lists all six.

- [ ] **Step 3: Run the gate — verify both advanced locations FAIL**

Run: `pnpm lint:php`
Expected: advanced locations FAIL (~1,339 errors each).

- [ ] **Step 4: phpcbf both copies**

```bash
ROOT="$(git rev-parse --show-toplevel)"
for d in packages/cli/templates/advanced-theme examples/advanced-theme; do (cd "$ROOT/$d" && "$ROOT/packages/core/vendor/bin/phpcbf" --standard=phpcs.xml.dist); done
```
Expected: ~1,457 fixed per copy.

- [ ] **Step 5: Re-run to see the security residue**

Run: `pnpm lint:php`
Expected: advanced locations report only:
- `GlobalVariablesOverride`: `portfolio-grid/render.php:14,15`; `feature-card/render.php:9`; `hero/render.php:9`.
- `EscapeOutput`: `team-members/render.php:44`; `portfolio-grid/render.php:45`.

- [ ] **Step 6: Fix `GlobalVariablesOverride` (rename colliding locals)**

Same approach as Task 3 Step 6 — rename WP-global-colliding locals to theme-prefixed names and update all references. Verify:

Run: `"$(git rev-parse --show-toplevel)/packages/core/vendor/bin/phpcs" --standard=WordPress-Extra --sniffs=WordPress.WP.GlobalVariablesOverride examples/advanced-theme/src/blocks`
Expected: 0 errors.

- [ ] **Step 7: Fix `EscapeOutput`**

Same escaping map as Task 3 Step 7. Verify:

Run: `"$(git rev-parse --show-toplevel)/packages/core/vendor/bin/phpcs" --standard=WordPress-Extra --sniffs=WordPress.Security.EscapeOutput examples/advanced-theme/src/blocks`
Expected: 0 errors.

- [ ] **Step 8: Mirror into the cli template copy + verify match**

Run: `diff -rq packages/cli/templates/advanced-theme/src examples/advanced-theme/src | grep -v generated`
Expected: no differences (ignoring `*-generated.php`).

- [ ] **Step 9: Verify the full gate green (all six)**

Run: `pnpm lint:php`
Expected: all six locations pass, exit 0.

- [ ] **Step 10: Commit**

```bash
git add packages/cli/templates/advanced-theme examples/advanced-theme scripts/lint-php.mjs
git commit -m "fix(advanced): WPCS green — phpcbf + escape output + stop overriding WP globals"
```

---

## Task 5: Wire the CI `php-themes` job

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add the job**

Append this job to `.github/workflows/ci.yml` under `jobs:` (sibling of `js` and `php`):

```yaml
  php-themes:
    name: PHP themes (WPCS)
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

      - name: Install the core QA toolchain (provides phpcs + WPCS)
        working-directory: packages/core
        run: composer install --no-interaction --no-progress

      - name: WPCS across all theme PHP
        run: pnpm lint:php
```

- [ ] **Step 2: Validate the workflow YAML**

Run: `node -e "const y=require('fs').readFileSync('.github/workflows/ci.yml','utf8'); console.log(y.includes('php-themes')? 'job present':'MISSING')"`
Expected: `job present`. (Confirm indentation matches the existing `php` job — two spaces under `jobs:`.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: gate WPCS across all theme PHP (php-themes job)"
```

---

## Task 6: Full local gate verification

**Files:** none (verification only)

- [ ] **Step 1: PHP theme gate**

Run: `pnpm lint:php`
Expected: all six locations pass, exit 0.

- [ ] **Step 2: Core PHP QA unchanged**

Run: `cd packages/core && composer phpcs && composer phpstan && composer test; cd "$(git rev-parse --show-toplevel)"`
Expected: all green (Phase 1 gate intact).

- [ ] **Step 3: JS/TS gate (Phase 1/2 intact)**

Run: `pnpm build && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`
Expected: all green. (`format:check` must not flag `docs/superpowers/*` — it is in `.prettierignore`.)

- [ ] **Step 4: Confirm clean, codename-safe tree**

Run: `git status -sb && git log --oneline origin/main..HEAD`
Expected: only the pre-existing untracked tooling artifacts remain unstaged (incl. the stray `2026-04-26` plan — NOT committed); the commit list shows the docs + per-location commits and nothing referencing the competitor by name.

- [ ] **Step 5: Push and open the PR** (see subagent-driven-development handoff / finishing-a-development-branch)

```bash
git push -u origin feat/quality-a11y
```

PR title: `Phase 3 WS-A: WPCS across all PHP (the standards Triple XXX declares but never enforces)`. Body summarizes: per-theme `WordPress-Extra` rulesets, ~5,000 violations cleared (phpcbf), real security fixes (escaping + WP-global overrides in block renders), new `php-themes` CI gate; no competitor name anywhere.

---

## Self-review checklist (completed by plan author)

- **Spec coverage:** per-theme rulesets (Tasks 1–4) ✓; `WordPress-Extra`/no-`text_domain` (ruleset) ✓; phpcbf-first (each task) ✓; security fixes not baselined (Tasks 3–4) ✓; FileName ratchet (ruleset) ✓; root `lint:php` covering non-workspace templates (Task 1) ✓; `php-themes` CI job leaving core job intact (Task 5) ✓; example↔template sync (Tasks 3–4) ✓; composer dup-require (Task 2) ✓; generated/vendor/dist excluded (ruleset) ✓; codename discipline / no `git add -A` (throughout) ✓.
- **Deferred per spec (not in this plan):** i18n/`text_domain` + `frost` text-domain sweep (WS-B handles basic), PHPStan-on-themes, the broad leak sweep (Phase 5), all of WS-B (axe).
- **Placeholders:** none — every step has exact paths, commands, and expected output; security fixes name exact files/lines/sniffs and the escaping map.
- **Consistency:** `LOCATIONS` grows monotonically to all six; `pnpm lint:php` is the single gate command in every verify step and in CI.
