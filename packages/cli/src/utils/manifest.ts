/**
 * Deployment Manifest System
 * Tracks deployment history for rollback and change detection
 */

import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import type { FileRecord } from './file-filter'

export interface DeploymentManifest {
  id: string
  environment: string
  timestamp: number
  files: FileRecord[]
  buildHash: string
  status: 'success' | 'failed' | 'rolled-back'
  metadata: {
    totalFiles: number
    totalSize: number
    addedFiles?: number
    modifiedFiles?: number
    deletedFiles?: number
    backupPath?: string
    commitHash?: string
    deployedBy?: string
    errorMessage?: string
  }
}

export class ManifestManager {
  private manifestDir: string
  private historyDir: string

  constructor() {
    const homeDir = os.homedir()
    this.manifestDir = path.join(homeDir, '.stratawp', 'deployments')
    this.historyDir = path.join(this.manifestDir, 'history')
  }

  /**
   * Create a new deployment manifest
   */
  async create(
    environment: string,
    files: FileRecord[],
    buildHash: string,
    metadata: Partial<DeploymentManifest['metadata']> = {}
  ): Promise<DeploymentManifest> {
    const manifest: DeploymentManifest = {
      id: this.generateManifestId(),
      environment,
      timestamp: Date.now(),
      files,
      buildHash,
      status: 'success',
      metadata: {
        totalFiles: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        deployedBy: os.userInfo().username,
        ...metadata,
      },
    }

    return manifest
  }

  /**
   * Save deployment manifest
   */
  async save(manifest: DeploymentManifest): Promise<void> {
    await fs.ensureDir(this.manifestDir)
    await fs.ensureDir(this.historyDir)

    // Save as current manifest for this environment
    const currentPath = path.join(this.manifestDir, `${manifest.environment}.json`)
    await fs.writeJSON(currentPath, manifest, { spaces: 2 })

    // Save to history with timestamp
    const historyPath = path.join(this.historyDir, `${manifest.environment}-${manifest.id}.json`)
    await fs.writeJSON(historyPath, manifest, { spaces: 2 })

    // Cleanup old history (keep last 10 deployments per environment)
    await this.cleanupHistory(manifest.environment, 10)
  }

  /**
   * Load the current manifest for an environment
   */
  async loadCurrent(environment: string): Promise<DeploymentManifest | null> {
    const currentPath = path.join(this.manifestDir, `${environment}.json`)

    if (!(await fs.pathExists(currentPath))) {
      return null
    }

    return await fs.readJSON(currentPath)
  }

  /**
   * Load a specific manifest by ID
   */
  async loadById(environment: string, id: string): Promise<DeploymentManifest | null> {
    const historyPath = path.join(this.historyDir, `${environment}-${id}.json`)

    if (!(await fs.pathExists(historyPath))) {
      return null
    }

    return await fs.readJSON(historyPath)
  }

  /**
   * Load deployment history for an environment
   */
  async loadHistory(environment: string, limit: number = 10): Promise<DeploymentManifest[]> {
    await fs.ensureDir(this.historyDir)

    const files = await fs.readdir(this.historyDir)
    const envFiles = files
      .filter((file) => file.startsWith(`${environment}-`) && file.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, limit)

    const manifests: DeploymentManifest[] = []
    for (const file of envFiles) {
      const manifest = await fs.readJSON(path.join(this.historyDir, file))
      manifests.push(manifest)
    }

    return manifests.sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Update manifest status
   */
  async updateStatus(
    environment: string,
    id: string,
    status: DeploymentManifest['status'],
    errorMessage?: string
  ): Promise<void> {
    // Update current manifest
    const current = await this.loadCurrent(environment)
    if (current && current.id === id) {
      current.status = status
      if (errorMessage) {
        current.metadata.errorMessage = errorMessage
      }
      await this.save(current)
    }

    // Update history entry
    const historyPath = path.join(this.historyDir, `${environment}-${id}.json`)
    if (await fs.pathExists(historyPath)) {
      const manifest = await fs.readJSON(historyPath)
      manifest.status = status
      if (errorMessage) {
        manifest.metadata.errorMessage = errorMessage
      }
      await fs.writeJSON(historyPath, manifest, { spaces: 2 })
    }
  }

  /**
   * Get deployment statistics
   */
  async getStats(environment?: string): Promise<{
    totalDeployments: number
    successfulDeployments: number
    failedDeployments: number
    lastDeployment?: DeploymentManifest
    environments: string[]
  }> {
    await fs.ensureDir(this.historyDir)

    const files = await fs.readdir(this.historyDir)
    const envFilter = environment ? `${environment}-` : ''
    const envFiles = files.filter((file) => file.startsWith(envFilter) && file.endsWith('.json'))

    const manifests: DeploymentManifest[] = []
    for (const file of envFiles) {
      const manifest = await fs.readJSON(path.join(this.historyDir, file))
      manifests.push(manifest)
    }

    // Get unique environments
    const environments = [...new Set(manifests.map((m) => m.environment))]

    const stats = {
      totalDeployments: manifests.length,
      successfulDeployments: manifests.filter((m) => m.status === 'success').length,
      failedDeployments: manifests.filter((m) => m.status === 'failed').length,
      lastDeployment: manifests.sort((a, b) => b.timestamp - a.timestamp)[0],
      environments,
    }

    return stats
  }

  /**
   * Delete all deployment data for an environment
   */
  async deleteEnvironment(environment: string): Promise<void> {
    // Delete current manifest
    const currentPath = path.join(this.manifestDir, `${environment}.json`)
    if (await fs.pathExists(currentPath)) {
      await fs.remove(currentPath)
    }

    // Delete history entries
    const files = await fs.readdir(this.historyDir)
    const envFiles = files.filter((file) => file.startsWith(`${environment}-`))

    for (const file of envFiles) {
      await fs.remove(path.join(this.historyDir, file))
    }
  }

  /**
   * Cleanup old history entries
   */
  private async cleanupHistory(environment: string, keepLast: number): Promise<void> {
    const files = await fs.readdir(this.historyDir)
    const envFiles = files
      .filter((file) => file.startsWith(`${environment}-`) && file.endsWith('.json'))
      .sort()
      .reverse()

    // Delete old entries
    const toDelete = envFiles.slice(keepLast)
    for (const file of toDelete) {
      await fs.remove(path.join(this.historyDir, file))
    }
  }

  /**
   * Generate unique manifest ID
   */
  private generateManifestId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `${timestamp}-${random}`
  }

  /**
   * Format timestamp for display
   */
  static formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  /**
   * Get time ago string
   */
  static getTimeAgo(timestamp: number): string {
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    } else {
      return `${seconds} second${seconds > 1 ? 's' : ''} ago`
    }
  }
}
