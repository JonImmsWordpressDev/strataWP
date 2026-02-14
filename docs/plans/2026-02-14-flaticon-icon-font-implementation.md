# Flaticon Icon Font Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a first-class icon font system to StrataWP, powered by curated Flaticon icon fonts bundled in the theme.

**Architecture:** New `Icons` PHP component in the core package (follows same pattern as `Fonts` component), a Vite plugin for copying/watching icon assets, and a CLI command for setup/import. Icons are bundled in the theme — no runtime API dependency.

**Tech Stack:** PHP 8.1+ (WordPress component), TypeScript (Vite plugin + CLI), CSS

**Design doc:** `docs/plans/2026-02-14-flaticon-icon-font-design.md`

---

### Task 1: Create the Icons PHP Component

**Files:**
- Create: `packages/core/src/Components/Icons.php`

**Reference files to study first:**
- `packages/core/src/Components/Fonts.php` — similar component pattern
- `packages/core/src/Components/Assets.php` — asset enqueuing pattern
- `packages/core/src/ComponentInterface.php` — interface to implement
- `packages/core/src/TemplatingComponentInterface.php` — template tag interface

**Step 1: Create `packages/core/src/Components/Icons.php`**

```php
<?php
/**
 * Icons Component
 *
 * Manages icon font loading and provides template tag helpers for rendering icons.
 * Works with Flaticon icon font packages (or any CSS icon font).
 *
 * @package StrataWP
 */

namespace StrataWP\Components;

use StrataWP\ComponentInterface;
use StrataWP\TemplatingComponentInterface;

/**
 * Icon Font Management Component
 */
class Icons implements ComponentInterface, TemplatingComponentInterface {

	/**
	 * Path to icon CSS file relative to theme root.
	 *
	 * @var string
	 */
	protected string $css_path;

	/**
	 * Cached list of available icon names.
	 *
	 * @var array|null
	 */
	protected ?array $icon_names = null;

	/**
	 * Constructor
	 *
	 * @param string $css_path Path to icon CSS file relative to theme root.
	 */
	public function __construct( string $css_path = '' ) {
		$this->css_path = $css_path;
	}

	/**
	 * {@inheritdoc}
	 */
	public function get_slug(): string {
		return 'icons';
	}

	/**
	 * {@inheritdoc}
	 */
	public function initialize(): void {
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_icon_styles' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_icon_styles' ] );
	}

	/**
	 * {@inheritdoc}
	 */
	public function template_tags(): array {
		return [
			'icon'      => [ $this, 'render' ],
			'get_icon'  => [ $this, 'get' ],
			'icon_list' => [ $this, 'get_icon_list' ],
		];
	}

	/**
	 * Enqueue icon font stylesheet
	 */
	public function enqueue_icon_styles(): void {
		$css_url = $this->get_css_url();

		if ( ! $css_url ) {
			return;
		}

		$css_path = $this->get_css_file_path();
		$version  = $css_path && file_exists( $css_path ) ? filemtime( $css_path ) : '1.0.0';

		wp_enqueue_style( 'stratawp-icons', $css_url, [], $version );

		// Add size utility classes inline
		wp_add_inline_style( 'stratawp-icons', $this->get_size_utilities_css() );
	}

	/**
	 * Render an icon (echo)
	 *
	 * @param string $name Icon name (without prefix, e.g., 'home' not 'flaticon-home').
	 * @param array  $args Optional args: size (sm|md|lg|xl), class, aria-label.
	 */
	public function render( string $name, array $args = [] ): void {
		echo $this->get( $name, $args );
	}

	/**
	 * Get icon HTML string
	 *
	 * @param string $name Icon name (without prefix).
	 * @param array  $args Optional args: size (sm|md|lg|xl), class, aria-label.
	 * @return string Icon HTML.
	 */
	public function get( string $name, array $args = [] ): string {
		$classes = [ 'flaticon-' . sanitize_html_class( $name ) ];

		// Size class
		if ( ! empty( $args['size'] ) ) {
			$valid_sizes = [ 'sm', 'md', 'lg', 'xl' ];
			if ( in_array( $args['size'], $valid_sizes, true ) ) {
				$classes[] = 'strata-icon--' . $args['size'];
			}
		}

		// Additional classes
		if ( ! empty( $args['class'] ) ) {
			$classes[] = sanitize_html_class( $args['class'] );
		}

		$class_attr = esc_attr( implode( ' ', $classes ) );

		// Accessibility
		if ( ! empty( $args['aria-label'] ) ) {
			return sprintf(
				'<i class="%s" role="img" aria-label="%s"></i>',
				$class_attr,
				esc_attr( $args['aria-label'] )
			);
		}

		return sprintf( '<i class="%s" aria-hidden="true"></i>', $class_attr );
	}

	/**
	 * Get list of available icon names
	 *
	 * Parses the icon CSS file for class names matching .flaticon-*
	 *
	 * @return array Array of icon names (without the 'flaticon-' prefix).
	 */
	public function get_icon_list(): array {
		if ( null !== $this->icon_names ) {
			return $this->icon_names;
		}

		$this->icon_names = [];
		$css_path = $this->get_css_file_path();

		if ( ! $css_path || ! file_exists( $css_path ) ) {
			return $this->icon_names;
		}

		$css_content = file_get_contents( $css_path );

		if ( preg_match_all( '/\.flaticon-([a-z0-9_-]+)\s*[:{]/', $css_content, $matches ) ) {
			$this->icon_names = array_unique( $matches[1] );
			sort( $this->icon_names );
		}

		return $this->icon_names;
	}

	/**
	 * Get the URL for the icon CSS file
	 *
	 * @return string|false CSS URL or false if not found.
	 */
	protected function get_css_url() {
		$css_path = $this->get_css_file_path();

		if ( ! $css_path || ! file_exists( $css_path ) ) {
			return false;
		}

		$theme_dir = get_template_directory();
		$relative  = str_replace( $theme_dir, '', $css_path );

		return get_template_directory_uri() . $relative;
	}

	/**
	 * Get the absolute file path for the icon CSS
	 *
	 * @return string|false Absolute path or false.
	 */
	protected function get_css_file_path() {
		$theme_dir = get_template_directory();

		// If explicit path was provided, use it
		if ( ! empty( $this->css_path ) ) {
			$path = $theme_dir . '/' . ltrim( $this->css_path, '/' );
			return file_exists( $path ) ? $path : false;
		}

		// Auto-detect: check dist/ first (production), then src/ (development)
		$dist_path = $theme_dir . '/dist/icons/flaticon.css';
		if ( file_exists( $dist_path ) ) {
			return $dist_path;
		}

		$src_path = $theme_dir . '/src/icons/flaticon.css';
		if ( file_exists( $src_path ) ) {
			return $src_path;
		}

		return false;
	}

	/**
	 * Get CSS for icon size utility classes
	 *
	 * @return string CSS string.
	 */
	protected function get_size_utilities_css(): string {
		return <<<CSS
.strata-icon--sm { font-size: 0.875rem; }
.strata-icon--md { font-size: 1.25rem; }
.strata-icon--lg { font-size: 1.75rem; }
.strata-icon--xl { font-size: 2.5rem; }
CSS;
	}
}
```

