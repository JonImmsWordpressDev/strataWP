/**
 * Template part generation command
 */
import path from 'path'
import chalk from 'chalk'
import { validatePartName, slugify } from '../utils/validation'
import { createFileWithSpinner, ensureDir } from '../utils/filesystem'
import { generatePart } from '../generators/part'

interface PartOptions {
  type: 'header' | 'footer' | 'sidebar' | 'content' | 'custom'
  markup: 'html' | 'php'
}

export async function partCommand(name: string, options: PartOptions): Promise<void> {
  console.log(chalk.cyan('\n⚒️  Creating Template Part\n'))

  // Validate name
  const validation = validatePartName(name)
  if (!validation.valid) {
    console.error(chalk.red(`✖ ${validation.error}`))
    process.exit(1)
  }

  // Generate slug for exists-check
  const slug = slugify(name)
  const cwd = process.cwd()
  const partsDir = path.join(cwd, 'parts')
  const ext = options.markup === 'html' ? 'html' : 'php'
  const partPath = path.join(partsDir, `${slug}.${ext}`)

  // Check if part already exists
  const fs = await import('fs-extra')
  if (await fs.pathExists(partPath)) {
    console.error(chalk.red(`✖ Template part "${slug}.${ext}" already exists`))
    process.exit(1)
  }

  // Create parts directory if it doesn't exist
  await ensureDir(partsDir)

  // Get theme slug from current directory or package.json
  let themeSlug = path.basename(cwd)
  try {
    const packageJson = await fs.readJson(path.join(cwd, 'package.json'))
    if (packageJson.name) {
      themeSlug = packageJson.name as string
    }
  } catch {
    // Use directory name if no package.json
  }

  // Generate content via pure core
  const result = generatePart({ name, type: options.type, markup: options.markup, themeSlug })

  // Write files
  for (const file of result.files) {
    await createFileWithSpinner(
      path.join(cwd, file.path),
      file.content,
      `Creating ${slug}.${ext} template part`
    )
  }

  // Success message
  console.log(chalk.green('\n✓ Template part created successfully!\n'))
  for (const msg of result.messages) {
    console.log(chalk.dim(`  ${msg}`))
  }
  console.log()
}
