import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createServer } from './server'

// Absolute path to the built bin, resolved relative to this test file.
const __filename = fileURLToPath(import.meta.url)
const DIST_BIN = resolve(__filename, '../../dist/index.js')

// Absolute path to the basic-theme example used as a discovery fixture.
const BASIC_THEME_DIR = resolve(fileURLToPath(import.meta.url), '../../../../examples/basic-theme')

/**
 * Connects an in-process client to a fresh server over a linked pair of
 * InMemoryTransports. Returns the client plus the protocol version the server
 * negotiated during initialize().
 *
 * There is no public accessor on Client/Transport for the negotiated protocol
 * version, but the SDK calls `transport.setProtocolVersion(version)` on the
 * client transport when the initialize response arrives
 * (client/index.js -> `if (transport.setProtocolVersion) ...`). We wrap that
 * callback to capture the real negotiated value rather than asserting a guess.
 */
async function connect(
  rootDir?: string
): Promise<{ client: Client; negotiatedVersion: string | undefined }> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

  // `setProtocolVersion` is an optional member on the Transport interface that
  // InMemoryTransport doesn't statically declare; widen to Transport to set it.
  const captureTransport = clientTransport as Transport
  let negotiatedVersion: string | undefined
  const originalSet = captureTransport.setProtocolVersion?.bind(captureTransport)
  captureTransport.setProtocolVersion = (version: string) => {
    negotiatedVersion = version
    originalSet?.(version)
  }

  const server = createServer(rootDir)
  const client = new Client({ name: 'test-client', version: '0.0.0' })

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])

  return { client, negotiatedVersion }
}

let client: Client

beforeEach(async () => {
  // Default server: tools only tests use process.cwd() for discovery (empty dir is fine).
  const connected = await connect()
  client = connected.client
})

afterEach(async () => {
  await client.close()
})

async function tempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'stratawp-mcp-'))
}

describe('@stratawp/mcp server tools', () => {
  it('exposes exactly the four scaffold_* tools, each with an inputSchema', async () => {
    const { tools } = await client.listTools()
    const names = tools.map((t) => t.name).sort()
    expect(names).toEqual([
      'scaffold_block',
      'scaffold_component',
      'scaffold_part',
      'scaffold_template',
    ])
    for (const tool of tools) {
      expect(tool.inputSchema).toBeDefined()
      expect(tool.inputSchema.type).toBe('object')
    }
  })

  it('negotiates the latest protocol version', async () => {
    // Read the version the server actually negotiated, captured from the
    // client transport's setProtocolVersion callback during connect().
    const { negotiatedVersion } = await connect()
    expect(negotiatedVersion).toBe(LATEST_PROTOCOL_VERSION)
    // Constant tripwire: fails loudly if the bundled SDK's latest version drifts.
    expect(LATEST_PROTOCOL_VERSION).toBe('2025-11-25')
  })

  it('scaffold_block writes block files and reports them in structuredContent', async () => {
    const targetDir = await tempDir()
    const result = await client.callTool({
      name: 'scaffold_block',
      arguments: { targetDir, name: 'hero', namespace: 'strata-basic' },
    })

    const written = (result.structuredContent as { written: string[] }).written
    const blockJsonPath = 'src/blocks/hero/block.json'
    expect(written).toContain(blockJsonPath)
    expect(written).toContain('src/blocks/hero/render.php')

    const onDisk = JSON.parse(await readFile(join(targetDir, blockJsonPath), 'utf8'))
    expect(onDisk.name).toBe('strata-basic/hero')
  })

  it('scaffold_component writes the PHP component file', async () => {
    const targetDir = await tempDir()
    const result = await client.callTool({
      name: 'scaffold_component',
      arguments: { targetDir, name: 'Analytics', namespace: 'StrataBasic', type: 'feature' },
    })

    const written = (result.structuredContent as { written: string[] }).written
    const expectedPath = 'inc/Components/Analytics.php'
    expect(written).toContain(expectedPath)
    const onDisk = await readFile(join(targetDir, expectedPath), 'utf8')
    expect(onDisk).toContain('class Analytics')
  })

  it('scaffold_template writes the FSE template file', async () => {
    const targetDir = await tempDir()
    const result = await client.callTool({
      name: 'scaffold_template',
      arguments: { targetDir, name: 'About', type: 'page', themeSlug: 'strata-basic' },
    })

    const written = (result.structuredContent as { written: string[] }).written
    const expectedPath = 'templates/about.html'
    expect(written).toContain(expectedPath)
    await expect(readFile(join(targetDir, expectedPath), 'utf8')).resolves.toContain('wp:')
  })

  it('scaffold_part writes the template part file', async () => {
    const targetDir = await tempDir()
    const result = await client.callTool({
      name: 'scaffold_part',
      arguments: { targetDir, name: 'Sidebar', type: 'sidebar', markup: 'html' },
    })

    const written = (result.structuredContent as { written: string[] }).written
    const expectedPath = 'parts/sidebar.html'
    expect(written).toContain(expectedPath)
    await expect(readFile(join(targetDir, expectedPath), 'utf8')).resolves.toBeTypeOf('string')
  })

  // The McpServer validates input against the tool's Zod inputSchema and, on
  // failure, returns a tool result with `isError: true` (rather than rejecting
  // the JSON-RPC call). We assert on that error result.
  it('returns an error result when a required field (targetDir) is missing', async () => {
    const result = await client.callTool({
      name: 'scaffold_block',
      arguments: { name: 'hero', namespace: 'strata-basic' },
    })
    expect(result.isError).toBe(true)
    expect(result.structuredContent).toBeUndefined()
    const text = (result.content as Array<{ text: string }>)[0]?.text ?? ''
    expect(text).toContain('targetDir')
  })

  it('returns an error result when targetDir is the wrong type', async () => {
    const result = await client.callTool({
      name: 'scaffold_block',
      // targetDir must be a string
      arguments: { targetDir: 123, name: 'hero', namespace: 'strata-basic' },
    })
    expect(result.isError).toBe(true)
    const text = (result.content as Array<{ text: string }>)[0]?.text ?? ''
    expect(text).toContain('targetDir')
  })
})

