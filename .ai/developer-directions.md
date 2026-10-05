# Developer Directions for AI Agents

Standing rules for every AI agent working in this repository. Agents read this during onboarding and must follow it.

> [!NOTE]
> Drafted from `CLAUDE.md` and the maintainer's standing instructions. **Maintainer: review the wording.**

---

## 🎨 Design & Aesthetic Guidelines

- This repository is a framework; example themes should stay neutral and token-driven.
- **Design Tokens:** check each theme's `theme.json` first before hardcoding colors or spacing.

---

## 💻 Coding Conventions & Structural Overrides

- **PHP:** `packages/core` follows WordPress Coding Standards (tabs, Yoda, escaped output) and must pass PHPStan with no new baseline entries.
- **CSS:** `@stratawp/stylelint-config` is a blocking gate (nesting depth 3, specificity `0,3,1`). Never add `stylelint-disable` comments to pass it.
- **TypeScript:** strict mode, ESM, Prettier-formatted.
- **Builds:** pnpm only. Run `pnpm ai:check` before finishing; run `pnpm review` when you change an example theme or CLI template.

---

## 🚀 Project Priorities & Roadmap

- **Shipped:** quality gates (AVIF, Stylelint preset, cross-browser smoke tests). In progress: AI tooling (theme review, then screenshots and visual compare).
- **Planned:** design tokens, blocks and components, Site Editor sync, child-theme generator.
- **Strict constraints:**
  - Never deploy to production from this monorepo; production themes live in separate repositories.
  - Stage files by explicit path; never `git add -A` or `git add .`.
  - No attribution of any kind in commits or PR descriptions: no `Co-Authored-By` trailer and no "Generated with" line.
  - Do not mention external projects or competitors in code, comments, docs, commits, or branch names.
  - A new published npm package needs a manual first publish and a trusted-publisher entry before its release tag (see `.ai/skills/releases/SKILL.md`).

---

## 📝 Custom Guidelines / Miscellaneous

- Specs and plans for features live in `docs/superpowers/specs` and `docs/superpowers/plans`; contract-first applies to non-trivial work.
