# StrataWP Basic Theme

A professional Block Theme (FSE) built on the Frost design system, showcasing the StrataWP framework with modern development tools. Perfect for blogs, business sites, and learning StrataWP.

## Features

### Frost Design System Integration
- Built on WP Engine's Frost theme foundation
- 52+ professional patterns (headers, footers, heroes, CTAs, testimonials, pricing tables)
- Light and dark mode variants
- Responsive design system with fluid typography
- Comprehensive block styling

### Custom Typography Control
- Dual-mode system: Recommended font pairings or custom Google Fonts
- Select any Google Font for headings and body text
- Granular font weight control (100-900)
- Live preview in WordPress admin
- Settings → StrataWP Typography

### Block Theme (Full Site Editing)
- Visual Site Editor with drag-and-drop
- Edit templates and template parts in the admin
- Global styles and design system via theme.json v3
- Pattern-based template parts for easy customization

### Modern Development
- TypeScript + Vite build system
- Hot Module Replacement (HMR) with instant updates
- Modular SCSS architecture (wp-rig inspired)
- Custom Gutenberg blocks
- PHP Hot Reload

### Included Templates (9)
- Home page
- Index (blog listing)
- Single post
- Page
- Archive
- Search
- 404 error page
- Blank (no header/footer)
- No Title (page without title)

### Template Parts
- Header (references header patterns)
- Footer (references footer patterns)

### Patterns (52)
All patterns from Frost theme, adapted for StrataWP:
- **Headers**: default, notification bar (+ dark variants)
- **Footers**: default, mega, stacked, three-columns (+ dark variants)
- **Heroes**: one-column, two-columns
- **CTAs**: button, stacked (+ dark variants)
- **Content**: boxes (2/3 columns), portfolio, posts (grid/list)
- **Testimonials**: default, with images (+ dark variants)
- **Pricing**: tables with 2/3/4 columns (+ dark variants)
- **Team**: four-columns layout
- **Pages**: complete page patterns (home, about, pricing, link)

### Accessibility
- WCAG 2.1 compliant
- Proper ARIA labels
- Keyboard navigation
- Touch-friendly (48px minimum targets)

## Installation

### Recommended: Symlink Setup

1. **Clone the repository OUTSIDE your WordPress themes directory:**
   ```bash
   cd ~/projects  # or wherever you keep projects
   git clone https://github.com/JonImmsWordpressDev/StrataWP.git
   cd StrataWP
   ```

2. **Install dependencies:**
   ```bash
   composer install
   pnpm install
   ```

3. **Create a symlink to your WordPress installation:**
   ```bash
   # Replace /path/to/wordpress with your actual WordPress path
   ln -s "$(pwd)/examples/basic-theme" /path/to/wordpress/wp-content/themes/stratawp-basic
   ```

4. **Activate in WordPress Admin:**
   - Go to Appearance → Themes
   - Activate "StrataWP Basic Theme"

5. **Start the development server:**
   ```bash
   cd examples/basic-theme
   pnpm dev
   ```

### Alternative: Direct Installation

If you prefer to work directly in `wp-content/themes/`:

1. Clone directly into themes:
   ```bash
   cd wp-content/themes
   git clone https://github.com/JonImmsWordpressDev/StrataWP.git stratawp
   cd stratawp/examples/basic-theme
   ```

2. Install and activate as above

**Note:** The symlink approach is recommended as it keeps your development files separate from WordPress.

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
├── theme.json              # Design system v3 (Frost-based)
├── style.css               # Theme metadata
├── functions.php           # Theme setup + Vite integration
├── templates/              # Block templates (9 HTML files)
│   ├── home.html
│   ├── index.html
│   ├── single.html
│   ├── page.html
│   ├── archive.html
│   ├── search.html
│   ├── 404.html
│   ├── blank.html
│   └── no-title.html
├── parts/                  # Template parts (HTML)
│   ├── header.html         # References header pattern
│   └── footer.html         # References footer pattern
├── patterns/               # Reusable patterns (52 PHP files)
│   ├── header-*.php
│   ├── footer-*.php
│   ├── hero-*.php
│   ├── cta-*.php
│   └── ... (48 more patterns)
├── src/
│   ├── blocks/            # Custom Gutenberg blocks
│   ├── scss/              # Modular SCSS (wp-rig inspired)
│   │   ├── main.scss      # Main entry point
│   │   ├── _variables.scss
│   │   ├── _reset.scss
│   │   ├── _typography.scss
│   │   ├── _forms.scss
│   │   ├── _navigation.scss
│   │   ├── _utilities.scss
│   │   └── ...
│   └── js/                # TypeScript/JavaScript
│       └── main.ts
├── inc/                   # PHP includes
└── vite.config.ts         # Vite configuration
```

## Customization

### Typography
1. Go to **Settings → StrataWP Typography**
2. Choose between:
   - **Recommended Pairings**: Curated font combinations
   - **Custom Fonts**: Select any Google Font for headings and body
3. Select font weights (100-900) for performance
4. See live preview and save

### Colors
Edit `theme.json` to customize the color palette:
- Base (background)
- Contrast (text)
- Primary (brand color)
- Secondary (accent)
- Neutral (borders, backgrounds)

### Patterns
- Swap header/footer patterns by editing `parts/header.html` or `parts/footer.html`
- Change pattern slug to use different header/footer styles
- Insert patterns anywhere through the WordPress editor

## Requirements

- PHP 8.1+
- WordPress 6.7+
- Node.js 18+
- Composer
- pnpm (recommended) or npm

## Credits

- **Design System**: Built on [Frost](https://frostwp.com/) by WP Engine
- **Framework**: StrataWP by Jon Imms
- **Inspired by**: wp-rig, Next.js, Vite

## License

GPL-3.0-or-later

Built with StrataWP by Jon Imms
