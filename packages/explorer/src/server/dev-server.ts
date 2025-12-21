/**
 * Development Server
 * Serves the component explorer UI with hot-reload
 */

import express from 'express'
import { createServer } from 'vite'
import { WebSocketServer, WebSocket } from 'ws'
import path from 'path'
import type { ViteDevServer } from 'vite'
import type { ComponentInfo, ExplorerConfig, ServerMessage } from '../types.js'
import { ComponentDiscovery } from '../utils/component-discovery.js'

export class ExplorerDevServer {
  private app: express.Application
  private vite: ViteDevServer | null = null
  private wss: WebSocketServer | null = null
  private discovery: ComponentDiscovery
  private components: Map<string, ComponentInfo> = new Map()
  private config: Required<ExplorerConfig>

  constructor(config: ExplorerConfig = {}) {
    this.config = {
      port: config.port || 3000,
      host: config.host || 'localhost',
      open: config.open !== false,
      rootDir: config.rootDir || process.cwd(),
      discovery: {
        includeBlocks: true,
        includeComponents: true,
        includePatterns: true,
        includeTemplates: true,
        includeParts: true,
        ...config.discovery,
      },
    }

    this.app = express()
    this.discovery = new ComponentDiscovery(
      this.config.rootDir,
      this.config.discovery
    )
  }

  /**
   * Start the dev server
   */
  async start(): Promise<void> {
    // Discover all components
    await this.discoverComponents()

    // Setup Vite dev server
    await this.setupVite()

    // Setup WebSocket server
    this.setupWebSocket()

    // Setup API routes
    this.setupRoutes()

    // Watch for component changes
    this.watchComponents()

    // Start listening
    this.app.listen(this.config.port, this.config.host, () => {
      const url = `http://${this.config.host}:${this.config.port}`
      console.log(`\n✨ Component Explorer running at: ${url}\n`)

      if (this.config.open) {
        import('open').then((open) => open.default(url))
      }
    })

    // Attach WebSocket server to HTTP server
    if (this.wss) {
      this.wss.on('connection', (ws: WebSocket) => {
        // Send initial component list
        ws.send(
          JSON.stringify({
            type: 'init',
            components: Array.from(this.components.values()),
          })
        )
      })
    }
  }

  /**
   * Setup Vite dev server
   */
  private async setupVite(): Promise<void> {
    this.vite = await createServer({
      root: path.join(__dirname, '../../ui'),
      server: {
        middlewareMode: true,
        hmr: {
          server: this.app as any,
        },
      },
      appType: 'spa',
    })

    this.app.use(this.vite.middlewares)
  }

  /**
   * Setup WebSocket server for hot-reload
   */
  private setupWebSocket(): void {
    this.wss = new WebSocketServer({ noServer: true })
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Get all components
    this.app.get('/api/components', (_req, res) => {
      res.json(Array.from(this.components.values()))
    })

    // Get single component
    this.app.get('/api/components/:id', (req, res) => {
      const component = this.components.get(req.params.id)
      if (component) {
        res.json(component)
      } else {
        res.status(404).json({ error: 'Component not found' })
      }
    })

    // Get component file content
    this.app.get('/api/components/:id/source', async (req, res) => {
      const component = this.components.get(req.params.id)
      if (!component) {
        return res.status(404).json({ error: 'Component not found' })
      }

      try {
        const fs = await import('fs-extra')
        const content = await fs.readFile(component.path, 'utf-8')
        res.json({ content })
      } catch (error) {
        res.status(500).json({ error: 'Failed to read component file' })
      }
    })

    // Health check
    this.app.get('/api/health', (_req, res) => {
      res.json({ status: 'ok' })
    })
  }

  /**
   * Discover all components
   */
  private async discoverComponents(): Promise<void> {
    const components = await this.discovery.discoverAll()
    this.components.clear()

    for (const component of components) {
      this.components.set(component.id, component)
    }

    console.log(`📦 Discovered ${components.length} components`)
  }

  /**
   * Watch for component changes
   */
  private watchComponents(): void {
    this.discovery.watch(
      (component) => {
        this.components.set(component.id, component)
        this.broadcast({
          type: 'component-updated',
          component,
        })
      },
      (id) => {
        this.components.delete(id)
        this.broadcast({
          type: 'component-removed',
          component: { id } as ComponentInfo,
        })
      }
    )
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(message: ServerMessage): void {
    if (!this.wss) return

    const payload = JSON.stringify(message)
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload)
      }
    })
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (this.vite) {
      await this.vite.close()
    }
    if (this.wss) {
      this.wss.close()
    }
  }
}
