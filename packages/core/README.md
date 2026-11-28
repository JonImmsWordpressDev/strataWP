# @stratawp/core

PHP framework for StrataWP WordPress themes.

## Features

- 🧩 **Component Architecture** - Modular, extensible theme structure
- 🎨 **Vite Asset Integration** - Seamless integration with Vite-built assets
- ⚡ **Performance Optimized** - Built-in performance enhancements
- 🔌 **Modern PHP** - PHP 8.1+ with strong typing
- 🧪 **Fully Tested** - Comprehensive test coverage

## Installation

```bash
composer require stratawp/core
```

## Usage

### Basic Theme Setup

```php
<?php
// functions.php

require_once __DIR__ . '/vendor/autoload.php';

use StrataWP\Theme;

// Initialize theme
$theme = new Theme();
$theme->initialize();

// Access template tags
function my_theme() {
    return $theme->template_tags();
}
```

### Creating Custom Components

```php
<?php

namespace MyTheme\Components;

use StrataWP\ComponentInterface;

class CustomFeature implements ComponentInterface {
    public function get_slug(): string {
        return 'custom-feature';
    }

    public function initialize(): void {
        add_action( 'wp_head', [ $this, 'add_custom_code' ] );
    }

    public function add_custom_code(): void {
        // Your code here
    }
}
```

### Template Tags

```php
<?php
// In your template files

// Get theme instance
$theme = stratawp();

// Use template tags
$theme->template_tags()->some_method();
```

## Built-in Components

### Setup Component

Handles theme setup, features, and WordPress integrations.

### Assets Component

Manages Vite-built assets with proper enqueuing and dependencies.

### Blocks Component

Auto-registers Gutenberg blocks from Vite plugin.

### Headless Component (opt-in)

Not in the default list. Add `new \StrataWP\Components\Headless()` to expose each post's parsed blocks as a read-only `blocks` REST field on posts, pages and REST-enabled custom post types: block name, attributes (with the registered defaults applied), inner blocks, and the block's rendered HTML as a fallback. The field is only added to items the REST request can already read, and is empty for password-protected posts until the password is given.

- `stratawp_headless_block_attributes` (`$attributes, $block_name, $block`): drop attributes that should not be public.
- `stratawp_headless_post_types` (`$types`): change which post types get the field.

**Preview and revalidation.** Give it the frontend URL and a shared secret, as constructor arguments or as the `STRATAWP_HEADLESS_FRONTEND_URL` and `STRATAWP_HEADLESS_SECRET` constants in `wp-config.php`. Both are needed; without them nothing below is hooked.

```php
new \StrataWP\Components\Headless( 'https://www.example.com', STRATAWP_HEADLESS_SECRET );
```

- The editor's Preview button goes to `<frontend>/api/draft?token=...`. The token is `base64url(claims).base64url(HMAC-SHA256)` with the post's `id`, `type`, public `path` and an `exp` 5 minutes ahead. `createDraftModeRoute()` in `@stratawp/headless/next` verifies it.
- Publishing, updating, unpublishing and trashing a post sends a non-blocking `POST <frontend>/api/revalidate` with `{ event, id, type, slug, path, timestamp }` and an `X-StrataWP-Signature: sha256=<hex HMAC of the body>` header. `createRevalidateRoute()` verifies it. Draft saves, revisions and autosaves send nothing.
- `stratawp_headless_preview_path` / `stratawp_headless_revalidate_path`: change the frontend routes (defaults `/api/draft` and `/api/revalidate`).
- `stratawp_headless_preview_ttl` (`$seconds`): token lifetime.
- `stratawp_headless_webhook_payload` (`$payload, $post`): change the webhook body before it is signed.

### Performance Component

Implements performance optimizations:

- Resource hints
- Script defer/async
- Remove WordPress bloat

## Architecture

StrataWP uses a component-based architecture inspired by a prior-art WordPress starter theme (GPL), modernized:

```
Theme
├── Component 1 (Setup)
├── Component 2 (Assets)
├── Component 3 (Blocks)
└── Component 4 (Performance)

Each component:
- Implements ComponentInterface
- Has a unique slug
- Initializes via hooks
- Can provide template tags
```

## Requirements

- PHP 8.1+
- WordPress 6.0+
- Composer

## License

GPL-3.0-or-later
