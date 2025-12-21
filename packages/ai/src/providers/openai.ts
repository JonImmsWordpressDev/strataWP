/**
 * OpenAI Provider Implementation
 */

import OpenAI from 'openai'
import { BaseAIProvider } from './base'
import type {
  AIProviderConfig,
  AIMessage,
  AIResponse,
  AIStreamCallback,
} from './base'

export class OpenAIProvider extends BaseAIProvider {
  private client: OpenAI

  constructor(config: AIProviderConfig) {
    super({
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      maxTokens: 2000,
      ...config,
    })

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
    })
  }

  async complete(
    messages: AIMessage[],
    options?: Partial<AIProviderConfig>
  ): Promise<AIResponse> {
    const mergedConfig = { ...this.config, ...options }

    const response = await this.client.chat.completions.create({
      model: mergedConfig.model!,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: mergedConfig.temperature,
      max_tokens: mergedConfig.maxTokens,
    })

    return {
      content: response.choices[0]?.message?.content || '',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
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
      const stream = await this.client.chat.completions.create({
        model: mergedConfig.model!,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: mergedConfig.temperature,
        max_tokens: mergedConfig.maxTokens,
        stream: true,
      })

      let fullText = ''

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || ''
        if (token) {
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
      await this.client.models.list()
      return true
    } catch {
      return false
    }
  }

  getProviderName(): string {
    return 'OpenAI'
  }
}
