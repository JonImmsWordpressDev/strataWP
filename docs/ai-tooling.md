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

Rule overrides accept `off`, `info`, `warn` or `error`; anything else (or a wrongly shaped `ignore`/`rules`) is a usage error with exit code 2. Always ignored: `vendor/`, `node_modules/`, `dist/`, and `*-generated.*` files. A rule that crashes is reported as an `INTERNAL` warning and the other rules still run.

### Rules

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
- **Visual skill:** `.ai/skills/visual-checks/SKILL.md` covers capture, compare and the baseline rules. Generated themes ship their own copy.
- **MCP** (`@stratawp/mcp`, read-only):
  - `review_theme`: input `themeDir` (absolute path), optional `type` and `strict`. Output: `themeType`, `typeSource`, `passed`, `summary` (`errors`, `warnings`, `infos`), `findings` (each with `ruleId`, `severity`, `message`, optional `file` and `line`), and `disclaimer`. `passed` is false on errors, or on warnings when `strict` is true.
  - `detect_theme_type`: input `themeDir`. Output: `themeType` and `typeSource` (`detected` or `override`).
  - `capture_screenshots`: see [Screenshots and visual checks](#screenshots-and-visual-checks).

## Screenshots and visual checks

`@stratawp/testing` ships two things: a capture command for looking at a theme, and an opt-in compare gate.

### Capture

```bash
pnpm exec stratawp-screenshots capture
pnpm exec stratawp-screenshots capture --routes=/,/blog --widths=1280,390 --out=shots --base-url=http://localhost:8888
stratawp screenshots --routes=/,/blog     # same command, via the CLI
```

- Flags: `--routes` (site paths), `--widths` (pixels), `--out` (default `.stratawp/screenshots`), `--base-url`.
- Routes are plain paths concatenated onto the base URL. Full URLs and `//host` are rejected.
- Captures are viewport-sized PNGs (not full-page). Files are named `<route-slug>-<width>.png`; `/` becomes `home`.
- It needs a running site and Chromium: `pnpm exec playwright install chromium`.
- One failing route does not stop the others; failures are listed and the exit code is `1`.
- A route that answers HTTP 404 still counts as a successful capture. The default routes include a 404 page on purpose.
- When `--out` points outside the current directory, the printed path is relative (for example `../shots`).
- `stratawp screenshots` runs the theme's own `stratawp-screenshots` bin through `pnpm exec`, so run it from a theme that has `@stratawp/testing` installed.

Exit codes: `0` all captured, `1` a capture failed or the site or browser is unavailable, `2` usage or config problem.

Defaults live in the theme's `package.json`:

```json
{
  "stratawp": {
    "screenshots": {
      "routes": ["/", "/blog", "/this-page-does-not-exist-404/"],
      "widths": [1280, 390]
    }
  }
}
```

Precedence: the flag, then `package.json`, then the `WP_BASE_URL` environment variable (base URL only), then the built-in defaults (`/` and a 404 path; widths 1280 and 390; `http://localhost:8888`).

### MCP tool

`capture_screenshots` in `@stratawp/mcp` (read-only; it sends GET requests to the site and writes no files):

- Input: `baseUrl` (required, http or https), optional `routes` (paths) and `widths`.
- Output: image content for each screenshot, plus structured `captured` (`route`, `width`, `name`, `bytes`) and `failures` (`route`, `width`, `message`).
- Caps: at most 6 images per call (routes x widths), at most 2 widths, viewport-sized captures. Over-limit input is an error result.
- The site must already be running.

### Compare (opt-in)

`createVisualConfig({ testDir, baseURL?, maxDiffPixelRatio? })` from `@stratawp/testing/config` is a Playwright preset: Chromium only, `toHaveScreenshot`, `retries: 0`, one worker, and baselines at `<testDir>/__screenshots__/<spec file>/<name>.png`. `maxDiffPixelRatio` defaults to `0.01` and must be between 0 and 1. The example theme and all three templates ship a visual spec, `playwright.visual.config.ts` and a `test:visual` script.

```bash
pnpm test:visual
```

Baselines are recorded on the CI runner, never locally, because fonts and rendering differ between machines. Using the Visual workflow (`.github/workflows/visual.yml`, dispatch-only):

1. In GitHub, open Actions, pick **Visual**, choose **Run workflow** with mode `record`.
2. When it finishes, download the `visual-baselines` artifact.
3. Commit its contents under `e2e/visual/__screenshots__/` in the theme.

From then on, run the workflow with mode `compare` (or `pnpm test:visual` against a site rendered the same way) to fail on a diff. Things to know:

- The Visual workflow can only be dispatched once `visual.yml` is on the default branch, so the first `record` run happens after the PR that adds it is merged.
- With no baselines committed, the first `compare` run **fails**: a missing baseline is written and the test fails. Record first.
- `--update-snapshots` (what record mode uses) rewrites only missing or changed baselines. Drift that stays within the tolerance is not refreshed.
- `test:visual` and the workflows need Docker (wp-env) and are verified on CI only.

### Smoke capture

The `smoke.yml` job also runs one capture against wp-env (home and 404, desktop and mobile) and uploads the images as the `smoke-screenshots` artifact. It fails the job if capture breaks.

### Why compare is opt-in

Pixel diffs flake across machines: fonts, anti-aliasing and GPU rendering all shift results. A default blocking gate would fail for reasons unrelated to the change, so compare stays opt-in and baselines come from a single, fixed environment (the CI runner).

## CI

The `js` job in `.github/workflows/ci.yml` runs `pnpm review` after the build. It is blocking: any error on any of the six themes fails the job. Warnings do not fail it.
