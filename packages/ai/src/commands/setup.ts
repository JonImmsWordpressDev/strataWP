/**
 * AI Setup Command
 * Interactive configuration wizard for AI providers
 */

import prompts from 'prompts'
import chalk from 'chalk'
import ora from 'ora'
import { ConfigManager } from '../utils/config'
import { OpenAIProvider } from '../providers/openai'
import { AnthropicProvider } from '../providers/anthropic'
import type { AIConfig } from '../utils/config'

export async function setupCommand() {
  console.log(chalk.cyan('\n🤖 AI Setup Wizard\n'))
  console.log(
    chalk.white(
      'This wizard will help you configure AI providers for StrataWP.\n'
    )
  )

  const configManager = new ConfigManager()

  // Check if config already exists
  const existingConfig = await configManager.load()

  if (existingConfig) {
    console.log(chalk.yellow('⚠️  Existing configuration found.\n'))
    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: 'Do you want to reconfigure?',
      initial: false,
    })

    if (!overwrite) {
      console.log(chalk.blue('\n✓ Setup cancelled. Existing config preserved.\n'))
      return
    }
  }

  // Get provider choice
  const { provider } = await prompts({
    type: 'select',
    name: 'provider',
    message: 'Choose your AI provider:',
    choices: [
      {
        title: 'Anthropic (Claude)',
        value: 'anthropic',
        description: 'Claude 3.5 Sonnet - Excellent for code generation',
      },
      {
        title: 'OpenAI (GPT-4)',
        value: 'openai',
        description: 'GPT-4 Turbo - Powerful general-purpose model',
      },
    ],
  })

  if (!provider) {
    console.log(chalk.red('\n✖ Setup cancelled\n'))
    return
  }

  // Get API key
  const { apiKey } = await prompts({
    type: 'password',
    name: 'apiKey',
    message: `Enter your ${provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key:`,
    validate: (value) => (value.length > 0 ? true : 'API key is required'),
  })

  if (!apiKey) {
    console.log(chalk.red('\n✖ Setup cancelled\n'))
    return
  }

  // Optional: Model selection
  const defaultModels = {
    openai: 'gpt-4-turbo-preview',
    anthropic: 'claude-3-5-sonnet-20241022',
  }

  const { customModel } = await prompts({
    type: 'confirm',
    name: 'customModel',
    message: 'Do you want to specify a custom model?',
    initial: false,
  })

  let model = defaultModels[provider as keyof typeof defaultModels]

  if (customModel) {
    const response = await prompts({
      type: 'text',
      name: 'model',
      message: 'Enter model name:',
      initial: model,
    })
    if (response.model) {
      model = response.model
    }
  }

  // Optional: Advanced settings
  const { advanced } = await prompts({
    type: 'confirm',
    name: 'advanced',
    message: 'Configure advanced settings?',
    initial: false,
  })

  let temperature: number | undefined
  let maxTokens: number | undefined

  if (advanced) {
    const advancedSettings = await prompts([
      {
        type: 'number',
        name: 'temperature',
        message: 'Temperature (0.0-1.0, controls randomness):',
        initial: 0.7,
        min: 0,
        max: 1,
        increment: 0.1,
      },
      {
        type: 'number',
        name: 'maxTokens',
        message: 'Max tokens (max response length):',
        initial: 2000,
        min: 100,
        max: 8000,
      },
    ])
    temperature = advancedSettings.temperature
    maxTokens = advancedSettings.maxTokens
  }

  // Create config object
  const config: AIConfig = {
    provider: provider as 'openai' | 'anthropic',
    apiKey,
    model,
    temperature,
    maxTokens,
  }

  // Validate API key
  const spinner = ora('Validating API key...').start()

  try {
    const providerInstance =
      provider === 'openai'
        ? new OpenAIProvider(config)
        : new AnthropicProvider(config)

    const isValid = await providerInstance.validate()

    if (!isValid) {
      spinner.fail('Invalid API key')
      console.log(chalk.red('\n✖ The provided API key could not be validated.\n'))
      return
    }

    spinner.succeed('API key validated successfully')
  } catch (error) {
    spinner.fail('Validation failed')
    console.error(chalk.red('\nError validating API key:'), error)
    return
  }

  // Choose storage method
  const { storageMethod } = await prompts({
    type: 'select',
    name: 'storageMethod',
    message: 'Where should we store your configuration?',
    choices: [
      {
        title: 'Config file (~/.stratawp/ai-config.json)',
        value: 'config',
        description: 'Recommended: Centralized config for all projects',
      },
      {
        title: '.env file (current project only)',
        value: 'env',
        description: 'Project-specific configuration',
      },
    ],
  })

  if (!storageMethod) {
    console.log(chalk.red('\n✖ Setup cancelled\n'))
    return
  }

  // Save configuration
  const saveSpinner = ora('Saving configuration...').start()

  try {
    if (storageMethod === 'config') {
      await configManager.save(config)
      saveSpinner.succeed(`Configuration saved to ${configManager.getConfigPath()}`)
    } else {
      await configManager.createEnvExample()
      saveSpinner.succeed('.env.example created')
      console.log(
        chalk.yellow(
          '\n⚠️  Please copy .env.example to .env and update with your API key.\n'
        )
      )
    }

    console.log(chalk.green('\n✓ AI setup complete!\n'))
    console.log(chalk.white('Available commands:'))
    console.log(
      chalk.cyan('  stratawp ai:generate <type>') +
        chalk.gray(' - Generate code (block|component|pattern)')
    )
    console.log(
      chalk.cyan('  stratawp ai:review <file>') +
        chalk.gray(' - Review code for best practices')
    )
    console.log(
      chalk.cyan('  stratawp ai:document <file>') +
        chalk.gray(' - Generate documentation')
    )
    console.log()
  } catch (error) {
    saveSpinner.fail('Failed to save configuration')
    console.error(chalk.red('\nError:'), error)
  }
}
