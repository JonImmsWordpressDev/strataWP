# StrataWP Quick Reference Cheat Sheet

## Installation & Setup

```bash
# Create a new theme (run from anywhere OUTSIDE WordPress directory!)
cd ~/Projects
npx create-stratawp my-theme
```

**The CLI does everything:**
1. ✅ Interactive setup wizard
2. 🎨 **Template selection** - Choose from example themes:
   - **Basic Theme** - Essential blocks and clean structure
   - **Advanced Theme** - Portfolio, team members
   - **Store Theme** - WooCommerce ready
   - **Minimal** - Start from scratch
3. ✅ Choice of CSS frameworks (vanilla, Tailwind, UnoCSS, Panda)
4. ✅ TypeScript configuration
5. ✅ Optional testing and AI tools
6. ✨ **Automatically detects and links to WordPress!**

**What happens automatically:**
- 📦 Copies selected theme from bundled templates
- ✏️ Customizes with your name and details
- 🔍 Scans Local by Flywheel & MAMP sites
- 🔗 Creates symlink automatically!

**Then start developing:**
```bash
cd my-theme
pnpm dev  # Keep terminal open!
```

**Build for production:**
```bash
pnpm build
```

**Manual linking (if needed):**
```bash
# Only if you skipped auto-linking
ln -s "$(pwd)" ~/Local\ Sites/mysite/app/public/wp-content/themes/my-theme
```

## CLI Commands

### Project

```bash
pnpm dev              # Start dev server (http://localhost:3000)
pnpm build            # Production build
pnpm type-check       # TypeScript validation
pnpm lint             # ESLint
```

### Generate Components

```bash
# Blocks
stratawp block:new <name> [options]
  --type <type>              # static|dynamic (default: dynamic)
  --category <category>      # Block category (default: common)
  --styleFramework <fw>      # none|tailwind|unocss

# PHP Components
stratawp component:new <name> [options]
  --type <type>              # service|feature|integration|custom
  --namespace <namespace>    # PHP namespace

# Templates
stratawp template:new <name> [options]
  --type <type>              # page|single|archive|404|home|search|custom
  --description <text>       # Template description

# Template Parts
stratawp part:new <name> [options]
  --type <type>              # header|footer|sidebar|content|custom
  --markup <markup>          # html|php

# Design System
stratawp design-system:setup <framework>
  # tailwind|unocss
```

### AI Commands

```bash
stratawp ai:setup                           # Configure AI provider
stratawp ai:generate <type>                 # Generate code (block|component|pattern)
stratawp ai:review <file> [options]         # Code review
  --focus <focus>                           # security|performance|best-practices|all
stratawp ai:document <file> [options]       # Generate docs
  --format <format>                         # markdown|phpdoc|jsdoc
```

### Registry

```bash
stratawp registry:search <query> [options]
  --type <type>              # Filter by type
  --limit <number>           # Max results (default: 20)

stratawp registry:install <component> [options]
  --version <version>        # Specific version
  --force                    # Overwrite existing
  --target-dir <dir>         # Custom directory

stratawp registry:info <component>         # Component details
stratawp registry:list                     # List installed
stratawp registry:publish [options]        # Publish component
  --tag <tag>                # Publish tag
  --dry-run                  # Test without publishing
```

### Testing

```bash
pnpm test                    # Run unit tests
pnpm test:coverage           # Run with coverage
pnpm test:e2e                # Run E2E tests
pnpm test:watch              # Watch mode
```

### Explorer

```bash
stratawp explorer [options]
  --port <port>              # Port (default: 3000)
  --host <host>              # Host (default: localhost)
  --no-open                  # Don't open browser

stratawp storybook           # Alias for explorer
```

### Deployment

```bash
stratawp deploy:setup                    # Interactive configuration
stratawp deploy production               # Deploy to environment
stratawp deploy production --dry-run     # Preview changes
stratawp deploy production --force       # Skip confirmation
stratawp deploy production --fresh       # Upload all files (ignore manifest)
stratawp deploy production --no-backup   # Skip pre-deploy snapshot
stratawp deploy production --verbose     # Show debug output
stratawp deploy:test production          # Test connection
stratawp deploy:list                     # List environments
```

