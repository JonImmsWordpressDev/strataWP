/**
 * Registry Install Command
 * Install a component from the registry
 */

import chalk from 'chalk'
import ora from 'ora'
import { ComponentInstaller } from '../utils/installer'
import { RegistryClient } from '../utils/registry-client'
import type { InstallOptions } from '../types'

export async function installCommand(
  packageName: string,
  options: InstallOptions = {}
) {
  console.log(chalk.cyan(`\n📦 Installing component: ${packageName}\n`))

  const spinner = ora('Fetching component info...').start()

  try {
    // Get component info first
    const client = new RegistryClient()
    const info = await client.getInfo(packageName)

    spinner.succeed(`Found: ${info.name} v${info.version}`)

    // Show component details
    console.log(chalk.dim(`  ${info.description}`))
    console.log(chalk.dim(`  Type: ${info.type}`))

    if (info.author) {
      console.log(chalk.dim(`  Author: ${info.author}`))
    }

    console.log()

    // Check WordPress requirements
    if (info.wordpress) {
      if (info.wordpress.requires) {
        console.log(chalk.yellow(`  ⚠️  Requires WordPress ${info.wordpress.requires}+`))
      }
      if (info.wordpress.requiresPHP) {
        console.log(chalk.yellow(`  ⚠️  Requires PHP ${info.wordpress.requiresPHP}+`))
      }
      console.log()
    }

    // Install the component
    spinner.start('Downloading and installing...')

    const installer = new ComponentInstaller()
    await installer.install(packageName, options)

    spinner.succeed('Component installed successfully!')

    console.log(chalk.green('\n✓ Installation complete!\n'))

    // Show next steps
    console.log(chalk.white('Next steps:'))

    switch (info.type) {
      case 'block':
        console.log(chalk.cyan('  1. The block has been added to src/blocks/'))
        console.log(chalk.cyan('  2. Vite will automatically discover and register it'))
        console.log(chalk.cyan('  3. Restart your dev server if it\'s running'))
        break

      case 'component':
        console.log(chalk.cyan('  1. The component has been added to inc/Components/'))
        console.log(chalk.cyan('  2. Register it in your functions.php:'))
        console.log(chalk.gray(`     $theme->register(new ${packageName.split('/').pop()}());`))
        break

      case 'pattern':
        console.log(chalk.cyan('  1. The pattern has been added to patterns/'))
        console.log(chalk.cyan('  2. It will be automatically available in the editor'))
        break

      case 'template':
        console.log(chalk.cyan('  1. The template has been added to templates/'))
        console.log(chalk.cyan('  2. It will be automatically available for selection'))
        break

      default:
        console.log(chalk.cyan('  Check the component README for usage instructions'))
    }

    console.log()
  } catch (error) {
    spinner.fail('Installation failed')
    console.error(chalk.red('\n✖ Error:'), error instanceof Error ? error.message : String(error))

    if (error instanceof Error && error.message.includes('not found')) {
      console.log(chalk.yellow('\nTip: Search for components with:'))
      console.log(chalk.cyan('  stratawp registry:search <query>'))
    }

    process.exit(1)
  }
}
