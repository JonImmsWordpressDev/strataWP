/**
 * Template generation command
 */
import path from 'path'
import chalk from 'chalk'
import ora from 'ora'
import { validateTemplateName, slugify } from '../utils/validation'
import { generateTemplateHTML } from '../utils/templates'
import { createFileWithSpinner, ensureDir } from '../utils/filesystem'

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

  // Generate slug
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
      themeSlug = packageJson.name
    }
  } catch {
    // Use directory name if no package.json
  }

  // Generate template content
  const templateContent = generateTemplateHTML(options.type, themeSlug)

  // Create template file
  await createFileWithSpinner(
    templatePath,
    templateContent,
    `Creating ${slug}.html template`
  )

  // Success message
  console.log(chalk.green('\n✓ Template created successfully!\n'))
  console.log(chalk.dim(`  Template: templates/${slug}.html`))
  console.log(chalk.dim(`  Type: ${options.type}`))

  if (options.description) {
    console.log(chalk.dim(`  Description: ${options.description}`))
  }

  console.log(chalk.cyan('\n  Next steps:'))
  console.log(chalk.dim('  1. Edit the template in templates/' + slug + '.html'))
  console.log(chalk.dim('  2. Add your custom blocks and content'))
  console.log(chalk.dim('  3. The template will be available in WordPress theme editor\n'))
}
