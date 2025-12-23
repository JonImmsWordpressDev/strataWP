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

StrataWP is a next-generation WordPress theme framework that takes modern development practices to the next level. Built from the ground up with TypeScript, Vite, and cutting-edge tooling, it's designed to make WordPress theme development fast, type-safe, and enjoyable.

## What's New in v0.8.0

**Headless WordPress Support is Here!**

This release introduces comprehensive support for headless WordPress architectures, enabling you to build decoupled applications with React, Next.js, and other modern frameworks:

### Headless WordPress Features
- **TypeScript-First REST API Client**: Fully-typed WordPress REST API client with complete type definitions
- **Authentication Support**: Basic Auth, JWT, Application Passwords, and OAuth
- **React Hooks**: SWR-powered hooks for data fetching (usePosts, usePages, useCategories)
- **Next.js Integration**: Static generation, ISR, preview mode, and on-demand revalidation
- **SEO Utilities**: Generate metadata for posts and pages with Open Graph and Twitter Cards
- **Image Optimization**: Responsive images, srcset generation, and Next.js Image integration
- **Preview Mode**: Full support for previewing draft content
- **Revalidation**: Tag-based and path-based on-demand revalidation

**New Package:**
```bash
pnpm add @stratawp/headless
```

**Quick Start:**
```typescript
import { WordPressClient } from '@stratawp/headless'
import { usePosts } from '@stratawp/headless/react'
import { getAllPosts } from '@stratawp/headless/next'

// Create client
const client = new WordPressClient({
  baseUrl: 'https://your-wordpress-site.com',
})

// Fetch posts
const { data } = await client.getPosts()

// React hook
const { data, isLoading } = usePosts({ client })

// Next.js static generation
const posts = await getAllPosts(client)
```

**Features:**
- Complete WordPress REST API types (WPPost, WPPage, WPCategory, WPTag, WPMedia)
- SWR-based React hooks with automatic revalidation
- Next.js App Router support with generateStaticParams
- Preview mode with secret verification
- SEO metadata generation for posts and pages
- Responsive image utilities with srcset
- Authentication helpers for secure API access

## What's New in v0.7.0

**Component Explorer is Here!**

This release introduces an interactive component browser and documentation tool, similar to Storybook but specifically designed for WordPress Block Themes:

### Component Explorer
- **Auto-Discovery**: Automatically discovers all blocks, components, patterns, templates, and template parts
- **Live Preview**: Interactive preview with viewport testing (Mobile, Tablet, Desktop)
- **Hot Reload**: Real-time updates when you modify components via WebSocket
- **Attribute Controls**: Test and manipulate block attributes in real-time
- **Source Code Viewer**: View component source code directly in the browser
- **Component Filtering**: Search and filter by type, name, or tags
- **Multiple Component Types**: Full support for blocks, React components, patterns, templates, and parts

**New Commands:**
```bash
stratawp explorer            # Launch component explorer
stratawp storybook           # Alias for explorer
stratawp explorer --port 4000  # Custom port
```

**Features:**
- Vite-powered dev server with Express backend
- React-based UI with responsive design
- WebSocket real-time updates
- REST API for component data
- Automatic component metadata extraction
- File watching with hot-reload
- Viewport testing for responsive design
- Comprehensive component documentation

## What's New in v0.6.0

**Comprehensive Testing is Here!**

This release introduces a complete testing solution for WordPress themes with unit, integration, and E2E testing capabilities:

### Testing Infrastructure
- **Vitest Integration**: Fast unit and integration tests with WordPress mocks
- **Playwright E2E**: Full user workflow testing with browser automation
- **WordPress Mocks**: Complete mocks for WordPress JavaScript APIs (@wordpress/blocks, @wordpress/data, etc.)
- **Custom Matchers**: WordPress-specific test assertions (toHaveBlockClass, toBeRegisteredBlock)
- **Test Utilities**: Block testing helpers, component rendering, attribute testing
- **Coverage Reporting**: Built-in code coverage with thresholds (80% lines, 80% functions)
- **CI/CD Ready**: Pre-configured for GitHub Actions

