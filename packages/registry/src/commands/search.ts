/**
 * Registry Search Command
 * Search for components in the registry
 */

import chalk from 'chalk'
import { RegistryClient } from '../utils/registry-client'

interface SearchOptions {
  type?: string
  limit?: number
}

export async function searchCommand(query: string, options: SearchOptions = {}) {
  console.log(chalk.cyan(`\n🔍 Searching for: ${query}\n`))

  try {
    const client = new RegistryClient()
    const results = await client.search(query, {
      type: options.type,
      size: options.limit || 20,
    })

    if (results.length === 0) {
      console.log(chalk.yellow('No components found matching your query.'))
      console.log(chalk.dim('\nTry a different search term or browse all components:'))
      console.log(chalk.cyan('  stratawp registry:search ""'))
      return
    }

    console.log(chalk.green(`Found ${results.length} component(s):\n`))

    // Display results in a table-like format
    for (const result of results) {
      const typeColor = getTypeColor(result.type)
      const type = chalk[typeColor](`[${result.type}]`)

      console.log(chalk.bold(result.name) + ' ' + type)
      console.log(chalk.gray(`  ${result.description}`))
      console.log(chalk.dim(`  v${result.version} • by ${result.author || 'Unknown'}`))

      if (result.keywords && result.keywords.length > 0) {
        const keywords = result.keywords
          .filter(k => k !== 'stratawp' && k !== result.type)
          .slice(0, 5)
          .map(k => chalk.blue(`#${k}`))
          .join(' ')

        if (keywords) {
          console.log(chalk.dim(`  ${keywords}`))
        }
      }

      console.log()
    }

    console.log(chalk.white('─'.repeat(60)))
    console.log(chalk.dim('Install a component:'))
    console.log(chalk.cyan('  stratawp registry:install <component-name>'))
    console.log(chalk.dim('\nGet more info:'))
    console.log(chalk.cyan('  stratawp registry:info <component-name>\n'))
  } catch (error) {
    console.error(chalk.red('\n✖ Search failed'))
    console.error(chalk.red(error instanceof Error ? error.message : String(error)))
    process.exit(1)
  }
}

function getTypeColor(type: string): 'magenta' | 'blue' | 'green' | 'yellow' | 'cyan' {
  switch (type) {
    case 'block':
      return 'magenta'
    case 'component':
      return 'blue'
    case 'pattern':
      return 'green'
    case 'template':
      return 'yellow'
    case 'integration':
      return 'cyan'
    default:
      return 'blue'
  }
}