**Step 2: Verify the autoloader covers the new file**

The PSR-4 autoloader in `packages/core/composer.json` maps `StrataWP\` to `src/`, so `StrataWP\Components\Icons` will resolve to `src/Components/Icons.php` automatically. No changes needed.

**Step 3: Commit**

```bash
cd /Users/jon.imms/Local\ Sites/stratawp/strataWP
git add packages/core/src/Components/Icons.php
git commit -m "feat(core): add Icons component for icon font management

Implements ComponentInterface and TemplatingComponentInterface.
Enqueues icon font CSS, provides render/get/list template tags,
auto-detects CSS in dist/ or src/icons/, and adds size utility classes."
```

---

### Task 2: Register Icons Component in Example Theme

**Files:**
- Modify: `examples/basic-theme/functions.php` (add Icons import and registration)

**Step 1: Add the Icons component to `functions.php`**

Add the import at line 26 (after the other StrataWP component imports):
```php
use StrataWP\Components\Icons;
```

Add `new Icons(),` to the Theme constructor array (after `new Fonts(),` on line 40):
```php
new Icons(),
```

**Step 2: Commit**

```bash
git add examples/basic-theme/functions.php
git commit -m "feat(basic-theme): register Icons component"
```

---

### Task 3: Add Icon Directory Handling to Vite Plugin

**Files:**
- Modify: `packages/vite-plugin/src/plugins/assets.ts`

**Reference:** Current file is minimal (40 lines). We need to add:
1. A `buildEnd` or `writeBundle` hook to copy `src/icons/` → `dist/icons/`
2. In the `configureServer` hook (or via PHPHmr watcher), watch `src/icons/` for changes

**Step 1: Extend the assets plugin**

Replace the current `packages/vite-plugin/src/plugins/assets.ts` content. The key additions are:
- Import `fs` and `path` from Node
- Add `writeBundle` hook that copies `src/icons/` → `dist/icons/` and rewrites font `url()` paths in the CSS
- Add `configureServer` hook that watches `src/icons/` for changes and triggers full reload

```typescript
import type { Plugin } from 'vite'
import type { AssetOptions } from '../types'
import fs from 'fs'
import path from 'path'

