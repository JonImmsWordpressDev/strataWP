# @stratawp/registry

Component registry for sharing and discovering reusable StrataWP components, blocks, patterns, and templates.

## Features

- **Search & Discovery**: Find components by name, type, or keywords
- **Easy Installation**: One-command installation with automatic setup
- **Version Management**: Semantic versioning and dependency resolution
- **Publishing**: Share your components with the community
- **Multiple Types**: Blocks, components, patterns, templates, integrations
- **npm-Powered**: Leverages npm registry for reliable distribution

## Installation

```bash
pnpm add @stratawp/registry
```

The registry commands are automatically available through the `@stratawp/cli`.

## Usage

### Search for Components

Find components in the registry by name, keywords, or type:

```bash
# Search for all components
stratawp registry:search hero

# Filter by type
stratawp registry:search grid --type block
stratawp registry:search analytics --type component

# Limit results
stratawp registry:search card --limit 10
```

**Example Output:**
```
🔍 Searching for: hero

Found 5 component(s):

@stratawp/hero-block [block]
  Full-width hero section with background image and CTA
  v1.2.0 • by John Doe
  #hero #cta #landing-page

@stratawp/hero-slider [block]
  Animated hero slider with multiple slides
  v2.0.1 • by Jane Smith
  #slider #carousel #hero
```

### Get Component Information

View detailed information about a specific component:

```bash
stratawp registry:info @stratawp/hero-block
```

**Example Output:**
```
📋 Component Information

@stratawp/hero-block v1.2.0
────────────────────────────────────────────────────────────

Full-width hero section with customizable background,
heading, subheading, and call-to-action button.

Type: block
Author: John Doe
License: GPL-3.0-or-later

Links:
  Homepage: https://example.com/hero-block
  Repository: https://github.com/username/hero-block

WordPress Requirements:
  Requires: 6.0+
  Tested up to: 6.4
  PHP: 8.0+

Keywords:
  #hero #cta #landing-page #design #layout

Dependencies:
  @wordpress/blocks: ^12.0.0
  @wordpress/block-editor: ^12.0.0

Recent Versions:
  1.2.0 (latest)
  1.1.0
  1.0.2

Stats:
  Created: 01/15/2024
  Last Modified: 12/10/2024

Install:
  stratawp registry:install @stratawp/hero-block
```

### Install Components

Install components directly into your theme:

```bash
# Install latest version
stratawp registry:install @stratawp/hero-block

# Install specific version
stratawp registry:install @stratawp/hero-block@1.1.0

# Force overwrite existing component
stratawp registry:install @stratawp/hero-block --force

# Install to custom directory
stratawp registry:install @stratawp/hero-block --target-dir src/custom-blocks
```

**What Happens During Installation:**
1. Downloads the component from npm registry
2. Extracts files to the appropriate directory based on type
3. Runs pre-install hooks (if defined)
4. Installs component dependencies
5. Runs post-install hooks (if defined)
6. Provides usage instructions

**Component Type Directories:**
- `block` → `src/blocks/`
- `component` → `inc/Components/`
- `pattern` → `patterns/`
- `template` → `templates/`
- `part` → `parts/`

### List Installed Components

See all StrataWP components installed in your theme:

```bash
stratawp registry:list
```

**Example Output:**
```
📦 Installed StrataWP Components

Gutenberg Blocks (3)
  • hero-section
    src/blocks/hero-section
  • team-grid
    src/blocks/team-grid
  • testimonial-slider
    src/blocks/testimonial-slider

PHP Components (2)
  • Analytics
    inc/Components/Analytics.php
  • SEO
    inc/Components/SEO.php

Block Patterns (4)
  • hero-with-cta
    patterns/hero-with-cta.php
  • three-column-features
    patterns/three-column-features.php

Total: 9 component(s)
```

### Publish Your Components

Share your components with the StrataWP community:

```bash
# Publish to npm registry
stratawp registry:publish

# Test publication without publishing
stratawp registry:publish --dry-run

# Publish with a specific tag
stratawp registry:publish --tag beta

# Publish as restricted access
stratawp registry:publish --access restricted
```

**Before Publishing:**
1. Ensure you're logged in to npm: `npm login`
2. Your package name should start with `@stratawp/`
3. Include StrataWP metadata in your `package.json`

## Component Metadata

To make your component discoverable and installable, add StrataWP metadata to your `package.json`:

```json
{
  "name": "@stratawp/hero-block",
  "version": "1.2.0",
  "description": "Full-width hero section with background and CTA",
  "keywords": [
    "stratawp",
    "block",
    "hero",
    "cta",
    "landing-page"
  ],
  "stratawp": {
    "name": "@stratawp/hero-block",
    "version": "1.2.0",
    "description": "Full-width hero section with background and CTA",
    "type": "block",
    "category": "design",
    "tags": ["hero", "cta", "landing"],
    "wordpress": {
      "requires": "6.0",
      "tested": "6.4",
      "requiresPHP": "8.0"
    },
    "files": {
      "include": ["src/**/*", "README.md"],
      "exclude": ["tests/**/*", "*.test.ts"]
    },
    "installation": {
      "targetDir": "src/blocks/hero-block",
      "hooks": {
        "postInstall": "npm run build"
      }
    }
  }
}
```

### Metadata Fields

