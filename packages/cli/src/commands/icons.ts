/**
 * Icon font management commands (Flaticon)
 */
import path from 'path'
import chalk from 'chalk'
import { ensureDir, createFileWithSpinner } from '../utils/filesystem'

/**
 * Font file extensions to extract from ZIP
 */
const FONT_EXTENSIONS = ['.woff2', '.woff', '.ttf', '.eot', '.svg']

/**
 * Parse icon names from CSS content
 */
function parseIconNames(cssContent: string): string[] {
  const regex = /\.flaticon-([a-zA-Z0-9_-]+)/g
  const names = new Set<string>()
  let match: RegExpExecArray | null

  while ((match = regex.exec(cssContent)) !== null) {
    names.add(match[1])
  }

  return Array.from(names).sort()
}

/**
 * Extract Flaticon ZIP contents to the icons directory.
 * Handles nested directory structures common in Flaticon ZIPs.
 */
async function extractFlatIconZip(zipPath: string, iconsDir: string): Promise<void> {
  const AdmZip = (await import('adm-zip')).default
  const fs = await import('fs-extra')

  const resolvedZipPath = path.resolve(zipPath)
  if (!(await fs.pathExists(resolvedZipPath))) {
    console.error(chalk.red(`\n  ZIP file not found: ${resolvedZipPath}`))
    process.exit(1)
  }

  let zip: InstanceType<typeof AdmZip>
  try {
    zip = new AdmZip(resolvedZipPath)
  } catch {
    console.error(chalk.red(`\n  Invalid or corrupted ZIP file: ${resolvedZipPath}`))
    process.exit(1)
  }

  const entries = zip.getEntries()
  const fontsDir = path.join(iconsDir, 'fonts')
  await ensureDir(fontsDir)

  let cssFound = false
  let fontCount = 0

  for (const entry of entries) {
    if (entry.isDirectory) continue

    const fileName = path.basename(entry.entryName)
    const ext = path.extname(fileName).toLowerCase()

    // CSS files -> src/icons/flaticon.css
    if (ext === '.css') {
      const content = entry.getData()
      await fs.writeFile(path.join(iconsDir, 'flaticon.css'), content)
      cssFound = true
      console.log(chalk.dim(`  Extracted CSS: flaticon.css`))
    }

    // Font files -> src/icons/fonts/
    if (FONT_EXTENSIONS.includes(ext)) {
      const content = entry.getData()
      await fs.writeFile(path.join(fontsDir, fileName), content)
      fontCount++
    }
  }

  if (!cssFound) {
    console.log(chalk.yellow('\n  Warning: No CSS file found in ZIP'))
  }

  console.log(chalk.dim(`  Extracted ${fontCount} font file(s) to fonts/`))
}

/**
 * Set up icon font directory structure
 */
export async function iconsSetupCommand(options: { zip?: string }): Promise<void> {
  console.log(chalk.cyan('\n  Setting up StrataWP Icons\n'))

  const cwd = process.cwd()
  const iconsDir = path.join(cwd, 'src', 'icons')
  const fontsDir = path.join(iconsDir, 'fonts')
  const fs = await import('fs-extra')

  // Create directories
  await ensureDir(iconsDir)
  await ensureDir(fontsDir)
  console.log(chalk.green('  Created src/icons/ and src/icons/fonts/'))

  if (options.zip) {
    // Extract ZIP file
    console.log(chalk.dim(`\n  Extracting ZIP: ${options.zip}\n`))
    await extractFlatIconZip(options.zip, iconsDir)
  } else {
    // Create README with setup instructions
    const readmeContent = `# Icons

This directory contains your Flaticon icon font files.

## Setup

1. Go to [Flaticon](https://www.flaticon.com/uicons) and select your icons
2. Download the icon font package as a ZIP
3. Run: \`stratawp icons:setup --zip path/to/downloaded.zip\`

Or update an existing setup:
\`stratawp icons:update --zip path/to/new-download.zip\`

## Directory Structure

\`\`\`
src/icons/
  flaticon.css      # Icon CSS (auto-extracted)
  fonts/            # Font files (auto-extracted)
    flaticon.woff2
    flaticon.woff
    flaticon.ttf
    ...
\`\`\`

## Usage

In your PHP templates:
\`\`\`html
<i class="flaticon-icon-name"></i>
\`\`\`

List available icons:
\`\`\`bash
stratawp icons:list
\`\`\`
`
    await createFileWithSpinner(
      path.join(iconsDir, 'README.md'),
      readmeContent,
      'Creating icons README'
    )
  }

  // Check if functions.php exists and warn about Icons component
  const functionsPath = path.join(cwd, 'functions.php')
  if (await fs.pathExists(functionsPath)) {
    const functionsContent = await fs.readFile(functionsPath, 'utf8')
    if (!functionsContent.includes('Icons')) {
      console.log(chalk.yellow('\n  Warning: Icons component not found in functions.php'))
      console.log(chalk.dim('  Make sure to register the Icons component:'))
      console.log(chalk.dim('    new YourTheme\\Components\\Icons(),'))
    }
  }

  // If CSS file exists, parse and display icon info
  const cssPath = path.join(iconsDir, 'flaticon.css')
  if (await fs.pathExists(cssPath)) {
    const cssContent = await fs.readFile(cssPath, 'utf8')
    const iconNames = parseIconNames(cssContent)
    if (iconNames.length > 0) {
      console.log(chalk.green(`\n  Found ${iconNames.length} icon(s)`))
      console.log(chalk.dim(`  Run ${chalk.white('stratawp icons:list')} to see all icon names`))
    }
  }

  // Print usage instructions
  console.log(chalk.cyan('\n  Usage:'))
  console.log(chalk.dim('  In templates:  <i class="flaticon-icon-name"></i>'))
  console.log(chalk.dim(`  List icons:    ${chalk.white('stratawp icons:list')}`))
  console.log(chalk.dim(`  Update icons:  ${chalk.white('stratawp icons:update --zip <path>')}\n`))
}

