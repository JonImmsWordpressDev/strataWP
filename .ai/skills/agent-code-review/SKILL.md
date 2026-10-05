---
description: Mandatory self-review protocol for AI agents before concluding any StrataWP task.
globs: packages/**/*, examples/**/*
---

# Agent Self-Code Review

Before declaring any task complete, run this protocol against your own changes. It exists because the most common agent failure modes are predictable: edited artifacts, skipped verification, silent scope creep, and unstated assumptions.

## Step 1: Diff Audit

Run `git status` and `git diff` and check every touched file:

- [ ] No generated files edited (`dist/`, `inc/blocks-generated.php`, `packages/cli/templates/*/vendor/`, lockfile changes you didn't intend).
- [ ] No stray debug output (`console.log`, `var_dump`, `error_log`) or commented-out code.
- [ ] Every change traces to the approved plan or the user's request — nothing smuggled in.
- [ ] No references to internal codenames, prior-art projects, or AI-conversation context in code, comments, or docs.

## Step 2: Convention Audit

- [ ] pnpm-only commands in any docs/scripts you touched.
- [ ] New filters prefixed `stratawp_`; slugs kebab-case; PHP classes PascalCase.
- [ ] TypeScript strict-mode clean — no `any` escapes or `@ts-ignore` additions.
- [ ] Escaping/sanitization on any new PHP output.
- [ ] Comments state constraints the code can't show — not narration of the change.

## Step 3: Verification Evidence

- [ ] `pnpm ai:check` executed and passing (paste the result summary, don't assert it).
- [ ] Surface-specific suites run when applicable (`pnpm test:e2e` for rendered output, `pnpm test:perf` for loading behavior, `pnpm lint:php` for theme PHP, `pnpm review` for theme metadata, templates and patterns).
- [ ] New behavior covered by a test that fails without the change.
- [ ] If verification was skipped or impossible (e.g., no wp-env available), this is stated explicitly in the final report — never implied as done.

## Step 4: Knowledge Capture

- [ ] Significant architectural decisions logged in `.ai/PROJECT_RULES.md` (dated entry: Context / Decision / Key Learning).
- [ ] Public API changes reflected in `CLAUDE.md` and, if user-facing, `README.md` / `docs/`.
- [ ] Package changes have a changeset if they affect a published package.

## Step 5: Honest Reporting

The final report to the user must:

1. Lead with what changed and whether it is verified.
2. List anything skipped, failing, or assumed — with the reason.
3. Flag follow-up work discovered but not done (don't do it silently; don't hide it either).

> A task reported as "done" with an unstated failing check is worse than a task reported as "blocked". Accuracy over optics, always.
