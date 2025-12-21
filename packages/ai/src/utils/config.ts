/**
 * Configuration Management for AI Features
 */

import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import { config as loadEnv } from 'dotenv'

export interface AIConfig {
  provider: 'openai' | 'anthropic'
  apiKey: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export class ConfigManager {
  private configPath: string
  private envPath: string

  constructor() {
    const homeDir = os.homedir()
    this.configPath = path.join(homeDir, '.stratawp', 'ai-config.json')
    this.envPath = path.join(process.cwd(), '.env')
  }

  /**
   * Load configuration from file or environment
   */
  async load(): Promise<AIConfig | null> {
    // First, try loading from .env file
    loadEnv({ path: this.envPath })

    // Check environment variables
    const envProvider = process.env.STRATAWP_AI_PROVIDER as
      | 'openai'
      | 'anthropic'
      | undefined
    const envApiKey = process.env.STRATAWP_AI_API_KEY

    if (envProvider && envApiKey) {
      return {
        provider: envProvider,
        apiKey: envApiKey,
        model: process.env.STRATAWP_AI_MODEL,
        temperature: process.env.STRATAWP_AI_TEMPERATURE
          ? parseFloat(process.env.STRATAWP_AI_TEMPERATURE)
          : undefined,
        maxTokens: process.env.STRATAWP_AI_MAX_TOKENS
          ? parseInt(process.env.STRATAWP_AI_MAX_TOKENS, 10)
          : undefined,
      }
    }

    // Fallback to config file
    if (await fs.pathExists(this.configPath)) {
      return await fs.readJSON(this.configPath)
    }

    return null
  }

  /**
   * Save configuration to file
   */
  async save(config: AIConfig): Promise<void> {
    await fs.ensureDir(path.dirname(this.configPath))
    await fs.writeJSON(this.configPath, config, { spaces: 2 })
  }

  /**
   * Check if configuration exists
   */
  async exists(): Promise<boolean> {
    // Check environment variables first
    if (
      process.env.STRATAWP_AI_PROVIDER &&
      process.env.STRATAWP_AI_API_KEY
    ) {
      return true
    }

    // Check config file
    return await fs.pathExists(this.configPath)
  }

  /**
   * Delete configuration
   */
  async delete(): Promise<void> {
    if (await fs.pathExists(this.configPath)) {
      await fs.remove(this.configPath)
    }
  }

  /**
   * Get configuration file path
   */
  getConfigPath(): string {
    return this.configPath
  }

  /**
   * Create a .env.example file with AI configuration template
   */
  async createEnvExample(): Promise<void> {
    const examplePath = path.join(process.cwd(), '.env.example')
    const content = `# StrataWP AI Configuration
# Choose your AI provider: openai or anthropic
STRATAWP_AI_PROVIDER=anthropic

# Your API key (get from provider's dashboard)
STRATAWP_AI_API_KEY=your-api-key-here

# Optional: Specify model (defaults to latest)
# STRATAWP_AI_MODEL=claude-3-5-sonnet-20241022
# STRATAWP_AI_MODEL=gpt-4-turbo-preview

# Optional: Temperature (0.0 - 1.0, default: 0.7)
# STRATAWP_AI_TEMPERATURE=0.7

# Optional: Max tokens (default: 2000)
# STRATAWP_AI_MAX_TOKENS=2000
`

    await fs.writeFile(examplePath, content)
  }
}
