# @stratawp/testing

## 0.3.0

### Minor Changes

- b77730d: Add `stratawp-screenshots` (viewport screenshots of a running site, also via `stratawp screenshots`) and `createVisualConfig`, an opt-in Chromium visual compare preset. Generated themes ship a `test:visual` script, a visual spec and the `visual-checks` agent skill.

## 0.2.0

### Minor Changes

- 9754d46: Add AVIF output to the image pipeline, a strict shared Stylelint preset, and a cross-browser smoke-test preset, and ship all three in generated themes. The `playwright.config.ts` shipped by `@stratawp/testing` now uses the shared config factory: Chromium locally, Chromium, Firefox and WebKit in CI, with the `webServer` block removed and reporters changed to `list` locally and `github` plus `html` in CI. `@playwright/test` is now an optional peer dependency of `@stratawp/testing`.

## 0.1.1

### Patch Changes

- No-op release verifying the npm trusted publishing (OIDC) pipeline end to end — first publish with no token involved.
