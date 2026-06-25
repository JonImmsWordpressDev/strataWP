/**
 * Constructs the @stratawp/mcp server and registers its tools and resources.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerResources } from './resources'
import { registerTools } from './tools'

/**
 * Creates a fully-configured (but not-yet-connected) MCP server instance.
 * Callers connect it to a transport (stdio in production, InMemory in tests).
 */
export function createServer(rootDir?: string): McpServer {
  const server = new McpServer({
    name: '@stratawp/mcp',
    version: '0.1.0',
  })

  registerTools(server)
  registerResources(server, rootDir)

  return server
}
