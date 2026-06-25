/**
 * Constructs the @stratawp/mcp server and registers its tools.
 *
 * Resources are added in a later task; this file wires up tools only.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerTools } from './tools'

/**
 * Creates a fully-configured (but not-yet-connected) MCP server instance.
 * Callers connect it to a transport (stdio in production, InMemory in tests).
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: '@stratawp/mcp',
    version: '0.1.0',
  })

  registerTools(server)

  return server
}
