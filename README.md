# WP-Forge

> A modern, powerful WordPress theme framework - **forged to be better**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![PHP](https://img.shields.io/badge/PHP-8.1+-purple)](https://www.php.net/)
[![npm version](https://img.shields.io/npm/v/@wp-forge/cli)](https://www.npmjs.com/package/@wp-forge/cli)
[![npm version](https://img.shields.io/npm/v/@wp-forge/vite-plugin)](https://www.npmjs.com/package/@wp-forge/vite-plugin)

WP-Forge is a next-generation WordPress theme framework that takes modern development practices to the next level. Built from the ground up with TypeScript, Vite, and cutting-edge tooling, it's designed to make WordPress theme development fast, type-safe, and enjoyable.

## What's New in v0.1.0

The initial release of WP-Forge is now available! Here's what's included:

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

### Coming Soon

- **Component Registry**: Share and reuse components across projects
- **AI-Assisted Development**: Built-in AI tools for development (optional)
- **Design System Integration**: Choose Tailwind, UnoCSS, or vanilla CSS
- **Comprehensive Testing**: Unit, integration, E2E, and visual regression tests
- **Performance Optimization**: Automatic critical CSS, lazy loading
- **Headless-Ready**: First-class support for decoupled architectures
- **Component Explorer**: Built-in Storybook-like component browser
- **CLI Scaffolding**: Generate components, blocks, and templates

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

### Vite Integration

WP-Forge includes a custom Vite plugin (`@wp-forge/vite-plugin`) that provides:

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

**Status**: v0.1.0 Alpha - Available for Testing

Built with ❤️ by [Jon Imms](https://jonimms.com)
