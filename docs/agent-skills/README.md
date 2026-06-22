# WordPress Agent Skills for StrataWP

StrataWP includes a curated set of WordPress-specific Claude skills from the official [WordPress/agent-skills](https://github.com/WordPress/agent-skills/) repository. These skills provide structured workflows, best practices, and guardrails for WordPress development.

## What Are Agent Skills?

Agent skills are portable instruction bundles that teach AI assistants (like Claude) how to perform specific WordPress development tasks correctly. Each skill includes:

- **Procedures**: Step-by-step workflows with verification checkpoints
- **Guardrails**: Safety rules and constraints to prevent mistakes
- **References**: Deep-dive documentation on specific topics
- **Scripts**: Deterministic inspection tools for project analysis

## Quick Links

- [Getting Started](./getting-started.md) - First-time setup and basic usage
- [Cheat Sheet](./cheat-sheet.md) - Quick reference for common workflows
- [Use Cases](./use-cases.md) - Real-world scenarios and examples

## Available Skills

| Skill                                           | When to Use                                              |
| ----------------------------------------------- | -------------------------------------------------------- |
| [wordpress-router](#wordpress-router)           | Starting any WordPress task - routes to correct workflow |
| [wp-project-triage](#wp-project-triage)         | Analyzing a repo to understand its structure             |
| [wp-block-development](#wp-block-development)   | Creating or modifying Gutenberg blocks                   |
| [wp-block-themes](#wp-block-themes)             | Working with FSE themes, theme.json, templates           |
| [wp-interactivity-api](#wp-interactivity-api)   | Adding interactive behavior to blocks                    |
| [wp-rest-api](#wp-rest-api)                     | Building or debugging REST endpoints                     |
| [wp-performance](#wp-performance)               | Profiling and optimizing WordPress                       |
| [wp-plugin-development](#wp-plugin-development) | Building WordPress plugins                               |
| [wp-wpcli-and-ops](#wp-wpcli-and-ops)           | WP-CLI operations and automation                         |
| [wp-phpstan](#wp-phpstan)                       | Static analysis configuration                            |

## Skill Details

### wordpress-router

**Purpose**: Entry point for most WordPress tasks. Classifies the repo and routes to the appropriate domain skill.

**Use when**:

- Starting work on any WordPress codebase
- Unsure which skill to use
- Need to understand repo structure first

**Key workflow**:

1. Runs `wp-project-triage` to classify repo
2. Identifies project type (plugin/theme/block theme/full site)
3. Routes to appropriate domain skill based on task

---

### wp-project-triage

**Purpose**: Deterministic inspection of WordPress repositories. Outputs structured JSON with project classification.

**Use when**:

- First time working with a WordPress repo
- After significant structural changes
- Need to verify tooling/test setup

**Output includes**:

- Project kind (plugin, theme, block-theme, wp-core, gutenberg, full-site)
- Tooling (Composer, npm/pnpm, @wordpress/scripts, Vite)
- Tests present (PHPUnit, Playwright, wp-env)
- Version hints (WordPress, PHP requirements)

---

### wp-block-development

**Purpose**: Creating and modifying Gutenberg blocks following current best practices.

**Use when**:

- Creating new blocks
- Updating blocks to apiVersion 3
- Adding deprecations for attribute changes
- Working with InnerBlocks or block variations

**Key concepts**:

- `block.json` metadata (apiVersion 3)
- `render.php` for dynamic blocks
- Deprecation patterns
- Edit/Save component architecture

---

### wp-block-themes

**Purpose**: Full Site Editing theme development with theme.json, templates, and patterns.

**Use when**:

- Creating or modifying theme.json
- Building FSE templates
- Creating template parts
- Designing block patterns
- Setting up style variations

**Key concepts**:

- theme.json v3 schema
- Template hierarchy for FSE
- Pattern registration
- Global styles and presets

---

### wp-interactivity-api

**Purpose**: Adding interactive behavior to blocks using WordPress's Interactivity API.

**Use when**:

- Adding client-side interactivity to blocks
- Using `data-wp-*` directives
- Working with stores and state
- Debugging hydration issues

**Key concepts**:

- `data-wp-interactive` namespace
- Store definitions (state, actions, callbacks)
- Server-side rendering for initial state
- `viewScriptModule` in block.json

---

### wp-rest-api

**Purpose**: Building and debugging WordPress REST API endpoints.

**Use when**:

- Registering custom endpoints
- Debugging 401/403/404 errors
- Adding fields to existing responses
- Implementing authentication

**Key concepts**:

- `register_rest_route()` patterns
- `WP_REST_Controller` architecture
- Schema validation
- Permission callbacks
- Authentication methods

---

### wp-performance

**Purpose**: Backend performance profiling and optimization.

**Use when**:

- Site/page/endpoint is slow
- Optimizing database queries
- Investigating cron issues
- Setting up object caching

**Key concepts**:

- WP-CLI `doctor` and `profile` commands
- Query Monitor headless usage
- Autoload optimization
- N+1 query prevention

---

### wp-plugin-development

**Purpose**: WordPress plugin architecture and best practices.

**Use when**:

- Creating new plugins
- Adding activation/deactivation hooks
- Building settings pages
- Implementing security measures

**Key concepts**:

- Plugin header and bootstrap
- Hook registration patterns
- Settings API
- Nonces and capabilities

---

### wp-wpcli-and-ops

**Purpose**: WP-CLI operations and automation scripts.

**Use when**:

- Database migrations
- URL/domain changes
- Plugin/theme management
- Multisite operations
- Building automation scripts

**Key concepts**:

- Safe `search-replace` workflow
- `wp-cli.yml` configuration
- Multisite targeting
- Backup best practices

---

### wp-phpstan

**Purpose**: Static analysis configuration for WordPress projects.

**Use when**:

- Setting up PHPStan
- Managing baselines
- Adding WordPress-specific typing
- Handling third-party plugin classes

**Key concepts**:

- `phpstan.neon` configuration
- WordPress stubs
- Baseline management
- WordPress-specific PHPDoc patterns

## Directory Structure

```
.claude/skills/
├── wordpress-router/
│   ├── SKILL.md
│   └── references/
│       └── decision-tree.md
├── wp-project-triage/
│   ├── SKILL.md
│   ├── references/
│   │   └── triage.schema.json
│   └── scripts/
│       └── detect_wp_project.mjs
├── wp-block-development/
│   ├── SKILL.md
│   └── references/
│       ├── deprecations.md
│       ├── inner-blocks.md
│       └── ...
└── ... (other skills)
```

## Integration with StrataWP

These skills are pre-configured to work with StrataWP's:

- **Vite build system**: Skills detect `vite.config.ts` and adapt workflows
- **TypeScript**: Block and component generation uses TypeScript
- **FSE-first approach**: `wp-block-themes` skill aligns with StrataWP's template system
- **Component architecture**: `wp-plugin-development` patterns match StrataWP's PHP components

## Attribution

Skills sourced from [WordPress/agent-skills](https://github.com/WordPress/agent-skills/) under the WordPress project. All skills target WordPress 6.9+ with PHP 7.2.24+.
