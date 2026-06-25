# Changelog

All notable changes to StrataWP are documented in this file.

## v2.0.0 - Focus

**Sharpen the scope. Cut what doesn't fit.**

This release deletes three packages from the monorepo so the framework stops trying to be everything. The deletions are the feature.

### Removed

- **`@stratawp/studio`** — admin UI for design tokens, block library, and pattern management. Removed: admin UIs duplicate what the Site Editor and your IDE already do well, and the maintenance burden of a React admin app doesn't fit StrataWP's audience.
- **`@stratawp/registry`** — npm-powered component registry. Removed: a custom registry needs critical mass we don't have, and npm + private packages already cover the use case.
- **`@stratawp/ai`** — AI helper SDK (OpenAI, Anthropic). Removed: every editor now ships AI (MCP, Claude Code, Copilot, Cursor), making a framework-embedded SDK a shrinking-value commitment.

### CLI changes

- `stratawp ai:setup`, `ai:generate`, `ai:review`, `ai:document` removed.
- `stratawp registry:search`, `registry:install`, `registry:info`, `registry:publish`, `registry:list` removed.
- `create-stratawp` wizard no longer prompts for "Enable AI-powered features?" (the captured boolean was dead code).
- CLI binary now reports the correct version (was hardcoded to `1.0.0`; now reads as `2.0.0`).

### Docs

- New `ROADMAP.md` at the repo root captures the sharpened scope, the rationale for the cuts, and the ranked investment list for upcoming work.
- README, CHEAT_SHEET, GETTING_STARTED, and CLAUDE.md rewritten to match.

### Migration

- If you were using `@stratawp/cli` registry or AI commands, drop them from your scripts and use `npm` directly or your editor's AI features.
- If you embedded `@stratawp/studio` in a theme via `vendor/stratawp/studio/`, that integration will continue to work against the last published 1.x release (now `npm deprecate`d) but receives no further updates. To migrate off it, use the Site Editor for design tokens, templates, and patterns.

### What's still here

`@stratawp/cli`, `@stratawp/vite-plugin`, `@stratawp/core` (PHP), `@stratawp/sync`, `@stratawp/testing`, `@stratawp/headless`, `@stratawp/explorer`. The last two are under review for v2.1.

See [`ROADMAP.md`](./ROADMAP.md) for the full picture.

---

## v1.6.0 - Deployment Overhaul

**Reliable, Production-Ready Deployment**

This release completely overhauls the deployment system, fixing long-standing issues with backup accumulation, missing post-deploy actions, and adding FSE template sync support.

### Post-Deploy Lifecycle Hooks

Deployments now include automatic post-deploy actions that run while still connected to the server:

- **WordPress Cache Flush**: Automatically runs `wp cache flush` and `wp transient delete --all` via WP-CLI
- **PHP OPcache Reset**: Creates and executes a temporary PHP script to invalidate OPcache
- **Custom WP-CLI Commands**: Run arbitrary WP-CLI commands after deployment via `postDeploy.wpCliCommands` config
- **Automatic WP Root Detection**: Derives WordPress root path from theme `remotePath` (3 directories up)

### Backup Auto-Cleanup (Fixes #5)

Backup folders no longer accumulate on the production server:

- **Automatic cleanup** after successful deployment — keeps only the most recent N backups
- **Configurable retention** via `backup.keepLast` (default: 1)
- **`--no-backup` flag** to skip backup creation entirely

```json
{
  "backup": {
    "enabled": true,
    "keepLast": 1
  }
}
```

### Post-Deploy Validation (Fixes #7)

Every deployment now includes automatic health checks:

- **Critical file checks**: Verifies `style.css` and `theme.json` exist on remote
- **WP-CLI health check**: Runs `wp eval "echo 'OK';"` to confirm WordPress loads
- **HTTP health check**: Curls the site URL to verify 200 response (when `database.remoteUrl` configured)

