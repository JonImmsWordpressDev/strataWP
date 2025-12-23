# Getting Started with StrataWP

Welcome to StrataWP! This guide will walk you through everything you need to know to build modern WordPress themes with StrataWP, from installation to deployment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Your First Theme](#your-first-theme)
4. [Development Workflow](#development-workflow)
5. [Creating Components](#creating-components)
6. [Building for Production](#building-for-production)
7. [Advanced Features](#advanced-features)
8. [Troubleshooting](#troubleshooting)
9. [Next Steps](#next-steps)

## Prerequisites

Before you start, make sure you have:

### Required

- **Node.js** 18 or higher
- **pnpm** (recommended) or npm
- **PHP** 8.1 or higher
- **WordPress** 6.7 or higher
- **Local WordPress development environment** (Local by Flywheel, MAMP, Docker, etc.)

### Recommended

- **VS Code** with these extensions:
  - ESLint
  - Prettier
  - PHP Intelephense
  - TypeScript and JavaScript Language Features
- **Basic knowledge** of:
  - JavaScript/TypeScript
  - React
  - WordPress Block Themes (FSE)
  - Command line basics

### Install pnpm (if you don't have it)

```bash
npm install -g pnpm
```

## Understanding the Setup

**Important for Beginners:**

Before we start, let's understand WHERE you'll be working:

1. **Do NOT work directly in your WordPress `wp-content/themes/` directory**
   - Instead, create your theme files in a separate location (e.g., `~/Projects/` or `~/Documents/`)

2. **Your WordPress installation** is typically at:
   - Local by Flywheel: `/Users/yourname/Local Sites/sitename/app/public`
   - MAMP: `/Applications/MAMP/htdocs/sitename`
   - Docker: `/var/www/html` (inside container)

3. **Your StrataWP development directory** should be separate:
   - Example: `/Users/yourname/Projects/StrataWP`
   - Example: `/Users/yourname/Documents/my-themes`

4. **We'll use symlinks** to connect your development directory to WordPress
   - This keeps your code organized and makes updates easier

**All terminal commands in this guide should be run in your development directory, NOT in WordPress!**

## Installation

### Option 1: Use Example Themes (Quick Start)

The fastest way to get started with StrataWP right now:

**Step-by-step instructions:**

1. **Open your terminal** (Terminal on Mac, Command Prompt or PowerShell on Windows)

2. **Navigate to your projects folder** (NOT your WordPress directory):
   ```bash
   # Create a projects folder if you don't have one
   mkdir -p ~/Projects
   cd ~/Projects
   ```

3. **Clone the StrataWP repository**:
   ```bash
   git clone https://github.com/JonImmsWordpressDev/StrataWP.git
   cd StrataWP
   ```

   You're now in: `~/Projects/StrataWP/`

4. **Install all dependencies**:
   ```bash
   pnpm install
   ```

5. **Link the example theme to WordPress**:
   ```bash
   # Replace /path/to/wordpress with YOUR WordPress path
   # Example for Local by Flywheel:
   ln -s "$(pwd)/examples/basic-theme" ~/Local\ Sites/mysite/app/public/wp-content/themes/stratawp-basic

   # Example for MAMP:
   # ln -s "$(pwd)/examples/basic-theme" /Applications/MAMP/htdocs/mysite/wp-content/themes/stratawp-basic
   ```

6. **Navigate to the example theme**:
   ```bash
   cd examples/basic-theme
   ```

   You're now in: `~/Projects/StrataWP/examples/basic-theme/`

7. **Start the development server**:
   ```bash
   pnpm dev
   ```

   Keep this terminal window open! The dev server needs to run continuously.

**Then in WordPress:**
1. Go to `WordPress Admin → Appearance → Themes`
2. Activate "StrataWP Basic"
3. Your browser will have hot-reload at your WordPress URL!

**Why symlink?** This keeps your development files separate from WordPress and makes it easier to manage and update.

### Option 2: Copy and Customize an Example Theme

To create your own theme based on an example:

**Step-by-step instructions:**

1. **Open your terminal and navigate to your projects folder**:
   ```bash
   cd ~/Projects
   ```

2. **Copy the basic theme as your starting point**:
   ```bash
   # Make sure you've cloned StrataWP first (see Option 1)
   cp -r StrataWP/examples/basic-theme my-awesome-theme
   cd my-awesome-theme
   ```

   You're now in: `~/Projects/my-awesome-theme/`

3. **Update the theme name in `style.css`**:
   - Open `style.css` in your editor
   - Change `Theme Name: StrataWP Basic` to `Theme Name: My Awesome Theme`
   - Save the file

4. **Install dependencies**:
   ```bash
   pnpm install
   ```

5. **Link your theme to WordPress**:
   ```bash
   # Replace with YOUR WordPress path
   # Example for Local by Flywheel:
   ln -s "$(pwd)" ~/Local\ Sites/mysite/app/public/wp-content/themes/my-awesome-theme

   # Example for MAMP:
   # ln -s "$(pwd)" /Applications/MAMP/htdocs/mysite/wp-content/themes/my-awesome-theme
   ```

6. **Start development**:
   ```bash
   pnpm dev
   ```

   Keep this terminal window open while developing!

### Option 3: Clone and Explore All Examples

If you want to explore the example themes:

```bash
# Clone the repository (OUTSIDE your WordPress themes directory)
git clone https://github.com/JonImmsWordpressDev/StrataWP.git
cd StrataWP

# Install all dependencies
pnpm install

# Link an example theme to your WordPress installation
# Replace /path/to/wordpress with your actual WordPress path
ln -s "$(pwd)/examples/basic-theme" /path/to/wordpress/wp-content/themes/stratawp-basic

# Start the dev server
cd examples/basic-theme
pnpm dev
```

**Why symlink?** This keeps your development files separate from WordPress and makes it easier to manage and update.

## Your First Theme

Let's create your first StrataWP theme from scratch!

### Step 1: Create the Theme

**Important:** Make sure you've already cloned the StrataWP repository using Option 1 above!

1. **Open your terminal and go to your projects folder**:
   ```bash
   cd ~/Projects
   ```

2. **Copy the basic example theme**:
   ```bash
   cp -r StrataWP/examples/basic-theme my-first-theme
   cd my-first-theme
   ```

   You're now in: `~/Projects/my-first-theme/`

You'll see this structure:

```
my-first-theme/
├── inc/                 # PHP components
│   ├── Components/      # Theme features (menus, assets, etc.)
│   └── functions.php    # Component loader
├── patterns/            # Block patterns
├── parts/              # Template parts (header, footer, etc.)
├── src/                # TypeScript/React source
│   ├── blocks/         # Gutenberg blocks
│   ├── scss/           # Styles
│   └── main.ts         # Entry point
├── templates/          # FSE templates
├── functions.php       # Theme entry point
├── style.css           # Theme header
├── theme.json          # FSE configuration
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript config
└── vite.config.ts      # Vite configuration
```

### Step 2: Activate Your Theme

1. **Make sure you're in your theme directory:**
   ```bash
   # Check where you are
   pwd
   # Should show: /Users/yourname/Projects/my-first-theme
   ```

2. **Link your theme to WordPress:**
   ```bash
   # Replace with YOUR WordPress path
   # Example for Local by Flywheel:
   ln -s "$(pwd)" ~/Local\ Sites/mysite/app/public/wp-content/themes/my-first-theme

   # Example for MAMP:
   # ln -s "$(pwd)" /Applications/MAMP/htdocs/mysite/wp-content/themes/my-first-theme
   ```

   This creates a symbolic link so WordPress can see your theme.

3. **Install dependencies:**
   ```bash
   pnpm install
   ```

4. **Activate in WordPress:**
   - Open your WordPress site in a browser
   - Go to `WordPress Admin → Appearance → Themes`
   - Find "My First Theme"
   - Click "Activate"

5. **Start the development server:**
   ```bash
   pnpm dev
   ```

   **Important:** Keep this terminal window open! The dev server must run continuously for hot-reload to work.

### Step 3: Make Your First Change

Let's customize the site title!

**Edit `templates/index.html`:**

```html
<!-- wp:template-part {"slug":"header","tagName":"header"} /-->

<!-- Add a custom heading -->
<!-- wp:group {"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
  <!-- wp:heading {"level":1,"textAlign":"center"} -->
  <h1 class="has-text-align-center">Welcome to My First Theme! 🎉</h1>
  <!-- /wp:heading -->
</div>
<!-- /wp:group -->

<!-- wp:query {"queryId":0,"query":{"perPage":10,"pages":0,"offset":0}} -->
<!-- ... rest of template -->
```

**Save the file.** Your browser will automatically reload and show the changes!

### Step 4: Add Custom Styles

**Edit `src/scss/_custom.scss`:**

```scss
// Custom styles for your theme
.wp-block-group {
  padding: 4rem 0;

  h1 {
    color: var(--wp--preset--color--primary);
    font-size: 3rem;
    margin-bottom: 2rem;
  }
}
```

The styles will automatically compile and reload. No manual build step needed!

## Development Workflow

### Daily Development

Here's your typical day-to-day workflow:

```bash
# 1. Start development server (in your theme directory)
pnpm dev

# 2. Open WordPress in your browser
# http://localhost:8888 (or your local WordPress URL)

# 3. Make changes to your files
# - Edit templates in templates/
# - Edit styles in src/scss/
# - Create blocks in src/blocks/
# - Add components in inc/Components/

# 4. Watch your changes appear automatically!
```

### Hot Module Replacement (HMR)

StrataWP includes smart hot-reload:

- **CSS/SCSS changes**: Instant update (no page reload)
- **TypeScript/JavaScript**: Fast rebuild and reload
- **PHP changes**: Automatic page refresh
- **Template changes**: Instant preview

### Available Commands

```bash
# Development
pnpm dev              # Start dev server with hot-reload
pnpm build            # Build for production

# Code Quality
pnpm type-check       # Check TypeScript types
pnpm lint             # Run ESLint

# Testing (if @stratawp/testing is installed)
pnpm test             # Run unit tests
pnpm test:coverage    # Run with coverage
pnpm test:e2e         # Run E2E tests

# Component Explorer (if @stratawp/explorer is installed)
pnpm explorer         # Launch component browser
```

## Creating Components

StrataWP makes it easy to create different types of components with CLI commands.

> **Note:** The CLI commands below are currently only available when working within the cloned StrataWP repository. They are not yet published to npm. If you copied an example theme to create your own theme, you'll need to create components manually for now.

**To use the CLI from the StrataWP repository:**
```bash
# From within the StrataWP repository
cd /path/to/StrataWP
pnpm build  # Build the CLI if you haven't already

# Now you can use the CLI in any theme
cd examples/basic-theme
npx stratawp block:new hero --type=dynamic --category=design
```

### Create a Gutenberg Block

```bash
stratawp block:new hero --type=dynamic --category=design
```

This creates:
- `src/blocks/hero/block.json` - Block metadata
- `src/blocks/hero/index.tsx` - Edit component
- `src/blocks/hero/save.tsx` - Save component
- `src/blocks/hero/style.scss` - Block styles

**Example block:**

```tsx
// src/blocks/hero/index.tsx
import { useBlockProps, RichText } from '@wordpress/block-editor'

export default function Edit({ attributes, setAttributes }) {
  const blockProps = useBlockProps()

  return (
    <div {...blockProps}>
      <RichText
        tagName="h1"
        value={attributes.heading}
        onChange={(heading) => setAttributes({ heading })}
        placeholder="Enter heading..."
      />
    </div>
  )
}
```

### Create a PHP Component

```bash
stratawp component:new Analytics --type=feature
```

This creates: `inc/Components/Analytics.php`

**Example component:**

```php
<?php
namespace MyTheme\Components;

use StrataWP\Core\ComponentInterface;

class Analytics implements ComponentInterface {
    public function init(): void {
        add_action('wp_head', [$this, 'add_analytics']);
    }

    public function add_analytics(): void {
        if (!is_user_logged_in()) {
            echo '<!-- Google Analytics -->';
        }
    }
}
```

### Create a Template

```bash
stratawp template:new about --type=page
```

This creates: `templates/about.html`

**Edit the template:**

```html
<!-- wp:template-part {"slug":"header"} /-->

<!-- wp:group {"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
  <!-- wp:heading {"level":1} -->
  <h1>About Us</h1>
  <!-- /wp:heading -->

  <!-- wp:paragraph -->
  <p>Your about page content here.</p>
  <!-- /wp:paragraph -->
</div>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer"} /-->
```

### Create a Template Part

```bash
stratawp part:new custom-header --type=header
```

This creates: `parts/custom-header.html`

### Create a Block Pattern

```bash
stratawp pattern:new hero-banner --category=featured
```

Then edit `patterns/hero-banner.php`:

```php
<?php
/**
 * Title: Hero Banner
 * Slug: my-theme/hero-banner
 * Categories: featured
 * Description: A full-width hero banner with call-to-action
 */
?>

<!-- wp:cover {"url":"<?php echo esc_url(get_template_directory_uri()); ?>/assets/images/hero.jpg"} -->
<div class="wp-block-cover">
  <!-- wp:group -->
  <div class="wp-block-group">
    <!-- wp:heading {"level":1} -->
    <h1>Welcome to Our Site</h1>
    <!-- /wp:heading -->

    <!-- wp:buttons -->
    <div class="wp-block-buttons">
      <!-- wp:button -->
      <div class="wp-block-button">
        <a class="wp-block-button__link">Get Started</a>
      </div>
      <!-- /wp:button -->
    </div>
    <!-- /wp:buttons -->
  </div>
  <!-- /wp:group -->
</div>
<!-- /wp:cover -->
```

## Building for Production

When you're ready to deploy:

### Step 1: Build Your Theme

```bash
# Run production build
pnpm build
```

This will:
- Compile and minify all TypeScript/JavaScript
- Process and minify all SCSS/CSS
- Generate optimized assets
- Create source maps
- Output to `dist/` directory

### Step 2: Test the Production Build

```bash
# Check that everything works
wp theme list
wp theme activate my-first-theme
```

Visit your site and test all functionality.

### Step 3: Deploy

**Option A: Direct Upload**

1. Create a ZIP of your theme:
   ```bash
   # From your theme directory
   zip -r my-first-theme.zip . -x "node_modules/*" -x ".git/*" -x "*.log"
   ```

2. Upload via WordPress Admin:
   - Go to `Appearance → Themes → Add New → Upload Theme`
   - Select your ZIP file
   - Click "Install Now"

**Option B: Git Deployment**

```bash
# Push to your repository
git add .
git commit -m "Production build"
git push origin main

# On your server
cd /path/to/wordpress/wp-content/themes
git clone your-repo-url my-first-theme
cd my-first-theme
pnpm install
pnpm build
```

**Option C: Deployment Tools**

Use tools like:
- **WP Pusher** - Git-based deployment
- **DeployHQ** - Automated deployments
- **GitHub Actions** - CI/CD workflows

### Production Checklist

- [ ] Run `pnpm build` successfully
- [ ] Test on staging environment
- [ ] Check all pages render correctly
- [ ] Test forms and interactive features
- [ ] Verify images and assets load
- [ ] Check mobile responsiveness
- [ ] Test in different browsers
- [ ] Review console for errors
- [ ] Check page load times
- [ ] Validate HTML/CSS

## Advanced Features

### AI-Assisted Development

Generate code with AI:

```bash
# Setup AI provider
stratawp ai:setup

# Generate a block
stratawp ai:generate block
# > Describe: A testimonial slider with star ratings

# Review code
stratawp ai:review src/blocks/testimonials/index.tsx

# Generate documentation
stratawp ai:document src/blocks/testimonials/index.tsx -o docs/testimonials.md
```

### Component Registry

Share and discover components:

```bash
# Search for components
stratawp registry:search slider

# Install a component
stratawp registry:install @stratawp/testimonial-slider

# Publish your component
stratawp registry:publish
```

### Component Explorer

Browse all your components visually:

```bash
# Launch component browser
stratawp explorer

# Opens at http://localhost:3000
```

Features:
- View all blocks, components, patterns
- Test with different attributes
- Preview on Mobile/Tablet/Desktop
- View source code
- Copy code snippets

### Headless WordPress

Build decoupled apps with React/Next.js:

```bash
# Install headless package
pnpm add @stratawp/headless

# Create Next.js app
npx create-next-app my-headless-site
cd my-headless-site
pnpm add @stratawp/headless
```

**Use in Next.js:**

```typescript
// lib/wordpress.ts
import { WordPressClient } from '@stratawp/headless'

export const wordpress = new WordPressClient({
  baseUrl: process.env.WORDPRESS_URL!,
})

// app/blog/page.tsx
import { wordpress } from '@/lib/wordpress'

export default async function BlogPage() {
  const { data: posts } = await wordpress.getPosts()

  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title.rendered}</h2>
        </article>
      ))}
    </div>
  )
}
```

### Design System Integration

Add Tailwind CSS or UnoCSS:

```bash
# Setup Tailwind
stratawp design-system:setup tailwind

# Or UnoCSS
stratawp design-system:setup unocss
```

Your design system will automatically sync with `theme.json` for WordPress preset colors, spacing, and typography.

## Troubleshooting

### Common Issues

#### Port Already in Use

**Problem:** `Error: Port 3000 is already in use`

**Solution:**
```bash
# Use a different port
pnpm dev --port 3001
```

#### Build Fails

**Problem:** `Build failed with errors`

**Solution:**
```bash
# Clear cache and rebuild
rm -rf node_modules dist .vite
pnpm install
pnpm build
```

#### Hot Reload Not Working

**Problem:** Changes don't appear automatically

**Solution:**
1. Check that dev server is running: `pnpm dev`
2. Clear browser cache (Cmd/Ctrl + Shift + R)
3. Check browser console for errors
4. Restart dev server

#### TypeScript Errors

**Problem:** `TS2307: Cannot find module`

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install

# Check TypeScript config
pnpm type-check
```

#### WordPress Not Finding Theme

**Problem:** Theme doesn't appear in WordPress admin

**Solution:**
1. Check symlink is correct:
   ```bash
   ls -la /path/to/wordpress/wp-content/themes/
   ```
2. Ensure `style.css` has proper headers
3. Check file permissions

#### Styles Not Loading

**Problem:** CSS changes don't appear

**Solution:**
1. Check SCSS files have no syntax errors
2. Clear WordPress cache (if using caching plugin)
3. Hard refresh browser (Cmd/Ctrl + Shift + R)
4. Check `dist/` directory exists

### Getting Help

**Resources:**
- **Documentation**: https://github.com/JonImmsWordpressDev/StrataWP#readme
- **Issues**: https://github.com/JonImmsWordpressDev/StrataWP/issues
- **Discussions**: https://github.com/JonImmsWordpressDev/StrataWP/discussions

**Before Asking for Help:**
1. Check this guide's troubleshooting section
2. Search existing GitHub issues
3. Review package READMEs in `packages/`
4. Check browser console for errors
5. Try with a fresh installation

**When Asking for Help, Include:**
- Node.js version: `node --version`
- pnpm version: `pnpm --version`
- WordPress version
- Error message (full stack trace)
- Steps to reproduce
- What you've already tried

## Next Steps

### Learn More

**Beginner:**
1. ✅ Complete this guide
2. Explore example themes in `examples/`
3. Read block creation guide: `packages/cli/README.md`
4. Try creating your first custom block
5. Customize an existing pattern

**Intermediate:**
1. Learn PHP component system
2. Create custom post types
3. Add Gutenberg blocks with controls
4. Integrate third-party APIs
5. Set up testing with `@stratawp/testing`

**Advanced:**
1. Build headless apps with `@stratawp/headless`
2. Create and publish components to registry
3. Contribute to StrataWP core
4. Build custom Vite plugins
5. Create advanced block patterns

### Example Projects

**Blog Theme:**
- Custom post types (Portfolio, Testimonials)
- Blog layouts with sidebar
- Category and tag archives
- Author pages
- Search functionality

**Business Theme:**
- Services section with custom blocks
- Team member showcase
- Contact forms
- Testimonial sliders
- Portfolio grid

**E-Commerce Theme:**
- WooCommerce integration
- Product showcases
- Category grids
- Cart and checkout customization
- Product quick view

**Headless Blog:**
- Next.js frontend
- WordPress backend
- API integration
- SEO optimization
- Image optimization

### Resources

**WordPress:**
- [Block Editor Handbook](https://developer.wordpress.org/block-editor/)
- [Theme Handbook](https://developer.wordpress.org/themes/)
- [REST API Handbook](https://developer.wordpress.org/rest-api/)

**StrataWP:**
- [Main README](./README.md)
- [Component Registry](./packages/registry/README.md)
- [Testing Guide](./packages/testing/README.md)
- [Headless WordPress](./packages/headless/README.md)
- [Component Explorer](./packages/explorer/README.md)

**Tools:**
- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [pnpm Documentation](https://pnpm.io/)

## Quick Reference

### Essential Commands

```bash
# Create new theme (copy from example for now)
cp -r StrataWP/examples/basic-theme my-theme

# Development
pnpm dev                    # Start dev server
pnpm build                  # Build for production

# Generate components (from within StrataWP repo only - not yet published to npm)
npx stratawp block:new <name>
npx stratawp component:new <name>
npx stratawp template:new <name>
npx stratawp part:new <name>

# Component Explorer (future feature)
npx stratawp explorer           # Launch browser

# Testing
pnpm test                   # Run tests
pnpm test:coverage          # With coverage

# Component Registry (future feature)
npx stratawp registry:search <query>
npx stratawp registry:install <package>
```

> **Note:** Many CLI commands shown above are available locally within the StrataWP repository but not yet published to npm. See the "Creating Components" section for details on using them.

### File Locations

| What | Where |
|------|-------|
| Blocks | `src/blocks/` |
| Styles | `src/scss/` |
| PHP Components | `inc/Components/` |
| Templates | `templates/` |
| Template Parts | `parts/` |
| Patterns | `patterns/` |
| Theme Config | `theme.json` |
| Build Output | `dist/` |

### Important Files

- `functions.php` - Theme entry point
- `style.css` - Theme metadata
- `theme.json` - FSE configuration
- `vite.config.ts` - Build configuration
- `tsconfig.json` - TypeScript settings
- `package.json` - Dependencies and scripts

---

**Congratulations!** 🎉 You're now ready to build amazing WordPress themes with StrataWP. Start building, experiment, and don't hesitate to ask for help in the GitHub Discussions if you get stuck.

Happy coding! 🚀