/**
 * Update icon font from a new ZIP file
 */
export async function iconsUpdateCommand(options: { zip: string }): Promise<void> {
  console.log(chalk.cyan('\n  Updating StrataWP Icons\n'))

  const cwd = process.cwd()
  const iconsDir = path.join(cwd, 'src', 'icons')
  const fontsDir = path.join(iconsDir, 'fonts')
  const fs = await import('fs-extra')

  // Validate icons directory exists
  if (!(await fs.pathExists(iconsDir))) {
    console.error(chalk.red('  Icons directory not found at src/icons/'))
    console.error(chalk.dim('  Run "stratawp icons:setup" first to create the directory.\n'))
    process.exit(1)
  }

  // Validate --zip is provided
  if (!options.zip) {
    console.error(chalk.red('  --zip option is required'))
    console.error(chalk.dim('  Usage: stratawp icons:update --zip path/to/flaticon.zip\n'))
    process.exit(1)
  }

  // Clear existing font files and CSS
  const cssPath = path.join(iconsDir, 'flaticon.css')
  if (await fs.pathExists(fontsDir)) {
    await fs.emptyDir(fontsDir)
    console.log(chalk.dim('  Cleared existing fonts/'))
  }
  if (await fs.pathExists(cssPath)) {
    await fs.remove(cssPath)
    console.log(chalk.dim('  Removed existing flaticon.css'))
  }

  // Extract new ZIP
  console.log(chalk.dim(`\n  Extracting ZIP: ${options.zip}\n`))
  await extractFlatIconZip(options.zip, iconsDir)

  // Print updated icon count
  if (await fs.pathExists(cssPath)) {
    const cssContent = await fs.readFile(cssPath, 'utf8')
    const iconNames = parseIconNames(cssContent)
    console.log(chalk.green(`\n  Updated! ${iconNames.length} icon(s) available.\n`))
  } else {
    console.log(chalk.yellow('\n  Update complete, but no CSS file was found in the ZIP.\n'))
  }
}

/**
 * List available icon names from flaticon CSS
 */
export async function iconsListCommand(): Promise<void> {
  const cwd = process.cwd()
  const fs = await import('fs-extra')

  // Try src/icons/ first, then fallback to dist/icons/
  const srcCssPath = path.join(cwd, 'src', 'icons', 'flaticon.css')
  const distCssPath = path.join(cwd, 'dist', 'icons', 'flaticon.css')

  let cssPath: string | null = null
  if (await fs.pathExists(srcCssPath)) {
    cssPath = srcCssPath
  } else if (await fs.pathExists(distCssPath)) {
    cssPath = distCssPath
  }

  if (!cssPath) {
    console.error(chalk.red('\n  No flaticon.css found in src/icons/ or dist/icons/'))
    console.error(chalk.dim('  Run "stratawp icons:setup --zip <path>" to set up icons.\n'))
    process.exit(1)
  }

  const cssContent = await fs.readFile(cssPath, 'utf8')
  const iconNames = parseIconNames(cssContent)

  if (iconNames.length === 0) {
    console.log(chalk.yellow('\n  No .flaticon-* classes found in CSS file.\n'))
    return
  }

  console.log(chalk.cyan(`\n  Available Icons (${iconNames.length})\n`))

  for (const name of iconNames) {
    console.log(chalk.dim(`  flaticon-${name}`))
  }

  console.log(chalk.dim(`\n  Usage: <i class="flaticon-${iconNames[0]}"></i>\n`))
}
