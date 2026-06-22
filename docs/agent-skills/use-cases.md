# WordPress Agent Skills: Use Cases

Real-world scenarios demonstrating how to use WordPress agent skills effectively with StrataWP.

## Table of Contents

- [Building a Portfolio Theme](#building-a-portfolio-theme)
- [Creating an Interactive FAQ Block](#creating-an-interactive-faq-block)
- [Headless WordPress with REST API](#headless-wordpress-with-rest-api)
- [Performance Audit and Optimization](#performance-audit-and-optimization)
- [Migrating from Classic to Block Theme](#migrating-from-classic-to-block-theme)
- [Plugin Development for a Theme](#plugin-development-for-a-theme)
- [Setting Up Static Analysis](#setting-up-static-analysis)
- [Database Migration Between Environments](#database-migration-between-environments)

---

## Building a Portfolio Theme

**Skills used**: `wp-project-triage`, `wp-block-themes`, `wp-block-development`

### Scenario

You're building a portfolio theme for a photographer. It needs custom templates, a gallery block, and dynamic color schemes.

### Workflow

#### 1. Triage the Project

```bash
# Create theme with StrataWP
npx create-stratawp photographer-theme

# Run triage
cd photographer-theme
node .claude/skills/wp-project-triage/scripts/detect_wp_project.mjs
```

Expected output confirms: `kind: ["block-theme"]`, `hasThemeJson: true`, `usesVite: true`

#### 2. Set Up theme.json (wp-block-themes)

Create a comprehensive theme.json with photography-focused settings:

```json
{
  "$schema": "https://schemas.wp.org/trunk/theme.json",
  "version": 3,
  "settings": {
    "color": {
      "palette": [
        { "slug": "background", "color": "#0a0a0a", "name": "Background" },
        { "slug": "foreground", "color": "#ffffff", "name": "Foreground" },
        { "slug": "accent", "color": "#c9a227", "name": "Accent" }
      ],
      "duotone": [
        {
          "slug": "dark-gold",
          "colors": ["#0a0a0a", "#c9a227"],
          "name": "Dark and Gold"
        }
      ]
    },
    "layout": {
      "contentSize": "960px",
      "wideSize": "1400px"
    },
    "spacing": {
      "spacingScale": { "steps": 7 }
    }
  },
  "styles": {
    "color": {
      "background": "var(--wp--preset--color--background)",
      "text": "var(--wp--preset--color--foreground)"
    }
  }
}
```

#### 3. Create Templates (wp-block-themes)

Build the template structure:

```
templates/
├── index.html           # Gallery grid layout
├── front-page.html      # Hero + featured work
├── single-portfolio.html # Single portfolio item
└── archive-portfolio.html # Portfolio archive

parts/
├── header.html          # Minimal header with logo
├── footer.html          # Contact info
└── portfolio-grid.html  # Reusable gallery grid
```

**templates/front-page.html**:

```html
<!-- wp:template-part {"slug":"header"} /-->

<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
  <!-- wp:cover {"minHeight":100,"minHeightUnit":"vh","align":"full"} -->
  <div class="wp-block-cover alignfull" style="min-height:100vh">
    <!-- wp:heading {"level":1,"textAlign":"center"} -->
    <h1 class="has-text-align-center">Portfolio</h1>
    <!-- /wp:heading -->
  </div>
  <!-- /wp:cover -->

  <!-- wp:template-part {"slug":"portfolio-grid"} /-->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer"} /-->
```

#### 4. Create Gallery Block (wp-block-development)

```bash
stratawp block:new masonry-gallery
```

**src/blocks/masonry-gallery/block.json**:

```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "photographer/masonry-gallery",
  "title": "Masonry Gallery",
  "category": "media",
  "supports": {
    "align": ["wide", "full"],
    "html": false
  },
  "attributes": {
    "images": {
      "type": "array",
      "default": []
    },
    "columns": {
      "type": "number",
      "default": 3
    }
  },
  "editorScript": "file:./index.js",
  "style": "file:./style.css",
  "render": "file:./render.php"
}
```

#### 5. Verify

```bash
pnpm build
pnpm test
# Activate theme and test in WordPress
```

---

## Creating an Interactive FAQ Block

**Skills used**: `wp-block-development`, `wp-interactivity-api`

### Scenario

Build an FAQ block with accordion functionality that works without JavaScript for initial render (progressive enhancement).

### Workflow

#### 1. Create Block Structure

```bash
stratawp block:new faq-accordion
```

#### 2. Configure for Interactivity (wp-block-development)

**block.json**:

```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "mytheme/faq-accordion",
  "title": "FAQ Accordion",
  "category": "text",
  "supports": {
    "interactivity": true,
    "html": false
  },
  "attributes": {
    "items": {
      "type": "array",
      "default": []
    }
  },
  "viewScriptModule": "file:./view.js",
  "render": "file:./render.php"
}
```

#### 3. Server-Side Render with Initial State (wp-interactivity-api)

**render.php**:

```php
<?php
/**
 * FAQ Accordion render.
 */

$items = $attributes['items'] ?? [];

// Initialize Interactivity API state
wp_interactivity_state('mytheme/faq', [
    'openIndex' => -1,
]);
?>
<div
    <?php echo get_block_wrapper_attributes(); ?>
    data-wp-interactive="mytheme/faq"
>
    <?php foreach ($items as $index => $item): ?>
        <?php
        $context = ['index' => $index];
        ?>
        <div
            class="faq-item"
            <?php echo wp_interactivity_data_wp_context($context); ?>
        >
            <button
                class="faq-question"
                data-wp-on--click="actions.toggle"
                data-wp-bind--aria-expanded="state.isOpen"
            >
                <?php echo esc_html($item['question']); ?>
            </button>
            <div
                class="faq-answer"
                data-wp-bind--hidden="!state.isOpen"
                data-wp-class--open="state.isOpen"
            >
                <?php echo wp_kses_post($item['answer']); ?>
            </div>
        </div>
    <?php endforeach; ?>
</div>
```

#### 4. Client-Side Store (wp-interactivity-api)

**view.ts**:

```typescript
import { store, getContext } from '@wordpress/interactivity'

interface State {
  openIndex: number
}

interface Context {
  index: number
}

const { state } = store<{ state: State }>('mytheme/faq', {
  state: {
    openIndex: -1,
    get isOpen() {
      const context = getContext<Context>()
      return state.openIndex === context.index
    },
  },
  actions: {
    toggle() {
      const context = getContext<Context>()
      state.openIndex = state.openIndex === context.index ? -1 : context.index
    },
  },
})
```

#### 5. Add Styles

**style.scss**:

```scss
.wp-block-mytheme-faq-accordion {
  .faq-item {
    border-bottom: 1px solid var(--wp--preset--color--border);
  }

  .faq-question {
    width: 100%;
    padding: 1rem;
    text-align: left;
    background: transparent;
    border: none;
    cursor: pointer;

    &[aria-expanded='true'] {
      font-weight: bold;
    }
  }

  .faq-answer {
    padding: 0 1rem 1rem;

    &[hidden] {
      display: none;
    }

    &.open {
      animation: slideDown 0.2s ease;
    }
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## Headless WordPress with REST API

**Skills used**: `wp-rest-api`, `wp-project-triage`

### Scenario

Expose custom content types via REST API for a Next.js frontend.

### Workflow

#### 1. Register Custom Post Type with REST Support

```php
// inc/Components/Portfolio.php
namespace MyTheme\Components;

use StrataWP\ComponentInterface;

class Portfolio implements ComponentInterface {
    public function get_slug(): string {
        return 'portfolio';
    }

    public function initialize(): void {
        add_action('init', [$this, 'register_post_type']);
        add_action('rest_api_init', [$this, 'register_routes']);
    }

    public function register_post_type(): void {
        register_post_type('portfolio', [
            'public'       => true,
            'show_in_rest' => true,  // Enable in REST API
            'rest_base'    => 'portfolio',
            'supports'     => ['title', 'editor', 'thumbnail', 'custom-fields'],
            'labels'       => [
                'name'          => 'Portfolio',
                'singular_name' => 'Portfolio Item',
            ],
        ]);
    }
}
```

#### 2. Add Custom Endpoint (wp-rest-api)

```php
public function register_routes(): void {
    // Featured portfolio items
    register_rest_route('mytheme/v1', '/portfolio/featured', [
        'methods'             => \WP_REST_Server::READABLE,
        'callback'            => [$this, 'get_featured'],
        'permission_callback' => '__return_true',
        'args'                => [
            'limit' => [
                'type'              => 'integer',
                'default'           => 6,
                'minimum'           => 1,
                'maximum'           => 20,
                'sanitize_callback' => 'absint',
            ],
        ],
    ]);

    // Portfolio by category
    register_rest_route('mytheme/v1', '/portfolio/category/(?P<slug>[a-z0-9-]+)', [
        'methods'             => \WP_REST_Server::READABLE,
        'callback'            => [$this, 'get_by_category'],
        'permission_callback' => '__return_true',
        'args'                => [
            'slug' => [
                'type'              => 'string',
                'required'          => true,
                'sanitize_callback' => 'sanitize_title',
            ],
        ],
    ]);
}
```

#### 3. Implement Callbacks with Proper Schema

```php
public function get_featured(\WP_REST_Request $request): \WP_REST_Response|\WP_Error {
    $limit = $request->get_param('limit');

    $query = new \WP_Query([
        'post_type'      => 'portfolio',
        'posts_per_page' => $limit,
        'meta_query'     => [
            [
                'key'   => '_featured',
                'value' => '1',
            ],
        ],
    ]);

    if (empty($query->posts)) {
        return new \WP_Error(
            'no_featured',
            'No featured portfolio items found',
            ['status' => 404]
        );
    }

    $items = array_map([$this, 'prepare_item'], $query->posts);

    $response = rest_ensure_response($items);
    $response->header('X-WP-Total', $query->found_posts);

    return $response;
}

private function prepare_item(\WP_Post $post): array {
    $thumbnail_id = get_post_thumbnail_id($post);

    return [
        'id'          => $post->ID,
        'slug'        => $post->post_name,
        'title'       => $post->post_title,
        'excerpt'     => get_the_excerpt($post),
        'date'        => $post->post_date_gmt,
        'thumbnail'   => $thumbnail_id ? [
            'id'     => $thumbnail_id,
            'url'    => wp_get_attachment_url($thumbnail_id),
            'srcset' => wp_get_attachment_image_srcset($thumbnail_id),
            'alt'    => get_post_meta($thumbnail_id, '_wp_attachment_image_alt', true),
        ] : null,
        'categories'  => wp_get_post_terms($post->ID, 'portfolio_category', ['fields' => 'slugs']),
        '_links'      => [
            'self' => rest_url("mytheme/v1/portfolio/{$post->ID}"),
        ],
    ];
}
```

#### 4. Verify

```bash
# Test endpoints
curl https://your-site.test/wp-json/mytheme/v1/portfolio/featured
curl https://your-site.test/wp-json/mytheme/v1/portfolio/category/photography

# Check discovery
curl https://your-site.test/wp-json/
```

---

## Performance Audit and Optimization

**Skills used**: `wp-performance`, `wp-wpcli-and-ops`

### Scenario

A client's site takes 5+ seconds to load. You need to identify and fix the bottlenecks.

### Workflow

#### 1. Baseline Measurement

```bash
# Time the homepage
curl -s -o /dev/null -w "%{time_total}\n" https://site.test/

# WP-CLI stage profiling
wp profile stage --url=https://site.test/ --spotlight
```

Example output:

```
+------------+----------------+-------------+
| stage      | time           | cache_ratio |
+------------+----------------+-------------+
| bootstrap  | 0.4523s        | 0.0%        |
| main_query | 2.1234s <<<    | 45.2%       |
| template   | 1.8765s <<<    | 12.1%       |
+------------+----------------+-------------+
```

#### 2. Deep Dive into Slow Stages

```bash
# Hook profiling for main_query stage
wp profile hook --url=https://site.test/ --spotlight --stage=main_query
```

Example output:

```
+--------------------------+-------------+-------+
| hook                     | time        | calls |
+--------------------------+-------------+-------+
| pre_get_posts            | 0.0012s     | 1     |
| posts_clauses            | 1.9876s <<< | 1     |
+--------------------------+-------------+-------+
```

#### 3. Identify the Culprit

```bash
# Check which callbacks are slow
wp profile hook posts_clauses --url=https://site.test/ --fields=callback,time,location
```

Found: A plugin adding expensive JOIN on every query.

#### 4. Check Autoloaded Options

```bash
wp doctor check autoload-options-size
```

Output:

```
Warning: Autoloaded options are 2.3 MB (threshold 900 KB)
```

```bash
# Find largest autoloaded options
wp db query "SELECT option_name, LENGTH(option_value) as size
FROM wp_options WHERE autoload='yes'
ORDER BY size DESC LIMIT 10"
```

#### 5. Apply Fixes

```php
// Disable autoload for large options
update_option('large_cached_data', $data, false);

// Add object caching for expensive queries
function get_portfolio_stats() {
    $cache_key = 'portfolio_stats_' . wp_hash(serialize(func_get_args()));
    $stats = wp_cache_get($cache_key, 'portfolio');

    if (false === $stats) {
        $stats = expensive_database_query();
        wp_cache_set($cache_key, $stats, 'portfolio', HOUR_IN_SECONDS);
    }

    return $stats;
}
```

#### 6. Verify Improvements

```bash
# Re-run profile
wp profile stage --url=https://site.test/ --spotlight

# Compare times
curl -s -o /dev/null -w "%{time_total}\n" https://site.test/
```

---

## Migrating from Classic to Block Theme

**Skills used**: `wp-block-themes`, `wp-project-triage`

### Scenario

Convert an existing classic theme to a block theme while maintaining design consistency.

### Workflow

#### 1. Analyze Current Theme

```bash
node .claude/skills/wp-project-triage/scripts/detect_wp_project.mjs
```

Check: `hasThemeJson: false`, `kind: ["theme"]` (not block-theme)

#### 2. Create theme.json from Existing Styles

Extract colors, fonts, and spacing from existing CSS:

```json
{
  "$schema": "https://schemas.wp.org/trunk/theme.json",
  "version": 3,
  "settings": {
    "color": {
      "palette": [
        { "slug": "primary", "color": "#2c3e50", "name": "Primary" },
        { "slug": "secondary", "color": "#3498db", "name": "Secondary" }
      ]
    },
    "typography": {
      "fontFamilies": [
        {
          "fontFamily": "'Open Sans', sans-serif",
          "slug": "body",
          "name": "Body"
        }
      ],
      "fontSizes": [
        { "slug": "small", "size": "14px", "name": "Small" },
        { "slug": "medium", "size": "16px", "name": "Medium" },
        { "slug": "large", "size": "20px", "name": "Large" }
      ]
    },
    "layout": {
      "contentSize": "800px",
      "wideSize": "1200px"
    }
  }
}
```

#### 3. Convert Templates to Block Markup

**Before (classic header.php)**:

```php
<header class="site-header">
    <div class="container">
        <?php the_custom_logo(); ?>
        <nav>
            <?php wp_nav_menu(['theme_location' => 'primary']); ?>
        </nav>
    </div>
</header>
```

**After (parts/header.html)**:

```html
<!-- wp:group {"tagName":"header","className":"site-header","layout":{"type":"constrained"}} -->
<header class="wp-block-group site-header">
  <!-- wp:group {"layout":{"type":"flex","justifyContent":"space-between"}} -->
  <div class="wp-block-group">
    <!-- wp:site-logo /-->
    <!-- wp:navigation {"ref":123} /-->
  </div>
  <!-- /wp:group -->
</header>
<!-- /wp:group -->
```

#### 4. Create Index Template

**templates/index.html**:

```html
<!-- wp:template-part {"slug":"header","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
  <!-- wp:query {"queryId":1,"query":{"perPage":10}} -->
  <div class="wp-block-query">
    <!-- wp:post-template -->
    <!-- wp:post-title {"isLink":true} /-->
    <!-- wp:post-excerpt /-->
    <!-- /wp:post-template -->

    <!-- wp:query-pagination -->
    <!-- wp:query-pagination-previous /-->
    <!-- wp:query-pagination-numbers /-->
    <!-- wp:query-pagination-next /-->
    <!-- /wp:query-pagination -->
  </div>
  <!-- /wp:query -->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
```

#### 5. Verify Migration

```bash
# Re-run triage
node .claude/skills/wp-project-triage/scripts/detect_wp_project.mjs
```

Should now show: `hasThemeJson: true`, `kind: ["block-theme"]`

---

## Plugin Development for a Theme

**Skills used**: `wp-plugin-development`, `wp-rest-api`

### Scenario

Create a companion plugin for your theme that adds testimonials functionality.

### Workflow

#### 1. Scaffold Plugin

```bash
mkdir -p wp-content/plugins/theme-testimonials
cd wp-content/plugins/theme-testimonials
```

**theme-testimonials.php**:

```php
<?php
/**
 * Plugin Name: Theme Testimonials
 * Description: Testimonials functionality for the theme.
 * Version: 1.0.0
 * Requires at least: 6.9
 * Requires PHP: 7.4
 * Author: Your Name
 */

declare(strict_types=1);

namespace ThemeTestimonials;

// Prevent direct access
defined('ABSPATH') || exit;

// Load after plugins loaded
add_action('plugins_loaded', function() {
    require_once __DIR__ . '/inc/class-testimonials.php';
    Testimonials::instance()->init();
});

// Activation
register_activation_hook(__FILE__, function() {
    // Flush rewrite rules on activation
    add_option('theme_testimonials_flush_rewrite', true);
});
```

#### 2. Create Main Class (wp-plugin-development)

**inc/class-testimonials.php**:

```php
<?php
namespace ThemeTestimonials;

class Testimonials {
    private static ?self $instance = null;

    public static function instance(): self {
        return self::$instance ??= new self();
    }

    public function init(): void {
        add_action('init', [$this, 'register_post_type']);
        add_action('rest_api_init', [$this, 'register_routes']);
        add_action('admin_menu', [$this, 'add_settings_page']);
        add_action('admin_init', [$this, 'register_settings']);

        // Flush rewrite rules if needed
        if (get_option('theme_testimonials_flush_rewrite')) {
            flush_rewrite_rules();
            delete_option('theme_testimonials_flush_rewrite');
        }
    }

    public function register_post_type(): void {
        register_post_type('testimonial', [
            'public'       => true,
            'show_in_rest' => true,
            'rest_base'    => 'testimonials',
            'menu_icon'    => 'dashicons-format-quote',
            'supports'     => ['title', 'editor', 'thumbnail'],
            'labels'       => [
                'name'          => __('Testimonials', 'theme-testimonials'),
                'singular_name' => __('Testimonial', 'theme-testimonials'),
            ],
        ]);
    }
}
```

#### 3. Add Settings Page (wp-plugin-development)

```php
public function add_settings_page(): void {
    add_options_page(
        __('Testimonials Settings', 'theme-testimonials'),
        __('Testimonials', 'theme-testimonials'),
        'manage_options',
        'testimonials-settings',
        [$this, 'render_settings_page']
    );
}

public function register_settings(): void {
    register_setting('testimonials_settings', 'testimonials_per_page', [
        'type'              => 'integer',
        'default'           => 6,
        'sanitize_callback' => 'absint',
    ]);

    add_settings_section(
        'testimonials_main',
        __('Display Settings', 'theme-testimonials'),
        null,
        'testimonials-settings'
    );

    add_settings_field(
        'testimonials_per_page',
        __('Items Per Page', 'theme-testimonials'),
        [$this, 'render_per_page_field'],
        'testimonials-settings',
        'testimonials_main'
    );
}

public function render_settings_page(): void {
    if (!current_user_can('manage_options')) {
        return;
    }
    ?>
    <div class="wrap">
        <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
        <form action="options.php" method="post">
            <?php
            settings_fields('testimonials_settings');
            do_settings_sections('testimonials-settings');
            submit_button();
            ?>
        </form>
    </div>
    <?php
}
```

#### 4. Security Best Practices (wp-plugin-development)

```php
// Always verify nonce in form handlers
public function handle_form_submission(): void {
    // Check nonce
    if (!isset($_POST['_wpnonce']) ||
        !wp_verify_nonce($_POST['_wpnonce'], 'testimonial_action')) {
        wp_die(__('Security check failed', 'theme-testimonials'));
    }

    // Check capability
    if (!current_user_can('manage_options')) {
        wp_die(__('Unauthorized', 'theme-testimonials'));
    }

    // Sanitize input
    $title = sanitize_text_field(wp_unslash($_POST['title'] ?? ''));
    $content = wp_kses_post(wp_unslash($_POST['content'] ?? ''));

    // Process...
}
```

---

## Setting Up Static Analysis

**Skills used**: `wp-phpstan`

### Scenario

Add PHPStan to catch type errors before they become runtime bugs.

### Workflow

#### 1. Install Dependencies

```bash
composer require --dev phpstan/phpstan szepeviktor/phpstan-wordpress
```

#### 2. Create Configuration

**phpstan.neon**:

```neon
includes:
    - vendor/szepeviktor/phpstan-wordpress/extension.neon

parameters:
    level: 6
    paths:
        - inc/
        - functions.php
    excludePaths:
        - vendor/
        - node_modules/
        - dist/
    checkMissingIterableValueType: false
    reportUnmatchedIgnoredErrors: false
```

#### 3. Add WordPress-Specific Types

```php
/**
 * Get testimonials.
 *
 * @param array{
 *   per_page?: int,
 *   category?: string,
 *   featured?: bool
 * } $args Query arguments.
 * @return WP_Post[]
 */
function get_testimonials(array $args = []): array {
    $defaults = [
        'per_page' => 10,
        'category' => '',
        'featured' => false,
    ];

    $args = wp_parse_args($args, $defaults);

    // PHPStan now knows the types of $args
    $query = new WP_Query([
        'post_type'      => 'testimonial',
        'posts_per_page' => $args['per_page'],
    ]);

    return $query->posts;
}
```

#### 4. Generate Baseline for Legacy Code

```bash
# First run - capture all existing errors
vendor/bin/phpstan analyse --generate-baseline

# Future runs ignore baseline errors
vendor/bin/phpstan analyse
```

#### 5. Add to CI

```yaml
# .github/workflows/phpstan.yml
name: PHPStan
on: [push, pull_request]
jobs:
  phpstan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
      - run: composer install
      - run: vendor/bin/phpstan analyse
```

---

## Database Migration Between Environments

**Skills used**: `wp-wpcli-and-ops`

### Scenario

Pull production database to local development, replacing URLs safely.

### Workflow

#### 1. Export Production Database

```bash
# On production
wp db export prod-backup-$(date +%Y%m%d).sql
```

#### 2. Download and Import

```bash
# Download
scp user@prod:/path/to/prod-backup-*.sql ./

# Import locally
wp db import prod-backup-*.sql
```

#### 3. Safe Search-Replace

```bash
# ALWAYS dry-run first
wp search-replace 'https://production.com' 'https://local.test' \
  --dry-run \
  --precise \
  --all-tables

# Review changes, then execute
wp search-replace 'https://production.com' 'https://local.test' \
  --precise \
  --all-tables
```

#### 4. Post-Migration Cleanup

```bash
# Clear caches
wp cache flush
wp transient delete --all

# Regenerate rewrite rules
wp rewrite flush

# Verify
wp option get home
wp option get siteurl
```

#### 5. Using StrataWP Sync (Alternative)

```bash
# Configure environments
stratawp sync:setup

# Pull with automatic URL replacement
stratawp sync:db:pull production

# Creates automatic backup before import
# Handles PHP serialized data correctly
```

---

## Summary

These use cases demonstrate how WordPress agent skills integrate with StrataWP to provide:

1. **Consistent workflows** - Same patterns across different tasks
2. **Safety guardrails** - Dry runs, backups, verification steps
3. **Best practices** - Modern WordPress patterns (apiVersion 3, Interactivity API)
4. **Efficiency** - Less time researching, more time building

Each skill includes detailed references in `.claude/skills/[skill-name]/references/` for deep dives into specific topics.
