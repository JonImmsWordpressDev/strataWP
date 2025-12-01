<div align="center">
  <img src="logo.png" alt="WP-Forge Logo" width="200" />

  # WP-Forge

  **A modern, powerful WordPress theme framework - forged to be better**
</div>

<div align="center">

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![PHP](https://img.shields.io/badge/PHP-8.1+-purple)](https://www.php.net/)
[![npm version](https://img.shields.io/npm/v/@wp-forge/cli)](https://www.npmjs.com/package/@wp-forge/cli)
[![npm version](https://img.shields.io/npm/v/@wp-forge/vite-plugin)](https://www.npmjs.com/package/@wp-forge/vite-plugin)

</div>

---

WP-Forge is a next-generation WordPress theme framework that takes modern development practices to the next level. Built from the ground up with TypeScript, Vite, and cutting-edge tooling, it's designed to make WordPress theme development fast, type-safe, and enjoyable.

## What's New in v0.2.0

Major feature update with three high-impact additions:

- **CLI Scaffolding** - Generate templates, parts, components, and blocks with `wp-forge` commands
- **Design System Integration** - Full Tailwind CSS and UnoCSS support with WordPress preset mappings
- **Performance Optimization** - Automatic critical CSS extraction, lazy loading, and asset preloading
- **Enhanced Block Generation** - Blocks now support style framework integration
- **WordPress Preset Mappings** - Use `text-wp-primary`, `p-wp-md`, `font-wp-sans` and more
- **Auto-Generated PHP Loaders** - Performance plugins generate WordPress integration files automatically

### v0.1.0 (Initial Release)

- **Published npm packages** - `@wp-forge/cli` and `@wp-forge/vite-plugin` are live
- **Block Theme (FSE) support** - Full Site Editing out of the box
- **Vite integration** - Lightning-fast HMR and build times
- **TypeScript-first** - Type safety across your entire theme
- **Block auto-registration** - Automatic WordPress block registration
- **PHP Hot Module Replacement** - See PHP changes instantly
- **Example themes** - Two complete themes to learn from (basic and advanced)
- **Modern design system** - Beautiful Sitecore-inspired design included

## Quick Start

### Create a New Theme

```bash
# Create a new WP-Forge theme (easiest way!)
npx create-wp-forge my-theme

# Navigate to your theme
cd my-theme

# Start developing with hot reload
npm run dev
```

### Or Clone and Explore

```bash
# Clone the repository
git clone https://github.com/JonImmsWordpressDev/WP-Forge.git
cd WP-Forge

# Install dependencies
pnpm install

# Start all example themes in dev mode
pnpm dev

# Build for production
pnpm build
```

## Why WP-Forge?

While inspired by excellent frameworks like WPRig, WP-Forge goes further with modern tooling and developer experience.

### Available Now

- **TypeScript-First**: Full type safety across PHP and JavaScript
- **Vite-Powered**: Lightning-fast HMR and build times (sub-second rebuilds)
- **Block Theme (FSE)**: Full Site Editing support out of the box
- **Block Auto-Registration**: Automatically discovers and registers Gutenberg blocks
- **PHP Hot Reload**: See PHP template changes without page refresh
- **Modern Tooling**: Monorepo with Turborepo and pnpm
- **WordPress Manifest**: Automatic asset manifest generation for WordPress
- **Example Themes**: Learn from working examples (basic and advanced)
- **Sitecore-Inspired Design**: Beautiful, professional design system included
- **CLI Scaffolding**: Generate templates, parts, components, and blocks with intuitive commands
- **Design System Integration**: Choose Tailwind CSS or UnoCSS with WordPress preset mappings
- **Performance Optimization**: Automatic critical CSS extraction, lazy loading, and preloading

### Coming Soon

- **Component Registry**: Share and reuse components across projects
- **AI-Assisted Development**: Built-in AI tools for development (optional)
- **Comprehensive Testing**: Unit, integration, E2E, and visual regression tests
- **Headless-Ready**: First-class support for decoupled architectures
- **Component Explorer**: Built-in Storybook-like component browser

## Installation

### Using the CLI (Recommended)

```bash
npx create-wp-forge my-theme
```

This creates a new WordPress theme with:
- Vite development server configured
- TypeScript setup complete
- Block Theme (FSE) structure
- Example blocks and components
- Hot Module Replacement ready

### Manual Installation

```bash
# Install the packages
npm install --save-dev @wp-forge/vite-plugin
npm install --global @wp-forge/cli

# Or with pnpm
pnpm add -D @wp-forge/vite-plugin
pnpm add -g @wp-forge/cli
```

## Project Structure

```
WP-Forge/
├── packages/
│   ├── cli/              # CLI tool (create-wp-forge, wp-forge commands)
│   ├── core/             # PHP framework core
│   └── vite-plugin/      # Vite integration for WordPress
├── examples/
│   ├── basic-theme/      # Simple starter theme (Block Theme/FSE)
│   └── advanced-theme/   # Feature-rich theme with CPTs, WooCommerce, etc.
└── docs/                 # Documentation (coming soon)
```

## Features in Detail

### CLI Commands

Generate theme components quickly with intuitive commands:

```bash
# Create WordPress templates
wp-forge template:new home --type=home
wp-forge template:new about --type=page

# Create template parts
wp-forge part:new sidebar --type=sidebar --markup=php
wp-forge part:new custom-header --type=header

# Create PHP components
wp-forge component:new Analytics --type=feature
wp-forge component:new WooCommerce --type=integration

# Create blocks with design system support
wp-forge block:new hero --styleFramework=tailwind
wp-forge block:new card --styleFramework=unocss

# Setup design system integration
wp-forge design-system:setup tailwind
wp-forge design-system:setup unocss
```

### Vite Integration

WP-Forge includes a custom Vite plugin (`@wp-forge/vite-plugin`) with comprehensive features:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { wpForge } from '@wp-forge/vite-plugin'

export default defineConfig({
  plugins: [
    wpForge({
      // Automatically discover and register blocks
      blocks: {
        dir: 'src/blocks',
        autoRegister: true,
        namespace: 'my-theme',
      },

      // Design System Integration (NEW in v0.2.0)
      designSystem: {
        enabled: true,
        framework: 'tailwind', // or 'unocss'
        wordpressPresets: true,
      },

      // Performance Optimization (NEW in v0.2.0)
      performance: {
        criticalCSS: {
          enabled: true,
          templates: ['index', 'single', 'page'],
        },
        lazyLoading: {
          enabled: true,
          images: 'native',
        },
        preload: {
          enabled: true,
          assets: ['fonts', 'critical-css'],
        },
      },

      // PHP Hot Module Replacement
      phpHmr: {
        enabled: true,
        watch: ['**/*.php', 'theme.json', 'templates/**/*'],
      },

      // WordPress-compatible manifest
      manifest: {
        enabled: true,
        wordpress: true,
      },
    }),
  ],
})
```

### Design System Integration

Use WordPress theme.json values directly in your utility classes:

```tsx
// Tailwind/UnoCSS classes mapped from theme.json
<div className="text-wp-primary bg-wp-background p-wp-md">
  <h1 className="font-wp-sans text-wp-xl">Hello WordPress!</h1>
</div>
```

WordPress CSS variables are automatically mapped:
- Colors: `text-wp-primary`, `bg-wp-secondary`, `border-wp-accent`
- Spacing: `p-wp-md`, `m-wp-lg`, `gap-wp-sm`
- Typography: `font-wp-sans`, `text-wp-lg`
- Layout: `max-w-wp-container`, `max-w-wp-wide`

### Block Theme (FSE) Support

Both example themes are built as Block Themes with Full Site Editing:

- `theme.json` for global styles and settings
- `templates/` directory for block templates
- `parts/` directory for reusable template parts
- Automatic block registration
- Custom block patterns

### TypeScript & Type Safety

Write type-safe JavaScript that compiles to modern ES modules:

```typescript
// Fully typed WordPress APIs
import { registerBlockType } from '@wordpress/blocks'

registerBlockType('my-theme/hero', {
  title: 'Hero Section',
  category: 'design',
  // ... fully typed configuration
})
```

## Development

This is a monorepo managed with [Turborepo](https://turbo.build/) and [pnpm](https://pnpm.io/).

```bash
# Install dependencies
pnpm install

# Run all packages in dev mode with HMR
pnpm dev

# Build all packages for production
pnpm build

# Run tests (coming soon)
pnpm test

# Lint and format
pnpm lint
pnpm format
```

### Working with Example Themes

```bash
# Start the basic theme dev server
cd examples/basic-theme
pnpm dev

# In another terminal, visit your WordPress site
# The theme will automatically connect to the Vite dev server
# and provide Hot Module Replacement
```

## Documentation

Documentation is coming soon! For now:

- Check out the example themes in `/examples`
- Read the inline comments in the code
- Explore the Vite plugin configuration options
- Review the `DEVELOPMENT_NOTES.md` for technical details

## Contributing

WP-Forge is an open-source project and contributions are welcome!

- Check out the [CONTRIBUTING.md](./CONTRIBUTING.md) guide
- Report bugs via [GitHub Issues](https://github.com/JonImmsWordpressDev/WP-Forge/issues)
- Submit pull requests for new features or fixes
- Share your themes built with WP-Forge!

## License

GPL-3.0-or-later - just like WordPress itself.

## Acknowledgments

Inspired by:
- [WPRig](https://wprig.io/) - For the excellent component architecture
- [Next.js](https://nextjs.org/) - For modern DX patterns
- [Vite](https://vitejs.dev/) - For the incredible build tool

## Published Packages

- [@wp-forge/cli](https://www.npmjs.com/package/@wp-forge/cli) - CLI tool for creating themes
- [@wp-forge/vite-plugin](https://www.npmjs.com/package/@wp-forge/vite-plugin) - Vite plugin for WordPress

---

**Status**: v0.2.0 Alpha - Now with CLI Scaffolding, Design Systems, and Performance Optimization

Built with ❤️ by [Jon Imms](https://jonimms.com)
