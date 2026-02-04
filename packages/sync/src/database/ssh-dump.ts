// packages/sync/src/database/ssh-dump.ts
/**
 * SSH-based Database Dumper
 * Uses SSH to run WP-CLI on remote server and download the dump via SFTP
 *
 * This is the recommended approach for production databases that only allow
 * local connections (127.0.0.1).
 */

import { NodeSSH } from 'node-ssh'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import type { SSHConfig, DumpOptions } from '../types.js'

export interface SSHDumpConfig {
  ssh: SSHConfig
  wpPath: string // WordPress installation path on remote server
  wpCliPath?: string // Optional custom WP-CLI path (defaults to 'wp')
}

export class SSHDatabaseDumper {
  private config: SSHDumpConfig
  private ssh: NodeSSH

  constructor(config: SSHDumpConfig) {
    this.config = config
    this.ssh = new NodeSSH()
  }

  /**
   * Connect to the SSH server
   */
  private async connect(): Promise<void> {
    const sshConfig: any = {
      host: this.config.ssh.host,
      port: this.config.ssh.port || 22,
      username: this.config.ssh.username,
    }

    if (this.config.ssh.password) {
      sshConfig.password = this.config.ssh.password
    } else if (this.config.ssh.privateKey) {
      const keyPath = this.config.ssh.privateKey.replace('~', os.homedir())
      sshConfig.privateKeyPath = keyPath

      if (this.config.ssh.passphrase) {
        sshConfig.passphrase = this.config.ssh.passphrase
      }
    } else {
      // Default to ~/.ssh/id_rsa
      const defaultKeyPath = path.join(os.homedir(), '.ssh', 'id_rsa')
      try {
        await fs.access(defaultKeyPath)
        sshConfig.privateKeyPath = defaultKeyPath
      } catch {
        // No default key found, connection may fail
      }
    }

    await this.ssh.connect(sshConfig)
  }

  /**
   * Disconnect from SSH server
   */
  private disconnect(): void {
    if (this.ssh.isConnected()) {
      this.ssh.dispose()
    }
  }

  /**
   * Get the WP-CLI command to use
   */
  private getWpCliCommand(): string {
    return this.config.wpCliPath || 'wp'
  }

  /**
   * Export database on remote server and download it
   */
  async generateDumpSQL(options: DumpOptions = {}): Promise<string> {
    const remoteTempFile = `/tmp/stratawp-db-export-${Date.now()}.sql`
    const localTempFile = path.join(os.tmpdir(), `stratawp-db-${Date.now()}.sql`)

    try {
      await this.connect()

      // Build WP-CLI export command
      const wpCli = this.getWpCliCommand()
      let exportCmd = `cd "${this.config.wpPath}" && ${wpCli} db export "${remoteTempFile}" --add-drop-table`

      // Add table filtering if specified
      if (options.tables && options.tables.length > 0) {
        exportCmd += ` --tables=${options.tables.join(',')}`
      }

      if (options.excludeTables && options.excludeTables.length > 0) {
        exportCmd += ` --exclude_tables=${options.excludeTables.join(',')}`
      }

      // Execute export on remote server
      const exportResult = await this.ssh.execCommand(exportCmd)

      if (exportResult.code !== 0) {
        throw new Error(
          `Failed to export database: ${exportResult.stderr || exportResult.stdout}`
        )
      }

      // Download the dump file via SFTP
      await this.ssh.getFile(localTempFile, remoteTempFile)

      // Clean up remote temp file
      await this.ssh.execCommand(`rm -f "${remoteTempFile}"`)

      // Read and return the SQL content
      const sqlContent = await fs.readFile(localTempFile, 'utf8')

      // Clean up local temp file
      await fs.unlink(localTempFile)

      return sqlContent
    } finally {
      this.disconnect()
    }
  }

  /**
   * Export database to a local file
   */
  async dumpToFile(filepath: string, options: DumpOptions = {}): Promise<void> {
    const sql = await this.generateDumpSQL(options)

    if (options.compress || filepath.endsWith('.gz')) {
      const zlib = await import('zlib')
      const { promisify } = await import('util')
      const gzip = promisify(zlib.gzip)
      const compressed = await gzip(Buffer.from(sql, 'utf8'))
      await fs.writeFile(filepath, compressed)
    } else {
      await fs.writeFile(filepath, sql, 'utf8')
    }
  }

  /**
   * Test the SSH connection and WP-CLI availability
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.connect()

      // Test WP-CLI is available
      const wpCli = this.getWpCliCommand()
      const testResult = await this.ssh.execCommand(
        `cd "${this.config.wpPath}" && ${wpCli} --version`
      )

      this.disconnect()

      if (testResult.code === 0) {
        return {
          success: true,
          message: `Connected successfully. WP-CLI version: ${testResult.stdout.trim()}`,
        }
      } else {
        return {
          success: false,
          message: `Connected but WP-CLI not available: ${testResult.stderr}`,
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }
}
