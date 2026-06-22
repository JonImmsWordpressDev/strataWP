# StrataWP Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make StrataWP's quality posture real and enforced — a clean package set, fixed installs, and a push/PR CI gate that runs lint, typecheck, format, JS tests (coverage), and a full PHP QA stack (PHPUnit + WPCS + PHPStan) so every later claim ships behind a green check.

**Architecture:** Two phases. Phase 0 is mechanical hygiene (delete dead packages, fix the `create-stratawp→cli` pin, fix the Node 25 native-build break, refresh the lockfile, normalize engines). Phase 1 installs the toolchain: real ESLint (flat config v9), a wired `typecheck` turbo task, `format:check`, deterministic coverage-gated Vitest, a real PHP QA stack on `packages/core` (Brain Monkey unit tests, WPCS, PHPStan), and `.github/workflows/ci.yml` tying it together with a PHP version matrix.

**Tech Stack:** pnpm 8 + Turborepo, TypeScript 5 + Vitest, ESLint 9 (flat) + typescript-eslint 8, Prettier 3; PHP 8.1+ with PHPUnit 10 + Brain Monkey, WPCS 3 (PHPCS), PHPStan 1 + WordPress stubs; GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-06-21-foundation-design.md`. **Branch:** `feat/surpass-wprig`.

**Conventions for this plan:**

- Most Phase 0 tasks are mechanical; their "test" is a verification command with expected output, not a unit test.
- The PHP and matcher tests characterize **existing** code. Write the test, run it, expect **PASS**. A failing characterization test means we found a real bug — stop and fix it before moving on.
- Run all commands from the repo root unless a `working-directory` is shown. Repo root: `/Users/jon.imms/Local Sites/stratawp/strataWP`.
- Commit after every task (frequent commits).

---

## Phase 0 — Focus & Hygiene

### Task 0.1: Delete the dead package shells

**Files:**

- Delete: `packages/ai/`, `packages/registry/`, `packages/studio/`

- [ ] **Step 1: Confirm nothing references them (expect no code/config hits)**

Run:

```bash
grep -rEn "@stratawp/(ai|registry|studio)|packages/(ai|registry|studio)" \
  packages/*/src packages/*/package.json turbo.json pnpm-workspace.yaml tsconfig.json .github 2>/dev/null || echo "NO REFERENCES"
```

Expected: `NO REFERENCES` (docs may reference them; those are handled in Phase 5).

- [ ] **Step 2: Delete the directories**

Run:

```bash
git rm -r packages/ai packages/registry packages/studio 2>/dev/null
rm -rf packages/ai packages/registry packages/studio
ls packages
```

Expected: listing no longer shows `ai`, `registry`, `studio`.

- [ ] **Step 3: Commit**

```bash
git add -A packages
git commit -m "chore: remove dead ai/registry/studio package shells (v2.0 focus cut leftovers)"
```

---

### Task 0.2: Fix the create-stratawp → cli version pin

**Files:**

- Modify: `packages/create-stratawp/package.json:36`

- [ ] **Step 1: Change the dependency to the workspace protocol**

In `packages/create-stratawp/package.json`, change:

```json
  "dependencies": {
    "@stratawp/cli": "^0.5.2"
  }
```

to:

```json
  "dependencies": {
    "@stratawp/cli": "workspace:*"
  }
```

(Changesets rewrites `workspace:*` to the concrete `^<version>` at publish time, so published `create-stratawp` will depend on the current CLI, not 0.5.2.)

- [ ] **Step 2: Commit (lockfile refresh happens in Task 0.5)**

```bash
git add packages/create-stratawp/package.json
git commit -m "fix(create-stratawp): depend on workspace CLI, not stale published ^0.5.2"
```

---

### Task 0.3: Fix the Node 25 native-build break

**Files:**

- Modify: `packages/sync/package.json:42` and `:52`

- [ ] **Step 1: Bump better-sqlite3 and its types**

In `packages/sync/package.json`, change `"better-sqlite3": "^9.4.0"` → `"better-sqlite3": "^12.2.0"` and `"@types/better-sqlite3": "^7.6.8"` → `"@types/better-sqlite3": "^7.6.11"`.

- [ ] **Step 2: Commit**

```bash
git add packages/sync/package.json
git commit -m "fix(sync): bump better-sqlite3 to 12.x for Node 24/25 prebuilds"
```

---

### Task 0.4: Normalize engines and fix placeholder metadata

**Files:**

- Modify: `package.json:35-38`
- Modify: `packages/core/composer.json` (author email)

- [ ] **Step 1: Set a supported Node range at the root**

In root `package.json`, change the `engines` block to:

```json
  "engines": {
    "node": ">=18.18",
    "pnpm": ">=8.0.0"
  },