- **name** (required): Package name with `@stratawp/` prefix
- **version** (required): Semantic version
- **description** (required): Brief component description
- **type** (required): Component type (`block`, `component`, `pattern`, `template`, `part`, `integration`)
- **category**: Component category (`design`, `content`, `layout`, `media`, `widgets`)
- **tags**: Additional searchable tags
- **wordpress**: WordPress version requirements
  - **requires**: Minimum WordPress version
  - **tested**: Tested up to WordPress version
  - **requiresPHP**: Minimum PHP version
- **files**: File inclusion/exclusion patterns
- **installation**: Installation configuration
  - **targetDir**: Custom installation directory
  - **hooks**: Pre/post-install scripts

## Component Types

### Gutenberg Blocks

Create reusable Gutenberg blocks:

```typescript
// src/blocks/hero/index.tsx
import { registerBlockType } from '@wordpress/blocks'

registerBlockType('stratawp/hero', {
  title: 'Hero Section',
  category: 'design',
  // ... block configuration
})
```

**Package as:** `type: "block"`

### PHP Components

WordPress theme components using StrataWP architecture:

```php
<?php
// inc/Components/Analytics.php
namespace StrataWP\Components;

class Analytics implements ComponentInterface {
    public function init(): void {
        add_action('wp_head', [$this, 'add_tracking_code']);
    }
}
```

**Package as:** `type: "component"`

### Block Patterns

Reusable block patterns for the editor:

```php
<?php
// patterns/hero-with-cta.php
/**
 * Title: Hero with CTA
 * Slug: stratawp/hero-with-cta
 * Categories: featured
 */
?>
<!-- wp:cover -->
<!-- wp:heading -->Hero Section<!-- /wp:heading -->
<!-- /wp:cover -->
```

**Package as:** `type: "pattern"`

### Templates & Parts

Block theme templates and template parts:

```html
<!-- templates/page-landing.html -->
<!-- wp:template-part {"slug":"header"} /-->
<!-- wp:group -->
    <!-- Page content -->
<!-- /wp:group -->
<!-- wp:template-part {"slug":"footer"} /-->
```

**Package as:** `type: "template"` or `type: "part"`

## Publishing Best Practices

1. **Naming Convention**
   - Use `@stratawp/` prefix
   - Use kebab-case: `@stratawp/hero-block`
   - Be descriptive: `@stratawp/animated-hero-slider`

2. **Versioning**
   - Follow semantic versioning (semver)
   - Increment major version for breaking changes
   - Increment minor version for new features
   - Increment patch version for bug fixes

3. **Documentation**
   - Include comprehensive README.md
   - Add usage examples
   - Document all props/options
   - Include screenshots

4. **Testing**
   - Test with multiple WordPress versions
   - Test with different themes
   - Include automated tests
   - Run `--dry-run` before publishing

5. **Keywords**
   - Always include `stratawp` keyword
   - Include component type as keyword
   - Add relevant search terms
   - Use lowercase, hyphenated keywords

## Programmatic Usage

You can use the registry package programmatically:

```typescript
import { RegistryClient, ComponentInstaller } from '@stratawp/registry'

// Search for components
const client = new RegistryClient()
const results = await client.search('hero', {
  type: 'block',
  size: 10,
})

console.log(`Found ${results.length} blocks`)

// Get component info
const info = await client.getInfo('@stratawp/hero-block')
console.log(`Latest version: ${info.version}`)

// Install a component
const installer = new ComponentInstaller()
await installer.install('@stratawp/hero-block', {
  version: '1.2.0',
  force: false,
})
```

## Examples

### Creating a Publishable Block

```bash
# 1. Create a new block
stratawp block:new my-custom-block

# 2. Add StrataWP metadata to package.json
{
  "name": "@stratawp/my-custom-block",
  "stratawp": {
    "type": "block",
    "category": "design"
  }
}

# 3. Build and test
npm run build
npm test

# 4. Publish to registry
npm login
stratawp registry:publish
```

### Installing Multiple Components

```bash
# Install a block
stratawp registry:install @stratawp/hero-block

# Install a component
stratawp registry:install @stratawp/analytics-component

# Install a pattern
stratawp registry:install @stratawp/features-pattern
```

### Finding Specific Component Types

```bash
# Find all blocks
stratawp registry:search "" --type block

# Find all components
stratawp registry:search "" --type component

# Find patterns related to hero sections
stratawp registry:search hero --type pattern
```

## Troubleshooting

### "Component not found"

The component may not be published to npm or may have a different name. Try:
- Search for similar components: `stratawp registry:search <keyword>`
- Check the exact package name
- Verify the component is published to npm: `npm view <package-name>`

### "Permission denied" during publish

You need to be logged in to npm:
```bash
npm login
npm whoami  # Verify you're logged in
```

### "Component already exists"

Use the `--force` flag to overwrite:
```bash
stratawp registry:install @stratawp/hero-block --force
```

### npm Registry Issues

Check npm registry status:
- https://status.npmjs.org/

Verify your internet connection and npm configuration.

## Contributing

Contributions are welcome! Please see the [main StrataWP repository](https://github.com/JonImmsWordpressDev/StrataWP) for contribution guidelines.

## License

GPL-3.0-or-later

## Support

- **Issues**: https://github.com/JonImmsWordpressDev/StrataWP/issues
- **Discussions**: https://github.com/JonImmsWordpressDev/StrataWP/discussions
- **Documentation**: https://github.com/JonImmsWordpressDev/StrataWP#readme

---

**Happy Building!** Share your components with the StrataWP community and discover amazing components from other developers.
