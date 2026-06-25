/**
 * Snapshot script for the @stratawp/mcp tool contract.
 *
 * Connects a Client to createServer() over an in-process InMemoryTransport,
 * calls listTools(), and writes a deterministic JSON snapshot of the tool
 * contract to packages/mcp/contracts/tools.snapshot.json.
 *
 * Progress is written to stderr only — stdout is the JSON-RPC channel and
 * must remain clean.
 *
 * Run via: pnpm --filter @stratawp/mcp snapshot
 * (Requires a prior `pnpm --filter @stratawp/mcp build`.)
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createServer } from './server.js'

// Resolve the contracts directory relative to this file (not cwd).
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const CONTRACTS_DIR = join(__dirname, '..', 'contracts')
const OUTPUT_PATH = join(CONTRACTS_DIR, 'tools.snapshot.json')

async function main(): Promise<void> {
  console.error('[snapshot] Connecting in-process client to MCP server…')

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

  const server = createServer()
  const client = new Client({ name: 'snapshot-client', version: '0.0.0' })

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])

  console.error('[snapshot] Listing tools…')
  const { tools } = await client.listTools()

  await client.close()

  // Sort tools by name for a stable, diff-friendly output.
  const sorted = [...tools].sort((a, b) => a.name.localeCompare(b.name))

  // Build the snapshot: pick only the contract-relevant fields in stable key order.
  const snapshot = sorted.map((tool) => {
    const entry: Record<string, unknown> = {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }
    // outputSchema is present when the server declares one; include it if defined.
    if ('outputSchema' in tool && tool.outputSchema !== undefined) {
      entry['outputSchema'] = tool.outputSchema
    }
    return entry
  })

  const json = JSON.stringify(snapshot, null, 2) + '\n'

  console.error(`[snapshot] Writing ${sorted.length} tool(s) to ${OUTPUT_PATH}`)
  await mkdir(CONTRACTS_DIR, { recursive: true })
  await writeFile(OUTPUT_PATH, json, 'utf8')

  console.error('[snapshot] Done.')
}

main().catch((err) => {
  console.error('[snapshot] Fatal error:', err)
  process.exit(1)
})
