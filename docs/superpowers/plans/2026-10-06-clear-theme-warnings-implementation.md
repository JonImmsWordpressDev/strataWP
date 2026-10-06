# Clear Theme Warnings, Refresh Docs, Update jonimms-theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `pnpm review` to zero errors and zero warnings on all six StrataWP themes (3 examples, 3 CLI templates), make every README and guide match what the framework now does, and put the new tooling on the jonimms.com theme locally.

**Architecture:** Four repo workstreams on one branch (screenshots and `readme.txt`; example namespace/text-domain cleanup; the advanced theme's custom post types moved into a companion plugin that the scaffolder can install; docs), then a separate workstream in the jonimms.com repo. The checker's rules stay as they are: findings are fixed in the themes, never silenced with `review.rules` or `review.ignore` overrides.

**Tech Stack:** PHP (WPCS), WordPress block themes, TypeScript/Vitest, sharp (already a monorepo dependency), pnpm + Turborepo, commander, prompts.

**Spec:** This plan is the spec; decisions come from the maintainer's answers on 2026-10-06 and the measurements below.

## Measured state (2026-10-06, `pnpm review`)

| Theme | Warnings | Rules |
| --- | --- | --- |
| `examples/basic-theme`, `templates/basic-theme`, `templates/store-theme` | 2 each | THEME-003 (1536x1024 screenshot), THEME-005 (no `readme.txt`) |
| `templates/advanced-theme` | 11 | 003, 005, THEME-010 x9 |
| `examples/store-theme` | 95 | 003, 005, THEME-007 x50, THEME-008 x43 |
| `examples/advanced-theme` | 104 | 003, 005, 007 x50, 008 x43, 010 x9 |

Root causes: the store and advanced examples were copied from the basic theme and still use the basic theme's `strata-basic/` pattern namespace, `StrataBasic` PHP namespace and a leftover `frost` text domain; the CLI templates for store and advanced already use their own tokens. The advanced theme registers four custom post types (`portfolio`, `team`, `testimonial`, `case_study`) and their taxonomies in `inc/Components/CustomPostTypes.php`, which the guidelines reserve for plugins.

## Global Constraints

- pnpm only. Stage by explicit path, never `git add -A` or `git add .`.
- No attribution in commits or PR text: no `Co-Authored-By`, no "Generated with Claude Code".
- No external starter theme named anywhere in code, comments, docs, commits or branch names.
- Never silence a finding with `review.rules` or `review.ignore` in an example or template `package.json`. Fix the theme.
- Keep the six theme locations green on everything that is green today: `pnpm lint:php` (WPCS), `pnpm lint:css`, `pnpm build`, `pnpm test`, `pnpm review` (errors stay 0), `pnpm contracts:check`, the cli suite including `templates-consistency` and `quality-gates-scaffold`.
- Template agent files (`AGENTS.md`, `.ai/**`, `.aiignore`) stay byte-identical across the three templates; template changes that also exist in the example theme must be mirrored.
- Prettier covers json/ts/md/yml; run `pnpm exec prettier --check` on every touched file of those types.
- The jonimms.com theme is a separate repo (`JonImmsWordpressDev/jonimms.com`, git root `~/Local Sites/jonimms/app/public`). Work there only from the theme directory; nothing is pushed or deployed without the maintainer's explicit go-ahead. Never deploy from the monorepo.
- npm releases, tags and production deploys are irreversible and are NOT part of this plan.

## Review Focus

1. **Pattern slug renames must stay consistent everywhere.** A pattern's `Slug:` header is referenced by `<!-- wp:pattern {"slug":"..."} -->` in templates, parts and other patterns; renaming one side only produces silently empty template regions. After the rename, no `"slug":"strata-basic/` may remain in the advanced or store themes, and every referenced slug must exist as a `Slug:` header.
2. **Do not touch custom block names.** Blocks such as `strata-basic/portfolio-grid` in `block.json` and `blocks-generated.php` are block names, not pattern slugs; renaming them changes saved post content. Decide per theme whether blocks keep their registered names (preferred: rename in step with the pattern namespace only if the templates' own blocks already use the new name; otherwise leave and say so).
3. **Text-domain changes must not alter output.** Changing `'frost'` to the theme's domain only changes which translation file is looked up; verify no string is changed and that phpcs's text-domain sniff still passes.
4. **Removing CPTs from the theme must not fatal.** `MetaBoxes`, `AdvancedLayouts`, the `portfolio-grid` and `team-members` block `render.php` files and any template reference `portfolio`/`team`/`testimonial`/`case_study`. With the plugin absent they must render nothing (not error); with the plugin active behavior must equal today's.
5. **The scaffolder must never write into a WordPress plugins directory without asking** and must do nothing when no WordPress install was linked.

---

### Task 1: 1200x900 screenshots and `readme.txt` for all six themes (THEME-003, THEME-005)

**Files:**
- Modify (binary): `screenshot.png` in `examples/{basic,advanced,store}-theme/` and `packages/cli/templates/{basic,advanced,store}-theme/`
- Create: `readme.txt` in each of the same six directories
- Create: `packages/cli/src/theme-metadata.test.ts`

**Interfaces:** none consumed or produced.

- [ ] **Step 1: Write the failing test**

Create `packages/cli/src/theme-metadata.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const THEMES = [
  'examples/basic-theme',
  'examples/advanced-theme',
  'examples/store-theme',
  'packages/cli/templates/basic-theme',
  'packages/cli/templates/advanced-theme',
  'packages/cli/templates/store-theme',
]

function pngSize(file: string): { width: number; height: number } {
  const buf = fs.readFileSync(file)
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

describe.each(THEMES)('%s metadata', (theme) => {
  it('ships a 1200x900 screenshot.png', () => {
    expect(pngSize(path.join(root, theme, 'screenshot.png'))).toEqual({ width: 1200, height: 900 })
  })

  it('ships a readme.txt with the WordPress.org theme headers, matching style.css', () => {
    const readme = fs.readFileSync(path.join(root, theme, 'readme.txt'), 'utf8')
    const style = fs.readFileSync(path.join(root, theme, 'style.css'), 'utf8')
    const header = (name: string) =>
      style.match(new RegExp(`^\\s*${escapeRegExp(name)}:\\s*(.+)$`, 'mi'))?.[1]?.trim()
    expect(readme).toMatch(/^=== .+ ===/m)
    for (const field of ['Requires at least', 'Tested up to', 'Requires PHP', 'License', 'License URI']) {
      const value = header(field)
      expect(value, `${theme} style.css is missing ${field}`).toBeTruthy()
      expect(readme).toMatch(new RegExp(`^${escapeRegExp(field)}: ${escapeRegExp(value as string)}$`, 'm'))
    }
    expect(readme).toMatch(/^== Description ==/m)
    expect(readme).toMatch(/^== Changelog ==/m)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @stratawp/cli exec vitest run src/theme-metadata.test.ts`
Expected: FAIL (screenshots are 1536x1024; `readme.txt` missing).

- [ ] **Step 3: Resize the screenshots**

Use sharp from the monorepo (it is already a dependency of `@stratawp/vite-plugin`; resolve it from there, for example `node --input-type=module -e` run from `packages/vite-plugin`). For each of the six `screenshot.png` files: crop the 1536x1024 source to a 4:3 box (1365x1024, centered horizontally), resize to exactly 1200x900, and write it back as an optimized PNG. Keep each file under 300 KB. Open two of the results to confirm they are not distorted or blank.

- [ ] **Step 4: Write the six `readme.txt` files**

Each follows the WordPress.org theme readme format; read `style.css` in the same directory for the exact header values, which must match:

```
=== <Theme Name> ===
Contributors: <wordpress.org username from the style.css Author, lowercased, no spaces>
Requires at least: <from style.css>
Tested up to: <from style.css>
Requires PHP: <from style.css>
License: <from style.css>
License URI: <from style.css>
Tags: full-site-editing, block-patterns, custom-colors, editor-style, wide-blocks   (accurate per theme; the store theme adds e-commerce)

<one-line short description from style.css>

== Description ==

<2-3 sentences describing what the theme is for; the advanced theme mentions the companion plugin (Task 3); the store theme mentions WooCommerce>

== Installation ==

1. In your WordPress admin, go to Appearance > Themes and click Add New.
2. Click Upload Theme and choose the theme zip file.
3. Click Install Now, then Activate.

== Changelog ==

= 1.0.0 =
* Initial release.

== Copyright ==

<Theme Name> is distributed under the terms of the GNU GPL v3 or later.

== Resources ==

<only fonts, images or libraries the theme actually ships; check theme.json fontFace entries, assets/ and src/ first; omit the section if there are none>
```

Do not invent resources.

- [ ] **Step 5: Run tests and the review**

Run: `pnpm --filter @stratawp/cli exec vitest run src/theme-metadata.test.ts` (expected PASS), then `pnpm build && pnpm review`. Expected: THEME-003 and THEME-005 are gone on all six themes; remaining warnings are only those that Tasks 2 and 3 clear.

- [ ] **Step 6: Format and commit**

```bash
pnpm exec prettier --check packages/cli/src/theme-metadata.test.ts
git add examples/basic-theme/screenshot.png examples/basic-theme/readme.txt examples/advanced-theme/screenshot.png examples/advanced-theme/readme.txt examples/store-theme/screenshot.png examples/store-theme/readme.txt packages/cli/templates/basic-theme/screenshot.png packages/cli/templates/basic-theme/readme.txt packages/cli/templates/advanced-theme/screenshot.png packages/cli/templates/advanced-theme/readme.txt packages/cli/templates/store-theme/screenshot.png packages/cli/templates/store-theme/readme.txt packages/cli/src/theme-metadata.test.ts
git commit -m "fix(themes): ship 1200x900 screenshots and a readme.txt in every example and template"
```

---

### Task 2: Namespace, pattern-slug and text-domain cleanup in the advanced and store examples (THEME-007, THEME-008)

**Files:**
- Modify: files under `examples/advanced-theme/` and `examples/store-theme/` that contain `strata-basic`, `StrataBasic`, `strata_basic` or `'frost'` (patterns, templates, parts, `functions.php`, `inc/`, `src/`, `theme.json`, `README.md`)
- Create: `packages/cli/src/examples-consistency.test.ts`

**Interfaces:** none consumed or produced.

- [ ] **Step 1: Write the failing test**

Create `packages/cli/src/examples-consistency.test.ts` that, for `examples/advanced-theme` (token `strata-advanced`) and `examples/store-theme` (token `strata-store`), walks the same text-file extensions and skip-directories as `templates-consistency.test.ts` (import `SKIP_DIRS` from `./utils/theme-tokens.js`) and asserts:
- no text file contains the basic theme's token in any of its three casings: `strata-basic`, `strata_basic`, `StrataBasic`;
- no PHP file passes `'frost'` as a text domain (regex `/,\s*'frost'\s*\)/`);
- every `<!-- wp:pattern {"slug":"X"} -->` in `templates/`, `parts/` and `patterns/` refers to an `X` that exists as a ` * Slug: X` header in `patterns/`.

Mirror the shape and helpers of `templates-consistency.test.ts`.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @stratawp/cli exec vitest run src/examples-consistency.test.ts`
Expected: FAIL with many hits for each example.

- [ ] **Step 3: Rename tokens, using the CLI template as the reference**

For each of the two examples, diff against `packages/cli/templates/<same>-theme` (already correct): `diff -rq examples/<x>-theme packages/cli/templates/<x>-theme -x node_modules -x dist -x vendor -x .turbo -x .DS_Store`. Apply the same renames the template has: `strata-basic` to the theme's token in pattern `Slug:` headers, `wp:pattern` references, text domains and CSS class prefixes; `strata_basic` to `strata_advanced` / `strata_store` in PHP prefixes; `StrataBasic` to `StrataAdvanced` / `StrataStore` in PHP namespaces and `use` statements; the `'frost'` text domain to the theme's text domain in `__()`, `_e()`, `esc_html__()` and friends.

Rules (see Review Focus 1-3):
- Rename pattern slugs and every reference in one pass; re-run the test after.
- Leave registered block names (`block.json` `name`, `blocks-generated.php`) alone unless the template already uses the new name; if it does, mirror it and update any post-content strings in patterns.
- Do not change user-visible strings.
- Regenerate or hand-edit `inc/blocks-generated.php` only if its content derives from block names that changed.

- [ ] **Step 4: Verify**

Run: `pnpm --filter @stratawp/cli exec vitest run src/examples-consistency.test.ts src/templates-consistency.test.ts`, `pnpm build`, `pnpm lint:php`, `pnpm lint:css`, `pnpm review`. Expected: tests pass; phpcs stays green on both examples; no THEME-007 or THEME-008 on any theme.

- [ ] **Step 5: Format and commit**

Stage the changed files by explicit path (a rename pass touches many files; build the list from `git diff --name-only` and `git add` each path), then:

```bash
git commit -m "fix(examples): give the advanced and store examples their own namespace, pattern slugs and text domain"
```

---

### Task 3: Move the advanced theme's custom post types into a companion plugin (THEME-010)

**Files:**
- Create: `plugins/strata-advanced-content/strata-advanced-content.php`, `plugins/strata-advanced-content/readme.txt`, `plugins/strata-advanced-content/README.md`, `plugins/strata-advanced-content/phpcs.xml.dist`
- Create: `packages/cli/templates/plugins/strata-advanced-content/` (bundled copy for the scaffolder, byte-identical to the one above)
- Delete: `examples/advanced-theme/inc/Components/CustomPostTypes.php`, `packages/cli/templates/advanced-theme/inc/Components/CustomPostTypes.php`
- Modify: both advanced `functions.php` files, both advanced `README.md` and `readme.txt`, `scripts/lint-php.mjs`, `packages/cli/package.json` (if the bundled plugin is not already covered by `files`), `packages/cli/src/create.ts`, `.github/workflows/ci.yml` only if the php job needs the new path
- Create: `packages/cli/src/companion-plugin.test.ts` and, if cleaner, `packages/cli/src/utils/companion-plugin.ts`

**Interfaces:**
- Consumes: the CPT definitions in `CustomPostTypes.php` (portfolio, team, testimonial, case_study and their taxonomies).
- Produces: a plugin registering the same post types and taxonomies with the same labels, rewrite slugs, `supports`, `show_in_rest` and menu icons; `installCompanionPlugin(options: { wpRoot?: string; templateName: string; confirm: () => Promise<boolean>; copy?: (from: string, to: string) => Promise<void>; bundledDir?: string }): Promise<{ installed: boolean; message: string }>`.

- [ ] **Step 1: Read the existing component and its dependents**

Read `examples/advanced-theme/inc/Components/CustomPostTypes.php` in full and record every `register_post_type` / `register_taxonomy` argument set. Then grep `MetaBoxes.php`, `AdvancedLayouts.php`, `src/blocks/portfolio-grid/render.php`, `src/blocks/team-members/render.php`, templates and patterns for the post-type and taxonomy names (Review Focus 4).

- [ ] **Step 2: Write the failing tests**

Create `packages/cli/src/companion-plugin.test.ts` asserting:
- `plugins/strata-advanced-content/strata-advanced-content.php` exists, has the plugin header (`Plugin Name`, `Description`, `Version`, `License`, `Text Domain: strata-advanced-content`) and registers `portfolio`, `team`, `testimonial` and `case_study`;
- no advanced example or template PHP file contains `register_post_type`, `register_taxonomy` or `CustomPostTypes`;
- `packages/cli/templates/plugins/strata-advanced-content/` is byte-identical to `plugins/strata-advanced-content/` (every file);
- `installCompanionPlugin` copies the bundled plugin to `<wpRoot>/wp-content/plugins/strata-advanced-content` only when `templateName` is `advanced-theme` and `confirm` resolves true; does nothing when `wpRoot` is undefined or `confirm` resolves false; and refuses to overwrite an existing plugin directory (returns `installed: false` with a message). Use temp dirs and injected `confirm`/`copy`; no prompts in tests.

- [ ] **Step 3: Run to verify failure**, then implement

Run: `pnpm --filter @stratawp/cli exec vitest run src/companion-plugin.test.ts` (FAIL). Then:

1. Create the plugin: one main file with the standard header, a `strata_advanced_content_` function prefix (WPCS prefix rules), registration on `init` moved verbatim (text domain `strata-advanced-content`), an activation hook that registers then calls `flush_rewrite_rules()`, a deactivation hook that flushes. Add `readme.txt` (plugin format), a short `README.md` and a `phpcs.xml.dist` adapted from the advanced theme's (prefixes and text domain changed).
2. Delete `CustomPostTypes.php` from both themes and remove its `use` and instantiation from both `functions.php` files. Make `MetaBoxes`, `AdvancedLayouts` and the two block `render.php` files degrade safely when the post types do not exist (`post_type_exists()` guard or empty queries). Add a short note to each advanced `README.md` and `readme.txt`: the portfolio, team, testimonial and case-study content types come from the companion plugin.
3. Copy the plugin to `packages/cli/templates/plugins/strata-advanced-content/` and confirm the CLI package ships it (`packages/cli/package.json` `files`, `sync-template-vendor.mjs`, `.npmignore`/`.aiignore` interactions).
4. Add `plugins/strata-advanced-content` to `LOCATIONS` in `scripts/lint-php.mjs` and fix phpcs findings.
5. Implement `installCompanionPlugin` and call it from `create.ts` after the WordPress link step, only for the advanced template: when a WordPress install was linked, ask "Install the companion plugin (portfolio, team, testimonial and case-study content types) into this WordPress site?" (default yes); on yes copy the bundled plugin; otherwise print the manual copy instruction. Never write anything when no install was linked.

- [ ] **Step 4: Verify**

Run: `pnpm --filter @stratawp/cli test`, `pnpm build`, `pnpm lint:php`, `pnpm review`. Expected: all pass; no THEME-010 on any theme; the plugin directory is not part of any reviewed theme.

- [ ] **Step 5: Format and commit**

Stage the explicit paths (plugin files, bundled copy, deleted components, both `functions.php`, READMEs and readmes, `lint-php.mjs`, `create.ts`, helper, test), then:

```bash
git commit -m "feat(advanced): move the custom post types into a companion plugin the scaffolder can install"
```

---

### Task 4: Docs and instructions up to date

**Files:**
- Modify: `README.md`, `GETTING_STARTED.md`, `CHEAT_SHEET.md`, `CLAUDE.md`, `docs/ai-tooling.md`, `docs/quality-gates.md` (if it states warning counts or per-theme status), the advanced and store example/template `README.md` files, `.ai/skills/theme-review/SKILL.md` (it mentions known warnings), `ROADMAP.md` (only if it lists items now done)
- Create: `.changeset/clear-theme-warnings.md`
- Check: the GitHub wiki (a separate git repo, `JonImmsWordpressDev/strataWP.wiki.git`); if it can be cloned, update stale pages (CLI Reference, Installation & Quick Start, Example Themes, Testing & Quality, AI/Agent Skills/MCP) in a scratch clone and report the diff for the maintainer instead of pushing.

**Interfaces:** none.

- [ ] **Step 1: Audit every doc for staleness**

For each file, grep for: warning counts ("104", "216", "THEME-00"), `strata-basic` outside the basic theme, pattern counts, CPT statements for the advanced theme, `frost`, any hardcoded version, the package list (must include `@stratawp/theme-review` and `@stratawp/stylelint-config`), command lists (must include `theme:review`, `screenshots`, `pnpm review`, `pnpm test:visual`, `pnpm test:smoke`, `pnpm lint:css`, `pnpm test:e2e`), the MCP tool list (`review_theme`, `detect_theme_type`, `capture_screenshots`), Node, PHP and WordPress minimums against `package.json` `engines` and the themes' `style.css`, and the `.ai` skills table. Fix everything that disagrees with the code. Verify every command you document by running it or by reading its definition.

- [ ] **Step 2: Update the guides**

- `GETTING_STARTED.md`: add the quality and screenshot steps (mirror the README's "Using StrataWP day to day" section so the two do not contradict each other), the companion-plugin step for the advanced template, and screenshot/`readme.txt` guidance (1200x900, why).
- `CHEAT_SHEET.md`: add the missing commands and flags (`stratawp theme:review [dir] --json --strict --type`, `stratawp screenshots --routes --widths --out --base-url`, `pnpm exec stratawp-screenshots capture`, `pnpm review`, `pnpm test:visual`, the Visual workflow modes).
- Example READMEs: state the review status (0 errors, 0 warnings), the companion plugin for advanced, and the 1200x900 screenshot.

- [ ] **Step 3: Changeset**

Create `.changeset/clear-theme-warnings.md` with `@stratawp/cli` minor and `create-stratawp` minor (a fixed group) and the body: "Generated themes ship a 1200x900 screenshot and a readme.txt; the advanced template's custom post types move into a companion plugin that create-stratawp offers to install; example themes use their own namespace and text domain."

- [ ] **Step 4: Verify and commit**

Run `pnpm exec prettier --check` on every changed file, `pnpm exec changeset status`, and the repo-wide external-name check from your shell only (the rule says no file may spell the external project's name; the maintainer's memory has it). Commit:

```bash
git add README.md GETTING_STARTED.md CHEAT_SHEET.md CLAUDE.md docs/ai-tooling.md .changeset/clear-theme-warnings.md <other touched docs by explicit path>
git commit -m "docs: bring the README and guides in line with the current tooling and example status"
```

---

### Task 5: Update the jonimms.com theme (separate repo, local only)

**Files:** in `~/Local Sites/jonimms/app/public/wp-content/themes/jonimms-theme/` (git root `~/Local Sites/jonimms/app/public`): `package.json`, `pnpm-lock.yaml`, `scripts/`, `AGENTS.md`, `.ai/**`, `.aiignore`, `playwright.visual.config.ts`, `e2e/visual/`, and theme files that the review flags and that are safe to change.

**Interfaces:** consumes the published `@stratawp/theme-review@0.1.0` and `@stratawp/testing@0.3.0`.

- [ ] **Step 1: Start from a clean, understood state**

`git status` in the jonimms.com repo shows unrelated modified and untracked files at the repo root (`.gitignore`, a deleted `blog-rendered.html`, `docs/plans/*`). Do not touch or stage any of them. Create a branch `chore/stratawp-tooling` from the current branch, stage by explicit path only, and confirm afterwards that the branch diff against its base contains only theme-directory files.

- [ ] **Step 2: Adopt the tooling**

- `package.json`: add devDependencies `@stratawp/theme-review ^0.1.0` and `@stratawp/testing ^0.3.0`; scripts `"review": "stratawp-review"`, `"test:visual": "playwright test --config playwright.visual.config.ts"`, `"ai:check": "pnpm build && pnpm review"`. Keep every existing script, including `update:stratawp`. Run `pnpm install` (the lockfile change is expected).
- Agent files: refresh `AGENTS.md`, `.ai/skills/**` (adding `theme-review` and `visual-checks`), `.ai/SKILLS.md`, `.aiignore` and `scripts/ai-setup.mjs` from `packages/cli/templates/basic-theme`, preserving anything jonimms-specific (read the existing files first; merge, never overwrite blindly) and keeping the theme's own `.ai/developer-directions.md` and `.ai/PROJECT_RULES.md`.
- Visual: add `playwright.visual.config.ts` and an `e2e/visual` spec with routes that make sense for the site (home, a post, 404). Record no baselines (they are recorded on a CI runner, not locally).

- [ ] **Step 3: Run the review and fix what is safe**

Run `pnpm review` from the theme directory. Fix findings that cannot change live behavior or saved content: a 1200x900 `screenshot.png`, a `readme.txt`, missing style headers. For the rest (about 82 pattern-slug namespace warnings, 46 text-domain warnings, 50 unprefixed-symbol warnings, 6 plugin-territory warnings) do NOT rename anything referenced from saved post content or live templates; list each category with counts and the reason in the report for the maintainer. Change nothing outside the theme directory.

- [ ] **Step 4: Verify locally**

`pnpm build` succeeds; `pnpm review` reports 0 errors; do NOT run `./quick-deploy.sh` in any mode (it contacts production); if the Local site is running, fetch its home page and a post with `curl -sI` and confirm HTTP 200.

- [ ] **Step 5: Commit locally (no push, no deploy)**

Commit on the branch with a message that has no attribution lines. Report the exact commit, the files changed and the remaining warning categories. Deploying to production is a separate step that needs the maintainer's explicit go-ahead.

---

## Final verification (monorepo, after Tasks 1-4)

Run, in order, and report each honestly: `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm lint:css`, `pnpm lint:php`, `pnpm review` (all six themes: 0 errors and 0 warnings), `pnpm contracts:check`, `pnpm test`, prettier on all changed md/json/yml/ts, the template agent-file `cmp` checks, and the attribution and external-name checks. CI-only checks (smoke, axe, Lighthouse, Visual) are verified on the PR.

## Self-review

- **Coverage:** THEME-003 and 005 (Task 1), 007 and 008 (Task 2), 010 (Task 3), the doc refresh (Task 4), jonimms-theme (Task 5). THEME-009 and 011 report nothing on the six themes today.
- **Placeholders:** none; where a step says to copy values from `style.css` or the template, it names the file and the rule.
- **Risks called out:** pattern-slug renames (Review Focus 1), block names (2), text domain (3), CPT removal (4), scaffolder side effects (5). The jonimms theme is protected by explicit-path staging, no push and no deploy.
