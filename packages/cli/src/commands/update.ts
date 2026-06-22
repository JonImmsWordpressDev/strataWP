/**
 * Update Command
 *
 * Check for and apply updates to @stratawp/* packages.
 */

import chalk from 'chalk'
import ora from 'ora'
import prompts from 'prompts'
import { execa } from 'execa'
import {
  checkPackageUpdates,
  type PackageVersion,
  type UpdateCheckResult,
} from '../utils/update-checker'

interface UpdateOptions {
  check?: boolean // --check: Only check, don't apply
  force?: boolean // --force: Skip confirmations
}

/**
 * Display a table of package versions
 */
function displayVersionTable(result: UpdateCheckResult): void {
  // Calculate column widths
  const nameWidth = Math.max('Package'.length, ...result.packages.map((p) => p.name.length))
  const currentWidth = Math.max('Current'.length, ...result.packages.map((p) => p.current.length))
  const latestWidth = Math.max('Latest'.length, ...result.packages.map((p) => p.latest.length))
  const statusWidth = 'Update available'.length

  // Print header
  console.log()
  console.log(
    chalk.bold(
      'Package'.padEnd(nameWidth) +
        '  ' +
        'Current'.padEnd(currentWidth) +
        '  ' +
        'Latest'.padEnd(latestWidth) +
        '  ' +
        'Status'
    )
  )
  console.log('-'.repeat(nameWidth + currentWidth + latestWidth + statusWidth + 8))

  // Print packages
  for (const pkg of result.packages) {
    const statusColor = pkg.hasUpdate ? chalk.yellow : chalk.green
    const status = pkg.hasUpdate ? 'Update available' : 'Up to date'

    console.log(
      pkg.name.padEnd(nameWidth) +
        '  ' +
        pkg.current.padEnd(currentWidth) +
        '  ' +
        (pkg.hasUpdate ? chalk.green(pkg.latest) : pkg.latest).padEnd(
          latestWidth + (pkg.hasUpdate ? 10 : 0)
        ) +
        '  ' +
        statusColor(status)
    )
  }
  console.log()
}

/**
 * Get packages that need updates
 */
function getUpdatablePackages(result: UpdateCheckResult): PackageVersion[] {
  return result.packages.filter((p) => p.hasUpdate)
}

/**
 * Run pnpm update for selected packages
 */
async function updatePackages(packages: string[]): Promise<boolean> {
  const spinner = ora('Updating packages...').start()

  try {
    // Build pnpm update command with package names
    await execa('pnpm', ['update', ...packages], {
      cwd: process.cwd(),
      stdio: 'pipe',
    })

    spinner.succeed(
      chalk.green(
        `Successfully updated ${packages.length} package${packages.length > 1 ? 's' : ''}.`
      )
    )
    return true
  } catch (error) {
    spinner.fail('Failed to update packages')
    if (error instanceof Error) {
      console.error(chalk.red(error.message))
    }
    return false
  }
}

/**
 * Main update command handler
 */
export async function updateCommand(options: UpdateOptions): Promise<void> {
  const spinner = ora('Checking for StrataWP updates...').start()

  try {
    const result = await checkPackageUpdates()

    if (result.packages.length === 0) {
      spinner.info('No @stratawp/* packages found in this project.')
      console.log(chalk.dim('\nMake sure you are in a StrataWP theme directory.'))
      return
    }

    spinner.stop()
    displayVersionTable(result)

    // If check-only mode, just show the summary and exit
    if (options.check) {
      if (result.hasUpdates) {
        console.log(
          chalk.cyan(
            `${result.updatesCount} update${result.updatesCount > 1 ? 's' : ''} available. Run \`stratawp update\` to apply.`
          )
        )
      } else {
        console.log(chalk.green('All packages are up to date.'))
      }
      return
    }

    // No updates available
    if (!result.hasUpdates) {
      console.log(chalk.green('All packages are up to date.'))
      return
    }

    const updatablePackages = getUpdatablePackages(result)

    // Force mode - update all packages without prompting
    if (options.force) {
      console.log(chalk.cyan('Updating all packages...'))
      const packageNames = updatablePackages.map((p) => p.name)
      await updatePackages(packageNames)
      return
    }

    // Interactive mode - let user select packages
    console.log(chalk.cyan('Updates available:\n'))
    for (const pkg of updatablePackages) {
      console.log(`  ${chalk.bold(pkg.name)}: ${pkg.current} -> ${chalk.green(pkg.latest)}`)
    }
    console.log()

    const { selectedPackages } = await prompts({
      type: 'multiselect',
      name: 'selectedPackages',
      message: 'Select packages to update',
      choices: updatablePackages.map((pkg) => ({
        title: `${pkg.name} (${pkg.current} -> ${pkg.latest})`,
        value: pkg.name,
        selected: true,
      })),
      hint: '- Space to toggle, Enter to submit',
    })

    if (!selectedPackages || selectedPackages.length === 0) {
      console.log(chalk.yellow('\nNo packages selected. Update cancelled.'))
      return
    }

    await updatePackages(selectedPackages)
  } catch (error) {
    spinner.fail('Failed to check for updates')
    if (error instanceof Error) {
      console.error(chalk.red(error.message))
    }
  }
}
