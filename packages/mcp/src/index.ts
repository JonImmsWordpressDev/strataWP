/**
 * @stratawp/mcp stdio entry point.
 *
 * stdout is the MCP JSON-RPC channel — never write to it. All diagnostics go to
 * stderr via console.error.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createServer } from './server'

async function main(): Promise<void> {
  const server = createServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('stratawp-mcp: server connected over stdio')
}

main().catch((error: unknown) => {
  console.error('stratawp-mcp: fatal error', error)
  process.exit(1)
})
