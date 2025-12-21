/**
 * AI Code Review Command
 * Review code for best practices, security, and optimization
 */

import chalk from 'chalk'
import ora from 'ora'
import fs from 'fs-extra'
import { ConfigManager } from '../utils/config'
import { OpenAIProvider } from '../providers/openai'
import { AnthropicProvider } from '../providers/anthropic'
import type { BaseAIProvider } from '../providers/base'

interface ReviewOptions {
  file: string
  focus?: 'security' | 'performance' | 'best-practices' | 'all'
}

export async function reviewCommand(options: ReviewOptions) {
  console.log(chalk.cyan('\n🔍 AI Code Review\n'))

  // Load configuration
  const configManager = new ConfigManager()
  const config = await configManager.load()

  if (!config) {
    console.log(chalk.red('❌ No AI configuration found.'))
    console.log(chalk.yellow('\nPlease run: stratawp ai:setup'))
    return
  }

  // Check if file exists
  if (!(await fs.pathExists(options.file))) {
    console.log(chalk.red(`❌ File not found: ${options.file}`))
    return
  }

  const spinner = ora('Analyzing code...').start()

  try {
    // Read file content
    const code = await fs.readFile(options.file, 'utf-8')
    const fileExt = options.file.split('.').pop()

    // Initialize AI provider
    const provider = createProvider(config)

    // Get code review
    const review = await getCodeReview(
      provider,
      code,
      fileExt || 'unknown',
      options.focus || 'all'
    )

    spinner.succeed('Code review complete!')

    // Display review
    console.log(chalk.white('\n' + '='.repeat(60)))
    console.log(chalk.cyan.bold('Code Review Results'))
    console.log(chalk.white('='.repeat(60) + '\n'))
    console.log(review)
    console.log(chalk.white('\n' + '='.repeat(60) + '\n'))
  } catch (error) {
    spinner.fail('Failed to review code')
    console.error(chalk.red('\nError:'), error)
  }
}

function createProvider(config: any): BaseAIProvider {
  if (config.provider === 'openai') {
    return new OpenAIProvider(config)
  } else if (config.provider === 'anthropic') {
    return new AnthropicProvider(config)
  }
  throw new Error(`Unsupported provider: ${config.provider}`)
}

async function getCodeReview(
  provider: BaseAIProvider,
  code: string,
  language: string,
  focus: string
): Promise<string> {
  const focusInstructions = {
    security: 'Focus on security vulnerabilities, XSS, SQL injection, and CSRF issues.',
    performance: 'Focus on performance optimizations, database queries, and efficiency.',
    'best-practices': 'Focus on code quality, WordPress coding standards, and maintainability.',
    all: 'Review for security, performance, best practices, and overall code quality.',
  }

  const prompt = `Review the following ${language} code for a WordPress theme built with StrataWP.

Focus: ${focusInstructions[focus as keyof typeof focusInstructions]}

Code:
\`\`\`${language}
${code}
\`\`\`

Provide a detailed review covering:
1. Security issues (if any)
2. Performance concerns
3. Code quality and best practices
4. Specific suggestions for improvement
5. WordPress-specific recommendations

Format your review clearly with sections and bullet points.`

  const response = await provider.complete(
    [
      {
        role: 'system',
        content:
          'You are an expert WordPress and web security consultant. Provide detailed, actionable code reviews focusing on security, performance, and best practices.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    {
      maxTokens: 3000,
    }
  )

  return response.content
}
