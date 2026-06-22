# WordPress Agent Skills Cheat Sheet

Quick reference for common workflows and commands.

## Triage Commands

```bash
# Analyze project structure
node .claude/skills/wp-project-triage/scripts/detect_wp_project.mjs

# Check WP-CLI availability (for performance/ops skills)
node .claude/skills/wp-wpcli-and-ops/scripts/wpcli_inspect.mjs --path=/path/to/wp

# Inspect PHPStan setup
node .claude/skills/wp-phpstan/scripts/phpstan_inspect.mjs
```

## Block Development

### Create New Block

```bash
# StrataWP CLI
stratawp block:new hero --styleFramework=tailwind

# Or manually create structure:
mkdir -p src/blocks/hero
touch src/blocks/hero/{block.json,index.tsx,save.tsx,style.scss}
```

### block.json Template (apiVersion 3)

```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "mytheme/hero",
  "version": "1.0.0",
  "title": "Hero",
  "category": "theme",
  "icon": "cover-image",
  "description": "Hero section with title and background",
  "supports": {
    "html": false,
    "align": ["wide", "full"],
    "color": {
      "background": true,
      "text": true
    }
  },
  "attributes": {
    "title": { "type": "string", "default": "" },
    "backgroundUrl": { "type": "string", "default": "" }
  },
  "textdomain": "mytheme",
  "editorScript": "file:./index.js",
  "style": "file:./style.css",
  "render": "file:./render.php"
}
```

### Dynamic Block (render.php)

```php
<?php
/**
 * Hero block render.
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Block content.
 * @param WP_Block $block      Block instance.
 */

$title = $attributes['title'] ?? '';
$bg_url = $attributes['backgroundUrl'] ?? '';
?>
<section <?php echo get_block_wrapper_attributes(); ?>>
    <?php if ($bg_url): ?>
        <img src="<?php echo esc_url($bg_url); ?>" alt="" class="hero-bg">
    <?php endif; ?>
    <?php if ($title): ?>
        <h1><?php echo esc_html($title); ?></h1>
    <?php endif; ?>
</section>
```

### Block Deprecation

```tsx
// When changing attributes, add deprecation
const deprecated = [
  {
    attributes: {
      heading: { type: 'string' }, // Old attribute name
    },
    migrate(attributes) {
      return {
        ...attributes,
        title: attributes.heading, // Migrate to new name
      }
    },
    save({ attributes }) {
      // Old save function
    },
  },
]

export default deprecated
```

## Theme.json

### Basic Structure

```json
{
  "$schema": "https://schemas.wp.org/trunk/theme.json",
  "version": 3,
  "settings": {
    "color": {
      "palette": [
        { "slug": "primary", "color": "#0073aa", "name": "Primary" },
        { "slug": "secondary", "color": "#23282d", "name": "Secondary" }
      ]
    },
    "typography": {
      "fontFamilies": [
        {
          "fontFamily": "Inter, sans-serif",
          "slug": "inter",
          "name": "Inter"
        }
      ]
    },
    "layout": {
      "contentSize": "800px",
      "wideSize": "1200px"
    }
  },
  "styles": {
    "color": {
      "background": "var(--wp--preset--color--white)",
      "text": "var(--wp--preset--color--secondary)"
    }
  }
}
```

### Template Registration

```
templates/
├── index.html          # Fallback
├── front-page.html     # Homepage
├── single.html         # Single posts
├── page.html           # Pages
├── archive.html        # Archives
└── 404.html            # Not found

parts/
├── header.html
├── footer.html
└── sidebar.html
```

## Interactivity API

### Store Definition

```ts
// view.ts
import { store, getContext } from '@wordpress/interactivity'

interface State {
  isOpen: boolean
}

interface Context {
  itemId: number
}

store('mytheme/accordion', {
  state: {
    isOpen: false,
  },
  actions: {
    toggle() {
      const context = getContext<Context>()
      const state = store<State>('mytheme/accordion').state
      state.isOpen = !state.isOpen
    },
  },
})
```

### Directives

```html
<!-- Interactive wrapper -->
<div data-wp-interactive="mytheme/accordion">
  <!-- Click handler -->
  <button data-wp-on--click="actions.toggle">Toggle</button>

  <!-- Conditional visibility -->
  <div data-wp-bind--hidden="!state.isOpen">Content here</div>

  <!-- Class binding -->
  <div data-wp-class--active="state.isOpen">Styled content</div>

  <!-- Context (local state) -->
  <div data-wp-context='{"itemId": 1}'>
    <span data-wp-text="context.itemId"></span>
  </div>
</div>
```

### Server-Side State

```php
// Initialize state in PHP
wp_interactivity_state('mytheme/accordion', [
    'isOpen' => false,
    'items'  => ['A', 'B', 'C'],
]);

// Local context
$context = ['itemId' => get_the_ID()];
?>
<div <?php echo wp_interactivity_data_wp_context($context); ?>>
```

## REST API

### Register Route

```php
add_action('rest_api_init', function() {
    register_rest_route('mytheme/v1', '/testimonials', [
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'mytheme_get_testimonials',
        'permission_callback' => '__return_true', // Public
        'args'                => [
            'per_page' => [
                'type'    => 'integer',
                'default' => 10,
                'minimum' => 1,
                'maximum' => 100,
            ],
        ],
    ]);

    register_rest_route('mytheme/v1', '/testimonials/(?P<id>\d+)', [
        'methods'             => WP_REST_Server::READABLE,
        'callback'            => 'mytheme_get_testimonial',
        'permission_callback' => '__return_true',
        'args'                => [
            'id' => [
                'type'              => 'integer',
                'required'          => true,
                'validate_callback' => fn($id) => is_numeric($id),
            ],
        ],
    ]);
});
```

