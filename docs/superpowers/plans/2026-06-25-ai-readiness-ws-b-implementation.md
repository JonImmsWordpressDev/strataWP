# Phase 4 WS-B — Contract-first enforcement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the framework's machine-readable declarations a gated source of truth: validate every `block.json`/`theme.json` against a vendored, pinned schema + a StrataWP superset, and generate TypeScript attribute types from each `block.json` — both enforced in the CI `contracts` job with an injected-defect test.

**Architecture:** First fix the 10 mis-prefixed `block.json` names (the gate self-blocks otherwise). Vendor a pinned wp.org block schema + a WP theme.json schema into `packages/vite-plugin/schemas/`; a root `contracts:validate` script (ajv) checks all declaration files across the 6 theme locations against the schema + a small superset (apiVersion 3, `name` prefix = theme slug, `render` iff dynamic). Extend the vite-plugin's block scan to emit a committed TS attribute-types file per block; consume it in the basic-theme blocks; add a `typecheck` script to the example themes so the generated types compile in CI; a root `contracts:types:check` rebuilds and `git diff --exit-code`s the generated types. Extend the existing `contracts` CI job with both checks.

**Tech Stack:** `ajv ^8` (JSON-Schema validation); the vite-plugin's existing block scanner (TS); pnpm + Turbo 1.x; the `contracts` CI job from WS-A.

**Codename discipline:** competitor = **Triple XXX**; never the real name. "Frost" is a credited prior-art theme — but `forge-basic` is a stale, wrong block namespace (not an attribution) and gets fixed. **Explicit `git add <path>` only — never `git add -A`/`git add .`** (stray `.mcp.json`/`.claude*`/`*.rvf`/`*.db`/`.stratawp-snapshots/` + a `docs/superpowers/plans/2026-04-26-*.md` must not be committed).

**Reference:** Spec `docs/superpowers/specs/2026-06-25-ai-readiness-design.md` §4 WS-B.

---

## The 10 mis-prefixed block.json names (verified)
Block `name` must be `<theme-slug>/<block>`. Wrong today:
- `forge-basic/feature-card` → `<slug>/feature-card` in: `examples/{basic,store,advanced}-theme` + `packages/cli/templates/{basic,store,advanced}-theme` (6 files). Target slugs: `strata-basic`/`strata-store`/`strata-advanced`.
- `strata-basic/hero` → `<slug>/hero` in `examples/{store,advanced}-theme` + their `cli/templates` mirrors (4 files). (basic-theme's `hero` is already `strata-basic/hero` — correct, leave it.)

---

## File structure

**Create:**
- `packages/vite-plugin/schemas/block.schema.json` — pinned wp.org block.json schema
- `packages/vite-plugin/schemas/theme.schema.json` — pinned WP theme.json schema
- `scripts/validate-contracts.mjs` — ajv validation of all block.json/theme.json + superset
- `scripts/check-types-drift.mjs` — rebuild + `git diff --exit-code` the generated block types
- `packages/vite-plugin/src/plugins/block-types.ts` (or extend `blocks.ts`) — the codegen
- `packages/vite-plugin/test/block-types.test.ts` — codegen unit test
- a deliberately-broken fixture under `packages/vite-plugin/test/fixtures/` for the injected-defect test
- generated `*/src/blocks/<block>/block-attributes.ts` (committed, per block)

**Modify:**
- 10 `block.json` files (names) + any templates/patterns/parts referencing the old names
- root `package.json` — `contracts:validate`, `contracts:types:check` scripts
- `.github/workflows/ci.yml` — extend the `contracts` job
- `examples/{basic,store,advanced}-theme/package.json` — add a `typecheck` script
- `examples/basic-theme/src/blocks/{feature-card,hero}/edit.tsx` — consume the generated attribute types
- `packages/vite-plugin/package.json` — add `ajv` (+ the build wiring for the new codegen entry if needed)

---

## Task 0: Commit this plan

- [ ] `git branch --show-current` → `feat/contract-enforcement`.
- [ ] `git add docs/superpowers/plans/2026-06-25-ai-readiness-ws-b-implementation.md && git commit -m "docs(ai-readiness): WS-B (contract enforcement) implementation plan"`

---

## Task 1: Fix the 10 mis-prefixed block.json names (prerequisite)

**Files:** the 10 `block.json` (names) + any references.

- [ ] **Step 1: Find references to the old names FIRST** (so nothing renders broken):
```bash
grep -rn 'forge-basic/feature-card\|"forge-basic\|wp-block-forge-basic' examples packages/cli/templates --include=*.php --include=*.html --include=*.json --include=*.tsx --include=*.css
grep -rn 'strata-basic/hero' examples/store-theme examples/advanced-theme packages/cli/templates/store-theme packages/cli/templates/advanced-theme --include=*.php --include=*.html --include=*.json
```
Record every hit (templates/patterns/parts/CSS that reference the old block name or its generated CSS class `wp-block-forge-basic-feature-card`).

- [ ] **Step 2: Rename `feature-card` (6 files).** In each theme's `src/blocks/feature-card/block.json`, set `"name"` to `<theme-slug>/feature-card` (`strata-basic`/`strata-store`/`strata-advanced` per location, mirrored in `cli/templates`). Update any references found in Step 1 (block markup that hardcodes `forge-basic/feature-card`, and the CSS class `wp-block-forge-basic-feature-card` → `wp-block-<slug>-feature-card` if present in the block's style.css/render.php/edit.tsx).

