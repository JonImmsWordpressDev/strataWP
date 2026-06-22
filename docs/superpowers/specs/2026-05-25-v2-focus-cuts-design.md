# v2.0 — Focus Release: Remove Studio, Registry, AI

**Status:** Approved (design phase)
**Date:** 2026-05-25
**Author:** Jon Imms + Claude

## Summary

StrataWP's value lives in CLI + Vite plugin + PHP Components + Sync. Three packages — `@stratawp/studio`, `@stratawp/registry`, `@stratawp/ai` — exist but don't pull their weight: Studio is a large admin UI we don't want to evolve, Registry is a cold-start problem stuck at `0.1.0`, and AI is increasingly redundant given MCP/Claude Code/Copilot. This release deletes all three from the monorepo, rewrites the docs around the sharpened scope, adds `ROADMAP.md`, and ships as `v2.0.0`.

## Goals

1. Remove `packages/studio`, `packages/registry`, `packages/ai` from the monorepo entirely.
2. Strip Registry and AI integration from `@stratawp/cli` (no more `registry:*` commands or AI imports).
3. Rewrite top-level docs (README, CHEAT_SHEET, GETTING_STARTED, CLAUDE.md) to match the sharpened pitch.
4. Add `ROADMAP.md` capturing the sharpened scope, the rationale for the cuts, and the investment ranking for future work.
5. Ship as a real `v2.0.0` release: CHANGELOG entry, git tag, GitHub Release, `npm publish @stratawp/cli@2.0.0`.
6. `npm deprecate` the three retired packages with a pointer to `ROADMAP.md`.

## Non-goals

- **Auditing `packages/explorer` and `packages/headless`.** They might also deserve cuts later, but bundling them expands scope. Both are listed as v2.1 candidates in `ROADMAP.md`.
- **Building new features.** The Git deployer, `stratawp doctor`, type-safe `block.json` codegen, and `stratawp adopt` are recorded in `ROADMAP.md`; each ships on its own branch later.
- **Touching `stratawp-seo`.** Unrelated repo.
- **Reconciling version drift.** `CHANGELOG.md` advertises `v1.6.0` while `package.json` is at `1.2.0`. We jump to `2.0.0` and stop worrying about the intermediate.

## The cuts

### `packages/studio`

- 54 src files, currently at `1.0.0`.
- Self-contained: it registers its own WordPress admin page and REST endpoints from inside the package. No edits needed in `packages/core`.
- Action: `git rm -r packages/studio`.
- Also delete: `docs/STUDIO.md`, `docs/plans/2026-01-26-save-pattern-plugin.md`, `docs/plans/2026-01-26-pattern-library-design.md`, `docs/plans/2026-01-26-pattern-library-phase2.md`, `docs/plans/2026-01-26-block-library-design.md`.

### `packages/registry`

- 13 src files, at `0.1.0`. By definition no real adoption.
- Wired into the CLI via five commands: `registry:search`, `registry:install`, `registry:info`, `registry:publish`, `registry:list`.
- Actions:
  - `git rm -r packages/registry`.
  - In `packages/cli/package.json`: remove `"@stratawp/registry": "workspace:*"`.
  - In `packages/cli/src/index.ts`: remove the `} from '@stratawp/registry'` import block (around line 22) and all five `.command('registry:*')` chains.

### `packages/ai`

- 13 src files, at `0.1.0`.
- Wired into the CLI via an import block around line 15. Exact command surface to be confirmed when the file is opened.
- Actions:
  - `git rm -r packages/ai`.
  - In `packages/cli/package.json`: remove `"@stratawp/ai": "workspace:*"`.
  - In `packages/cli/src/index.ts`: remove the `} from '@stratawp/ai'` import block and any AI-prefixed commands found there.

## Docs rewrite

### `README.md`

- Drop the Studio Guide row from the documentation table (line 47).
- Drop the "Studio Admin" bullet (line 62).
- Drop the "Component Registry" bullet (line 64).
- Update the Project Structure tree to remove `studio/`, `registry/`, `ai/` (lines 84-85).
- Drop the registry CLI examples (lines 139-141).
- Drop the three "Sub-packages" links at the bottom (lines 233-235).
- Update the "Why StrataWP?" feature list to match the sharpened pitch (remove "AI-Assisted Dev", "Component Registry", "Studio Admin").