**Testing Commands:**
```bash
pnpm test              # Run unit tests
pnpm test:coverage     # Run with coverage
pnpm test:e2e          # Run E2E tests
```

**Features:**
- Mock WordPress APIs (blocks, data, i18n, components, block-editor)
- Block testing utilities (renderBlockEdit, renderBlockSave, testBlockRegistration)
- Playwright helpers (wpLogin, openBlockEditor, insertBlock, publishPost)
- Custom matchers for WordPress-specific assertions
- Example tests for reference
- Comprehensive documentation

## What's New in v0.5.0

**Component Registry is Live!**

This release introduces a powerful component registry system for sharing and discovering reusable WordPress components:

### Component Registry System
- **npm-Powered Registry**: Leverage npm infrastructure for reliable component distribution
- **Search & Discovery**: Find components by name, type, or keywords
- **One-Command Installation**: Install blocks, components, patterns with a single command
- **Version Management**: Semantic versioning and dependency resolution
- **Easy Publishing**: Share your components with the StrataWP community
- **Multiple Component Types**: Blocks, PHP components, patterns, templates, parts, integrations

**New Commands:**
```bash
stratawp registry:search <query>     # Find components
stratawp registry:install <package>  # Install components
stratawp registry:info <package>     # Get component details
stratawp registry:list               # List installed components
stratawp registry:publish            # Publish your component
```

**Component Types Supported:**
- Gutenberg Blocks
- PHP Theme Components
- Block Patterns
- FSE Templates
- Template Parts
- Third-party Integrations

## What's New in v0.4.0

**AI-Assisted Development is Here!**

This release introduces comprehensive AI integration to accelerate your WordPress theme development:

### AI-Powered Development Tools
- **Code Generation**: Generate Gutenberg blocks, theme components, and block patterns from natural language descriptions
- **Code Review**: AI-powered analysis for security vulnerabilities, performance issues, and best practices
- **Documentation**: Automatically create comprehensive Markdown, PHPDoc, or JSDoc documentation
- **Multi-Provider Support**: Choose between OpenAI GPT-4 or Anthropic Claude 3.5 Sonnet
- **Flexible Configuration**: Configure via `.env` files or centralized config

**New Commands:**
```bash
stratawp ai:setup        # Interactive AI provider configuration
stratawp ai:generate     # Generate blocks, components, patterns
stratawp ai:review       # Security, performance, best practices review
stratawp ai:document     # Generate comprehensive documentation
```

## What's New in v0.3.0

**Three Complete Production-Ready Themes!**

This release adds two new fully-featured example themes showcasing advanced WordPress development:

### Advanced Theme - Enterprise Features
- **4 Custom Post Types**: Portfolio (with categories/tags), Team Members (with departments), Testimonials (with ratings), Case Studies (with industries/services)
- **Custom Gutenberg Blocks**: Portfolio Grid and Team Members blocks with full editor controls
- **Advanced Layouts Component**: Customizer integration, container width control, layout management
- **Meta Boxes System**: Comprehensive custom fields for all post types with proper security
- **5 Integrated Components**: Full component architecture demonstration

### Store Theme - WooCommerce E-Commerce
- **4 WooCommerce Templates**: Shop, Product, Cart, and Checkout pages optimized for FSE
- **2 Product Blocks**: Featured Products and Product Categories with full customization
- **4 E-Commerce Patterns**: Product showcases, category grids, hero sections, sale banners
- **WooCommerce Integration**: Enhanced product displays, cart notifications, checkout customization
- **Complete Store Styling**: Professional e-commerce CSS with hover effects and mobile optimization

### v0.2.0 Features

- **CLI Scaffolding** - Generate templates, parts, components, and blocks with commands
- **Design System Integration** - Full Tailwind CSS and UnoCSS support with WordPress preset mappings
- **Performance Optimization** - Automatic critical CSS extraction, lazy loading, and asset preloading
- **Enhanced Block Generation** - Blocks now support style framework integration

