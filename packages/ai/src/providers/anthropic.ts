/**
 * Anthropic (Claude) Provider Implementation
 */

import Anthropic from '@anthropic-ai/sdk'
import { BaseAIProvider } from './base'
import type {
  AIProviderConfig,
  AIMessage,
  AIResponse,
  AIStreamCallback,
} from './base'

export class AnthropicProvider extends BaseAIProvider {
  private client: Anthropic

  constructor(config: AIProviderConfig) {
    super({
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      maxTokens: 2000,
      ...config,
    })

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
    })
  }

  async complete(
    messages: AIMessage[],
    options?: Partial<AIProviderConfig>
  ): Promise<AIResponse> {
    const mergedConfig = { ...this.config, ...options }

    // Extract system message if present
    const systemMessage = messages.find((m) => m.role === 'system')
    const userMessages = messages.filter((m) => m.role !== 'system')

    const response = await this.client.messages.create({
      model: mergedConfig.model!,
      max_tokens: mergedConfig.maxTokens!,
      temperature: mergedConfig.temperature,
      system: systemMessage?.content,
      messages: userMessages.map((msg) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
    })

    const content =
      response.content[0]?.type === 'text' ? response.content[0].text : ''

    return {
      content,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    }
  }

  async stream(
    messages: AIMessage[],
    callbacks: AIStreamCallback,
    options?: Partial<AIProviderConfig>
  ): Promise<void> {
    const mergedConfig = { ...this.config, ...options }

    try {
      const systemMessage = messages.find((m) => m.role === 'system')
      const userMessages = messages.filter((m) => m.role !== 'system')

      const stream = await this.client.messages.create({
        model: mergedConfig.model!,
        max_tokens: mergedConfig.maxTokens!,
        temperature: mergedConfig.temperature,
        system: systemMessage?.content,
        messages: userMessages.map((msg) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        })),
        stream: true,
      })

      let fullText = ''

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          const token = event.delta.text
          fullText += token
          callbacks.onToken(token)
        }
      }

      callbacks.onComplete(fullText)
    } catch (error) {
      callbacks.onError(error as Error)
    }
  }

  async validate(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: this.config.model!,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      })
      return true
    } catch {
      return false
    }
  }

  getProviderName(): string {
    return 'Anthropic (Claude)'
  }
}
