import { Command } from 'commander'
import { devCommand } from './commands/dev'
import { buildCommand } from './commands/build'
import { blockCommand } from './commands/block'
import { componentCommand } from './commands/component'
import { testCommand } from './commands/test'
import { templateCommand } from './commands/template'
import { partCommand } from './commands/part'
import { designSystemCommand } from './commands/design-system'
import { startCommand as explorerStartCommand } from '@stratawp/explorer'
import { setupCommand as deploySetupCommand } from './commands/deploy/setup'
import {
  deployCommand,
  listCommand as deployListCommand,
  testCommand as deployTestCommand,
} from './commands/deploy/index'
import {
  rollbackListCommand,
  rollbackDiffCommand,
  rollbackMarkStableCommand,
} from './commands/rollback'
import {
  syncDbPullCommand,
  syncDbPushCommand,
} from './commands/sync'
import {
  syncTemplatesCommand,
  listTemplatesCommand,
} from './commands/deploy/sync-templates'
import { updateCommand } from './commands/update'
import { iconsSetupCommand, iconsUpdateCommand, iconsListCommand } from './commands/icons'

const program = new Command()

program
  .name('stratawp')
  .description('⚡ A modern WordPress theme framework')
  .version('2.0.0')

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

// Deployment commands
program
  .command('deploy:setup')
  .description('Configure deployment environments')
  .action(deploySetupCommand)

program
  .command('deploy <environment>')
  .description('Deploy theme to specified environment')
  .option('--no-build', 'Skip build step')
  .option('--dry-run', 'Show what would be deployed without deploying')
  .option('--force', 'Deploy without confirmation prompt')
  .option('--fresh', 'Ignore manifest and upload all files (full deploy)')
  .option('--no-backup', 'Skip creating backup')
  .option('--verbose', 'Show detailed debug output')
  .action(deployCommand)

program
  .command('deploy:list')
  .description('List configured deployment environments')
  .action(deployListCommand)

program
  .command('deploy:test <environment>')
  .description('Test connection to deployment environment')
  .action(deployTestCommand)

// Rollback commands
program
  .command('rollback:list')
  .alias('rollback:ls')
  .description('List available deployment snapshots')
  .option('-e, --environment <env>', 'Filter by environment')
  .option('-n, --limit <number>', 'Limit results', '10')
  .action(rollbackListCommand)

program
  .command('rollback:diff <snapshot1> <snapshot2>')
  .description('Compare two snapshots')
  .action(rollbackDiffCommand)

program
  .command('rollback:mark-stable <snapshot>')
  .description('Mark a snapshot as known-good (stable)')
  .action(rollbackMarkStableCommand)

// Sync commands
program
  .command('sync:db:pull <environment>')
  .description('Pull database from remote environment to local')
  .option('--tables <tables>', 'Only sync specific tables (comma-separated)')
  .option('--no-url-replace', 'Skip URL replacement')
  .option('--dry-run', 'Show what would be done without doing it')
  .action(syncDbPullCommand)

program
  .command('sync:db:push <environment>')
  .description('Push local database to remote environment')
  .option('--tables <tables>', 'Only sync specific tables (comma-separated)')
  .option('--no-url-replace', 'Skip URL replacement')
  .option('--dry-run', 'Show what would be done without doing it')
  .option('--force', 'Skip confirmation prompt')
  .action(syncDbPushCommand)

program
  .command('sync:templates <environment>')
  .description('Sync FSE templates from local database to remote via SSH')
  .option('-t, --template <name>', 'Sync a specific template by slug')
  .option('--all', 'Sync all templates')
  .option('--dry-run', 'Show what would be synced without syncing')
  .option('--wp-path <path>', 'Local WordPress root path')
  .option('--wp-cli <path>', 'Path to local WP-CLI binary')
  .option('--verbose', 'Show detailed output')
  .action(syncTemplatesCommand)

program
  .command('sync:templates:list <environment>')
  .description('List FSE templates on local and remote')
  .option('--wp-path <path>', 'Local WordPress root path')
  .option('--wp-cli <path>', 'Path to local WP-CLI binary')
  .action(listTemplatesCommand)

// Update command
program
  .command('update')
  .description('Check for and apply StrataWP package updates')
  .option('-c, --check', 'Check for updates without applying them')
  .option('-f, --force', 'Skip confirmation prompts')
  .action(updateCommand)

// Icon font management
program
  .command('icons:setup')
  .description('Set up icon font directory (Flaticon)')
  .option('--zip <path>', 'Path to Flaticon icon font ZIP file')
  .action(iconsSetupCommand)

program
  .command('icons:update')
  .description('Update icon font from new ZIP file')
  .option('--zip <path>', 'Path to Flaticon icon font ZIP file')
  .action(iconsUpdateCommand)

program
  .command('icons:list')
  .description('List available icon names')
  .action(iconsListCommand)

program.parse()