**Post-deploy actions (automatic with SSH deployments):**
- WordPress cache flush (`wp cache flush` + `wp transient delete --all`)
- PHP OPcache invalidation
- Old backup cleanup (keeps last N, configurable)
- Custom WP-CLI commands (via `postDeploy.wpCliCommands` config)
- Validation checks (file existence, WP health, HTTP response)

### FSE Template Sync

Sync WordPress Full Site Editing templates between local and production databases:

```bash
stratawp sync:templates production --all              # Sync all templates
stratawp sync:templates production --template=home    # Sync specific template
stratawp sync:templates production --all --dry-run    # Preview without changes
stratawp sync:templates:list production               # List local vs remote templates
stratawp sync:templates production --wp-cli=/path/wp  # Custom WP-CLI path
stratawp sync:templates production --wp-path=/wp/root # Custom WordPress root
```

### Database Sync

```bash
stratawp sync:db:pull production         # Pull remote DB to local
stratawp sync:db:push staging            # Push local DB to remote
stratawp sync:db:pull production --tables=wp_posts,wp_postmeta  # Specific tables
stratawp sync:db:pull production --no-url-replace  # Skip URL replacement
stratawp sync:db:pull production --dry-run  # Preview without changes
```

### Rollback & Snapshots

```bash
stratawp rollback:list                   # List all snapshots
stratawp rollback:list --environment=production  # Filter by environment
stratawp rollback:list --limit=20        # Show more snapshots
stratawp rollback:diff 1 2               # Compare snapshots by index
stratawp rollback:mark-stable 1          # Mark snapshot as stable
```

### Package Updates

```bash
stratawp update                          # Check and apply updates interactively
stratawp update --check                  # Check for updates without applying
stratawp update --force                  # Apply all updates without prompts
```

## File Structure

```
my-theme/
├── inc/                    # PHP
│   ├── Components/         # Theme components
│   │   └── *.php
│   └── functions.php       # Component loader
├── patterns/               # Block patterns
│   └── *.php
├── parts/                  # Template parts
│   └── *.html
├── src/                    # Source files
│   ├── blocks/            # Gutenberg blocks
│   │   └── block-name/
│   │       ├── block.json
│   │       ├── index.tsx
│   │       ├── save.tsx
│   │       └── style.scss
│   ├── scss/              # Styles
│   │   ├── _variables.scss
│   │   ├── _custom.scss
│   │   └── main.scss
│   └── main.ts            # Entry point
├── templates/              # FSE templates
│   └── *.html
├── dist/                   # Build output
├── functions.php           # Theme entry
├── style.css               # Theme metadata
├── theme.json              # FSE config
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .stratawp-deploy.json   # Deployment config (optional)
├── .stratawp-sync.json     # Sync config (optional)
└── .stratawp-snapshots/    # Deployment snapshots (auto-generated)
```

## Block Development

### Block Registration (block.json)

```json
{
  "apiVersion": 3,
  "name": "my-theme/my-block",
  "title": "My Block",
  "category": "design",
  "icon": "star-filled",
  "description": "Block description",
  "keywords": ["keyword1", "keyword2"],
  "attributes": {
    "content": {
      "type": "string",
      "default": ""
    }
  },
  "supports": {
    "html": false,
    "color": {
      "background": true,
      "text": true
    },
    "spacing": {
      "padding": true,
      "margin": true
    }
  },
  "editorScript": "file:./index.tsx",
  "style": "file:./style.scss"
}
```

### Edit Component (index.tsx)

```tsx
import { useBlockProps, RichText } from '@wordpress/block-editor'

export default function Edit({ attributes, setAttributes }) {
  const blockProps = useBlockProps()

  return (
    <div {...blockProps}>
      <RichText
        tagName="p"
        value={attributes.content}
        onChange={(content) => setAttributes({ content })}
        placeholder="Enter text..."
      />
    </div>
  )
}
```

### Save Component (save.tsx)