```

(Floor only — no upper cap. The maintainer's machine runs Node 25 and better-sqlite3 12.x ships Node 24/25 prebuilds, so capping below 25 would needlessly warn on the dev's own install. CI in Task 1.8 verifies the supported range.)

- [ ] **Step 2: Fix the placeholder author email in core**

In `packages/core/composer.json`, change `"email": "jon@example.com"` → `"email": "jon@jonimms.com"`.

- [ ] **Step 3: Commit**

```bash
git add package.json packages/core/composer.json
git commit -m "chore: pin supported Node range and fix core author email"
```

---

### Task 0.5: Refresh and commit the lockfile

**Files:**

- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Reinstall to regenerate the lockfile**

Run:

```bash
pnpm install
```

Expected: completes without a node-gyp/better-sqlite3 failure on the local Node.

- [ ] **Step 2: Verify the dead packages are gone from the lockfile**

Run:

```bash
grep -E "@stratawp/(ai|registry)" pnpm-lock.yaml && echo "STILL PRESENT (bad)" || echo "CLEAN"
```

Expected: `CLEAN`.

- [ ] **Step 3: Commit**

```bash
git add pnpm-lock.yaml
git commit -m "chore: regenerate lockfile (drops transitive ai/registry, updates better-sqlite3)"
```

---

## Phase 1 — Credibility Foundation (JS toolchain)

### Task 1.1: Make ESLint real (replace the phantom lint)

> Refines spec §4.1: a single root flat-config `eslint .` covers every package (simpler and definitively correct vs per-package `eslint src` scripts that resolved to a global ESLint). Per-package turbo-cached lint can be reintroduced later.

**Files:**

- Create: `eslint.config.js`
- Modify: root `package.json` (devDeps + `lint` script)
- Modify: `packages/cli/package.json`, `packages/vite-plugin/package.json`, `packages/testing/package.json` (remove the dead `"lint": "eslint src"` scripts)

- [ ] **Step 1: Install ESLint and the TS plugin (pinned)**

Run:

```bash
pnpm add -w -D eslint@^9.39.0 typescript-eslint@^8.18.0 @eslint/js@^9.39.0
```

- [ ] **Step 2: Create the flat config**

Create `eslint.config.js`:

```js
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/*.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    rules: {
      // The codebase uses `any` pervasively; allow it now, ratchet to error in a later phase.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Frozen package (extracting to a future plugin): do not invest in cleanups here.
    files: ['packages/sync/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  }
)
```

- [ ] **Step 3: Point the root lint script at the flat config and remove dead per-package scripts**

In root `package.json`, change `"lint": "turbo lint"` → `"lint": "eslint ."` and add `"lint:fix": "eslint . --fix"`.
In `packages/cli/package.json`, `packages/vite-plugin/package.json`, `packages/testing/package.json`, delete the `"lint": "eslint src"` line.

- [ ] **Step 4: Run lint and resolve real errors (warnings are OK)**

Run:

```bash
pnpm lint
```

Expected: exits 0. If genuine errors (not warnings) appear, fix them; if a whole frozen-area floods, scope it via an `ignores`/override block in `eslint.config.js` (same pattern as `packages/sync`). Re-run until exit 0.

- [ ] **Step 5: Prove it resolves locally, not from a global ESLint**

Run:

```bash
pnpm -w exec eslint --version
ls node_modules/.bin/eslint
```

Expected: a 9.x version printed and the local `.bin/eslint` symlink exists.

- [ ] **Step 6: Commit**

```bash
git add eslint.config.js package.json packages/*/package.json pnpm-lock.yaml
git commit -m "feat(lint): real ESLint flat config replacing phantom lint scripts"
```

---

### Task 1.2: Wire typecheck into the graph

**Files:**

- Modify: `turbo.json`
- Modify: every TS package's `package.json` (`packages/cli`, `vite-plugin`, `testing`, `explorer`, `headless`, `sync`, `create-stratawp`)
- Modify: root `package.json` (add `typecheck` script)

- [ ] **Step 1: Add a typecheck task to turbo**

In `turbo.json`, add inside `pipeline` (after `lint`):

```json
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
```

- [ ] **Step 2: Add a `typecheck` script to each TS package**

In each of `packages/{cli,vite-plugin,testing,explorer,headless,sync,create-stratawp}/package.json`, add to `scripts`:

```json
    "typecheck": "tsc --noEmit"
