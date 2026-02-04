// packages/sync/src/uploads/ssh-sync.ts
/**
 * SSH-based Uploads Syncer
 * Uses rsync over SSH to sync the WordPress uploads folder
 */

import { execa } from 'execa'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import type { SSHConfig } from '../types.js'

export interface SSHUploadsSyncConfig {
  ssh: SSHConfig
  remoteUploadsPath: string // e.g., /var/www/html/wp-content/uploads
  localUploadsPath: string // e.g., ./wp-content/uploads
}

export interface SyncOptions {
  dryRun?: boolean
  delete?: boolean // Remove local files not on remote
  exclude?: string[] // Patterns to exclude
  onProgress?: (info: ProgressInfo) => void
}

export interface ProgressInfo {
  file: string
  transferred: number
  total: number
  percentage: number
}

export interface SyncResult {
  success: boolean
  filesTransferred: number
  bytesTransferred: number
  errors: string[]
  dryRun: boolean
}

export class SSHUploadsSyncer {
  private config: SSHUploadsSyncConfig

  constructor(config: SSHUploadsSyncConfig) {
    this.config = config
  }

  /**
   * Check if rsync is available locally
   */
  async checkRsyncAvailable(): Promise<boolean> {
    try {
      await execa('which', ['rsync'])
      return true
    } catch {
      return false
    }
  }

  /**
   * Build the SSH command string for rsync
   */
  private buildSSHCommand(): string {
    const { ssh } = this.config
    const keyPath = ssh.privateKey?.replace('~', os.homedir()) || ''

    let sshCmd = `ssh -p ${ssh.port || 22}`

    if (keyPath) {
      sshCmd += ` -i "${keyPath}"`
    }

    sshCmd += ' -o StrictHostKeyChecking=no'

    return sshCmd
  }

  /**
   * Pull uploads from remote to local
   */
  async pull(options: SyncOptions = {}): Promise<SyncResult> {
    const rsyncAvailable = await this.checkRsyncAvailable()
    if (!rsyncAvailable) {
      return {
        success: false,
        filesTransferred: 0,
        bytesTransferred: 0,
        errors: ['rsync is not installed. Install with: brew install rsync (macOS) or apt install rsync (Linux)'],
        dryRun: options.dryRun || false,
      }
    }

    // Ensure local directory exists
    await fs.mkdir(this.config.localUploadsPath, { recursive: true })

    // Build rsync arguments
    const args: string[] = [
      '-avz', // archive, verbose, compress
      '--progress',
      '-e', this.buildSSHCommand(),
    ]

    if (options.dryRun) {
      args.push('--dry-run')
    }

    if (options.delete) {
      args.push('--delete')
    }

    if (options.exclude) {
      for (const pattern of options.exclude) {
        args.push(`--exclude=${pattern}`)
      }
    }

    // Add source and destination
    const { ssh } = this.config
    const source = `${ssh.username}@${ssh.host}:${this.config.remoteUploadsPath}/`
    const dest = this.config.localUploadsPath + '/'

    args.push(source, dest)

    try {
      const result = await execa('rsync', args, {
        stdio: 'pipe',
        env: {
          ...process.env,
          // Pass passphrase via SSH_ASKPASS if available
          ...(ssh.passphrase ? { RSYNC_PASSWORD: ssh.passphrase } : {}),
        },
      })

      // Parse rsync output for stats
      const stats = this.parseRsyncOutput(result.stdout)

      return {
        success: true,
        filesTransferred: stats.files,
        bytesTransferred: stats.bytes,
        errors: [],
        dryRun: options.dryRun || false,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        filesTransferred: 0,
        bytesTransferred: 0,
        errors: [errorMessage],
        dryRun: options.dryRun || false,
      }
    }
  }

  /**
   * Push uploads from local to remote
   */
  async push(options: SyncOptions = {}): Promise<SyncResult> {
    const rsyncAvailable = await this.checkRsyncAvailable()
    if (!rsyncAvailable) {
      return {
        success: false,
        filesTransferred: 0,
        bytesTransferred: 0,
        errors: ['rsync is not installed'],
        dryRun: options.dryRun || false,
      }
    }

    // Build rsync arguments
    const args: string[] = [
      '-avz',
      '--progress',
      '-e', this.buildSSHCommand(),
    ]

    if (options.dryRun) {
      args.push('--dry-run')
    }

    if (options.delete) {
      args.push('--delete')
    }

    if (options.exclude) {
      for (const pattern of options.exclude) {
        args.push(`--exclude=${pattern}`)
      }
    }

    // Add source and destination (reversed for push)
    const { ssh } = this.config
    const source = this.config.localUploadsPath + '/'
    const dest = `${ssh.username}@${ssh.host}:${this.config.remoteUploadsPath}/`

    args.push(source, dest)

    try {
      const result = await execa('rsync', args, { stdio: 'pipe' })
      const stats = this.parseRsyncOutput(result.stdout)

      return {
        success: true,
        filesTransferred: stats.files,
        bytesTransferred: stats.bytes,
        errors: [],
        dryRun: options.dryRun || false,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        filesTransferred: 0,
        bytesTransferred: 0,
        errors: [errorMessage],
        dryRun: options.dryRun || false,
      }
    }
  }

  /**
   * Parse rsync output to extract transfer stats
   */
  private parseRsyncOutput(output: string): { files: number; bytes: number } {
    // Try to find "sent X bytes" or "total size is X"
    const bytesMatch = output.match(/total size is ([\d,]+)/)
    const filesMatch = output.match(/Number of files: ([\d,]+)/)

    return {
      files: filesMatch ? parseInt(filesMatch[1].replace(/,/g, ''), 10) : 0,
      bytes: bytesMatch ? parseInt(bytesMatch[1].replace(/,/g, ''), 10) : 0,
    }
  }

  /**
   * Get remote uploads size
   */
  async getRemoteSize(): Promise<{ files: number; bytes: number }> {
    try {
      const sshCmd = this.buildSSHCommand()
      const { ssh } = this.config

      const result = await execa('ssh', [
        '-p', String(ssh.port || 22),
        '-i', ssh.privateKey?.replace('~', os.homedir()) || '',
        '-o', 'StrictHostKeyChecking=no',
        `${ssh.username}@${ssh.host}`,
        `du -sb "${this.config.remoteUploadsPath}" && find "${this.config.remoteUploadsPath}" -type f | wc -l`,
      ])

      const lines = result.stdout.trim().split('\n')
      const bytes = parseInt(lines[0]?.split('\t')[0] || '0', 10)
      const files = parseInt(lines[1]?.trim() || '0', 10)

      return { files, bytes }
    } catch {
      return { files: 0, bytes: 0 }
    }
  }
}