### v0.1.0 (Initial Release)

- **Published npm packages** - `@stratawp/cli` and `@stratawp/vite-plugin` are live
- **Block Theme (FSE) support** - Full Site Editing out of the box
- **Vite integration** - Lightning-fast HMR and build times
- **TypeScript-first** - Type safety across your entire theme
- **Block auto-registration** - Automatic WordPress block registration
- **PHP Hot Module Replacement** - See PHP changes instantly

## Quick Start

**New to StrataWP?** Check out our comprehensive [Getting Started Guide](./GETTING_STARTED.md) for a step-by-step tutorial!

### Create a New Theme

The fastest way to get started:

```bash
# Run this command from ANYWHERE on your system (NOT in WordPress directory)
# This will create a new theme directory wherever you run it
npx create-stratawp my-theme

# Navigate to your new theme
cd my-theme

# Link it to your WordPress installation
# Replace /path/to/wordpress with your actual WordPress path
ln -s "$(pwd)" /path/to/wordpress/wp-content/themes/my-theme

# Start developing with hot reload
pnpm run dev
```

That's it! Your theme is now running with hot-reload. Open your WordPress site and activate the theme.

**Quick Reference:** See our [Cheat Sheet](./CHEAT_SHEET.md) for all CLI commands and common patterns.

### Or Clone and Explore

```bash
# Clone the repository (OUTSIDE your WordPress themes directory)
git clone https://github.com/JonImmsWordpressDev/StrataWP.git
cd StrataWP

# Install dependencies
pnpm install

# Create a symlink to use the basic theme in WordPress
# Replace /path/to/wordpress with your WordPress installation path
ln -s "$(pwd)/examples/basic-theme" /path/to/wordpress/wp-content/themes/stratawp-basic

# Start the dev server
cd examples/basic-theme
pnpm dev

# Build for production
pnpm build
```

**Recommended Setup:**
- Clone the repository outside `wp-content/themes/`
- Create a symlink from the theme to your WordPress installation
- This keeps your development files separate from WordPress

## Why StrataWP?

While inspired by excellent frameworks like WPRig, StrataWP goes further with modern tooling and developer experience.

### Available Now

- **TypeScript-First**: Full type safety across PHP and JavaScript
- **Vite-Powered**: Lightning-fast HMR and build times (sub-second rebuilds)
- **Block Theme (FSE)**: Full Site Editing support out of the box
- **Block Auto-Registration**: Automatically discovers and registers Gutenberg blocks
- **PHP Hot Reload**: See PHP template changes without page refresh
- **Modern Tooling**: Monorepo with Turborepo and pnpm
- **WordPress Manifest**: Automatic asset manifest generation for WordPress
- **Three Example Themes**: Learn from complete, production-ready themes
- **Sitecore-Inspired Design**: Beautiful, professional design system included
- **CLI Scaffolding**: Generate templates, parts, components, and blocks with intuitive commands
- **Design System Integration**: Choose Tailwind CSS or UnoCSS with WordPress preset mappings
- **Performance Optimization**: Automatic critical CSS extraction, lazy loading, and preloading
- **AI-Assisted Development**: OpenAI GPT-4 and Anthropic Claude integration for code generation, review, and documentation
- **Component Registry**: npm-powered registry for sharing and discovering reusable components
- **Comprehensive Testing**: Unit testing with Vitest, E2E testing with Playwright, WordPress mocks, and coverage reporting
- **Component Explorer**: Interactive Storybook-like component browser with auto-discovery and live preview
- **Headless WordPress**: REST API client, React hooks, Next.js integration, and SEO utilities for decoupled architectures

## Installation

### Using the CLI (Recommended)

The easiest way to create a new StrataWP theme:

```bash
# Run from anywhere OUTSIDE your WordPress directory
npx create-stratawp my-theme

# Then link it to WordPress
cd my-theme
ln -s "$(pwd)" /path/to/wordpress/wp-content/themes/my-theme
pnpm dev
```

