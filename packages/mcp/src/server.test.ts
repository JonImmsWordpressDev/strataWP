import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createServer } from './server'

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
async function connect(): Promise<{ client: Client; negotiatedVersion: string | undefined }> {
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

  const server = createServer()
  const client = new Client({ name: 'test-client', version: '0.0.0' })

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])

  return { client, negotiatedVersion }
}

let client: Client

beforeEach(async () => {
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
      arguments: { targetDir, name: 'hero', namespace: 'strata-basic', type: 'dynamic' },
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
      arguments: { name: 'hero', namespace: 'strata-basic', type: 'dynamic' },
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
      arguments: { targetDir: 123, name: 'hero', namespace: 'strata-basic', type: 'dynamic' },
    })
    expect(result.isError).toBe(true)
    const text = (result.content as Array<{ text: string }>)[0]?.text ?? ''
    expect(text).toContain('targetDir')
  })
})
