/**
 * Registry List Command
 * List installed StrataWP components
 */

import chalk from 'chalk'
import fs from 'fs-extra'
import path from 'path'
import type { ComponentType } from '../types'

interface InstalledComponent {
  name: string
  type: ComponentType
  location: string
}

export async function listCommand() {
  console.log(chalk.cyan('\n📦 Installed StrataWP Components\n'))

  try {
    const cwd = process.cwd()
    const components: InstalledComponent[] = []

    // Check for blocks
    const blocksDir = path.join(cwd, 'src', 'blocks')
    if (await fs.pathExists(blocksDir)) {
      const blocks = await fs.readdir(blocksDir)
      for (const block of blocks) {
        const blockPath = path.join(blocksDir, block)
        const stat = await fs.stat(blockPath)
        if (stat.isDirectory()) {
          components.push({
            name: block,
            type: 'block',
            location: path.relative(cwd, blockPath),
          })
        }
      }
    }

    // Check for components
    const componentsDir = path.join(cwd, 'inc', 'Components')
    if (await fs.pathExists(componentsDir)) {
      const phpComponents = await fs.readdir(componentsDir)
      for (const component of phpComponents) {
        if (component.endsWith('.php')) {
          components.push({
            name: component.replace('.php', ''),
            type: 'component',
            location: path.relative(cwd, path.join(componentsDir, component)),
          })
        }
      }
    }

    // Check for patterns
    const patternsDir = path.join(cwd, 'patterns')
    if (await fs.pathExists(patternsDir)) {
      const patterns = await fs.readdir(patternsDir)
      for (const pattern of patterns) {
        if (pattern.endsWith('.php')) {
          components.push({
            name: pattern.replace('.php', ''),
            type: 'pattern',
            location: path.relative(cwd, path.join(patternsDir, pattern)),
          })
        }
      }
    }

    // Check for templates
    const templatesDir = path.join(cwd, 'templates')
    if (await fs.pathExists(templatesDir)) {
      const templates = await fs.readdir(templatesDir)
      for (const template of templates) {
        if (template.endsWith('.html')) {
          components.push({
            name: template.replace('.html', ''),
            type: 'template',
            location: path.relative(cwd, path.join(templatesDir, template)),
          })
        }
      }
    }

    // Check for template parts
    const partsDir = path.join(cwd, 'parts')
    if (await fs.pathExists(partsDir)) {
      const parts = await fs.readdir(partsDir)
      for (const part of parts) {
        if (part.endsWith('.html')) {
          components.push({
            name: part.replace('.html', ''),
            type: 'part',
            location: path.relative(cwd, path.join(partsDir, part)),
          })
        }
      }
    }

    if (components.length === 0) {
      console.log(chalk.yellow('No components found in this theme.'))
      console.log(chalk.dim('\nInstall components with:'))
      console.log(chalk.cyan('  stratawp registry:search <query>'))
      console.log(chalk.cyan('  stratawp registry:install <component>\n'))
      return
    }

    // Group by type
    const byType = components.reduce(
      (acc, component) => {
        if (!acc[component.type]) {
          acc[component.type] = []
        }
        acc[component.type].push(component)
        return acc
      },
      {} as Record<string, InstalledComponent[]>
    )

    // Display grouped components
    for (const [type, items] of Object.entries(byType)) {
      const typeLabel = getTypeLabel(type as ComponentType)
      const typeColor = getTypeColor(type as ComponentType)

      console.log(chalk[typeColor].bold(`${typeLabel} (${items.length})`))

      for (const item of items) {
        console.log(chalk.dim('  •'), chalk.white(item.name))
        console.log(chalk.dim(`    ${item.location}`))
      }

      console.log()
    }

    console.log(chalk.dim(`Total: ${components.length} component(s)`))
    console.log()
  } catch (error) {
    console.error(chalk.red('\n✖ Failed to list components'))
    console.error(chalk.red(error instanceof Error ? error.message : String(error)))
    process.exit(1)
  }
}

function getTypeLabel(type: ComponentType): string {
  switch (type) {
    case 'block':
      return 'Gutenberg Blocks'
    case 'component':
      return 'PHP Components'
    case 'pattern':
      return 'Block Patterns'
    case 'template':
      return 'Templates'
    case 'part':
      return 'Template Parts'
    default:
      return 'Components'
  }
}

function getTypeColor(type: ComponentType): 'magenta' | 'blue' | 'green' | 'yellow' | 'cyan' {
  switch (type) {
    case 'block':
      return 'magenta'
    case 'component':
      return 'blue'
    case 'pattern':
      return 'green'
    case 'template':
      return 'yellow'
    case 'part':
      return 'cyan'
    default:
      return 'blue'
  }
}
