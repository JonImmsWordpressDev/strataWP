/**
 * contracts:types:check helper
 *
 * Regenerates the committed `block-attributes.ts` files from every block.json
 * in the repo (example themes + CLI templates) using the same codegen the Vite
 * plugin runs during a theme build, then verifies the working tree is clean.
 *
 * Why a standalone walk instead of `pnpm build`?
 *   - The CLI template themes (`packages/cli/templates/*`) are not workspace
 *     packages, so `pnpm build` never touches them — but their generated types
 *     are committed and must stay in sync too.
 *   - Walking block.json files directly is deterministic and does not depend on
 *     Vite/rollup output, keeping the gate fast and stable.
 *
 * EXIT CODES
 *   0  All generated block types are in sync with the committed files.
 *   1  Drift detected (or codegen/format failed) — rebuild + commit.
 *
 * USAGE
 *   pnpm contracts:types:check
 *
 * NOTE: Requires a prior `pnpm build` (or `pnpm --filter @stratawp/vite-plugin
 * build`) because it imports the compiled codegen from the plugin's dist.
 */

import { execSync } from 'node:child_process'
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Directories under which `*/src/blocks/*/block.json` files live and have
// committed generated types.
const BLOCK_ROOTS = ['examples', 'packages/cli/templates']

// Glob used for the drift diff (mirrors the generated file locations).
const GENERATED_GLOB =
  "'examples/*/src/blocks/*/block-attributes.ts' 'packages/cli/templates/*/src/blocks/*/block-attributes.ts'"

/** Find every `<root>/<theme>/src/blocks/<block>/block.json` (no external deps). */
async function findBlockJsonFiles() {
  const found = []
  for (const rootRel of BLOCK_ROOTS) {
    const rootAbs = join(ROOT, rootRel)
    let themes = []
    try {
      themes = await readdir(rootAbs, { withFileTypes: true })
    } catch {
      continue
    }
    for (const theme of themes) {
      if (!theme.isDirectory()) continue
      const blocksDir = join(rootAbs, theme.name, 'src', 'blocks')
      let blocks = []
      try {
        blocks = await readdir(blocksDir, { withFileTypes: true })
      } catch {
        continue
      }
      for (const block of blocks) {
        if (!block.isDirectory()) continue
        found.push(join(blocksDir, block.name, 'block.json'))
      }
    }
  }
  return found.sort()
}

async function loadCodegen() {
  const distEntry = join(ROOT, 'packages/vite-plugin/dist/index.js')
  try {
    const mod = await import(pathToFileURL(distEntry).href)
    if (typeof mod.generateBlockAttributeTypes !== 'function') {
      throw new Error('generateBlockAttributeTypes not exported from vite-plugin dist')
    }
    return mod.generateBlockAttributeTypes
  } catch (err) {
    console.error(
      '[contracts:types:check] Could not load the codegen from the vite-plugin dist.\n' +
        'Run `pnpm --filter @stratawp/vite-plugin build` first.\n' +
        `Underlying error: ${err.message}`
    )
    process.exit(1)
  }
}

async function regenerate(generateBlockAttributeTypes) {
  const files = await findBlockJsonFiles()

  let written = 0
  for (const blockJsonPath of files) {
    const blockJson = JSON.parse(await readFile(blockJsonPath, 'utf-8'))
    const { fileName, content } = await generateBlockAttributeTypes(blockJson)
    const outPath = join(dirname(blockJsonPath), fileName)

    let existing = null
    try {
      existing = await readFile(outPath, 'utf-8')
    } catch {
      existing = null
    }

    if (existing !== content) {
      await writeFile(outPath, content, 'utf-8')
      written++
    }
  }

  console.error(
    `[contracts:types:check] Regenerated block types from ${files.length} block.json file(s)` +
      (written > 0 ? ` (${written} changed)` : ' (no changes)')
  )
}

console.error('[contracts:types:check] Loading codegen…')
const generateBlockAttributeTypes = await loadCodegen()

console.error('[contracts:types:check] Regenerating committed block attribute types…')
await regenerate(generateBlockAttributeTypes)

console.error('[contracts:types:check] Checking for drift…')
try {
  execSync(`git diff --exit-code -- ${GENERATED_GLOB}`, { stdio: 'inherit', cwd: ROOT })
} catch {
  console.error(
    '\n[contracts:types:check] Generated block-type drift detected.\n' +
      'The committed block-attributes.ts files no longer match block.json.\n' +
      '\nTo fix: rebuild the plugin, regenerate, and commit:\n' +
      '  pnpm --filter @stratawp/vite-plugin build\n' +
      '  pnpm contracts:types:check\n' +
      "  git add '*/src/blocks/*/block-attributes.ts'\n" +
      '  git commit -m "chore(contracts): regenerate block attribute types"\n'
  )
  process.exit(1)
}

console.error('[contracts:types:check] Generated block types are in sync.')