```tsx
import { useBlockProps, RichText } from '@wordpress/block-editor'

export default function Save({ attributes }) {
  const blockProps = useBlockProps.save()

  return (
    <div {...blockProps}>
      <RichText.Content tagName="p" value={attributes.content} />
    </div>
  )
}
```

## PHP Components

### Analytics Component (Internal Traffic Exclusion)

The Analytics component sets a `dev=true` cookie for internal users, enabling GA4 traffic exclusion:

```php
// In your theme's functions.php
use StrataWP\Components\Analytics;

$theme = new Theme([
    // ... other components
    new Analytics(),
]);
```

**Settings:** Configure at Settings → StrataWP Analytics

**Exclusion Modes:**
- `Admins only` - Users with `manage_options` capability
- `All logged-in users` - Any authenticated user
- `Disabled` - No cookie set (default)

**GA4 Setup:**
1. Enable mode in WordPress admin
2. GA4 → Admin → Data Streams → Configure tag settings
3. Define internal traffic rule matching "dev" cookie
4. Activate filter in Data Settings → Data Filters

### Custom Component Template

```php
<?php
namespace MyTheme\Components;

use StrataWP\Core\ComponentInterface;

class MyComponent implements ComponentInterface {
    public function init(): void {
        add_action('wp_enqueue_scripts', [$this, 'enqueue_assets']);
        add_filter('the_content', [$this, 'modify_content']);
    }

    public function enqueue_assets(): void {
        wp_enqueue_style('my-style', get_template_directory_uri() . '/assets/style.css');
    }

    public function modify_content(string $content): string {
        return $content . '<p>Added by component</p>';
    }
}
```

## Block Patterns

```php
<?php
/**
 * Title: Pattern Title
 * Slug: my-theme/pattern-slug
 * Categories: featured
 * Description: Pattern description
 */
?>

<!-- wp:group {"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
    <!-- wp:heading {"level":2} -->
    <h2>Heading</h2>
    <!-- /wp:heading -->

    <!-- wp:paragraph -->
    <p>Content here.</p>
    <!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
```

## Templates

### Basic Template Structure

```html
<!-- wp:template-part {"slug":"header","tagName":"header"} /-->

<!-- wp:group {"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
    <!-- Content -->
</div>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
```

### Query Loop (Blog)

```html
<!-- wp:query {"queryId":0,"query":{"perPage":10,"pages":0,"offset":0}} -->
<div class="wp-block-query">
    <!-- wp:post-template -->
        <!-- wp:post-title {"isLink":true} /-->
        <!-- wp:post-excerpt /-->
        <!-- wp:post-date /-->
    <!-- /wp:post-template -->

    <!-- wp:query-pagination -->
        <!-- wp:query-pagination-previous /-->
        <!-- wp:query-pagination-numbers /-->
        <!-- wp:query-pagination-next /-->
    <!-- /wp:query-pagination -->
</div>
<!-- /wp:query -->
```

## Headless WordPress

### Client Setup

```typescript
import { WordPressClient } from '@stratawp/headless'

const client = new WordPressClient({
  baseUrl: 'https://your-site.com',
  auth: {
    type: 'application-password',
    username: 'admin',
    password: 'xxxx xxxx xxxx xxxx',
  },
})
```

### React Hooks

```tsx
import { usePosts, usePost } from '@stratawp/headless/react'

// Fetch posts
const { data, isLoading } = usePosts({
  client,
  params: { per_page: 10, _embed: true },
})

// Fetch single post
const { data: post } = usePost({
  client,
  slug: 'my-post',
})
```

### Next.js

```tsx
// app/blog/page.tsx
import { getAllPosts } from '@stratawp/headless/next'

export const revalidate = 60

export default async function BlogPage() {
  const posts = await getAllPosts(client)
  return <div>{/* ... */}</div>
}

// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  return await generatePostParams(client)
}
```

## theme.json Quick Reference

### Colors

```json
{
  "settings": {
    "color": {
      "palette": [
        {
          "slug": "primary",
          "color": "#0000ff",
          "name": "Primary"
        }
      ]
    }
  }
}
```

### Typography

