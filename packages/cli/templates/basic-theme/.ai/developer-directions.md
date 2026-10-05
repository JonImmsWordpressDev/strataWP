# Developer Directions for AI Agents

This file is your dedicated space to define standing rules for all AI agents working on this theme.

> [!TIP]
> **Theme Developer:** Fill out the sections below once, and every agent will read and follow them automatically during onboarding — no need to repeat instructions in chat.

---

## ✅ Standing rules (prefilled, edit freely)

- Run `pnpm ai:check` and `pnpm review` before finishing. `pnpm review` must report zero errors.
- Keep the text domain equal to the theme slug in `style.css`, in every gettext call, and in pattern slug namespaces.
- Do not add remote scripts or styles; bundle assets with the theme.
- Read the **Theme type** line in `.ai/agent-state.md` before changing templates: block themes use `templates/*.html`, classic themes use PHP templates, hybrid themes use both.

---

## 🎨 Design & Aesthetic Guidelines

_Define the look and feel agents should maintain._

- **Brand Colors:** _(primary, secondary, backgrounds — prefer pointing at `theme.json` tokens)_
- **Typography:** _(font families, scale, line-heights)_
- **Spacing / Grid:** _(gaps, margins, padding system)_
- **Design Tokens:** Check `theme.json` first before hardcoding colors or spacing.

---

## 💻 Coding Conventions & Overrides

_Rules unique to this theme._

- **PHP Standards:** _(namespace preferences, templating habits)_
- **CSS Architecture:** _(naming schemes like BEM, utility class usage)_
- **TypeScript/JS Rules:** _(module conventions, libraries to avoid)_

---

## 🚀 Project Priorities

- **Immediate Focus:**
- **Planned Enhancements:**
- **Strict Constraints:** _(e.g., "Do not modify the checkout templates without asking")_

---

## 📝 Custom Guidelines / Miscellaneous

-
