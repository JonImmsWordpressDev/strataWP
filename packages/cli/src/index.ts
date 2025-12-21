import { Command } from 'commander'
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
import {
  searchCommand,
  installCommand,
  infoCommand,
  publishCommand,
  listCommand,
} from '@stratawp/registry'
import { startCommand as explorerStartCommand } from '@stratawp/explorer'

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
  .command('explorer')
  .description('Launch interactive component explorer')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('-h, --host <host>', 'Host address', 'localhost')
  .option('--no-open', 'Do not open browser automatically')
  .action((options: any) => {
    explorerStartCommand({
      port: options.port ? parseInt(options.port, 10) : 3000,
      host: options.host,
      open: options.open !== false,
    })
  })

// Storybook alias
program
  .command('storybook')
  .description('Alias for explorer command')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('-h, --host <host>', 'Host address', 'localhost')
  .option('--no-open', 'Do not open browser automatically')
  .action((options: any) => {
    explorerStartCommand({
      port: options.port ? parseInt(options.port, 10) : 3000,
      host: options.host,
      open: options.open !== false,
    })
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

// Component Registry commands
program
  .command('registry:search <query>')
  .description('Search for components in the registry')
  .option('-t, --type <type>', 'Filter by component type (block|component|pattern|template)')
  .option('-l, --limit <number>', 'Maximum number of results', '20')
  .action((query: string, options: any) => {
    searchCommand(query, {
      type: options.type,
      limit: parseInt(options.limit, 10),
    })
  })

program
  .command('registry:install <component>')
  .description('Install a component from the registry')
  .option('-v, --version <version>', 'Specific version to install')
  .option('-f, --force', 'Overwrite if component already exists')
  .option('-d, --dev', 'Install as dev dependency')
  .option('--target-dir <dir>', 'Custom target directory')
  .action((component: string, options: any) => {
    installCommand(component, options)
  })

program
  .command('registry:info <component>')
  .description('Get detailed information about a component')
  .action(infoCommand)

program
  .command('registry:publish')
  .description('Publish current component to the registry')
  .option('--tag <tag>', 'Publish with a specific tag')
  .option('--access <access>', 'Public or restricted access', 'public')
  .option('--dry-run', 'Test publication without actually publishing')
  .action(publishCommand)

program
  .command('registry:list')
  .description('List installed StrataWP components')
  .action(listCommand)

program.parse()