```
✅ Validation:
  ✓ File: style.css — exists
  ✓ File: theme.json — exists
  ✓ WordPress loads — OK
  ✓ Site responds — HTTP 200
```

### rsync SSH Key Fix (Fixes #6)

Fixed rsync SSH command to properly pass identity file and disable strict host key checking:

```
ssh -p PORT -i ~/.ssh/your-key -o StrictHostKeyChecking=no
```

### FSE Template Sync

New `sync:templates` command for syncing WordPress Full Site Editing templates between local and production databases:

```bash
# Sync all templates
stratawp sync:templates production --all

# Sync specific template
stratawp sync:templates production --template=home

# List templates (local vs remote)
stratawp sync:templates:list production

# Dry run
stratawp sync:templates production --all --dry-run
```

**How it works:**

1. Detects local WP-CLI (including Local by Flywheel path)
2. Exports template content from local database
3. Uploads to remote server via SCP
4. Updates remote database using `wp eval-file` (safe PHP execution)
5. Flushes caches on remote

### New Configuration Options

```json
{
  "environments": {
    "production": {
      "type": "ssh",
      "host": "ssh.example.com",
      "passphrase": "${STRATAWP_SSH_PASSPHRASE}",
      "backup": {
        "enabled": true,
        "keepLast": 1
      },
      "postDeploy": {
        "clearCache": true,
        "resetOpcache": true,
        "wpCliCommands": [],
        "wpRootPath": "/custom/wp/root"
      },
      "deleteRemoved": false,
      "localWpCli": "/path/to/wp"
    }
  }
}
```

### Files Changed

**Modified:**

- `deployers/base.ts` — Added `postDeploy()`, `validate()` lifecycle methods to deploy flow; new interfaces
- `deployers/ssh.ts` — Implemented post-deploy hooks, validation, backup cleanup, template sync, rsync SSH fix
- `commands/deploy/index.ts` — Wired post-deploy results display, validation output, template sync guidance
- `utils/deploy-config.ts` — Added `BackupConfig`, `passphrase`, `deleteRemoved`, `localWpCli` fields

**New:**

- `commands/deploy/sync-templates.ts` — `stratawp sync:templates` and `sync:templates:list` commands

---

## v1.5.0 - Block Library

**Block Library Showcase for StrataWP Studio**

This release adds the Block Library feature to Studio, providing a comprehensive view of all registered Gutenberg blocks.

### New Features

**Block Library - Showcase Tab**

Browse, search, and inspect all blocks registered in your WordPress installation:

- **Source Detection** - Automatically identifies blocks as Theme, Core, or Plugin
- **Smart Filtering** - Filter by source, category, or search by name/keyword
- **Block Details Modal** - View complete block information including:
  - Title, description, and icon
  - Supported features (alignment, colors, typography, etc.)
  - Block attributes and their types
  - Parent/ancestor constraints
  - One-click copy block name

**REST API Endpoints**

New endpoints with HTTP caching:

- `GET /stratawp/v1/blocks` - List blocks with filtering
- `GET /stratawp/v1/blocks/categories` - List block categories

### Files Added

**PHP:**

- `php/RestApi/BlocksController.php` - REST API controller with HTTP caching

**TypeScript:**

- `src/types/blocks.ts` - Block type definitions
- `src/api/blocks.ts` - REST API client
- `src/hooks/useBlocks.ts` - React state management hook

**React Components:**

- `src/pages/BlockLibrary/index.tsx` - Main page with tab navigation
- `src/pages/BlockLibrary/ShowcaseTab.tsx` - Showcase tab content
- `src/pages/BlockLibrary/BlockCard.tsx` - Block card component
- `src/pages/BlockLibrary/BlockCardSkeleton.tsx` - Loading skeleton
- `src/pages/BlockLibrary/BlockFilters.tsx` - Filter controls
- `src/pages/BlockLibrary/BlockGrid.tsx` - Responsive grid layout
- `src/pages/BlockLibrary/BlockDetail.tsx` - Detail modal

### Documentation

