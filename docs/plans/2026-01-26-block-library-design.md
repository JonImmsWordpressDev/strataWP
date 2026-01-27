# Block Library Design

**Date:** 2026-01-26
**Status:** Approved
**Author:** Jon Imms + Claude

## Overview

The Block Library is a comprehensive feature in StrataWP Studio for managing custom blocks, showcasing all available blocks with documentation, and creating block variations/styles with visual editing and code export.

## Goals

1. **Custom block scaffolding** - Generate boilerplate code (PHP, JS, JSON) for static and dynamic blocks
2. **Block showcase** - Document all blocks (core, theme, plugin) with manual and live examples
3. **Variations & styles** - Visual editor to create variations, export as version-controlled code

## Non-Goals

- Visual drag-and-drop block builder (ACF-style)
- Runtime block creation without code
- Block marketplace/registry

---

## Architecture Overview

The Block Library is a new page in StrataWP Studio with three main tabs:

```
┌─────────────────────────────────────────────────────────────┐
│ StrataWP Studio > Block Library                             │
├─────────────┬─────────────┬─────────────────────────────────┤
│  Showcase   │  Create     │  Variations & Styles            │
└─────────────┴─────────────┴─────────────────────────────────┘
```

- **Tab 1: Showcase** - Browse all registered blocks with documentation and examples
- **Tab 2: Create** - Scaffold new custom blocks (generates code files)
- **Tab 3: Variations & Styles** - Visual editor for block variations, exports to code

### File Structure

```
packages/studio/
├── src/
│   ├── pages/
│   │   └── BlockLibrary/
│   │       ├── index.tsx              # Main page with tabs
│   │       ├── ShowcaseTab.tsx        # Block browser
│   │       ├── CreateTab.tsx          # Block scaffolding wizard
│   │       └── VariationsTab.tsx      # Variations editor
│   ├── hooks/
│   │   ├── useBlocks.ts               # Fetch all registered blocks
│   │   └── useBlockExamples.ts        # Fetch examples from site
│   └── api/
│       └── blocks.ts                  # REST API calls
├── php/
│   ├── RestApi/
│   │   └── BlocksController.php       # Blocks REST endpoints
│   └── Services/
│       └── BlockScaffolder.php        # Code generation service
```

---

## Tab 1: Showcase

