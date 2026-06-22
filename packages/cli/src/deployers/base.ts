/**
 * Base Deployer Interface
 * Abstract class for all deployment adapters
 */

import type { FileRecord } from '../utils/file-filter'
import type { EnvironmentConfig, PostDeployConfig } from '../utils/deploy-config'
import path from 'path'

export interface DeploymentProgress {
  current: number
  total: number
  currentFile?: string
  bytesTransferred?: number
  totalBytes?: number
}

export type ProgressCallback = (progress: DeploymentProgress) => void

export interface ValidationCheck {
  name: string
  passed: boolean
  message?: string
}

export interface PostDeployResult {
  cacheCleared: boolean
  opcacheReset: boolean
  backupsCleanedUp: number
  customCommands: Array<{ command: string; success: boolean; output?: string }>
}

export interface DeploymentResult {
  success: boolean
  filesUploaded: number
  filesDeleted: number
  backupPath?: string
  errorMessage?: string
  duration: number
  postDeploy?: PostDeployResult
  validation?: {
    success: boolean
    checks: ValidationCheck[]
  }
}

export interface DeployOptions {
  createBackup?: boolean
  keepBackups?: number
  deleteOrphaned?: boolean
  orphanedFiles?: FileRecord[]
  postDeploy?: PostDeployConfig
  validate?: boolean
}

/**
 * Abstract base class for all deployers
 */
export abstract class BaseDeployer {
  protected config: EnvironmentConfig
  protected isConnected: boolean = false
  protected progressCallback?: ProgressCallback

  constructor(config: EnvironmentConfig) {
    this.config = config
  }

  /**
   * Set progress callback for deployment updates
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.progressCallback = callback
  }

  /**
   * Notify progress
   */
  protected notifyProgress(progress: DeploymentProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress)
    }
  }

  /**
   * Connect to remote server
   */
  abstract connect(): Promise<void>

  /**
   * Disconnect from remote server
   */
  abstract disconnect(): Promise<void>

  /**
   * Test connection to remote server
   */
  abstract testConnection(): Promise<boolean>

  /**
   * Upload a single file
   */
  abstract uploadFile(localPath: string, remotePath: string): Promise<void>

  /**
   * Upload multiple files
   */
  abstract uploadFiles(files: FileRecord[]): Promise<void>

  /**
   * Delete a file from remote
   */
  abstract deleteFile(remotePath: string): Promise<void>

  /**
   * Delete multiple files from remote
   */
  abstract deleteFiles(remotePaths: string[]): Promise<void>

  /**
   * Create a backup of the remote directory
   * Returns the backup path or identifier
   */
  abstract createBackup(): Promise<string>

  /**
   * Restore from a backup
   */
  abstract restoreBackup(backupPath: string): Promise<void>

  /**
   * List backups available for this environment
   */
  abstract listBackups(): Promise<Array<{ id: string; path: string; created: number }>>

  /**
   * Check if a remote path exists
   */
  abstract pathExists(remotePath: string): Promise<boolean>

  /**
   * Create a directory on remote
   */
  abstract createDirectory(remotePath: string): Promise<void>

  /**
   * Execute a command on remote (for SSH deployers)
   * Optional implementation for deployers that don't support remote commands
   */
  async executeCommand(_command: string): Promise<string> {
    throw new Error('Remote command execution not supported by this deployer')
  }

  /**
   * Post-deploy lifecycle hook
   * Called after files are uploaded and orphans deleted, while still connected.
   * Default is no-op. SSH deployer overrides to flush caches, OPcache, cleanup backups.
   */
  async postDeploy(_options: DeployOptions): Promise<PostDeployResult> {
    return {
      cacheCleared: false,
      opcacheReset: false,
      backupsCleanedUp: 0,
      customCommands: [],
    }
  }

  /**
   * Post-deploy validation hook
   * Called after postDeploy(), while still connected.
   * Default checks critical files exist. SSH deployer adds WP-CLI health check.
   */
  async validate(): Promise<{ success: boolean; checks: ValidationCheck[] }> {
    const checks: ValidationCheck[] = []

    // Check critical theme files exist
    const criticalFiles = ['style.css']
    for (const file of criticalFiles) {
      const remotePath = path.posix.join(this.config.remotePath, file)
      const exists = await this.pathExists(remotePath)
      checks.push({
        name: `File: ${file}`,
        passed: exists,
        message: exists ? 'exists' : 'missing',
      })
    }

    return {
      success: checks.every((c) => c.passed),
      checks,
    }
  }

  /**
   * Derive WordPress root path from theme remotePath
   * WordPress themes are always at wp-content/themes/<theme-name>
   * So WP root is 3 directories up
   */
  getWpRootPath(): string {
    return (
      this.config.postDeploy?.wpRootPath ||
      path.posix.join(this.config.remotePath, '..', '..', '..')
    )
  }

  /**
   * Deploy files with full workflow
   * This is the main deployment method that orchestrates the process
   */
  async deploy(files: FileRecord[], options: DeployOptions = {}): Promise<DeploymentResult> {
    const startTime = Date.now()
    let backupPath: string | undefined
    let filesUploaded = 0
    let filesDeleted = 0
    let postDeployResult: PostDeployResult | undefined
    let validationResult: { success: boolean; checks: ValidationCheck[] } | undefined

    try {
      // 1. Connect
      await this.connect()

      // 2. Create backup if requested
      if (options.createBackup) {
        backupPath = await this.createBackup()
      }

      // 3. Upload files
      await this.uploadFiles(files)
      filesUploaded = files.length

      // 4. Delete orphaned files if requested
      if (options.deleteOrphaned && options.orphanedFiles) {
        const orphanedPaths = options.orphanedFiles.map((f) => f.remotePath)
        await this.deleteFiles(orphanedPaths)
        filesDeleted = orphanedPaths.length
      }

      // 5. Post-deploy hooks (cache flush, OPcache, backup cleanup)
      postDeployResult = await this.postDeploy(options)

      // 6. Validation (file checks, WP health)
      if (options.validate !== false) {
        validationResult = await this.validate()
      }

      // 7. Disconnect
      await this.disconnect()

      return {
        success: true,
        filesUploaded,
        filesDeleted,
        backupPath,
        duration: Date.now() - startTime,
        postDeploy: postDeployResult,
        validation: validationResult,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      return {
        success: false,
        filesUploaded,
        filesDeleted,
        backupPath,
        errorMessage,
        duration: Date.now() - startTime,
        postDeploy: postDeployResult,
        validation: validationResult,
      }
    } finally {
      // Ensure we disconnect
      if (this.isConnected) {
        try {
          await this.disconnect()
        } catch (err) {
          // Ignore disconnect errors
        }
      }
    }
  }

  /**
   * Get deployer type
   */
  getType(): string {
    return this.config.type
  }

  /**
   * Get connection info for display
   */
  getConnectionInfo(): {
    type: string
    host: string
    port: number
    remotePath: string
  } {
    return {
      type: this.config.type,
      host: this.config.host,
      port: this.config.port,
      remotePath: this.config.remotePath,
    }
  }
}