This creates a new WordPress theme with:
- ✅ Vite development server configured
- ✅ TypeScript setup complete
- ✅ Block Theme (FSE) structure
- ✅ Example blocks and components
- ✅ Hot Module Replacement ready

The CLI will guide you through:
- Choosing a CSS framework (vanilla, Tailwind, UnoCSS, Panda)
- TypeScript configuration
- Testing setup (optional)
- AI assistance (optional)

### Manual Installation

```bash
# Install the packages
npm install --save-dev @stratawp/vite-plugin
npm install --global @stratawp/cli

# Or with pnpm
pnpm add -D @stratawp/vite-plugin
pnpm add -g @stratawp/cli
```

## Project Structure

```
StrataWP/
├── packages/
│   ├── ai/               # AI-assisted development tools (OpenAI, Anthropic)
│   ├── cli/              # CLI tool (create-stratawp, stratawp commands)
│   ├── core/             # PHP framework core
│   ├── explorer/         # Interactive component browser (Storybook-like)
│   ├── headless/         # Headless WordPress utilities (REST API, React hooks, Next.js)
│   ├── registry/         # Component registry for sharing/discovering components
│   ├── testing/          # Comprehensive testing utilities (Vitest, Playwright)
│   └── vite-plugin/      # Vite integration for WordPress
├── examples/
│   ├── basic-theme/      # General purpose blog/business theme with Frost design system
│   ├── advanced-theme/   # Enterprise theme with Custom Post Types, advanced layouts, meta boxes
│   └── store-theme/      # WooCommerce e-commerce theme with product blocks and patterns
└── docs/                 # Documentation (coming soon)
```

## Example Themes

### Basic Theme - General Purpose
Perfect for blogs, portfolios, and business sites.

**Features:**
- Frost design system with 52+ professional patterns
- Custom typography control with Google Fonts
- 9 templates (home, blog, single, page, archive, search, 404, blank, no-title)
- Light and dark mode pattern variants
- Responsive design with fluid typography

**Best for:** Blogs, portfolios, small business sites, content-focused websites

### Advanced Theme - Enterprise Features
Showcase of advanced WordPress development capabilities.

**Features:**
- 4 Custom Post Types: Portfolio, Team Members, Testimonials, Case Studies
- Custom Gutenberg blocks: Portfolio Grid, Team Members
- Advanced Layouts component with Customizer integration
- Complete Meta Boxes system with custom fields
- Helper methods for complex queries and displays

**Best for:** Corporate sites, agencies, portfolios, membership sites, complex content structures

### Store Theme - E-Commerce
Full-featured WooCommerce theme ready for online stores.

**Features:**
- 4 WooCommerce templates (shop, product, cart, checkout)
- Featured Products & Product Categories blocks
- 4 e-commerce patterns (showcases, hero, banners, categories)
- WooCommerce integration component
- Professional store styling with animations
- Mobile-optimized shopping experience

**Best for:** Online stores, product catalogs, digital downloads, subscription services

## Features in Detail

### CLI Commands

Generate theme components quickly with intuitive commands:

```bash
# Create WordPress templates
stratawp template:new home --type=home
stratawp template:new about --type=page

# Create template parts
stratawp part:new sidebar --type=sidebar --markup=php
stratawp part:new custom-header --type=header

# Create PHP components
stratawp component:new Analytics --type=feature
stratawp component:new WooCommerce --type=integration

# Create blocks with design system support
stratawp block:new hero --styleFramework=tailwind
stratawp block:new card --styleFramework=unocss

# Setup design system integration
stratawp design-system:setup tailwind
stratawp design-system:setup unocss

# AI-assisted development (requires API key)
stratawp ai:setup                                    # Configure AI provider
stratawp ai:generate block                          # Generate blocks from descriptions
stratawp ai:review functions.php -f security        # Review code for security issues
stratawp ai:document src/components/Header.tsx      # Generate documentation

# Component registry
stratawp registry:search hero                       # Search for components
stratawp registry:install @stratawp/hero-block      # Install a component
stratawp registry:info @stratawp/hero-block         # Get component details
stratawp registry:list                              # List installed components
stratawp registry:publish                           # Publish your component

# Component explorer
stratawp explorer                                   # Launch interactive component browser
stratawp storybook                                  # Alias for explorer
stratawp explorer --port 4000                       # Custom port
```

