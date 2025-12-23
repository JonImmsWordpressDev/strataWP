import prompts from 'prompts'
import chalk from 'chalk'
import ora from 'ora'
import { execa } from 'execa'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import validatePackageName from 'validate-npm-package-name'

interface ThemeConfig {
  name: string
  slug: string
  description: string
  author: string
  template: 'basic' | 'advanced' | 'store' | 'minimal'
  cssFramework: 'vanilla' | 'tailwind' | 'unocss' | 'panda'
  typescript: boolean
  testing: boolean
  ai: boolean
}

async function main() {
  console.log(chalk.bold.cyan('\n⚡ Create StrataWP Theme\n'))

  const response = await prompts([
    {
      type: 'text',
      name: 'name',
      message: 'Theme name:',
      initial: 'My Awesome Theme',
    },
    {
      type: 'text',
      name: 'slug',
      message: 'Theme slug (directory name):',
      initial: (prev: string) => prev.toLowerCase().replace(/\s+/g, '-'),
      validate: (value: string) => {
        const validation = validatePackageName(value)
        if (!validation.validForNewPackages) {
          return validation.errors?.[0] || 'Invalid package name'
        }
        return true
      },
    },
    {
      type: 'text',
      name: 'description',
      message: 'Description:',
      initial: 'A theme built with StrataWP',
    },
    {
      type: 'text',
      name: 'author',
      message: 'Author name:',
    },
    {
      type: 'select',
      name: 'template',
      message: 'Choose a starting template:',
      choices: [
        {
          title: 'Basic Theme (Recommended)',
          description: 'Simple starter with essential blocks and clean structure',
          value: 'basic'
        },
        {
          title: 'Advanced Theme',
          description: 'Portfolio features, team members, advanced blocks',
          value: 'advanced'
        },
        {
          title: 'Store Theme',
          description: 'WooCommerce ready with product features',
          value: 'store'
        },
        {
          title: 'Minimal',
          description: 'Start from scratch with minimal setup',
          value: 'minimal'
        },
      ],
      initial: 0,
    },
    {
      type: 'select',
      name: 'cssFramework',
      message: 'CSS Framework:',
      choices: [
        { title: 'Vanilla CSS (Custom Properties)', value: 'vanilla' },
        { title: 'Tailwind CSS', value: 'tailwind' },
        { title: 'UnoCSS (Recommended)', value: 'unocss' },
        { title: 'Panda CSS (Type-safe)', value: 'panda' },
      ],
      initial: 2,
    },
    {
      type: 'confirm',
      name: 'typescript',
      message: 'Use TypeScript?',
      initial: true,
    },
    {
      type: 'confirm',
      name: 'testing',
      message: 'Include testing setup?',
      initial: true,
    },
    {
      type: 'confirm',
      name: 'ai',
      message: 'Enable AI-powered features?',
      initial: false,
    },
  ])

  if (!response.slug) {
    console.log(chalk.red('\n✖ Theme creation cancelled\n'))
    process.exit(1)
  }

  const config: ThemeConfig = response

  await createTheme(config)
}

