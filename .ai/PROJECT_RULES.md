# Project Rules & Learned Guidelines

This file is generated and updated over time by the AI agents assisting with StrataWP's development. It acts as long-term memory: a running log of project-specific guidelines, discovered architectural patterns, and decisions made during development.

> [!IMPORTANT]
> **AI Agents:** This file contains dynamic, project-specific rules discovered and written during development. You **MUST** read this file on onboarding and keep it updated with new architectural decisions and conventions established during your work.

---

## 🏗️ Discovered Repository Configuration

<!--
Agent: Document the specific setup of this repository as you discover it (workspace layout, build pipeline, CI gates, environment quirks, etc.).
-->

- **Repository Type:** Turborepo + pnpm workspace monorepo (packages under `packages/*`, themes under `examples/*`).
- **Package Manager:** pnpm ONLY (`packageManager: pnpm@8.x`). Never `npm` or `yarn` for installs or workspace scripts.
- **PHP Core Distribution:** `packages/core` is NOT on Packagist. Themes get it vendored — CLI templates bundle a snapshot at `packages/cli/templates/*/vendor/stratawp/core/`, auto-refreshed by `packages/cli/scripts/sync-template-vendor.mjs` on `prepack`. Never hand-edit the snapshot.
- **npm Publishing:** Trusted publishing via OIDC (`.github/workflows/publish-npm.yml`). No `NPM_TOKEN` secret exists. New packages need a trusted-publisher entry on npmjs.com before their first CI publish.
- **Accessibility Gate:** CI runs axe-core (Playwright) against the built `examples/basic-theme` on wp-env and fails on any WCAG 2.1 A/AA violation.

---

## 🎨 Discovered Design System & Tokens

<!--
Agent: Document custom colors, spacing systems, and typography rules configured for the example themes. Refer to each theme's theme.json.
-->

- **Color Palette:**
- **Typography Rules:**
- **Spacing Scale:**

---

## 💻 Project-Specific Coding Patterns

<!--
Agent: Document the custom architectural habits and patterns established in this repository (e.g., custom hooks, naming standards, specific APIs to use or avoid).
-->

- **PHP Components:** Implement `ComponentInterface` (`get_slug()` + `initialize()`); register through the `Theme` class constructor. The `stratawp_theme_components` filter is the extension point.
- **Filter Naming:** Framework filters are prefixed `stratawp_` (e.g., `stratawp_conditional_css_files`, `stratawp_preconnect_hints`, `stratawp_defer_scripts`).
- **Block Patterns:** Follow the pattern-authoring rules in `CLAUDE.md` — native blocks first, `wp:html` only when it earns its keep, no bare HTML comments between blocks.
- **TypeScript:** Strict mode across packages; file names kebab-case for TS, PascalCase for PHP classes.

---

## 📝 Running Architectural Decisions & Learnings Log

<!--
Agent: Keep a chronological log of major design decisions, local gotchas, or unique implementations here. This prevents future agents (or yourself after a context clear) from repeating mistakes or refactoring working structures.

Entry format:

### 📅 YYYY-MM-DD - Short Title
- **Context:** What prompted the decision.
- **Decision:** What was done and where.
- **Key Learning:** The reusable insight for future work.
-->

### 📅 2026-10-03 - Quality gates (AVIF, Stylelint, cross-browser smoke)

- **Context:** Generated themes and the monorepo needed a stricter, shared performance and quality bar.
- **Decision:** New gates are blocking in CI from day one. Each gate lives in its owning package: AVIF in `@stratawp/vite-plugin` and core `ImageSizes`, rules in the new `@stratawp/stylelint-config`, smoke preset in `@stratawp/testing/config`. The Stylelint preset enforces `max-nesting-depth` 3, `selector-max-specificity` `0,3,1` and kebab-case custom properties (WordPress `--` segments allowed). Smoke tests run on Chromium, Firefox and WebKit in CI (`smoke.yml`); the axe gate stays Chromium-only. A scoped exception raises the specificity cap to `0,5,2` for `**/*woocommerce*.{css,scss}` files; the global cap stays `0,3,1`. See `docs/quality-gates.md`.
- **Key Learning:** Stylelint counts nesting levels inside the root rule, so depth 3 passes four selectors deep and fails five; pseudo-classes and at-rules do not count. Nested selectors are resolved before the specificity rule runs, so one rule can trigger both. WooCommerce overrides must match core specificity to win, hence the scoped exception. `@stratawp/stylelint-config` is a new package: add its npm trusted-publisher entry (repo + `publish-npm.yml`) and publish it before generated themes can install it.

### 📅 2026-10-05 - Theme review and theme-type detection

- **Context:** Agents and maintainers needed a deterministic way to check themes against the WordPress.org guidelines.
- **Decision:** Theme review is a deterministic checker (`@stratawp/theme-review`) plus the `theme-review` agent skill; the package is dependency-light and its heuristic rules (text domain, prefixes, remote assets) are warnings, so only `--strict` fails on them. Theme type (block, classic, hybrid) is detected from files, with a `stratawp.themeType` override in `package.json`; all six StrataWP themes classify as hybrid. The self-check is a blocking `pnpm review` step in the `js` CI job. See `docs/ai-tooling.md`.
- **Key Learning:** `@stratawp/theme-review` is a new package: it needs a manual first publish and a trusted-publisher entry (repo + `publish-npm.yml`) before the release tag, because the CLI templates pin it.
