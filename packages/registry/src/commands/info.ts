/**
 * Registry Info Command
 * Get detailed information about a component
 */

import chalk from 'chalk'
import ora from 'ora'
import { RegistryClient } from '../utils/registry-client'

export async function infoCommand(packageName: string) {
  console.log(chalk.cyan(`\n📋 Component Information\n`))

  const spinner = ora('Fetching component details...').start()

  try {
    const client = new RegistryClient()
    const info = await client.getInfo(packageName)

    spinner.stop()

    // Header
    console.log(chalk.bold.white(info.name) + chalk.gray(` v${info.version}`))
    console.log(chalk.dim('─'.repeat(60)))

    // Description
    if (info.description) {
      console.log(chalk.white(`\n${info.description}\n`))
    }

    // Basic info
    console.log(chalk.bold('Type:'), chalk.blue(info.type))

    if (info.author) {
      console.log(chalk.bold('Author:'), chalk.white(info.author))
    }

    if (info.license) {
      console.log(chalk.bold('License:'), chalk.white(info.license))
    }

    // Links
    if (info.homepage || info.repository) {
      console.log(chalk.bold('\nLinks:'))
      if (info.homepage) {
        console.log(chalk.dim('  Homepage:'), chalk.cyan(info.homepage))
      }
      if (info.repository) {
        console.log(chalk.dim('  Repository:'), chalk.cyan(info.repository))
      }
    }

    // WordPress requirements
    if (info.wordpress) {
      console.log(chalk.bold('\nWordPress Requirements:'))
      if (info.wordpress.requires) {
        console.log(chalk.dim('  Requires:'), chalk.white(info.wordpress.requires + '+'))
      }
      if (info.wordpress.tested) {
        console.log(chalk.dim('  Tested up to:'), chalk.white(info.wordpress.tested))
      }
      if (info.wordpress.requiresPHP) {
        console.log(chalk.dim('  PHP:'), chalk.white(info.wordpress.requiresPHP + '+'))
      }
    }

    // Keywords/Tags
    if (info.keywords && info.keywords.length > 0) {
      console.log(chalk.bold('\nKeywords:'))
      const keywords = info.keywords
        .filter(k => k !== 'stratawp')
        .map(k => chalk.blue(`#${k}`))
        .join(' ')
      console.log(`  ${keywords}`)
    }

    // Dependencies
    if (info.dependencies && Object.keys(info.dependencies).length > 0) {
      console.log(chalk.bold('\nDependencies:'))
      for (const [dep, version] of Object.entries(info.dependencies)) {
        console.log(chalk.dim(`  ${dep}:`), chalk.white(version))
      }
    }

    // Versions
    if (info.versions && info.versions.length > 0) {
      const recentVersions = info.versions.slice(-5).reverse()
      console.log(chalk.bold('\nRecent Versions:'))
      for (const version of recentVersions) {
        const tag = version === info.version ? chalk.green(' (latest)') : ''
        console.log(chalk.dim(`  ${version}`) + tag)
      }

      if (info.versions.length > 5) {
        console.log(chalk.dim(`  ... and ${info.versions.length - 5} more`))
      }
    }

    // Stats
    console.log(chalk.bold('\nStats:'))
    console.log(chalk.dim('  Created:'), chalk.white(new Date(info.created).toLocaleDateString()))
    console.log(chalk.dim('  Last Modified:'), chalk.white(new Date(info.modified).toLocaleDateString()))

    // Installation command
    console.log(chalk.bold('\nInstall:'))
    console.log(chalk.cyan(`  stratawp registry:install ${packageName}`))

    // Install specific version
    if (info.versions && info.versions.length > 1) {
      const oldVersion = info.versions[info.versions.length - 2]
      console.log(chalk.dim(`  stratawp registry:install ${packageName}@${oldVersion}`))
    }

    console.log()
  } catch (error) {
    spinner.fail('Failed to fetch component info')
    console.error(chalk.red('\n✖ Error:'), error instanceof Error ? error.message : String(error))

    if (error instanceof Error && error.message.includes('not found')) {
      console.log(chalk.yellow('\nTip: Search for components with:'))
      console.log(chalk.cyan('  stratawp registry:search <query>'))
    }

    process.exit(1)
  }
}
