/**
 * Start Command
 * Launch the component explorer dev server
 */

import ora from 'ora'
import chalk from 'chalk'
import type { ExplorerConfig } from '../types.js'
import { ExplorerDevServer } from '../server/dev-server.js'

export interface StartOptions {
  port?: number
  host?: string
  open?: boolean
}

export async function startCommand(options: StartOptions = {}): Promise<void> {
  const spinner = ora('Starting Component Explorer...').start()

  try {
    const config: ExplorerConfig = {
      port: options.port || 3000,
      host: options.host || 'localhost',
      open: options.open !== false,
      rootDir: process.cwd(),
    }

    const server = new ExplorerDevServer(config)
    await server.start()

    spinner.succeed(chalk.green('Component Explorer started!'))

    console.log(
      chalk.cyan('\n📚 Browse your components at:'),
      chalk.bold(`http://${config.host}:${config.port}`)
    )
    console.log(chalk.gray('\nPress Ctrl+C to stop\n'))

    // Keep process alive
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n\nShutting down...'))
      await server.stop()
      process.exit(0)
    })
  } catch (error) {
    spinner.fail(chalk.red('Failed to start Component Explorer'))
    console.error(error)
    process.exit(1)
  }
}
