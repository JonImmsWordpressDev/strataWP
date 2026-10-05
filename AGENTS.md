# StrataWP AI Agents Guide

Welcome, AI Agent! StrataWP is a TypeScript-first WordPress theme framework built as a Turborepo/pnpm monorepo. To work in this repository safely and effectively, you **MUST** follow these five core pillars.

---

### 1. ONBOARDING & STATE PROTOCOL

Before starting, check `.ai/agent-state.md` for your status:

- **If Pending:** Follow [**The Onboarding Guide**](.ai/ONBOARDING.md) (run `pnpm ai:setup` once, read [**Developer Directions**](.ai/developer-directions.md), read/initialize [**Project Rules**](.ai/PROJECT_RULES.md), and mark state as Completed).
- **If Completed:** Read [**Project Rules**](.ai/PROJECT_RULES.md) for dynamic, self-learned repository conventions, and keep it updated with new architectural decisions. Proceed directly to the user's task. Do NOT re-run setup.

### 2. ARCHITECTURE & BUILD PIPELINE

- **Source files only.** NEVER edit compiled artifacts (`dist/`, `*.min.*`, generated manifests). Edit only source files (`src/`, `packages/*/src/`). See the [**Architecture skill**](.ai/skills/architecture/SKILL.md).
- **Vendored core is generated.** `packages/cli/templates/*/vendor/stratawp/core/` is a snapshot refreshed automatically on `prepack`. Never hand-edit it — change `packages/core/src/` instead.
- **pnpm only.** This monorepo uses pnpm workspaces and Turborepo. Never use `npm` or `yarn` for installs or workspace scripts.
- **Scaffold, don't hand-roll.** Use the CLI generators (`stratawp block:new`, `stratawp component:new`, `stratawp template:new`, `stratawp part:new`) rather than manually bootstrapping files. See the [**PHP Components**](.ai/skills/php-components/SKILL.md) and [**Gutenberg Blocks**](.ai/skills/gutenberg-blocks/SKILL.md) skills.

### 3. CONTRACT-FIRST DEVELOPMENT

- Do not modify source files for a non-trivial feature without an approved plan. Author a spec in `.ai/plans/` and ask clarifying questions first until you reach a >95% confidence score. See the [**Feature Planning skill**](.ai/skills/feature-planning/SKILL.md).
- Trivial fixes (typos, single-line bugs, lint cleanup) do not require a spec.

### 4. CONFIGURATION FIRST

- Reference `turbo.json`, `pnpm-workspace.yaml`, and the relevant package's `package.json` / `vite.config.ts` / `theme.json` before making build or architectural changes.
- `CLAUDE.md` documents the canonical commands and package map — treat it as the source of truth for repo conventions.

### 5. PRE-FLIGHT QUALITY CHECK

- Run `pnpm ai:check` before submitting to ensure compliance with ESLint, Prettier, TypeScript, and the unit test suite. See the [**Code Quality skill**](.ai/skills/code-quality/SKILL.md).
- If you changed an example theme or CLI template (templates, patterns, `style.css`, `theme.json`, PHP), run `pnpm review`: it must report zero errors. See the [**Theme Review skill**](.ai/skills/theme-review/SKILL.md).
- Accessibility is enforced in CI (axe-core via Playwright, WCAG 2.1 A/AA). Run `pnpm test:e2e` against a running wp-env when your change affects rendered front-end output.

---

## AI Agent Skill Directory

Refer to [**.ai/SKILLS.md**](.ai/SKILLS.md) for the full directory of specialized skills, including:

- **Foundational:** Architecture, Feature Planning, Code Quality.
- **Building:** PHP Components, Gutenberg Blocks, Testing.
- **Operations:** Deployment & Sync, Releases & Publishing.
- **Workflow:** Agent Self-Code Review.

WordPress domain skills (block development, theme.json, REST API, WP-CLI, performance, PHPStan) live in `.claude/skills/` and apply to any agent that can read them — start with `.claude/skills/wordpress-router/SKILL.md`.

## Capabilities & Tooling

- **Theme review (MCP):** the `@stratawp/mcp` server also exposes read-only `review_theme` and `detect_theme_type` tools backed by `@stratawp/theme-review`.
- **Docs search (MCP):** Run `pnpm mcp:docs` to start the Model Context Protocol server that indexes and searches this repository's documentation (`CLAUDE.md`, `docs/`, `.ai/`, package READMEs).
- **Scaffolding & catalog (MCP):** The `@stratawp/mcp` package (`packages/mcp`, bin `stratawp-mcp`) exposes the framework's generators and component catalog as MCP tools/resources.
- **Verification:** Run `pnpm ai:check` for the combined lint, format, typecheck, and unit-test gate.
- **Agent setup:** Run `pnpm ai:setup` to generate instruction files for your specific coding agent (Cursor, Copilot, Gemini, Windsurf).
