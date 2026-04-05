// packages/sync/src/snapshots/manager.ts
import * as fs from 'fs/promises'
import * as path from 'path'
import * as crypto from 'crypto'
import * as zlib from 'zlib'
import { promisify } from 'util'
import tar from 'tar'
import type { SnapshotManifest } from '../types.js'

const gzip = promisify(zlib.gzip)
const gunzip = promisify(zlib.gunzip)

export interface CreateSnapshotOptions {
  environment: string
  themePath: string
  databaseDump: string
  gitRef?: string
  gitBranch?: string
  themeVersion?: string
  wordpressVersion?: string
  phpVersion?: string
}

export class SnapshotManager {
  private basePath: string
  private indexPath: string

  /** Directories and files excluded from snapshot archives */
  private static readonly SNAPSHOT_EXCLUDES = [
    'node_modules',
    '.stratawp-snapshots',
    '.git',
    'src',
    'e2e',
    '__tests__',
    '.playwright-mcp',
    '.claude',
    '.turbo',
    '.cache',
  ]

  constructor(basePath: string = '.stratawp-snapshots') {
    this.basePath = basePath
    this.indexPath = path.join(basePath, 'snapshots.json')
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.basePath, { recursive: true })

    try {
      await fs.access(this.indexPath)
    } catch {
      await fs.writeFile(this.indexPath, '[]', 'utf8')
    }
  }

  async createSnapshot(options: CreateSnapshotOptions): Promise<SnapshotManifest> {
    await this.initialize()

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const id = `${timestamp}_${options.environment}`
    const snapshotDir = path.join(this.basePath, id)

    await fs.mkdir(snapshotDir, { recursive: true })

    // Archive theme files (excluding node_modules, snapshots, dev files)
    const themeArchive = path.join(snapshotDir, 'theme.tar.gz')
    const themeFiles = await this.getFileList(options.themePath)

    await tar.create(
      {
        gzip: true,
        file: themeArchive,
        cwd: path.dirname(options.themePath),
        filter: (entryPath) => {
          const parts = entryPath.split(path.sep)
          return !parts.some((part) =>
            SnapshotManager.SNAPSHOT_EXCLUDES.includes(part)
          )
        },
      },
      [path.basename(options.themePath)]
    )

    const themeStats = await fs.stat(themeArchive)
    const themeHash = await this.hashFile(themeArchive)

    // Save database dump
    const dbPath = path.join(snapshotDir, 'database.sql.gz')
    const compressedDb = await gzip(Buffer.from(options.databaseDump, 'utf8'))
    await fs.writeFile(dbPath, compressedDb)

    const dbStats = await fs.stat(dbPath)
    const dbHash = await this.hashFile(dbPath)

    // Create manifest
    const manifest: SnapshotManifest = {
      id,
      environment: options.environment,
      createdAt: new Date().toISOString(),
      gitRef: options.gitRef,
      gitBranch: options.gitBranch,
      themeVersion: options.themeVersion,
      wordpressVersion: options.wordpressVersion,
      phpVersion: options.phpVersion,
      files: {
        count: themeFiles.length,
        sizeBytes: themeStats.size,
        hash: themeHash,
      },
      database: {
        tables: this.countTables(options.databaseDump),
        sizeBytes: dbStats.size,
        hash: dbHash,
      },
      status: 'current',
    }

    // Save manifest
    await fs.writeFile(
      path.join(snapshotDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    )

    // Update index
    await this.addToIndex(manifest)

    // Mark previous current as not current
    await this.updatePreviousStatus(id, options.environment)

    return manifest
  }

  async listSnapshots(environment?: string): Promise<SnapshotManifest[]> {
    await this.initialize()

    const indexContent = await fs.readFile(this.indexPath, 'utf8')
    let snapshots: SnapshotManifest[] = JSON.parse(indexContent)

    if (environment) {
      snapshots = snapshots.filter((s) => s.environment === environment)
    }

    // Sort by date descending
    return snapshots.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  async getSnapshot(id: string): Promise<SnapshotManifest | null> {
    const snapshots = await this.listSnapshots()
    return snapshots.find((s) => s.id === id) || null
  }

  async deleteSnapshot(id: string): Promise<void> {
    const snapshotDir = path.join(this.basePath, id)

    await fs.rm(snapshotDir, { recursive: true, force: true })

    // Update index
    const snapshots = await this.listSnapshots()
    const filtered = snapshots.filter((s) => s.id !== id)
    await fs.writeFile(this.indexPath, JSON.stringify(filtered, null, 2), 'utf8')
  }

  async markStable(id: string): Promise<void> {
    const snapshots = await this.listSnapshots()
    const snapshot = snapshots.find((s) => s.id === id)

    if (snapshot) {
      snapshot.status = 'stable'
      await fs.writeFile(this.indexPath, JSON.stringify(snapshots, null, 2), 'utf8')

      // Update manifest file too
      const manifestPath = path.join(this.basePath, id, 'manifest.json')
      await fs.writeFile(manifestPath, JSON.stringify(snapshot, null, 2), 'utf8')
    }
  }

  async extractTheme(id: string, targetPath: string): Promise<void> {
    const archivePath = path.join(this.basePath, id, 'theme.tar.gz')

    try {
      await fs.access(archivePath)
    } catch {
      throw new Error(`Snapshot not found: ${id}`)
    }

    await tar.extract({
      file: archivePath,
      cwd: targetPath,
    })
  }

  async getDatabaseDump(id: string): Promise<string> {
    const dbPath = path.join(this.basePath, id, 'database.sql.gz')

    try {
      await fs.access(dbPath)
    } catch {
      throw new Error(`Snapshot not found: ${id}`)
    }

    const compressed = await fs.readFile(dbPath)
    const decompressed = await gunzip(compressed)

    return decompressed.toString('utf8')
  }

  private async getFileList(dirPath: string): Promise<string[]> {
    const files: string[] = []
    const excludes = SnapshotManager.SNAPSHOT_EXCLUDES

    async function walk(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (excludes.includes(entry.name)) continue
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(fullPath)
        } else {
          files.push(fullPath)
        }
      }
    }

    await walk(dirPath)
    return files
  }

  private async hashFile(filepath: string): Promise<string> {
    const content = await fs.readFile(filepath)
    return crypto.createHash('sha256').update(content).digest('hex')
  }

  private countTables(sql: string): number {
    const matches = sql.match(/CREATE TABLE/gi)
    return matches ? matches.length : 0
  }

  private async addToIndex(manifest: SnapshotManifest): Promise<void> {
    const snapshots = await this.listSnapshots()
    snapshots.unshift(manifest)
    await fs.writeFile(this.indexPath, JSON.stringify(snapshots, null, 2), 'utf8')
  }

  private async updatePreviousStatus(
    currentId: string,
    environment: string
  ): Promise<void> {
    const snapshots = await this.listSnapshots()

    for (const snapshot of snapshots) {
      if (snapshot.environment === environment && snapshot.id !== currentId) {
        if (snapshot.status === 'current') {
          snapshot.status = 'archived'
        }
      }
    }

    await fs.writeFile(this.indexPath, JSON.stringify(snapshots, null, 2), 'utf8')
  }
}
