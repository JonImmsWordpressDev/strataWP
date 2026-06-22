/**
 * WordPress FSE Template Sync Command
 * Syncs FSE templates (stored in database) from local to remote via SSH + WP-CLI
 */

import chalk from 'chalk'
import ora from 'ora'
import { execa } from 'execa'
import path from 'path'
import fs from 'fs-extra'
import { DeployConfigManager } from '../../utils/deploy-config'
import { SSHDeployer } from '../../deployers/ssh'

export interface SyncTemplatesOptions {
  template?: string
  all?: boolean
  'dry-run'?: boolean
  'wp-path'?: string
  'wp-cli'?: string
  verbose?: boolean
}

/**
 * Detect local WP-CLI binary path
 */
async function detectLocalWpCli(configPath?: string): Promise<string | null> {
  // 1. Explicit config path
  if (configPath) {
    const resolved = configPath.replace('~', process.env.HOME || '')
    if (await fs.pathExists(resolved)) return resolved
  }

  // 2. WP_CLI_PATH env var
  const envPath = process.env.WP_CLI_PATH
  if (envPath && (await fs.pathExists(envPath))) return envPath

  // 3. Common paths
  const candidates = [
    // Global wp
    'wp',
    // Homebrew
    '/usr/local/bin/wp',
    '/opt/homebrew/bin/wp',
    // Local by Flywheel (macOS)
    '/Applications/Local.app/Contents/Resources/extraResources/bin/wp-cli/posix/wp',
  ]

  for (const candidate of candidates) {
    try {
      const { stdout } = await execa('which', [candidate]).catch(() => ({
        stdout: '',
      }))
      if (stdout) return stdout.trim()
      if (await fs.pathExists(candidate)) return candidate
    } catch {
      continue
    }
  }

  return null
}

/**
 * Get local WordPress path from theme directory
 * Assumes we're in wp-content/themes/<theme-name>
 */
function getLocalWpPath(overridePath?: string): string {
  if (overridePath) return overridePath

  // Derive from cwd: go up 3 levels from theme dir
  const themeDir = process.cwd()
  return path.resolve(themeDir, '..', '..', '..')
}

/**
 * List local templates using WP-CLI
 */
