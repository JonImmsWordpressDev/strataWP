/**
 * Main Deployment Command
 * Orchestrates the deployment process
 */

import chalk from 'chalk'
import ora from 'ora'
import prompts from 'prompts'
import { execa } from 'execa'
import path from 'path'
import { DeployConfigManager } from '../../utils/deploy-config'
import { FileFilter } from '../../utils/file-filter'
import { ManifestManager } from '../../utils/manifest'
import { FTPDeployer } from '../../deployers/ftp'
import { SSHDeployer } from '../../deployers/ssh'
import type { BaseDeployer } from '../../deployers/base'
import { SnapshotManager, DatabaseDumper } from '@stratawp/sync'

export interface DeployOptions {
  build?: boolean
  'dry-run'?: boolean
  force?: boolean
  fresh?: boolean
  'no-backup'?: boolean
  verbose?: boolean
}

async function getGitRef(): Promise<string | undefined> {
  try {
    const { execSync } = await import('child_process')
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return undefined
  }
}

async function getGitBranch(): Promise<string | undefined> {
  try {
    const { execSync } = await import('child_process')
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return undefined
  }
}

export async function deployCommand(
  environment: string,
  options: DeployOptions = {}
) {
  console.log(chalk.cyan('\n⚡ StrataWP Deployment\n'))

  const configManager = new DeployConfigManager()
  const manifestManager = new ManifestManager()

  // Load environment configuration
  const envConfig = await configManager.loadEnvironment(environment)

  if (!envConfig) {
    console.log(
      chalk.red(
        `\n✖ Environment "${environment}" not found. Run ${chalk.cyan('stratawp deploy:setup')} first.\n`
      )
    )
    return
  }

  // Display deployment info
  console.log(chalk.white(`Environment: ${chalk.cyan(environment)}`))
  console.log(chalk.white(`Type: ${chalk.cyan(envConfig.type.toUpperCase())}`))
  console.log(chalk.white(`Host: ${chalk.cyan(envConfig.host)}`))
  console.log(chalk.white(`Remote: ${chalk.cyan(envConfig.remotePath)}\n`))

  // Verbose mode helper
  const verbose = options.verbose
  const log = (msg: string) => verbose && console.log(chalk.gray(`[DEBUG] ${msg}`))

  // Build if needed
  const shouldBuild =
    options.build !== false && (envConfig.buildBefore || options.build)

  if (shouldBuild) {
    console.log(chalk.yellow('📦 Building theme...\n'))
    const spinner = ora('Running build').start()

    try {
      const buildCommand = (await configManager.load())?.defaults
        .buildCommand || 'pnpm build'
      await execa(buildCommand.split(' ')[0], buildCommand.split(' ').slice(1), {
        stdio: 'inherit',
      })
      spinner.succeed(chalk.green('Build complete'))
    } catch (error) {
      spinner.fail(chalk.red('Build failed'))
      console.log(
        chalk.red(
          `\n✖ ${error instanceof Error ? error.message : 'Unknown error'}\n`
        )
      )
      return
    }
  }

  // Define themeDir early so it's available for snapshot creation
  const themeDir = process.cwd()

  // Create pre-deploy snapshot (unless --no-backup)
  if (!options['no-backup']) {
    const snapshotSpinner = ora('Creating pre-deploy snapshot...').start()

    try {
      const snapshotManager = new SnapshotManager()

      // Try to get database dump if config exists
      let databaseDump = ''
      if (envConfig.database?.enabled) {
        try {
          // For now, we'll just note that database snapshotting would happen here
          // Full implementation would use envConfig.database settings
          databaseDump = `-- Database snapshot placeholder for ${environment}`
        } catch (dbError) {
          // Database dump is optional, continue without it
          console.log(chalk.dim('\n  Note: Could not dump database, creating file-only snapshot'))
        }
      }

      const snapshot = await snapshotManager.createSnapshot({
        environment,
        themePath: themeDir,
        databaseDump: databaseDump || `-- No database configured for ${environment}`,
        gitRef: await getGitRef(),
        gitBranch: await getGitBranch(),
      })

      snapshotSpinner.succeed(chalk.green(`Snapshot created: ${snapshot.id}`))
    } catch (snapshotError) {
      snapshotSpinner.warn(chalk.yellow(`Could not create snapshot: ${snapshotError instanceof Error ? snapshotError.message : 'Unknown error'}`))
      // Continue with deployment even if snapshot fails
    }
  }

  // Prepare file list
  console.log(chalk.yellow('\n📋 Preparing files...\n'))
  const spinner = ora('Scanning files').start()

  try {
    const config = await configManager.load()

    // Verbose: Show working directory and patterns
    log(`Working directory: ${themeDir}`)
    log(`Include patterns: ${JSON.stringify(config?.defaults.deployInclude || [])}`)
    log(`Exclude patterns: ${JSON.stringify(config?.defaults.deployIgnore || [])}`)

    const filter = new FileFilter(themeDir, {
      include: config?.defaults.deployInclude,
      exclude: config?.defaults.deployIgnore,
      verbose: options.verbose,
    })

    await filter.loadDeployIgnore()

    const files = await filter.scanDirectory(envConfig.remotePath)
    spinner.succeed(
      chalk.green(
        `Found ${files.length} files (${FileFilter.formatSize(FileFilter.calculateTotalSize(files))})`
      )
    )

    // Verbose: Show all scanned files
    if (verbose) {
      console.log(chalk.gray('\n[DEBUG] Files to deploy:'))
      files.forEach((f) => console.log(chalk.gray(`  - ${f.relativePath}`)))
      console.log('')
    }

    // Load previous deployment for comparison (unless --fresh flag is used)
    const previousManifest = options.fresh ? null : await manifestManager.loadCurrent(environment)
    let changes = { added: files, modified: [] as any[], deleted: [] as any[], unchanged: [] as any[] }

    if (options.fresh) {
      console.log(chalk.yellow('\n🔄 Fresh deploy - uploading all files'))
    } else if (previousManifest) {
      changes = FileFilter.compareFileLists(files, previousManifest.files)
      console.log(chalk.white('\nChanges:'))
      if (changes.added.length > 0) {
        console.log(chalk.green(`  Added: ${changes.added.length} files`))
      }
      if (changes.modified.length > 0) {
        console.log(chalk.yellow(`  Modified: ${changes.modified.length} files`))
      }
      if (changes.deleted.length > 0) {
        console.log(chalk.red(`  Deleted: ${changes.deleted.length} files`))
      }
      if (changes.unchanged.length > 0) {
        console.log(chalk.gray(`  Unchanged: ${changes.unchanged.length} files`))
      }
    }

    // Dry run mode
    if (options['dry-run']) {
      console.log(chalk.cyan('\n🔍 Dry Run Mode - No files will be deployed\n'))
      console.log(chalk.white('Files to deploy:'))
      const filesToDeploy = [...changes.added, ...changes.modified]
      filesToDeploy.slice(0, 10).forEach((file) => {
        console.log(chalk.gray(`  - ${file.relativePath}`))
      })
      if (filesToDeploy.length > 10) {
        console.log(chalk.gray(`  ... and ${filesToDeploy.length - 10} more`))
      }
      console.log('')
      return
    }

    // Confirmation prompt (unless --force)
    if (!options.force) {
      console.log('')
      const { confirm } = await prompts({
        type: 'confirm',
        name: 'confirm',
        message: `Ready to deploy to ${chalk.cyan(environment)}?`,
        initial: true,
      })

      if (!confirm) {
        console.log(chalk.yellow('\n✖ Deployment cancelled\n'))
        return
      }
    }

    // Create deployer
    const deployer = createDeployer(envConfig)

    // Set up progress callback
    const progressSpinner = ora('Deploying').start()
    deployer.setProgressCallback((progress) => {
      progressSpinner.text = `Deploying (${progress.current}/${progress.total}) ${progress.currentFile || ''}`
    })

    // Deploy
    console.log(chalk.yellow('\n🚀 Deploying...\n'))

    const filesToDeploy = [...changes.added, ...changes.modified]
    const result = await deployer.deploy(filesToDeploy, {
      createBackup: !options['no-backup'],
      deleteOrphaned: false, // Can be added as option later
    })

    if (result.success) {
      progressSpinner.succeed(chalk.green('Deployment complete!'))

      // Save manifest
      const manifest = await manifestManager.create(
        environment,
        files,
        'build-hash', // TODO: Calculate actual build hash
        {
          addedFiles: changes.added.length,
          modifiedFiles: changes.modified.length,
          deletedFiles: changes.deleted.length,
          backupPath: result.backupPath,
        }
      )
      await manifestManager.save(manifest)

      // Display summary
      console.log(chalk.green('\n✓ Deployment Summary:\n'))
      console.log(
        chalk.white(`  Deployed: ${result.filesUploaded} files (${FileFilter.formatSize(FileFilter.calculateTotalSize(filesToDeploy))})`)
      )
      if (result.backupPath) {
        console.log(chalk.white(`  Backup: ${result.backupPath}`))
      }
      console.log(
        chalk.white(`  Duration: ${(result.duration / 1000).toFixed(1)}s`)
      )

      // Database migration (if enabled)
      if (envConfig.database?.enabled) {
        console.log(chalk.yellow('\n🔄 Database migration not yet implemented'))
        console.log(
          chalk.white(
            `  Will replace: ${envConfig.database.localUrl} → ${envConfig.database.remoteUrl}`
          )
        )
      }

      console.log(chalk.green('\n✓ Deployment successful!\n'))
    } else {
      progressSpinner.fail(chalk.red('Deployment failed'))
      console.log(chalk.red(`\n✖ ${result.errorMessage}\n`))

      // Update manifest status
      const failedManifest = await manifestManager.create(
        environment,
        files,
        'build-hash',
        {
          addedFiles: changes.added.length,
          modifiedFiles: changes.modified.length,
          deletedFiles: changes.deleted.length,
        }
      )
      failedManifest.status = 'failed'
      failedManifest.metadata.errorMessage = result.errorMessage
      await manifestManager.save(failedManifest)
    }
  } catch (error) {
    spinner.fail(chalk.red('Deployment failed'))
    console.log(
      chalk.red(
        `\n✖ ${error instanceof Error ? error.message : 'Unknown error'}\n`
      )
    )
  }
}

