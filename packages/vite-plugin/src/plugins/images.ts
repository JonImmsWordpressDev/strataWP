/**
 * StrataWP Images Plugin
 *
 * Build-time raster optimization (sharp), SVG optimization (svgo), and
 * sibling .webp generation. Ported from a prior-art WordPress starter theme's image
 * task. Runs in
 * `closeBundle` so it operates on the theme's source images independently
 * of Vite's import graph.
 */
import type { Plugin } from 'vite'
import path from 'node:path'
import { stat, mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import fg from 'fast-glob'
import sharp from 'sharp'
import { optimize as svgoOptimize } from 'svgo'
import type { ImageOptions } from '../types'

export function strataWPImages(options: ImageOptions = {}): Plugin {
  const {
    enabled = true,
    src = 'src/images',
    dest = 'dist/images',
    webp = true,
    quality = {},
  } = options
  const jpegQuality = quality.jpeg ?? 75
  const pngQuality = quality.png ?? 80
  const webpQuality = quality.webp ?? 75

  let root = process.cwd()

  return {
    name: 'stratawp:images',
    apply: 'build',

    configResolved(config) {
      root = config.root
    },

    async closeBundle() {
      if (!enabled) {
        return
      }

      const srcRoot = path.resolve(root, src)
      const destRoot = path.resolve(root, dest)

      const files = await fg('**/*.{jpg,jpeg,png,gif,svg}', {
        cwd: srcRoot,
        caseSensitiveMatch: false,
        onlyFiles: true,
      })

      for (const rel of files) {
        const srcFile = path.join(srcRoot, rel)
        const destFile = path.join(destRoot, rel)
        const ext = path.extname(rel).toLowerCase()

        await mkdir(path.dirname(destFile), { recursive: true })

        if (await isNewer(srcFile, destFile)) {
          try {
            if (ext === '.svg') {
              const code = await readFile(srcFile, 'utf8')
              const result = svgoOptimize(code, {
                multipass: true,
                plugins: [
                  { name: 'preset-default', params: { overrides: { removeViewBox: false } } },
                ],
              })
              await writeFile(destFile, result.data, 'utf8')
            } else if (ext === '.jpg' || ext === '.jpeg') {
              await sharp(srcFile, { sequentialRead: true })
                .rotate()
                .jpeg({ quality: jpegQuality, mozjpeg: true, progressive: true })
                .toFile(destFile)
            } else if (ext === '.png') {
              await sharp(srcFile, { sequentialRead: true })
                .rotate()
                .png({ quality: pngQuality, compressionLevel: 9, adaptiveFiltering: true })
                .toFile(destFile)
            } else {
              await copyFile(srcFile, destFile)
            }
          } catch {
            // sharp/svgo failure → copy through unchanged so the build never breaks.
            await copyFile(srcFile, destFile)
          }
        }

        // Sibling .webp for raster photos.
        if (webp && (ext === '.jpg' || ext === '.jpeg' || ext === '.png')) {
          const webpFile = destFile.replace(/\.[^.]+$/i, '.webp')
          if (await isNewer(srcFile, webpFile)) {
            try {
              await sharp(srcFile, { sequentialRead: true })
                .webp({ quality: webpQuality })
                .toFile(webpFile)
            } catch {
              // Skip webp for this file on failure; don't break the build.
            }
          }
        }
      }
    },
  }
}

async function isNewer(src: string, dest: string): Promise<boolean> {
  try {
    const [s, d] = await Promise.all([stat(src), stat(dest)])
    return s.mtimeMs > d.mtimeMs
  } catch {
    return true // dest missing (or unreadable) → (re)generate
  }
}
