import chalk from 'chalk'

interface TestOptions {
  unit?: boolean
  e2e?: boolean
  watch?: boolean
}

export async function testCommand(_options: TestOptions) {
  console.log(chalk.cyan('🧪 Running tests...'))
  console.log(chalk.yellow('⚠️  Coming soon!'))
}