- Added comprehensive `docs/STUDIO.md` documentation
- Documents all Studio features: Design System, Block Library, Pattern Library

---

## v1.4.0 - Studio Improvements

**Performance, Bug Fixes & UI/UX Enhancements**

This release focuses on improving the StrataWP Studio admin experience with critical bug fixes, performance optimizations, and UI polish.

### Bug Fixes

**Pagination Fix**

- Fixed incorrect total count in Pattern Library when combining database and theme patterns
- "Load More" button now works correctly with proper pagination metadata
- Added `total_pages`, `page`, and `per_page` to API responses

**Origin Validation Fix**

- Fixed Live Preview failing in reverse proxy and load balancer setups
- Implemented "trust on first message" pattern for postMessage communication
- Added debug logging when origin mismatches occur for easier troubleshooting

### Performance Improvements

**N+1 Query Elimination**

- Reduced database queries from 2N+1 to ~3 queries when loading patterns
- Uses WordPress `update_object_term_cache()` to prime term cache
- 20 patterns now loads in ~3 queries instead of ~41

**HTTP Caching**

- Added ETag and Cache-Control headers to REST endpoints
- Design System endpoint: 60s cache with file-based ETag
- Presets endpoint: 1 hour cache (static content)
- Patterns endpoint: 30s cache with content-based ETag
- Theme patterns endpoint: 5 minute cache
- Supports `If-None-Match` for 304 Not Modified responses

### UI/UX Improvements

**Loading Skeletons**

- Replaced spinner with skeleton loading placeholders in Pattern Grid
- Smooth shimmer animation matches actual card layout
- Better perceived performance during pattern loading

**Toast Notifications**

- Replaced `window.alert()` with WordPress-native toast notifications
- Shows success/error messages for pattern export, duplicate, and delete
- Uses `@wordpress/notices` SnackbarList component

**Debounced Color Inputs**

- Added 150ms debounce to color picker inputs in Design System
- Immediate visual feedback in the picker
- Reduced re-renders and live preview updates while adjusting colors

### Files Changed

**New Components:**

- `src/components/DebouncedColorInput/` - Debounced color input with local state
- `src/pages/PatternLibrary/PatternCardSkeleton.tsx` - Skeleton loading component

**Updated:**

- `php/RestApi/PatternsController.php` - Pagination fix, N+1 fix, HTTP caching
- `php/RestApi/DesignSystemController.php` - HTTP caching headers
- `php/Studio.php` - Origin validation fix in preview script
- `src/hooks/useLivePreview.ts` - Origin validation fix
- `src/pages/PatternLibrary/` - Skeletons and toast notifications
- `src/pages/DesignSystem/` - Debounced color inputs
- `src/styles/admin.css` - Skeleton animations, toast positioning

---

## v1.3.0 - Production Suite

**Environment Sync, Snapshots & Rollback**

This release introduces a comprehensive production management toolkit for WordPress deployments.

### Environment Sync

Sync databases between environments with intelligent URL replacement:

```bash
# Pull production database to local
stratawp sync:db:pull production

# Push local database to staging
stratawp sync:db:push staging
```

**Features:**

- **Automatic URL Replacement**: Handles PHP serialized strings correctly (recalculates string lengths)
- **Backup Before Restore**: Creates automatic backup before overwriting database
- **Selective Table Sync**: Sync specific tables with `--tables` flag
- **Production Protection**: Requires confirmation for production pushes

### Deployment Snapshots

Automatic snapshots are created before every deployment:

```bash
# List recent snapshots
stratawp rollback:list

# Compare two snapshots
stratawp rollback:diff 1 2

# Mark a snapshot as stable
stratawp rollback:mark-stable 1
```

**Features:**

- **Pre-Deploy Snapshots**: Automatically captures theme files and database before deployment
- **Compressed Storage**: Theme archived as tar.gz, database as gzip SQL
- **SHA256 Hashing**: Verify snapshot integrity
- **Git Integration**: Stores git commit ref and branch with each snapshot
- **Diff Engine**: Compare snapshots to see table changes and row counts

