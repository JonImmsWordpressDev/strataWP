# create-stratawp

## 2.4.0

### Minor Changes

- 0a5b59c: Generated themes ship a 1200x900 screenshot and a readme.txt; the advanced template's custom post types move into a companion plugin that create-stratawp offers to install; example themes use their own namespace and text domain.

### Patch Changes

- Updated dependencies [0a5b59c]
  - @stratawp/cli@2.4.0

## 2.3.0

### Minor Changes

- bf392c0: Add `@stratawp/theme-review`, a theme checker that approximates the WordPress.org theme guidelines and detects whether a theme is block, classic, or hybrid. The CLI gains `stratawp theme:review`, and generated themes ship the checker with a `review` script. `pnpm ai:setup` records the detected theme type for agents.
- b77730d: Add `stratawp-screenshots` (viewport screenshots of a running site, also via `stratawp screenshots`) and `createVisualConfig`, an opt-in Chromium visual compare preset. Generated themes ship a `test:visual` script, a visual spec and the `visual-checks` agent skill.

### Patch Changes

- Updated dependencies [bf392c0]
- Updated dependencies [b77730d]
  - @stratawp/cli@2.3.0

## 2.2.0

### Minor Changes

- 9754d46: Add AVIF output to the image pipeline, a strict shared Stylelint preset, and a cross-browser smoke-test preset, and ship all three in generated themes. The `playwright.config.ts` shipped by `@stratawp/testing` now uses the shared config factory: Chromium locally, Chromium, Firefox and WebKit in CI, with the `webServer` block removed and reporters changed to `list` locally and `github` plus `html` in CI. `@playwright/test` is now an optional peer dependency of `@stratawp/testing`.

### Patch Changes

- Updated dependencies [9754d46]
  - @stratawp/cli@2.2.0

## 2.1.1

### Patch Changes

- Updated dependencies [3651be2]
  - @stratawp/cli@2.1.1

## 2.1.0

### Patch Changes

- Updated dependencies [c959673]
  - @stratawp/cli@2.1.0

## 2.0.4

### Patch Changes

- Export `./dist/create.js` from `@stratawp/cli` — the package's `exports` field blocked the subpath the `create-stratawp` wrapper resolves, so `npx create-stratawp` failed at launch with ERR_PACKAGE_PATH_NOT_EXPORTED.
- Updated dependencies
  - @stratawp/cli@2.0.4

## 2.0.3

### Patch Changes

- Republish `@stratawp/sync` as 0.1.1 — 0.1.0 was burned by an earlier unpublish and npm forbids reusing it, which left `@stratawp/cli@2.0.2`'s exact pin unresolvable. Internal workspace pins now publish as caret ranges (`workspace:^`) so a single republished dependency no longer forces a lockstep chain.
- Updated dependencies
  - @stratawp/cli@2.0.3

## 2.0.2

### Patch Changes

- Ship the iframed-editor CSS registration fix (#42) in the bundled template cores, replace the scaffolder's hardcoded `@stratawp/vite-plugin` pin with a version stamped at pack time (`templateDependencies`), and document `npx create-stratawp@latest` so returning users bypass the npx cache.
- Updated dependencies
  - @stratawp/cli@2.0.2
