/**
 * AI Generate Command
 * Generate WordPress blocks and components using AI
 */

import prompts from 'prompts'
import chalk from 'chalk'
import ora from 'ora'
import fs from 'fs-extra'
import path from 'path'
import { ConfigManager } from '../utils/config'
import { OpenAIProvider } from '../providers/openai'
import { AnthropicProvider } from '../providers/anthropic'
import type { BaseAIProvider } from '../providers/base'

interface GenerateOptions {
  type: 'block' | 'component' | 'pattern'
  output?: string
}

export async function generateCommand(options: GenerateOptions) {
  console.log(chalk.cyan('\n🤖 AI Code Generator\n'))

  // Load configuration
  const configManager = new ConfigManager()
  const config = await configManager.load()

  if (!config) {
    console.log(chalk.red('❌ No AI configuration found.'))
    console.log(chalk.yellow('\nPlease run: stratawp ai:setup'))
    return
  }

  // Get description from user
  const response = await prompts([
    {
      type: 'text',
      name: 'description',
      message: `Describe the ${options.type} you want to create:`,
      validate: (value) =>
        value.length < 10
          ? 'Please provide a more detailed description'
          : true,
    },
    {
      type: 'text',
      name: 'name',
      message: `${options.type.charAt(0).toUpperCase() + options.type.slice(1)} name:`,
      validate: (value) => (value.length > 0 ? true : 'Name is required'),
    },
  ])

  if (!response.description || !response.name) {
    console.log(chalk.red('\n✖ Generation cancelled\n'))
    return
  }

  const spinner = ora('Generating code with AI...').start()

  try {
    // Initialize AI provider
    const provider = createProvider(config)

    // Generate code based on type
    let generatedCode: string

    switch (options.type) {
      case 'block':
        generatedCode = await generateBlock(
          provider,
          response.name,
          response.description
        )
        break
      case 'component':
        generatedCode = await generateComponent(
          provider,
          response.name,
          response.description
        )
        break
      case 'pattern':
        generatedCode = await generatePattern(
          provider,
          response.name,
          response.description
        )
        break
      default:
        throw new Error(`Unsupported type: ${options.type}`)
    }

    spinner.succeed('Code generated successfully!')

    // Save to file
    const outputPath = options.output || getDefaultOutputPath(options.type, response.name)
    await fs.ensureDir(path.dirname(outputPath))
    await fs.writeFile(outputPath, generatedCode)

    console.log(chalk.green(`\n✓ Saved to: ${outputPath}\n`))
  } catch (error) {
    spinner.fail('Failed to generate code')
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

async function generateBlock(
  provider: BaseAIProvider,
  name: string,
  description: string
): Promise<string> {
  const prompt = `Generate a WordPress Gutenberg block using React and TypeScript for StrataWP.

Block Name: ${name}
Description: ${description}

Requirements:
- Use @wordpress/blocks, @wordpress/block-editor, @wordpress/components
- TypeScript with proper types
- Include block.json with API version 3
- Include both edit and save functions
- Use modern React hooks
- Include proper accessibility attributes
- Add helpful comments

Generate THREE files:
1. block.json - Block metadata
2. index.tsx - Block registration and edit function
3. save.tsx - Save function

Format the output as:
\`\`\`json:block.json
// block.json content
\`\`\`

\`\`\`typescript:index.tsx
// index.tsx content
\`\`\`

\`\`\`typescript:save.tsx
// save.tsx content
\`\`\`
`

  const response = await provider.complete([
    {
      role: 'system',
      content:
        'You are an expert WordPress and React developer. Generate clean, modern, production-ready code following WordPress and React best practices.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ])

  return response.content
}

async function generateComponent(
  provider: BaseAIProvider,
  name: string,
  description: string
): Promise<string> {
  const prompt = `Generate a WordPress theme component for StrataWP using PHP 8.1+.

Component Name: ${name}
Description: ${description}

Requirements:
- PHP 8.1+ with strict types
- Implement StrataWP\\ComponentInterface
- Use proper namespace
- Include PHPDoc comments
- Follow WordPress coding standards
- Include hooks and filters where appropriate
- Add error handling

Generate the PHP component class.`

  const response = await provider.complete([
    {
      role: 'system',
      content:
        'You are an expert WordPress and PHP developer. Generate clean, modern, production-ready code following WordPress coding standards.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ])

  return response.content
}

async function generatePattern(
  provider: BaseAIProvider,
  name: string,
  description: string
): Promise<string> {
  const prompt = `Generate a WordPress block pattern for StrataWP.

Pattern Name: ${name}
Description: ${description}

Requirements:
- Use Block Theme (FSE) markup
- Include pattern header with title, slug, categories
- Use modern WordPress blocks
- Add proper spacing and styling
- Make it responsive
- Follow WordPress pattern best practices

Generate a PHP pattern file.`

  const response = await provider.complete([
    {
      role: 'system',
      content:
        'You are an expert WordPress developer specializing in Block Themes and patterns. Generate clean, semantic markup.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ])

  return response.content
}

function getDefaultOutputPath(type: string, name: string): string {
  const cwd = process.cwd()

  switch (type) {
    case 'block':
      return path.join(cwd, 'src', 'blocks', name, 'generated.md')
    case 'component':
      return path.join(cwd, 'inc', 'Components', `${name}.php`)
    case 'pattern':
      return path.join(cwd, 'patterns', `${name}.php`)
    default:
      return path.join(cwd, `${name}.txt`)
  }
}
