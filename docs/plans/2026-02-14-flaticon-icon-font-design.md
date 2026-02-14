# Flaticon Icon Font Integration for StrataWP

**Date:** 2026-02-14
**Status:** Approved

## Problem

StrataWP has no icon system. The feature-card block uses emoji strings as a placeholder. Themes need a proper icon framework for navigation, buttons, feature sections, and service cards.

## Solution

Integrate Flaticon icon fonts into StrataWP as a first-class feature: a PHP component for rendering, a Vite plugin extension for building, and a CLI command for setup.

## Approach

Curated icon font from Flaticon, bundled directly in the theme. No runtime API dependency. Users select icons on flaticon.com, download the icon font ZIP, and the StrataWP toolchain handles the rest.

## Design

### 1. Directory Convention

Icon font files live in a standard location within any StrataWP theme:

```
my-theme/
  src/
    icons/
      flaticon.css          # Flaticon's generated stylesheet
      fonts/
        flaticon.woff2      # Icon font files (primary)
        flaticon.woff        # Fallback
        flaticon.ttf         # Fallback
```

The Vite build copies these to `dist/icons/` alongside other theme assets.

### 2. PHP Component: `Icons`

**Location:** `packages/core/src/Components/Icons.php`

Implements `ComponentInterface` and `TemplatingComponentInterface`.

**Responsibilities:**
- Enqueue icon font CSS via `wp_enqueue_style` on `wp_enqueue_scripts`
- Provide template tag helpers for rendering icons
- Parse available icon names from the CSS file

**Template Tags:**
- `render( $name, $args = [] )` — echoes `<i class="flaticon-{$name}" aria-hidden="true"></i>` with optional size/color classes
- `get( $name, $args = [] )` — returns the icon HTML string
- `list()` — returns array of available icon class names (parsed from CSS)

**Args supported:**
- `size` — CSS class suffix: `sm`, `md`, `lg`, `xl` (maps to predefined font sizes)
- `class` — additional CSS classes
- `aria-label` — if provided, removes `aria-hidden` and adds the label for accessibility

**Constructor config:**
- `$css_path` — path to icon CSS file relative to theme root (default: `src/icons/flaticon.css` in dev, `dist/icons/flaticon.css` in production)

**Usage examples:**
```php
// In any template, pattern, or template part
<?php strata()->icons()->render('home', ['size' => 'lg']); ?>

// Return HTML for use in PHP logic
$icon = strata()->icons()->get('arrow-right');

// List all available icons
$icons = strata()->icons()->list();
```

**Registration in functions.php:**
```php
$theme = new \StrataWP\Theme([
    new \StrataWP\Components\Setup(),
    new \StrataWP\Components\Assets(),
    new \StrataWP\Components\Icons(),  // Add icons
    new \StrataWP\Components\Blocks(),
]);
```

### 3. Vite Plugin Extension

Small addition to `@stratawp/vite-plugin` to handle the `src/icons/` directory:

- **Build:** Copy `src/icons/` to `dist/icons/`, rewriting CSS `url()` paths for font files
- **Dev:** Watch `src/icons/` for changes, trigger page reload on change
- **No new plugin file** — extend the existing assets plugin to handle icon directories

### 4. CLI Command: `stratawp icons:setup`

**Location:** `packages/cli/src/commands/icons.ts`

**Interactive flow:**
1. "Do you have a Flaticon font ZIP to import?" (yes/no)
2. If yes: path to ZIP → extract to `src/icons/`, rename to standard convention
3. If no: create `src/icons/` directory with README explaining Flaticon workflow
4. Auto-register `Icons` component in theme's `functions.php`
5. Print usage instructions and available icon names

**Sub-commands:**
- `stratawp icons:setup` — initial setup
- `stratawp icons:update` — replace existing icon font with new ZIP
- `stratawp icons:list` — list available icon names from the CSS

### 5. CSS Size Utilities

Small CSS file added to the Icons component output:

```css
.strata-icon--sm { font-size: 0.875rem; }
.strata-icon--md { font-size: 1.25rem; }
.strata-icon--lg { font-size: 1.75rem; }
.strata-icon--xl { font-size: 2.5rem; }
```

These compose with Flaticon's own classes: `<i class="flaticon-home strata-icon--lg"></i>`.

### 6. Future Enhancements (Not in v1)

- **Block editor IconPicker component** — React component that reads available icons from the font CSS and provides a visual picker in the block editor
- **Multiple icon sets** — support loading more than one icon font (e.g., Flaticon + custom SVGs)
- **Icon search in admin** — browse and preview installed icons from WP admin

## Files to Create/Modify

### New Files
- `packages/core/src/Components/Icons.php` — PHP component
- `packages/cli/src/commands/icons.ts` — CLI command
- `examples/basic-theme/src/icons/README.md` — placeholder explaining setup

### Modified Files
- `packages/vite-plugin/src/plugins/assets.ts` — add icon directory handling
- `examples/basic-theme/functions.php` — add Icons component registration
- `packages/core/composer.json` — no changes needed (autoloader covers new file)

## User Workflow

1. Go to flaticon.com, create a collection of icons
2. Download the collection as an icon font (ZIP)
3. Run `stratawp icons:setup` and point to the ZIP
4. Icons are extracted to `src/icons/` and component is registered
5. Use `strata()->icons()->render('icon-name')` in templates
6. To update: download new ZIP, run `stratawp icons:update`