async function createTheme(config: ThemeConfig) {
  const spinner = ora('Creating theme...').start()

  try {
    const themePath = path.resolve(process.cwd(), config.slug)

    // Check if directory exists
    if (await fs.pathExists(themePath)) {
      spinner.fail(`Directory ${config.slug} already exists`)
      process.exit(1)
    }

    if (config.template === 'minimal') {
      // Create minimal structure from scratch
      await fs.ensureDir(themePath)
      spinner.text = 'Creating basic structure...'
      await createBasicStructure(themePath, config)
    } else {
      // Use degit to clone example theme from GitHub
      spinner.text = `Downloading ${config.template} theme template...`

      // @ts-ignore - degit doesn't have TypeScript types
      const degit = (await import('degit')).default
      const templateMap = {
        basic: 'JonImmsWordpressDev/StrataWP/examples/basic-theme#main',
        advanced: 'JonImmsWordpressDev/StrataWP/examples/advanced-theme#main',
        store: 'JonImmsWordpressDev/StrataWP/examples/store-theme#main',
      }

      const emitter = degit(templateMap[config.template], {
        cache: false,
        force: true,
      })

      await emitter.clone(themePath)

      spinner.text = 'Customizing theme...'
      await customizeTheme(themePath, config)
    }

    spinner.text = 'Installing dependencies...'

    // Install dependencies
    await execa('pnpm', ['install'], { cwd: themePath })

    spinner.succeed(chalk.green('Theme created successfully!'))

    // Offer to link to WordPress
    await offerWordPressLinking(themePath, config.slug)

    console.log(chalk.cyan('\n📦 Next steps:\n'))
    console.log(`  cd ${config.slug}`)
    console.log('  pnpm dev')
    console.log()
  } catch (error) {
    spinner.fail('Failed to create theme')
    console.error(error)
    process.exit(1)
  }
}

