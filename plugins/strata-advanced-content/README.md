# StrataWP Advanced Content

Companion plugin for the StrataWP Advanced theme. It registers the portfolio, team, testimonial and case-study content types (and their taxonomies) that the theme's blocks and layouts display.

| Post type     | Rewrite slug   | Taxonomies                                  |
| ------------- | -------------- | ------------------------------------------- |
| `portfolio`   | `portfolio`    | `portfolio_category`, `portfolio_tag`       |
| `team`        | `team`         | `team_department`                           |
| `testimonial` | `testimonials` |                                             |
| `case_study`  | `case-studies` | `case_study_industry`, `case_study_service` |

## Install

Copy this folder into `wp-content/plugins` and activate it under Plugins. `create-stratawp` can do the copy for you when it links a new Advanced theme to a local WordPress site.

The theme runs without the plugin: the portfolio and team blocks render nothing until the content types exist.

The copy under `packages/cli/templates/plugins/strata-advanced-content` is what the scaffolder installs. Keep it identical to this folder (a test enforces it).
