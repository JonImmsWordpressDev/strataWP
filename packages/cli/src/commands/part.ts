/**
 * Template part generation command
 */
import path from 'path'
import chalk from 'chalk'
import { validatePartName, slugify } from '../utils/validation'
import { generatePartHTML, generatePartPHP } from '../utils/templates'
import { createFileWithSpinner, ensureDir } from '../utils/filesystem'

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

  // Generate slug
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
      themeSlug = packageJson.name
    }
  } catch {
    // Use directory name if no package.json
  }

  // Generate part content
  const partContent = options.markup === 'html'
    ? generatePartHTML(options.type)
    : generatePartPHP(options.type, themeSlug)

  // Create part file
  await createFileWithSpinner(
    partPath,
    partContent,
    `Creating ${slug}.${ext} template part`
  )

  // Success message
  console.log(chalk.green('\n✓ Template part created successfully!\n'))
  console.log(chalk.dim(`  Part: parts/${slug}.${ext}`))
  console.log(chalk.dim(`  Type: ${options.type}`))
  console.log(chalk.dim(`  Markup: ${options.markup}`))

  console.log(chalk.cyan('\n  Next steps:'))
  console.log(chalk.dim(`  1. Edit the part in parts/${slug}.${ext}`))
  console.log(chalk.dim('  2. Use in templates with <!-- wp:template-part {\"slug\":\"' + slug + '\"} /-->'))
  console.log(chalk.dim('  3. Or in PHP with get_template_part(\'parts/' + slug + '\')\n'))
}
