<div align="center">
  <img src="logo.png" alt="StrataWP Logo" width="200" />

# StrataWP

**A modern, powerful WordPress theme framework**

</div>

<div align="center">

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![PHP](https://img.shields.io/badge/PHP-8.1+-purple)](https://www.php.net/)
[![npm version](https://img.shields.io/npm/v/@stratawp/cli)](https://www.npmjs.com/package/@stratawp/cli)
[![npm version](https://img.shields.io/npm/v/@stratawp/vite-plugin)](https://www.npmjs.com/package/@stratawp/vite-plugin)

</div>

---

StrataWP is a next-generation WordPress theme framework that takes modern development practices to the next level. Built from the ground up with TypeScript, Vite, and cutting-edge tooling, it's designed to make WordPress **Block Theme (FSE)** development fast, type-safe, and enjoyable.

Scaffold a full theme with one command, edit PHP/SCSS/TypeScript and see changes hot-reload instantly, generate blocks and templates from the CLI, then deploy to production with automatic snapshots and rollback.

> **New here?** Jump to [Quick Start (5 minutes)](#quick-start-5-minutes) and copy-paste your way to a running theme.

## Why StrataWP?

- **TypeScript-First** — full type safety across PHP and JavaScript.
- **Vite-Powered** — fast HMR and sub-second rebuilds.
- **Block Theme (FSE)** — Full Site Editing support out of the box.
- **Block Auto-Registration** — automatically discovers and registers Gutenberg blocks.
- **PHP Hot Reload** — see PHP template changes without a manual page refresh.
- **Three Example Themes** — Basic, Advanced, and Store starters to learn from or build on.
- **CLI Scaffolding** — generate blocks, components, templates, and parts.
- **Design Systems** — Tailwind CSS or UnoCSS with WordPress preset mappings.
- **Comprehensive Testing** — Vitest unit tests and Playwright E2E.
- **Component Explorer** — an interactive, Storybook-style component browser.
- **Headless WordPress** — typed REST API client, React hooks, and Next.js integration.
- **Production Deployment** — SFTP/FTP/SSH deployment with change detection.
- **Environment Sync & Rollback** — database sync plus automatic pre-deploy snapshots.

## Prerequisites

Make sure the following are installed before you begin.

| Requirement | Version | Notes |
| --- | --- | --- |
| **Node.js** | 18 or higher | `engines` requires `node >=18.18`. |
| **pnpm** | 8 or higher | Recommended package manager (`npm` also works). |
| **PHP** | 8.1 or higher | |
| **WordPress** | 6.7 or higher | |
| **A local WordPress environment** | — | [Local by Flywheel](https://localwp.com/), [MAMP](https://www.mamp.info/), Docker, etc. |

Install pnpm if you don't have it:

```bash
npm install -g pnpm
```

> **Tip:** For the best experience, use VS Code with the ESLint, Prettier, PHP Intelephense, and TypeScript/JavaScript language extensions.

## Quick Start (5 minutes)

Go from zero to a running, hot-reloading WordPress theme by copy-pasting these steps.

> **Warning:** Run these commands in a **projects folder** (e.g. `~/Projects`), **not** inside your WordPress `wp-content/themes/` directory. The CLI symlinks your theme into WordPress for you.

**1. Move to a projects folder (outside WordPress):**

```bash
mkdir -p ~/Projects
cd ~/Projects
```

**2. Scaffold a new theme:**

```bash
npx create-stratawp my-theme
```

The interactive wizard guides you through:

- Theme name, description, and author
- **Template** — Basic, Advanced, Store, or Minimal
- **CSS framework** — vanilla, Tailwind, UnoCSS, or Panda
- **TypeScript** and optional **testing** setup
- **WordPress linking** — auto-detects Local by Flywheel (`~/Local Sites/`) and MAMP (`/Applications/MAMP/htdocs/`) installs and creates the symlink for you

> **Note:** If no WordPress install is detected, link the theme manually:
> ```bash
> ln -s "$(pwd)" /path/to/wordpress/wp-content/themes/my-theme
> ```

**3. Enter your theme and start the dev server:**

```bash
cd my-theme
pnpm dev
```

Expected output: the Vite dev server starts on **http://localhost:3000**. Keep this terminal open — the dev server must run continuously for hot reload.

> **If `pnpm dev` fails with "Port 3000 is already in use":** start it on another port with `pnpm dev --port 3001`.

**4. Activate the theme in WordPress:**

- Open your local WordPress site in a browser.
- Go to **Appearance → Themes**, find your theme, and click **Activate**.

**5. Make your first change:**

Edit a file in `src/scss/` or `templates/` and watch your browser update automatically. That's it — you're developing with StrataWP. 🎉

For a fuller walkthrough (including running the bundled example themes), see the **[Getting Started Guide](./GETTING_STARTED.md)** and the [Installation & Quick Start](https://github.com/JonImmsWordpressDev/strataWP/wiki/Installation-and-Quick-Start) wiki page.

## What you can do

Each capability links to its in-repo guide and matching wiki page.

| Task | Command(s) | Learn more |
| --- | --- | --- |
| **Run the dev loop (HMR)** | `pnpm dev` | [Core Concepts](https://github.com/JonImmsWordpressDev/strataWP/wiki/Core-Concepts) |
| **Build for production** | `pnpm build` | [Deployment](https://github.com/JonImmsWordpressDev/strataWP/wiki/Deployment) |
| **Generate a Gutenberg block** | `stratawp block:new <name>` | [Blocks, Patterns & Design Systems](https://github.com/JonImmsWordpressDev/strataWP/wiki/Blocks-Patterns-and-Design-Systems) |
| **Generate a PHP component** | `stratawp component:new <name>` | [Core Concepts](https://github.com/JonImmsWordpressDev/strataWP/wiki/Core-Concepts) |
| **Generate an FSE template** | `stratawp template:new <name>` | [Blocks, Patterns & Design Systems](https://github.com/JonImmsWordpressDev/strataWP/wiki/Blocks-Patterns-and-Design-Systems) |
| **Generate a template part** | `stratawp part:new <name>` | [Blocks, Patterns & Design Systems](https://github.com/JonImmsWordpressDev/strataWP/wiki/Blocks-Patterns-and-Design-Systems) |
| **Set up a design system** | `stratawp design-system:setup tailwind` | [Blocks, Patterns & Design Systems](https://github.com/JonImmsWordpressDev/strataWP/wiki/Blocks-Patterns-and-Design-Systems) |
| **Browse components visually** | `stratawp explorer` | [Architecture & Packages](https://github.com/JonImmsWordpressDev/strataWP/wiki/Architecture-and-Packages) |
| **Run tests** | `pnpm test` · `pnpm test:e2e` | [Testing & Quality](https://github.com/JonImmsWordpressDev/strataWP/wiki/Testing-and-Quality) |
| **Build a headless front-end** | `pnpm add @stratawp/headless` | [Headless WordPress](https://github.com/JonImmsWordpressDev/strataWP/wiki/Headless-WordPress) |
| **Deploy to a server** | `stratawp deploy:setup` · `stratawp deploy production` | [Deployment](https://github.com/JonImmsWordpressDev/strataWP/wiki/Deployment) |
| **Sync databases & templates** | `stratawp sync:db:pull production` · `stratawp sync:templates production --all` | [Environment Sync & Rollback](https://github.com/JonImmsWordpressDev/strataWP/wiki/Environment-Sync-and-Rollback) |
| **Roll back a deployment** | `stratawp rollback:list` · `stratawp rollback:diff 1 2` | [Environment Sync & Rollback](https://github.com/JonImmsWordpressDev/strataWP/wiki/Environment-Sync-and-Rollback) |
| **Update the CLI & packages** | `stratawp update` | [CLI Reference](https://github.com/JonImmsWordpressDev/strataWP/wiki/CLI-Reference) |

> **Tip:** The **[Cheat Sheet](./CHEAT_SHEET.md)** lists every command and flag in one place.

### A taste of the CLI

```bash
# Generate components
stratawp block:new hero --styleFramework=tailwind
stratawp component:new Analytics --type=feature
stratawp template:new about --type=page
stratawp part:new sidebar --type=sidebar

# Set up a design system
stratawp design-system:setup tailwind

# Deploy
stratawp deploy:setup
stratawp deploy production --dry-run
stratawp deploy production

# Sync and roll back
stratawp sync:templates production --all
stratawp sync:db:pull production
stratawp rollback:list
```

## Project Structure

StrataWP is a monorepo managed with [Turborepo](https://turbo.build/) and [pnpm](https://pnpm.io/) workspaces.

```
StrataWP/
├── packages/
│   ├── cli/              # CLI tool (create-stratawp + stratawp commands)
│   ├── create-stratawp/  # One-command scaffolding wrapper
│   ├── core/             # PHP framework core (Components, hooks, template tags)
│   ├── vite-plugin/      # Vite integration: HMR, block auto-discovery, manifest
│   ├── explorer/         # Interactive component browser
│   ├── headless/         # REST API client, React hooks, Next.js integration
│   ├── sync/             # Environment sync, snapshots, rollback
│   ├── testing/          # Vitest and Playwright utilities
│   └── mcp/              # MCP server exposing generators to AI agents
├── examples/
│   ├── basic-theme/      # General-purpose starter theme
│   ├── advanced-theme/   # Enterprise theme with CPTs and custom blocks
│   └── store-theme/      # WooCommerce e-commerce theme
└── docs/                 # Documentation
```

A generated theme has this layout:

```
my-theme/
├── inc/Components/   # PHP components (theme features)
├── patterns/         # Block patterns (*.php)
├── parts/            # Template parts (*.html)
├── src/
│   ├── blocks/       # Gutenberg blocks (block.json, index.tsx, save.tsx)
│   ├── scss/         # Styles
│   └── main.ts       # Entry point
├── templates/        # FSE templates (*.html)
├── functions.php     # Theme entry point
├── style.css         # Theme metadata
├── theme.json        # FSE configuration
└── vite.config.ts    # Build configuration
```

See [Project Structure](https://github.com/JonImmsWordpressDev/strataWP/wiki/Project-Structure) for a full map.

## Example Themes

| Theme | Best for | Highlights |
| --- | --- | --- |
| **[Basic](./examples/basic-theme)** | Blogs, portfolios, business sites, learning StrataWP | [Frost](https://frostwp.com/) design system, 50 block patterns, 9 templates, light/dark variants, Google Fonts typography |
| **[Advanced](./examples/advanced-theme)** | Complex / production sites and agencies | 4 Custom Post Types (Portfolio, Team, Testimonials, Case Studies), custom blocks, Advanced Layouts + Customizer, Meta Boxes system |
| **[Store](./examples/store-theme)** | WooCommerce e-commerce | WooCommerce templates (shop, product, cart, checkout), Featured Products & Product Categories blocks, e-commerce patterns, mobile-optimized |

Learn how to run and customize them on the [Example Themes](https://github.com/JonImmsWordpressDev/strataWP/wiki/Example-Themes) wiki page.

## Documentation

### Wiki (guides & reference)

| Page | What it covers |
| --- | --- |
| [Home](https://github.com/JonImmsWordpressDev/strataWP/wiki/Home) | Wiki landing page and index |
| [Installation & Quick Start](https://github.com/JonImmsWordpressDev/strataWP/wiki/Installation-and-Quick-Start) | Set up and create your first theme |
| [Core Concepts](https://github.com/JonImmsWordpressDev/strataWP/wiki/Core-Concepts) | Components, hooks, HMR, and the PHP framework |
| [Project Structure](https://github.com/JonImmsWordpressDev/strataWP/wiki/Project-Structure) | Monorepo and theme layout |
| [CLI Reference](https://github.com/JonImmsWordpressDev/strataWP/wiki/CLI-Reference) | Every command and flag |
| [Blocks, Patterns & Design Systems](https://github.com/JonImmsWordpressDev/strataWP/wiki/Blocks-Patterns-and-Design-Systems) | Scaffolding and styling |
| [Example Themes](https://github.com/JonImmsWordpressDev/strataWP/wiki/Example-Themes) | Basic, Advanced, and Store walkthroughs |
| [Headless WordPress](https://github.com/JonImmsWordpressDev/strataWP/wiki/Headless-WordPress) | REST client, React hooks, Next.js |
| [Testing & Quality](https://github.com/JonImmsWordpressDev/strataWP/wiki/Testing-and-Quality) | Vitest, Playwright, custom matchers |
| [Deployment](https://github.com/JonImmsWordpressDev/strataWP/wiki/Deployment) | SFTP/FTP/SSH deployment |
| [Environment Sync & Rollback](https://github.com/JonImmsWordpressDev/strataWP/wiki/Environment-Sync-and-Rollback) | DB sync, snapshots, rollback |
| [Architecture & Packages](https://github.com/JonImmsWordpressDev/strataWP/wiki/Architecture-and-Packages) | How the packages fit together |
| [AI, Agent Skills & MCP](https://github.com/JonImmsWordpressDev/strataWP/wiki/AI-Agent-Skills-and-MCP) | Agent skills and the MCP server |
| [Contributing & Releases](https://github.com/JonImmsWordpressDev/strataWP/wiki/Contributing-and-Releases) | Contributing workflow and releases |
| [FAQ & Troubleshooting](https://github.com/JonImmsWordpressDev/strataWP/wiki/FAQ-and-Troubleshooting) | Common issues and fixes |

### In-repo guides

| Document | Description |
| --- | --- |
| [Getting Started Guide](./GETTING_STARTED.md) | Step-by-step tutorial for beginners |
| [Cheat Sheet](./CHEAT_SHEET.md) | Quick reference for all commands |
| [Deployment Guide](./docs/deployment/getting-started.md) | Basic deployment with SFTP/FTP/SSH |
| [Advanced Deployment](./docs/deployment/ADVANCED-DEPLOYMENT.md) | SSH keys, FSE template sync, plugin deployment |
| [Roadmap](./ROADMAP.md) | Where StrataWP is heading |
| [Changelog](./CHANGELOG.md) | Version history and release notes |

## Development

Working on StrataWP itself (or running it from a clone)? Use the root scripts:

```bash
# Install all dependencies
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

### Run an example theme

```bash
cd examples/basic-theme
pnpm dev
# Visit your WordPress site — HMR is active.
```

### Update the CLI after pulling changes

If you've pulled new commits and a new command isn't showing up, rebuild and reinstall the globally linked CLI:

```bash
cd packages/cli
pnpm build
npm install -g .
stratawp --help
```

## Contributing

StrataWP is open source and contributions are welcome.

- Read the **[CONTRIBUTING.md](./CONTRIBUTING.md)** guide.
- Report bugs via [GitHub Issues](https://github.com/JonImmsWordpressDev/StrataWP/issues).
- Ask questions in [GitHub Discussions](https://github.com/JonImmsWordpressDev/StrataWP/discussions).
- Submit pull requests for new features or fixes.

See [Contributing & Releases](https://github.com/JonImmsWordpressDev/strataWP/wiki/Contributing-and-Releases) for the full workflow, and the [Roadmap](./ROADMAP.md) for what's planned next.

## License

GPL-3.0-or-later — just like WordPress itself.

## Acknowledgments

Inspired by and built on:

- [Frost](https://frostwp.com/) by WP Engine (GPL) — the block design system the example themes build on.
- A prior-art GPL WordPress starter theme — for the component architecture.
- [Next.js](https://nextjs.org/) — for modern DX patterns.
- [Vite](https://vitejs.dev/) — for the build tooling.

## Published Packages

| Package | Description |
| --- | --- |
| [create-stratawp](https://www.npmjs.com/package/create-stratawp) | One-command scaffolder — what `npx create-stratawp` runs |
| [@stratawp/cli](https://www.npmjs.com/package/@stratawp/cli) | CLI tool (provides the `stratawp` command and bundles `create-stratawp`) |
| [@stratawp/vite-plugin](https://www.npmjs.com/package/@stratawp/vite-plugin) | Vite plugin for WordPress |
| [@stratawp/sync](https://www.npmjs.com/package/@stratawp/sync) | Environment sync, snapshots, rollback |
| [@stratawp/testing](https://www.npmjs.com/package/@stratawp/testing) | Testing utilities (Vitest, Playwright) |
| [@stratawp/headless](https://www.npmjs.com/package/@stratawp/headless) | Headless WordPress (REST client, React hooks, Next.js) |
| [@stratawp/explorer](https://www.npmjs.com/package/@stratawp/explorer) | Component explorer |

The repository also includes `@stratawp/core` (the PHP framework) and `@stratawp/mcp` (an MCP server that exposes the scaffolding generators to AI agents). See [Architecture & Packages](https://github.com/JonImmsWordpressDev/strataWP/wiki/Architecture-and-Packages) for how everything fits together.

---

**Current version:** v2.0.0 — see the [Changelog](./CHANGELOG.md) for details.

Built with ❤️ by [Jon Imms](https://jonimms.com)