async function customizeTheme(themePath: string, config: ThemeConfig) {
  // Update style.css with user's theme info
  const styleCssPath = path.join(themePath, 'style.css')
  if (await fs.pathExists(styleCssPath)) {
    let styleContent = await fs.readFile(styleCssPath, 'utf-8')

    // Replace theme metadata
    styleContent = styleContent
      .replace(/Theme Name:.*$/m, `Theme Name: ${config.name}`)
      .replace(/Description:.*$/m, `Description: ${config.description}`)
      .replace(/Author:.*$/m, `Author: ${config.author}`)
      .replace(/Text Domain:.*$/m, `Text Domain: ${config.slug}`)

    await fs.writeFile(styleCssPath, styleContent)
  }

  // Update package.json with user's info
  const packageJsonPath = path.join(themePath, 'package.json')
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath)
    packageJson.name = config.slug
    packageJson.description = config.description
    packageJson.author = config.author
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 })
  }

  // Update README.md
  const readmePath = path.join(themePath, 'README.md')
  if (await fs.pathExists(readmePath)) {
    let readmeContent = await fs.readFile(readmePath, 'utf-8')
    // Replace the first heading with the new theme name
    readmeContent = readmeContent.replace(/^#\s+.*$/m, `# ${config.name}`)
    await fs.writeFile(readmePath, readmeContent)
  }

  // Update vite.config.ts namespace if it exists
  const viteConfigPath = path.join(themePath, 'vite.config.ts')
  if (await fs.pathExists(viteConfigPath)) {
    let viteConfig = await fs.readFile(viteConfigPath, 'utf-8')
    viteConfig = viteConfig.replace(/namespace:\s*['"][\w-]+['"]/, `namespace: '${config.slug}'`)
    await fs.writeFile(viteConfigPath, viteConfig)
  }
}

async function offerWordPressLinking(themePath: string, slug: string) {
  console.log()
  const { shouldLink } = await prompts({
    type: 'confirm',
    name: 'shouldLink',
    message: 'Would you like to link this theme to a WordPress installation?',
    initial: true,
  })

  if (!shouldLink) {
    return
  }

  const wordpressSites = await detectWordPressSites()

  if (wordpressSites.length === 0) {
    console.log(chalk.yellow('\n⚠️  No WordPress installations detected automatically.'))
    console.log(chalk.dim('You can manually create a symlink later:\n'))
    console.log(chalk.dim(`  ln -s "${themePath}" /path/to/wordpress/wp-content/themes/${slug}\n`))
    return
  }

  const { selectedSite } = await prompts({
    type: 'select',
    name: 'selectedSite',
    message: 'Select WordPress installation:',
    choices: wordpressSites.map((site) => ({
      title: `${site.name} (${site.type})`,
      description: site.path,
      value: site,
    })),
  })

  if (!selectedSite) {
    return
  }

  try {
    const targetPath = path.join(selectedSite.path, 'wp-content', 'themes', slug)

    // Check if target already exists
    if (await fs.pathExists(targetPath)) {
      console.log(chalk.yellow(`\n⚠️  Theme already exists at ${targetPath}`))
      return
    }

    // Create symlink
    await fs.ensureSymlink(themePath, targetPath)
    console.log(chalk.green(`\n✓ Linked theme to ${selectedSite.name}`))
    console.log(chalk.dim(`  ${targetPath}`))
  } catch (error) {
    console.log(chalk.red('\n✖ Failed to create symlink'))
    console.log(chalk.dim('You can manually create it:\n'))
    console.log(chalk.dim(`  ln -s "${themePath}" ${path.join(selectedSite.path, 'wp-content', 'themes', slug)}\n`))
  }
}

interface WordPressSite {
  name: string
  path: string
  type: 'Local by Flywheel' | 'MAMP' | 'Custom'
}

async function detectWordPressSites(): Promise<WordPressSite[]> {
  const sites: WordPressSite[] = []
  const homeDir = os.homedir()

  // Detect Local by Flywheel sites
  const localSitesPath = path.join(homeDir, 'Local Sites')
  if (await fs.pathExists(localSitesPath)) {
    try {
      const localDirs = await fs.readdir(localSitesPath)
      for (const dir of localDirs) {
        const sitePath = path.join(localSitesPath, dir, 'app', 'public')
        const wpConfigPath = path.join(sitePath, 'wp-config.php')
        if (await fs.pathExists(wpConfigPath)) {
          sites.push({
            name: dir,
            path: sitePath,
            type: 'Local by Flywheel',
          })
        }
      }
    } catch (error) {
      // Ignore errors
    }
  }

  // Detect MAMP sites (macOS)
  if (process.platform === 'darwin') {
    const mampPath = '/Applications/MAMP/htdocs'
    if (await fs.pathExists(mampPath)) {
      try {
        const mampDirs = await fs.readdir(mampPath)
        for (const dir of mampDirs) {
          const sitePath = path.join(mampPath, dir)
          const wpConfigPath = path.join(sitePath, 'wp-config.php')
          if (await fs.pathExists(wpConfigPath)) {
            sites.push({
              name: dir,
              path: sitePath,
              type: 'MAMP',
            })
          }
        }
      } catch (error) {
        // Ignore errors
      }
    }
  }

  // Could add more detection methods here:
  // - XAMPP
  // - Docker containers
  // - Custom paths from config file

  return sites
}

async function createBasicStructure(themePath: string, config: ThemeConfig) {
  // Create package.json
  const packageJson = {
    name: config.slug,
    version: '1.0.0',
    description: config.description,
    author: config.author,
    license: 'GPL-3.0-or-later',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      '@wordpress/block-editor': '^12.19.0',
      '@wordpress/blocks': '^12.28.0',
      '@wordpress/components': '^27.0.0',
      '@wordpress/element': '^5.28.0',
      '@wordpress/i18n': '^4.51.0',
    },
    devDependencies: {
      '@stratawp/cli': '^0.2.0',
      '@stratawp/vite-plugin': '^0.2.0',
      '@vitejs/plugin-react': '^4.2.1',
      vite: '^5.0.10',
      typescript: config.typescript ? '^5.3.3' : undefined,
    },
  }

  await fs.writeJson(path.join(themePath, 'package.json'), packageJson, { spaces: 2 })

  // Create style.css
  const styleCSS = `/*
Theme Name: ${config.name}
Theme URI: https://example.com
Author: ${config.author}
Description: ${config.description}
Version: 1.0.0
License: GPL-3.0-or-later
Text Domain: ${config.slug}

Built with ⚡ StrataWP
*/`

  await fs.writeFile(path.join(themePath, 'style.css'), styleCSS)

  // Create README
  const readme = `# ${config.name}

${config.description}

## Development

\`\`\`bash
pnpm dev
\`\`\`

## Build

\`\`\`bash
pnpm build
\`\`\`

Built with [StrataWP](https://github.com/JonImmsWordpressDev/StrataWP)
`

  await fs.writeFile(path.join(themePath, 'README.md'), readme)

  // Create vite.config.ts
  const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { strataWP } from '@stratawp/vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    strataWP({
      blocks: {
        dir: 'src/blocks',
        autoRegister: true,
        namespace: '${config.slug}',
      },
      ${config.cssFramework !== 'vanilla' ? `designSystem: {
        enabled: true,
        framework: '${config.cssFramework === 'unocss' ? 'unocss' : config.cssFramework === 'tailwind' ? 'tailwind' : 'none'}',
        wordpressPresets: true,
      },` : ''}
      performance: {
        criticalCSS: { enabled: true },
        lazyLoading: { enabled: true },
        preload: { enabled: true },
      },
      phpHmr: {
        enabled: true,
        watch: ['**/*.php', 'theme.json', 'templates/**/*'],
      },
      manifest: {
        enabled: true,
        wordpress: true,
      },
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: './src/js/main.ts',
        editor: './src/js/editor.ts',
      },
    },
  },
})`

  await fs.writeFile(path.join(themePath, 'vite.config.ts'), viteConfig)

  // Create functions.php
  const functionsPhp = `<?php
