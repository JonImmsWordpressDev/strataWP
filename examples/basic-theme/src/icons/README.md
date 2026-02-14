# StrataWP Icons

This directory holds your icon font files.

## How to add icons from Flaticon

1. Go to [flaticon.com](https://www.flaticon.com)
2. Browse icons and add them to a collection
3. Open your collection and click "Download collection"
4. Choose **Icon Font** format and download the ZIP
5. Run: `stratawp icons:update --zip /path/to/download.zip`

## Usage in templates

```php
<?php strata_basic()->template_tags()->icon('home'); ?>
<?php strata_basic()->template_tags()->icon('home', ['size' => 'lg']); ?>
<?php strata_basic()->template_tags()->get_icon('arrow-right'); ?>
```

## Available sizes

- `sm` — 0.875rem
- `md` — 1.25rem
- `lg` — 1.75rem
- `xl` — 2.5rem

## File structure

```
src/icons/
  flaticon.css       # Icon font stylesheet
  fonts/
    flaticon.woff2   # Primary font format
    flaticon.woff    # Fallback
    flaticon.ttf     # Fallback
```
