/**
 * Registry Publish Command
 * Publish a component to the registry
 */

import chalk from 'chalk'
import ora from 'ora'
import prompts from 'prompts'
import fs from 'fs-extra'
import path from 'path'
import { execa } from 'execa'
import type { PublishOptions, ComponentMetadata } from '../types'

export async function publishCommand(options: PublishOptions = {}) {
  console.log(chalk.cyan('\n📤 Publish Component to Registry\n'))

  try {
    // Check if package.json exists
    const packageJsonPath = path.join(process.cwd(), 'package.json')

    if (!(await fs.pathExists(packageJsonPath))) {
      throw new Error('package.json not found in current directory')
    }

    // Read package.json
    const packageJson = await fs.readJSON(packageJsonPath)

    // Validate component metadata
    if (!packageJson.stratawp) {
      console.log(chalk.yellow('⚠️  No StrataWP metadata found in package.json'))
      console.log(chalk.dim('Adding stratawp metadata section...'))

      const metadata = await promptForMetadata(packageJson)
      packageJson.stratawp = metadata

      await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 })
      console.log(chalk.green('✓ Updated package.json with metadata\n'))
    }

    // Display component info
    const metadata: ComponentMetadata = packageJson.stratawp
    console.log(chalk.bold('Component Details:'))
    console.log(chalk.dim('  Name:'), chalk.white(packageJson.name))
    console.log(chalk.dim('  Version:'), chalk.white(packageJson.version))
    console.log(chalk.dim('  Type:'), chalk.blue(metadata.type))
    console.log(chalk.dim('  Description:'), chalk.white(packageJson.description || 'None'))
    console.log()

    // Confirm publication
    if (!options.dryRun) {
      const { confirm } = await prompts({
        type: 'confirm',
        name: 'confirm',
        message: 'Ready to publish?',
        initial: true,
      })

      if (!confirm) {
        console.log(chalk.yellow('\n✖ Publication cancelled\n'))
        return
      }
    }

    // Run pre-publish checks
    const spinner = ora('Running pre-publish checks...').start()

    // Check if npm/pnpm is installed
    let packageManager = 'npm'
    try {
      await execa('pnpm', ['--version'])
      packageManager = 'pnpm'
    } catch {
      // Use npm
    }

    // Check if logged in to npm
    try {
      await execa(packageManager, ['whoami'])
    } catch {
      spinner.fail('Not logged in to npm')
      console.log(chalk.yellow('\nPlease log in to npm first:'))
      console.log(chalk.cyan(`  ${packageManager} login`))
      return
    }

    spinner.text = 'Building package...'

    // Run build if script exists
    if (packageJson.scripts?.build) {
      await execa(packageManager, ['run', 'build'])
    }

    // Publish to npm
    if (options.dryRun) {
      spinner.text = 'Running dry-run...'
      const { stdout } = await execa(packageManager, [
        'publish',
        '--dry-run',
        '--access',
        options.access || 'public',
      ])
      spinner.succeed('Dry-run complete')
      console.log(chalk.dim(stdout))
    } else {
      spinner.text = 'Publishing to registry...'

      const publishArgs = [
        'publish',
        '--access',
        options.access || 'public',
      ]

      if (options.tag) {
        publishArgs.push('--tag', options.tag)
      }

      await execa(packageManager, publishArgs)
      spinner.succeed('Component published successfully!')
    }

    console.log(chalk.green('\n✓ Publication complete!\n'))

    if (!options.dryRun) {
      console.log(chalk.white('Your component is now available:'))
      console.log(chalk.cyan(`  stratawp registry:install ${packageJson.name}\n`))
    }
  } catch (error) {
    console.error(chalk.red('\n✖ Publication failed'))
    console.error(chalk.red(error instanceof Error ? error.message : String(error)))
    process.exit(1)
  }
}

async function promptForMetadata(packageJson: any): Promise<ComponentMetadata> {
  const response = await prompts([
    {
      type: 'select',
      name: 'type',
      message: 'Component type:',
      choices: [
        { title: 'Block', value: 'block' },
        { title: 'Component', value: 'component' },
        { title: 'Pattern', value: 'pattern' },
        { title: 'Template', value: 'template' },
        { title: 'Template Part', value: 'part' },
        { title: 'Integration', value: 'integration' },
      ],
    },
    {
      type: 'text',
      name: 'category',
      message: 'Category (e.g., layout, content, design):',
    },
    {
      type: 'text',
      name: 'wpRequires',
      message: 'Minimum WordPress version (e.g., 6.0):',
      initial: '6.0',
    },
    {
      type: 'text',
      name: 'phpRequires',
      message: 'Minimum PHP version (e.g., 8.0):',
      initial: '8.0',
    },
  ])

  return {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description || '',
    type: response.type,
    category: response.category,
    wordpress: {
      requires: response.wpRequires,
      requiresPHP: response.phpRequires,
    },
  }
}