### New Package: @stratawp/sync

```bash
pnpm add @stratawp/sync
```

**Programmatic API:**

```typescript
import {
  DatabaseDumper,
  DatabaseRestorer,
  UrlReplacer,
  SnapshotManager,
  DiffEngine,
} from '@stratawp/sync'

// Dump database
const dumper = new DatabaseDumper(config)
const sql = await dumper.generateDumpSQL()

// Restore with URL replacement
const restorer = new DatabaseRestorer(config)
await restorer.restoreFromSQL(sql, {
  urlReplacements: [{ from: 'https://prod.com', to: 'http://local.test' }],
})

// Create and manage snapshots
const manager = new SnapshotManager()
await manager.createSnapshot({
  environment: 'production',
  themePath: '/path/to/theme',
  databaseDump: sql,
})
```

---

## v1.2.0 - Analytics Component

**Analytics Component for Internal Traffic Exclusion**

This release adds a new `Analytics` component to the PHP core that helps exclude internal users from analytics tracking (e.g., GA4):

```php
// Add to your theme's component array
new \StrataWP\Components\Analytics(),
```

**Features:**

- **Dev Cookie Setting**: Automatically sets a `dev=true` cookie for internal users
- **Three Exclusion Modes**:
  - `Admins only` - Users with `manage_options` capability
  - `All logged-in users` - Any authenticated user
  - `Disabled` - No exclusion (default)
- **Admin Settings Page**: Configure at Settings → StrataWP Analytics
- **GA4 Compatible**: Works with Google Analytics 4's internal traffic filters
- **1-Hour Cookie Expiry**: Cookie auto-refreshes on each page load

---

## v1.1.0 - Deployment Improvements

**Fresh Deploy Flag**

This release adds the `--fresh` flag to the deploy command, solving manifest sync issues:

```bash
# Force upload all files (bypass manifest tracking)
stratawp deploy production --fresh
```

**When to use `--fresh`:**

- Server files are out of sync with the deployment manifest
- Previous deployment partially failed but manifest was saved
- You made manual changes on the server
- "0 files deployed" when you know files have changed

---

## v1.0.0 - Production Deployment

**Production Deployment is Here!**

StrataWP 1.0 introduces a comprehensive deployment system that makes deploying your WordPress themes to production servers effortless.

### Deployment Features

- **One-Command Deployment**: Deploy to production with a single command
- **Multiple Hosting Support**: SFTP, FTP, SSH/rsync (coming soon), Git (coming soon)
- **Interactive Setup Wizard**: Configure deployment in minutes with guided prompts
- **Smart File Filtering**: Automatically deploys only production files
- **Change Detection**: Only uploads modified files for faster deployments
- **Automatic Backups**: Creates backups before deployment for safe rollbacks
- **Environment Management**: Support for multiple environments (production, staging, etc.)
- **Secure Credentials**: Environment variable support to keep passwords out of git

**New Commands:**

```bash
stratawp deploy:setup              # Interactive deployment configuration
stratawp deploy production         # Deploy to production
stratawp deploy:list               # List configured environments
stratawp deploy:test production    # Test connection without deploying
```

---

## v0.8.0 - Headless WordPress

**Headless WordPress Support**

This release introduces comprehensive support for headless WordPress architectures.

### Features

- **TypeScript-First REST API Client**: Fully-typed WordPress REST API client
- **Authentication Support**: Basic Auth, JWT, Application Passwords, and OAuth
- **React Hooks**: SWR-powered hooks for data fetching
- **Next.js Integration**: Static generation, ISR, preview mode
- **SEO Utilities**: Generate metadata for posts and pages
- **Image Optimization**: Responsive images and Next.js Image integration

**New Package:**

```bash
pnpm add @stratawp/headless
```

---

## v0.7.0 - Component Explorer

**Interactive Component Browser**

This release introduces an interactive component browser and documentation tool, similar to Storybook but specifically designed for WordPress Block Themes.

