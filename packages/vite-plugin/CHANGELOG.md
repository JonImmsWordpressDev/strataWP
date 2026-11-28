# @stratawp/vite-plugin

## 0.4.0

### Minor Changes

- New opt-in `tokens` option: at build, read `theme.json` and write `tokens.json` and `tokens.css` (palette, gradients, font families, font sizes, spacing sizes, content and wide widths) using WordPress's own `--wp--preset--*` variable names, so a headless frontend can use the theme's design tokens. Off by default. The `themeJsonToTokens` and `tokensToCss` helpers and the `DesignTokens` type are exported.

## 0.3.0

### Minor Changes

- 9754d46: Add AVIF output to the image pipeline, a strict shared Stylelint preset, and a cross-browser smoke-test preset, and ship all three in generated themes. The `playwright.config.ts` shipped by `@stratawp/testing` now uses the shared config factory: Chromium locally, Chromium, Firefox and WebKit in CI, with the `webServer` block removed and reporters changed to `list` locally and `github` plus `html` in CI. `@playwright/test` is now an optional peer dependency of `@stratawp/testing`.