/**
 * WordPress-compatible asset handling
 *
 * Ensures assets are output in WordPress-friendly structure
 * and can be properly enqueued by WordPress.
 * Also handles icon font directory (src/icons/ → dist/icons/).
 */
export function strataWPAssets(options: AssetOptions = {}): Plugin {
  const {
    publicDir = 'dist',
    baseUrl,
  } = options

  let rootDir: string

  return {
    name: 'stratawp:assets',

    config() {
      return {
        publicDir: publicDir,
        base: baseUrl || './',

        build: {
          // Output to WordPress theme structure
          outDir: publicDir,
          emptyOutDir: false, // Don't delete PHP files

          // Asset handling
          assetsDir: '',
          assetsInlineLimit: 0, // Don't inline assets

          // Sourcemaps for debugging
          sourcemap: true,
        },
      }
    },

    configResolved(config) {
      rootDir = config.root
    },

    /**
     * Copy src/icons/ to dist/icons/ after build
     */
    writeBundle() {
      const iconsSource = path.resolve(rootDir, 'src/icons')
      const iconsDest = path.resolve(rootDir, publicDir, 'icons')

      if (!fs.existsSync(iconsSource)) {
        return
      }

      copyIconsDirectory(iconsSource, iconsDest)
    },

    /**
     * Watch src/icons/ for changes during development
     */
    configureServer(server) {
      const iconsDir = path.resolve(server.config.root, 'src/icons')

      if (fs.existsSync(iconsDir)) {
        server.watcher.add(iconsDir)

        server.watcher.on('change', (filePath) => {
          if (filePath.startsWith(iconsDir)) {
            server.ws.send({ type: 'full-reload' })
          }
        })

        server.watcher.on('add', (filePath) => {
          if (filePath.startsWith(iconsDir)) {
            server.ws.send({ type: 'full-reload' })
          }
        })
      }
    },
  }
}

/**
 * Recursively copy icons directory, rewriting CSS url() paths
 */
