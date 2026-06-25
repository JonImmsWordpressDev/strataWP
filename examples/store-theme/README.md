# StrataWP Store Theme

An e-commerce Block Theme (FSE) built on the Frost design system with WooCommerce integration, showcasing the StrataWP framework optimized for online stores. Perfect for product-based businesses, digital goods, and WooCommerce sites.

## Features

### WooCommerce Integration

- Full WooCommerce compatibility with custom styling
- Product listing and single product templates
- Cart and checkout page templates
- Shop archive with grid/list views
- Product category and tag archives
- WooCommerce block patterns optimized for sales

### E-Commerce Patterns

All patterns from Frost theme, plus store-specific patterns:

- **Product Grids**: Showcase products in modern grid layouts
- **Featured Products**: Highlight bestsellers and promotions
- **Product Categories**: Browse by category with images
- **Shopping Cart**: Custom cart page layouts
- **Checkout Flow**: Streamlined checkout experience
- **Product CTAs**: Buy now, add to cart, and promotional buttons
- **Pricing Tables**: Compare plans and product tiers
- **Testimonials**: Customer reviews and social proof

### Frost Design System Integration

- Built on WP Engine's Frost theme foundation
- 52+ professional patterns (headers, footers, heroes, CTAs)
- Light and dark mode variants
- Responsive design system with fluid typography
- Comprehensive block styling optimized for product pages

### Store Templates (13+)

- Home page (store homepage)
- Shop (product archive)
- Single product
- Product category
- Product tag
- Cart
- Checkout
- My Account
- Index (blog listing)
- Single post
- Page
- 404 error page
- Blank (no header/footer)

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
- Modular SCSS architecture
- Custom Gutenberg blocks
- PHP Hot Reload
- WooCommerce-specific styles with Sass variables

### Product Showcase Features

- Image zoom and lightbox ready
- Product galleries with thumbnails
- Related products section
- Upsells and cross-sells
- Product reviews and ratings
- Stock status indicators
- Sale badges and pricing

### Accessibility

- WCAG 2.1 compliant
- Proper ARIA labels for e-commerce elements
- Keyboard navigation for product browsing
- Touch-friendly (48px minimum targets)
- Screen reader optimized checkout flow

## Installation

### Prerequisites

