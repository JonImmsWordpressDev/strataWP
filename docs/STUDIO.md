# StrataWP Studio

<div align="center">
  <h3>Visual Design System, Block Library & Pattern Management for WordPress</h3>
  <p>A powerful admin interface for managing your WordPress theme's design tokens, blocks, and patterns.</p>
</div>

---

## Overview

StrataWP Studio is a WordPress admin plugin that provides visual tools for:

- **Design System Editor** - Manage colors, typography, and spacing with live preview
- **Block Library** - Browse, search, and inspect registered Gutenberg blocks
- **Pattern Library** - Create, edit, duplicate, and export block patterns
- **Template Builder** - Visual template management (coming soon)
- **Starter Sites** - One-click demo imports (coming soon)

## Features

### Design System Editor

The Design System Editor provides a visual interface for managing your theme's design tokens with real-time preview.

**Capabilities:**
- Color palette management with live preview
- Typography scale configuration
- Spacing and sizing presets
- Direct theme.json integration
- Preset system for quick switching

**Technical Highlights:**
- HTTP caching with ETag headers for fast loading
- Debounced color inputs for smooth interaction
- PostMessage-based live preview (works with reverse proxies)

---

### Block Library

The Block Library provides a comprehensive view of all Gutenberg blocks available in your WordPress installation.

![Block Library Showcase](./assets/block-library-showcase.png)

**Features:**

#### Browse & Filter
- **Source filtering** - View blocks by source: Theme, Core, or Plugin
- **Category filtering** - Filter by block category (Text, Media, Design, etc.)
- **Search** - Find blocks by name, title, description, or keywords
- **Responsive grid** - Cards adapt to available space

#### Block Details
- **Full information** - View title, description, icon, and category
- **Supports list** - See which features the block supports (alignment, colors, typography, etc.)
- **Attributes** - View all defined block attributes and their types
- **Constraints** - See parent/ancestor requirements
- **Copy block name** - One-click copy for use in code

#### Smart Detection
- **Theme blocks** - Identified by theme slug prefix (e.g., `my-theme/hero`)
- **Core blocks** - WordPress core blocks (`core/paragraph`, `core/heading`, etc.)
- **Plugin blocks** - Third-party blocks from plugins

**REST API Endpoints:**

```
GET /wp-json/stratawp/v1/blocks
GET /wp-json/stratawp/v1/blocks/categories
```

Both endpoints support HTTP caching with ETag headers for optimal performance.

**Query Parameters:**
- `search` - Search by name, title, description, or keywords
- `category` - Filter by block category slug
- `source` - Filter by source: `all`, `theme`, `core`, or `plugin`

---

### Pattern Library

The Pattern Library helps you manage reusable block patterns with a visual interface.

**Features:**

#### Pattern Management
- **Create patterns** - Build new patterns from scratch
- **Edit patterns** - Open in Gutenberg block editor
- **Duplicate** - Clone patterns for quick variations
- **Export to theme** - Save patterns as PHP files in your theme
- **Delete** - Remove user-created patterns

#### Filtering & Search
- **Source filter** - Theme patterns vs. user-created patterns
- **Category filter** - Filter by pattern category
- **Tag filter** - Filter by pattern tags
- **Search** - Find patterns by title or keyword

#### Sync Status Tracking
- **Local** - Pattern exists only in database
- **Exported** - Pattern has been exported to theme
- **Modified** - Pattern changed after export

#### Save from Editor
The "Save as Pattern" button in the Gutenberg editor allows you to save any selection of blocks as a new pattern directly to the Pattern Library.

**Technical Highlights:**
- N+1 query prevention with term cache priming
- HTTP caching with content-based ETags
- Skeleton loading for smooth UX
- Toast notifications for all actions

---

## Installation

### In a Theme

1. Copy `packages/studio/` to your theme's `vendor/stratawp/studio/`

2. Add to your theme's `composer.json`:
   ```json
   {
     "autoload": {
       "psr-4": {
         "StrataWP\\Studio\\": "vendor/stratawp/studio/php/",
         "StrataWP\\": "vendor/stratawp/core/src/"
       }
     }
   }
   ```

3. Run `composer dump-autoload`

4. Initialize in `functions.php`:
   ```php
   if (file_exists(__DIR__ . '/vendor/stratawp/studio/php/autoload.php')) {
       require_once __DIR__ . '/vendor/stratawp/studio/php/autoload.php';
       \StrataWP\Studio\Studio::instance()->initialize();
   }
   ```

### As a Plugin

Studio can also be installed as a standalone WordPress plugin.

---

## Architecture

### Directory Structure

