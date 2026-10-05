---
description: Run and extend the StrataWP theme review (`pnpm review`, `packages/theme-review`).
globs: packages/theme-review/**/*, packages/cli/templates/**/*, examples/**/*
---

# Theme Review (monorepo)

`@stratawp/theme-review` is the checker behind `pnpm review`. It approximates the WordPress.org theme guidelines with static checks and is not a certification.

## Running it

- `pnpm build` first (the root script runs the built `packages/theme-review/dist/cli.js`).
- `pnpm review` reviews all six themes (3 examples, 3 CLI templates). It must report **zero errors**; CI blocks on it. Warnings do not fail.
- One theme: `node packages/theme-review/dist/cli.js examples/basic-theme --json`.
- Template files are byte-identical across the three templates for agent files; when you change a theme file, check the example twin with `cmp`.

## Changing a rule

1. Edit `packages/theme-review/src/rules/structure.ts` (metadata and structure) or `php-scan.ts` (PHP heuristics).
2. Add a pass case and a fail case in `packages/theme-review/src/__tests__/`, using the helpers in `helpers.ts` (`goodHybridFiles()`, `runRule()`).
3. Register new rules only in `src/rules/index.ts`, and document them in the package README and the skill tables.
4. Heuristic rules must default to `warning`. A rule may only be an `error` if a false positive is essentially impossible.
5. Run `pnpm --filter @stratawp/theme-review test`, `pnpm build`, then `pnpm review`.

## Hard rules

- No runtime dependencies in `@stratawp/theme-review` (Node built-ins only).
- Never silence a finding in an example or template by adding `review.rules` or `review.ignore` to its `package.json`; fix the theme or the rule.
- MCP tools stay read-only; regenerate the snapshot with `pnpm --filter @stratawp/mcp snapshot` when tool schemas change.