function copyIconsDirectory(source: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  const entries = fs.readdirSync(source, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(source, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyIconsDirectory(srcPath, destPath)
    } else if (entry.name.endsWith('.css')) {
      // Rewrite font url() paths in CSS to be relative to dist/icons/
      let content = fs.readFileSync(srcPath, 'utf-8')
      content = rewriteFontUrls(content)
      fs.writeFileSync(destPath, content)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

/**
 * Rewrite url() paths in icon CSS so fonts resolve correctly from dist/icons/
 *
 * Flaticon CSS typically has: url("./fonts/flaticon.woff2")
 * We keep that relative structure since fonts/ is copied alongside the CSS.
 */
function rewriteFontUrls(css: string): string {
  // Normalize paths: ../fonts/ → ./fonts/ (in case Flaticon uses parent refs)
  return css.replace(/url\(["']?\.\.\/fonts\//g, 'url("./fonts/')
}
```

**Step 2: Commit**

```bash
git add packages/vite-plugin/src/plugins/assets.ts
git commit -m "feat(vite-plugin): add icon font directory handling to assets plugin

Copies src/icons/ to dist/icons/ during build with CSS url() rewriting.
Watches src/icons/ for changes during dev and triggers full page reload."
```

---

### Task 4: Create CLI Icons Command

**Files:**
- Create: `packages/cli/src/commands/icons.ts`
- Modify: `packages/cli/src/index.ts` (register new commands)

**Reference files:**
- `packages/cli/src/commands/component.ts` — similar command pattern
- `packages/cli/src/commands/design-system.ts` — similar setup command
- `packages/cli/src/utils/filesystem.ts` — file helpers
- `packages/cli/src/index.ts` — command registration pattern

**Step 1: Create `packages/cli/src/commands/icons.ts`**

```typescript
/**
 * Icons setup and management commands
 */
import path from 'path'
import chalk from 'chalk'
import { createFileWithSpinner, ensureDir } from '../utils/filesystem'

interface IconsSetupOptions {
  zip?: string
}

/**
 * stratawp icons:setup — Set up icon font directory and optionally import a ZIP
 */
export async function iconsSetupCommand(options: IconsSetupOptions): Promise<void> {
  console.log(chalk.cyan('\n🎨 Setting up StrataWP Icons\n'))

  const fs = await import('fs-extra')
  const cwd = process.cwd()
  const iconsDir = path.join(cwd, 'src', 'icons')
  const fontsDir = path.join(iconsDir, 'fonts')

  // Create directories
  await ensureDir(iconsDir)
  await ensureDir(fontsDir)

  if (options.zip) {
    // Import from ZIP file
    await importIconZip(options.zip, iconsDir)
  } else {
    // Create README placeholder
    const readmePath = path.join(iconsDir, 'README.md')
    if (!(await fs.pathExists(readmePath))) {
      await createFileWithSpinner(
        readmePath,
        getIconsReadme(),
        'Creating icons README'
      )
    }
  }

  // Check if Icons component is registered in functions.php
  const functionsPath = path.join(cwd, 'functions.php')
  if (await fs.pathExists(functionsPath)) {
    const content = await fs.readFile(functionsPath, 'utf8')
    if (!content.includes('Icons()')) {
      console.log(chalk.yellow('\n  ⚠ Icons component not found in functions.php'))
      console.log(chalk.dim('  Add to your Theme constructor:'))
      console.log(chalk.dim('    new \\StrataWP\\Components\\Icons(),\n'))
    }
  }

  // List available icons if CSS exists
  const cssPath = path.join(iconsDir, 'flaticon.css')
  if (await fs.pathExists(cssPath)) {
    const icons = await parseIconNames(cssPath)
    console.log(chalk.green(`\n✓ Found ${icons.length} icons\n`))
    if (icons.length > 0 && icons.length <= 30) {
      icons.forEach(name => console.log(chalk.dim(`  flaticon-${name}`)))
    } else if (icons.length > 30) {
      icons.slice(0, 20).forEach(name => console.log(chalk.dim(`  flaticon-${name}`)))
      console.log(chalk.dim(`  ... and ${icons.length - 20} more`))
    }
  }

  console.log(chalk.green('\n✓ Icons directory ready!\n'))
  console.log(chalk.cyan('  Usage in templates:'))
  console.log(chalk.dim('  <?php strata_basic()->template_tags()->icon(\'home\', [\'size\' => \'lg\']); ?>\n'))
}

/**
 * stratawp icons:update — Replace existing icon font with new ZIP
 */
export async function iconsUpdateCommand(options: { zip: string }): Promise<void> {
  console.log(chalk.cyan('\n🔄 Updating StrataWP Icons\n'))

  const fs = await import('fs-extra')
  const cwd = process.cwd()
  const iconsDir = path.join(cwd, 'src', 'icons')

  if (!(await fs.pathExists(iconsDir))) {
    console.error(chalk.red('✖ Icons directory not found. Run icons:setup first.'))
    process.exit(1)
  }

  if (!options.zip) {
    console.error(chalk.red('✖ --zip option is required'))
    process.exit(1)
  }

  // Clear existing font files
  const fontsDir = path.join(iconsDir, 'fonts')
  if (await fs.pathExists(fontsDir)) {
    await fs.emptyDir(fontsDir)
  }

  // Remove old CSS
  const oldCss = path.join(iconsDir, 'flaticon.css')
  if (await fs.pathExists(oldCss)) {
    await fs.remove(oldCss)
  }

  await importIconZip(options.zip, iconsDir)

  const cssPath = path.join(iconsDir, 'flaticon.css')
  if (await fs.pathExists(cssPath)) {
    const icons = await parseIconNames(cssPath)
    console.log(chalk.green(`\n✓ Updated! ${icons.length} icons available.\n`))
  }
}

/**
 * stratawp icons:list — List available icon names
 */
export async function iconsListCommand(): Promise<void> {
  const fs = await import('fs-extra')
  const cwd = process.cwd()
  const cssPath = path.join(cwd, 'src', 'icons', 'flaticon.css')

  if (!(await fs.pathExists(cssPath))) {
    // Try dist
    const distCssPath = path.join(cwd, 'dist', 'icons', 'flaticon.css')
    if (!(await fs.pathExists(distCssPath))) {
      console.error(chalk.red('✖ No icon CSS found. Run icons:setup first.'))
      process.exit(1)
    }
  }

  const icons = await parseIconNames(cssPath)

  if (icons.length === 0) {
    console.log(chalk.yellow('\n  No icons found in CSS file.\n'))
    return
  }

  console.log(chalk.cyan(`\n🎨 ${icons.length} icons available:\n`))
  icons.forEach(name => console.log(`  ${chalk.dim('flaticon-')}${name}`))
  console.log('')
}

/**
 * Import and extract a Flaticon ZIP to the icons directory
 */
async function importIconZip(zipPath: string, iconsDir: string): Promise<void> {
  const fs = await import('fs-extra')
  const { default: AdmZip } = await import('adm-zip')

  const resolvedZip = path.resolve(zipPath)

  if (!(await fs.pathExists(resolvedZip))) {
    console.error(chalk.red(`✖ ZIP file not found: ${resolvedZip}`))
    process.exit(1)
  }

  console.log(chalk.dim(`  Extracting ${path.basename(resolvedZip)}...`))

  const zip = new AdmZip(resolvedZip)
  const entries = zip.getEntries()
  const fontsDir = path.join(iconsDir, 'fonts')

  await ensureDir(fontsDir)

  for (const entry of entries) {
    const name = entry.entryName.split('/').pop() || ''

    if (name.endsWith('.css') && !entry.isDirectory) {
      // CSS file → iconsDir/flaticon.css
      const content = entry.getData().toString('utf8')
      await fs.writeFile(path.join(iconsDir, 'flaticon.css'), content)
      console.log(chalk.dim(`  ✓ flaticon.css`))
    } else if (/\.(woff2?|ttf|eot|svg)$/i.test(name) && !entry.isDirectory) {
      // Font files → iconsDir/fonts/
      await fs.writeFile(path.join(fontsDir, name), entry.getData())
      console.log(chalk.dim(`  ✓ fonts/${name}`))
    }
  }
}

/**
 * Parse icon names from a CSS file
 */
async function parseIconNames(cssPath: string): Promise<string[]> {
  const fs = await import('fs-extra')

  if (!(await fs.pathExists(cssPath))) {
    return []
  }

  const content = await fs.readFile(cssPath, 'utf8')
  const matches = content.matchAll(/\.flaticon-([a-z0-9_-]+)\s*[:{]/g)
  const names = [...new Set([...matches].map(m => m[1]))]
  names.sort()
  return names
}

/**
 * Get README content for the icons directory
 */
function getIconsReadme(): string {
  return `# StrataWP Icons

This directory holds your icon font files.

## How to add icons from Flaticon

1. Go to [flaticon.com](https://www.flaticon.com)
2. Browse icons and add them to a collection
3. Open your collection and click "Download collection"
4. Choose **Icon Font** format and download the ZIP
5. Run: \`stratawp icons:update --zip /path/to/download.zip\`

## Usage in templates

\`\`\`php
<?php strata_basic()->template_tags()->icon('home'); ?>
<?php strata_basic()->template_tags()->icon('home', ['size' => 'lg']); ?>
<?php strata_basic()->template_tags()->get_icon('arrow-right'); ?>
\`\`\`

## Available sizes

- \`sm\` — 0.875rem
- \`md\` — 1.25rem
- \`lg\` — 1.75rem
- \`xl\` — 2.5rem

## File structure

\`\`\`
src/icons/
  flaticon.css       # Icon font stylesheet
  fonts/
    flaticon.woff2   # Primary font format
    flaticon.woff    # Fallback
    flaticon.ttf     # Fallback
\`\`\`
`
}
```

**Step 2: Register commands in `packages/cli/src/index.ts`**

Add import near the top (after other command imports, around line 9):
```typescript
import { iconsSetupCommand, iconsUpdateCommand, iconsListCommand } from './commands/icons'
```

Add commands before `program.parse()` (before line 308):
```typescript
// Icon font management
program
  .command('icons:setup')
  .description('Set up icon font directory (Flaticon)')
  .option('--zip <path>', 'Path to Flaticon icon font ZIP file')
  .action(iconsSetupCommand)

program
  .command('icons:update')
  .description('Update icon font from new ZIP file')
  .option('--zip <path>', 'Path to Flaticon icon font ZIP file')
  .action(iconsUpdateCommand)

program
  .command('icons:list')
  .description('List available icon names')
  .action(iconsListCommand)
```

**Step 3: Add adm-zip dependency (needed for ZIP extraction)**

```bash
cd /Users/jon.imms/Local\ Sites/stratawp/strataWP
pnpm add -D adm-zip @types/adm-zip --filter @stratawp/cli
```

**Step 4: Commit**

```bash
git add packages/cli/src/commands/icons.ts packages/cli/src/index.ts packages/cli/package.json pnpm-lock.yaml
git commit -m "feat(cli): add icons:setup, icons:update, icons:list commands

Interactive setup for Flaticon icon fonts. Extracts ZIP to src/icons/,
parses CSS for available icon names, and provides usage guidance."
```

---

### Task 5: Add Icons README to Example Theme

**Files:**
- Create: `examples/basic-theme/src/icons/README.md`

**Step 1: Create the placeholder directory and README**

```bash
mkdir -p /Users/jon.imms/Local\ Sites/stratawp/strataWP/examples/basic-theme/src/icons/fonts
```

Create `examples/basic-theme/src/icons/README.md` with the same content as the `getIconsReadme()` function in the CLI (but with `strata_basic()` theme accessor).

**Step 2: Commit**

```bash
git add examples/basic-theme/src/icons/
git commit -m "feat(basic-theme): add icons directory placeholder with setup instructions"
```

---

### Task 6: Build and Verify

**Step 1: Build the CLI package**

```bash
cd /Users/jon.imms/Local\ Sites/stratawp/strataWP
pnpm build --filter @stratawp/cli
```

Expected: Build succeeds with no errors.

**Step 2: Build the Vite plugin**

```bash
pnpm build --filter @stratawp/vite-plugin
```

Expected: Build succeeds with no errors.

**Step 3: Verify CLI commands register**

```bash
cd packages/cli && node dist/index.js --help
```

Expected: `icons:setup`, `icons:update`, `icons:list` appear in the help output.

**Step 4: Commit any build artifacts if needed, then final commit**

```bash
git add -A
git status
# Only commit if there are meaningful changes (not node_modules or dist)
git commit -m "chore: build verification for icons integration"
```

---

### Task 7: Manual Integration Test (Optional)

This task verifies the full workflow in a running WordPress instance.

**Step 1: Download a test icon font from Flaticon**
- Go to flaticon.com, pick 5-10 icons, download as icon font ZIP

**Step 2: Run the setup command**
```bash
cd /path/to/test-theme
stratawp icons:setup --zip ~/Downloads/flaticon-font.zip
```

**Step 3: Verify icons render in WordPress**
- Add `<?php strata_basic()->template_tags()->icon('home', ['size' => 'lg']); ?>` to a template
- Visit the page and confirm the icon renders correctly

**Step 4: Run `stratawp icons:list`**
- Confirm all imported icons are listed
