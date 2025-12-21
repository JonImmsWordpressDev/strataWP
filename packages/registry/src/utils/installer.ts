/**
 * Component Installer
 * Handles downloading and installing components
 */

import fs from 'fs-extra'
import path from 'path'
import * as tar from 'tar'
import fetch from 'node-fetch'
import { execa } from 'execa'
import type { InstallOptions, ComponentMetadata } from '../types'
import { RegistryClient } from './registry-client'

export class ComponentInstaller {
  private registryClient: RegistryClient
  private tempDir: string

  constructor() {
    this.registryClient = new RegistryClient()
    this.tempDir = path.join(process.cwd(), '.stratawp-temp')
  }

  /**
   * Install a component from the registry
   */
  async install(
    packageName: string,
    options: InstallOptions = {}
  ): Promise<void> {
    try {
      // Get component info
      const info = await this.registryClient.getInfo(packageName)
      const version = options.version || info.version

      // Create temp directory
      await fs.ensureDir(this.tempDir)

      // Download tarball
      const tarballUrl = await this.registryClient.getTarballUrl(
        packageName,
        version
      )
      const tarballPath = path.join(this.tempDir, `${packageName}-${version}.tgz`)
      await this.downloadFile(tarballUrl, tarballPath)

      // Extract tarball
      const extractDir = path.join(this.tempDir, `${packageName}-${version}`)
      await fs.ensureDir(extractDir)
      await tar.extract({
        file: tarballPath,
        cwd: extractDir,
      })

      // Read component metadata
      const packageJsonPath = path.join(extractDir, 'package', 'package.json')
      const packageJson = await fs.readJSON(packageJsonPath)
      const metadata: ComponentMetadata = packageJson.stratawp || {}

      // Run pre-install hook if exists
      if (metadata.installation?.hooks?.preInstall) {
        await this.runHook(
          metadata.installation.hooks.preInstall,
          path.join(extractDir, 'package')
        )
      }

      // Determine target directory
      const targetDir = options.targetDir || this.getTargetDirectory(metadata.type)
      await fs.ensureDir(targetDir)

      // Copy files to target directory
      const sourceDir = path.join(extractDir, 'package')
      const componentDir = path.join(targetDir, this.getComponentDirName(packageName))

      // Check if component already exists
      if (await fs.pathExists(componentDir)) {
        if (!options.force) {
          throw new Error(
            `Component already exists at ${componentDir}. Use --force to overwrite.`
          )
        }
        await fs.remove(componentDir)
      }

      // Copy files
      await this.copyComponentFiles(sourceDir, componentDir, metadata.files)

      // Install dependencies if any
      if (metadata.dependencies && Object.keys(metadata.dependencies).length > 0) {
        await this.installDependencies(componentDir)
      }

      // Run post-install hook if exists
      if (metadata.installation?.hooks?.postInstall) {
        await this.runHook(
          metadata.installation.hooks.postInstall,
          componentDir
        )
      }

      // Cleanup temp directory
      await fs.remove(this.tempDir)
    } catch (error) {
      // Cleanup on error
      if (await fs.pathExists(this.tempDir)) {
        await fs.remove(this.tempDir)
      }
      throw error
    }
  }

  /**
   * Download a file from URL
   */
  private async downloadFile(url: string, filePath: string): Promise<void> {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`)
    }

    const buffer = await response.arrayBuffer()
    await fs.writeFile(filePath, Buffer.from(buffer))
  }

  /**
   * Get target directory based on component type
   */
  private getTargetDirectory(type: string): string {
    const cwd = process.cwd()

    switch (type) {
      case 'block':
        return path.join(cwd, 'src', 'blocks')
      case 'component':
        return path.join(cwd, 'inc', 'Components')
      case 'pattern':
        return path.join(cwd, 'patterns')
      case 'template':
        return path.join(cwd, 'templates')
      case 'part':
        return path.join(cwd, 'parts')
      default:
        return path.join(cwd, 'vendor', 'stratawp')
    }
  }

  /**
   * Get component directory name from package name
   */
  private getComponentDirName(packageName: string): string {
    // Remove @stratawp/ prefix and convert to directory name
    return packageName.replace('@stratawp/', '').replace('-', '_')
  }

  /**
   * Copy component files to target directory
   */
  private async copyComponentFiles(
    sourceDir: string,
    targetDir: string,
    fileConfig?: {
      include?: string[]
      exclude?: string[]
    }
  ): Promise<void> {
    const exclude = fileConfig?.exclude || [
      'node_modules',
      'package.json',
      'package-lock.json',
      'pnpm-lock.yaml',
      '.git',
      '.gitignore',
      'tests',
      '*.test.ts',
      '*.spec.ts',
    ]

    await fs.copy(sourceDir, targetDir, {
      filter: (src: string) => {
        const relativePath = path.relative(sourceDir, src)

        // Exclude specified patterns
        for (const pattern of exclude) {
          if (relativePath.includes(pattern)) {
            return false
          }
        }

        // Include only specified patterns if provided
        if (fileConfig?.include && fileConfig.include.length > 0) {
          for (const pattern of fileConfig.include) {
            if (relativePath.includes(pattern)) {
              return true
            }
          }
          return false
        }

        return true
      },
    })
  }

  /**
   * Install component dependencies
   */
  private async installDependencies(componentDir: string): Promise<void> {
    const packageJsonPath = path.join(componentDir, 'package.json')

    if (await fs.pathExists(packageJsonPath)) {
      // Check if pnpm is available
      try {
        await execa('pnpm', ['--version'])
        await execa('pnpm', ['install'], { cwd: componentDir })
      } catch {
        // Fallback to npm
        await execa('npm', ['install'], { cwd: componentDir })
      }
    }
  }

  /**
   * Run installation hook
   */
  private async runHook(hook: string, cwd: string): Promise<void> {
    await execa('sh', ['-c', hook], { cwd })
  }
}