```

For `explorer` and `headless`, this **replaces** their existing `"type-check": "tsc --noEmit"` (rename to `typecheck`). If a package has no `tsconfig.json`, create one:

```json
{
  "extends": "../../tsconfig.json",
  "include": ["src"]
}
```

- [ ] **Step 3: Add the root aggregator script**

In root `package.json` scripts, add `"typecheck": "turbo typecheck"`.

- [ ] **Step 4: Run typecheck and fix real type errors**

Run:

```bash
pnpm typecheck
```

Expected: exits 0. Fix any genuine type errors surfaced. (`packages/sync` is frozen but must still compile because `cli` imports it — if it has type errors, fix the minimum needed to compile, no more.)

- [ ] **Step 5: Commit**

```bash
git add turbo.json package.json packages/*/package.json packages/*/tsconfig.json
git commit -m "feat(ci): wire typecheck task across all TS packages"
```

---

### Task 1.3: Enforce formatting

**Files:**

- Modify: root `package.json`

- [ ] **Step 1: Add a check script**

In root `package.json` scripts, add:

```json
    "format:check": "prettier --check \"**/*.{ts,tsx,md,json}\""
```

- [ ] **Step 2: Normalize current formatting once, then verify**

Run:

```bash
pnpm format
pnpm format:check
```

Expected: `format:check` reports "All matched files use Prettier code style!" (exit 0).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ci): add format:check and normalize formatting"
```

---

### Task 1.4: Make tests deterministic and coverage-gated

**Files:**

- Modify: `packages/cli/package.json`, `packages/sync/package.json`, `packages/vite-plugin/package.json`, `packages/testing/package.json` (test scripts)
- Modify: `packages/cli/vitest.config.ts`, `packages/sync/vitest.config.ts`, `packages/vite-plugin/vitest.config.ts` (add coverage)
- Modify: `packages/testing/vitest.config.ts` (scope coverage include)
- Create: `packages/testing/src/matchers/__tests__/matchers.test.ts`

- [ ] **Step 1: Write characterization tests for the testing toolkit's matchers**

Create `packages/testing/src/matchers/__tests__/matchers.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  toHaveBlockClass,
  toHaveBlockAttributes,
  toBeValidBlockMarkup,
  toBeValidWordPressBlock,
} from '../index'

describe('toBeValidBlockMarkup', () => {
  it('passes for valid wp block comment markup', () => {
    const r = toBeValidBlockMarkup('<!-- wp:paragraph --><p>hi</p><!-- /wp:paragraph -->')
    expect(r.pass).toBe(true)
  })

  it('fails when block comments are missing', () => {
    expect(toBeValidBlockMarkup('<p>hi</p>').pass).toBe(false)
  })
})

describe('toHaveBlockClass', () => {
  it('passes when element has the wp-block-<name> class', () => {
    const el = document.createElement('div')
    el.className = 'wp-block-my-hero'
    expect(toHaveBlockClass(el, 'my/hero').pass).toBe(true)
  })

  it('fails when the class is absent', () => {
    const el = document.createElement('div')
    expect(toHaveBlockClass(el, 'my/hero').pass).toBe(false)
  })
})

describe('toHaveBlockAttributes', () => {
  it('passes when all required attributes are present', () => {
    const block = { attributes: { title: {}, color: {} } }
    expect(toHaveBlockAttributes(block, ['title']).pass).toBe(true)
  })

  it('fails when a required attribute is missing', () => {
    const block = { attributes: { title: {} } }
    expect(toHaveBlockAttributes(block, ['missing']).pass).toBe(false)
  })
})

describe('toBeValidWordPressBlock', () => {
  it('passes for an element with data-type and a wp-block class', () => {
    const el = document.createElement('div')
    el.setAttribute('data-type', 'core/paragraph')
    el.className = 'wp-block-paragraph'
    expect(toBeValidWordPressBlock(el).pass).toBe(true)
  })

  it('fails when data-type is missing', () => {
    const el = document.createElement('div')
    el.className = 'wp-block-paragraph'
    expect(toBeValidWordPressBlock(el).pass).toBe(false)
  })
})
```

