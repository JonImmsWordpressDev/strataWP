/**
 * Base Deployer Interface
 * Abstract class for all deployment adapters
 */

import type { FileRecord } from '../utils/file-filter'
import type { EnvironmentConfig } from '../utils/deploy-config'

export interface DeploymentProgress {
  current: number
  total: number
  currentFile?: string
  bytesTransferred?: number
  totalBytes?: number
}

export type ProgressCallback = (progress: DeploymentProgress) => void

export interface DeploymentResult {
  success: boolean
  filesUploaded: number
  filesDeleted: number
  backupPath?: string
  errorMessage?: string
  duration: number
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
  abstract uploadFile(
    localPath: string,
    remotePath: string
  ): Promise<void>

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
  abstract listBackups(): Promise<
    Array<{ id: string; path: string; created: number }>
  >

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
  async executeCommand(command: string): Promise<string> {
    throw new Error('Remote command execution not supported by this deployer')
  }

  /**
   * Deploy files with full workflow
   * This is the main deployment method that orchestrates the process
   */
  async deploy(
    files: FileRecord[],
    options: {
      createBackup?: boolean
      deleteOrphaned?: boolean
      orphanedFiles?: FileRecord[]
    } = {}
  ): Promise<DeploymentResult> {
    const startTime = Date.now()
    let backupPath: string | undefined
    let filesUploaded = 0
    let filesDeleted = 0

    try {
      // Connect
      await this.connect()

      // Create backup if requested
      if (options.createBackup) {
        backupPath = await this.createBackup()
      }

      // Upload files
      await this.uploadFiles(files)
      filesUploaded = files.length

      // Delete orphaned files if requested
      if (options.deleteOrphaned && options.orphanedFiles) {
        const orphanedPaths = options.orphanedFiles.map((f) => f.remotePath)
        await this.deleteFiles(orphanedPaths)
        filesDeleted = orphanedPaths.length
      }

      // Disconnect
      await this.disconnect()

      return {
        success: true,
        filesUploaded,
        filesDeleted,
        backupPath,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'

      return {
        success: false,
        filesUploaded,
        filesDeleted,
        backupPath,
        errorMessage,
        duration: Date.now() - startTime,
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
