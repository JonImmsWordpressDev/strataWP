# @stratawp/theme-review

Theme review checks for StrataWP themes. It approximates the WordPress.org theme guidelines with static checks. It is **not** a certification.

```bash
pnpm add -D @stratawp/theme-review
pnpm exec stratawp-review            # review the current directory
pnpm exec stratawp-review --json     # machine-readable report
pnpm exec stratawp-review --strict   # fail on warnings too
pnpm exec stratawp-review --type=classic   # override the detected theme type (block, classic or hybrid)
```

Exit codes: `0` pass, `1` errors (or warnings with `--strict`), `2` usage or file problem.

## Theme types

The checker detects whether a theme is `block`, `classic` or `hybrid` (block templates plus PHP templates) and applies the rules that fit. Override it in `package.json`:

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

Rule overrides accept `off`, `info`, `warn` or `error`. Always ignored: `vendor/`, `node_modules/`, `dist/`, and `*-generated.*` files.

## Rules

| Id        | Applies to      | Check                                                                                                                                            | Default         |
| --------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| THEME-001 | all             | `style.css` has Theme Name, Version, License, License URI, Text Domain                                                                           | error           |
| THEME-002 | all             | `style.css` has Tested up to, Requires at least, Requires PHP, Description, Author                                                               | warning         |
| THEME-003 | all             | a `screenshot.{png,jpg,jpeg,gif,webp,avif}` exists; a PNG is checked for 1200×900                                                                | error / warning |
| THEME-004 | classic, hybrid | `index.php` exists                                                                                                                               | error           |
| THEME-005 | all             | `readme.txt` exists                                                                                                                              | warning         |
| THEME-006 | block, hybrid   | `templates/index.html` and a valid `theme.json` with `version` (a missing `$schema` is a warning); in hybrid themes only once either file exists | error           |
| THEME-007 | block, hybrid   | pattern headers have Title and a Slug namespaced to the text domain                                                                              | warning         |
| THEME-008 | all             | gettext calls use the declared text domain                                                                                                       | warning         |
| THEME-009 | all             | top-level functions, classes and constants are prefixed or namespaced                                                                            | warning         |
| THEME-010 | all             | no `register_post_type`, `register_taxonomy` or `add_shortcode`                                                                                  | warning         |
| THEME-011 | all             | no remote scripts or styles                                                                                                                      | warning         |
| THEME-012 | all             | no `eval()` / `create_function()` (error); `base64_decode()` (warning)                                                                           | error / warning |
| THEME-013 | classic, hybrid | `wp_head()` and `wp_footer()` are called                                                                                                         | error           |

Output escaping is left to PHPCS, which checks it properly.