### Component Registry

StrataWP includes a powerful component registry for sharing and discovering reusable WordPress components, powered by npm.

#### Search & Install Components

Discover and install components from the StrataWP community:

```bash
# Search for components
stratawp registry:search hero
stratawp registry:search grid --type block

# Get detailed information
stratawp registry:info @stratawp/hero-block

# Install components
stratawp registry:install @stratawp/hero-block
stratawp registry:install @stratawp/analytics-component
stratawp registry:install @stratawp/features-pattern
```

**Component Types Available:**
- **Blocks**: Gutenberg blocks for the editor
- **Components**: PHP theme components with StrataWP architecture
- **Patterns**: Reusable block patterns
- **Templates**: FSE templates
- **Parts**: Template parts
- **Integrations**: Third-party service integrations

#### Publishing Your Components

Share your components with the community:

```bash
# Ensure you're logged in to npm
npm login

# Publish your component
stratawp registry:publish

# Test before publishing
stratawp registry:publish --dry-run
```

**Publishing Requirements:**
- Package name starts with `@stratawp/`
- Include StrataWP metadata in `package.json`
- Follow semantic versioning
- Include README and documentation

See the [`@stratawp/registry` package README](./packages/registry/README.md) for complete documentation.

### Component Explorer

StrataWP includes an interactive component browser for exploring and documenting your theme components, similar to Storybook but specifically designed for WordPress.

#### Launch the Explorer

Start the component explorer from your theme directory:

```bash
# Launch explorer
stratawp explorer

# Or use the storybook alias
stratawp storybook

# Custom port
stratawp explorer --port 4000

# Don't open browser automatically
stratawp explorer --no-open
```

The explorer automatically:
- Discovers all blocks, components, patterns, templates, and parts
- Starts a dev server (default: `http://localhost:3000`)
- Opens your browser
- Watches for file changes and hot-reloads

#### Features

**Auto-Discovery:**
- **Blocks**: Reads `block.json` from `src/blocks/`
- **React Components**: Finds `.tsx` files in `src/components/`
- **Patterns**: Discovers `.php` files in `patterns/`
- **Templates**: Lists `.html` files in `templates/`
- **Template Parts**: Lists `.html` files in `parts/`

**Live Preview:**
- Interactive component rendering
- Viewport testing (Mobile, Tablet, Desktop, Full)
- Real-time attribute editing for blocks
- Responsive design testing

**Component Details:**
- **Info Tab**: Component metadata, attributes, and file path
- **Source Tab**: View component source code
- **Examples Tab**: Pre-configured usage examples

**Real-Time Updates:**
- WebSocket connection for instant updates
- Hot-reload when files change
- No manual refresh needed

#### Component Metadata

**For Blocks (block.json):**
```json
{
  "name": "my-theme/hero",
  "title": "Hero Section",
  "description": "Full-width hero with CTA",
  "category": "design",
  "keywords": ["hero", "banner", "cta"],
  "attributes": {
    "heading": {
      "type": "string",
      "default": ""
    }
  },
  "example": {
    "attributes": {
      "heading": "Welcome to My Site"
    }
  }
}
```

**For React Components (JSDoc):**
```tsx
/**
 * @title Button Component
 * @description A reusable button component
 */
export function Button({ variant = 'primary' }) {
  return <button className={`btn-${variant}`}>Click Me</button>
}
```

**For Patterns (PHP Comments):**
```php
<?php
/**
 * Title: Hero Banner
 * Description: Full-width hero section
 * Categories: featured, call-to-action
 */
?>
```

#### Development Workflow

