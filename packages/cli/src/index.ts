import { Command } from 'commander'
import chalk from 'chalk'
import { devCommand } from './commands/dev'
import { buildCommand } from './commands/build'
import { blockCommand } from './commands/block'
import { componentCommand } from './commands/component'
import { testCommand } from './commands/test'
import { templateCommand } from './commands/template'
import { partCommand } from './commands/part'
import { designSystemCommand } from './commands/design-system'
import {
  setupCommand,
  generateCommand,
  reviewCommand,
  documentCommand,
} from '@stratawp/ai'

const program = new Command()

program
  .name('stratawp')
  .description('⚡ A modern WordPress theme framework')
  .version('0.2.2')

// Development server
program
  .command('dev')
  .description('Start development server with hot reload')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('-h, --host <host>', 'Host address', 'localhost')
  .action(devCommand)

// Production build
program
  .command('build')
  .description('Build theme for production')
  .option('--analyze', 'Analyze bundle size')
  .action(buildCommand)

// Generate block
program
  .command('block:new <name>')
  .description('Create a new Gutenberg block')
  .option('-t, --type <type>', 'Block type (static|dynamic)', 'dynamic')
  .option('--category <category>', 'Block category', 'common')
  .option('--styleFramework <framework>', 'Style framework (none|tailwind|unocss)', 'none')
  .action(blockCommand)

// Generate component
program
  .command('component:new <name>')
  .description('Create a new theme component')
  .option('-t, --type <type>', 'Component type (service|feature|integration|custom)', 'custom')
  .option('--namespace <namespace>', 'PHP namespace')
  .action(componentCommand)

// Generate template
program
  .command('template:new <name>')
  .description('Create a new WordPress template')
  .option('-t, --type <type>', 'Template type (page|single|archive|404|home|search|custom)', 'page')
  .option('--description <text>', 'Template description')
  .action(templateCommand)

// Generate template part
program
  .command('part:new <name>')
  .description('Create a new template part')
  .option('-t, --type <type>', 'Part type (header|footer|sidebar|content|custom)', 'custom')
  .option('--markup <markup>', 'Markup style (html|php)', 'php')
  .action(partCommand)

// Design system setup
program
  .command('design-system:setup <framework>')
  .description('Set up a design system (tailwind|unocss)')
  .action(designSystemCommand)

// Testing
program
  .command('test')
  .description('Run tests')
  .option('--unit', 'Run unit tests only')
  .option('--e2e', 'Run E2E tests only')
  .option('--watch', 'Watch mode')
  .action(testCommand)

// Component explorer
program
  .command('storybook')
  .description('Launch component explorer')
  .action(() => {
    console.log(chalk.cyan('🎭 Launching component explorer...'))
    console.log(chalk.dim('Coming soon!'))
  })

// AI-powered commands
program
  .command('ai:setup')
  .description('Configure AI providers and API keys')
  .action(setupCommand)

program
  .command('ai:generate <type>')
  .description('Generate code with AI (block|component|pattern)')
  .option('-o, --output <path>', 'Output file path')
  .action((type: string, options: any) => {
    generateCommand({ type: type as 'block' | 'component' | 'pattern', ...options })
  })

program
  .command('ai:review <file>')
  .description('Review code for best practices and security')
  .option('-f, --focus <focus>', 'Focus area (security|performance|best-practices|all)', 'all')
  .action((file: string, options: any) => {
    reviewCommand({ file, ...options })
  })

program
  .command('ai:document <file>')
  .description('Generate documentation for code')
  .option('-o, --output <path>', 'Output file path')
  .option('-f, --format <format>', 'Documentation format (markdown|phpdoc|jsdoc)')
  .action((file: string, options: any) => {
    documentCommand({ file, ...options })
  })

program.parse()
