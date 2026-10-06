import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { installCompanionPlugin, COMPANION_PLUGIN_SLUG } from './utils/companion-plugin.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const pluginDir = path.join(root, 'plugins', 'strata-advanced-content')
const bundledDir = path.join(
  root,
  'packages',
  'cli',
  'templates',
  'plugins',
  'strata-advanced-content'
)

function listFiles(dir: string, base = dir): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listFiles(full, base))
    else out.push(path.relative(base, full))
  }
  return out.sort()
}

describe('strata-advanced-content plugin', () => {
  const main = path.join(pluginDir, 'strata-advanced-content.php')

  it('has the plugin header and registers the four content types', () => {
    expect(fs.existsSync(main)).toBe(true)
    const src = fs.readFileSync(main, 'utf8')
    for (const header of ['Plugin Name:', 'Description:', 'Version:', 'License:']) {
      expect(src).toContain(header)
    }
    expect(src).toMatch(/Text Domain:\s+strata-advanced-content/)
    for (const type of ['portfolio', 'team', 'testimonial', 'case_study']) {
      expect(src).toMatch(new RegExp(`register_post_type\\(\\s*'${type}'`))
    }
  })

  it.each(['examples/advanced-theme', 'packages/cli/templates/advanced-theme'])(
    '%s no longer registers post types or taxonomies',
    (theme) => {
      const dir = path.join(root, theme)
      const files = listFiles(dir).filter(
        (f) => f.endsWith('.php') && !/^(vendor|node_modules|dist)[\\/]/.test(f)
      )
      expect(files.length).toBeGreaterThan(0)
      for (const file of files) {
        const src = fs.readFileSync(path.join(dir, file), 'utf8')
        expect(src, file).not.toMatch(/register_post_type|register_taxonomy|CustomPostTypes/)
      }
    }
  )

  it('keeps the bundled copy byte-identical to the source plugin', () => {
    expect(fs.existsSync(bundledDir)).toBe(true)
    const source = listFiles(pluginDir)
    expect(source.length).toBeGreaterThan(0)
    expect(listFiles(bundledDir)).toEqual(source)
    for (const file of source) {
      expect(
        fs
          .readFileSync(path.join(bundledDir, file))
          .equals(fs.readFileSync(path.join(pluginDir, file))),
        file
      ).toBe(true)
    }
  })
})

describe('installCompanionPlugin', () => {
  let tmp: string
  let wpRoot: string
  let fakeBundle: string

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'companion-plugin-'))
    wpRoot = path.join(tmp, 'wp')
    fakeBundle = path.join(tmp, 'bundle')
    await fs.ensureDir(path.join(wpRoot, 'wp-content', 'plugins'))
    await fs.outputFile(path.join(fakeBundle, 'strata-advanced-content.php'), '<?php // plugin')
  })

  afterEach(async () => {
    await fs.remove(tmp)
  })

  const dest = () => path.join(wpRoot, 'wp-content', 'plugins', COMPANION_PLUGIN_SLUG)

  it('copies the bundled plugin when confirmed for the advanced theme', async () => {
    const result = await installCompanionPlugin({
      wpRoot,
      templateName: 'advanced-theme',
      confirm: async () => true,
      bundledDir: fakeBundle,
    })
    expect(result.installed).toBe(true)
    expect(await fs.pathExists(path.join(dest(), 'strata-advanced-content.php'))).toBe(true)
  })

  it('uses the injected copy function', async () => {
    const calls: Array<[string, string]> = []
    const result = await installCompanionPlugin({
      wpRoot,
      templateName: 'advanced-theme',
      confirm: async () => true,
      bundledDir: fakeBundle,
      copy: async (from, to) => {
        calls.push([from, to])
      },
    })
    expect(result.installed).toBe(true)
    expect(calls).toEqual([[fakeBundle, dest()]])
    expect(await fs.pathExists(dest())).toBe(false)
  })

  it('never asks or writes when no WordPress install was linked', async () => {
    let asked = false
    const result = await installCompanionPlugin({
      templateName: 'advanced-theme',
      confirm: async () => {
        asked = true
        return true
      },
      bundledDir: fakeBundle,
    })
    expect(result.installed).toBe(false)
    expect(asked).toBe(false)
    expect(await fs.pathExists(dest())).toBe(false)
  })

  it('never asks or writes for other templates', async () => {
    let asked = false
    for (const templateName of ['basic-theme', 'store-theme', 'minimal']) {
      const result = await installCompanionPlugin({
        wpRoot,
        templateName,
        confirm: async () => {
          asked = true
          return true
        },
        bundledDir: fakeBundle,
      })
      expect(result.installed).toBe(false)
    }
    expect(asked).toBe(false)
    expect(await fs.pathExists(dest())).toBe(false)
  })

  it('writes nothing when the user declines', async () => {
    const result = await installCompanionPlugin({
      wpRoot,
      templateName: 'advanced-theme',
      confirm: async () => false,
      bundledDir: fakeBundle,
    })
    expect(result.installed).toBe(false)
    expect(await fs.pathExists(dest())).toBe(false)
  })

  it('refuses to overwrite an existing plugin directory', async () => {
    await fs.outputFile(path.join(dest(), 'keep.txt'), 'mine')
    const result = await installCompanionPlugin({
      wpRoot,
      templateName: 'advanced-theme',
      confirm: async () => true,
      bundledDir: fakeBundle,
    })
    expect(result.installed).toBe(false)
    expect(result.message).toMatch(/already exists/i)
    expect(await fs.readFile(path.join(dest(), 'keep.txt'), 'utf8')).toBe('mine')
    expect(await fs.pathExists(path.join(dest(), 'strata-advanced-content.php'))).toBe(false)
  })
})
