/**
 * File Filtering System for Deployment
 * Handles .deployignore and include/exclude patterns
 */

import fs from 'fs-extra'
import path from 'path'
import { minimatch } from 'minimatch'
import crypto from 'crypto'

export interface FileRecord {
  localPath: string
  relativePath: string
  remotePath: string
  size: number
  hash: string
  modified: number
}

export interface FilterOptions {
  include?: string[]
  exclude?: string[]
  deployIgnorePath?: string
  verbose?: boolean
}

export class FileFilter {
  private includePatterns: string[]
  private excludePatterns: string[]
  private baseDir: string
  private verbose: boolean

  constructor(baseDir: string, options: FilterOptions = {}) {
    this.baseDir = baseDir
    this.includePatterns = options.include || []
    this.excludePatterns = options.exclude || []
    this.verbose = options.verbose || false
  }

  private log(msg: string): void {
    if (this.verbose) {
      console.log(`[DEBUG] ${msg}`)
    }
  }

  /**
   * Load patterns from .deployignore file
   */
  async loadDeployIgnore(deployIgnorePath?: string): Promise<void> {
    const ignoreFile = deployIgnorePath || path.join(this.baseDir, '.deployignore')

    if (!(await fs.pathExists(ignoreFile))) {
      return
    }

    const content = await fs.readFile(ignoreFile, 'utf-8')
    const patterns = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))

    this.excludePatterns.push(...patterns)
  }

  /**
   * Scan directory and return filtered file list
   */
  async scanDirectory(
    remotePath: string,
    dir: string = this.baseDir,
    results: FileRecord[] = []
  ): Promise<FileRecord[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const relativePath = path.relative(this.baseDir, fullPath)

      if (entry.isDirectory()) {
        // Check if directory should be excluded
        if (!this.shouldExclude(relativePath + '/')) {
          await this.scanDirectory(remotePath, fullPath, results)
        }
      } else if (entry.isFile()) {
        // Check if file should be included
        if (this.shouldInclude(relativePath)) {
          const stats = await fs.stat(fullPath)
          const hash = await this.calculateFileHash(fullPath)

          results.push({
            localPath: fullPath,
            relativePath,
            remotePath: path.posix.join(remotePath, relativePath),
            size: stats.size,
            hash,
            modified: stats.mtimeMs,
          })
        }
      }
    }

    return results
  }

  /**
   * Check if a file should be included
   */
  private shouldInclude(filePath: string): boolean {
    // First check if it's excluded
    if (this.shouldExclude(filePath)) {
      this.log(`EXCLUDED: ${filePath}`)
      return false
    }

    // If no include patterns, include by default
    if (this.includePatterns.length === 0) {
      this.log(`INCLUDED (no patterns): ${filePath}`)
      return true
    }

    // Check against include patterns
    const matches = this.matchesAnyPattern(filePath, this.includePatterns)
    if (matches) {
      this.log(`INCLUDED (matched pattern): ${filePath}`)
    } else {
      this.log(`SKIPPED (no pattern match): ${filePath}`)
    }
    return matches
  }

  /**
   * Check if a file should be excluded
   */
  private shouldExclude(filePath: string): boolean {
    // Common exclusions that should always apply
    const alwaysExclude = ['.git', '.git/', 'node_modules', 'node_modules/', '.DS_Store']

    // Check always excluded paths
    if (alwaysExclude.some((pattern) => filePath.includes(pattern))) {
      this.log(`EXCLUDED (always): ${filePath}`)
      return true
    }

    // Check against exclude patterns
    const excluded = this.matchesAnyPattern(filePath, this.excludePatterns)
    if (excluded) {
      this.log(`EXCLUDED (pattern match): ${filePath}`)
    }
    return excluded
  }

  /**
   * Check if a file path matches any pattern
   */
  private matchesAnyPattern(filePath: string, patterns: string[]): boolean {
    return patterns.some((pattern) => {
      // Support both forward and backslashes
      const normalizedPath = filePath.replace(/\\/g, '/')
      const normalizedPattern = pattern.replace(/\\/g, '/')

      return minimatch(normalizedPath, normalizedPattern, {
        dot: true,
        matchBase: true,
      })
    })
  }

  /**
   * Calculate MD5 hash of a file
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath)
    return crypto.createHash('md5').update(content).digest('hex')
  }

  /**
   * Compare two file lists and return changes
   */
  static compareFileLists(
    current: FileRecord[],
    previous: FileRecord[]
  ): {
    added: FileRecord[]
    modified: FileRecord[]
    deleted: FileRecord[]
    unchanged: FileRecord[]
  } {
    const currentMap = new Map(current.map((file) => [file.relativePath, file]))
    const previousMap = new Map(previous.map((file) => [file.relativePath, file]))

    const added: FileRecord[] = []
    const modified: FileRecord[] = []
    const unchanged: FileRecord[] = []

    // Check for added or modified files
    for (const [relativePath, currentFile] of currentMap) {
      const previousFile = previousMap.get(relativePath)

      if (!previousFile) {
        added.push(currentFile)
      } else if (currentFile.hash !== previousFile.hash) {
        modified.push(currentFile)
      } else {
        unchanged.push(currentFile)
      }
    }

    // Check for deleted files
    const deleted: FileRecord[] = []
    for (const [relativePath, previousFile] of previousMap) {
      if (!currentMap.has(relativePath)) {
        deleted.push(previousFile)
      }
    }

    return { added, modified, deleted, unchanged }
  }

  /**
   * Format file size for display
   */
  static formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  /**
   * Calculate total size of file list
   */
  static calculateTotalSize(files: FileRecord[]): number {
    return files.reduce((total, file) => total + file.size, 0)
  }
}

/**
 * Create default .deployignore file
 */
export async function createDefaultDeployIgnore(themePath: string): Promise<void> {
  const deployIgnorePath = path.join(themePath, '.deployignore')

  // Don't overwrite existing file
  if (await fs.pathExists(deployIgnorePath)) {
    return
  }

  const content = `# StrataWP Deployment Ignore File
# Patterns here will be excluded from deployment

# Dependencies
node_modules/
vendor/

# Source files (not needed on production)
src/
*.ts
*.tsx
tsconfig.json
vite.config.ts
package.json
pnpm-lock.yaml
composer.json
composer.lock

# Development files
.turbo/
.git/
.gitignore
.DS_Store
*.log
.env*
*.md
README*

# IDE files
.idea/
.vscode/
*.swp
*.swo

# Testing
tests/
*.test.*
*.spec.*
coverage/

# Built assets are INCLUDED by default (don't ignore dist/)
# Add specific patterns if you need to exclude certain built files
`

  await fs.writeFile(deployIgnorePath, content)
}