- [ ] **Step 2: Run the new tests (expect PASS — characterizing existing matchers)**

Run:

```bash
pnpm --filter @stratawp/testing exec vitest run src/matchers
```

Expected: all tests PASS. If any FAIL, a matcher has a real bug — fix the matcher, then re-run.

- [ ] **Step 3: Make every test script deterministic**

In `packages/{cli,sync,vite-plugin,testing}/package.json`, change `"test": "vitest"` → `"test": "vitest run"`, and any `"test:coverage": "vitest --coverage"` → `"test:coverage": "vitest run --coverage"`. Add `"test:coverage": "vitest run --coverage"` where missing (cli, vite-plugin).

- [ ] **Step 4: Scope the testing package's coverage to what is tested (ratchet)**

In `packages/testing/vitest.config.ts`, inside `test.coverage`, add an `include` so the orphaned thresholds gate only the covered area for now:

```ts
      include: ['src/matchers/**'],
```

(Keep the existing `thresholds`. Widen `include` as later phases test mocks/utils.)

- [ ] **Step 5: Add coverage config to the packages that have tests but no thresholds**

In `packages/cli/vitest.config.ts`, replace the file contents with:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/__tests__/**', '**/*.d.ts'],
    },
  },
})
```

Apply the same `coverage` block to `packages/sync/vitest.config.ts` and `packages/vite-plugin/vitest.config.ts` (preserving each file's existing options).

- [ ] **Step 6: Measure coverage, then set ratcheted thresholds**

Run:

```bash
pnpm --filter @stratawp/cli exec vitest run --coverage
```

Read the `% Lines / % Funcs / % Branch / % Stmts` from the summary table. In `packages/cli/vitest.config.ts`, add a `thresholds` block under `coverage` set ~2 points below the measured numbers (rounded), e.g.:

```ts
      thresholds: { lines: 30, functions: 30, branches: 60, statements: 30 },
