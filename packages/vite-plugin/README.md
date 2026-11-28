# @stratawp/vite-plugin

Vite plugin for WordPress theme development with StrataWP.

## Features

- ⚡ **Lightning Fast HMR** - Hot module replacement for JS, CSS, and PHP files
- 🧩 **Block Auto-Discovery** - Automatically finds and registers Gutenberg blocks
- 📦 **WordPress Asset Manifest** - Proper dependency management for WordPress
- 🎨 **Optimized Builds** - WordPress-friendly asset structure
- 🔄 **PHP File Watching** - See template changes without manual refresh

## Installation

```bash
pnpm add -D @stratawp/vite-plugin
```

## Usage

### Basic Setup

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { strataWP } from '@stratawp/vite-plugin'

export default defineConfig({
  plugins: [
    strataWP({
      blocks: {
        dir: 'src/blocks',
        autoRegister: true,
      },
      phpHmr: {
        enabled: true,
        watch: ['**/*.php', 'theme.json'],
      },
    }),
  ],
})
```

### Options

#### Block Options

```typescript
{
  blocks: {
    dir: 'src/blocks',        // Block directory
    autoRegister: true,       // Auto-register in WordPress
    namespace: 'stratawp',    // Block namespace
  }
}
```

#### PHP HMR Options

```typescript
{
  phpHmr: {
    enabled: true,                           // Enable PHP watching
    watch: ['**/*.php', 'theme.json'],      // Patterns to watch
    debounce: 100,                          // Debounce delay (ms)
  }
}
```

#### Manifest Options

```typescript
{
  manifest: {
    enabled: true,                          // Generate manifest
    output: 'dist/.vite/manifest.json',    // Output path
    wordpress: true,                        // WordPress metadata
  }
}
```

#### Design Token Options

Off by default. When enabled, the build reads `theme.json` and writes `tokens.json` and `tokens.css` to the build output, so a decoupled (headless) frontend can use the theme's palette, gradients, font families, font sizes, spacing sizes and layout widths without copying them by hand.

```typescript
{
  tokens: true,                             // dist/tokens.json + dist/tokens.css
  // or
  tokens: {
    themeJson: 'theme.json',                // Path from the Vite root
    outDir: 'tokens',                       // Subfolder of the build output
  }
}
```

`tokens.css` uses WordPress's own variable names, so block markup and frontend components resolve the same values:

```css
:root {
  --wp--preset--color--primary: #0000ff;
  --wp--preset--font-size--large: 24px;
  --wp--preset--spacing--small: clamp(30px, 4vw, 40px);
  --wp--style--global--content-size: 640px;
  --wp--style--global--wide-size: 1200px;
}
```

Only the theme's own presets are included, not WordPress's defaults. Font sizes use their `size` value; a fluid size's `min` / `max` are listed in `tokens.json` but WordPress's computed `clamp()` is not reproduced.

## How It Works

### Block Auto-Discovery

The plugin scans your `src/blocks` directory for `block.json` files and automatically:

1. Discovers all blocks
2. Generates PHP registration code
3. Watches for changes during development
4. Rebuilds on block.json modifications

### PHP Hot Reload

When you modify PHP template files:

1. Plugin detects the change
2. Sends reload signal to browser
3. Page refreshes automatically
4. Preserves development state where possible

### Asset Manifest

Generates a WordPress-compatible manifest that includes:

- File paths and hashes
- CSS dependencies
- WordPress script dependencies (wp-element, wp-blocks, etc.)
- Version strings

## Examples

See the `examples/` directory in the StrataWP repository for complete working examples.

## License

GPL-3.0-or-later
