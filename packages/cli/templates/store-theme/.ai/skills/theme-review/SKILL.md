---
description: Review this theme against the WordPress.org theme guidelines with `pnpm review`, then fix the findings.
globs: style.css, theme.json, templates/**/*, parts/**/*, patterns/**/*, **/*.php
---

# Theme Review

`pnpm review` runs the StrataWP theme checker (`@stratawp/theme-review`) on this theme. It approximates the WordPress.org theme guidelines with static checks. It is **not** a certification.

## When to run it

- Before declaring any task complete that touched `style.css`, `theme.json`, templates, parts, patterns, PHP files, or the screenshot.
- After renaming a theme or changing its text domain.

## Steps

1. Read the **Theme type** line in `.ai/agent-state.md` (block, classic or hybrid). Rules apply per type.
2. Run `pnpm review`. Add `--json` for machine-readable output and `--strict` to fail on warnings too.
3. Fix every **error**. Errors make the command exit 1.
4. Fix **warnings** that are real and cheap. If a heuristic warning is a false positive for this theme, change its severity in `package.json` under `stratawp.review.rules` (`off`, `info`, `warn` or `error`) instead of contorting the code.
5. Re-run until clean, and quote the summary line (`N errors, N warnings, N info`) in your final report. Do not claim a pass you did not run.

## What it checks

| Id        | Check                                                                              | Default         |
| --------- | ---------------------------------------------------------------------------------- | --------------- |
| THEME-001 | `style.css` has Theme Name, Version, License, License URI, Text Domain             | error           |
| THEME-002 | `style.css` has Tested up to, Requires at least, Requires PHP, Description, Author | warning         |
| THEME-003 | `screenshot.png` exists and is 1200×900                                            | error / warning |
| THEME-004 | `index.php` exists (classic, hybrid)                                               | error           |
| THEME-005 | `readme.txt` exists                                                                | warning         |
| THEME-006 | `templates/index.html` and a valid `theme.json` (block, hybrid)                    | error           |
| THEME-007 | Pattern headers have Title and a Slug namespaced to the text domain                | warning         |
| THEME-008 | gettext calls use this theme's text domain                                         | warning         |
| THEME-009 | Top-level functions, classes and constants are prefixed or namespaced              | warning         |
| THEME-010 | No `register_post_type`, `register_taxonomy`, `add_shortcode`                      | warning         |
| THEME-011 | No remote scripts or styles                                                        | warning         |
| THEME-012 | No `eval()` / `create_function()`; `base64_decode()` discouraged                   | error / warning |
| THEME-013 | `wp_head()` and `wp_footer()` are called (classic, hybrid)                         | error           |

Output escaping is not checked here; PHPCS covers it.

## Configuration (`package.json`)

```json
{
  "stratawp": {
    "themeType": "hybrid",
    "review": {
      "ignore": ["legacy/**"],
      "rules": { "THEME-005": "off" }
    }
  }
}
```

Always ignored: `vendor/`, `node_modules/`, `dist/`, and `*-generated.*`.

## MCP

If the `@stratawp/mcp` server is available, the `review_theme` and `detect_theme_type` tools give the same verdicts as `pnpm review`.
