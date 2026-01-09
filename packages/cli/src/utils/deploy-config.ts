/**
 * Configuration Management for Deployment
 */

import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import { config as loadEnv } from 'dotenv'

export interface DatabaseConfig {
  enabled: boolean
  localUrl: string
  remoteUrl: string
  tables?: string[]
  skipColumns?: string[]
}

export interface PostDeployConfig {
  clearCache?: boolean
  wpCliCommands?: string[]
}

export interface RsyncConfig {
  enabled: boolean
  excludeFrom?: string
  deleteOrphaned?: boolean
}

export interface EnvironmentConfig {
  type: 'ftp' | 'sftp' | 'ssh' | 'git'
  host: string
  port: number
  username: string
  password?: string
  privateKey?: string
  remotePath: string
  remoteName?: string // For git deployments
  branch?: string // For git deployments
  provider?: string // For managed hosting (wpengine, flywheel, etc.)
  secure?: boolean // For FTP (use FTPS)
  buildBefore: boolean
  commitBuiltAssets?: boolean // For git deployments
  database?: DatabaseConfig
  postDeploy?: PostDeployConfig
  rsync?: RsyncConfig
}

export interface DefaultsConfig {
  buildCommand: string
  deployIgnore: string[]
  deployInclude: string[]
}

export interface DeploymentConfig {
  version: string
  environments: Record<string, EnvironmentConfig>
  defaults: DefaultsConfig
}

export class DeployConfigManager {
  private configPath: string
  private projectConfigPath: string
  private envPath: string

  constructor() {
    const homeDir = os.homedir()
    this.configPath = path.join(homeDir, '.stratawp', 'deploy-config.json')
    this.projectConfigPath = path.join(process.cwd(), '.stratawp-deploy.json')
    this.envPath = path.join(process.cwd(), '.env')
  }

  /**
   * Load configuration from file or environment
   */
  async load(): Promise<DeploymentConfig | null> {
    // First, try loading from .env file
    loadEnv({ path: this.envPath })

    // Try loading from project-specific config first
    if (await fs.pathExists(this.projectConfigPath)) {
      const config = await fs.readJSON(this.projectConfigPath)
      return this.resolveEnvVariables(config)
    }

    // Fallback to global config file
    if (await fs.pathExists(this.configPath)) {
      const config = await fs.readJSON(this.configPath)
      return this.resolveEnvVariables(config)
    }

    return null
  }

  /**
   * Load a specific environment configuration
   */
  async loadEnvironment(
    environment: string
  ): Promise<EnvironmentConfig | null> {
    const config = await this.load()
    if (!config || !config.environments[environment]) {
      return null
    }

    return config.environments[environment]
  }

  /**
   * List all configured environments
   */
  async listEnvironments(): Promise<string[]> {
    const config = await this.load()
    if (!config) {
      return []
    }

    return Object.keys(config.environments)
  }

  /**
   * Save configuration to file
   */
  async save(
    config: DeploymentConfig,
    useProjectConfig = false
  ): Promise<void> {
    const targetPath = useProjectConfig
      ? this.projectConfigPath
      : this.configPath
    await fs.ensureDir(path.dirname(targetPath))
    await fs.writeJSON(targetPath, config, { spaces: 2 })
  }

  /**
   * Add or update an environment configuration
   */
  async saveEnvironment(
    environment: string,
    envConfig: EnvironmentConfig,
    useProjectConfig = false
  ): Promise<void> {
    let config = await this.load()

    if (!config) {
      // Create new config with defaults
      config = {
        version: '1.0',
        environments: {},
        defaults: this.getDefaultConfig(),
      }
    }

    config.environments[environment] = envConfig
    await this.save(config, useProjectConfig)
  }

  /**
   * Delete an environment configuration
   */
  async deleteEnvironment(environment: string): Promise<void> {
    const config = await this.load()
    if (!config) {
      return
    }

    delete config.environments[environment]
    await this.save(config)
  }

  /**
   * Check if configuration exists
   */
  async exists(): Promise<boolean> {
    return (
      (await fs.pathExists(this.configPath)) ||
      (await fs.pathExists(this.projectConfigPath))
    )
  }

  /**
   * Check if a specific environment exists
   */
  async environmentExists(environment: string): Promise<boolean> {
    const config = await this.load()
    return config !== null && environment in config.environments
  }

  /**
   * Delete all deployment configuration
   */
  async delete(): Promise<void> {
    if (await fs.pathExists(this.configPath)) {
      await fs.remove(this.configPath)
    }
    if (await fs.pathExists(this.projectConfigPath)) {
      await fs.remove(this.projectConfigPath)
    }
  }

  /**
   * Get configuration file path
   */
  getConfigPath(): string {
    return this.configPath
  }

