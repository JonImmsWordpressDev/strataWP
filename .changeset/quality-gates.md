---
'@stratawp/vite-plugin': minor
'@stratawp/testing': minor
'@stratawp/stylelint-config': minor
'@stratawp/cli': minor
'create-stratawp': minor
---

Add AVIF output to the image pipeline, a strict shared Stylelint preset, and a cross-browser smoke-test preset, and ship all three in generated themes. The `playwright.config.ts` shipped by `@stratawp/testing` now uses the shared config factory: Chromium locally, Chromium, Firefox and WebKit in CI, with the `webServer` block removed and reporters changed to `list` locally and `github` plus `html` in CI. `@playwright/test` is now an optional peer dependency of `@stratawp/testing`.
