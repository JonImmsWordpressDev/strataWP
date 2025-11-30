/**
 * Component generation command
 */
import path from 'path'
import chalk from 'chalk'
import { validateComponentName, toPascalCase, validateNamespace } from '../utils/validation'
import { generateComponentClass } from '../utils/templates'
import { createFileWithSpinner, ensureDir } from '../utils/filesystem'

interface ComponentOptions {
  type: 'service' | 'feature' | 'integration' | 'custom'
  namespace?: string
}

export async function componentCommand(name: string, options: ComponentOptions): Promise<void> {
  console.log(chalk.cyan('\n⚒️  Creating PHP Component\n'))

  // Validate name
  const validation = validateComponentName(name)
  if (!validation.valid) {
    console.error(chalk.red(`✖ ${validation.error}`))
    process.exit(1)
  }

  // Convert to PascalCase
  const className = toPascalCase(name)
  const cwd = process.cwd()
  const componentsDir = path.join(cwd, 'inc', 'Components')
  const componentPath = path.join(componentsDir, `${className}.php`)

  // Check if component already exists
  const fs = await import('fs-extra')
  if (await fs.pathExists(componentPath)) {
    console.error(chalk.red(`✖ Component "${className}" already exists`))
    process.exit(1)
  }

  // Determine namespace
  let namespace = options.namespace
  if (!namespace) {
    // Try to get from existing component or use directory name
    try {
      const existingComponents = await fs.readdir(componentsDir)
      if (existingComponents.length > 0) {
        // Read first component to extract namespace
        const firstComponent = existingComponents.find(f => f.endsWith('.php'))
        if (firstComponent) {
          const content = await fs.readFile(path.join(componentsDir, firstComponent), 'utf8')
          const namespaceMatch = content.match(/namespace\s+([^;\\]+)/)
          if (namespaceMatch) {
            namespace = namespaceMatch[1]
          }
        }
      }
    } catch {
      // Fallback to theme name
    }

    if (!namespace) {
      const themeName = toPascalCase(path.basename(cwd))
      namespace = themeName
    }
  }

  // Validate namespace
  const namespaceValidation = validateNamespace(namespace)
  if (!namespaceValidation.valid) {
    console.error(chalk.red(`✖ ${namespaceValidation.error}`))
    process.exit(1)
  }

  // Create components directory if it doesn't exist
  await ensureDir(componentsDir)

  // Generate component class
  const componentContent = generateComponentClass(className, namespace, options.type)

  // Create component file
  await createFileWithSpinner(
    componentPath,
    componentContent,
    `Creating ${className}.php component`
  )

  // Success message
  console.log(chalk.green('\n✓ Component created successfully!\n'))
  console.log(chalk.dim(`  Component: inc/Components/${className}.php`))
  console.log(chalk.dim(`  Namespace: ${namespace}\\Components`))
  console.log(chalk.dim(`  Type: ${options.type}`))

  console.log(chalk.cyan('\n  Next steps:'))
  console.log(chalk.dim('  1. Add your component logic to the class'))
  console.log(chalk.dim('  2. Register in functions.php:'))
  console.log(chalk.dim(`     new ${namespace}\\Components\\${className}(),\n`))
}
