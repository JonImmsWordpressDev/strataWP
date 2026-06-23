import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import path from 'node:path'
import os from 'node:os'
import { mkdtemp, mkdir, rm, stat } from 'node:fs/promises'
import sharp from 'sharp'
import { strataWPImages } from '../images'

describe('strataWPImages', () => {
  let dir: string

  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'sw-images-'))
    await mkdir(path.join(dir, 'src/images'), { recursive: true })
    // A real 64x64 png fixture so sharp has something to optimize.
    await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 200, g: 100, b: 50 } },
    })
      .png()
      .toFile(path.join(dir, 'src/images/hero.png'))
  })

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  async function exists(p: string): Promise<boolean> {
    try {
      await stat(p)
      return true
    } catch {
      return false
    }
  }

  it('optimizes a raster and emits a sibling .webp', async () => {
    const plugin = strataWPImages()
    // Simulate Vite resolving the config root to our temp dir.
    ;(plugin as any).configResolved({ root: dir })
    await (plugin as any).closeBundle()

    expect(await exists(path.join(dir, 'dist/images/hero.png'))).toBe(true)
    expect(await exists(path.join(dir, 'dist/images/hero.webp'))).toBe(true)
  })

  it('does nothing when disabled', async () => {
    const plugin = strataWPImages({ enabled: false, dest: 'dist/images-off' })
    ;(plugin as any).configResolved({ root: dir })
    await (plugin as any).closeBundle()
    expect(await exists(path.join(dir, 'dist/images-off'))).toBe(false)
  })
})