### `CHEAT_SHEET.md`

- Delete the Registry section (lines 97-111).

### `GETTING_STARTED.md`

- Delete the "Component Registry" section (around lines 707-720).
- Delete the publish-related step (around line 934).
- Delete the registry README link (around line 978).
- Delete the registry entries in the bottom-of-file CLI summary (around lines 1014-1016).

### `CLAUDE.md`

- Remove `packages/ai` and `packages/registry` lines from the monorepo structure list.
- Remove `@stratawp/ai` and `@stratawp/registry` from the published-packages list.
- Delete the entire "Studio Package" section (Building Studio, Installing Studio in a Theme, Troubleshooting Studio, Studio REST API Performance — ~80 lines).

### `DEVELOPMENT_NOTES.md`

- Remove the "Component registry for reusability" bullet from the features list.

### `CHANGELOG.md`

- Prepend a v2.0.0 entry headlined "Focus release: removed Studio, Registry, AI packages to sharpen scope" with the rationale and a pointer to `ROADMAP.md`.

## ROADMAP.md content outline

```markdown
# StrataWP Roadmap

## What StrataWP is (and isn't)

A modern, type-safe scaffolding + dev server + deploy pipeline for WordPress
block themes, with a small library of opt-in PHP Components for the boring
stuff every theme needs. Not an admin UI. Not an AI SDK. Not a component
registry. The framework is CLI + Vite plugin + PHP Components + Sync.

## v2.0 — Focus (this release)

### Removed

- **@stratawp/studio** — admin UIs duplicate what the Site Editor and your
  IDE already do. Maintenance burden of a React admin app outweighed value.
- **@stratawp/registry** — npm + private packages already cover the use
  case. A custom registry would need critical mass we don't have.
- **@stratawp/ai** — every editor has AI now (MCP, Claude Code, Copilot).
  A framework baking it in is a shrinking-value commitment.

### Under review for v2.1

- **@stratawp/explorer** — if no active usage, Storybook itself works fine.
- **@stratawp/headless** — if not actively maintained, the typed REST
  client carries ongoing cost as WordPress core changes.

## What we're investing in (ranked)

1. **Git-based deployer** — finishes the v1.0 "coming soon" promise.
2. **`stratawp doctor`** — diagnose common setup issues (broken symlinks,
   theme.json schema, deploy config, PHP/Node mismatches).
3. **Type-safe `block.json` codegen** — Vite plugin generates TS types
   from each `block.json` so attributes are typed in `edit.tsx` / `save.tsx`.
4. **`stratawp adopt`** — retrofit existing themes; remove the
   greenfield-only adoption barrier.
5. **New PHP Components** — candidates: Errors (Sentry/Bugsnag),
   Cookies/Consent (pairs with Analytics), Forms (lightweight), Cache.
6. **Performance budgets in `build`** — fail the build if JS/CSS exceeds
   thresholds in `stratawp.config.ts`.

## What we're not building

- Admin UIs (use the Site Editor and your IDE).
- AI SDK lock-in (use MCP / Claude Code / Copilot).
- Component registry (use npm + private packages).
```

Each "Removed" and "Investing in" item gets 2-3 sentences of rationale in the actual file.

## Release flow

### Branch and commits

Branch: `feat/v2-focus-cuts` off `main`.

| #   | Commit                                                                   | Touches                                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `chore: remove @stratawp/registry package`                               | `git rm -r packages/registry`, `packages/cli/{package.json,src/index.ts}`, `pnpm-lock.yaml`                                                                                                                                                                                                                                                          |
| 2   | `chore: remove @stratawp/ai package`                                     | `git rm -r packages/ai`, `packages/cli/{package.json,src/index.ts}`, `pnpm-lock.yaml`                                                                                                                                                                                                                                                                |
| 3   | `chore: remove @stratawp/studio package and docs/STUDIO.md`              | `git rm -r packages/studio`, `git rm docs/STUDIO.md`, `git rm docs/plans/2026-01-26-*.md` (four files)                                                                                                                                                                                                                                               |
| 4   | `docs: update README/CHEAT_SHEET/GETTING_STARTED/CLAUDE.md for v2 scope` | All section deletions per "Docs rewrite"                                                                                                                                                                                                                                                                                                             |
| 5   | `docs: add ROADMAP.md`                                                   | New file per outline above                                                                                                                                                                                                                                                                                                                           |
| 6   | `chore(release): bump root + @stratawp/cli to 2.0.0, CHANGELOG entry`    | Root `package.json` → 2.0.0; `packages/cli/package.json` → 2.0.0; grep `packages/create-stratawp/templates/` for references to cut packages and remove them (bump `create-stratawp/package.json` if templates changed); inspect `.github/workflows/` and `turbo.json` and remove any references to cut packages; `CHANGELOG.md` prepend v2.0.0 entry |

