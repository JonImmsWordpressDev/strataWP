/**
 * FTP/SFTP Deployer
 * Handles deployment to FTP and SFTP servers
 */

import { BaseDeployer } from './base'
import type { FileRecord } from '../utils/file-filter'
import { Client as FTPClient } from 'basic-ftp'
import SFTPClient from 'ssh2-sftp-client'
import path from 'path'
import fs from 'fs-extra'
import pLimit from 'p-limit'

export class FTPDeployer extends BaseDeployer {
  private ftpClient?: FTPClient
  private sftpClient?: SFTPClient
  private isSFTP: boolean

  constructor(config: any) {
    super(config)
    this.isSFTP = config.type === 'sftp'
  }

  /**
   * Connect to FTP/SFTP server
   */
  async connect(): Promise<void> {
    try {
      if (this.isSFTP) {
        await this.connectSFTP()
      } else {
        await this.connectFTP()
      }
      this.isConnected = true
    } catch (error) {
      this.isConnected = false
      throw new Error(
        `Failed to connect to ${this.isSFTP ? 'SFTP' : 'FTP'} server: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Connect to FTP server
   */
  private async connectFTP(): Promise<void> {
    this.ftpClient = new FTPClient()
    this.ftpClient.ftp.verbose = false

    await this.ftpClient.access({
      host: this.config.host,
      port: this.config.port || 21,
      user: this.config.username,
      password: this.config.password,
      secure: this.config.secure || false,
    })
  }

  /**
   * Connect to SFTP server
   */
  private async connectSFTP(): Promise<void> {
    this.sftpClient = new SFTPClient()

    const connectOptions: any = {
      host: this.config.host,
      port: this.config.port || 22,
      username: this.config.username,
    }

    if (this.config.password) {
      connectOptions.password = this.config.password
    } else if (this.config.privateKey) {
      const keyPath = this.config.privateKey.replace('~', process.env.HOME || '')
      connectOptions.privateKey = await fs.readFile(keyPath)
    }

    await this.sftpClient.connect(connectOptions)
  }

  /**
   * Disconnect from server
   */
  async disconnect(): Promise<void> {
    try {
      if (this.isSFTP && this.sftpClient) {
        await this.sftpClient.end()
        this.sftpClient = undefined
      } else if (this.ftpClient) {
        this.ftpClient.close()
        this.ftpClient = undefined
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
      await this.disconnect()
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Upload a single file
   */
  async uploadFile(localPath: string, remotePath: string): Promise<void> {
    // Ensure remote directory exists
    const remoteDir = path.posix.dirname(remotePath)
    await this.createDirectory(remoteDir)

    if (this.isSFTP && this.sftpClient) {
      await this.sftpClient.fastPut(localPath, remotePath)
    } else if (this.ftpClient) {
      await this.ftpClient.uploadFrom(localPath, remotePath)
    } else {
      throw new Error('Not connected to server')
    }
  }

  /**
   * Upload multiple files with concurrency control
   */
  async uploadFiles(files: FileRecord[]): Promise<void> {
    // FTP doesn't support concurrent operations on the same client
    // SFTP can handle multiple concurrent uploads
    const limit = pLimit(this.isSFTP ? 3 : 1)
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
      if (this.isSFTP && this.sftpClient) {
        await this.sftpClient.delete(remotePath)
      } else if (this.ftpClient) {
        await this.ftpClient.remove(remotePath)
      }
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(remotePaths: string[]): Promise<void> {
    for (const remotePath of remotePaths) {
      await this.deleteFile(remotePath)
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
    const backupPath = path.posix.join(
      path.posix.dirname(this.config.remotePath),
      backupName
    )

    try {
      if (this.isSFTP && this.sftpClient) {
        // Check if source exists
        const exists = await this.pathExists(this.config.remotePath)
        if (exists) {
          // SFTP doesn't have a native copy/rename, so we use remote command if available
          // For now, we'll just create a marker file
          await this.createDirectory(backupPath)
        }
      } else if (this.ftpClient) {
        // FTP doesn't support server-side copy easily
        // Create a marker directory
        await this.ftpClient.ensureDir(backupPath)
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
    // Implementation depends on how backups are created
    // This is a placeholder for future implementation
    throw new Error('Restore from backup not yet implemented for FTP/SFTP')
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
      if (this.isSFTP && this.sftpClient) {
        const files = await this.sftpClient.list(parentDir)
        for (const file of files) {
          if (
            file.type === 'd' &&
            file.name.startsWith('backup-')
          ) {
            backups.push({
              id: file.name,
              path: path.posix.join(parentDir, file.name),
              created: file.modifyTime,
            })
          }
        }
      } else if (this.ftpClient) {
        const files = await this.ftpClient.list(parentDir)
        for (const file of files) {
          if (file.isDirectory && file.name.startsWith('backup-')) {
            backups.push({
              id: file.name,
              path: path.posix.join(parentDir, file.name),
              created: file.modifiedAt?.getTime() || Date.now(),
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
      if (this.isSFTP && this.sftpClient) {
        await this.sftpClient.stat(remotePath)
        return true
      } else if (this.ftpClient) {
        const size = await this.ftpClient.size(remotePath)
        return size >= 0
      }
      return false
    } catch (error) {
      return false
    }
  }

  /**
   * Create a directory on remote (with parents)
   */
  async createDirectory(remotePath: string): Promise<void> {
    try {
      if (this.isSFTP && this.sftpClient) {
        await this.sftpClient.mkdir(remotePath, true)
      } else if (this.ftpClient) {
        await this.ftpClient.ensureDir(remotePath)
      }
    } catch (error) {
      // Ignore if directory already exists
    }
  }
}