/**
 * Create the appropriate deployer based on config type
 */
function createDeployer(config: any): BaseDeployer {
  switch (config.type) {
    case 'ftp':
    case 'sftp':
      return new FTPDeployer(config)
    case 'ssh':
      return new SSHDeployer(config)
    // case 'git':
    //   return new GitDeployer(config)
    default:
      throw new Error(`Unsupported deployment type: ${config.type}`)
  }
}

/**
 * List configured environments
 */
export async function listCommand() {
  console.log(chalk.cyan('\n📋 Configured Environments\n'))

  const configManager = new DeployConfigManager()
  const environments = await configManager.listEnvironments()

  if (environments.length === 0) {
    console.log(
      chalk.yellow(
        `No environments configured. Run ${chalk.cyan('stratawp deploy:setup')} to get started.\n`
      )
    )
    return
  }

  for (const env of environments) {
    const config = await configManager.loadEnvironment(env)
    if (config) {
      console.log(chalk.white(`${chalk.cyan(env)}`))
      console.log(chalk.gray(`  Type: ${config.type}`))
      console.log(chalk.gray(`  Host: ${config.host}`))
      console.log(chalk.gray(`  Path: ${config.remotePath}\n`))
    }
  }
}

/**
 * Test connection to an environment
 */
export async function testCommand(environment: string) {
  console.log(chalk.cyan(`\n🔌 Testing connection to ${environment}...\n`))

  const configManager = new DeployConfigManager()
  const envConfig = await configManager.loadEnvironment(environment)

  if (!envConfig) {
    console.log(
      chalk.red(
        `\n✖ Environment "${environment}" not found. Run ${chalk.cyan('stratawp deploy:setup')} first.\n`
      )
    )
    return
  }

  const spinner = ora('Connecting').start()

  try {
    const deployer = createDeployer(envConfig)
    const result = await deployer.testConnection()

    if (result) {
      spinner.succeed(chalk.green('Connection successful!'))
      console.log(chalk.white(`\n  Host: ${envConfig.host}`))
      console.log(chalk.white(`  Port: ${envConfig.port}`))
      console.log(chalk.white(`  Type: ${envConfig.type.toUpperCase()}\n`))
    } else {
      spinner.fail(chalk.red('Connection failed'))
    }
  } catch (error) {
    spinner.fail(chalk.red('Connection test failed'))
    console.log(
      chalk.red(
        `\n✖ ${error instanceof Error ? error.message : 'Unknown error'}\n`
      )
    )
  }
}