```

Use the **actual** measured values, not these examples. Repeat for `sync` and `vite-plugin`.

- [ ] **Step 7: Confirm the whole test run is green and deterministic**

Run:

```bash
pnpm test
```

Expected: exits 0, no watch-mode hang. (Packages without tests have no `test` script, so turbo skips them.)

- [ ] **Step 8: Commit**

```bash
git add packages/*/package.json packages/*/vitest.config.ts packages/testing/src/matchers/__tests__/matchers.test.ts
git commit -m "feat(test): deterministic vitest run + ratcheted coverage gates, dogfood testing matchers"
```

---

## Phase 1 — Credibility Foundation (PHP toolchain)

### Task 1.5: Stand up the PHP QA toolchain on core

**Files:**

- Modify: `packages/core/composer.json`
- Create: `packages/core/phpunit.xml`
- Create: `packages/core/phpcs.xml.dist`
- Create: `packages/core/phpstan.neon`
- Create: `packages/core/tests/bootstrap.php`
- Create: `packages/core/.gitignore`
- Create: `packages/core/composer.lock` (generated)

- [ ] **Step 1: Add dev dependencies, config, and scripts to composer.json**

Replace `packages/core/composer.json` with:

```json
{
  "name": "stratawp/core",
  "description": "Core PHP framework for StrataWP themes",
  "type": "library",
  "license": "GPL-3.0-or-later",
  "authors": [
    {
      "name": "Jon Imms",
      "email": "jon@jonimms.com"
    }
  ],
  "require": {
    "php": ">=8.1"
  },
  "require-dev": {
    "phpunit/phpunit": "^10.0",
    "brain/monkey": "^2.6",
    "squizlabs/php_codesniffer": "^3.9",
    "wp-coding-standards/wpcs": "^3.1",
    "phpcompatibility/phpcompatibility-wp": "^2.1",
    "dealerdirect/phpcodesniffer-composer-installer": "^1.0",
    "phpstan/phpstan": "^1.10",
    "php-stubs/wordpress-stubs": "^6.5"
  },
  "autoload": {
    "psr-4": {
      "StrataWP\\": "src/"
    }
  },
  "autoload-dev": {
    "psr-4": {
      "StrataWP\\Tests\\": "tests/"
    }
  },
  "config": {
    "allow-plugins": {
      "dealerdirect/phpcodesniffer-composer-installer": true
    }
  },
  "scripts": {
    "test": "phpunit",
    "phpcs": "phpcs",
    "phpcbf": "phpcbf",
    "phpstan": "phpstan analyse"
  }
}
```

- [ ] **Step 2: Create the PHPUnit config**

Create `packages/core/phpunit.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="vendor/phpunit/phpunit/phpunit.xsd"
         bootstrap="tests/bootstrap.php"
         colors="true"
         cacheDirectory=".phpunit.cache"
         failOnWarning="true">
  <testsuites>
    <testsuite name="unit">
      <directory>tests/Unit</directory>
    </testsuite>
  </testsuites>
  <source>
    <include>
      <directory>src</directory>
    </include>
  </source>
</phpunit>
```

- [ ] **Step 3: Create the test bootstrap (defines WP constants used in class bodies)**

Create `packages/core/tests/bootstrap.php`:

```php
<?php
/**
 * PHPUnit bootstrap for StrataWP core unit tests.
 *
 * Defines the WordPress time constants that component classes reference in
 * property defaults (e.g. Updates::$cache_ttl = 6 * HOUR_IN_SECONDS), then
 * loads Composer's autoloader. WordPress functions themselves are mocked
 * per-test via Brain Monkey.
 */

declare(strict_types=1);

if (!defined('MINUTE_IN_SECONDS')) {
    define('MINUTE_IN_SECONDS', 60);
}
if (!defined('HOUR_IN_SECONDS')) {
    define('HOUR_IN_SECONDS', 60 * MINUTE_IN_SECONDS);
}
if (!defined('DAY_IN_SECONDS')) {
    define('DAY_IN_SECONDS', 24 * HOUR_IN_SECONDS);
}

require_once dirname(__DIR__) . '/vendor/autoload.php';
```

- [ ] **Step 4: Create the PHPCS ruleset**

Create `packages/core/phpcs.xml.dist`:

```xml
<?xml version="1.0"?>
<ruleset name="StrataWP Core">
  <description>WordPress coding standards for StrataWP core.</description>

  <file>src</file>

  <arg name="extensions" value="php"/>
  <arg name="colors"/>
  <arg value="sp"/>

  <config name="testVersion" value="8.1-"/>
  <config name="minimum_wp_version" value="6.5"/>

  <rule ref="WordPress-Core"/>
  <rule ref="WordPress-Docs"/>
  <rule ref="PHPCompatibilityWP"/>

  <rule ref="WordPress.WP.I18n">
    <properties>
      <property name="text_domain" type="array">
        <element value="stratawp"/>
      </property>
    </properties>
  </rule>
</ruleset>
```

- [ ] **Step 5: Create the PHPStan config**

Create `packages/core/phpstan.neon`:

```neon
parameters:
  level: 5
  paths:
    - src
  bootstrapFiles:
    - vendor/php-stubs/wordpress-stubs/wordpress-stubs.php
  treatPhpDocTypesAsCertain: false
