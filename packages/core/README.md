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

### Performance Component
Implements performance optimizations:
- Resource hints
- Script defer/async
- Remove WordPress bloat

## Architecture

StrataWP uses a component-based architecture inspired by WPRig but modernized:

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
