# StrataWP Skill Directory

This directory maps all specialized skills available to AI agents in this repository. Refer to these for deep domain knowledge, step-by-step recipes, and architectural constraints.

## 🛠 Foundational Pillars

These skills define the core development workflow in StrataWP.

- [**Architecture & Conventions**](skills/architecture/SKILL.md): Monorepo layout, PHP component architecture, build pipeline.
- [**Feature Planning**](skills/feature-planning/SKILL.md): Contract-first strategy for planning specs and clarifications.
- [**Code Quality Standards**](skills/code-quality/SKILL.md): ESLint, Prettier, TypeScript, PHPCS, and the `ai:check` gate.

## 🧱 Building

- [**PHP Components**](skills/php-components/SKILL.md): Creating and registering theme components via `ComponentInterface`.
- [**Gutenberg Blocks**](skills/gutenberg-blocks/SKILL.md): Scaffolding, auto-registration, and building custom blocks.
- [**Testing**](skills/testing/SKILL.md): Vitest unit tests, Playwright accessibility E2E, wp-env.

## ⚙️ Operations

- [**Deployment & Sync**](skills/deployment/SKILL.md): SFTP/SSH deploys, database sync, snapshots, and rollback.
- [**Releases & Publishing**](skills/releases/SKILL.md): Changesets, OIDC npm publishing, theme release zips.

## 🧪 Workflow & Quality

- [**Agent Self-Code Review**](skills/agent-code-review/SKILL.md): Mandatory self-review protocol before concluding tasks.
- [**Theme Review**](skills/theme-review/SKILL.md): Run and extend the theme checker (`pnpm review`).
- [**Onboarding Guide**](ONBOARDING.md): First-time setup protocol.

## 📚 WordPress Domain Skills (`.claude/skills/`)

Deep WordPress knowledge sourced from the official WordPress agent-skills project. Any agent may read these; start with the router.

- **wordpress-router**: Classifies the repo and routes to the correct workflow.
- **wp-project-triage**: Deterministic repo inspection and JSON report.
- **wp-block-development**: block.json, apiVersion 3, deprecations, InnerBlocks.
- **wp-block-themes**: theme.json, templates, parts, patterns, style variations.
- **wp-interactivity-api**: data-wp-\* directives, stores, hydration.
- **wp-rest-api**: register_rest_route, controllers, schema, authentication.
- **wp-performance**: Profiling, object cache, query optimization.
- **wp-plugin-development**: Plugin architecture, hooks, Settings API, security.
- **wp-wpcli-and-ops**: WP-CLI operations and automation.
- **wp-phpstan**: Static analysis configuration and baselines.