- [ ] **Step 3: Rename `hero` in store + advanced (4 files).** Set `"name"` to `<theme-slug>/hero` in `examples/{store,advanced}-theme` + their `cli/templates` mirrors; update references + CSS class `wp-block-strata-basic-hero` → `wp-block-<slug>-hero` where it appears in those two themes. (Leave basic-theme's `hero` — already correct.)

- [ ] **Step 4: Verify names + no stale references.**
```bash
for bj in $(git ls-files '*/src/blocks/*/block.json'); do node -e "const n=require('./'+process.argv[1]).name; const slug=process.argv[1].split('/src/blocks/')[0].split('/').pop().replace(/-theme$/,''); /* slug like strata-basic */" "$bj"; done
grep -rn 'forge-basic' examples packages/cli/templates && echo 'STILL HAS forge-basic — fix' || echo 'no forge-basic refs'
```
Manually confirm each `block.json` `name` prefix equals its theme slug (basic→`strata-basic`, store→`strata-store`, advanced→`strata-advanced`), and that `grep -rn 'forge-basic' examples packages/cli/templates` returns nothing (the stale namespace is fully gone). `strata-basic/hero` should remain ONLY in basic-theme.

- [ ] **Step 5: Verify nothing broke.** `pnpm lint:php` exits 0; `pnpm --filter ...` builds the affected example themes (or `pnpm build`) succeed; the example/template byte-identical pairs stay in sync (`diff -rq` of the store/advanced example vs template `src/blocks`, minus generated).

- [ ] **Step 6: Commit.**
```bash
git add examples packages/cli/templates
git commit -m "fix(themes): correct block namespaces to theme slug (drop stale forge-basic/cross-theme hero)"
```
(Stage explicitly; verify no tooling artifacts staged. If `git add examples packages/cli/templates` would sweep unrelated files, stage the specific block dirs + reference files instead.)

---

## Task 2: Vendor schemas + ajv validator + `contracts:validate` (TDD)

**Files:** `packages/vite-plugin/schemas/{block,theme}.schema.json`, `scripts/validate-contracts.mjs`, root `package.json`, `packages/vite-plugin/package.json` (ajv), `.github/workflows/ci.yml`, a broken fixture.

- [ ] **Step 1: Vendor the schemas.** Save a pinned copy of the canonical wp.org block.json schema to `packages/vite-plugin/schemas/block.schema.json` and the WP theme.json schema to `packages/vite-plugin/schemas/theme.schema.json`. (Fetch once from `https://schemas.wp.org/trunk/block.json` and `…/theme.json`, save the file, and pin it — do NOT fetch at runtime; record the source URL + retrieval date in a top-level `$comment`.) Add `ajv` (`^8`) as a devDependency where `validate-contracts.mjs` resolves it (root or vite-plugin; root is simplest for a root script).

- [ ] **Step 2: Write the validator script** `scripts/validate-contracts.mjs`: discover every `src/blocks/**/block.json` and every `theme.json` across `examples/*` and `packages/cli/templates/*`; validate each against the vendored schema with ajv; then apply the StrataWP superset in code: (a) `apiVersion === 3`; (b) `name` starts with `<theme-slug>/` where theme-slug is derived from the containing theme dir; (c) if the block has a `render` field it must point to an existing file, and a dynamic block (`render` present) must have a `render.php`. Print a clear per-file pass/fail; exit non-zero on any violation. `Date.now()` is allowed (real Node script). Add root script `"contracts:validate": "node scripts/validate-contracts.mjs"`.

- [ ] **Step 3: Injected-defect fixture + test.** Add `packages/vite-plugin/test/fixtures/bad-block.json` (e.g. `apiVersion: 2`, missing `name`) and a vitest test asserting the validator (import the validate function, or run the script against the fixture dir) REJECTS it, and ACCEPTS a good fixture. (Refactor the script's core into an importable `validateBlockJson(obj, themeSlug)` so the test doesn't shell out.)

- [ ] **Step 4: Run `pnpm contracts:validate` against the repo → must exit 0** (Task 1 fixed the names, so all real block.json now pass the prefix rule). If any real file fails (e.g. a theme.json schema violation), fix the file. Run the new test → green.

- [ ] **Step 5: Extend the `contracts` CI job** in `.github/workflows/ci.yml` — add a step after `contracts:check`:
```yaml
      - name: Declaration files validate against schema
        run: pnpm contracts:validate
```

- [ ] **Step 6: Commit.**
```bash
git add packages/vite-plugin/schemas packages/vite-plugin/test scripts/validate-contracts.mjs package.json packages/vite-plugin/package.json pnpm-lock.yaml .github/workflows/ci.yml
git commit -m "feat(contracts): vendored schema validation for block.json/theme.json + injected-defect gate"
```

---

## Task 3: block.json → TS attribute codegen (TDD)

**Files:** `packages/vite-plugin/src/plugins/block-types.ts` (codegen) + wiring into the block scan, `packages/vite-plugin/test/block-types.test.ts`, generated `*/src/blocks/<block>/block-attributes.ts`, `examples/*/package.json` (typecheck), `examples/basic-theme/src/blocks/{feature-card,hero}/edit.tsx`, `scripts/check-types-drift.mjs`, root `package.json`, `.github/workflows/ci.yml`.

- [ ] **Step 1: Read** `packages/vite-plugin/src/plugins/blocks.ts` (how it scans `block.json` + emits `inc/blocks-generated.php`, esp. the `closeBundle`/scan hook + the `BlockMetadata` type) — the codegen hooks into the same scan.

- [ ] **Step 2: Codegen unit test (TDD)** `packages/vite-plugin/test/block-types.test.ts`: given a `block.json` with `attributes: { title: {type:'string'}, count: {type:'number'}, items: {type:'array'}, enabled: {type:'boolean'} }`, the codegen returns a TS source string exporting an interface (e.g. `HeroAttributes`) with the mapped types (`title?: string`, `count?: number`, `items?: unknown[]`, `enabled?: boolean`), an `AUTO-GENERATED — do not edit` banner, and a name derived from the block (PascalCase of the block slug + `Attributes`). Map JSON-Schema attribute `type` → TS: string→string, number/integer→number, boolean→boolean, array→`unknown[]`, object→`Record<string, unknown>`; missing type→`unknown`. Run → FAIL.

- [ ] **Step 3: Implement the codegen** `block-types.ts` (`generateBlockAttributeTypes(blockJson): { fileName: string; content: string }`), and wire it into the vite-plugin's block scan so building a theme writes `src/blocks/<block>/block-attributes.ts` next to each block. Run the unit test → PASS.

- [ ] **Step 4: Generate + commit the types.** Build the example themes (`pnpm build`) so the codegen emits the `block-attributes.ts` files; prettier-format them; they are committed (NOT gitignored — confirm they're outside `dist/`). 

- [ ] **Step 5: Consume the types in basic-theme blocks.** Update `examples/basic-theme/src/blocks/{feature-card,hero}/edit.tsx` to import the generated `…Attributes` interface and type the block's `attributes` prop with it (the real "type-safe attributes" payoff). (Other themes' blocks get the generated files + typecheck compilation but need not be rewired here — note as optional follow-up.)

- [ ] **Step 6: Add a `typecheck` script to the example themes** (`examples/{basic,store,advanced}-theme/package.json`): `"typecheck": "tsc --noEmit"` with a minimal `tsconfig.json` (extends root, includes `src`) if absent — so the generated types + the consuming `edit.tsx` are compiled by `pnpm typecheck` (turbo) in CI. Run `pnpm --filter <example> typecheck` → green. (This also begins to earn the JS half of the README "type safety" claim — coordinate wording in the docs capstone, not here.)

- [ ] **Step 7: Drift gate.** `scripts/check-types-drift.mjs`: run the theme build (regenerates the types) then `git diff --exit-code -- '*/src/blocks/*/block-attributes.ts'`; non-zero on drift with a clear message. Root script `"contracts:types:check": "node scripts/check-types-drift.mjs"`. Extend the `contracts` CI job:
```yaml
      - name: Generated block types are in sync
        run: pnpm contracts:types:check
```
(The job already runs `pnpm build` before the contracts steps, so the types are freshly generated; the script may re-run the relevant build or assume the prior `pnpm build` — document which.)

- [ ] **Step 8: Verify + commit.** `pnpm --filter @stratawp/vite-plugin test` green; `pnpm build && pnpm typecheck` green (examples now typecheck); `pnpm contracts:types:check` exits 0; generated files prettier-clean.
```bash
git add packages/vite-plugin/src packages/vite-plugin/test examples/*/src/blocks/*/block-attributes.ts examples/*/src/blocks/*/edit.tsx examples/*/package.json examples/*/tsconfig.json scripts/check-types-drift.mjs package.json .github/workflows/ci.yml
git commit -m "feat(contracts): block.json -> TS attribute codegen, consumed + typecheck-gated, drift-checked"
```

---

## Task 4: Full local gate + push + PR

- [ ] **Step 1: Full gate.**
```bash
pnpm install --frozen-lockfile && pnpm build && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
pnpm contracts:check && pnpm contracts:validate && pnpm contracts:types:check
pnpm lint:php && ( cd packages/core && composer phpcs && composer phpstan && composer test )
```
Expected: all green. (axe/perf run only in CI — but note the basic-theme block-name changes: confirm the axe gate still renders; the renamed blocks are registered by directory, and references were updated in Task 1.)

- [ ] **Step 2: codename + scope check.**
```bash
git diff main..HEAD | grep -inE 'wp.?rig' || echo CLEAN
grep -rn 'forge-basic' examples packages/cli/templates || echo "no stale namespace"
git status -sb   # only untracked tooling artifacts unstaged
```

- [ ] **Step 3: push + PR.**
```bash
git push -u origin feat/contract-enforcement
```
PR title: `Phase 4 WS-B: contract-first enforcement — schema-validated block.json/theme.json + block.json→TS codegen`. Body: the namespace cleanup, the vendored-schema validation gate, the codegen + example typecheck, the extended `contracts` job + injected-defect test. Watch CI; the `contracts` job (now 3 checks) + js/php/php-themes/axe/perf must be green. Jon merges. This completes Phase 4.

---

## Self-review checklist (completed by plan author)

- **Spec coverage (§4 WS-B):** vendored pinned schema (not live trunk) ✓; fix ~mis-prefixed names first incl. cli/templates + reference grep ✓; validate block.json/theme.json ✓; superset (apiVersion 3 / name-prefix / render-iff-dynamic) ✓; block.json→TS codegen committed + drift-gated ✓; example `typecheck` added (they had none) ✓; blocks use `edit.tsx` (no save.tsx) ✓; extend the `contracts` job + injected-defect test ✓; required deterministic gate ✓.
- **Sequencing:** Task 1 (name fix) precedes the validation gate so it doesn't self-block.
- **Codename/scope:** `forge-basic` is a stale namespace (fixed), distinct from the credited "Frost" prior-art attribution (left alone); explicit `git add`; no embedded LLM touched.
- **No placeholders:** scripts/codegen/CI steps are concrete; the codegen's exact output is pinned by its TDD test; the JSON→TS type map is specified.
