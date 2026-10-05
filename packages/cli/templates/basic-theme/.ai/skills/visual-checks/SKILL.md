---
description: Capture screenshots of this theme with `stratawp-screenshots`, and run the opt-in visual compare with `pnpm test:visual`.
globs: style.css, theme.json, templates/**/*, parts/**/*, patterns/**/*, src/**/*, e2e/visual/**/*
---

# Visual Checks

Screenshots do two jobs. **Capture** produces PNGs you can look at while you work. **Compare** (`pnpm test:visual`) is an opt-in pixel-diff gate against committed baselines. Compare is not a default blocking gate: pixel diffs flake across machines.

## Which to use

- Want to see what a change looks like: **capture**.
- Want CI to catch unintended visual changes and the team has committed baselines: **compare**.

## Capture

```bash
pnpm exec stratawp-screenshots capture
pnpm exec stratawp-screenshots capture --routes=/,/blog --widths=1280,390 --base-url=http://localhost:8888
```

- Flags: `--routes`, `--widths`, `--out`, `--base-url`. Also available as `stratawp screenshots`.
- Defaults come from `package.json` `stratawp.screenshots` (`routes`, `widths`). Precedence: flag, then `package.json`, then `WP_BASE_URL` (base URL only), then the built-ins (`/` and a 404 path; 1280 and 390; `http://localhost:8888`).
- Routes are site paths such as `/blog`. Full URLs are rejected.
- Output goes to `.stratawp/screenshots/`. Captures are viewport-sized, not full-page.
- The site must already be running, and Chromium must be installed: `pnpm exec playwright install chromium`.
- Exit codes: `0` all captured, `1` a capture failed or the site or browser is unavailable, `2` usage or config problem.
- A route that answers HTTP 404 still counts as a successful capture; the default routes include a 404 page on purpose.
- MCP: if the `@stratawp/mcp` server is available, `capture_screenshots` returns the images directly. Limits: at most 6 images per call, at most 2 widths. It is read-only and the site must already be running.

## Compare

- `pnpm test:visual` runs `e2e/visual/` against baselines in `e2e/visual/__screenshots__/`.
- **Never record baselines locally.** Fonts and rendering differ between machines. Record them on CI with a visual workflow in `record` mode, download the artifact and commit it under `e2e/visual/__screenshots__/`.
- With no baselines committed, the first compare run **fails** (a missing baseline is written and the test fails). Record first.
- `--update-snapshots` rewrites only missing or changed baselines; drift within tolerance is not refreshed.
- Tolerance is `maxDiffPixelRatio` in `createVisualConfig` (`playwright.visual.config.ts`).

## Hard rules

- Do not commit `.stratawp/`.
- Do not hand-edit baselines.
- Do not raise `maxDiffPixelRatio` to silence a failure without asking the maintainer.
- Baselines are PNGs and are not for agents to read; look at fresh captures instead.
