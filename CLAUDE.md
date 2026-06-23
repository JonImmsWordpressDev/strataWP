# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StrataWP is a modern WordPress theme framework featuring TypeScript-first development, Vite-powered builds, and Full Site Editing (FSE) support. This is a monorepo managed with Turborepo and pnpm workspaces.

## Build System & Commands

### Monorepo Management

```bash
# Install all dependencies
pnpm install

# Run all packages in dev mode with HMR
pnpm dev

# Build all packages for production
pnpm build

# Run tests across all packages
pnpm test

# Format code
pnpm format

# Clean all build artifacts
pnpm clean
```

### Working with Individual Packages

```bash
# Navigate to specific package
cd packages/cli           # CLI tool
cd packages/vite-plugin   # Vite integration
cd packages/core          # PHP framework
cd examples/basic-theme   # Example theme

# Package-specific commands
pnpm dev          # Development mode with watch
pnpm build        # Build for production
pnpm test         # Run tests (where applicable)
```

### CLI Development

After making changes to the CLI package:

```bash
cd packages/cli
pnpm build
npm install -g .    # Updates global stratawp command
stratawp --help     # Verify changes
```

### Testing Example Themes

```bash
cd examples/basic-theme
pnpm dev           # Start Vite dev server on port 3000

# In WordPress, activate the theme and visit site
# HMR will be active for both JS/TS and PHP files
```

## Architecture

### Monorepo Structure

