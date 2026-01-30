# StrataWP Studio - Pattern Library Design

## Overview

**Goal:** Give editors and developers full control over block patterns - discover, create, organize, and export to theme.

**Key Decisions:**
- **Capabilities:** Full management (browse, create, edit, delete, categorize, export)
- **Storage:** Hybrid (database + export to theme files)
- **Creation:** Block Editor integration ("Save as Pattern" from selected blocks)
- **Organization:** Categories + Tags

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Pattern Library UI                    │
│  (packages/studio/src/pages/PatternLibrary/index.tsx)   │
├─────────────────────────────────────────────────────────┤
│   Browse/Filter  │  Pattern Details  │  Quick Actions   │
│   - Categories   │  - Preview        │  - Edit in WP    │
│   - Tags         │  - Metadata       │  - Duplicate     │
│   - Search       │  - Usage stats    │  - Export        │
│   - Source filter│                   │  - Delete        │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    REST API Layer                        │
│     /stratawp/v1/patterns (CRUD + export)               │
│     /stratawp/v1/pattern-categories                     │
│     /stratawp/v1/pattern-tags                           │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────┬─────────────────────────────────────┐
│  Custom Post Type │        Theme Files                  │
│  stratawp_pattern │   /patterns/*.php (exported)        │
│  + taxonomies     │                                     │
└───────────────────┴─────────────────────────────────────┘
```

**Data Sources:**
- **Theme patterns** - Read from `theme/patterns/` directory (read-only in UI)
- **User patterns** - Stored in `stratawp_pattern` CPT (full CRUD)

---

## Data Model

### Custom Post Type: `stratawp_pattern`

```php
Post Type Args:
- public: false (admin only)
- show_in_rest: true (for API access)
- supports: title, editor, custom-fields, revisions
```

### Post Meta

| Meta Key | Type | Description |
|----------|------|-------------|
| `_stratawp_pattern_keywords` | array | Keywords for search |
| `_stratawp_pattern_viewport` | string | Preferred preview width |
| `_stratawp_pattern_sync_status` | string | 'local' \| 'exported' \| 'modified' |
| `_stratawp_pattern_export_path` | string | Path if exported to theme |
| `_stratawp_pattern_block_types` | array | Block types used in pattern |

### Taxonomies

**`stratawp_pattern_category`** (hierarchical)
- Built-in: Hero, Features, Testimonials, CTA, Team, Pricing, FAQ, Gallery, Contact, Footer, Header

**`stratawp_pattern_tag`** (non-hierarchical)
- User-defined: dark-mode, full-width, minimal, animated, etc.

### Sync Status Flow

```
Create → 'local'
Export to theme → 'exported'
Edit after export → 'modified' (shows warning)
Re-export → 'exported'
```

---

## UI Components

### Pattern Library Page Layout

```
┌──────────────────────────────────────────────────────────────┐
│ [Filters Sidebar]        │  [Pattern Grid]                   │
│                          │                                   │
│ Source                   │  ┌─────────┐ ┌─────────┐ ┌─────┐ │
│ ○ All                    │  │ ░░░░░░░ │ │ ░░░░░░░ │ │ ░░░ │ │
│ ○ Theme (12)             │  │ Pattern │ │ Pattern │ │ ... │ │
│ ○ User (8)               │  │ Name    │ │ Name    │ │     │ │
│                          │  │ [Edit]  │ │ [Edit]  │ │     │ │
│ Categories               │  └─────────┘ └─────────┘ └─────┘ │
│ ☑ Hero                   │                                   │
│ ☑ Features               │  ┌─────────┐ ┌─────────┐         │
│ ☐ Testimonials           │  │ ░░░░░░░ │ │ ░░░░░░░ │         │
│ ☐ CTA                    │  │ Pattern │ │ Pattern │         │
│ ...                      │  │ Name    │ │ Name    │         │
│                          │  └─────────┘ └─────────┘         │
│ Tags                     │                                   │
│ [dark-mode] [minimal]    │  ──────────────────────────────── │
│                          │  Showing 20 of 45 patterns        │
│ ──────────────────────   │  [Load More]                      │
│ [+ New Pattern]          │                                   │
└──────────────────────────────────────────────────────────────┘
```

### Pattern Card

- Thumbnail preview (rendered iframe or screenshot)
- Pattern name
- Source badge (Theme / User)
- Sync status indicator (if exported/modified)
- Hover actions: Edit, Duplicate, Export, Delete

### Pattern Detail Modal

- Large live preview with viewport switcher
- Edit metadata (name, categories, tags, keywords)
- "Edit in Block Editor" button → opens in Gutenberg
- "Export to Theme" button (user patterns only)
- Usage info: where pattern is used

### "New Pattern" Flow

1. Click "+ New Pattern"
2. Modal: Enter pattern name + select category
3. Redirects to Block Editor with new post
4. User builds pattern in Gutenberg
5. On save, returns to Pattern Library

---

## Block Editor Integration

### "Save as Pattern" Toolbar Button

Shows when blocks are selected in Gutenberg:

```
┌─────────────────────────────────────────┐
│ [Block Toolbar]                         │
│ ┌───┐ ┌───┐ ┌───┐ ┌─────────────────┐  │
│ │ ⬆ │ │ ⬇ │ │ ⋮ │ │ 💾 Save Pattern │  │
│ └───┘ └───┘ └───┘ └─────────────────┘  │
└─────────────────────────────────────────┘
```

### Save Pattern Modal

```
┌─────────────────────────────────────────┐
│  Save as Pattern                    [X] │
├─────────────────────────────────────────┤
│  Pattern Name                           │
│  ┌─────────────────────────────────┐   │
│  │ Hero with Two Columns           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Category                               │
│  ┌─────────────────────────────────┐   │
│  │ Hero                         ▼  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Tags (optional)                        │
│  ┌─────────────────────────────────┐   │
│  │ dark-mode, full-width           │   │
│  └─────────────────────────────────┘   │
│                                         │
│         [Cancel]  [Save Pattern]        │
└─────────────────────────────────────────┘
```

### Implementation

- Register Gutenberg plugin via `registerPlugin()`
- Add `BlockControls` slot with "Save Pattern" button
- Shows when 1+ blocks selected
- Captures `wp.data.select('core/block-editor').getSelectedBlocks()`
- Serializes to block markup via `wp.blocks.serialize()`
- POSTs to `/stratawp/v1/patterns`
- Shows success toast with "View in Pattern Library" link

### Editing Existing Patterns

- "Edit in Block Editor" opens `/wp-admin/post.php?post={id}&action=edit`
- Pattern CPT uses standard block editor
- On save, pattern updates in database
- If previously exported, sync status changes to 'modified'

---

## REST API

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stratawp/v1/patterns` | List patterns (with filters) |
| POST | `/stratawp/v1/patterns` | Create pattern |
| GET | `/stratawp/v1/patterns/{id}` | Get single pattern |
| PUT | `/stratawp/v1/patterns/{id}` | Update pattern |
| DELETE | `/stratawp/v1/patterns/{id}` | Delete pattern |
| POST | `/stratawp/v1/patterns/{id}/export` | Export to theme file |
| POST | `/stratawp/v1/patterns/{id}/duplicate` | Duplicate pattern |
| GET | `/stratawp/v1/pattern-categories` | List categories |
| GET | `/stratawp/v1/pattern-tags` | List tags |

### Query Parameters (GET /patterns)

- `source`: 'all' | 'theme' | 'user'
- `category`: category slug
- `tag`: tag slug
- `search`: keyword search
- `per_page`, `page`: pagination

### Permissions

- All endpoints require `edit_theme_options` capability
- Export requires theme directory to be writable

---

## Export to Theme

When user clicks "Export to Theme":

1. Generate pattern PHP file:

```php
<?php
/**
 * Title: Hero with Two Columns
 * Slug: theme-slug/hero-two-columns
 * Categories: hero
 * Keywords: hero, columns, cta
 */
