---
description: Capture screenshots of a running theme and run the opt-in visual compare (`stratawp-screenshots`, `pnpm test:visual`, `packages/testing`).
globs: packages/testing/**/*, packages/mcp/**/*, packages/cli/templates/**/*, examples/**/*, .github/workflows/visual.yml
---

# Visual Checks (monorepo)

Screenshots do two jobs. **Capture** produces PNGs you can look at. **Compare** (`pnpm test:visual`) is an opt-in pixel-diff gate against committed baselines. Compare is never a default blocking gate: pixel diffs flake across machines.

## Capture

- `pnpm exec stratawp-screenshots capture` with `--routes=/,/blog`, `--widths=1280,390`, `--out=dir` and `--base-url=url`. Run it from a theme directory (for example `examples/basic-theme`).
- Defaults come from `package.json` `stratawp.screenshots` (`routes`, `widths`). Precedence: flag, then `package.json`, then `WP_BASE_URL` (base URL only), then the built-ins (`/` and a 404 path; 1280 and 390; `http://localhost:8888`).
- Output goes to `.stratawp/screenshots/` (git-ignored). Captures are viewport-sized, not full-page.
- It needs a running site (for example wp-env) and Chromium: `pnpm exec playwright install chromium`.
- Exit codes: `0` all captured, `1` a capture failed or the site or browser is unavailable, `2` usage or config problem.
- A route that answers HTTP 404 still counts as a successful capture; the default routes include a 404 page on purpose.
- MCP: `capture_screenshots({ baseUrl, routes?, widths? })` returns the images as content. Limits: at most 6 images per call (routes x widths), at most 2 widths, viewport-sized. It is read-only, writes no files, and the site must already be running.

## Compare

- `pnpm test:visual` in a theme runs the visual spec against baselines under `e2e/visual/__screenshots__/`.
- **Never record baselines locally.** Fonts and rendering differ between machines. Record on CI: Actions, workflow "Visual", mode `record`. Download the `visual-baselines` artifact and commit it under `e2e/visual/__screenshots__/`.
- The Visual workflow can only be dispatched once `visual.yml` is on the default branch.
- With no baselines committed, the first `compare` run **fails** (a missing baseline is written and the test fails). Record first.
- Mode `compare` fails on any diff beyond the tolerance. `--update-snapshots` (record mode) rewrites only missing or changed baselines; drift within tolerance is not refreshed.

## Hard rules

- Do not commit `.stratawp/`.
- Do not hand-edit baselines.
- Do not raise `maxDiffPixelRatio` to silence a failure without asking the maintainer.
- MCP tools stay read-only; regenerate the contract snapshot with `pnpm --filter @stratawp/mcp snapshot` when a tool schema changes.

## Where the code lives (monorepo only)

- Capture core: `packages/testing/src/screenshots/` (`options.ts` parsing and precedence, `naming.ts` file names, `capture.ts` the browser loop, `run.ts` the CLI). It returns image buffers; only the CLI writes files.
- Compare preset: `createVisualConfig` in `packages/testing/src/config.ts` (Chromium only, `retries: 0`, `snapshotPathTemplate` `{testDir}/__screenshots__/{testFileName}/{arg}{ext}`).
- Wrappers: `packages/cli/src/commands/screenshots.ts` shells out to `pnpm exec stratawp-screenshots`; `packages/mcp/src/tools.ts` imports only `@stratawp/testing/screenshots`.
- CI: `.github/workflows/visual.yml` (dispatch-only) and the capture step in `.github/workflows/smoke.yml` (uploads `smoke-screenshots`). Neither can be verified locally.

To add a capture option: parse it in `options.ts` with a unit test, thread it through `run.ts`, the CLI wrapper and the MCP input schema together, then regenerate the MCP snapshot.
