/**
 * AI Documentation Command
 * Generate documentation for code files
 */

import chalk from 'chalk'
import ora from 'ora'
import fs from 'fs-extra'
import path from 'path'
import { ConfigManager } from '../utils/config'
import { OpenAIProvider } from '../providers/openai'
import { AnthropicProvider } from '../providers/anthropic'
import type { BaseAIProvider } from '../providers/base'

interface DocumentOptions {
  file: string
  output?: string
  format?: 'markdown' | 'phpdoc' | 'jsdoc'
}

export async function documentCommand(options: DocumentOptions) {
  console.log(chalk.cyan('\n📚 AI Documentation Generator\n'))

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

  const spinner = ora('Generating documentation...').start()

  try {
    // Read file content
    const code = await fs.readFile(options.file, 'utf-8')
    const fileExt = options.file.split('.').pop()

    // Determine format
    const format = options.format || inferFormat(fileExt || 'unknown')

    // Initialize AI provider
    const provider = createProvider(config)

    // Generate documentation
    const documentation = await generateDocumentation(
      provider,
      code,
      fileExt || 'unknown',
      format
    )

    spinner.succeed('Documentation generated successfully!')

    // Save or display
    if (options.output) {
      await fs.ensureDir(path.dirname(options.output))
      await fs.writeFile(options.output, documentation)
      console.log(chalk.green(`\n✓ Saved to: ${options.output}\n`))
    } else {
      console.log(chalk.white('\n' + '='.repeat(60)))
      console.log(chalk.cyan.bold('Generated Documentation'))
      console.log(chalk.white('='.repeat(60) + '\n'))
      console.log(documentation)
      console.log(chalk.white('\n' + '='.repeat(60) + '\n'))
    }
  } catch (error) {
    spinner.fail('Failed to generate documentation')
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

function inferFormat(extension: string): 'markdown' | 'phpdoc' | 'jsdoc' {
  if (extension === 'php') return 'phpdoc'
  if (['ts', 'tsx', 'js', 'jsx'].includes(extension)) return 'jsdoc'
  return 'markdown'
}

async function generateDocumentation(
  provider: BaseAIProvider,
  code: string,
  language: string,
  format: string
): Promise<string> {
  const formatInstructions = {
    markdown:
      'Generate comprehensive Markdown documentation with sections for overview, usage, parameters, examples, and best practices.',
    phpdoc:
      'Generate PHPDoc comments for all classes, methods, and functions following WordPress documentation standards.',
    jsdoc:
      'Generate JSDoc comments for all functions, classes, and exported members following TypeScript/React best practices.',
  }

  const prompt = `Generate ${format} documentation for the following ${language} code from a WordPress theme.

Code:
\`\`\`${language}
${code}
\`\`\`

Instructions: ${formatInstructions[format as keyof typeof formatInstructions]}

Include:
1. Overview/description
2. Parameters and return types
3. Usage examples
4. Important notes or warnings
5. Related functions/classes (if applicable)

Make the documentation clear, comprehensive, and following WordPress/modern development documentation standards.`

  const response = await provider.complete(
    [
      {
        role: 'system',
        content:
          'You are an expert technical writer specializing in WordPress and modern web development documentation. Generate clear, comprehensive, and well-structured documentation.',
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