?>
<!-- wp:group {"layout":{"type":"constrained"}} -->
...block markup...
<!-- /wp:group -->
```

2. Write to `theme/patterns/{slug}.php`
3. Update pattern meta: `sync_status = 'exported'`, store path
4. WordPress auto-registers on next load

---

## File Structure

```
packages/studio/
├── src/
│   ├── pages/
│   │   └── PatternLibrary/
│   │       ├── index.tsx           # Main page component
│   │       ├── PatternGrid.tsx     # Grid of pattern cards
│   │       ├── PatternCard.tsx     # Single pattern card
│   │       ├── PatternFilters.tsx  # Sidebar filters
│   │       ├── PatternModal.tsx    # Detail/edit modal
│   │       └── NewPatternModal.tsx # Create new pattern
│   ├── hooks/
│   │   └── usePatterns.ts          # Pattern data hook
│   ├── api/
│   │   └── patterns.ts             # API client functions
│   └── types/
│       └── patterns.ts             # Pattern type definitions
├── php/
│   ├── RestApi/
│   │   └── PatternsController.php  # REST API controller
│   ├── Services/
│   │   ├── PatternExporter.php     # Export to theme files
│   │   └── PatternRegistry.php     # CPT + taxonomy registration
│   └── Studio.php                  # Updated with pattern routes
└── gutenberg/
    └── save-pattern-plugin/
        ├── index.ts                # Plugin registration
        ├── SavePatternButton.tsx   # Toolbar button
        └── SavePatternModal.tsx    # Save modal
```

---

## Build Sequence

**Phase 2A - Backend Foundation:**
1. Register CPT and taxonomies
2. Create REST API controller
3. Implement pattern exporter service

**Phase 2B - Frontend Library:**
4. Create pattern types and API client
5. Build usePatterns hook
6. Build PatternLibrary page components

**Phase 2C - Block Editor Integration:**
7. Create Gutenberg plugin for "Save as Pattern"
8. Wire up to REST API
9. Add success/error handling

**Phase 2D - Polish:**
10. Pattern preview rendering
11. Sync status indicators
12. Export workflow UI