async function getLocalTemplates(
  wpCliPath: string,
  wpPath: string
): Promise<Array<{ id: string; slug: string }>> {
  try {
    const { stdout } = await execa(wpCliPath, [
      `--path=${wpPath}`,
      'post',
      'list',
      '--post_type=wp_template',
      '--fields=ID,post_name',
      '--format=csv',
    ])

    const templates: Array<{ id: string; slug: string }> = []
    const lines = stdout.trim().split('\n').filter(Boolean)

    // Skip CSV header
    for (let i = 1; i < lines.length; i++) {
      const cleanLine = lines[i].replace(/\r/g, '')
      const commaIdx = cleanLine.indexOf(',')
      if (commaIdx > 0) {
        const id = cleanLine.substring(0, commaIdx).trim()
        let slug = cleanLine.substring(commaIdx + 1).trim()
        // Strip theme prefix
        const slashIdx = slug.indexOf('//')
        if (slashIdx >= 0) {
          slug = slug.substring(slashIdx + 2)
        }
        templates.push({ id, slug })
      }
    }

    return templates
  } catch (error) {
    throw new Error(
      `Failed to list local templates: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Get local template content using WP-CLI
 */
async function getLocalTemplateContent(
  wpCliPath: string,
  wpPath: string,
  postId: string
): Promise<string> {
  const { stdout } = await execa(wpCliPath, [
    `--path=${wpPath}`,
    'post',
    'get',
    postId,
    '--field=post_content',
  ])
  return stdout
}

/**
 * Main sync:templates command
 */
export async function syncTemplatesCommand(
  environment: string,
  options: SyncTemplatesOptions = {}
) {
  console.log(chalk.cyan('\n📝 StrataWP Template Sync\n'))

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

  if (envConfig.type !== 'ssh') {
    console.log(chalk.red('\n✖ Template sync requires SSH deployment type (not FTP/SFTP).\n'))
    return
  }

  // Display info
  console.log(chalk.white(`Environment: ${chalk.cyan(environment)}`))
  console.log(chalk.white(`Host: ${chalk.cyan(envConfig.host)}`))

  // Detect local WP-CLI
  const wpCliSpinner = ora('Detecting local WP-CLI...').start()
  const wpCliPath = await detectLocalWpCli(envConfig.localWpCli)

  if (!wpCliPath) {
    wpCliSpinner.fail(chalk.red('WP-CLI not found locally'))
    console.log(
      chalk.dim(
        '\nInstall WP-CLI or set localWpCli in deploy config.\n' +
          'For Local by Flywheel, set WP_CLI_PATH env var or add localWpCli to config.'
      )
    )
    return
  }

  wpCliSpinner.succeed(chalk.green(`WP-CLI found: ${wpCliPath}`))

  // Get local WordPress path
  const wpPath = getLocalWpPath(options['wp-path'])
  console.log(chalk.white(`WordPress: ${chalk.cyan(wpPath)}`))

  // List local templates
  const localSpinner = ora('Listing local templates...').start()
  let localTemplates: Array<{ id: string; slug: string }>

  try {
    localTemplates = await getLocalTemplates(wpCliPath, wpPath)
    localSpinner.succeed(chalk.green(`Found ${localTemplates.length} local templates`))
  } catch (error) {
    localSpinner.fail(chalk.red('Failed to list local templates'))
    console.log(chalk.red(`\n✖ ${error instanceof Error ? error.message : 'Unknown error'}\n`))
    return
  }

  if (localTemplates.length === 0) {
    console.log(chalk.yellow('\nNo templates found in local database.\n'))
    return
  }

  // Filter templates if --template is specified
  let templatesToSync = localTemplates
  if (options.template) {
    templatesToSync = localTemplates.filter((t) => t.slug === options.template)
    if (templatesToSync.length === 0) {
      console.log(chalk.red(`\n✖ Template "${options.template}" not found locally.\n`))
      console.log(chalk.white('Available templates:'))
      for (const t of localTemplates) {
        console.log(chalk.gray(`  - ${t.slug} (ID: ${t.id})`))
      }
      return
    }
  }

  // Show what will be synced
  console.log(chalk.white('\nTemplates to sync:'))
  for (const t of templatesToSync) {
    console.log(chalk.cyan(`  - ${t.slug}`))
  }

  // Dry run
  if (options['dry-run']) {
    console.log(chalk.cyan('\n🔍 Dry Run Mode - No templates will be synced\n'))
    return
  }

  // Connect to remote
  const connectSpinner = ora('Connecting to remote...').start()
  const deployer = new SSHDeployer(envConfig)

  try {
    await deployer.connect()
    connectSpinner.succeed(chalk.green('Connected to remote'))
  } catch (error) {
    connectSpinner.fail(chalk.red('Failed to connect'))
    console.log(chalk.red(`\n✖ ${error instanceof Error ? error.message : 'Unknown error'}\n`))
    return
  }

  const wpRootPath = deployer.getWpRootPath()
  let successCount = 0
  let failCount = 0

  // Sync each template
  for (const template of templatesToSync) {
    const templateSpinner = ora(`Syncing template: ${template.slug}...`).start()

    try {
      // Get local content
      const content = await getLocalTemplateContent(wpCliPath, wpPath, template.id)

      if (!content || content.trim().length === 0) {
        templateSpinner.warn(chalk.yellow(`${template.slug}: No content (empty template)`))
        continue
      }

      // Sync to remote
      const result = await deployer.syncTemplate(content, template.slug, wpRootPath)

      if (result.success) {
        templateSpinner.succeed(chalk.green(`${template.slug}: ${result.message}`))
        successCount++
      } else {
        templateSpinner.fail(chalk.red(`${template.slug}: ${result.message}`))
        failCount++
      }
    } catch (error) {
      templateSpinner.fail(
        chalk.red(`${template.slug}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      )
      failCount++
    }
  }

  // Flush caches after template sync
  if (successCount > 0) {
    const cacheSpinner = ora('Flushing caches...').start()
    try {
      await deployer.executeCommand(
        `cd "${wpRootPath}" && wp cache flush && wp transient delete --all`
      )
      cacheSpinner.succeed(chalk.green('Caches flushed'))
    } catch {
      cacheSpinner.warn(chalk.yellow('Could not flush caches'))
    }
  }

  // Disconnect
  try {
    await deployer.disconnect()
  } catch {
    // Ignore disconnect errors
  }

  // Summary
  console.log(chalk.cyan('\n📝 Template Sync Summary:\n'))
  console.log(chalk.green(`  Synced: ${successCount}`))
  if (failCount > 0) {
    console.log(chalk.red(`  Failed: ${failCount}`))
  }
  console.log('')

  if (failCount > 0) {
    console.log(chalk.yellow('⚠ Some templates failed to sync. Check the errors above.\n'))
  } else {
    console.log(chalk.green('✓ All templates synced successfully!\n'))
  }
}

/**
 * List templates on local and remote
 */
export async function listTemplatesCommand(
  environment: string,
  options: { 'wp-path'?: string; 'wp-cli'?: string } = {}
) {
  console.log(chalk.cyan('\n📋 WordPress FSE Templates\n'))

  const configManager = new DeployConfigManager()
  const envConfig = await configManager.loadEnvironment(environment)

  if (!envConfig) {
    console.log(chalk.red(`\n✖ Environment "${environment}" not found.\n`))
    return
  }

  // Local templates
  const wpCliPath = await detectLocalWpCli(envConfig.localWpCli)
  if (wpCliPath) {
    const wpPath = getLocalWpPath(options['wp-path'])
    console.log(chalk.white('Local templates:'))
    try {
      const localTemplates = await getLocalTemplates(wpCliPath, wpPath)
      for (const t of localTemplates) {
        console.log(chalk.gray(`  ${t.id}\t${t.slug}`))
      }
    } catch (error) {
      console.log(chalk.red(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`))
    }
  } else {
    console.log(chalk.yellow('Local: WP-CLI not found'))
  }

  // Remote templates
  if (envConfig.type === 'ssh') {
    console.log(chalk.white('\nRemote templates:'))
    const deployer = new SSHDeployer(envConfig)
    try {
      await deployer.connect()
      const wpRootPath = deployer.getWpRootPath()
      const remoteTemplates = await deployer.listRemoteTemplates(wpRootPath)
      for (const t of remoteTemplates) {
        console.log(chalk.gray(`  ${t.id}\t${t.slug}`))
      }
      await deployer.disconnect()
    } catch (error) {
      console.log(chalk.red(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`))
    }
  }

  console.log('')
}
