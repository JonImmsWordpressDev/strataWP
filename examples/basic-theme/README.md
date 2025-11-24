# WP-Forge Basic Theme

A clean, modern Block Theme (FSE) showcasing the WP-Forge framework. Perfect for blogs, simple business sites, and learning WP-Forge basics.

## Features

### Block Theme (Full Site Editing)
- Visual Site Editor with drag-and-drop
- Edit templates and template parts in the admin
- Global styles and design system via theme.json
- No PHP templates needed (but still supported for custom functionality)

### Modern Development
- TypeScript + Vite build system
- Hot Module Replacement (HMR) in development
- Custom Gutenberg blocks
- Performance optimized

### Included Templates
- Index (blog listing)
- Single post
- Page  
- Archive
- 404 error page

### Template Parts
- Header (with site title and navigation)
- Footer

### Accessibility
- WCAG 2.1 compliant
- Proper ARIA labels
- Keyboard navigation
- Touch-friendly (48px minimum targets)

## Installation

1. Clone or download to your themes directory
2. Install dependencies:
   ```bash
   composer install
   pnpm install
   ```
3. Build assets:
   ```bash
   pnpm build
   ```
4. Activate in WordPress Admin

## Editing the Theme

### Using the Site Editor
1. Go to **Appearance → Editor**
2. Edit templates, template parts, and styles visually
3. Changes save automatically

### Custom Development
```bash
pnpm dev    # Start dev server with HMR
pnpm build  # Build for production
```

### File Structure
```
basic-theme/
├── theme.json           # Design system, colors, typography
├── templates/           # Block templates (HTML)
│   ├── index.html
│   ├── single.html
│   ├── page.html
│   ├── archive.html
│   └── 404.html
├── parts/              # Template parts (HTML)
│   ├── header.html
│   └── footer.html
├── src/
│   ├── blocks/         # Custom blocks
│   ├── css/            # Styles
│   └── js/             # Scripts
└── functions.php       # Custom PHP functionality
```

## Requirements

- PHP 8.1+
- WordPress 6.0+
- Node.js 18+
- Composer

## License

GPL-3.0-or-later

Built with WP-Forge by Jon Imms
