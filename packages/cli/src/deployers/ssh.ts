/**
 * SSH/Rsync Deployer
 * Handles deployment to VPS/cloud servers with SSH access
 */

import { BaseDeployer } from './base'
import type { FileRecord } from '../utils/file-filter'
import { NodeSSH, type Config as SSHConfig } from 'node-ssh'
import path from 'path'
import fs from 'fs-extra'
import pLimit from 'p-limit'
import { execa } from 'execa'

export class SSHDeployer extends BaseDeployer {
  private ssh: NodeSSH
  private rsyncAvailable: boolean = false

  constructor(config: any) {
    super(config)
    this.ssh = new NodeSSH()
  }

  /**
   * Connect to SSH server
   */
  async connect(): Promise<void> {
    try {
      const sshConfig: SSHConfig = {
        host: this.config.host,
        port: this.config.port || 22,
        username: this.config.username,
      }

      // Support password or private key authentication
      if (this.config.password) {
        sshConfig.password = this.config.password
      } else if (this.config.privateKey) {
        const keyPath = this.config.privateKey.replace(
          '~',
          process.env.HOME || ''
        )
        sshConfig.privateKeyPath = keyPath

        // Support optional passphrase
        if (this.config.passphrase) {
          sshConfig.passphrase = this.config.passphrase
        }
      } else {
        // Default to ~/.ssh/id_rsa
        const defaultKeyPath = path.join(
          process.env.HOME || '',
          '.ssh',
          'id_rsa'
        )
        if (await fs.pathExists(defaultKeyPath)) {
          sshConfig.privateKeyPath = defaultKeyPath
        }
      }

      await this.ssh.connect(sshConfig)
      this.isConnected = true

      // Check if rsync is available on remote
      await this.checkRsyncAvailability()
    } catch (error) {
      this.isConnected = false
      throw new Error(
        `Failed to connect to SSH server: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Check if rsync is available on both local and remote
   */
  private async checkRsyncAvailability(): Promise<void> {
    try {
      // Check local rsync
      await execa('which', ['rsync'])

      // Check remote rsync
      const result = await this.ssh.execCommand('which rsync')
      this.rsyncAvailable = result.code === 0
    } catch {
      this.rsyncAvailable = false
    }
  }

  /**
   * Disconnect from SSH server
   */
  async disconnect(): Promise<void> {
    try {
      if (this.ssh.isConnected()) {
        this.ssh.dispose()
      }
      this.isConnected = false
    } catch (error) {
      // Ignore disconnect errors
    }
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.connect()

      // Test we can execute a command and access the remote path
      const result = await this.ssh.execCommand(`test -d "${this.config.remotePath}" && echo "exists"`)

      await this.disconnect()
      return result.stdout.includes('exists') || result.code === 0
    } catch (error) {
      return false
    }
  }

  /**
   * Upload a single file via SFTP
   */
  async uploadFile(localPath: string, remotePath: string): Promise<void> {
    // Ensure remote directory exists
    const remoteDir = path.posix.dirname(remotePath)
    await this.createDirectory(remoteDir)

    await this.ssh.putFile(localPath, remotePath)
  }

  /**
   * Upload multiple files
   * Uses rsync for bulk uploads when available, falls back to SFTP
   */
  async uploadFiles(files: FileRecord[]): Promise<void> {
    if (files.length === 0) return

    // Use rsync if enabled and available
    if (this.config.rsync?.enabled && this.rsyncAvailable) {
      await this.uploadWithRsync(files)
    } else {
      await this.uploadWithSFTP(files)
    }
  }

  /**
   * Upload files using rsync
   */
  private async uploadWithRsync(files: FileRecord[]): Promise<void> {
    // Get local base path (common parent directory of all files)
    const localBasePath = process.cwd()

    // Build rsync arguments
    const args: string[] = [
      '-avz', // archive, verbose, compress
      '--progress',
      '-e',
      `ssh -p ${this.config.port || 22}`,
    ]

    // Add exclude-from file if specified
    if (this.config.rsync?.excludeFrom) {
      args.push(`--exclude-from=${this.config.rsync.excludeFrom}`)
    }

    // Add delete flag if specified (remove orphaned files on remote)
    if (this.config.rsync?.deleteOrphaned) {
      args.push('--delete')
    }

    // Create a temp file with the file list for --files-from
    const tmpFileList = path.join(
      process.env.TMPDIR || '/tmp',
      `stratawp-rsync-${Date.now()}.txt`
    )
    const relativePaths = files.map((f) => f.relativePath).join('\n')
    await fs.writeFile(tmpFileList, relativePaths)

    try {
      args.push(`--files-from=${tmpFileList}`)
      args.push(localBasePath + '/')
      args.push(
        `${this.config.username}@${this.config.host}:${this.config.remotePath}/`
      )

      // Execute rsync
      const result = await execa('rsync', args, {
        stdio: 'pipe',
      })

      // Notify progress as complete
      this.notifyProgress({
        current: files.length,
        total: files.length,
      })
    } finally {
      // Clean up temp file
      await fs.remove(tmpFileList)
    }
  }

  /**
   * Upload files using SFTP (fallback)
   */
  private async uploadWithSFTP(files: FileRecord[]): Promise<void> {
    // SSH can handle multiple concurrent uploads
    const limit = pLimit(5)
    const totalFiles = files.length
    let completedFiles = 0

    const uploadPromises = files.map((file) =>
      limit(async () => {
        await this.uploadFile(file.localPath, file.remotePath)
        completedFiles++

        this.notifyProgress({
          current: completedFiles,
          total: totalFiles,
          currentFile: file.relativePath,
        })
      })
    )

    await Promise.all(uploadPromises)
  }

  /**
   * Delete a file from remote
   */
  async deleteFile(remotePath: string): Promise<void> {
    try {
      await this.ssh.execCommand(`rm -f "${remotePath}"`)
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(remotePaths: string[]): Promise<void> {
    if (remotePaths.length === 0) return

    // Batch delete in chunks to avoid command line length limits
    const chunkSize = 100
    for (let i = 0; i < remotePaths.length; i += chunkSize) {
      const chunk = remotePaths.slice(i, i + chunkSize)
      const quotedPaths = chunk.map((p) => `"${p}"`).join(' ')
      await this.ssh.execCommand(`rm -f ${quotedPaths}`)
    }
  }

  /**
   * Create a backup of the remote directory
   */
  async createBackup(): Promise<string> {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, -5)
    const backupName = `backup-${timestamp}`
    const parentDir = path.posix.dirname(this.config.remotePath)
    const backupPath = path.posix.join(parentDir, backupName)
    const sourceName = path.posix.basename(this.config.remotePath)

    try {
      // Check if source exists
      const exists = await this.pathExists(this.config.remotePath)
      if (exists) {
        // Use cp -r to create a backup
        const result = await this.ssh.execCommand(
          `cp -r "${this.config.remotePath}" "${backupPath}"`,
          { cwd: parentDir }
        )

        if (result.code !== 0) {
          throw new Error(result.stderr || 'Failed to create backup')
        }
      }

      return backupPath
    } catch (error) {
      throw new Error(
        `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Restore from a backup
   */
  async restoreBackup(backupPath: string): Promise<void> {
    try {
      // Verify backup exists
      const exists = await this.pathExists(backupPath)
      if (!exists) {
        throw new Error(`Backup not found: ${backupPath}`)
      }

      // Remove current deployment
      await this.ssh.execCommand(`rm -rf "${this.config.remotePath}"`)

      // Restore from backup
      const result = await this.ssh.execCommand(
        `cp -r "${backupPath}" "${this.config.remotePath}"`
      )

      if (result.code !== 0) {
        throw new Error(result.stderr || 'Failed to restore backup')
      }
    } catch (error) {
      throw new Error(
        `Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * List backups
   */
  async listBackups(): Promise<
    Array<{ id: string; path: string; created: number }>
  > {
    const parentDir = path.posix.dirname(this.config.remotePath)
    const backups: Array<{ id: string; path: string; created: number }> = []

    try {
      // List directories that start with 'backup-'
      const result = await this.ssh.execCommand(
        `find "${parentDir}" -maxdepth 1 -type d -name 'backup-*' -printf '%T@ %p\\n' 2>/dev/null || ls -d "${parentDir}"/backup-* 2>/dev/null`
      )

      if (result.stdout) {
        const lines = result.stdout.trim().split('\n').filter(Boolean)

        for (const line of lines) {
          // Handle find output format: "timestamp path"
          const parts = line.split(' ')
          if (parts.length >= 2) {
            const timestamp = parseFloat(parts[0])
            const fullPath = parts.slice(1).join(' ')
            const name = path.posix.basename(fullPath)

            backups.push({
              id: name,
              path: fullPath,
              created: isNaN(timestamp) ? Date.now() : timestamp * 1000,
            })
          } else {
            // Handle ls output format: just path
            const name = path.posix.basename(line)
            backups.push({
              id: name,
              path: line,
              created: Date.now(),
            })
          }
        }
      }
    } catch (error) {
      // Return empty array if we can't list backups
    }

    return backups.sort((a, b) => b.created - a.created)
  }

  /**
   * Check if a path exists on remote
   */
  async pathExists(remotePath: string): Promise<boolean> {
    try {
      const result = await this.ssh.execCommand(`test -e "${remotePath}"`)
      return result.code === 0
    } catch (error) {
      return false
    }
  }

  /**
   * Create a directory on remote (with parents)
   */
  async createDirectory(remotePath: string): Promise<void> {
    try {
      await this.ssh.execCommand(`mkdir -p "${remotePath}"`)
    } catch (error) {
      // Ignore if directory already exists
    }
  }

  /**
   * Execute a command on remote server
   * Useful for WP-CLI commands and post-deploy hooks
   */
  async executeCommand(command: string): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Not connected to SSH server')
    }

    const result = await this.ssh.execCommand(command, {
      cwd: this.config.remotePath,
    })

    if (result.code !== 0) {
      throw new Error(result.stderr || `Command failed with code ${result.code}`)
    }

    return result.stdout
  }
}
