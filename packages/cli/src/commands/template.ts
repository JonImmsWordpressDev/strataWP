/**
 * Template generation command
 */
import path from 'path'
import chalk from 'chalk'
import { validateTemplateName, slugify } from '../utils/validation'
import { createFileWithSpinner, ensureDir } from '../utils/filesystem'
import { generateTemplate } from '../generators/template'

interface TemplateOptions {
  type: 'page' | 'single' | 'archive' | '404' | 'home' | 'search' | 'custom'
  description?: string
}

export async function templateCommand(name: string, options: TemplateOptions): Promise<void> {
  console.log(chalk.cyan('\n⚒️  Creating WordPress Template\n'))

  // Validate name
  const validation = validateTemplateName(name)
  if (!validation.valid) {
    console.error(chalk.red(`✖ ${validation.error}`))
    process.exit(1)
  }

  // Generate slug for exists-check
  const slug = slugify(name)
  const cwd = process.cwd()
  const templatesDir = path.join(cwd, 'templates')
  const templatePath = path.join(templatesDir, `${slug}.html`)

  // Check if template already exists
  const fs = await import('fs-extra')
  if (await fs.pathExists(templatePath)) {
    console.error(chalk.red(`✖ Template "${slug}" already exists`))
    process.exit(1)
  }

  // Create templates directory if it doesn't exist
  await ensureDir(templatesDir)

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
  const result = generateTemplate({
    name,
    type: options.type,
    themeSlug,
    description: options.description,
  })

  // Write files
  for (const file of result.files) {
    await createFileWithSpinner(
      path.join(cwd, file.path),
      file.content,
      `Creating ${slug}.html template`
    )
  }

  // Success message
  console.log(chalk.green('\n✓ Template created successfully!\n'))
  for (const msg of result.messages) {
    console.log(chalk.dim(`  ${msg}`))
  }
  console.log()
}