The Showcase tab displays all registered blocks with filtering, search, and documentation.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ [Search blocks...]                    [Filter: All ▼]        │
├────────────────┬─────────────────────────────────────────────┤
│ CATEGORIES     │  ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│                │  │ 📝      │ │ 🖼️      │ │ 📦      │        │
│ ○ All (47)     │  │Paragraph│ │ Image   │ │ Group   │        │
│ ○ Text (8)     │  │ core    │ │ core    │ │ core    │        │
│ ○ Media (6)    │  └─────────┘ └─────────┘ └─────────┘        │
│ ○ Layout (5)   │                                             │
│ ○ Theme (12)   │  ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│ ○ Plugin (16)  │  │ ⭐      │ │ 🛒      │ │ 📋      │        │
│                │  │ Hero    │ │ Product │ │ Form    │        │
│ SOURCE         │  │ theme   │ │ woo     │ │ plugin  │        │
│ ○ Core         │  └─────────┘ └─────────┘ └─────────┘        │
│ ○ Theme        │                                             │
│ ○ Plugins      │                                             │
└────────────────┴─────────────────────────────────────────────┘
```

### Block Detail Panel

When a block is selected:

```
┌──────────────────────────────────────────────────────────────┐
│ ← Back                                    [Copy] [Insert]    │
├──────────────────────────────────────────────────────────────┤
│ 📝 Paragraph                                                 │
│ core/paragraph                                    Core Block │
├──────────────────────────────────────────────────────────────┤
│ DESCRIPTION                                                  │
│ Start with the building block of all narrative.              │
├────────────────────────────┬─────────────────────────────────┤
│ EXAMPLES                   │  PREVIEW                        │
│                            │  ┌───────────────────────────┐  │
│ ○ Default (manual)         │  │ Lorem ipsum dolor sit     │  │
│ ○ Drop cap                 │  │ amet, consectetur...      │  │
│ ○ From: About page         │  └───────────────────────────┘  │
│ ○ From: Blog post #42      │                                 │
├────────────────────────────┴─────────────────────────────────┤
│ ATTRIBUTES                  SUPPORTS                         │
│ • content (string)          ✓ Align   ✓ Color   ✓ Typography│
│ • dropCap (boolean)         ✓ Spacing ✗ Anchor              │
│ • align (string)                                             │
└──────────────────────────────────────────────────────────────┘
```

### Data Sources

- **Block registry**: `wp.blocks.getBlockTypes()` for all registered blocks
- **Manual examples**: Stored as JSON files in theme (`blocks/examples/*.json`)
- **Live examples**: REST API scans posts for block usage (cached, on-demand)

---

## Tab 2: Create (Block Scaffolding)

A wizard that generates boilerplate code for custom blocks.

### Wizard Steps

```
Step 1: Basic Info    →    Step 2: Attributes    →    Step 3: Generate
```

### Step 1: Basic Info

```
┌──────────────────────────────────────────────────────────────┐
│ CREATE NEW BLOCK                                             │
├──────────────────────────────────────────────────────────────┤
│ Block Name                                                   │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Hero Section                                             │ │
│ └──────────────────────────────────────────────────────────┘ │
│ Slug: theme/hero-section (auto-generated)                    │
│                                                              │
│ Description                                                  │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ A full-width hero section with heading, text, and CTA    │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ Category                          Block Type                 │
│ ┌─────────────────────┐          ┌─────────────────────┐    │
│ │ Theme Blocks      ▼ │          │ ○ Static            │    │
│ └─────────────────────┘          │ ● Dynamic (PHP)     │    │
│                                  └─────────────────────┘    │
│ Icon                                                         │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                    │
│ │ ⭐  │ │ 📷  │ │ 📝  │ │ 🎨  │ │ ... │  [Browse...]       │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                    │
│                                          [Cancel] [Next →]   │
└──────────────────────────────────────────────────────────────┘
```

### Step 2: Attributes

```
┌──────────────────────────────────────────────────────────────┐
│ BLOCK ATTRIBUTES                              [+ Add Field]  │
├──────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ heading        string     "Welcome to our site"    [×]  │ │
│ │ description    string     ""                        [×]  │ │
│ │ buttonText     string     "Learn More"              [×]  │ │
│ │ buttonUrl      string     "#"                       [×]  │ │
│ │ backgroundImage object    null                      [×]  │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ SUPPORTS (toggle on/off)                                     │
│ ☑ Align (wide/full)    ☑ Color        ☐ Typography          │
│ ☑ Spacing              ☐ Anchor       ☐ HTML Editing        │
│                                      [← Back] [Generate →]   │
└──────────────────────────────────────────────────────────────┘
```

### Step 3: Generate

```
┌──────────────────────────────────────────────────────────────┐
│ READY TO GENERATE                                            │
├──────────────────────────────────────────────────────────────┤
│ The following files will be created in your theme:           │
│                                                              │
│ 📁 blocks/hero-section/                                      │
│    ├── 📄 block.json         Block metadata                  │
│    ├── 📄 edit.tsx           Editor component                │
│    ├── 📄 render.php         Frontend render (dynamic)       │
│    ├── 📄 style.css          Block styles                    │
│    └── 📄 editor.css         Editor-only styles              │
│                                                              │
│ 📄 blocks/index.php          Updated to register new block   │
│                                          [← Back] [Create]   │
└──────────────────────────────────────────────────────────────┘
```

### Generated Files

For a dynamic block named "hero-section":

**block.json**
```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "theme/hero-section",
  "title": "Hero Section",
  "category": "theme",
  "icon": "star-filled",
  "description": "A full-width hero section with heading, text, and CTA",
  "attributes": {
    "heading": { "type": "string", "default": "Welcome to our site" },
    "description": { "type": "string", "default": "" },
    "buttonText": { "type": "string", "default": "Learn More" },
    "buttonUrl": { "type": "string", "default": "#" },
    "backgroundImage": { "type": "object" }
  },
  "supports": {
    "align": ["wide", "full"],
    "color": { "background": true, "text": true },
    "spacing": { "padding": true, "margin": true }
  },
  "textdomain": "theme",
  "editorScript": "file:./edit.tsx",
  "editorStyle": "file:./editor.css",
  "style": "file:./style.css",
  "render": "file:./render.php"
}
```

**edit.tsx**
```tsx
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import './editor.css';

export default function Edit({ attributes, setAttributes }) {
  const { heading, description, buttonText, buttonUrl } = attributes;
  const blockProps = useBlockProps();

  return (
    <>
      <InspectorControls>
        <PanelBody title={__('Settings', 'theme')}>
          <TextControl
            label={__('Button Text', 'theme')}
            value={buttonText}
            onChange={(value) => setAttributes({ buttonText: value })}
          />
          <TextControl
            label={__('Button URL', 'theme')}
            value={buttonUrl}
            onChange={(value) => setAttributes({ buttonUrl: value })}
          />
        </PanelBody>
      </InspectorControls>
      <div {...blockProps}>
        {/* Block editor preview */}
      </div>
    </>
  );
}
```

**render.php**
```php
<?php
/**
 * Hero Section block render
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Block content.
 * @var WP_Block $block      Block instance.
 */

