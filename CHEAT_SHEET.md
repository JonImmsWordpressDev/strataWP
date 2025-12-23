# StrataWP Quick Reference Cheat Sheet

## Installation & Setup

```bash
# Create a new theme (run from anywhere OUTSIDE WordPress directory!)
cd ~/Projects
npx create-stratawp my-theme
cd my-theme

# Link to WordPress (replace path with yours)
# Local by Flywheel:
ln -s "$(pwd)" ~/Local\ Sites/mysite/app/public/wp-content/themes/my-theme

# MAMP:
# ln -s "$(pwd)" /Applications/MAMP/htdocs/mysite/wp-content/themes/my-theme

# Start development (keep terminal open!)
pnpm dev

# Build for production
pnpm build
```

**What you get:**
- ✅ Interactive setup wizard
- ✅ Choice of CSS frameworks (vanilla, Tailwind, UnoCSS, Panda)
- ✅ TypeScript configured
- ✅ Vite dev server with HMR
- ✅ Example blocks and components
- ✅ Optional testing and AI tools

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
└── vite.config.ts
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