```

- [ ] **Step 6: Add a .gitignore for PHP build artifacts**

Create `packages/core/.gitignore`:

```
/vendor/
/.phpunit.cache/
.phpunit.result.cache
/phpcs.xml
/phpstan-baseline.neon
```

- [ ] **Step 7: Install the PHP toolchain (generates composer.lock + vendor)**

Run:

```bash
cd packages/core && composer install
```

Expected: installs phpunit, brain/monkey, phpcs + WPCS standards, phpstan, wordpress-stubs; `vendor/bin/{phpunit,phpcs,phpstan}` exist; `composer.lock` is created.

- [ ] **Step 8: Confirm PHPCS sees the WordPress standard**

Run:

```bash
cd packages/core && vendor/bin/phpcs -i
```

Expected: the installed standards list includes `WordPress`, `WordPress-Core`, `WordPress-Docs`, `PHPCompatibilityWP`.

- [ ] **Step 9: Commit the toolchain (tests come next task)**

```bash
git add packages/core/composer.json packages/core/composer.lock packages/core/phpunit.xml packages/core/phpcs.xml.dist packages/core/phpstan.neon packages/core/tests/bootstrap.php packages/core/.gitignore
git commit -m "feat(core): stand up PHP QA toolchain (PHPUnit/Brain Monkey, WPCS, PHPStan)"
```

---

### Task 1.6: Write the first PHP unit tests

**Files:**

- Create: `packages/core/tests/Unit/SetupTest.php`
- Create: `packages/core/tests/Unit/UpdatesTest.php`

- [ ] **Step 1: Write the Setup component tests**

Create `packages/core/tests/Unit/SetupTest.php`:

```php
<?php

declare(strict_types=1);

namespace StrataWP\Tests\Unit;

use Brain\Monkey;
use Brain\Monkey\Actions;
use PHPUnit\Framework\TestCase;
use StrataWP\Components\Setup;

final class SetupTest extends TestCase {

    protected function setUp(): void {
        parent::setUp();
        Monkey\setUp();
    }

    protected function tearDown(): void {
        Monkey\tearDown();
        parent::tearDown();
    }

    public function test_get_slug_returns_setup(): void {
        $this->assertSame('setup', (new Setup())->get_slug());
    }

    public function test_initialize_registers_after_setup_theme_actions(): void {
        Actions\expectAdded('after_setup_theme')->twice();

        (new Setup())->initialize();
    }
}
```

- [ ] **Step 2: Run the Setup tests (expect PASS)**

Run:

```bash
cd packages/core && vendor/bin/phpunit --filter SetupTest
```

Expected: 2 passing tests. If `initialize` does not register exactly two `after_setup_theme` hooks, the assertion fails — reconcile against `src/Components/Setup.php`.

- [ ] **Step 3: Write the Updates component tests (slug, hook registration, zip-asset resolution)**

Create `packages/core/tests/Unit/UpdatesTest.php`:

```php
<?php

declare(strict_types=1);

namespace StrataWP\Tests\Unit;

use Brain\Monkey;
use Brain\Monkey\Actions;
use Brain\Monkey\Filters;
use PHPUnit\Framework\TestCase;
use StrataWP\Components\Updates;

/**
 * Exposes the protected zip-asset resolver for unit testing.
 */
final class ExposedUpdates extends Updates {
    public function callFindZipAsset(array $assets): ?string {
        return $this->find_zip_asset($assets);
    }
}

final class UpdatesTest extends TestCase {

    protected function setUp(): void {
        parent::setUp();
        Monkey\setUp();
    }

    protected function tearDown(): void {
        Monkey\tearDown();
        parent::tearDown();
    }

    public function test_get_slug_returns_updates(): void {
        $this->assertSame('updates', (new Updates('owner/repo'))->get_slug());
    }

    public function test_initialize_with_empty_repository_registers_no_hooks(): void {
        Filters\expectAdded('pre_set_site_transient_update_themes')->never();
        Actions\expectAdded('admin_notices')->never();

        (new Updates(''))->initialize();
    }