$heading     = $attributes['heading'] ?? '';
$description = $attributes['description'] ?? '';
$button_text = $attributes['buttonText'] ?? '';
$button_url  = $attributes['buttonUrl'] ?? '#';
?>
<section <?php echo get_block_wrapper_attributes(); ?>>
    <h1><?php echo esc_html($heading); ?></h1>
    <p><?php echo esc_html($description); ?></p>
    <a href="<?php echo esc_url($button_url); ?>" class="button">
        <?php echo esc_html($button_text); ?>
    </a>
</section>
```

---

## Tab 3: Variations & Styles

Visual editor to create block variations and styles, with export to code files.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ VARIATIONS & STYLES                         [+ New Variation]│
├────────────────┬─────────────────────────────────────────────┤
│ SELECT BLOCK   │  EXISTING VARIATIONS                        │
│                │  ┌─────────────────────────────────────────┐│
│ ┌────────────┐ │  │ ✎ Hero - Centered        core    [···] ││
│ │Search...   │ │  │ ✎ Hero - Left Aligned    theme   [···] ││
│ └────────────┘ │  └─────────────────────────────────────────┘│
│                │                                             │
│ core/group     │  EXISTING STYLES                            │
│ core/columns   │  ┌─────────────────────────────────────────┐│
│ core/cover   ← │  │ ● Default                               ││
│ core/buttons   │  │ ○ Rounded Corners         theme   [···] ││
│ theme/hero     │  └─────────────────────────────────────────┘│
└────────────────┴─────────────────────────────────────────────┘
```

### Variation Editor

```
┌──────────────────────────────────────────────────────────────┐
│ EDIT VARIATION: Hero - Left Aligned              [Save] [×]  │
├──────────────────────────────────────────────────────────────┤
│ Name                           Scope                         │
│ ┌────────────────────────┐    ○ Variation (preset attrs)     │
│ │ Hero - Left Aligned    │    ● Style (CSS only)             │
│ └────────────────────────┘                                   │
├─────────────────────────────┬────────────────────────────────┤
│ ATTRIBUTES / STYLES         │ LIVE PREVIEW                   │
│                             │ ┌────────────────────────────┐ │
│ Alignment: [Left ▼]         │ │  Welcome to Our Site       │ │
│ Min Height: [500px]         │ │  Discover amazing things   │ │
│ Background: [■ #1a1a2e]     │ │  [Learn More]              │ │
│ Text Color: [■ #ffffff]     │ └────────────────────────────┘ │
│                             │ Device: [📱] [💻] [🖥️]         │
├─────────────────────────────┴────────────────────────────────┤
│                              [Delete] [Export to Code]       │
└──────────────────────────────────────────────────────────────┘
```

### Export to Code

Generates version-controlled files:

**blocks/variations/cover-left-aligned.js**
```js
import { registerBlockVariation } from '@wordpress/blocks';

registerBlockVariation('core/cover', {
  name: 'hero-left-aligned',
  title: 'Hero - Left Aligned',
  description: 'A hero section with left-aligned content',
  attributes: {
    align: 'full',
    contentPosition: 'center left',
    minHeight: 500,
    minHeightUnit: 'px',
  },
  scope: ['inserter'],
  isActive: (blockAttributes, variationAttributes) =>
    blockAttributes.contentPosition === 'center left',
});
```

**blocks/variations/cover-left-aligned.css**
```css
.wp-block-cover.is-style-hero-left-aligned {
  /* Custom styles */
}
```

---

## REST API

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stratawp/v1/blocks` | List all registered blocks |
| GET | `/stratawp/v1/blocks/{name}` | Get single block details |
| GET | `/stratawp/v1/blocks/{name}/examples` | Get examples (manual + live) |
| POST | `/stratawp/v1/blocks/scaffold` | Generate new block files |
| GET | `/stratawp/v1/blocks/variations` | List all variations/styles |
| POST | `/stratawp/v1/blocks/variations` | Create variation (DB draft) |
| PUT | `/stratawp/v1/blocks/variations/{id}` | Update variation |
| DELETE | `/stratawp/v1/blocks/variations/{id}` | Delete variation |
| POST | `/stratawp/v1/blocks/variations/{id}/export` | Export to code files |
| GET | `/stratawp/v1/blocks/usage` | Scan site for block usage |

### BlocksController.php

```php
class BlocksController extends WP_REST_Controller {
    protected $namespace = 'stratawp/v1';
    protected $rest_base = 'blocks';

    // Returns all blocks from WP_Block_Type_Registry
    // Includes: name, title, description, icon, category,
    //           attributes, supports, source (core/theme/plugin)
    public function get_blocks();

    // Scans posts for block usage, returns examples
    // Caches results, refreshes on-demand
    public function get_block_examples($block_name);

    // Calls BlockScaffolder service to generate files
    public function scaffold_block($request);

    // CRUD for variations (stored in DB until exported)
    public function create_variation($request);
    public function export_variation($id);
}
```

### BlockScaffolder.php

```php
class BlockScaffolder {
    // Generates block files from templates
    public function scaffold(array $config): array {
        // Returns ['success' => true, 'files' => [...paths created]]
    }

    // Templates for different block types
    private function get_static_template(): string;
    private function get_dynamic_template(): string;

    // File generators
    private function generate_block_json(array $config): string;
    private function generate_edit_tsx(array $config): string;
    private function generate_render_php(array $config): string;
    private function generate_styles(array $config): array;
}
```

---

## Data Storage

| Data | Location |
|------|----------|
| Block registry | Runtime (WordPress core) |
| Manual examples | `theme/blocks/examples/*.json` |
| Draft variations | `wp_stratawp_variations` table |
| Exported variations | `theme/blocks/variations/*.js` |
| Scaffolded blocks | `theme/blocks/{slug}/` |

### Database Schema

```sql
CREATE TABLE wp_stratawp_variations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    block_name VARCHAR(100) NOT NULL,
    variation_name VARCHAR(100) NOT NULL,
    variation_slug VARCHAR(100) NOT NULL,
    variation_type ENUM('variation', 'style') NOT NULL,
    attributes JSON,
    styles TEXT,
    is_exported BOOLEAN DEFAULT FALSE,
    export_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_variation (block_name, variation_slug)
);
```

---

## Implementation Phases

### Phase 1: Showcase Tab
- BlocksController REST API (list blocks, get examples)
- useBlocks hook
- ShowcaseTab component with filtering and search
- Block detail panel with attributes/supports display

### Phase 2: Create Tab
- BlockScaffolder PHP service
- Scaffold REST endpoint
- CreateTab wizard UI (3 steps)
- Block templates (static + dynamic)

### Phase 3: Variations Tab
- Variations database table
- Variations CRUD REST endpoints
- VariationsTab UI with live preview
- Export to code functionality
