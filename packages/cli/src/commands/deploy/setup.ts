/**
 * Deployment Setup Command
 * Interactive configuration wizard for deployment environments
 */

import prompts from 'prompts'
import chalk from 'chalk'
import ora from 'ora'
import { DeployConfigManager } from '../../utils/deploy-config'
import { FTPDeployer } from '../../deployers/ftp'
import { SSHDeployer } from '../../deployers/ssh'
import type { EnvironmentConfig } from '../../utils/deploy-config'

export async function setupCommand() {
  console.log(chalk.cyan('\n🚀 Deployment Setup Wizard\n'))
  console.log(
    chalk.white(
      'This wizard will help you configure deployment for your StrataWP theme.\n'
    )
  )

  const configManager = new DeployConfigManager()

  // Get environment name
  const { environmentName } = await prompts({
    type: 'text',
    name: 'environmentName',
    message: 'Environment name:',
    initial: 'production',
    validate: (value) =>
      value.length > 0 ? true : 'Environment name is required',
  })

  if (!environmentName) {
    console.log(chalk.red('\n✖ Setup cancelled\n'))
    return
  }

  // Check if environment already exists
  const exists = await configManager.environmentExists(environmentName)
  if (exists) {
    console.log(
      chalk.yellow(`⚠️  Environment "${environmentName}" already exists.\n`)
    )
    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: 'Do you want to reconfigure it?',
      initial: false,
    })

    if (!overwrite) {
      console.log(chalk.blue('\n✓ Setup cancelled. Existing config preserved.\n'))
      return
    }
  }

  // Choose deployment type
  const { deploymentType } = await prompts({
    type: 'select',
    name: 'deploymentType',
    message: 'Choose deployment type:',
    choices: [
      {
        title: 'SFTP (Secure FTP)',
        value: 'sftp',
        description: 'Encrypted file transfer - recommended for shared hosting',
      },
      {
        title: 'FTP',
        value: 'ftp',
        description: 'Standard file transfer - less secure',
      },
      {
        title: 'SSH/rsync',
        value: 'ssh',
        description: 'For VPS/cloud servers with SSH access',
      },
      {
        title: 'Git',
        value: 'git',
        description: 'For managed hosting (WP Engine, Flywheel)',
        disabled: true, // Phase 2
      },
    ],
  })

  if (!deploymentType) {
    console.log(chalk.red('\n✖ Setup cancelled\n'))
    return
  }

  // Get connection details
  const { host } = await prompts({
    type: 'text',
    name: 'host',
    message: 'Host (e.g., ftp.example.com):',
    validate: (value) => (value.length > 0 ? true : 'Host is required'),
  })

  if (!host) {
    console.log(chalk.red('\n✖ Setup cancelled\n'))
    return
  }

  const { port } = await prompts({
    type: 'number',
    name: 'port',
    message: 'Port:',
    initial: deploymentType === 'sftp' || deploymentType === 'ssh' ? 22 : 21,
  })

  const { username } = await prompts({
    type: 'text',
    name: 'username',
    message: 'Username:',
    validate: (value) => (value.length > 0 ? true : 'Username is required'),
  })

  if (!username) {
    console.log(chalk.red('\n✖ Setup cancelled\n'))
    return
  }

  // SSH-specific: Choose authentication method
  let authMethod: 'password' | 'key' = 'password'
  let privateKey: string | undefined
  let passphrase: string | undefined
  let rsyncEnabled = false

  if (deploymentType === 'ssh') {
    const { auth } = await prompts({
      type: 'select',
      name: 'auth',
      message: 'Authentication method:',
      choices: [
        {
          title: 'SSH Key (Recommended)',
          value: 'key',
          description: 'Use private key authentication',
        },
        {
          title: 'Password',
          value: 'password',
          description: 'Use password authentication',
        },
      ],
    })

    authMethod = auth || 'key'

    if (authMethod === 'key') {
      const { keyPath } = await prompts({
        type: 'text',
        name: 'keyPath',
        message: 'Path to private key:',
        initial: '~/.ssh/id_rsa',
      })
      privateKey = keyPath

      const { hasPassphrase } = await prompts({
        type: 'confirm',
        name: 'hasPassphrase',
        message: 'Does your key have a passphrase?',
        initial: false,
      })

      if (hasPassphrase) {
        const { phrase } = await prompts({
          type: 'password',
          name: 'phrase',
          message: 'Key passphrase:',
        })
        passphrase = phrase
      }
    }

    // Rsync option for SSH
    const { useRsync } = await prompts({
      type: 'confirm',
      name: 'useRsync',
      message: 'Use rsync for file transfers? (faster for large deployments)',
      initial: true,
    })
    rsyncEnabled = useRsync
  }

  // Choose credential storage method (for FTP/SFTP or SSH with password)
  let password: string | undefined
  let passwordEnvVar: string | undefined
  let credentialStorage: string | undefined

  if (deploymentType !== 'ssh' || authMethod === 'password') {
    const result = await prompts({
      type: 'select',
      name: 'credentialStorage',
      message: 'How do you want to store credentials?',
      choices: [
        {
          title: 'Environment variables (.env file)',
          value: 'env',
          description: 'Recommended - keeps credentials out of config file',
        },
        {
          title: 'Configuration file',
          value: 'config',
          description: 'Stored in ~/.stratawp/deploy-config.json',
        },
      ],
    })
    credentialStorage = result.credentialStorage

    if (credentialStorage === 'env') {
      const envVarName = `STRATAWP_DEPLOY_${environmentName.toUpperCase()}_PASSWORD`
      passwordEnvVar = `\${${envVarName}}`

      console.log(
        chalk.yellow(
          `\n📝 Add this to your .env file:\n${envVarName}=your_password_here\n`
        )
      )

      const { skipPassword } = await prompts({
        type: 'confirm',
        name: 'skipPassword',
        message: 'Skip password entry for now?',
        initial: true,
      })

      if (!skipPassword) {
        const { pwd } = await prompts({
          type: 'password',
          name: 'pwd',
          message: 'Password (or press Enter to use env var):',
        })
        password = pwd
      }
    } else {
      const { pwd } = await prompts({
        type: 'password',
        name: 'pwd',
        message: 'Password:',
        validate: (value) => (value.length > 0 ? true : 'Password is required'),
      })

      if (!pwd) {
        console.log(chalk.red('\n✖ Setup cancelled\n'))
        return
      }
      password = pwd
    }
  }

  const { remotePath } = await prompts({
    type: 'text',
    name: 'remotePath',
    message: 'Remote path (e.g., /public_html/wp-content/themes/my-theme):',
    validate: (value) => (value.length > 0 ? true : 'Remote path is required'),
  })

  if (!remotePath) {
    console.log(chalk.red('\n✖ Setup cancelled\n'))
    return
  }

  // Build settings
  const { buildBefore } = await prompts({
    type: 'confirm',
    name: 'buildBefore',
    message: 'Build theme before deployment?',
    initial: true,
  })

  // Database migration
  const { enableDatabase } = await prompts({
    type: 'confirm',
    name: 'enableDatabase',
    message: 'Enable database URL migration (search-replace)?',
    initial: true,
  })

  let databaseConfig
  if (enableDatabase) {
    const { localUrl, remoteUrl } = await prompts([
      {
        type: 'text',
        name: 'localUrl',
        message: 'Local site URL (e.g., http://localhost:8888):',
        initial: 'http://localhost:8888',
      },
      {
        type: 'text',
        name: 'remoteUrl',
        message: 'Remote site URL (e.g., https://example.com):',
      },
    ])

    if (localUrl && remoteUrl) {
      databaseConfig = {
        enabled: true,
        localUrl,
        remoteUrl,
      }
    }
  }

  // Create environment config
  const envConfig: EnvironmentConfig = {
    type: deploymentType,
    host,
    port,
    username,
    password: passwordEnvVar || password,
    privateKey,
    remotePath,
    buildBefore,
    database: databaseConfig,
  }

  // Add SSH-specific config
  if (deploymentType === 'ssh') {
    if (passphrase) {
      ;(envConfig as any).passphrase = passphrase
    }
    if (rsyncEnabled) {
      envConfig.rsync = {
        enabled: true,
        deleteOrphaned: false,
      }
    }
  }

  // Test connection
  console.log(chalk.yellow('\n⏳ Testing connection...\n'))
  const spinner = ora('Connecting to server').start()

  try {
    const deployer = deploymentType === 'ssh'
      ? new SSHDeployer(envConfig)
      : new FTPDeployer(envConfig)
    const testResult = await deployer.testConnection()

    if (testResult) {
      spinner.succeed(chalk.green('Connection successful!'))
    } else {
      spinner.fail(chalk.red('Connection failed'))
      const { saveAnyway } = await prompts({
        type: 'confirm',
        name: 'saveAnyway',
        message: 'Save configuration anyway?',
        initial: false,
      })

      if (!saveAnyway) {
        console.log(chalk.red('\n✖ Setup cancelled\n'))
        return
      }
    }
  } catch (error) {
    spinner.fail(chalk.red('Connection test failed'))
    console.log(
      chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
    )

    const { saveAnyway } = await prompts({
      type: 'confirm',
      name: 'saveAnyway',
      message: 'Save configuration anyway?',
      initial: false,
    })

    if (!saveAnyway) {
      console.log(chalk.red('\n✖ Setup cancelled\n'))
      return
    }
  }

  // Save configuration
  try {
    await configManager.saveEnvironment(environmentName, envConfig)
    console.log(chalk.green(`\n✓ Configuration saved for "${environmentName}"\n`))

    // Create .env.example if needed
    if (credentialStorage === 'env') {
      await configManager.createEnvExample()
      console.log(chalk.blue('✓ Updated .env.example file\n'))
    }

    // Show next steps
    console.log(chalk.cyan('Next steps:\n'))
    console.log(
      chalk.white(`  1. Deploy your theme: ${chalk.cyan(`stratawp deploy ${environmentName}`)}`)
    )
    console.log(chalk.white(`  2. List environments: ${chalk.cyan('stratawp deploy:list')}`))
    console.log(
      chalk.white(`  3. Test connection: ${chalk.cyan(`stratawp deploy:test ${environmentName}`)}`)
    )
    console.log('')
  } catch (error) {
    console.log(
      chalk.red(
        `\n✖ Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}\n`
      )
    )
  }
}