1. **Install WooCommerce plugin:**
   ```bash
   # Via WordPress admin: Plugins → Add New → Search "WooCommerce"
   # Or via WP-CLI:
   wp plugin install woocommerce --activate
   ```

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
   ln -s "$(pwd)/examples/store-theme" /path/to/wordpress/wp-content/themes/stratawp-store
   ```

4. **Activate in WordPress Admin:**
   - Go to Appearance → Themes
   - Activate "StrataWP Store Theme"

5. **Start the development server:**
   ```bash
   cd examples/store-theme
   pnpm dev
   ```

### Alternative: Direct Installation

If you prefer to work directly in `wp-content/themes/`:

1. Clone directly into themes:

   ```bash
   cd wp-content/themes
   git clone https://github.com/JonImmsWordpressDev/StrataWP.git stratawp
   cd stratawp/examples/store-theme
   ```

2. Install and activate as above

**Note:** The symlink approach is recommended as it keeps your development files separate from WordPress.

## WooCommerce Setup

After activating the theme:

1. **Run WooCommerce Setup Wizard:**
   - Go to WooCommerce → Home
   - Complete the setup wizard (store details, payment, shipping)

2. **Configure Store Pages:**
   - WooCommerce → Settings → Advanced
   - Verify Cart, Checkout, My Account pages are set

3. **Import Sample Products (Optional):**
   - Tools → Import → WooCommerce Products
   - Use sample data for testing

4. **Customize Product Display:**
   - Appearance → Customize → WooCommerce
   - Set products per page, image sizes, etc.

## Editing the Theme

### Using the Site Editor

1. Go to **Appearance → Editor**
2. Edit templates (Shop, Product, Cart, etc.) visually
3. Changes save automatically

### Custom Development

```bash
pnpm dev    # Start dev server with HMR
pnpm build  # Build for production
```

### File Structure

```
store-theme/
├── theme.json              # Design system v3 (Frost + WooCommerce)
├── style.css               # Theme metadata
├── functions.php           # Theme setup + WooCommerce integration
├── woocommerce.php         # WooCommerce template override
├── templates/              # Block templates (13+ HTML files)
│   ├── home.html           # Store homepage
│   ├── index.html          # Blog listing
│   ├── single.html         # Blog post
│   ├── page.html           # Static pages
│   ├── archive.html        # Archives
│   ├── 404.html            # Error page
│   └── woocommerce/        # WooCommerce templates
│       ├── archive-product.html
│       ├── single-product.html
│       ├── taxonomy-product_cat.html
│       └── taxonomy-product_tag.html
├── parts/                  # Template parts (HTML)
│   ├── header.html         # Store header with cart icon
│   └── footer.html         # Store footer
├── patterns/               # Reusable patterns (60+ PHP files)
│   ├── header-*.php
│   ├── footer-*.php
│   ├── product-*.php       # Product showcase patterns
│   ├── shop-*.php          # Shop layouts
│   ├── hero-*.php
│   ├── cta-*.php
│   └── ... (52+ more patterns)
├── src/
│   ├── blocks/            # Custom Gutenberg blocks
│   ├── scss/              # Modular SCSS
│   │   ├── main.scss      # Main entry point
│   │   ├── _variables.scss
│   │   ├── _woocommerce.scss  # WooCommerce styles
│   │   ├── _products.scss     # Product display
│   │   ├── _cart.scss         # Cart & checkout
│   │   ├── _reset.scss
│   │   ├── _typography.scss
│   │   └── ...
│   └── js/                # TypeScript/JavaScript
│       ├── main.ts
│       └── woocommerce.ts # Store-specific JS
├── inc/                   # PHP includes
│   └── woocommerce.php    # WooCommerce customizations
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

Edit `theme.json` to customize the store color palette:

- Base (background)
- Contrast (text)
- Primary (brand color - buttons, links, sale badges)
- Secondary (accent - ratings, badges)
- Neutral (borders, backgrounds)

### Product Display

Edit `functions.php` to customize:

- Products per page
- Product columns
- Related products count
- Image sizes
- Gallery behavior

### Patterns

- Swap header/footer patterns by editing `parts/header.html` or `parts/footer.html`
- Use product patterns to create custom shop pages
- Insert patterns anywhere through the WordPress editor

## Store Optimization

### Performance

- Lazy load product images
- Optimize product image sizes
- Use Vite for asset optimization
- Enable WooCommerce caching

### SEO

- Yoast SEO or Rank Math compatible
- Schema.org markup for products
- Proper heading hierarchy
- Alt text for product images

### Conversion

- Clear CTAs (Add to Cart, Buy Now)
- Trust badges and security indicators
- Customer testimonials
- Related products for upselling
- Sale badges and countdown timers

## Requirements

- PHP 8.1+
- WordPress 6.7+
- **WooCommerce 8.0+** (required)
- Node.js 18+
- Composer
- pnpm (recommended) or npm

## Recommended Plugins

- **WooCommerce** (required) - E-commerce functionality
- **WooCommerce Blocks** - Additional product blocks
- **Yoast SEO** - SEO optimization
- **Jetpack** - Performance and security
- **WooCommerce Stripe** - Payment gateway

## Credits

- **Design System**: Built on [Frost](https://frostwp.com/) by WP Engine
- **Framework**: StrataWP by Jon Imms
- **E-Commerce**: WooCommerce
- **Inspired by**: a prior-art WordPress starter theme (GPL), Next.js, Vite, Shopify themes

## License

GPL-3.0-or-later

Built with StrataWP by Jon Imms
