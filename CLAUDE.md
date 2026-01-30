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
- **packages/ai**: AI-assisted development (OpenAI GPT-4, Anthropic Claude)
- **packages/registry**: npm-powered component registry
- **packages/explorer**: Interactive component browser (Storybook-like)
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
   - **Performance**: Critical CSS, lazy loading, preloading

4. **Theme initialization** (in `functions.php`):
   ```php
   require_once __DIR__ . '/vendor/autoload.php';
   $theme = new \StrataWP\Theme([
       new \StrataWP\Components\Setup(),
       new \MyTheme\Components\CustomComponent(),
   ]);
   $theme->initialize();
   ```

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
   - Critical CSS extraction
   - Lazy loading configuration generation
   - Asset preloading hints

### CLI Command Structure

Commands in `packages/cli/src/commands/`:

- **block.ts**: Generate Gutenberg blocks (`stratawp block:new`)
- **component.ts**: Generate PHP components (`stratawp component:new`)
- **template.ts**: Generate FSE templates (`stratawp template:new`)
- **part.ts**: Generate template parts (`stratawp part:new`)
- **design-system.ts**: Setup Tailwind/UnoCSS (`stratawp design-system:setup`)
- **deploy/**: Deployment system (SFTP/FTP, setup, test, list)

Each command uses:
- `prompts` for interactive CLI
- `fs-extra` for file operations
- `chalk` for colored output
- `ora` for spinners

### Deployment System

Located in `packages/cli/src/deployers/`:

- **ftp.ts**: SFTP/FTP deployment via `ssh2-sftp-client` and `basic-ftp`
- **ssh.ts**: SSH/rsync deployment (future)
- **git.ts**: Git-based deployment (future)

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
```

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
# 4. Features (TypeScript, testing, AI tools)
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

### Working with AI Tools

```bash
# Configure AI provider (OpenAI or Anthropic)
stratawp ai:setup

# Generate code from description
stratawp ai:generate block
stratawp ai:generate component

# Review code for security/performance/best practices
stratawp ai:review functions.php --focus security

# Generate documentation
stratawp ai:document inc/Components/CustomPostTypes.php
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
```

## Important Files

- **turbo.json**: Turborepo pipeline configuration
- **pnpm-workspace.yaml**: Workspace package definitions
- **vite.config.ts**: Vite configuration in each theme/package
- **theme.json**: WordPress theme settings and styles
- **functions.php**: Theme entry point, component initialization
- **tsconfig.json**: TypeScript configuration
- **.gitignore**: Excludes `dist/`, `node_modules/`, `.turbo/`

## Deployment Notes

- **Production files**: Only `dist/`, PHP files, `theme.json`, `style.css`, `vendor/` are deployed
- **Excluded files**: `node_modules/`, `src/`, `.git/`, development files
- **Backup system**: Automatic backups created before deployment
- **Change detection**: Only modified files uploaded (incremental)
- **Security**: SFTP preferred over FTP, supports environment variables for credentials

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
- `@stratawp/ai` - AI tools
- `@stratawp/registry` - Component registry
- `@stratawp/testing` - Testing utilities
- `@stratawp/explorer` - Component browser
- `@stratawp/headless` - Headless WordPress utilities
- `create-stratawp` - Theme creation CLI