### Features

- **Auto-Discovery**: Automatically discovers all blocks, components, patterns
- **Live Preview**: Interactive preview with viewport testing
- **Hot Reload**: Real-time updates when you modify components
- **Attribute Controls**: Test and manipulate block attributes in real-time
- **Source Code Viewer**: View component source code directly in the browser

**New Commands:**

```bash
stratawp explorer            # Launch component explorer
stratawp storybook           # Alias for explorer
```

---

## v0.6.0 - Testing Infrastructure

**Comprehensive Testing**

This release introduces a complete testing solution for WordPress themes.

### Features

- **Vitest Integration**: Fast unit and integration tests with WordPress mocks
- **Playwright E2E**: Full user workflow testing with browser automation
- **WordPress Mocks**: Complete mocks for WordPress JavaScript APIs
- **Custom Matchers**: WordPress-specific test assertions
- **Coverage Reporting**: Built-in code coverage with thresholds

**Commands:**

```bash
pnpm test              # Run unit tests
pnpm test:coverage     # Run with coverage
pnpm test:e2e          # Run E2E tests
```

---

## v0.5.0 - Component Registry

**npm-Powered Component Registry**

This release introduces a powerful component registry system for sharing and discovering reusable WordPress components.

### Features

- **Search & Discovery**: Find components by name, type, or keywords
- **One-Command Installation**: Install blocks, components, patterns
- **Version Management**: Semantic versioning and dependency resolution
- **Easy Publishing**: Share your components with the community

**Commands:**

```bash
stratawp registry:search <query>     # Find components
stratawp registry:install <package>  # Install components
stratawp registry:publish            # Publish your component
```

---

## v0.4.0 - AI-Assisted Development

> Note: the bundled AI provider package was removed in v2.0. AI assistance is now via the editor's own agent over the @stratawp/mcp server — StrataWP ships no embedded LLM.

**AI-Powered Development Tools**

This release introduces comprehensive AI integration to accelerate your WordPress theme development.

### Features

- **Code Generation**: Generate blocks, components, and patterns from natural language
- **Code Review**: AI-powered analysis for security and performance
- **Documentation**: Automatically create comprehensive documentation
- **Multi-Provider Support**: OpenAI GPT-4 or Anthropic Claude

**Commands:**

```bash
stratawp ai:setup        # Interactive AI provider configuration
stratawp ai:generate     # Generate blocks, components, patterns
stratawp ai:review       # Security, performance review
stratawp ai:document     # Generate documentation
```

---

## v0.3.0 - Example Themes

**Three Complete Production-Ready Themes**

### Advanced Theme - Enterprise Features

- 4 Custom Post Types: Portfolio, Team Members, Testimonials, Case Studies
- Custom Gutenberg Blocks: Portfolio Grid and Team Members
- Advanced Layouts Component with Customizer integration
- Meta Boxes System with comprehensive custom fields

### Store Theme - WooCommerce E-Commerce

- 4 WooCommerce Templates: Shop, Product, Cart, Checkout
- 2 Product Blocks: Featured Products and Product Categories
- 4 E-Commerce Patterns with professional styling
- Complete WooCommerce integration

---

## v0.2.0 - CLI & Design Systems

### Features

- **CLI Scaffolding** - Generate templates, parts, components, and blocks
- **Design System Integration** - Tailwind CSS and UnoCSS support
- **Performance Optimization** - Critical CSS extraction, lazy loading
- **Enhanced Block Generation** - Style framework integration

---

## v0.1.0 - Initial Release

### Features

- **Published npm packages** - `@stratawp/cli` and `@stratawp/vite-plugin`
- **Block Theme (FSE) support** - Full Site Editing out of the box
- **Vite integration** - Lightning-fast HMR and build times
- **TypeScript-first** - Type safety across your entire theme
- **Block auto-registration** - Automatic WordPress block registration
- **PHP Hot Module Replacement** - See PHP changes instantly