/**
 * Theme functions
 */

if (!defined('ABSPATH')) {
    exit;
}

// Load Vite assets
require_once get_template_directory() . '/inc/vite-assets.php';
`

  await fs.writeFile(path.join(themePath, 'functions.php'), functionsPhp)

  // Create theme.json
  const themeJson = {
    $schema: 'https://schemas.wp.org/trunk/theme.json',
    version: 2,
    settings: {
      appearanceTools: true,
      layout: {
        contentSize: '800px',
        wideSize: '1200px',
      },
    },
  }

  await fs.writeJson(path.join(themePath, 'theme.json'), themeJson, { spaces: 2 })

  // Create basic directories
  await fs.ensureDir(path.join(themePath, 'src'))
  await fs.ensureDir(path.join(themePath, 'src/css'))
  await fs.ensureDir(path.join(themePath, 'src/js'))
  await fs.ensureDir(path.join(themePath, 'src/blocks'))
  await fs.ensureDir(path.join(themePath, 'inc'))
  await fs.ensureDir(path.join(themePath, 'templates'))
  await fs.ensureDir(path.join(themePath, 'parts'))

  // Create main.ts
  await fs.writeFile(
    path.join(themePath, 'src/js/main.ts'),
    `import '../css/main.css'\n\nconsole.log('${config.name} loaded')\n`
  )

  // Create editor.ts
  await fs.writeFile(
    path.join(themePath, 'src/js/editor.ts'),
    `import '../css/editor.css'\n`
  )

  // Create main.css
  await fs.writeFile(
    path.join(themePath, 'src/css/main.css'),
    `/* Main stylesheet for ${config.name} */\n\nbody {\n  font-family: system-ui, sans-serif;\n}\n`
  )

  // Create editor.css
  await fs.writeFile(
    path.join(themePath, 'src/css/editor.css'),
    `/* Editor stylesheet */\n`
  )

  // Create vite-assets.php helper
  const viteAssetsPhp = `<?php
/**
 * Vite asset loading helper
 */

function load_vite_assets() {
    $manifest_path = get_template_directory() . '/dist/.vite/manifest.json';

    if (!file_exists($manifest_path)) {
        return;
    }

    $manifest = json_decode(file_get_contents($manifest_path), true);

    if (isset($manifest['src/js/main.ts'])) {
        wp_enqueue_script(
            '${config.slug}-main',
            get_template_directory_uri() . '/dist/' . $manifest['src/js/main.ts']['file'],
            [],
            null,
            true
        );

        if (isset($manifest['src/js/main.ts']['css'])) {
            foreach ($manifest['src/js/main.ts']['css'] as $css) {
                wp_enqueue_style(
                    '${config.slug}-main-css',
                    get_template_directory_uri() . '/dist/' . $css,
                    [],
                    null
                );
            }
        }
    }
}