describe('@stratawp/mcp component catalog resources', () => {
  let resourceClient: Client

  beforeEach(async () => {
    const connected = await connect(BASIC_THEME_DIR)
    resourceClient = connected.client
  })

  afterEach(async () => {
    await resourceClient.close()
  })

  it('listResources includes the stratawp://components catalog resource', async () => {
    const { resources } = await resourceClient.listResources()
    const uris = resources.map((r) => r.uri)
    expect(uris).toContain('stratawp://components')
  })

  it('reading stratawp://components returns valid JSON that parses to a non-empty array', async () => {
    const result = await resourceClient.readResource({ uri: 'stratawp://components' })
    expect(result.contents).toHaveLength(1)
    const content = result.contents[0]
    expect(content.uri).toBe('stratawp://components')
    expect(content.mimeType).toBe('application/json')
    // Narrow the union: our handler always sets `text`, not `blob`.
    if (!('text' in content)) throw new Error('Expected text content from catalog resource')
    const parsed = JSON.parse(content.text)
    expect(Array.isArray(parsed)).toBe(true)
    // basic-theme has blocks, patterns, and parts — expect at least one component.
    expect((parsed as unknown[]).length).toBeGreaterThan(0)
  })

  it('each component in the catalog has the required fields (id, name, title, type, path)', async () => {
    const result = await resourceClient.readResource({ uri: 'stratawp://components' })
    const raw = result.contents[0]
    if (!('text' in raw)) throw new Error('Expected text content from catalog resource')
    const components = JSON.parse(raw.text) as Array<{
      id: string
      name: string
      title: string
      type: string
      path: string
    }>
    for (const c of components) {
      expect(c).toHaveProperty('id')
      expect(c).toHaveProperty('name')
      expect(c).toHaveProperty('title')
      expect(c).toHaveProperty('type')
      expect(c).toHaveProperty('path')
    }
  })

  it('listResources also includes resource templates for component-by-id and component-source', async () => {
    // ResourceTemplate entries show up in listResources once a list callback provides them.
    // Both templates supply a list callback that returns one entry per discovered component.
    const { resources } = await resourceClient.listResources()
    const uris = resources.map((r) => r.uri)
    // At least one component URI matching the template should appear.
    const hasComponentById = uris.some(
      (u) => u.startsWith('stratawp://components/') && !u.endsWith('/source')
    )
    const hasComponentSource = uris.some((u) => u.endsWith('/source'))
    expect(hasComponentById).toBe(true)
    expect(hasComponentSource).toBe(true)
  })

  it('source of a block component returns its block.json (dir-based path resolves to the contract)', async () => {
    const catalog = await resourceClient.readResource({ uri: 'stratawp://components' })
    const raw = catalog.contents[0]
    if (!('text' in raw)) throw new Error('Expected text content from catalog resource')
    const components = JSON.parse(raw.text as string) as Array<{ id: string; type: string }>
    const block = components.find((c) => c.type === 'block')
    expect(block, 'basic-theme should expose at least one block').toBeTruthy()

    const src = await resourceClient.readResource({
      uri: `stratawp://components/${encodeURIComponent(block!.id)}/source`,
    })
    const content = src.contents[0]
    if (!('text' in content)) throw new Error('Expected text content from source resource')
    // A block's path is a directory; the handler surfaces block.json (the canonical contract),
    // not an EISDIR placeholder.
    expect(content.text as string).toContain('apiVersion')
    expect(content.text as string).not.toContain('Unable to read source file')
  })
})

