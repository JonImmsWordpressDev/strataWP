/**
 * SSH/Rsync Deployer
 * Handles deployment to VPS/cloud servers with SSH access
 */

import { BaseDeployer } from './base'
import type { DeployOptions, PostDeployResult, ValidationCheck } from './base'
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
   * Includes proper SSH key and port handling
   */
  private async uploadWithRsync(files: FileRecord[]): Promise<void> {
    // Get local base path (common parent directory of all files)
    const localBasePath = process.cwd()

    // Build SSH command with proper key handling
    let sshCommand = `ssh -p ${this.config.port || 22}`

    // Include SSH key if configured
    if (this.config.privateKey) {
      const keyPath = this.config.privateKey.replace(
        '~',
        process.env.HOME || ''
      )
      sshCommand += ` -i "${keyPath}"`
    }

    sshCommand += ' -o StrictHostKeyChecking=no'

    // Build rsync arguments
    const args: string[] = [
      '-avz', // archive, verbose, compress
      '--progress',
      '-e',
      sshCommand,
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
      await execa('rsync', args, {
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
   * Cleanup old backups, keeping the most recent N
   * Returns the number of backups removed
   */
  async cleanupOldBackups(keepLast: number = 1): Promise<number> {
    const backups = await this.listBackups()
    const toDelete = backups.slice(keepLast)

    for (const backup of toDelete) {
      try {
        await this.ssh.execCommand(`rm -rf "${backup.path}"`)
      } catch {
        // Continue cleanup even if individual deletion fails
      }
    }

    return toDelete.length
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

  /**
   * Execute a command on remote server (non-throwing variant)
   * Returns result even if command fails — useful for optional post-deploy steps
   */
  private async execCommandSafe(
    command: string,
    cwd?: string
  ): Promise<{ success: boolean; stdout: string; stderr: string }> {
    try {
      const result = await this.ssh.execCommand(command, {
        cwd: cwd || this.config.remotePath,
      })
      return {
        success: result.code === 0,
        stdout: result.stdout,
        stderr: result.stderr,
      }
    } catch (error) {
      return {
        success: false,
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Check if WP-CLI is available on the remote server
   */
  private async isWpCliAvailable(): Promise<boolean> {
    const result = await this.execCommandSafe('which wp')
    return result.success
  }

  /**
   * Post-deploy lifecycle hook
   * Flushes WordPress cache, resets OPcache, cleans up old backups,
   * and runs any user-defined WP-CLI commands.
   */
  override async postDeploy(options: DeployOptions): Promise<PostDeployResult> {
    const postDeployConfig = options.postDeploy || this.config.postDeploy || {}
    const wpRootPath = this.getWpRootPath()
    const result: PostDeployResult = {
      cacheCleared: false,
      opcacheReset: false,
      backupsCleanedUp: 0,
      customCommands: [],
    }

    // 1. Flush WordPress cache (default: true)
    if (postDeployConfig.clearCache !== false) {
      const hasWpCli = await this.isWpCliAvailable()
      if (hasWpCli) {
        const flushResult = await this.execCommandSafe(
          `cd "${wpRootPath}" && wp cache flush && wp transient delete --all`
        )
        result.cacheCleared = flushResult.success
      }
    }

    // 2. Reset PHP OPcache (default: true)
    if (postDeployConfig.resetOpcache !== false) {
      // Create a temporary PHP script to reset OPcache
      // Use heredoc-style to avoid shell escaping issues
      const tmpPath = '/tmp/stratawp-opcache-reset.php'
      const writeResult = await this.execCommandSafe(
        `cat > ${tmpPath} << 'STRATAWP_EOF'
<?php
if (function_exists('opcache_reset')) {
  opcache_reset();
  echo 'OPcache reset successfully';
} else {
  echo 'OPcache not available';
}
STRATAWP_EOF`
      )

      if (writeResult.success) {
        const execResult = await this.execCommandSafe(
          `cd "${wpRootPath}" && php ${tmpPath} 2>/dev/null; rm -f ${tmpPath}`
        )
        result.opcacheReset = execResult.success &&
          execResult.stdout.includes('reset successfully')
      }
    }

    // 3. Cleanup old backups
    const keepLast = options.keepBackups ?? this.config.backup?.keepLast ?? 1
    if (keepLast > 0) {
      result.backupsCleanedUp = await this.cleanupOldBackups(keepLast)
    }

    // 4. Run user-defined WP-CLI commands
    if (
      postDeployConfig.wpCliCommands &&
      postDeployConfig.wpCliCommands.length > 0
    ) {
      const hasWpCli = await this.isWpCliAvailable()
      if (hasWpCli) {
        for (const command of postDeployConfig.wpCliCommands) {
          const cmdResult = await this.execCommandSafe(
            `cd "${wpRootPath}" && ${command}`
          )
          result.customCommands.push({
            command,
            success: cmdResult.success,
            output: cmdResult.stdout || cmdResult.stderr,
          })
        }
      }
    }

    return result
  }

  /**
   * Post-deploy validation
   * Checks critical theme files exist, WordPress health via WP-CLI,
   * and optionally checks site HTTP response
   */
  override async validate(): Promise<{
    success: boolean
    checks: ValidationCheck[]
  }> {
    const checks: ValidationCheck[] = []
    const wpRootPath = this.getWpRootPath()

    // 1. Check critical theme files exist
    const criticalFiles = ['style.css', 'index.php']
    for (const file of criticalFiles) {
      const remotePath = path.posix.join(this.config.remotePath, file)
      const exists = await this.pathExists(remotePath)
      checks.push({
        name: `File: ${file}`,
        passed: exists,
        message: exists ? 'exists' : 'missing on remote',
      })
    }

    // 2. Check theme.json exists (FSE themes)
    const themeJsonPath = path.posix.join(
      this.config.remotePath,
      'theme.json'
    )
    const themeJsonExists = await this.pathExists(themeJsonPath)
    if (themeJsonExists) {
      checks.push({
        name: 'File: theme.json',
        passed: true,
        message: 'exists',
      })
    }

    // 3. WordPress health check via WP-CLI
    const hasWpCli = await this.isWpCliAvailable()
    if (hasWpCli) {
      const wpCheck = await this.execCommandSafe(
        `cd "${wpRootPath}" && wp eval "echo 'OK';"`
      )
      checks.push({
        name: 'WordPress loads',
        passed: wpCheck.success && wpCheck.stdout.includes('OK'),
        message: wpCheck.success
          ? 'healthy'
          : (wpCheck.stderr || 'unknown error').slice(0, 100),
      })
    }

    // 4. HTTP health check if remote URL configured
    if (this.config.database?.remoteUrl) {
      const urlCheck = await this.execCommandSafe(
        `curl -sL -o /dev/null -w "%{http_code}" "${this.config.database.remoteUrl}" 2>/dev/null`
      )
      const statusCode = urlCheck.stdout.trim()
      const isHealthy =
        statusCode === '200' ||
        statusCode === '301' ||
        statusCode === '302'
      checks.push({
        name: 'Site responds',
        passed: isHealthy,
        message: `HTTP ${statusCode}`,
      })
    }

    return {
      success: checks.every((c) => c.passed),
      checks,
    }
  }

  /**
   * Sync an FSE template from local content to remote database via WP-CLI
   * Uses wp eval-file to safely update post content without shell escaping issues
   */
  async syncTemplate(
    templateContent: string,
    templateSlug: string,
    wpRootPath: string
  ): Promise<{ success: boolean; message: string }> {
    if (!this.isConnected) {
      throw new Error('Not connected to SSH server')
    }

    const timestamp = Date.now()
    const localTmpPath = path.join(
      process.env.TMPDIR || '/tmp',
      `stratawp-template-${timestamp}.html`
    )
    const remoteTmpPath = `/tmp/stratawp-template-${timestamp}.html`
    const localPhpPath = path.join(
      process.env.TMPDIR || '/tmp',
      `stratawp-template-update-${timestamp}.php`
    )
    const remotePhpPath = `/tmp/stratawp-template-update-${timestamp}.php`

    try {
      // 1. Write content to local temp file
      await fs.writeFile(localTmpPath, templateContent)

      // 2. Upload content file to remote
      await this.ssh.putFile(localTmpPath, remoteTmpPath)

      // 3. Find the remote template ID for this slug
      const listResult = await this.execCommandSafe(
        `cd "${wpRootPath}" && wp post list --post_type=wp_template --fields=ID,post_name --format=csv 2>/dev/null`
      )

      if (!listResult.success) {
        return {
          success: false,
          message: 'Failed to list remote templates',
        }
      }

      // Parse CSV output to find the template
      const lines = listResult.stdout.trim().split('\n').filter(Boolean)
      let remoteId: string | null = null

      for (const line of lines) {
        const cleanLine = line.replace(/\r/g, '')
        // Match either "id,slug" or "id,theme//slug"
        if (
          cleanLine.endsWith(`,${templateSlug}`) ||
          cleanLine.includes(`//${templateSlug}`)
        ) {
          remoteId = cleanLine.split(',')[0].trim()
          break
        }
      }

      if (!remoteId) {
        return {
          success: false,
          message: `Template '${templateSlug}' not found on remote`,
        }
      }

      // 4. Create PHP updater script and upload it
      const phpScript = `<?php
$content = file_get_contents('${remoteTmpPath}');
if ($content === false) {
  echo 'ERROR: Could not read template file';
  exit(1);
}
$result = wp_update_post([
  'ID' => ${remoteId},
  'post_content' => $content,
], true);
if (is_wp_error($result)) {
  echo 'ERROR: ' . $result->get_error_message();
  exit(1);
}
echo 'OK: Updated template ID ' . $result;
`
      await fs.writeFile(localPhpPath, phpScript)
      await this.ssh.putFile(localPhpPath, remotePhpPath)

      // 5. Execute the updater via wp eval-file
      const updateResult = await this.execCommandSafe(
        `cd "${wpRootPath}" && wp eval-file "${remotePhpPath}"`
      )

      // 6. Cleanup remote temp files
      await this.execCommandSafe(
        `rm -f "${remoteTmpPath}" "${remotePhpPath}"`
      )

      if (updateResult.success && updateResult.stdout.includes('OK')) {
        return { success: true, message: updateResult.stdout.trim() }
      } else {
        return {
          success: false,
          message:
            updateResult.stderr || updateResult.stdout || 'Unknown error',
        }
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    } finally {
      // Always cleanup local temp files
      await fs.remove(localTmpPath).catch(() => {})
      await fs.remove(localPhpPath).catch(() => {})
      // Attempt remote cleanup
      await this.execCommandSafe(
        `rm -f "${remoteTmpPath}" "${remotePhpPath}"`
      ).catch(() => {})
    }
  }

  /**
   * List all FSE templates on remote via WP-CLI
   */
  async listRemoteTemplates(
    wpRootPath: string
  ): Promise<Array<{ id: string; slug: string }>> {
    const result = await this.execCommandSafe(
      `cd "${wpRootPath}" && wp post list --post_type=wp_template --fields=ID,post_name --format=csv 2>/dev/null`
    )

    if (!result.success) return []

    const templates: Array<{ id: string; slug: string }> = []
    const lines = result.stdout.trim().split('\n').filter(Boolean)

    // Skip CSV header
    for (let i = 1; i < lines.length; i++) {
      const cleanLine = lines[i].replace(/\r/g, '')
      const commaIdx = cleanLine.indexOf(',')
      if (commaIdx > 0) {
        const id = cleanLine.substring(0, commaIdx).trim()
        let slug = cleanLine.substring(commaIdx + 1).trim()
        // Strip theme prefix (e.g. "theme-name//front-page" → "front-page")
        const slashIdx = slug.indexOf('//')
        if (slashIdx >= 0) {
          slug = slug.substring(slashIdx + 2)
        }
        templates.push({ id, slug })
      }
    }

    return templates
  }
}
