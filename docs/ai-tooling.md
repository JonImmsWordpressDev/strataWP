# AI tooling

StrataWP ships a deterministic theme checker and the agent hooks around it, so people and AI agents can verify a theme against the WordPress.org theme guidelines the same way.

## Theme review

`@stratawp/theme-review` runs static checks on a theme directory. It approximates the WordPress.org theme guidelines. It is **not** a certification, and passing it does not guarantee acceptance.

```bash
# In this repository: reviews the three examples and the three templates
pnpm review

# In a generated theme (the package is a devDependency and `review` is a script)
pnpm review
pnpm exec stratawp-review --json     # machine-readable report
pnpm exec stratawp-review --strict   # fail on warnings too
```

Exit codes: `0` pass, `1` errors (or warnings with `--strict`), `2` usage or file problem.

Configure it in the theme's `package.json`:

```json
{
  "stratawp": {
    "themeType": "hybrid",
    "review": {
      "ignore": ["legacy/**"],
      "rules": { "THEME-005": "off", "THEME-009": "info" }
    }
  }
}
```

Always ignored: `vendor/`, `node_modules/`, `dist/`, and `*-generated.*` files. A rule that crashes is reported as an `INTERNAL` warning and the other rules still run.

### Rules

| Id        | Applies to      | Check                                                                              | Default         |
| --------- | --------------- | ---------------------------------------------------------------------------------- | --------------- |
| THEME-001 | all             | `style.css` has Theme Name, Version, License, License URI, Text Domain             | error           |
| THEME-002 | all             | `style.css` has Tested up to, Requires at least, Requires PHP, Description, Author | warning         |
| THEME-003 | all             | `screenshot.png` exists and is 1200×900                                            | error / warning |
| THEME-004 | classic, hybrid | `index.php` exists                                                                 | error           |
| THEME-005 | all             | `readme.txt` exists                                                                | warning         |
| THEME-006 | block, hybrid   | `templates/index.html` and a valid `theme.json` with `$schema` and `version`       | error           |
| THEME-007 | block, hybrid   | pattern headers have Title and a Slug namespaced to the text domain                | warning         |
| THEME-008 | all             | gettext calls use the declared text domain                                         | warning         |
| THEME-009 | all             | top-level functions, classes and constants are prefixed or namespaced              | warning         |
| THEME-010 | all             | no `register_post_type`, `register_taxonomy` or `add_shortcode`                    | warning         |
| THEME-011 | all             | no remote scripts or styles                                                        | warning         |
| THEME-012 | all             | no `eval()` / `create_function()` (error); `base64_decode()` (warning)             | error / warning |
| THEME-013 | classic, hybrid | `wp_head()` and `wp_footer()` are called                                           | error           |

Output escaping is left to PHPCS, which checks it properly. Heuristic rules are warnings, so only `--strict` fails on them.

## Theme type

The checker classifies a theme as `block`, `classic` or `hybrid` and applies the rules that fit.

- **Block markers:** at least one `.html` file in `templates/`.
- **Classic markers:** a root `header.php`, `footer.php`, `sidebar.php`, `home.php`, `single.php`, `page.php`, `archive.php`, `search.php` or `404.php`. `index.php` alone does not count.
- Block markers only is `block`, classic markers only is `classic`, both is `hybrid`. A theme with neither is treated as `classic`.

Override detection with `stratawp.themeType` in `package.json` (see above). `pnpm ai:setup` in a generated theme records the result in `.ai/agent-state.md` as `**Theme type**: <type> (detected|override)`, so agents know which rules apply.

## For agents

- **Skill:** `.ai/skills/theme-review/SKILL.md` tells an agent how to run the checker, interpret findings, fix them and re-run. It is listed in `.ai/SKILLS.md`.
- **CLI:** `stratawp theme:review [dir]` with `--json`, `--strict` and `--type <block|classic|hybrid>`.
- **MCP** (`@stratawp/mcp`, read-only):
  - `review_theme`: input `themeDir` (absolute path), optional `type` and `strict`. Output: `themeType`, `typeSource`, `passed`, `summary` (`errors`, `warnings`, `infos`), `findings` (each with `ruleId`, `severity`, `message`, optional `file` and `line`), and `disclaimer`. `passed` is false on errors, or on warnings when `strict` is true.
  - `detect_theme_type`: input `themeDir`. Output: `themeType` and `typeSource` (`detected` or `override`).

## CI

The `js` job in `.github/workflows/ci.yml` runs `pnpm review` after the build. It is blocking: any error on any of the six themes fails the job. Warnings do not fail it.