1. **Launch Explorer**: `stratawp explorer`
2. **Browse Components**: View all components in the sidebar
3. **Test Interactively**: Change viewports, edit attributes
4. **Modify Code**: Edit component files
5. **See Updates**: Explorer hot-reloads automatically
6. **Copy Code**: View source and copy snippets

See the [`@stratawp/explorer` package README](./packages/explorer/README.md) for complete documentation.

### Headless WordPress

StrataWP provides comprehensive support for headless WordPress architectures, enabling you to build decoupled applications with React, Next.js, and other modern frameworks.

#### Quick Start

```bash
pnpm add @stratawp/headless
```

**Basic Usage:**
```typescript
import { WordPressClient } from '@stratawp/headless'

const client = new WordPressClient({
  baseUrl: 'https://your-wordpress-site.com',
  auth: {
    type: 'application-password',
    username: 'admin',
    password: 'xxxx xxxx xxxx xxxx',
  },
})

// Fetch posts
const { data: posts } = await client.getPosts({ per_page: 10, _embed: true })

// Fetch single post
const post = await client.getPostBySlug('hello-world')
```

#### React Hooks

```tsx
import { usePosts, usePost } from '@stratawp/headless/react'

function BlogIndex() {
  const { data, isLoading } = usePosts({
    client,
    params: { per_page: 10, _embed: true },
  })

  return (
    <div>
      {data?.data.map((post) => (
        <article key={post.id}>
          <h2>{post.title.rendered}</h2>
        </article>
      ))}
    </div>
  )
}

function BlogPost({ slug }: { slug: string }) {
  const { data: post } = usePost({ client, slug })

  return <article>{post?.title.rendered}</article>
}
```

#### Next.js Integration

```tsx
// app/blog/page.tsx
import { getAllPosts } from '@stratawp/headless/next'

export const revalidate = 60 // ISR

export default async function BlogPage() {
  const posts = await getAllPosts(client)

  return (
    <div>
      {posts.map((post) => (
        <article key={post.id}>{post.title.rendered}</article>
      ))}
    </div>
  )
}
```

```tsx
// app/blog/[slug]/page.tsx
import { generatePostParams } from '@stratawp/headless/next'

export async function generateStaticParams() {
  return await generatePostParams(client)
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await client.getPostBySlug(params.slug)
  return <article>{post?.title.rendered}</article>
}
```

#### SEO & Images

```tsx
import {
  generatePostSEO,
  getImageSrcSet,
  getNextImageProps,
} from '@stratawp/headless'
import type { Metadata } from 'next'
import Image from 'next/image'

// Generate metadata
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await client.getPostBySlug(params.slug, { _embed: true })
  const featuredMedia = post?._embedded?.['wp:featuredmedia']?.[0]

  const seo = generatePostSEO(
    post,
    'https://your-site.com',
    'Your Site',
    featuredMedia
  )

  return {
    title: seo.title,
    description: seo.description,
    openGraph: seo.openGraph,
  }
}

// Responsive images
function FeaturedImage({ media }) {
  const imageProps = getNextImageProps(media, {
    width: 1200,
    height: 630,
  })

  return <Image {...imageProps} />
}
```

**Features:**
- **REST API Client**: Complete WordPress REST API with TypeScript types
- **Authentication**: Basic, JWT, Application Passwords, OAuth
- **React Hooks**: SWR-powered hooks (usePosts, usePages, useCategories)
- **Next.js Utilities**: Static generation, ISR, preview mode, revalidation
- **SEO Utilities**: Metadata generation for posts and pages
- **Image Optimization**: Responsive images and Next.js Image support
- **Preview Mode**: Draft content preview with secret verification
- **TypeScript Types**: Complete type definitions for all WordPress entities

See the [`@stratawp/headless` package README](./packages/headless/README.md) for complete documentation.

### AI-Assisted Development

StrataWP includes powerful AI tools to accelerate your development workflow. Supports both OpenAI GPT-4 and Anthropic Claude.

#### Setup

Configure your AI provider with the interactive setup wizard:

```bash
stratawp ai:setup
```

Or use environment variables in your `.env` file:

