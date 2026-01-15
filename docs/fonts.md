# Font Management in StrataWP

StrataWP provides flexible font management with three loading modes to suit different performance and privacy requirements.

## Font Loading Modes

### 1. Google Fonts API (Default)

Loads fonts directly from Google's servers. Easy to set up with curated pairings.

**Pros:**
- No configuration needed
- Access to all Google Fonts
- Curated font pairings available

**Cons:**
- External HTTP requests
- Creates network dependency chain (Lighthouse warning)
- Privacy concerns (Google tracking)

### 2. Self-Hosted (Recommended for Performance)

Fonts are bundled with your theme. Best for Lighthouse scores and GDPR compliance.

**Pros:**
- No external requests
- Eliminates "Network dependency tree" Lighthouse warnings
- Better privacy (no Google tracking)
- Faster loading (fonts bundled with CSS)
- GDPR compliant

**Cons:**
- Requires manual font installation
- Slightly larger theme file size

### 3. Disabled

No font loading or CSS variables. Full manual control.

## Setting Up Self-Hosted Fonts

### Step 1: Install @fontsource Packages

In your theme directory, install the fonts you need:

```bash
# Install fonts via pnpm
pnpm add @fontsource/spectral @fontsource/manrope @fontsource/fira-code

# Or via npm
npm install @fontsource/spectral @fontsource/manrope @fontsource/fira-code
```

Find available fonts at [fontsource.org](https://fontsource.org/).

### Step 2: Create Font SCSS Partial

Create `src/scss/_fonts.scss`:

```scss
/**
 * Self-Hosted Fonts
 *
 * Using @fontsource for better performance:
 * - No external requests to fonts.googleapis.com
 * - Eliminates network dependency chain in Lighthouse
 * - Fonts bundled with theme assets
 */

// Spectral (serif) - for headings
@import '@fontsource/spectral/400.css';
@import '@fontsource/spectral/600.css';
@import '@fontsource/spectral/700.css';

// Manrope (sans-serif) - for body text
@import '@fontsource/manrope/300.css';
@import '@fontsource/manrope/400.css';
@import '@fontsource/manrope/500.css';
@import '@fontsource/manrope/600.css';
@import '@fontsource/manrope/700.css';

// Fira Code (monospace) - for code blocks
@import '@fontsource/fira-code/400.css';
@import '@fontsource/fira-code/600.css';
```

### Step 3: Import in Main SCSS

Update `src/scss/main.scss`:

```scss
// Self-hosted fonts (import first)
@import 'fonts';

// Variables & CSS Custom Properties
@import 'variables';

// ... rest of imports
```

### Step 4: Define CSS Variables

Update `src/scss/_variables.scss`:

```scss
:root {
  // Typography - Self-hosted fonts via @fontsource
  --font-heading: 'Spectral', Georgia, 'Times New Roman', serif;
  --font-body: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'Fira Code', 'SF Mono', Monaco, Consolas, monospace;
}
```

### Step 5: Update theme.json

Add fonts to `theme.json` for WordPress editor:

```json
{
  "settings": {
    "typography": {
      "fontFamilies": [
        {
          "fontFamily": "'Spectral', Georgia, serif",
          "name": "Spectral",
          "slug": "spectral"
        },
        {
          "fontFamily": "'Manrope', sans-serif",
          "name": "Manrope",
          "slug": "manrope"
        },
        {
          "fontFamily": "'Fira Code', monospace",
          "name": "Fira Code",
          "slug": "fira-code"
        }
      ]
    }
  }
}
```

### Step 6: Configure StrataWP

Either set via WordPress admin:
- Go to **Settings > StrataWP Typography**
- Select **Self-Hosted** under Font Loading Mode

Or programmatically in `functions.php`:

```php
// Force self-hosted mode via filter
add_filter('stratawp_font_loading_mode', function() {
    return \StrataWP\Components\Fonts::MODE_SELF_HOSTED;
});
```

Or disable the Fonts component entirely:

```php
// In functions.php, remove Fonts from components array
$theme = new Theme([
    new Setup(),
    new Assets(),
    new Blocks(),
    new Performance(),
    // new Fonts(), // Disabled - using self-hosted fonts
    new Navigation(),
]);
```

### Step 7: Build Theme

```bash
pnpm build
```

Fonts will be bundled into `dist/fonts/` and included in your CSS.

## Programmatic Control

### Using Filters

```php
// Force a specific mode
add_filter('stratawp_font_loading_mode', function($mode) {
    return 'self-hosted'; // or 'google-api' or 'disabled'
});
```

### Checking Mode in Templates

```php
$fonts = strata_basic()->get_component('fonts');

if ($fonts->is_self_hosted()) {
    // Self-hosted mode
}

if ($fonts->is_disabled()) {
    // Fonts component disabled
}

$mode = $fonts->get_font_loading_mode();
// Returns: 'google-api', 'self-hosted', or 'disabled'
```

## Performance Comparison

| Metric | Google Fonts API | Self-Hosted |
|--------|------------------|-------------|
| External Requests | 2+ (CSS + fonts) | 0 |
| Lighthouse Warning | Yes (dependency chain) | No |
| First Load | Slower | Faster |
| Cached Load | Similar | Similar |
| Privacy | Google tracking | No tracking |

## Troubleshooting

### Fonts Not Loading

1. Check that `@fontsource` packages are installed
2. Verify imports in `_fonts.scss`
3. Rebuild the theme: `pnpm build`
4. Check browser DevTools Network tab for 404s

### Lighthouse Still Shows Warning

1. Ensure Font Loading Mode is set to "Self-Hosted"
2. Remove any remaining Google Fonts references in:
   - `functions.php` (check for `wp_enqueue_style` with fonts.googleapis.com)
   - `performance-optimization.php` (remove dns-prefetch/preconnect for Google)
3. Clear any caching plugins

### Editor Fonts Don't Match Frontend

Add fonts to `theme.json` (see Step 5 above) and ensure the editor stylesheet includes font imports.