- **packages/cli**: CLI tool for scaffolding themes and components
- **packages/vite-plugin**: Vite integration with WordPress, block auto-registration, PHP HMR
- **packages/core**: PHP framework with component architecture
- **packages/explorer**: Interactive component browser (Storybook-like)
- **packages/sync**: Environment sync, snapshots, and rollback
- **packages/testing**: Vitest and Playwright testing utilities
- **packages/headless**: REST API client, React hooks, Next.js utilities
- **packages/create-stratawp**: Theme creation CLI (bundled templates)
- **examples/**: Production-ready theme examples (basic, advanced, store)

### PHP Component Architecture

StrataWP uses a component-based architecture inspired by WPRig:

1. **Theme class** (`packages/core/src/Theme.php`):
   - Singleton pattern managing all components
   - Validates components implement `ComponentInterface`
   - Initializes components via `initialize()` method

2. **Component pattern**:
   - All components implement `ComponentInterface` with `get_slug()` and `initialize()`
   - Optional `TemplatingComponentInterface` for components with template tags
   - Located in `packages/core/src/Components/` and theme-specific `inc/Components/`

3. **Default components**:
   - **Setup**: Theme supports, post thumbnails, menus
   - **Assets**: Enqueue scripts/styles, manifest integration
   - **Blocks**: Block registration and patterns
   - **Performance**: Resource hints (filter-driven), async/defer scripts, WP bloat removal
   - **Accessibility**: Skip link focus fix, aria-current on nav items, screen-reader styles
   - **ConditionalStyles**: Non-render-blocking conditional CSS via preload/onload swap
   - **ImageSizes**: Responsive image `sizes` tuning for better LCP/CLS
   - **Updates**: GitHub-based theme update notifications in WordPress dashboard

4. **Theme initialization** (in `functions.php`):
   ```php
   require_once __DIR__ . '/vendor/autoload.php';
   $theme = new \StrataWP\Theme([
       new \StrataWP\Components\Setup(),
       new \MyTheme\Components\CustomComponent(),
   ]);
   $theme->initialize();
   ```

### Component Extensibility

The Theme constructor applies a `stratawp_theme_components` filter, allowing child themes and plugins to add, remove, or replace components:

```php
// In a child theme's functions.php
add_filter('stratawp_theme_components', function(array $components): array {
    // Add a custom component
    $components[] = new My_Custom_Component();

    // Remove a component
    $components = array_filter($components, fn($c) => $c->get_slug() !== 'analytics');

    return $components;
});
```

### Accessibility Component

Located in `packages/core/src/Components/Accessibility.php`. Included in default components.

Features:

- **Skip link focus fix**: Inlined JavaScript in footer for IE/Edge focus management
- **aria-current="page"**: Automatically added to current navigation menu items via `nav_menu_link_attributes` and `page_menu_link_attributes` filters
- **Screen reader styles**: Inlined `.screen-reader-text` CSS utility (available before stylesheets load)

### Conditional Styles Component

Located in `packages/core/src/Components/ConditionalStyles.php`. Implements `TemplatingComponentInterface`.

Per-page CSS loading with preload callbacks. Non-global sheets are registered (not enqueued) and injected via `<link rel="preload" as="style" onload="this.rel='stylesheet'">` with a `<noscript>` fallback, so they load without blocking render.

Default conditional styles:

- `stratawp-comments`: Loads when `is_singular() && comments_open()`
- `stratawp-sidebar`: Loads when `is_active_sidebar('sidebar-1')`
- `stratawp-widgets`: Loads when `is_active_sidebar('sidebar-1')`

Register custom conditional styles:

```php
add_filter('stratawp_conditional_css_files', function(array $files): array {
    $files['my-theme-archive'] = [
        'file'             => 'archive.css',
        'preload_callback' => fn() => is_archive(),
    ];
    return $files;
});
```

Disable preloading: `add_filter('stratawp_preloading_styles_enabled', '__return_false');`

### Updates Component (GitHub-Based Theme Updates)

Located in `packages/core/src/Components/Updates.php`.

Checks a GitHub repository for new releases and integrates with WordPress's built-in theme update system. When a newer version is found, WordPress displays an update notification in the dashboard with a one-click "Update Now" button.

Usage in `functions.php`:

```php
use StrataWP\Components\Updates;

new Updates('owner/repo', 'theme-name.zip');
```

Parameters:

- `$repository`: GitHub repository in "owner/repo" format
- `$zip_asset_name`: Expected zip filename in release assets (optional, falls back to any .zip)

How it works:

1. Hooks into `pre_set_site_transient_update_themes` to check GitHub releases
2. Compares release tag version against `style.css` Version header
3. If newer, injects update data into WordPress transient
4. WordPress shows standard "Update available" UI
5. One-click update downloads the zip from the GitHub release

Cache: Results cached for 6 hours via WordPress transients (`stratawp_github_release`).

Requirements:

- GitHub releases must use semantic version tags (e.g., `v1.0.0` or `1.0.0`)
- A built theme `.zip` must be attached as a release asset
- See the GitHub Actions release workflow section below for automating zip creation

### Vite Plugin Architecture

The `@stratawp/vite-plugin` provides WordPress-specific features:

1. **Block auto-registration**:
   - Scans `src/blocks/` for `block.json` files
   - Generates `inc/blocks-generated.php` with registration code
   - Matches entry points to block.json files

2. **PHP Hot Module Replacement**:
   - WebSocket server in Vite dev mode
   - Watches PHP files, templates, theme.json
   - Client-side script reloads page on PHP changes

3. **WordPress manifest**:
   - Generates WordPress-compatible asset manifest
   - Maps Vite assets to WordPress `wp_enqueue_*` calls
   - Includes dependency and version information

4. **Performance optimization**:
   - Build-time image optimization (sharp): raster compression + sibling WebP + SVGO
   - Vendor/WordPress chunk splitting (manualChunks)
   - Resource hints are filter-driven:
     - `stratawp_dns_prefetch_hints`: Array of URLs for DNS prefetch (empty by default)
     - `stratawp_preconnect_hints`: Array of URLs or `['href' => '...', 'crossorigin' => true]` for preconnect (empty by default)
     - `stratawp_defer_scripts`: Array of script handles to defer

### CLI Command Structure

Commands in `packages/cli/src/commands/`:

- **block.ts**: Generate Gutenberg blocks (`stratawp block:new`)
- **component.ts**: Generate PHP components (`stratawp component:new`)
- **template.ts**: Generate FSE templates (`stratawp template:new`)
- **part.ts**: Generate template parts (`stratawp part:new`)
- **design-system.ts**: Setup Tailwind/UnoCSS (`stratawp design-system:setup`)
- **deploy/**: Deployment system (SFTP/FTP/SSH, setup, test, list, post-deploy hooks, validation)
- **deploy/sync-templates.ts**: FSE template sync via WP-CLI over SSH (`stratawp sync:templates`)
- **sync.ts**: Database sync between environments (`stratawp sync:db:pull`, `sync:db:push`)
- **rollback.ts**: Snapshot management (`stratawp rollback:list`, `rollback:diff`, `rollback:mark-stable`)
- **update.ts**: Package updates (`stratawp update`, `stratawp update --check`)

Each command uses:

- `prompts` for interactive CLI
- `fs-extra` for file operations
- `chalk` for colored output
- `ora` for spinners

### Deployment System

Located in `packages/cli/src/deployers/`:

- **base.ts**: Abstract base class with full deploy lifecycle (connect → backup → upload → delete orphans → postDeploy → validate → disconnect)
- **ftp.ts**: SFTP/FTP deployment via `ssh2-sftp-client` and `basic-ftp`
- **ssh.ts**: SSH/rsync deployment via `node-ssh` with post-deploy hooks, validation, backup cleanup, and template sync
- **git.ts**: Git-based deployment (future)

Supported deployment types:

- **SFTP**: Secure file transfer, recommended for shared hosting
- **FTP**: Standard file transfer (less secure)
- **SSH/rsync**: For VPS/cloud servers with SSH access, supports key-based auth and rsync for faster transfers

Configuration stored in:

- Global: `~/.stratawp/deploy-config.json`
- Project: `.stratawp-deploy.json`
- Environment variables: `.env` file

Commands:

```bash
stratawp deploy:setup         # Interactive configuration
stratawp deploy production    # Deploy to environment
stratawp deploy:test production  # Test connection
stratawp deploy:list          # List environments

# FSE Template Sync
stratawp sync:templates production --all       # Sync all FSE templates
stratawp sync:templates production --template=home  # Sync specific template
stratawp sync:templates:list production        # List local vs remote templates
```

SSH-specific features:

- Password or private key authentication (with optional passphrase via env var)
- rsync for efficient bulk file transfers with proper SSH key args (`-i`, `-o StrictHostKeyChecking=no`)
- **Post-deploy hooks**: Cache flush, OPcache reset, backup cleanup, custom WP-CLI commands
- **Post-deploy validation**: File existence checks, WP-CLI health check, HTTP health check
- **Backup auto-cleanup**: Keeps only N most recent backups (configurable via `backup.keepLast`)
- **FSE template sync**: Sync Site Editor templates via WP-CLI over SSH
- Server-side backup/restore operations

Deploy config options:

```json
{
  "backup": { "enabled": true, "keepLast": 1 },
  "postDeploy": {
    "clearCache": true,
    "resetOpcache": true,
    "wpCliCommands": [],
    "wpRootPath": "/custom/wp/root"
  },
  "deleteRemoved": false,
  "localWpCli": "/path/to/wp"
}
```

### Sync System

Located in `packages/sync/`:

- **database/dump.ts**: DatabaseDumper class - exports MySQL to SQL
- **database/restore.ts**: DatabaseRestorer class - imports SQL with URL replacement
- **database/url-replace.ts**: UrlReplacer - handles PHP serialized string URL replacement
- **snapshots/manager.ts**: SnapshotManager - creates/manages deployment snapshots
- **diff/index.ts**: DiffEngine - compares files and SQL dumps

Configuration stored in:

- Project: `.stratawp-sync.json` (environment database configs)
- Snapshots: `.stratawp-snapshots/` directory

Commands:

```bash
# Database sync
stratawp sync:db:pull production    # Pull remote DB to local
stratawp sync:db:push staging       # Push local DB to remote

# Rollback commands
stratawp rollback:list              # List all snapshots
stratawp rollback:diff 1 2          # Compare snapshots
stratawp rollback:mark-stable 1     # Mark snapshot as stable
```

Key features:

- **PHP Serialized URL Replacement**: Correctly recalculates string lengths when replacing URLs
- **Automatic Backups**: Creates backup before any database restore
- **Pre-deploy Snapshots**: Deploy command creates snapshot before deployment
- **Compressed Storage**: Theme as tar.gz, database as gzip SQL

### Update System

Located in `packages/cli/src/utils/update-checker.ts`:

- Queries npm registry for latest @stratawp/\* package versions
- Caches version data in `~/.stratawp/update-cache.json` (1-hour TTL)
- Compares versions using semver

Commands:

```bash
stratawp update                  # Check and apply updates interactively
stratawp update --check          # Check for updates without applying
stratawp update --force          # Apply all updates without prompts
```

Dev server notifications:

- Vite plugin shows update notifications when dev server starts
- Configure via `updateNotification.enabled` option in vite.config.ts

### Block Theme (FSE) Structure

Themes follow WordPress Block Theme conventions:

- **theme.json**: Global styles, settings, color palettes, typography
- **templates/**: Block templates (index.html, single.html, page.html, etc.)
- **parts/**: Reusable template parts (header.html, footer.html, sidebar.html)
- **patterns/**: Block patterns in PHP files with header comments
- **src/blocks/**: Custom Gutenberg blocks (auto-registered by Vite plugin)
- **src/js/**: JavaScript entry points (main.ts, editor.ts)
- **src/scss/ or src/css/**: Stylesheets

### TypeScript & Build Process

1. **Entry points** defined in `vite.config.ts`:

   ```ts
   build: {
     rollupOptions: {
       input: {
         main: './src/js/main.ts',
         editor: './src/js/editor.ts',
       }
     }
   }
   ```

2. **Block compilation**:
   - Each block in `src/blocks/[block-name]/` has:
     - `block.json`: Block metadata
     - `index.tsx`: Edit component (editor)
     - `save.tsx`: Save component (frontend render)
   - Compiled to `dist/blocks/[block-name]/`

3. **Output**:
   - Builds to `dist/` directory
   - WordPress enqueues from `dist/` via manifest
   - Source maps in development mode

## Key Conventions

### File Organization

- **PHP Components**: Must be in `inc/Components/` and extend `ComponentInterface`
- **Blocks**: Must be in `src/blocks/[block-name]/` with `block.json`
- **Templates**: Must be in `templates/` as `.html` files
- **Parts**: Must be in `parts/` as `.html` files
- **Patterns**: Must be in `patterns/` as `.php` files with header comments

### Naming Conventions

- **Block namespaces**: Use theme slug (e.g., `forge-basic/hero`)
- **Component slugs**: Kebab-case (e.g., `custom-post-types`)
- **CSS classes**: Follow WordPress conventions or BEM methodology
- **File names**: Kebab-case for JS/TS, PascalCase for PHP classes

### WordPress Integration

- **Vite dev server**: Runs on `localhost:3000` by default
- **HMR connection**: WordPress automatically connects when `SCRIPT_DEBUG` is true or dev server is running
- **Manifest loading**: `functions.php` loads assets from manifest in production
- **CORS**: Vite server configured with CORS headers for WordPress

## Package Manager

This project uses **pnpm** exclusively:

- Workspace protocol for local dependencies: `"@stratawp/vite-plugin": "workspace:*"`
- Turbo pipeline for parallel builds and caching
- Never use `npm` or `yarn` - always use `pnpm`

## Development Workflow

### Creating a New Theme

```bash
# From anywhere (not in WordPress directory)
npx create-stratawp my-theme

# Follow prompts for:
# 1. Theme configuration (name, description, author)
# 2. Template selection (basic, advanced, store, minimal)
# 3. CSS framework (vanilla, Tailwind, UnoCSS, Panda)
# 4. Features (TypeScript, testing)
# 5. WordPress linking (auto-detected for Local by Flywheel, MAMP)

cd my-theme
pnpm dev
```

### Adding Components

```bash
# Generate a new PHP component
stratawp component:new Analytics --type=feature

# Generate a new block
stratawp block:new hero --styleFramework=tailwind

# Generate template
stratawp template:new about --type=page

# Generate template part
stratawp part:new sidebar --type=sidebar
```

### Testing

```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run E2E tests (Playwright)
pnpm test:e2e
```

### Component Explorer

```bash
# Launch interactive component browser
stratawp explorer

# Custom port
stratawp explorer --port 4000
```

### Deployment

```bash
# Setup deployment (one-time)
stratawp deploy:setup

# Deploy to production
stratawp deploy production

# Deploy with options
stratawp deploy production --dry-run     # Preview changes
stratawp deploy production --no-build    # Skip build
stratawp deploy production --force       # Skip confirmation
stratawp deploy production --no-backup   # Skip pre-deploy snapshot
stratawp deploy production --verbose     # Debug output

# FSE Template Sync (Site Editor templates stored in database)
stratawp sync:templates production --all              # Sync all templates
stratawp sync:templates production --template=home    # Sync specific template
stratawp sync:templates:list production               # Compare local vs remote
```

### Database Sync & Rollback

```bash
# Pull production database to local (with automatic URL replacement)
stratawp sync:db:pull production

# Push local database to staging
stratawp sync:db:push staging

# Sync options
stratawp sync:db:pull production --tables=wp_posts,wp_postmeta  # Specific tables
stratawp sync:db:pull production --no-url-replace               # Skip URL replacement
stratawp sync:db:pull production --dry-run                      # Preview without changes

# List deployment snapshots
stratawp rollback:list
stratawp rollback:list --environment=production

# Compare snapshots
stratawp rollback:diff 1 2              # Compare by index

# Mark snapshot as stable (prevent auto-cleanup)
stratawp rollback:mark-stable 1
```

## Important Files

- **turbo.json**: Turborepo pipeline configuration
- **pnpm-workspace.yaml**: Workspace package definitions
- **vite.config.ts**: Vite configuration in each theme/package
- **theme.json**: WordPress theme settings and styles
- **functions.php**: Theme entry point, component initialization
- **tsconfig.json**: TypeScript configuration
- **.gitignore**: Excludes `dist/`, `node_modules/`, `.turbo/`
- **.stratawp-sync.json**: Environment database configurations for sync
- **.stratawp-snapshots/**: Deployment snapshots directory

## Deployment Notes

- **Production files**: Only `dist/`, PHP files, `theme.json`, `style.css`, `vendor/` are deployed
- **Excluded files**: `node_modules/`, `src/`, `.git/`, development files
- **Snapshot system**: Pre-deploy snapshots created automatically (theme files + database)
- **Change detection**: Only modified files uploaded (incremental)
- **Security**: SSH/rsync or SFTP preferred over FTP, supports environment variables for credentials
- **SSH deployment**: Use key-based authentication for VPS/cloud servers, rsync enabled for faster transfers
- **Post-deploy hooks (SSH)**: Automatic cache flush, OPcache reset, backup cleanup, custom WP-CLI commands
- **Post-deploy validation (SSH)**: File existence checks, WP-CLI health check, HTTP health check
- **Backup auto-cleanup**: Configurable via `backup.keepLast` — old backups removed after successful deploy
- **FSE template sync**: `stratawp sync:templates` syncs Site Editor templates via WP-CLI over SSH
- **Rollback**: Use `rollback:list` to see snapshots, `rollback:diff` to compare

## Working with the Core Package

The PHP core (`packages/core/`) is published to Packagist and installed via Composer:

```json
// composer.json in themes
{
  "require": {
    "stratawp/core": "^0.1"
  }
}
```

After modifying core:

1. Update version in `packages/core/composer.json`
2. Commit and push changes
3. Tag release on GitHub
4. Packagist auto-updates
5. Run `composer update` in themes

## Releases & Publishing

```bash
# Create changeset (for package changes)
pnpm changeset

# Version packages (updates package.json versions)
pnpm version-packages

# Build and publish to npm
pnpm release
```

Published packages:

- `@stratawp/cli` - CLI tool
- `@stratawp/vite-plugin` - Vite plugin
- `@stratawp/sync` - Environment sync, snapshots, and rollback
- `@stratawp/testing` - Testing utilities
- `@stratawp/explorer` - Component browser
- `@stratawp/headless` - Headless WordPress utilities
- `create-stratawp` - Theme creation CLI

## GitHub Actions

### Theme Release Workflow (`.github/workflows/release-theme.yml`)

Automatically builds and packages the theme when a GitHub Release is published.

1. Triggered by: `release: [published]`
2. Builds all packages via `pnpm build`
3. Installs Composer dependencies (production only)
4. Updates `style.css` version from release tag
5. Packages production files into `strata-basic.zip`
6. Attaches zip to the GitHub release

This zip is what the Updates component downloads for one-click theme updates.

To create a release:

```bash
# Tag and push
git tag v1.1.0
git push origin v1.1.0

# Create release (GitHub CLI)
gh release create v1.1.0 --title "v1.1.0" --generate-notes
```

## WordPress Agent Skills

StrataWP includes WordPress-specific Claude skills from the official [WordPress/agent-skills](https://github.com/WordPress/agent-skills/) repository. These skills provide structured workflows and best practices for WordPress development.

### Available Skills

Located in `.claude/skills/`:

| Skill                     | Description                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------- |
| **wordpress-router**      | Routes to correct workflow based on repo type (plugin/theme/block theme/full site) |
| **wp-project-triage**     | Deterministic repo inspection - classifies project type, tooling, tests, versions  |
| **wp-block-development**  | Gutenberg blocks: apiVersion 3, deprecations, InnerBlocks, block.json              |
| **wp-block-themes**       | FSE themes: theme.json, templates, parts, patterns, style variations               |
| **wp-interactivity-api**  | Interactive blocks: data-wp-\* directives, stores, hydration, viewScriptModule     |
| **wp-rest-api**           | REST endpoints: register_rest_route, controllers, schema, authentication           |
| **wp-performance**        | Backend profiling: WP-CLI doctor/profile, Query Monitor, object cache, DB queries  |
| **wp-plugin-development** | Plugin architecture, hooks, Settings API, activation/deactivation, security        |
| **wp-wpcli-and-ops**      | WP-CLI operations: search-replace, db export/import, multisite, automation         |
| **wp-phpstan**            | Static analysis: phpstan.neon, baselines, WordPress-specific typing                |

### Using Skills

Skills are automatically loaded when working in the StrataWP repo. Each skill includes:

- **SKILL.md**: Main instructions, procedures, and guardrails
- **references/**: Detailed documentation for specific topics
- **scripts/**: Deterministic inspection scripts (Node.js)

### Skill Workflow

1. **Triage first**: Run `wp-project-triage` to classify the repo
2. **Route to domain**: Use `wordpress-router` to pick the right workflow
3. **Follow procedures**: Each skill has step-by-step procedures with verification
4. **Check references**: Detailed docs in `references/` folders

### Example: Creating a New Block

```bash
# 1. Triage the project (detects block theme, tooling, etc.)
node .claude/skills/wp-project-triage/scripts/detect_wp_project.mjs

# 2. Follow wp-block-development skill procedures
# - Use apiVersion 3
# - Implement render.php for dynamic blocks
# - Add deprecations when changing attributes

# 3. Run verification (tests, lint)
pnpm test && pnpm lint
```

### Skills Target

All skills target **WordPress 6.9+** with **PHP 7.2.24+** and assume:

- Filesystem-based agent with bash + node
- Some workflows require WP-CLI
- Vite/@wordpress/scripts for builds