    public function test_initialize_registers_update_hooks_when_repo_set(): void {
        Filters\expectAdded('pre_set_site_transient_update_themes')->once();
        Filters\expectAdded('themes_api')->once();
        Actions\expectAdded('admin_notices')->once();
        Filters\expectAdded('upgrader_pre_download')->once();

        (new Updates('owner/repo'))->initialize();
    }

    public function test_find_zip_asset_prefers_configured_asset_name(): void {
        $updates = new ExposedUpdates('owner/repo', 'my-theme.zip');
        $assets = [
            ['name' => 'other.zip', 'url' => 'https://api/other'],
            ['name' => 'my-theme.zip', 'url' => 'https://api/wanted'],
        ];
        $this->assertSame('https://api/wanted', $updates->callFindZipAsset($assets));
    }

    public function test_find_zip_asset_falls_back_to_any_zip(): void {
        $updates = new ExposedUpdates('owner/repo');
        $assets = [
            ['name' => 'notes.txt', 'url' => 'https://api/txt'],
            ['name' => 'build.zip', 'url' => 'https://api/zip'],
        ];
        $this->assertSame('https://api/zip', $updates->callFindZipAsset($assets));
    }

    public function test_find_zip_asset_returns_null_when_no_zip_present(): void {
        $updates = new ExposedUpdates('owner/repo');
        $assets = [['name' => 'notes.txt', 'url' => 'https://api/txt']];
        $this->assertNull($updates->callFindZipAsset($assets));
    }

    public function test_find_zip_asset_returns_null_for_empty_assets(): void {
        $updates = new ExposedUpdates('owner/repo');
        $this->assertNull($updates->callFindZipAsset([]));
    }
}
```

- [ ] **Step 4: Run the Updates tests (expect PASS)**

Run:

```bash
cd packages/core && vendor/bin/phpunit --filter UpdatesTest
```

Expected: all tests PASS. A failure here is a real behavior bug in `Updates.php` — fix the source, then re-run.

- [ ] **Step 5: Run the whole PHP suite**

Run:

```bash
cd packages/core && composer test
```

Expected: green, no warnings (config has `failOnWarning="true"`).

- [ ] **Step 6: Commit**

```bash
git add packages/core/tests/Unit
git commit -m "test(core): unit tests for Setup and Updates components (Brain Monkey)"
```

---

### Task 1.7: Baseline PHPCS and PHPStan (ratchet, don't block)

**Files:**

- Create (generated): `packages/core/phpcs.xml.dist` baseline handling, `packages/core/phpstan-baseline.neon`

- [ ] **Step 1: Run PHPCS and triage**

Run:

```bash
cd packages/core && composer phpcs -- --report=summary
```

Note the violation count per file. Auto-fix the mechanical ones:

```bash
cd packages/core && composer phpcbf || true
cd packages/core && composer phpcs -- --report=summary
```

- [ ] **Step 2: Baseline the remaining PHPCS violations so CI starts green**

Run:

```bash
cd packages/core && vendor/bin/phpcs --report=summary || true
```

If meaningful violations remain that aren't quick wins, add a baseline by generating an ignore file and referencing it, OR (simplest) set a non-fatal warning threshold by adding to `phpcs.xml.dist` (only if needed):

```xml
  <!-- Temporary: allow existing debt; ratchet down each phase -->
  <rule ref="WordPress.Files.FileName"><severity>0</severity></rule>
```

Goal: `composer phpcs` exits 0. Document any suppressed rule inline with a "ratchet" comment.

- [ ] **Step 3: Run PHPStan and create a baseline**

Run:

```bash
cd packages/core && vendor/bin/phpstan analyse --generate-baseline phpstan-baseline.neon
```

Then add the baseline include to `packages/core/phpstan.neon`:

```neon
includes:
  - phpstan-baseline.neon