// ---------------------------------------------------------------------------
// JSON-Schema dialect tripwire
// ---------------------------------------------------------------------------
// Asserts the emitted inputSchema for scaffold_block declares draft-07.
// If zod or the SDK ever silently switches dialect the test fails loudly.

describe('@stratawp/mcp tool schema dialect', () => {
  it('scaffold_block inputSchema declares JSON Schema draft-07', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const server = createServer()
    const dialectClient = new Client({ name: 'dialect-test-client', version: '0.0.0' })
    await Promise.all([server.connect(serverTransport), dialectClient.connect(clientTransport)])

    try {
      const { tools } = await dialectClient.listTools()
      const scaffoldBlock = tools.find((t) => t.name === 'scaffold_block')
      expect(scaffoldBlock, 'scaffold_block must be registered').toBeDefined()

      // Tripwire: the $schema value must remain draft-07.
      // If this assertion fails after a zod/SDK upgrade, update the snapshot
      // and this test together so the change is intentional and visible in review.
      const schema = scaffoldBlock!.inputSchema as { $schema?: string }
      expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#')
    } finally {
      await dialectClient.close()
    }
  })
})

// ---------------------------------------------------------------------------
// stdout-hygiene test
// ---------------------------------------------------------------------------
// Spawns the built bin, sends a valid JSON-RPC initialize request, and asserts
// that every non-empty line on stdout parses as JSON (no stray console.log).
//
// BUILD DEPENDENCY: This test requires `packages/mcp/dist/index.js` to exist.
// Run `pnpm --filter @stratawp/mcp build` before running tests, or rely on
// the turbo pipeline which builds before test.

describe('@stratawp/mcp built bin stdout hygiene', () => {
  it('every stdout line from the bin is valid JSON (no stray console.log)', async () => {
    const { spawn } = await import('node:child_process')

    // A minimal MCP initialize request (protocol 2025-11-25).
    const initRequest =
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: { name: 'hygiene-test', version: '0.0.0' },
        },
      }) + '\n'

    const stdoutLines = await new Promise<string[]>((resolve, reject) => {
      const child = spawn(process.execPath, [DIST_BIN], {
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      const lines: string[] = []
      let stdout = ''

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString()
        // Collect complete lines as they arrive.
        const parts = stdout.split('\n')
        // The last part may be incomplete; keep it in the buffer.
        stdout = parts.pop() ?? ''
        for (const line of parts) {
          if (line.trim()) lines.push(line)
        }
      })

      child.stderr.on('data', () => {
        // Ignore stderr — diagnostics are expected there.
      })

      child.on('error', reject)

      // Write the initialize request then wait up to 3 seconds for a response.
      child.stdin.write(initRequest)

      const timer = setTimeout(() => {
        child.kill()
        if (stdout.trim()) lines.push(stdout.trim())
        resolve(lines)
      }, 3000)

      // Resolve early on the first complete JSON-RPC response line, then kill.
      child.stdout.on('data', () => {
        const allLines = (stdout + lines.join('\n')).split('\n').filter(Boolean)
        if (allLines.length > 0) {
          clearTimeout(timer)
          child.kill()
          if (stdout.trim()) lines.push(stdout.trim())
          resolve(lines)
        }
      })
    })

    expect(stdoutLines.length).toBeGreaterThan(0)

    for (const line of stdoutLines) {
      let parsed: unknown
      try {
        parsed = JSON.parse(line)
      } catch {
        throw new Error(
          `stdout line is not valid JSON — stray console.log?\nLine: ${JSON.stringify(line)}`
        )
      }
      expect(parsed).toBeTruthy()
    }
  })
})
