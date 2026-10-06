# AI Tooling — Design Spec

Date: 2026-10-05
Status: Draft, awaiting maintainer review
Sub-project 2 of 2 (sub-project 1: quality gates, shipped as PR #47 and the v2.2.0 release)
Builds on: `2026-06-25-ai-readiness-design.md` (agent protocol, skills, `ai-setup`, docs and scaffold MCP servers). Its constraints continue to apply: no embedded LLM or provider keys; MCP over stdio with all logging to stderr; no destructive or credentialed actions exposed as tools; new MCP tools go through the contract-first snapshot check.
Delivery: one spec, **two PRs** (workstreams A and B below), each with its own plan.

## Goal

Give every StrataWP theme, and every agent working on one, the same verdicts from the same commands: a theme review that approximates the WordPress.org theme guidelines, screenshots agents and humans can look at, automatic knowledge of what kind of theme this is, and agent-facing instructions that point at all of it. Humans, CI and agents run the same code; agents get no private, weaker version.

## Decisions (agreed with maintainer)

- **Theme review is a deterministic checker plus a skill**, not skill-only and not a wrapper around the official Theme Check plugin.
- **Visual work is capture plus compare, with the compare gate opt-in.** It is not capture-only and not a default blocking gate (pixel diffs flake across machines).
- **Theme type is auto-detected, with an override** in `package.json`.
- **Packaging (Approach B):** a new dependency-light `@stratawp/theme-review` package; screenshots live in `@stratawp/testing`; `@stratawp/cli` and `@stratawp/mcp` wrap both.
- **Two PRs, one spec:** A ships the review package, CI job, type detection, agent layer, templates, and the review MCP tools. B ships screenshots, visual compare, and the screenshot MCP tool.
- Standing project rules apply: pnpm only; stage by explicit path, never `git add -A` or `git add .`; no attribution of any kind in commits or PR text; no mention of any external project in code, comments, docs, commits, or branch names.

## Current state (audited)

Already present and out of scope: `AGENTS.md` (five pillars); nine StrataWP skills in `.ai/skills/` (architecture, feature-planning, code-quality, php-components, gutenberg-blocks, testing, deployment, releases, agent-code-review); ten WordPress domain skills in `.claude/skills/` (including `wp-project-triage`); `scripts/ai-setup.mjs` (targets Cursor, Copilot, Gemini, Windsurf); `scripts/mcp-docs-server.mjs` (docs search); `@stratawp/mcp` (four scaffold tools plus a component catalog, with a tool-contract snapshot checked in CI).

Gaps this spec closes:

| Gap | Today |
| --- | --- |
| Theme review against WordPress.org guidelines | None |
| Screenshots / visual comparison for agents and CI | None found |
| Theme-type awareness | None; agents are not told whether a theme is block, classic, or hybrid |
| `.ai/developer-directions.md` | An unfilled template, so agents receive no real direction from it |
| Review and capture reachable by agents over MCP | The capabilities do not exist yet |

Calibration facts, measured on the three example themes and three CLI templates (all six behave identically):

- All six have complete `style.css` headers (Theme Name, Version, License, License URI, Text Domain, Tested up to, Requires at least, Requires PHP).
- All six ship `header.php` and `footer.php` next to `templates/*.html`, so the detector classifies **all six as hybrid**.
- All six have `theme.json` with `$schema` and `version: 3`, and `wp_head` / `wp_footer` in the PHP header and footer.
- All six have a **1536×1024** `screenshot.png` (the WordPress.org recommendation is 1200×900) and **no `readme.txt`**. Those two rules therefore start as warnings so the gate does not fail every theme on day one.

## Workstream A (PR 1): review, type detection, agent layer

### A1. `@stratawp/theme-review` (new package)

Dependency-light (Node built-ins; at most one small glob dependency). Published, public.

- **Command:** `stratawp-review [dir] [--json] [--strict] [--type=block|classic|hybrid]`. Defaults to the current directory.
- **Exit codes:** 0 pass, 1 errors (or warnings under `--strict`), 2 usage or file problem.
- **JSON shape:** `{ themeDir, themeType, typeSource: "detected"|"override", summary: { errors, warnings, infos }, findings: [{ ruleId, severity, message, file?, line? }], disclaimer }`, snapshot-tested.
- **Config** (in the theme's `package.json` under `stratawp`): `themeType` override; `review.ignore` globs; `review.rules` severity overrides (`off|info|warn|error`). Always ignored: `vendor/`, `node_modules/`, `dist/`, `*-generated.*`.
- **Honesty:** every report ends with a disclaimer that it approximates the WordPress.org theme guidelines and is not a certification. Output escaping is left to PHPCS, which does it properly; this package covers what PHPCS and Stylelint cannot.

### A2. Theme-type detector

`detectThemeType(themeDir)` returns `block`, `classic` or `hybrid`. Block markers: `templates/*.html`. Classic markers: any of `header.php`, `footer.php`, `sidebar.php`, `home.php`, `single.php`, `page.php`, `archive.php`, `search.php`, `404.php` (`index.php` alone does not count; block themes ship an empty one). Both kinds of marker means hybrid; only block markers means block; otherwise classic. A `stratawp.themeType` override wins, and an unknown value is rejected with a clear message. The plan verifies the result on all six themes (expected: hybrid).

### A3. Initial rule set (severities are proposals, confirmed against the six themes before commit)

| Id | Applies to | Check | Severity |
| --- | --- | --- | --- |
| THEME-001 | all | `style.css` has Theme Name, Version, License, License URI, Text Domain | error |
| THEME-002 | all | `style.css` also has Tested up to, Requires at least, Requires PHP, Description, Author | warning |
| THEME-003 | all | a `screenshot.{png,jpg,jpeg,gif,webp,avif}` exists; a PNG is 1200×900 (PNG header read, no dependency) | error if missing; warning if a PNG has another size |
| THEME-004 | classic, hybrid | `index.php` exists | error |
| THEME-005 | all | `readme.txt` exists | warning |
| THEME-006 | block, hybrid | `templates/index.html` exists; `theme.json` has `version` (missing `$schema` is a warning). Hybrid themes are only checked once `templates/index.html` or `theme.json` exists | error |
| THEME-007 | block, hybrid | pattern files have Title and Slug headers; slug namespace equals the text domain | warning |
| THEME-008 | all | gettext calls use the declared text domain | warning |
| THEME-009 | all | top-level PHP functions, classes and constants are prefixed or namespaced | warning |
| THEME-010 | all | plugin-territory code: `register_post_type`, `register_taxonomy`, `add_shortcode` | warning |
| THEME-011 | all | remote scripts or styles from external hosts (enqueue calls and literal tags) | warning |
| THEME-012 | all | `eval(` and `create_function(` are errors; `base64_decode(` is a warning | error / warning |
| THEME-013 | classic, hybrid | `wp_head()` in `header.php` and `wp_footer()` in `footer.php` | error |

Each rule is a registered unit with an id, severity, applicable types, and a `check(context)` returning findings with file and line. Heuristic rules (008, 009, 011) are warnings so only `--strict` fails on them. A rule that crashes is reported as an `INTERNAL` warning.

### A4. Self-check and CI

- Root script `review` runs the checker on all three examples and all three templates. A new blocking step in the `js` CI job runs it (after the build). Errors fail; warnings do not.
- The six themes must have **zero errors** before the job is enabled. The plan measures the count first; if cleanup is large, stop and ask the maintainer (same rule as the Stylelint work).

### A5. Agent layer

- New skills: `.ai/skills/theme-review/SKILL.md` (run the checker, interpret findings, fix, re-run) and, in B, `.ai/skills/visual-checks/SKILL.md`. `SKILLS.md`, `AGENTS.md` pillar 5 (pre-flight) and `agent-code-review` updated to include `pnpm review`.
- The template copies of `scripts/ai-setup.mjs` record `**Theme type**: <type> (detected|override)` in `.ai/agent-state.md` (idempotent). The `claude` target already exists in the template copy and Codex is already listed as native, so no new targets are added; the monorepo root script is unchanged because the root is not a theme.
- `.ai/developer-directions.md`: replaced with real starter content. For this repository it is drafted from constraints already stated in `CLAUDE.md` and the maintainer's standing instructions, and flagged for the maintainer to review the wording before merge.

### A6. MCP and CLI

- `@stratawp/mcp` gains `review_theme({ themeDir?, strict?, type? })` returning the JSON report, and `detect_theme_type({ themeDir? })`. Both are read-only. The tool-contract snapshot is regenerated.
- `@stratawp/cli` gains `stratawp theme:review`, a thin wrapper over the package.

### A7. Generated themes

All three templates gain the `@stratawp/theme-review` dev dependency, a `review` script, and `ai:check` includes it. The CLI stamps the new package's version into `templateDependencies` (`sync-template-vendor.mjs`). The scaffold test is extended: it asserts the pinned dependency is present and not a `workspace:` range or `latest`, runs the checker on a scaffolded theme, and fails if it finds no files to check.

## Workstream B (PR 2): screenshots and visual compare

### B1. Capture (`@stratawp/testing`)

`stratawp-screenshots capture [--routes=/,/blog] [--widths=1280,390] [--out=dir] [--base-url=url]`. Routes and widths default from `package.json` `stratawp.screenshots` (defaults: `/` and a known 404 route; widths 1280 and 390). Precedence is flag, then `package.json`, then the `WP_BASE_URL` environment variable (base URL only), then the defaults. Routes must be site paths starting with a single `/`; full URLs are rejected. Output defaults to `.stratawp/screenshots/` (added to `.gitignore`). Reuses `checkSiteReachable` so a down site gives one clear error. One failing route does not stop the others; the summary lists failures and the exit code is non-zero if any failed.

### B2. Compare (opt-in)

- `createVisualConfig({ testDir, baseURL?, maxDiffPixelRatio? })` in `@stratawp/testing/config`: Chromium only, `toHaveScreenshot`, baselines under `e2e/visual/__screenshots__/`. The exact template is `snapshotPathTemplate: '{testDir}/__screenshots__/{testFileName}/{arg}{ext}'`, with `retries: 0` so a flaky diff is never retried into a pass.
- A visual spec ships in the example theme and templates with a `test:visual` script. No baselines are committed in the PR.
- `visual.yml` is dispatch-only with a `mode` input: `record` (writes baselines and uploads them as an artifact; the maintainer downloads and commits them) or `compare` (fails on a diff). Baselines are recorded on the CI runner so fonts match.

### B3. MCP, CLI, skill

`@stratawp/mcp` gains `capture_screenshots({ baseUrl, routes?, widths? })`, which returns image content. Safety caps: at most six images per call, at most two widths, viewport-sized (not full-page) captures. The contract snapshot is regenerated. `stratawp screenshots` wraps the capture command by running the theme's own `stratawp-screenshots` bin through `pnpm exec`. `capture_screenshots` writes no files. The `visual-checks` skill is added, with a copy in each of the three templates (byte-identical).

## Testing

- **Review rules:** test themes built per test in temp directories by a helper (good block, good classic, hybrid, and a broken fixture per rule); a pass and a fail case for every rule; a test that a throwing rule is isolated and reported as an `internal` finding while the others still run; JSON shape snapshot.
- **Detector:** the three types, the ambiguous case, the override, and an unknown override value.
- **CLI behavior:** flags, exit codes, `--json`, `--strict`, missing directory.
- **Self-check:** the six themes review with zero errors, in the blocking CI job.
- **ai-setup:** records the type idempotently; the `claude` target does not overwrite an existing `CLAUDE.md`.
- **MCP:** server tests for the new tools and a regenerated, in-sync contract snapshot.
- **Visual-checks skill (B):** the three template copies are checked with `cmp`.
- **Screenshots (B):** unit tests for route, width and output parsing, naming, and failure aggregation, with no browser. A capture step in `smoke.yml` runs once against wp-env and uploads the images; it fails the job if capture breaks. Compare mode can only be verified on CI (no Docker locally).

## Rollout order

PR 1 (ordered commits): review package; fix the six themes' errors and add the CI job; MCP review tools and CLI wrapper; agent layer (skill, `AGENTS.md`, `ai-setup`, directions file); templates and scaffold test; docs, changeset, decision log.

PR 2 (ordered commits): capture command; visual factory, spec and `visual.yml`; capture step in `smoke.yml`; MCP screenshot tool and CLI wrapper; skill; docs and changeset.

## Release notes for the maintainer

`@stratawp/theme-review` is a **new published package**. It needs the manual first publish from the maintainer's own Terminal (security-key approval), followed by the trusted-publisher entry with "Allow npm publish" ticked, before the release tag. Until the first release, `templateDependencies` carries a hand-stamped `^0.0.0` placeholder for the package; the release step re-stamps it. This is listed in the PR checklist from the start. `@stratawp/mcp` is private and is not published. The CLI cannot be released ahead of `@stratawp/theme-review`, because the templates pin it.

PR 2 adds no new package. `@stratawp/testing`, `@stratawp/cli` and `create-stratawp` all bump **minor**. The templates pin the new `@stratawp/testing` range, so it must be on the registry before the CLI is published; `ci-publish.mjs` publishes alphabetically (cli first), and reordering it is a known follow-up. `visual.yml` can only be dispatched once it is on the default branch, so the first `record` run happens after merge, and the baselines it produces are committed afterwards.

## Risks

- Heuristic rules produce false positives; hence warnings, a per-rule override, and `--strict` as the only way warnings fail.
- Cleanup size on the six themes is unknown until the checker runs.
- WordPress.org guidelines evolve; each rule documents the guideline it approximates.
- The screenshot and visual parts cannot be fully verified locally; CI is the check.
- MCP image responses can bloat an agent's context; hence the caps.

## Out of scope

- Auto-fixing findings (a possible later `--fix`).
- Running the official Theme Check plugin.
- Design tokens, blocks and components work, Site Editor sync, and the child-theme generator (later sub-projects).
- Regenerating the themes' screenshots to 1200×900 and adding `readme.txt` files (the rules report them as warnings).

## Open items for the maintainer

- The rule set and severities in A3 (they are proposals).
- The wording of the repository's `developer-directions.md`.
- The default screenshot routes and widths.