```
packages/studio/
├── dist/                    # Built assets
│   ├── index.js            # Main admin app
│   ├── gutenberg.js        # Block editor integration
│   └── style.css           # Styles
├── php/
│   ├── Studio.php          # Main plugin class
│   ├── RestApi/
│   │   ├── BlocksController.php      # Block Library API
│   │   ├── DesignSystemController.php # Design System API
│   │   └── PatternsController.php    # Pattern Library API
│   ├── PostTypes/
│   │   └── PatternPostType.php       # Pattern post type
│   └── Services/
│       └── PatternExporter.php       # Export patterns to theme
└── src/
    ├── api/                 # REST API clients
    ├── components/          # Shared React components
    ├── hooks/               # React hooks
    ├── pages/
    │   ├── BlockLibrary/    # Block Library page
    │   ├── DesignSystem/    # Design System page
    │   └── PatternLibrary/  # Pattern Library page
    ├── styles/              # CSS
    └── types/               # TypeScript types
```

### Tech Stack

- **Frontend**: React (via @wordpress/element), TypeScript
- **Build**: Vite with WordPress-specific configuration
- **State**: React hooks with @wordpress/data for notices
- **API**: WordPress REST API with @wordpress/api-fetch
- **Styling**: CSS with BEM methodology

### REST API Design

All REST endpoints follow these patterns:

1. **HTTP Caching** - ETag and Cache-Control headers on all GET endpoints
2. **Permission Checks** - `edit_theme_options` capability required
3. **Input Validation** - WordPress sanitization callbacks
4. **Consistent Response** - Standardized JSON structure

---

## Performance

### HTTP Caching

All REST endpoints support conditional requests:

| Endpoint | Cache Duration | ETag Type |
|----------|---------------|-----------|
| Blocks | 60s | Content hash |
| Block Categories | 5 min | Content hash |
| Design System | 60s | File-based |
| Patterns | 30s | Content hash |
| Theme Patterns | 5 min | Content hash |

### Query Optimization

- **N+1 Prevention**: Term cache priming before processing patterns
- **Efficient Filtering**: Server-side filtering reduces payload size
- **Lazy Loading**: Skeleton placeholders for perceived performance

---

## Development

### Building Studio

```bash
cd packages/studio
pnpm build
```

### Vite Configuration Notes

The Vite config uses special handling for WordPress:

- `rollup-plugin-external-globals` converts ESM imports to WordPress globals
- `jsxRuntime: 'classic'` uses React.createElement instead of automatic JSX
- External packages mapped to `wp.*` globals

### Adding New Features

1. Create types in `src/types/`
2. Add API client in `src/api/`
3. Create PHP controller in `php/RestApi/`
4. Add React hook in `src/hooks/`
5. Build UI components in `src/pages/`
6. Register controller in `php/Studio.php`

---

## Roadmap

### Phase 1 (Complete)
- [x] Design System Editor with live preview
- [x] Pattern Library with CRUD operations
- [x] Save as Pattern from block editor
- [x] Block Library Showcase tab

### Phase 2 (Planned)
- [ ] Block creation wizard
- [ ] Block variations management
- [ ] Pattern categories management
- [ ] Bulk pattern operations

### Phase 3 (Planned)
- [ ] Template Builder
- [ ] Starter Sites import
- [ ] Theme export

---

## API Reference

### Blocks API

#### List Blocks
```
GET /wp-json/stratawp/v1/blocks
```

**Parameters:**
- `search` (string) - Search query
- `category` (string) - Category slug
- `source` (string) - `all` | `theme` | `core` | `plugin`

**Response:**
```json
{
  "items": [
    {
      "name": "core/paragraph",
      "title": "Paragraph",
      "description": "Start with the basic building block...",
      "category": "text",
      "icon": "editor-paragraph",
      "keywords": ["text", "paragraph"],
      "supports": { "align": true, "color": true },
      "attributes": { "content": { "type": "string" } },
      "source": "core"
    }
  ],
  "total": 150,
  "categories": [
    { "slug": "text", "title": "Text" }
  ]
}
```

#### List Categories
```
GET /wp-json/stratawp/v1/blocks/categories
```

**Response:**
```json
[
  { "slug": "text", "title": "Text", "icon": null },
  { "slug": "media", "title": "Media", "icon": null }
]
```

### Patterns API

See `PatternsController.php` for full documentation of:
- `GET /stratawp/v1/patterns` - List patterns
- `POST /stratawp/v1/patterns` - Create pattern
- `PUT /stratawp/v1/patterns/{id}` - Update pattern
- `DELETE /stratawp/v1/patterns/{id}` - Delete pattern
- `POST /stratawp/v1/patterns/{id}/export` - Export to theme
- `POST /stratawp/v1/patterns/{id}/duplicate` - Duplicate pattern

### Design System API

See `DesignSystemController.php` for full documentation of:
- `GET /stratawp/v1/design-system` - Get current design tokens
- `POST /stratawp/v1/design-system` - Save design tokens
- `GET /stratawp/v1/design-system/presets` - List available presets

---

## License

GPL-3.0-or-later - Same as WordPress.
