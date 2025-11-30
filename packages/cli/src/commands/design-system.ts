/**
 * Design system setup command
 */
import path from 'path'
import chalk from 'chalk'
import ora from 'ora'
import { execa } from 'execa'
import {createFileWithSpinner, readFile, writeFile, readJson, writeJson } from '../utils/filesystem'

type Framework = 'tailwind' | 'unocss'

export async function designSystemCommand(framework: Framework): Promise<void> {
  console.log(chalk.cyan('\n⚒️  Setting up Design System\n'))

  if (framework !== 'tailwind' && framework !== 'unocss') {
    console.error(chalk.red('✖ Invalid framework. Choose: tailwind or unocss'))
    process.exit(1)
  }

  const cwd = process.cwd()
  const packageManager = await detectPackageManager()

  // Step 1: Install dependencies
  await installDependencies(framework, packageManager)

  // Step 2: Create config file
  await createConfigFile(framework, cwd)

  // Step 3: Update vite.config.ts
  await updateViteConfig(framework, cwd)

  // Step 4: Create CSS entry file
  await createCSSEntry(framework, cwd)

  // Success message
  console.log(chalk.green('\n✓ Design system setup complete!\n'))
  console.log(chalk.cyan('  Next steps:'))
  console.log(chalk.dim(`  1. Import the CSS in your main JS file:`))
  console.log(chalk.dim(`     import '../css/design-system.css'`))
  console.log(chalk.dim(`  2. Start using utility classes in your blocks`))
  console.log(chalk.dim(`  3. Customize ${framework === 'tailwind' ? 'tailwind' : 'uno'}.config.${framework === 'tailwind' ? 'js' : 'ts'} as needed\n`))
}

async function detectPackageManager(): Promise<'npm' | 'pnpm' | 'yarn'> {
  const fs = await import('fs-extra')
  const cwd = process.cwd()

  if (await fs.pathExists(path.join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm'
  }
  if (await fs.pathExists(path.join(cwd, 'yarn.lock'))) {
    return 'yarn'
  }
  return 'npm'
}

async function installDependencies(framework: Framework, pm: string): Promise<void> {
  const spinner = ora('Installing dependencies...').start()

  try {
    const packages = framework === 'tailwind'
      ? ['tailwindcss', 'postcss', 'autoprefixer']
      : ['@unocss/vite', 'unocss']

    const installCmd = pm === 'yarn' ? 'add' : 'install'
    const devFlag = pm === 'yarn' ? '--dev' : '--save-dev'

    await execa(pm, [installCmd, devFlag, ...packages], {
      cwd: process.cwd(),
      stdio: 'pipe',
    })

    spinner.succeed(chalk.green('Dependencies installed'))
  } catch (error) {
    spinner.fail('Failed to install dependencies')
    console.error(error)
    process.exit(1)
  }
}

async function createConfigFile(framework: Framework, cwd: string): Promise<void> {
  if (framework === 'tailwind') {
    const configContent = `import { wpForgeTailwindPreset } from '@wp-forge/vite-plugin/integrations/tailwind-preset'

export default {
  presets: [wpForgeTailwindPreset],
  theme: {
    extend: {
      // Add your custom theme extensions here
    },
  },
}
`
    await createFileWithSpinner(
      path.join(cwd, 'tailwind.config.js'),
      configContent,
      'Creating tailwind.config.js'
    )
  } else {
    const configContent = `import { defineConfig, presetUno } from 'unocss'
import { wpForgeUnoPreset } from '@wp-forge/vite-plugin/integrations/unocss-preset'

export default defineConfig({
  presets: [
    presetUno(),
    wpForgeUnoPreset,
  ],
  theme: {
    // Add your custom theme here
  },
})
`
    await createFileWithSpinner(
      path.join(cwd, 'uno.config.ts'),
      configContent,
      'Creating uno.config.ts'
    )
  }
}

async function updateViteConfig(framework: Framework, cwd: string): Promise<void> {
  const spinner = ora('Updating vite.config.ts...').start()
  const viteConfigPath = path.join(cwd, 'vite.config.ts')

  try {
    let config = await readFile(viteConfigPath)

    // Add UnoCSS import if needed
    if (framework === 'unocss' && !config.includes('unocss/vite')) {
      config = `import UnoCSS from '@unocss/vite'\n${config}`
    }

    // Update wpForge options
    if (config.includes('wpForge({')) {
      const designSystemConfig = `
      designSystem: {
        enabled: true,
        framework: '${framework}',
        wordpressPresets: true,
      },`

      // Insert before closing brace of wpForge options
      config = config.replace(/(\s+}[\s\n]*\)[\s\n]*,?[\s\n]*plugins:)/, `${designSystemConfig}$1`)

      // Add UnoCSS to plugins array if needed
      if (framework === 'unocss' && !config.includes('UnoCSS()')) {
        config = config.replace(/(plugins:\s*\[)/, '$1\n    UnoCSS(),')
      }
    }

    await writeFile(viteConfigPath, config)
    spinner.succeed(chalk.green('Updated vite.config.ts'))
  } catch (error) {
    spinner.fail('Failed to update vite.config.ts')
    console.warn(chalk.yellow('  Please manually update your vite.config.ts'))
  }
}

async function createCSSEntry(framework: Framework, cwd: string): Promise<void> {
  const cssDir = path.join(cwd, 'src', 'css')
  const cssPath = path.join(cssDir, 'design-system.css')

  let content: string

  if (framework === 'tailwind') {
    content = `/**
 * Tailwind CSS Entry
 */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom component styles */
@layer components {
  .btn {
    @apply px-4 py-2 rounded bg-wp-primary text-white hover:bg-wp-secondary transition;
  }
}
`
  } else {
    content = `/**
 * UnoCSS Entry
 *
 * UnoCSS generates styles on-demand, so this file mainly contains
 * custom CSS that isn't covered by utility classes.
 */

/* Custom component styles */
.btn {
  padding: 1rem 1.5rem;
  border-radius: 0.25rem;
  background-color: var(--wp--preset--color--primary);
  color: white;
  transition: background-color 0.2s;
}

.btn:hover {
  background-color: var(--wp--preset--color--secondary);
}
`
  }

  await createFileWithSpinner(cssPath, content, 'Creating design-system.css')
}