### Callback Function

```php
function mytheme_get_testimonials(WP_REST_Request $request) {
    $per_page = $request->get_param('per_page');

    $query = new WP_Query([
        'post_type'      => 'testimonial',
        'posts_per_page' => $per_page,
    ]);

    if (empty($query->posts)) {
        return new WP_Error(
            'no_testimonials',
            'No testimonials found',
            ['status' => 404]
        );
    }

    $data = array_map(fn($post) => [
        'id'      => $post->ID,
        'title'   => $post->post_title,
        'content' => $post->post_content,
    ], $query->posts);

    return rest_ensure_response($data);
}
```

## Performance

### WP-CLI Profile Commands

```bash
# Stage profiling (where time goes)
wp profile stage --url=https://site.test/

# Hook profiling (slow hooks)
wp profile hook --url=https://site.test/ --spotlight

# Specific hook
wp profile hook --url=https://site.test/ --hook=init

# Doctor checks
wp doctor check
wp doctor check autoload-options-size
```

### Common Optimizations

```php
// Reduce autoloaded options
update_option('large_option', $data, false); // false = don't autoload

// Object caching
$data = wp_cache_get('key', 'group');
if (false === $data) {
    $data = expensive_query();
    wp_cache_set('key', $data, 'group', 3600);
}

// Prevent N+1 queries
update_post_caches($posts, 'post', true, true); // Prime caches
update_object_term_cache($post_ids, 'post');    // Prime term cache
```

## WP-CLI Operations

### Safe Search-Replace

```bash
# 1. Backup first
wp db export backup.sql

# 2. Dry run
wp search-replace 'old-domain.com' 'new-domain.com' --dry-run

# 3. Execute
wp search-replace 'old-domain.com' 'new-domain.com' --precise --all-tables

# 4. Flush caches
wp cache flush
wp rewrite flush
```

### Plugin/Theme Management

```bash
# List plugins
wp plugin list

# Install and activate
wp plugin install advanced-custom-fields --activate

# Update all
wp plugin update --all

# Theme operations
wp theme activate my-theme
wp theme list
```

### Database Operations

```bash
# Export
wp db export backup-$(date +%Y%m%d).sql

# Import
wp db import backup.sql

# Query
wp db query "SELECT * FROM wp_options WHERE autoload='yes' ORDER BY LENGTH(option_value) DESC LIMIT 10"
```

### Database Sync (StrataWP)

```bash
# Pull production database to local (SSH-based, handles localhost-only DBs)
pnpm stratawp sync:db:pull production

# With passphrase for encrypted SSH keys
STRATAWP_SSH_PASSPHRASE="passphrase" pnpm stratawp sync:db:pull production

# Specific tables only
pnpm stratawp sync:db:pull production --tables=wp_posts,wp_postmeta

# Dry run (preview changes)
pnpm stratawp sync:db:pull production --dry-run

# Push local to staging (use with caution!)
pnpm stratawp sync:db:push staging
```

**Configuration (`.stratawp-sync.json`):**

```json
{
  "environments": {
    "local": {
      "url": "http://local.test",
      "database": { "host": "localhost", "user": "root", "password": "", "database": "wordpress" }
    },
    "production": {
      "url": "https://example.com",
      "ssh": { "host": "ssh.example.com", "port": 22, "user": "deploy", "key": "~/.ssh/id_rsa" },
      "wpPath": "/var/www/html",
      "database": {
        "host": "127.0.0.1",
        "user": "prod_user",
        "password": "pass",
        "database": "wp_prod"
      }
    }
  }
}
```

## PHPStan

### Basic Configuration

```neon
# phpstan.neon
includes:
    - vendor/szepeviktor/phpstan-wordpress/extension.neon

parameters:
    level: 5
    paths:
        - inc/
        - functions.php
    excludePaths:
        - vendor/
        - node_modules/
```

### WordPress-Specific Types

```php
/**
 * @param WP_REST_Request<array{id: int, name: string}> $request
 * @return WP_REST_Response|WP_Error
 */
function my_endpoint(WP_REST_Request $request) {
    $id = $request->get_param('id');
    // PHPStan knows $id is int
}

/**
 * Hook callback with typed args.
 *
 * @param string $post_status
 * @param string $original_status
 * @param WP_Post $post
 */
add_action('transition_post_status', function($new, $old, $post) {
    // PHPStan knows types
}, 10, 3);
```

### Generate/Update Baseline

```bash
# Generate baseline for legacy code
vendor/bin/phpstan analyse --generate-baseline

# Run with baseline
vendor/bin/phpstan analyse
```

## Quick Decision Tree

```
What are you doing?
│
├── Creating something new?
│   ├── Block → wp-block-development
│   ├── Template → wp-block-themes
│   ├── REST endpoint → wp-rest-api
│   └── Plugin → wp-plugin-development
│
├── Debugging?
│   ├── Slow site → wp-performance
│   ├── 401/403/404 REST → wp-rest-api
│   ├── Block not rendering → wp-block-development
│   └── Interactivity not working → wp-interactivity-api
│
├── Configuring?
│   ├── theme.json → wp-block-themes
│   ├── PHPStan → wp-phpstan
│   └── WP-CLI automation → wp-wpcli-and-ops
│
└── Migrating/Operating?
    ├── URL changes → wp-wpcli-and-ops
    ├── Database sync → wp-wpcli-and-ops
    └── Plugin updates → wp-wpcli-and-ops
```
