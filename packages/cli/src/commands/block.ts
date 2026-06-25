import chalk from 'chalk'
import ora from 'ora'
import fs from 'fs-extra'
import path from 'path'
import { generateBlock } from '../generators/block'

interface BlockOptions {
  category: string
  styleFramework?: 'none' | 'tailwind' | 'unocss'
}

export async function blockCommand(name: string, options: BlockOptions) {
  console.log(chalk.bold.cyan('⚒️  Creating Block\n'))
  console.log(chalk.dim(`Name: ${name}`))
  console.log(chalk.dim(`Category: ${options.category}\n`))

  const spinner = ora('Generating block...').start()

  try {
    const cwd = process.cwd()

    // Infer namespace from package.json name or directory basename
    let namespace: string
    try {
      const pkg = await fs.readJson(path.join(cwd, 'package.json'))
      namespace = (pkg.name as string) || path.basename(cwd)
    } catch {
      namespace = path.basename(cwd)
    }

    // Generate via pure core
    const result = generateBlock({
      name,
      namespace,
      category: options.category,
      styleFramework: options.styleFramework ?? 'none',
    })

    // Write files
    for (const file of result.files) {
      const fullPath = path.join(cwd, file.path)
      await fs.ensureDir(path.dirname(fullPath))
      await fs.writeFile(fullPath, file.content)
    }

    spinner.succeed(chalk.green(`Block "${name}" created!`))

    console.log()
    console.log(chalk.cyan('📁 Files created:'))
    for (const file of result.files) {
      console.log(chalk.dim(`  ${file.path}`))
    }
    // result.messages[0] is the summary line already shown by spinner.
    // Remaining entries are file paths, already printed above — no-op here.
    console.log()
  } catch (error) {
    spinner.fail('Failed to create block')
    console.error(error)
    process.exit(1)
  }
}
