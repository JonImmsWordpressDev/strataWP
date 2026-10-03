import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import path from 'node:path'
import os from 'node:os'
import { mkdtemp, mkdir, rm, stat, writeFile, readdir } from 'node:fs/promises'
import sharp from 'sharp'
import { strataWPImages } from '../images'

describe('strataWPImages', () => {
  let dir: string

  async function fixture(name: string): Promise<void> {
    await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 200, g: 100, b: 50 } },
    })
      .png()
      .toFile(path.join(dir, 'src/images', name))
  }

  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'sw-images-'))
    await mkdir(path.join(dir, 'src/images'), { recursive: true })
    await fixture('hero.png')
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

  async function run(options: Parameters<typeof strataWPImages>[0]) {
    const plugin = strataWPImages(options)
    // Simulate Vite resolving the config root to our temp dir.
    ;(plugin as any).configResolved({ root: dir })
    await (plugin as any).closeBundle()
  }

  it('optimizes a raster and emits sibling .avif and .webp by default', async () => {
    await run({})
    expect(await exists(path.join(dir, 'dist/images/hero.png'))).toBe(true)
    expect(await exists(path.join(dir, 'dist/images/hero.webp'))).toBe(true)
    expect(await exists(path.join(dir, 'dist/images/hero.avif'))).toBe(true)
  })

  it('emits only the requested formats', async () => {
    await run({ dest: 'dist/images-webp-only', formats: ['webp'] })
    expect(await exists(path.join(dir, 'dist/images-webp-only/hero.webp'))).toBe(true)
    expect(await exists(path.join(dir, 'dist/images-webp-only/hero.avif'))).toBe(false)
  })

  it('still honours the legacy webp:false option', async () => {
    await run({ dest: 'dist/images-no-webp', webp: false })
    expect(await exists(path.join(dir, 'dist/images-no-webp/hero.avif'))).toBe(true)
    expect(await exists(path.join(dir, 'dist/images-no-webp/hero.webp'))).toBe(false)
  })

  it('does nothing when disabled', async () => {
    await run({ enabled: false, dest: 'dist/images-off' })
    expect(await exists(path.join(dir, 'dist/images-off'))).toBe(false)
  })

  it('finds siblings for an uppercase extension', async () => {
    await fixture('UPPER.PNG')
    await run({ dest: 'dist/images-upper' })
    expect(await exists(path.join(dir, 'dist/images-upper/UPPER.avif'))).toBe(true)
    expect(await exists(path.join(dir, 'dist/images-upper/UPPER.webp'))).toBe(true)
  })

  it('does not throw or leave partial siblings for a corrupt source', async () => {
    await writeFile(path.join(dir, 'src/images/broken.png'), 'not really a png')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(run({ dest: 'dist/images-corrupt' })).resolves.toBeUndefined()
    const out = await readdir(path.join(dir, 'dist/images-corrupt'))
    expect(out).toContain('broken.png') // copied through unchanged
    expect(out).not.toContain('broken.avif')
    expect(out).not.toContain('broken.webp')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