```

Re-run to confirm green:

```bash
cd packages/core && composer phpstan
```

Expected: `[OK] No errors`.

- [ ] **Step 4: Commit**

```bash
git add packages/core/phpcs.xml.dist packages/core/phpstan.neon packages/core/phpstan-baseline.neon src 2>/dev/null
git add -A packages/core
git commit -m "chore(core): baseline PHPCS/PHPStan debt (green now, ratchet later)"
```

---

## Phase 1 — CI gate

### Task 1.8: Add the push/PR CI workflow

**Files:**

- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  js:
    name: JS (Node ${{ matrix.node }})
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node: ['18', '20', '22', '24']
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm format:check
      - run: pnpm test

  php:
    name: PHP ${{ matrix.php }}
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        php: ['8.1', '8.2', '8.3', '8.4']
    defaults:
      run:
        working-directory: packages/core
    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: ${{ matrix.php }}
          tools: composer:v2
          coverage: none

      - name: Install Composer dependencies
        run: composer install --no-interaction --no-progress

      - name: PHPCS
        run: composer phpcs

      - name: PHPStan
        run: composer phpstan

      - name: PHPUnit
        run: composer test
```

(pnpm version is read from the root `packageManager` field, so no explicit `version:` is needed.)

- [ ] **Step 2: Validate the YAML locally**

Run:

```bash
python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml')); print('YAML OK')"
```

Expected: `YAML OK`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: gate push/PR on build, typecheck, lint, format, JS tests, and PHP QA matrix"
```

---

### Task 1.9: Prove the gate and push

- [ ] **Step 1: Run the full gate locally exactly as CI will**

Run:

```bash
pnpm install --frozen-lockfile && pnpm build && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
( cd packages/core && composer install --no-interaction && composer phpcs && composer phpstan && composer test )
```

Expected: every command exits 0.

- [ ] **Step 2: Push the branch and open a PR**

Run:

```bash
git push -u origin feat/surpass-wprig
gh pr create --fill --title "Foundation: focus cleanup + enforced CI/quality gates" --base main
```

Expected: PR created; the `CI` workflow starts.

- [ ] **Step 3: Watch CI to green**

Run:

```bash
gh pr checks --watch
```

Expected: both `js` and `php` matrix jobs pass.

- [ ] **Step 4: Sanity-check the gate actually gates (optional but recommended)**

On a throwaway commit, introduce a deliberate type error, push, confirm CI fails, then revert:

```bash
git revert --no-edit HEAD   # after confirming the red check
```

- [ ] **Step 5: Enable branch protection (manual, one-time)**

In GitHub repo settings → Branches → add a rule for `main` requiring the `CI` checks to pass before merge. (This is a UI/settings step, not code.)

---

## Self-Review

**Spec coverage** — every spec requirement maps to a task:

- §3.1 delete shells → Task 0.1 · §3.2 cli pin → 0.2 · §3.3 Node 25 → 0.3 · §3.4 lockfile → 0.5 · §3.5 engines/email → 0.4
- §4.1 ESLint → 1.1 · §4.2 typecheck → 1.2 · §4.3 format:check → 1.3 · §4.4 tests/coverage → 1.4
- §4.5 PHP QA (PHPUnit/Brain Monkey, WPCS, PHPStan, composer.lock, priority tests) → 1.5, 1.6, 1.7
- §4.6 CI push/PR + PHP matrix → 1.8, 1.9
- §6 acceptance ("green board") → Task 1.9 Step 1

**Known deferrals (intentional, not gaps):**

- Fonts.php tests (spec §4.5 lists them after Updates) — deferred to a follow-up; this plan seeds the harness with the highest-risk-yet-cleanly-unit-testable surface (Updates + Setup). Add Fonts/Assets/Performance tests next, ratcheting coverage.
- Node 24/25 in the CI matrix — added after Task 0.3 is confirmed working; engines cap stays at `<=24` until then.

**Placeholder scan:** coverage threshold numbers in Task 1.4 Step 6 are explicitly "use measured values"; PHPCS/PHPStan baselines are generated artifacts. No TODO/TBD left.

**Type/name consistency:** `typecheck` (not `type-check`) used everywhere; `find_zip_asset`/`callFindZipAsset`, `get_slug`, `initialize` match `Updates.php`/`Setup.php`; `composer test`/`phpcs`/`phpstan` script names match `composer.json`.
