// packages/cli/src/commands/sync.ts
import chalk from 'chalk'
import ora from 'ora'
import prompts from 'prompts'
import { DatabaseDumper, SSHDatabaseDumper, DatabaseRestorer, UrlReplacer, SSHUploadsSyncer } from '@stratawp/sync'
import * as fs from 'fs/promises'
import * as path from 'path'

interface SyncConfig {
  environments: Record<string, EnvironmentConfig>
}

interface SSHConfig {
  host: string
  port?: number
  user: string
  key?: string
  passphrase?: string
}

interface EnvironmentConfig {
  name: string
  url: string
  ssh?: SSHConfig
  wpPath?: string // WordPress path on remote server (required when using SSH)
  wpCliPath?: string // Optional custom WP-CLI path
  uploadsPath?: string // Relative path to uploads from wpPath (default: wp-content/uploads)
  localUploadsPath?: string // Local uploads path (default: ./wp-content/uploads)
  database: {
    host: string
    port?: number
    user: string
    password: string
    database: string
  }
}

export async function syncDbPullCommand(environment: string, options: {
  tables?: string
  noUrlReplace?: boolean
  dryRun?: boolean
}) {
  const config = await loadSyncConfig()

  if (!config) {
    console.log(chalk.red('No sync configuration found.'))
    console.log(chalk.dim('Create a .stratawp-sync.json file in your project root.'))
    console.log(chalk.dim('\nExample configuration (with SSH - recommended):'))
    console.log(chalk.dim(JSON.stringify({
      environments: {
        local: {
          name: 'local',
          url: 'http://local.test',
          database: { host: 'localhost', user: 'root', password: '', database: 'wordpress' }
        },
        production: {
          name: 'production',
          url: 'https://example.com',
          ssh: {
            host: 'ssh.example.com',
            port: 22,
            user: 'deploy',
            key: '~/.ssh/id_rsa'
          },
          wpPath: '/var/www/html',
          database: { host: '127.0.0.1', user: 'dbuser', password: 'pass', database: 'wp_prod' }
        }
      }
    }, null, 2)))
    console.log(chalk.dim('\nNote: SSH config is recommended for production databases that only'))
    console.log(chalk.dim('allow local connections. Set STRATAWP_SSH_PASSPHRASE env var for'))
    console.log(chalk.dim('encrypted keys to avoid passphrase prompts.'))
    return
  }

  const remoteEnv = config.environments[environment]
  const localEnv = config.environments['local']

  if (!remoteEnv) {
    console.log(chalk.red(`Environment "${environment}" not found in config.`))
    console.log(chalk.dim(`Available environments: ${Object.keys(config.environments).join(', ')}`))
    return
  }

  if (!localEnv) {
    console.log(chalk.red('Local environment not configured in .stratawp-sync.json'))
    return
  }

  const spinner = ora(`Connecting to ${environment}...`).start()

  try {
    // Dump remote database
    spinner.text = `Dumping database from ${environment}...`

    let sql: string
    const dumpOptions = options.tables
      ? { tables: options.tables.split(',') }
      : {}

    // Use SSH-based dump if SSH config is present (recommended for production)
    if (remoteEnv.ssh) {
      if (!remoteEnv.wpPath) {
        spinner.fail('SSH sync requires wpPath to be configured')
        console.log(chalk.dim('Add "wpPath": "/path/to/wordpress" to your environment config'))
        return
      }

      // Get passphrase from env var or prompt if key is encrypted
      let passphrase = remoteEnv.ssh.passphrase || process.env.STRATAWP_SSH_PASSPHRASE

      if (remoteEnv.ssh.key && !passphrase) {
        spinner.stop()
        const response = await prompts({
          type: 'password',
          name: 'passphrase',
          message: 'SSH key passphrase (or set STRATAWP_SSH_PASSPHRASE env var):',
        })
        passphrase = response.passphrase
        spinner.start()
      }

      const sshDumper = new SSHDatabaseDumper({
        ssh: {
          host: remoteEnv.ssh.host,
          port: remoteEnv.ssh.port || 22,
          username: remoteEnv.ssh.user,
          privateKey: remoteEnv.ssh.key,
          passphrase,
        },
        wpPath: remoteEnv.wpPath,
        wpCliPath: remoteEnv.wpCliPath,
      })

      sql = await sshDumper.generateDumpSQL(dumpOptions)
    } else {
      // Direct MySQL connection (only works if database is publicly accessible)
      const dumper = new DatabaseDumper(remoteEnv.database)
      sql = await dumper.generateDumpSQL(dumpOptions)
    }

    spinner.text = 'Detecting URLs to replace...'

    // Detect and show URL replacements
    const detectedUrls = UrlReplacer.detectUrls(sql)
    const relevantUrls = detectedUrls.filter((url) =>
      url.includes(remoteEnv.url.replace(/^https?:\/\//, ''))
    )

    spinner.stop()

    if (!options.noUrlReplace && relevantUrls.length > 0) {
      console.log(chalk.bold('\nURL replacements:'))
      console.log(chalk.dim(`  ${remoteEnv.url} → ${localEnv.url}`))

      const { confirmed } = await prompts({
        type: 'confirm',
        name: 'confirmed',
        message: 'Proceed with database import?',
        initial: true,
      })

      if (!confirmed) {
        console.log(chalk.yellow('Cancelled.'))
        return
      }
    }

    if (options.dryRun) {
      console.log(chalk.yellow('\nDry run - no changes made.'))
      console.log(chalk.dim(`Would import ${sql.length} bytes of SQL`))
      return
    }

    spinner.start('Backing up local database...')

    const restorer = new DatabaseRestorer(localEnv.database)
    const backupPath = await restorer.createBackup()

    spinner.text = 'Importing database...'

    await restorer.restoreFromSQL(sql, {
      urlReplacements: options.noUrlReplace
        ? []
        : [{ from: remoteEnv.url, to: localEnv.url }],
    })

    spinner.succeed(`Database synced from ${environment}`)
    console.log(chalk.dim(`  Backup saved to: ${backupPath}`))
  } catch (error) {
    spinner.fail('Sync failed')
    console.error(chalk.red(error instanceof Error ? error.message : String(error)))
  }
}

export async function syncDbPushCommand(environment: string, options: {
  tables?: string
  noUrlReplace?: boolean
  dryRun?: boolean
  force?: boolean
}) {
  const config = await loadSyncConfig()

  if (!config) {
    console.log(chalk.red('No sync configuration found.'))
    return
  }

  const remoteEnv = config.environments[environment]
  const localEnv = config.environments['local']

  if (!remoteEnv || !localEnv) {
    console.log(chalk.red('Environment not found in config.'))
    return
  }

  if (environment === 'production' && !options.force) {
    console.log(chalk.bold.red('\n⚠️  WARNING: Pushing to production!'))

    const { confirmed } = await prompts({
      type: 'confirm',
      name: 'confirmed',
      message: 'Are you sure you want to overwrite the production database?',
      initial: false,
    })

    if (!confirmed) {
      console.log(chalk.yellow('Cancelled.'))
      return
    }
  }

  const spinner = ora('Dumping local database...').start()

  try {
    const dumper = new DatabaseDumper(localEnv.database)
    const sql = await dumper.generateDumpSQL(
      options.tables ? { tables: options.tables.split(',') } : {}
    )

    if (options.dryRun) {
      spinner.stop()
      console.log(chalk.yellow('\nDry run - no changes made.'))
      console.log(chalk.dim(`Would push ${sql.length} bytes of SQL`))
      return
    }

    spinner.text = `Pushing to ${environment}...`

    const restorer = new DatabaseRestorer(remoteEnv.database)

    await restorer.restoreFromSQL(sql, {
      urlReplacements: options.noUrlReplace
        ? []
        : [{ from: localEnv.url, to: remoteEnv.url }],
    })

    spinner.succeed(`Database pushed to ${environment}`)
  } catch (error) {
    spinner.fail('Push failed')
    console.error(chalk.red(error instanceof Error ? error.message : String(error)))
  }
}

export async function syncUploadsPullCommand(environment: string, options: {
  dryRun?: boolean
  delete?: boolean
}) {
  const config = await loadSyncConfig()

  if (!config) {
    console.log(chalk.red('No sync configuration found.'))
    console.log(chalk.dim('Create a .stratawp-sync.json file in your project root.'))
    return
  }

  const remoteEnv = config.environments[environment]
  const localEnv = config.environments['local']

  if (!remoteEnv) {
    console.log(chalk.red(`Environment "${environment}" not found in config.`))
    console.log(chalk.dim(`Available environments: ${Object.keys(config.environments).join(', ')}`))
    return
  }

  if (!remoteEnv.ssh) {
    console.log(chalk.red('Uploads sync requires SSH configuration.'))
    console.log(chalk.dim('Add "ssh" config to your environment in .stratawp-sync.json'))
    return
  }

  if (!remoteEnv.wpPath) {
    console.log(chalk.red('Uploads sync requires wpPath to be configured.'))
    console.log(chalk.dim('Add "wpPath": "/path/to/wordpress" to your environment config'))
    return
  }

  // Determine paths
  const remoteUploadsPath = remoteEnv.uploadsPath
    ? path.posix.join(remoteEnv.wpPath, remoteEnv.uploadsPath)
    : path.posix.join(remoteEnv.wpPath, 'wp-content/uploads')

  const localUploadsPath = localEnv?.localUploadsPath
    || remoteEnv.localUploadsPath
    || path.join(process.cwd(), 'wp-content/uploads')

  console.log(chalk.cyan('\n📦 Sync Uploads\n'))
  console.log(chalk.white(`Remote: ${remoteEnv.ssh.user}@${remoteEnv.ssh.host}:${remoteUploadsPath}`))
  console.log(chalk.white(`Local:  ${localUploadsPath}`))

  if (options.dryRun) {
    console.log(chalk.yellow('\n[DRY RUN] No files will be transferred\n'))
  }

  if (options.delete) {
    console.log(chalk.yellow('Note: --delete enabled. Local files not on remote will be removed.\n'))
  }

  // Get passphrase if needed
  let passphrase = remoteEnv.ssh.passphrase || process.env.STRATAWP_SSH_PASSPHRASE

  if (remoteEnv.ssh.key && !passphrase) {
    const response = await prompts({
      type: 'password',
      name: 'passphrase',
      message: 'SSH key passphrase (or set STRATAWP_SSH_PASSPHRASE env var):',
    })
    passphrase = response.passphrase
  }

  const spinner = ora('Syncing uploads...').start()

  try {
    const syncer = new SSHUploadsSyncer({
      ssh: {
        host: remoteEnv.ssh.host,
        port: remoteEnv.ssh.port || 22,
        username: remoteEnv.ssh.user,
        privateKey: remoteEnv.ssh.key,
        passphrase,
      },
      remoteUploadsPath,
      localUploadsPath,
    })

    const result = await syncer.pull({
      dryRun: options.dryRun,
      delete: options.delete,
    })

    if (result.success) {
      if (options.dryRun) {
        spinner.succeed('Dry run complete')
      } else {
        spinner.succeed(`Uploads synced from ${environment}`)
        console.log(chalk.dim(`  Files: ${result.filesTransferred}`))
        console.log(chalk.dim(`  Size: ${formatBytes(result.bytesTransferred)}`))
      }
    } else {
      spinner.fail('Sync failed')
      for (const error of result.errors) {
        console.log(chalk.red(`  ${error}`))
      }
    }
  } catch (error) {
    spinner.fail('Sync failed')
    console.error(chalk.red(error instanceof Error ? error.message : String(error)))
  }
}

export async function syncUploadsPushCommand(environment: string, options: {
  dryRun?: boolean
  delete?: boolean
  force?: boolean
}) {
  const config = await loadSyncConfig()

  if (!config) {
    console.log(chalk.red('No sync configuration found.'))
    return
  }

  const remoteEnv = config.environments[environment]
  const localEnv = config.environments['local']

  if (!remoteEnv || !remoteEnv.ssh || !remoteEnv.wpPath) {
    console.log(chalk.red('Environment not properly configured for uploads sync.'))
    return
  }

  if (environment === 'production' && !options.force) {
    console.log(chalk.bold.red('\n⚠️  WARNING: Pushing uploads to production!'))

    const { confirmed } = await prompts({
      type: 'confirm',
      name: 'confirmed',
      message: 'Are you sure you want to upload files to production?',
      initial: false,
    })

    if (!confirmed) {
      console.log(chalk.yellow('Cancelled.'))
      return
    }
  }

  // Determine paths
  const remoteUploadsPath = remoteEnv.uploadsPath
    ? path.posix.join(remoteEnv.wpPath, remoteEnv.uploadsPath)
    : path.posix.join(remoteEnv.wpPath, 'wp-content/uploads')

  const localUploadsPath = localEnv?.localUploadsPath
    || remoteEnv.localUploadsPath
    || path.join(process.cwd(), 'wp-content/uploads')

  console.log(chalk.cyan('\n📤 Push Uploads\n'))
  console.log(chalk.white(`Local:  ${localUploadsPath}`))
  console.log(chalk.white(`Remote: ${remoteEnv.ssh.user}@${remoteEnv.ssh.host}:${remoteUploadsPath}`))

  // Get passphrase if needed
  let passphrase = remoteEnv.ssh.passphrase || process.env.STRATAWP_SSH_PASSPHRASE

  if (remoteEnv.ssh.key && !passphrase) {
    const response = await prompts({
      type: 'password',
      name: 'passphrase',
      message: 'SSH key passphrase:',
    })
    passphrase = response.passphrase
  }

  const spinner = ora('Pushing uploads...').start()

  try {
    const syncer = new SSHUploadsSyncer({
      ssh: {
        host: remoteEnv.ssh.host,
        port: remoteEnv.ssh.port || 22,
        username: remoteEnv.ssh.user,
        privateKey: remoteEnv.ssh.key,
        passphrase,
      },
      remoteUploadsPath,
      localUploadsPath,
    })

    const result = await syncer.push({
      dryRun: options.dryRun,
      delete: options.delete,
    })

    if (result.success) {
      spinner.succeed(`Uploads pushed to ${environment}`)
    } else {
      spinner.fail('Push failed')
      for (const error of result.errors) {
        console.log(chalk.red(`  ${error}`))
      }
    }
  } catch (error) {
    spinner.fail('Push failed')
    console.error(chalk.red(error instanceof Error ? error.message : String(error)))
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

async function loadSyncConfig(): Promise<SyncConfig | null> {
  try {
    const configPath = path.join(process.cwd(), '.stratawp-sync.json')
    const content = await fs.readFile(configPath, 'utf8')
    return JSON.parse(content)
  } catch {
    return null
  }
}
