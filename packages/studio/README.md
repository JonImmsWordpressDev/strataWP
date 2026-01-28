# @stratawp/studio

**Visual design system and pattern management for WordPress themes**

StrataWP Studio is a WordPress admin interface that provides visual tools for managing design tokens, block patterns, templates, and starter sites.

## Features

### Design System (Phase 1)
- **Design Tokens Editor** - Visual controls for colors, typography, spacing, and layout
- **Live Preview** - Real-time preview of design changes in an iframe
- **Theme.json Integration** - Reads from and writes to WordPress theme.json
- **Preset Management** - Save and load design token presets
- **Debounced Inputs** - Smooth color picker interactions without excessive re-renders

### Pattern Library (Phase 2)
- **Browse Patterns** - View all patterns from theme and user-created
- **Create Patterns** - Create new patterns via WordPress block editor
- **Edit & Duplicate** - Modify existing patterns or create copies
- **Categorize & Tag** - Organize patterns with categories and tags
- **Export to Theme** - Export user patterns to theme/patterns/*.php files
- **Sync Status** - Track which patterns are exported and modified
- **Skeleton Loading** - Smooth loading experience with animated placeholders
- **Toast Notifications** - WordPress-native success/error feedback

### Performance
- **N+1 Query Prevention** - Term cache priming reduces queries from 2N+1 to ~3
- **HTTP Caching** - ETag and Cache-Control headers on all REST endpoints
- **Conditional Requests** - 304 Not Modified support for unchanged resources

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
│   ├── Studio.php                    # Main plugin class + preview script
│   ├── PostTypes/
│   │   └── PatternPostType.php       # Pattern CPT & taxonomies
│   ├── RestApi/
│   │   ├── DesignSystemController.php  # Design tokens + HTTP caching
│   │   └── PatternsController.php      # Patterns API + term cache priming
│   └── Services/
│       └── PatternExporter.php       # Export patterns to theme files
├── src/
│   ├── api/                          # API client functions
│   ├── components/                   # Shared React components
│   │   ├── AdminLayout/              # Admin page layout
│   │   ├── DebouncedColorInput/      # Color picker with debounce
│   │   └── LivePreview/              # iframe preview with postMessage
│   ├── hooks/                        # React hooks
│   │   ├── useDesignTokens.ts        # Design system state
│   │   ├── useLivePreview.ts         # Preview communication
│   │   └── usePatterns.ts            # Pattern library state
│   ├── pages/                        # Page components
│   │   ├── DesignSystem/
│   │   └── PatternLibrary/
│   │       ├── PatternCard.tsx
│   │       ├── PatternCardSkeleton.tsx  # Skeleton loading
│   │       ├── PatternFilters.tsx
│   │       ├── PatternGrid.tsx
│   │       └── index.tsx             # Page with toast notifications
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

### Response Format

All list endpoints return pagination metadata:

```json
{
  "items": [...],
  "total": 25,
  "total_pages": 3,
  "page": 1,
  "per_page": 10
}
```

### HTTP Caching

All GET endpoints support conditional requests:

| Endpoint | Cache-Control | ETag |
|----------|---------------|------|
| `/design-system` | `private, max-age=60` | Based on theme.json mtime |
| `/design-system/presets` | `private, max-age=3600` | Based on content hash |
| `/patterns` | `private, max-age=30` | Based on content + filters |
| `/patterns/theme` | `private, max-age=300` | Based on pattern names |

Send `If-None-Match` header with the ETag to receive `304 Not Modified` when content hasn't changed.

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
