/**
 * StrataWP AI Package
 * AI-assisted development tools for WordPress themes
 */

// Export commands
export { setupCommand } from './commands/setup'
export { generateCommand } from './commands/generate'
export { reviewCommand } from './commands/review'
export { documentCommand } from './commands/document'

// Export providers
export { BaseAIProvider } from './providers/base'
export { OpenAIProvider } from './providers/openai'
export { AnthropicProvider } from './providers/anthropic'

// Export types
export type {
  AIProviderConfig,
  AIMessage,
  AIResponse,
  AIStreamCallback,
} from './providers/base'

// Export utilities
export { ConfigManager } from './utils/config'
export type { AIConfig } from './utils/config'
