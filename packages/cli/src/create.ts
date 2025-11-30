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
    scripts: {
      dev: 'wp-forge dev',
      build: 'wp-forge build',
      test: 'wp-forge test',
    },
    dependencies: {
      '@wp-forge/core': '^0.1.0',
    },
    devDependencies: {
      '@wp-forge/cli': '^0.1.0',
      '@wp-forge/vite-plugin': '^0.1.0',
      vite: '^5.0.0',
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

  // Create basic directories
  await fs.ensureDir(path.join(themePath, 'src'))
  await fs.ensureDir(path.join(themePath, 'src/css'))
  await fs.ensureDir(path.join(themePath, 'src/js'))
  await fs.ensureDir(path.join(themePath, 'src/blocks'))
  await fs.ensureDir(path.join(themePath, 'inc'))
  await fs.ensureDir(path.join(themePath, 'templates'))
  await fs.ensureDir(path.join(themePath, 'parts'))
}

main().catch((error) => {
  console.error(chalk.red('Error:'), error)
  process.exit(1)
})