Run `pnpm install` after commits 1, 2, 3 so each lockfile-touching commit ships with a coherent lockfile. If the create-stratawp template cleanup in commit 6 turns out non-trivial (more than a handful of edits), split it into its own commit between 5 and 6.

### PR and merge

- Open PR `feat/v2-focus-cuts` → `main`, titled `v2.0 — Focus release: remove Studio, Registry, AI`.
- PR body summarizes the ROADMAP rationale and the six commits.
- Self-review the diff before merging.
- Merge to `main` without squash to preserve the per-commit narrative.

### Tag, GitHub Release, npm

After merge:

```bash
git checkout main && git pull
git tag -a v2.0.0 -m "v2.0 — Focus release: remove Studio, Registry, AI"
git push origin v2.0.0
gh release create v2.0.0 --title "v2.0 — Focus" \
  --notes-file <(awk '/^## v2.0/,/^## v1.6/' CHANGELOG.md | sed '$d')
cd packages/cli && pnpm build && npm publish --access public
```

Then `npm deprecate` the three retired packages:

```bash
npm deprecate "@stratawp/studio@*"   "Removed in StrataWP v2.0 to sharpen scope. See https://github.com/JonImmsWordpressDev/strataWP/blob/main/ROADMAP.md"
npm deprecate "@stratawp/registry@*" "Removed in StrataWP v2.0 to sharpen scope. See https://github.com/JonImmsWordpressDev/strataWP/blob/main/ROADMAP.md"
npm deprecate "@stratawp/ai@*"       "Removed in StrataWP v2.0 to sharpen scope. See https://github.com/JonImmsWordpressDev/strataWP/blob/main/ROADMAP.md"
```

The npm commands require Jon's npm auth; Claude can't run them. They'll be printed ready-to-paste at the end of the implementation session.

## Verification

Before opening the PR, on the feature branch:

```bash
pnpm install                  # lockfile clean
pnpm build                    # all remaining packages build
pnpm test                     # all remaining tests pass
pnpm -F @stratawp/cli build && \
  node packages/cli/dist/index.js --help   # CLI loads, no registry:/ai commands
grep -rn "studio\|registry\|@stratawp/ai" \
  packages/ examples/ docs/ --include="*.{ts,tsx,php,json,md}" \
  2>/dev/null | grep -v node_modules
                              # expect zero hits other than intentional ROADMAP/CHANGELOG mentions
```

If any step fails, stop and surface the output before continuing.

## Rollback

- **Pre-tag** (mistake found in PR or before tagging): `git reset` the branch or `git revert` a specific commit. The per-commit structure makes single-cut reversion trivial.
- **Post-tag** (mistake found after npm publish): publish `@stratawp/cli@2.0.1` with a fix. To restore a deleted package, `git revert` the removal commit on a new branch. Deleted code remains recoverable from git history indefinitely; nothing in this release is destructive.

## Known risks

- **`packages/create-stratawp` templates** may reference the cut packages (e.g. a scaffolded theme that imports `@stratawp/studio`). Grep templates in commit 6 and clean any references. If non-trivial, flag as a separate concern rather than expanding the PR.
- **CI workflows** in `.github/workflows/` may reference cut packages or assume `pnpm build` covers all 10. Inspect and adjust in commit 6.
- **`turbo.json` pipelines** may list cut packages in `dependsOn` or filters. Same — inspect and adjust in commit 6.
- **`pnpm-lock.yaml` churn** will be large. Expected; no action needed beyond making sure each lockfile-touching commit re-runs `pnpm install`.