add_action('wp_enqueue_scripts', 'load_vite_assets');
`

  await fs.writeFile(path.join(themePath, 'inc/vite-assets.php'), viteAssetsPhp)

  // Create essential template files
  const indexTemplate = `<!-- wp:template-part {"slug":"header","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
    <!-- wp:query {"queryId":0,"query":{"perPage":10,"pages":0,"offset":0,"postType":"post","order":"desc","orderBy":"date","author":"","search":"","exclude":[],"sticky":"","inherit":true}} -->
    <div class="wp-block-query">
        <!-- wp:post-template -->
            <!-- wp:post-title {"isLink":true} /-->
            <!-- wp:post-date /-->
            <!-- wp:post-excerpt /-->
        <!-- /wp:post-template -->

        <!-- wp:query-pagination -->
            <!-- wp:query-pagination-previous /-->
            <!-- wp:query-pagination-numbers /-->
            <!-- wp:query-pagination-next /-->
        <!-- /wp:query-pagination -->

        <!-- wp:query-no-results -->
            <!-- wp:paragraph -->
            <p>No posts found.</p>
            <!-- /wp:paragraph -->
        <!-- /wp:query-no-results -->
    </div>
    <!-- /wp:query -->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->`

  await fs.writeFile(path.join(themePath, 'templates/index.html'), indexTemplate)

  // Create header template part
  const headerTemplate = `<!-- wp:group {"tagName":"header","style":{"spacing":{"padding":{"top":"2rem","bottom":"2rem"}}},"layout":{"type":"constrained"}} -->
<header class="wp-block-group" style="padding-top:2rem;padding-bottom:2rem">
    <!-- wp:group {"layout":{"type":"flex","flexWrap":"nowrap","justifyContent":"space-between"}} -->
    <div class="wp-block-group">
        <!-- wp:site-title /-->
        <!-- wp:navigation /-->
    </div>
    <!-- /wp:group -->
</header>
<!-- /wp:group -->`

  await fs.writeFile(path.join(themePath, 'parts/header.html'), headerTemplate)

  // Create footer template part
  const footerTemplate = `<!-- wp:group {"tagName":"footer","style":{"spacing":{"padding":{"top":"2rem","bottom":"2rem"}}},"layout":{"type":"constrained"}} -->
<footer class="wp-block-group" style="padding-top:2rem;padding-bottom:2rem">
    <!-- wp:group {"layout":{"type":"flex","flexWrap":"nowrap","justifyContent":"center"}} -->
    <div class="wp-block-group">
        <!-- wp:paragraph -->
        <p>Built with StrataWP</p>
        <!-- /wp:paragraph -->
    </div>
    <!-- /wp:group -->
</footer>
<!-- /wp:group -->`

  await fs.writeFile(path.join(themePath, 'parts/footer.html'), footerTemplate)

  // Create single post template
  const singleTemplate = `<!-- wp:template-part {"slug":"header","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
    <!-- wp:post-title /-->
    <!-- wp:post-featured-image /-->
    <!-- wp:post-content /-->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->`

  await fs.writeFile(path.join(themePath, 'templates/single.html'), singleTemplate)

  // Create page template
  const pageTemplate = `<!-- wp:template-part {"slug":"header","tagName":"header"} /-->

<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->
<main class="wp-block-group">
    <!-- wp:post-title /-->
    <!-- wp:post-content /-->
</main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->`

  await fs.writeFile(path.join(themePath, 'templates/page.html'), pageTemplate)
}

main().catch((error) => {
  console.error(chalk.red('Error:'), error)
  process.exit(1)
})
