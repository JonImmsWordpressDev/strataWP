/**
 * Base AI Provider Interface
 * All AI providers must implement this interface
 */

export interface AIProviderConfig {
  apiKey: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface AIStreamCallback {
  onToken: (token: string) => void
  onComplete: (fullText: string) => void
  onError: (error: Error) => void
}

export abstract class BaseAIProvider {
  protected config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
  }

  /**
   * Generate a completion from the AI provider
   */
  abstract complete(
    messages: AIMessage[],
    options?: Partial<AIProviderConfig>
  ): Promise<AIResponse>

  /**
   * Generate a streaming completion from the AI provider
   */
  abstract stream(
    messages: AIMessage[],
    callbacks: AIStreamCallback,
    options?: Partial<AIProviderConfig>
  ): Promise<void>

  /**
   * Validate the provider configuration
   */
  abstract validate(): Promise<boolean>

  /**
   * Get the provider name
   */
  abstract getProviderName(): string
}
