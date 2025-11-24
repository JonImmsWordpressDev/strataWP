# WP-Forge

> A modern, powerful WordPress theme framework - **forged to be better**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![PHP](https://img.shields.io/badge/PHP-8.1+-purple)](https://www.php.net/)

WP-Forge is a next-generation WordPress theme framework that takes modern development practices to the next level. Built from the ground up with TypeScript, Vite, and cutting-edge tooling, it's designed to make WordPress theme development fast, type-safe, and enjoyable.

## Why WP-Forge?

While inspired by excellent frameworks like WPRig, WP-Forge goes further:

- **TypeScript-First**: Full type safety across PHP and JavaScript
- **Vite-Powered**: Lightning-fast HMR and build times
- **Component Registry**: Share and reuse components across projects
- **AI-Assisted**: Built-in AI tools for development (optional)
- **Design System Integration**: Choose Tailwind, UnoCSS, or vanilla CSS
- **Comprehensive Testing**: Unit, integration, E2E, and visual regression tests
- **Performance-First**: Automatic critical CSS, lazy loading, and optimization
- **Headless-Ready**: First-class support for decoupled architectures
- **Component Explorer**: Built-in Storybook-like component browser
- **Modern Tooling**: Monorepo, Turbo, pnpm, and more

## Quick Start

```bash
# Create a new theme using WP-Forge
npx create-wp-forge my-theme

# Or clone and explore
git clone https://github.com/JonImmsWordpressDev/WP-Forge.git
cd WP-Forge
pnpm install
pnpm dev
```

## Documentation

Coming soon! Check the `/docs` directory for early documentation.

## Project Structure

```
WP-Forge/
├── packages/
│   ├── cli/              # CLI tool (create-wp-forge, wp-forge commands)
│   ├── core/             # PHP framework core
│   └── vite-plugin/      # Vite integration for WordPress
├── examples/
│   └── basic-theme/      # Simple starter theme
└── docs/                 # Documentation (coming soon)
```

## Development

This is a monorepo managed with [Turborepo](https://turbo.build/) and [pnpm](https://pnpm.io/).

```bash
# Install dependencies
pnpm install

# Run all packages in dev mode
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint and format
pnpm lint
pnpm format
```

## Contributing

WP-Forge is an open-source project and contributions are welcome! Check out the [CONTRIBUTING.md](./CONTRIBUTING.md) guide.

## License

GPL-3.0-or-later - just like WordPress itself.

## Acknowledgments

Inspired by:
- [WPRig](https://wprig.io/) - For the excellent component architecture
- [Next.js](https://nextjs.org/) - For modern DX patterns
- [Vite](https://vitejs.dev/) - For the incredible build tool

---

**Status**: Early Development - Watch this repo to follow progress!

Built with ❤️ by Jon Imms
