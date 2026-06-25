/**
 * MCP resource registrations for @stratawp/mcp.
 *
 * Exposes the theme's component catalog as read-only MCP resources backed by
 * ComponentDiscovery from @stratawp/explorer.
 *
 * Resources never write to stdout (the JSON-RPC channel) — diagnostics go to
 * stderr only. process.exit is not called here.
 *
 * Registered resources:
 *   stratawp://components               - full catalog (ComponentInfo[]) as JSON
 *   stratawp://components/{id}          - single component by id
 *   stratawp://components/{id}/source   - source file path for a component
 */
import { readFile } from 'node:fs/promises'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ComponentDiscovery } from '@stratawp/explorer'
import type { ComponentInfo } from '@stratawp/explorer'

/** URI for the full component catalog resource. */
export const CATALOG_URI = 'stratawp://components'

/**
 * Returns all components discovered in `rootDir`, or an empty array on error.
 * Errors are written to stderr so they don't leak into the JSON-RPC channel.
 */
async function discoverComponents(rootDir: string): Promise<ComponentInfo[]> {
  try {
    const discovery = new ComponentDiscovery(rootDir)
    return await discovery.discoverAll()
  } catch (err) {
    console.error('[stratawp/mcp] ComponentDiscovery error:', err)
    return []
  }
}

/**
 * Registers read-only MCP resources that expose the theme's component catalog.
 *
 * The `rootDir` used for discovery defaults to `process.cwd()` so that when
 * the MCP server is launched from inside a theme directory the catalog reflects
 * that theme's components.
 *
 * @param server   The McpServer instance to register resources on.
 * @param rootDir  Optional override for the theme root (used in tests).
 */
export function registerResources(server: McpServer, rootDir: string = process.cwd()): void {
  // ── 1. Full catalog resource (static URI) ────────────────────────────────
  server.registerResource(
    'components',
    CATALOG_URI,
    {
      title: 'StrataWP component catalog',
      description:
        'All blocks, React components, patterns, FSE templates, and template parts discovered in the active theme.',
      mimeType: 'application/json',
    },
    async (_uri) => {
      const components = await discoverComponents(rootDir)
      return {
        contents: [
          {
            uri: CATALOG_URI,
            mimeType: 'application/json',
            text: JSON.stringify(components, null, 2),
          },
        ],
      }
    }
  )

  // ── 2. Single-component resource template ─────────────────────────────────
  const componentTemplate = new ResourceTemplate('stratawp://components/{id}', {
    list: async (_extra) => {
      const components = await discoverComponents(rootDir)
      return {
        resources: components.map((c) => ({
          uri: `stratawp://components/${encodeURIComponent(c.id)}`,
          name: c.title,
          description: c.description,
          mimeType: 'application/json',
        })),
      }
    },
  })

  server.registerResource(
    'component-by-id',
    componentTemplate,
    {
      title: 'Single StrataWP component',
      description: 'Metadata for one component, addressed by its id.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const id = decodeURIComponent(String(variables.id ?? ''))
      const components = await discoverComponents(rootDir)
      const component = components.find((c) => c.id === id)

      if (!component) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify({ error: `Component '${id}' not found.` }),
            },
          ],
        }
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(component, null, 2),
          },
        ],
      }
    }
  )

  // ── 3. Component source resource template ─────────────────────────────────
  const sourceTemplate = new ResourceTemplate('stratawp://components/{id}/source', {
    list: async (_extra) => {
      const components = await discoverComponents(rootDir)
      return {
        resources: components.map((c) => ({
          uri: `stratawp://components/${encodeURIComponent(c.id)}/source`,
          name: `${c.title} source`,
          description: `Source file for ${c.title}`,
          mimeType: 'text/plain',
        })),
      }
    },
  })

  server.registerResource(
    'component-source',
    sourceTemplate,
    {
      title: 'StrataWP component source file',
      description: 'The raw source file content for a component, addressed by its id.',
      mimeType: 'text/plain',
    },
    async (uri, variables) => {
      const id = decodeURIComponent(String(variables.id ?? ''))
      const components = await discoverComponents(rootDir)
      const component = components.find((c) => c.id === id)

      if (!component) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'text/plain',
              text: `Component '${id}' not found.`,
            },
          ],
        }
      }

      let source: string
      try {
        source = await readFile(component.path, 'utf-8')
      } catch (err) {
        console.error(`[stratawp/mcp] Failed to read source for '${id}':`, err)
        source = `Unable to read source file: ${component.path}`
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/plain',
            text: source,
          },
        ],
      }
    }
  )
}