```json
{
  "settings": {
    "typography": {
      "fontFamilies": [
        {
          "fontFamily": "system-ui, sans-serif",
          "slug": "body",
          "name": "Body"
        }
      ],
      "fontSizes": [
        {
          "slug": "small",
          "size": "0.875rem",
          "name": "Small"
        }
      ]
    }
  }
}
```

### Spacing

```json
{
  "settings": {
    "spacing": {
      "spacingScale": {
        "steps": 0
      },
      "spacingSizes": [
        {
          "slug": "small",
          "size": "1rem",
          "name": "Small"
        }
      ]
    }
  }
}
```

## Common Block Patterns

### Two Column Layout

```html
<!-- wp:columns -->
<div class="wp-block-columns">
    <!-- wp:column -->
    <div class="wp-block-column">
        <!-- Left content -->
    </div>
    <!-- /wp:column -->

    <!-- wp:column -->
    <div class="wp-block-column">
        <!-- Right content -->
    </div>
    <!-- /wp:column -->
</div>
<!-- /wp:columns -->
```

### Cover Block with Overlay

```html
<!-- wp:cover {"url":"image.jpg","dimRatio":50} -->
<div class="wp-block-cover">
    <span aria-hidden="true" class="wp-block-cover__background has-background-dim"></span>
    <div class="wp-block-cover__inner-container">
        <!-- Content -->
    </div>
</div>
<!-- /wp:cover -->
```

### Button

```html
<!-- wp:buttons -->
<div class="wp-block-buttons">
    <!-- wp:button -->
    <div class="wp-block-button">
        <a class="wp-block-button__link wp-element-button">Click Me</a>
    </div>
    <!-- /wp:button -->
</div>
<!-- /wp:buttons -->
```

## Troubleshooting

### Clear Cache & Rebuild

```bash
rm -rf node_modules dist .vite
pnpm install
pnpm build
```

### Check Versions

```bash
node --version          # Should be 18+
pnpm --version
php --version          # Should be 8.1+
wp --version           # WordPress CLI
stratawp --version     # StrataWP CLI
```

### Update StrataWP Packages

Check for and apply updates to all @stratawp/* packages:

```bash
stratawp update                 # Interactive update
stratawp update --check         # Check only, don't apply
stratawp update --force         # Apply all updates without prompts
```

### Update StrataWP CLI (Development)

If new commands aren't showing up after pulling changes from the repo:

```bash
# From the StrataWP repository root
cd packages/cli
pnpm build
npm install -g .

# Verify the update
stratawp --help
```

### Common Fixes

```bash
# Port already in use
pnpm dev --port 3001

# TypeScript errors
pnpm type-check

# Linting errors
pnpm lint --fix

# Permission errors (symlink)
sudo ln -s "$(pwd)" /path/to/wordpress/wp-content/themes/my-theme

# Deploy commands not found
# Update the CLI (see "Update StrataWP CLI" above)
```

## Useful Snippets

### Add Custom Post Type

```php
register_post_type('portfolio', [
    'labels' => [
        'name' => 'Portfolio',
        'singular_name' => 'Portfolio Item',
    ],
    'public' => true,
    'has_archive' => true,
    'show_in_rest' => true,
    'supports' => ['title', 'editor', 'thumbnail'],
]);
```

### Add Custom Taxonomy

```php
register_taxonomy('portfolio_category', 'portfolio', [
    'labels' => [
        'name' => 'Categories',
        'singular_name' => 'Category',
    ],
    'hierarchical' => true,
    'show_in_rest' => true,
]);
```

### Enqueue Block Script

```php
wp_enqueue_block_editor_script(
    'my-block-script',
    get_template_directory_uri() . '/dist/my-block.js',
    ['wp-blocks', 'wp-element', 'wp-block-editor']
);
```

## Resources

- **Docs**: https://github.com/JonImmsWordpressDev/StrataWP#readme
- **Getting Started**: [GETTING_STARTED.md](./GETTING_STARTED.md)
- **Issues**: https://github.com/JonImmsWordpressDev/StrataWP/issues
- **WordPress**: https://developer.wordpress.org/
- **Vite**: https://vitejs.dev/
- **React**: https://react.dev/

---

**Pro Tip:** Bookmark this page for quick reference during development! 🚀
