import type { Plugin } from 'vite'
import { writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { mkdir } from 'fs/promises'
import type { ManifestOptions, WordPressManifest, ManifestEntry } from '../types'

/**
 * Generate WordPress-compatible asset manifest
 *
 * This manifest helps WordPress properly enqueue Vite-built assets
 * with correct dependencies, versions, and URLs.
 */
export function wpForgeManifest(options: ManifestOptions = {}): Plugin {
  const {
    enabled = true,
    output = 'dist/.vite/manifest.json',
    wordpress = true,
  } = options

  let rootDir: string

  return {
    name: 'wp-forge:manifest',

    configResolved(config) {
      rootDir = config.root
    },

    async generateBundle(_, bundle) {
      if (!enabled) return

      const manifest: WordPressManifest = {}

      // Process bundle entries
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk') {
          const entry: ManifestEntry = {
            file: fileName,
            src: chunk.facadeModuleId || fileName,
            isEntry: chunk.isEntry,
          }

          // Add CSS files
          if (chunk.viteMetadata?.importedCss?.size) {
            entry.css = Array.from(chunk.viteMetadata.importedCss)
          }

          // Add WordPress-specific metadata
          if (wordpress) {
            // Extract WordPress dependencies from imports
            const wpDeps = extractWordPressDependencies(chunk.code)
            if (wpDeps.length > 0) {
              entry.dependencies = wpDeps
            }

            // Add version hash
            entry.version = chunk.fileName.match(/\.([a-f0-9]{8})\./)?.[1] || '1.0.0'
          }

          manifest[chunk.name || fileName] = entry
        }

        if (chunk.type === 'asset') {
          manifest[fileName] = {
            file: fileName,
          }
        }
      }

      // Write manifest
      const outputPath = join(rootDir, output)
      await mkdir(dirname(outputPath), { recursive: true })
      await writeFile(outputPath, JSON.stringify(manifest, null, 2), 'utf-8')

      console.log(`  ✓ Generated WordPress manifest: ${output}`)
    },
  }
}

/**
 * Extract WordPress dependencies from code
 */
function extractWordPressDependencies(code: string): string[] {
  const deps = new Set<string>()

  // WordPress package imports
  const wpPackagePattern = /@wordpress\/([\w-]+)/g
  let match

  while ((match = wpPackagePattern.exec(code)) !== null) {
    deps.add(`wp-${match[1]}`)
  }

  // Common WordPress globals
  if (code.includes('wp.')) {
    if (code.includes('wp.element')) deps.add('wp-element')
    if (code.includes('wp.blocks')) deps.add('wp-blocks')
    if (code.includes('wp.blockEditor')) deps.add('wp-block-editor')
    if (code.includes('wp.components')) deps.add('wp-components')
    if (code.includes('wp.data')) deps.add('wp-data')
    if (code.includes('wp.i18n')) deps.add('wp-i18n')
  }

  return Array.from(deps)
}
