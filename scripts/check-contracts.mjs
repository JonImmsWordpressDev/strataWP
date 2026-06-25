/**
 * contracts:check helper
 *
 * 1. Regenerates the MCP tool-contract snapshot by running the `snapshot`
 *    script in the @stratawp/mcp package (assumes a prior `pnpm build`).
 * 2. Runs `git diff --exit-code` on the snapshot file to detect drift.
 *
 * EXIT CODES
 *   0  Snapshot is in sync with the committed file.
 *   1  Snapshot drifted — re-run `pnpm --filter @stratawp/mcp snapshot` and commit.
 *
 * USAGE
 *   pnpm contracts:check
 *
 * NOTE: Requires a prior `pnpm build` (or `pnpm --filter @stratawp/mcp build`)
 * because the snapshot script runs against the compiled dist/snapshot.js.
 */

import { execSync } from 'node:child_process'

const SNAPSHOT_PATH = 'packages/mcp/contracts/tools.snapshot.json'

console.error('[contracts:check] Regenerating MCP tool-contract snapshot…')
try {
  execSync('pnpm --filter @stratawp/mcp snapshot', { stdio: 'inherit' })
} catch (err) {
  console.error('[contracts:check] Snapshot generation failed:', err.message)
  process.exit(1)
}

// Format the snapshot so `pnpm format:check` stays green.
console.error('[contracts:check] Formatting snapshot…')
try {
  execSync(`pnpm prettier --write "${SNAPSHOT_PATH}"`, { stdio: 'inherit' })
} catch (err) {
  console.error('[contracts:check] Prettier formatting failed:', err.message)
  process.exit(1)
}

console.error('[contracts:check] Checking for drift…')
try {
  execSync(`git diff --exit-code -- ${SNAPSHOT_PATH}`, { stdio: 'inherit' })
} catch {
  console.error(
    '\n[contracts:check] MCP tool contract drift detected.\n' +
      'The committed snapshot no longer matches the current tool definitions.\n' +
      '\nTo fix: re-run the snapshot and commit the updated file:\n' +
      '  pnpm --filter @stratawp/mcp build\n' +
      '  pnpm --filter @stratawp/mcp snapshot\n' +
      `  git add ${SNAPSHOT_PATH}\n` +
      '  git commit -m "chore(mcp): update tool-contract snapshot"\n'
  )
  process.exit(1)
}

console.error('[contracts:check] MCP tool contract is in sync.')
