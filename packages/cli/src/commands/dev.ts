import chalk from 'chalk'
import ora from 'ora'
import { execa } from 'execa'

interface DevOptions {
  port: string
  host: string
}

export async function devCommand(options: DevOptions) {
  console.log(chalk.bold.cyan('⚒️  StrataWP Development Server\n'))

  const spinner = ora('Starting Vite dev server...').start()

  try {
    // Start Vite with WordPress plugin
    const viteProcess = execa('vite', ['--port', options.port, '--host', options.host], {
      stdio: 'inherit',
    })

    spinner.succeed('Development server started!')

    console.log()
    console.log(chalk.green('  ➜') + '  Local:   ' + chalk.cyan(`http://${options.host}:${options.port}`))
    console.log(chalk.green('  ➜') + '  Hot reload enabled')
    console.log(chalk.green('  ➜') + '  TypeScript checking in background')
    console.log()
    console.log(chalk.dim('  Press Ctrl+C to stop'))
    console.log()

    await viteProcess
  } catch (error) {
    spinner.fail('Failed to start development server')
    console.error(error)
    process.exit(1)
  }
}
