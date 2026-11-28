import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { strataWPBlocks } from '../blocks'

// fast-glob returns entries in readdir order, which is filesystem- and
// platform-dependent (issue #30). The mock simulates a hostile ordering so
// the determinism contract is tested identically on every machine.
let globResult: string[] = []
vi.mock('fast-glob', () => ({
  default: vi.fn(async () => globResult),
}))

const BLOCK_NAMES = ['hero', 'accordion', 'team-members', 'cta']

describe('strataWPBlocks block registration generation', () => {
  let rootDir: string

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'stratawp-blocks-'))
    await mkdir(join(rootDir, 'inc'), { recursive: true })
    for (const name of BLOCK_NAMES) {
      const blockDir = join(rootDir, 'src/blocks', name)
      await mkdir(blockDir, { recursive: true })
      await writeFile(
        join(blockDir, 'block.json'),
        JSON.stringify({ name: `test/${name}`, title: name, attributes: {} })
      )
    }
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  async function runPlugin(): Promise<string> {
    const plugin = strataWPBlocks({ autoRegister: true }) as any
    const ctx = { addWatchFile: () => {}, warn: () => {} }

    await plugin.configResolved({ root: rootDir })
    await plugin.buildStart.call(ctx)
    await plugin.generateBundle.call(ctx)

    return readFile(join(rootDir, 'inc/blocks-generated.php'), 'utf-8')
  }

  it('emits registrations in sorted order regardless of filesystem order', async () => {
    // Deliberately unsorted, as a real filesystem may return them.
    globResult = ['team-members', 'hero', 'cta', 'accordion'].map((name) =>
      join(rootDir, 'src/blocks', name, 'block.json')
    )

    const php = await runPlugin()

    const registered = [...php.matchAll(/'\/(src\/blocks\/[a-z-]+)'/g)].map((m) => m[1])
    expect(registered).toEqual([
      'src/blocks/accordion',
      'src/blocks/cta',
      'src/blocks/hero',
      'src/blocks/team-members',
    ])
  })

  it('produces byte-identical output for different discovery orders', async () => {
    globResult = BLOCK_NAMES.map((name) => join(rootDir, 'src/blocks', name, 'block.json'))
    const first = await runPlugin()

    globResult = [...globResult].reverse()
    const second = await runPlugin()

    expect(second).toBe(first)
  })
})

describe('strataWPBlocks exportTypes', () => {
  let rootDir: string

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'stratawp-blocks-types-'))
    await mkdir(join(rootDir, 'inc'), { recursive: true })
    const blockDir = join(rootDir, 'src/blocks/hero')
    await mkdir(blockDir, { recursive: true })
    await writeFile(
      join(blockDir, 'block.json'),
      JSON.stringify({ name: 'test/hero', attributes: { title: { type: 'string' } } })
    )
    globResult = [join(blockDir, 'block.json')]
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  async function emitted(exportTypes?: boolean | string) {
    const files: { fileName: string; source: string }[] = []
    const plugin = strataWPBlocks({ exportTypes }) as any
    const ctx = { addWatchFile: () => {}, warn: () => {}, emitFile: (f: any) => files.push(f) }
    await plugin.configResolved({ root: rootDir })
    await plugin.buildStart.call(ctx)
    await plugin.generateBundle.call(ctx)
    return files
  }

  it('emits nothing by default', async () => {
    expect(await emitted()).toEqual([])
  })

  it('emits block-attributes.d.ts when enabled', async () => {
    const files = await emitted(true)
    expect(files.map((f) => f.fileName)).toEqual(['block-attributes.d.ts'])
    expect(files[0].source).toContain("'test/hero': HeroAttributes")
  })

  it('writes into a subdirectory when given a string', async () => {
    const files = await emitted('/types/')
    expect(files.map((f) => f.fileName)).toEqual(['types/block-attributes.d.ts'])
  })
})
