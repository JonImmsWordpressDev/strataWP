# @stratawp/studio

**Visual design system and pattern management for WordPress themes**

StrataWP Studio is a WordPress admin interface that provides visual tools for managing design tokens, block patterns, templates, and starter sites.

## Features

### Design System (Phase 1)
- **Design Tokens Editor** - Visual controls for colors, typography, spacing, and layout
- **Live Preview** - Real-time preview of design changes in an iframe
- **Theme.json Integration** - Reads from and writes to WordPress theme.json
- **Preset Management** - Save and load design token presets

### Pattern Library (Phase 2)
- **Browse Patterns** - View all patterns from theme and user-created
- **Create Patterns** - Create new patterns via WordPress block editor
- **Edit & Duplicate** - Modify existing patterns or create copies
- **Categorize & Tag** - Organize patterns with categories and tags
- **Export to Theme** - Export user patterns to theme/patterns/*.php files
- **Sync Status** - Track which patterns are exported and modified

### Coming Soon
- **Block Library** - Manage and preview custom Gutenberg blocks
- **Template Builder** - Visual template creation with pattern slots
- **Starter Sites** - Import pre-built site configurations

## Installation

Studio is included as part of a StrataWP theme. It registers automatically when the theme is activated.

### For Theme Developers

Include Studio in your theme's `composer.json`:

```json
{
  "require": {
    "stratawp/studio": "^1.0"
  }
}
```

Initialize in your theme's `functions.php`:

```php
if (class_exists('StrataWP\Studio\Studio')) {
    StrataWP\Studio\Studio::instance()->initialize();
}
```

## Architecture

```
packages/studio/
├── php/
│   ├── Studio.php                    # Main plugin class
│   ├── PostTypes/
│   │   └── PatternPostType.php       # Pattern CPT & taxonomies
│   ├── RestApi/
│   │   ├── DesignSystemController.php
│   │   └── PatternsController.php
│   └── Services/
│       └── PatternExporter.php       # Export patterns to theme files
├── src/
│   ├── api/                          # API client functions
│   ├── components/                   # Shared React components
│   ├── hooks/                        # React hooks (useDesignTokens, usePatterns)
│   ├── pages/                        # Page components
│   │   ├── DesignSystem/
│   │   └── PatternLibrary/
│   ├── styles/                       # CSS styles
│   └── types/                        # TypeScript type definitions
└── dist/                             # Built assets
```

## REST API

### Design System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stratawp/v1/design-system` | Get current design tokens |
| POST | `/stratawp/v1/design-system` | Save design tokens |
| GET | `/stratawp/v1/design-system/presets` | List presets |
| POST | `/stratawp/v1/design-system/presets` | Save preset |

### Patterns

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stratawp/v1/patterns` | List patterns (filterable) |
| POST | `/stratawp/v1/patterns` | Create pattern |
| GET | `/stratawp/v1/patterns/{id}` | Get single pattern |
| PUT | `/stratawp/v1/patterns/{id}` | Update pattern |
| DELETE | `/stratawp/v1/patterns/{id}` | Delete pattern |
| POST | `/stratawp/v1/patterns/{id}/export` | Export to theme file |
| POST | `/stratawp/v1/patterns/{id}/duplicate` | Duplicate pattern |
| GET | `/stratawp/v1/patterns/theme` | List theme patterns only |

### Query Parameters

Patterns endpoint supports filtering:
- `source` - `all`, `theme`, or `user`
- `category` - Filter by category slug
- `tag` - Filter by tag slug
- `search` - Keyword search
- `per_page`, `page` - Pagination

## Data Model

### Pattern Custom Post Type

- **Post Type**: `stratawp_pattern`
- **Taxonomies**:
  - `stratawp_pattern_category` (hierarchical)
  - `stratawp_pattern_tag` (non-hierarchical)

### Pattern Meta Fields

| Meta Key | Type | Description |
|----------|------|-------------|
| `_stratawp_pattern_keywords` | array | Search keywords |
| `_stratawp_pattern_viewport` | string | Preview viewport size |
| `_stratawp_pattern_sync_status` | string | `local`, `exported`, `modified` |
| `_stratawp_pattern_export_path` | string | Path to exported file |
| `_stratawp_pattern_block_types` | array | Block types used |

### Default Categories

Hero, Features, Testimonials, CTA, Team, Pricing, FAQ, Gallery, Contact, Footer, Header

## Development

```bash
# From repository root
cd packages/studio

# Install dependencies
pnpm install

# Development with hot reload
pnpm dev

# Build for production
pnpm build

# Type checking
pnpm typecheck
```

## Tech Stack

- **Frontend**: React, TypeScript, Vite, @wordpress/components
- **Backend**: PHP 8.1+, WordPress REST API
- **Build**: Vite with WordPress externals

## Requirements

- WordPress 6.0+
- PHP 8.1+
- Node.js 18+

## License

GPL-3.0-or-later
