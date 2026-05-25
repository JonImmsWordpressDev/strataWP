# StrataWP Roadmap

## What StrataWP is (and isn't)

A modern, type-safe scaffolding + dev server + deploy pipeline for WordPress block themes, with a small library of opt-in PHP Components for the boring stuff every theme needs.

**Not an admin UI. Not an AI SDK. Not a component registry.** The framework is **CLI + Vite plugin + PHP Components + Sync.**

## v2.0 — Focus (this release)

### Removed

- **`@stratawp/studio`** — Admin UIs duplicate what the Site Editor and your IDE already do well. A custom React admin app is a large maintenance commitment that doesn't fit the audience StrataWP serves (developers building production block themes).
- **`@stratawp/registry`** — A custom component registry needs critical mass to be useful, and we don't have it. npm + private packages already solve the "share components between projects" problem without locking anyone into our ecosystem.
- **`@stratawp/ai`** — Every editor now ships AI (MCP, Claude Code, Copilot, Cursor). A framework-embedded AI SDK is a shrinking-value commitment that adds maintenance burden without differentiating.

### Under review for v2.1

These packages aren't being cut now, but warrant an honest look:

- **`@stratawp/explorer`** — Storybook is widely understood and works fine for the niche audience that wants a component browser. If `explorer` isn't actively used or maintained, recommending Storybook in its place removes a package we'd otherwise have to keep building.
- **`@stratawp/headless`** — The typed REST client carries ongoing cost as WordPress core changes shape. If headless WP isn't actively being built on, it's worth removing rather than letting it drift out of date.

Decision criterion for both: real usage signal (downloads, issues, recent commits) and active maintenance interest.

## What we're investing in (ranked by leverage)

1. **Git-based deployer.** The v1.0 CHANGELOG advertised "SFTP, FTP, SSH/rsync (coming soon), Git (coming soon)." SSH/rsync landed in v1.6; Git is the last unshipped promise. Finishing it gives push-to-deploy workflows that complete the deployment story started in v1.0.
2. **`stratawp doctor`.** A diagnostic CLI command that finds broken symlinks (common in Local by Flywheel setups), invalid `theme.json` schemas, missing PHP Components the theme expects, deploy config mistakes, and PHP/Node version mismatches. Cheap to build, dramatically reduces support overhead.
3. **Type-safe `block.json` codegen.** The Vite plugin generates TypeScript types from each block's `block.json` so attributes are typed in `edit.tsx` / `save.tsx`. Nothing else in the WP ecosystem does this well — it's the kind of feature that becomes a talking-point.
4. **`stratawp adopt`.** A retrofit command for existing themes, not just greenfield. Removes the biggest current adoption barrier: developers with running themes who'd otherwise have to migrate from scratch.
5. **New PHP Components.** Candidate list, picked one at a time based on demand: **Errors** (Sentry/Bugsnag), **Cookies/Consent** (pairs with `Analytics`), **Forms** (lightweight, no Gravity Forms dependency), **Cache** (object cache helpers with WP-CLI integration).
6. **Performance budgets in `build`.** Fail the build if JS or CSS exceeds thresholds in `stratawp.config.ts`. One day of work, lifelong payoff for any team that ships to production.

## What we're explicitly not building

- **Admin UIs.** The Site Editor handles design tokens, templates, and patterns. Your IDE handles code. We don't need a third surface.
- **AI SDK lock-in.** MCP, Claude Code, Copilot, and Cursor are where AI lives now. Recommending them in the docs beats baking in a wrapper.
- **A component registry.** Use npm. If you need privacy, use private npm packages or a private registry like Verdaccio. We don't need to be in that business.