  /**
   * Get project-specific configuration file path
   */
  getProjectConfigPath(): string {
    return this.projectConfigPath
  }

  /**
   * Create a .env.example file with deployment configuration template
   */
  async createEnvExample(): Promise<void> {
    const examplePath = path.join(process.cwd(), '.env.example')
    const content = `# StrataWP Deployment Configuration

# FTP/SFTP Credentials
STRATAWP_DEPLOY_PROD_HOST=ftp.example.com
STRATAWP_DEPLOY_PROD_PORT=21
STRATAWP_DEPLOY_PROD_USERNAME=username
STRATAWP_DEPLOY_PROD_PASSWORD=secure_password
STRATAWP_DEPLOY_PROD_PATH=/public_html/wp-content/themes/my-theme

# SSH Configuration (for VPS deployment)
STRATAWP_DEPLOY_STAGING_HOST=staging.example.com
STRATAWP_DEPLOY_STAGING_PORT=22
STRATAWP_DEPLOY_STAGING_USERNAME=deploy-user
STRATAWP_DEPLOY_STAGING_KEY_PATH=~/.ssh/id_rsa
STRATAWP_DEPLOY_STAGING_PATH=/var/www/html/wp-content/themes/my-theme

# Database URLs for search-replace
STRATAWP_DEPLOY_LOCAL_URL=http://localhost:8888/my-site
STRATAWP_DEPLOY_PROD_URL=https://example.com
STRATAWP_DEPLOY_STAGING_URL=https://staging.example.com
`

    // Check if file exists, if so, append
    if (await fs.pathExists(examplePath)) {
      const existing = await fs.readFile(examplePath, 'utf-8')
      if (!existing.includes('STRATAWP_DEPLOY')) {
        await fs.appendFile(examplePath, '\n' + content)
      }
    } else {
      await fs.writeFile(examplePath, content)
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): DefaultsConfig {
    return {
      buildCommand: 'pnpm build',
      deployIgnore: [
        'node_modules/',
        'src/',
        '.git/',
        '.turbo/',
        '*.log',
        '.env*',
        '*.md',
        'README*',
        'tsconfig.json',
        'vite.config.ts',
        'package.json',
        'pnpm-lock.yaml',
        'composer.json',
        'composer.lock',
        '.DS_Store',
        '.idea/',
        '.vscode/',
      ],
      deployInclude: [
        'dist/',
        'vendor/',
        '*.php',
        'theme.json',
        'style.css',
        'screenshot.png',
        'templates/',
        'parts/',
        'patterns/',
        'inc/',
        'assets/',
      ],
    }
  }

  /**
   * Resolve environment variables in configuration
   * Supports ${VAR_NAME} syntax
   */
  private resolveEnvVariables(config: DeploymentConfig): DeploymentConfig {
    const resolved = JSON.parse(JSON.stringify(config)) // Deep clone

    for (const [envName, envConfig] of Object.entries(resolved.environments)) {
      // Resolve host
      if (envConfig.host && envConfig.host.startsWith('${')) {
        const varName = envConfig.host.slice(2, -1)
        envConfig.host = process.env[varName] || envConfig.host
      }

      // Resolve username
      if (envConfig.username && envConfig.username.startsWith('${')) {
        const varName = envConfig.username.slice(2, -1)
        envConfig.username = process.env[varName] || envConfig.username
      }

      // Resolve password
      if (envConfig.password && envConfig.password.startsWith('${')) {
        const varName = envConfig.password.slice(2, -1)
        envConfig.password = process.env[varName] || envConfig.password
      }

      // Resolve privateKey
      if (envConfig.privateKey && envConfig.privateKey.startsWith('${')) {
        const varName = envConfig.privateKey.slice(2, -1)
        envConfig.privateKey = process.env[varName] || envConfig.privateKey
      }

      // Resolve remotePath
      if (envConfig.remotePath && envConfig.remotePath.startsWith('${')) {
        const varName = envConfig.remotePath.slice(2, -1)
        envConfig.remotePath = process.env[varName] || envConfig.remotePath
      }

      // Resolve database URLs
      if (envConfig.database) {
        if (
          envConfig.database.localUrl &&
          envConfig.database.localUrl.startsWith('${')
        ) {
          const varName = envConfig.database.localUrl.slice(2, -1)
          envConfig.database.localUrl =
            process.env[varName] || envConfig.database.localUrl
        }

        if (
          envConfig.database.remoteUrl &&
          envConfig.database.remoteUrl.startsWith('${')
        ) {
          const varName = envConfig.database.remoteUrl.slice(2, -1)
          envConfig.database.remoteUrl =
            process.env[varName] || envConfig.database.remoteUrl
        }
      }
    }

    return resolved
  }
}