```env
STRATAWP_AI_PROVIDER=anthropic        # or 'openai'
STRATAWP_AI_API_KEY=your-api-key-here
STRATAWP_AI_MODEL=claude-3-5-sonnet-20241022  # optional
```

#### Generate Code with AI

Create Gutenberg blocks, theme components, and block patterns from natural language descriptions:

```bash
# Generate a Gutenberg block
stratawp ai:generate block
# > Describe the block: A hero section with heading, subheading, and CTA button
# > Block name: hero-section
# ✓ Generated block.json, index.tsx, and save.tsx

# Generate a PHP component
stratawp ai:generate component
# > Describe the component: Custom post type manager for portfolio items
# > Component name: PortfolioManager

# Generate a block pattern
stratawp ai:generate pattern
# > Describe the pattern: Three-column feature showcase with icons
# > Pattern name: features-showcase
```

#### Code Review

Get AI-powered code reviews for security, performance, and best practices:

```bash
# Review for all aspects
stratawp ai:review inc/Components/UserAuth.php

# Focus on specific areas
stratawp ai:review functions.php --focus security
stratawp ai:review src/blocks/shop/index.tsx --focus performance
stratawp ai:review inc/Components/API.php --focus best-practices
```

The AI will analyze your code for:
- **Security**: XSS, SQL injection, CSRF, input sanitization, capability checks
- **Performance**: Database queries, caching opportunities, asset loading
- **Best Practices**: WordPress coding standards, modern PHP/JS patterns

#### Generate Documentation

Automatically create comprehensive documentation from your code:

```bash
# Generate documentation (format auto-detected from file extension)
stratawp ai:document inc/Components/Menus.php

# Specify output file
stratawp ai:document src/blocks/team/index.tsx -o docs/team-block.md

# Specify format explicitly
stratawp ai:document inc/Components/CustomPostTypes.php --format phpdoc
```

Supported formats:
- **Markdown**: Comprehensive documentation with sections
- **PHPDoc**: WordPress-compatible PHP documentation
- **JSDoc**: TypeScript/JavaScript documentation

**AI Provider Options:**
- **OpenAI GPT-4**: Powerful general-purpose model ([Get API key](https://platform.openai.com/api-keys))
- **Anthropic Claude**: Excellent for code generation ([Get API key](https://console.anthropic.com/))

See the [`@stratawp/ai` package README](./packages/ai/README.md) for complete documentation.

### Vite Integration

StrataWP includes a custom Vite plugin (`@stratawp/vite-plugin`) with comprehensive features:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { strataWP } from '@stratawp/vite-plugin'

export default defineConfig({
  plugins: [
    strataWP({
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

StrataWP is an open-source project and contributions are welcome!

- Check out the [CONTRIBUTING.md](./CONTRIBUTING.md) guide
- Report bugs via [GitHub Issues](https://github.com/JonImmsWordpressDev/StrataWP/issues)
- Submit pull requests for new features or fixes
- Share your themes built with StrataWP!

## License

GPL-3.0-or-later - just like WordPress itself.

## Acknowledgments

Inspired by:
- [WPRig](https://wprig.io/) - For the excellent component architecture
- [Next.js](https://nextjs.org/) - For modern DX patterns
- [Vite](https://vitejs.dev/) - For the incredible build tool

## Published Packages

- [@stratawp/cli](https://www.npmjs.com/package/@stratawp/cli) - CLI tool for creating themes
- [@stratawp/vite-plugin](https://www.npmjs.com/package/@stratawp/vite-plugin) - Vite plugin for WordPress
- [@stratawp/ai](https://www.npmjs.com/package/@stratawp/ai) - AI-assisted development tools
- [@stratawp/registry](https://www.npmjs.com/package/@stratawp/registry) - Component registry
- [@stratawp/testing](https://www.npmjs.com/package/@stratawp/testing) - Testing utilities

---

**Status**: v0.6.0 - Comprehensive Testing with Vitest & Playwright

Built with ❤️ by [Jon Imms](https://jonimms.com)
