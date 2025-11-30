import prompts from 'prompts'
import chalk from 'chalk'
import ora from 'ora'
import { execa } from 'execa'
import fs from 'fs-extra'
import path from 'path'
import validatePackageName from 'validate-npm-package-name'

interface ThemeConfig {
  name: string
  slug: string
  description: string
  author: string
  cssFramework: 'vanilla' | 'tailwind' | 'unocss' | 'panda'
  typescript: boolean
  testing: boolean
  ai: boolean
}

async function main() {
  console.log(chalk.bold.cyan('\n⚒️  Create WP-Forge Theme\n'))

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
      initial: 'A theme built with WP-Forge',
    },
    {
      type: 'text',
      name: 'author',
      message: 'Author name:',
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

    // Create directory
    await fs.ensureDir(themePath)
    spinner.text = 'Copying template files...'

    // TODO: Copy template files based on config
    // For now, create basic structure
    await createBasicStructure(themePath, config)

    spinner.text = 'Installing dependencies...'

    // Install dependencies
    await execa('pnpm', ['install'], { cwd: themePath })

    spinner.succeed(chalk.green('Theme created successfully!'))

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
      '@wp-forge/cli': '^0.2.0',
      '@wp-forge/vite-plugin': '^0.2.0',
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

Built with ⚒️ WP-Forge
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

Built with [WP-Forge](https://github.com/JonImmsWordpressDev/WP-Forge)
`

  await fs.writeFile(path.join(themePath, 'README.md'), readme)

  // Create vite.config.ts
  const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { wpForge } from '@wp-forge/vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    wpForge({
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
}

main().catch((error) => {
  console.error(chalk.red('Error:'), error)
  process.exit(1)
})
