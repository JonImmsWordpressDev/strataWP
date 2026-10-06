import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { TEMPLATE_TOKENS, replaceThemeTokens } from './utils/theme-tokens.js'

export interface ThemeConfig {
  name: string
  slug: string
  description: string
  author: string
  template: 'basic' | 'advanced' | 'store' | 'minimal'
  cssFramework: 'vanilla' | 'tailwind' | 'unocss' | 'panda'
  typescript: boolean
  testing: boolean
}

export async function customizeTheme(themePath: string, config: ThemeConfig) {
  // Stamp the user's slug over the template's canonical token everywhere —
  // text domains, pattern slugs, block namespaces, PHP function prefixes.
  // WordPress only loads translations for the domain declared in style.css,
  // so any file left on the template token would be untranslatable (#31).
  const templateToken = TEMPLATE_TOKENS[config.template]
  if (templateToken && templateToken !== config.slug) {
    await replaceThemeTokens(themePath, templateToken, config.slug)
  }

  // Update style.css with user's theme info
  const styleCssPath = path.join(themePath, 'style.css')
  if (await fs.pathExists(styleCssPath)) {
    let styleContent = await fs.readFile(styleCssPath, 'utf-8')

    // Replace theme metadata
    styleContent = styleContent
      .replace(/Theme Name:.*$/m, `Theme Name: ${config.name}`)
      .replace(/Description:.*$/m, `Description: ${config.description}`)
      .replace(/Author:.*$/m, `Author: ${config.author}`)
      .replace(/Text Domain:.*$/m, `Text Domain: ${config.slug}`)

    await fs.writeFile(styleCssPath, styleContent)
  }

  // Keep the WordPress.org readme.txt in step with style.css. The template's
  // title and short description (the first paragraph after the header block)
  // are read from the file itself so no per-template strings are hardcoded.
  const wpReadmePath = path.join(themePath, 'readme.txt')
  if (await fs.pathExists(wpReadmePath)) {
    let wpReadme = await fs.readFile(wpReadmePath, 'utf-8')
    const templateName = wpReadme.match(/^=== (.+) ===$/m)?.[1]
    const shortDescription = wpReadme.match(/^Tags:.*\r?\n\r?\n(.+)$/m)?.[1]
    const authorSlug = config.author.toLowerCase().replace(/\s+/g, '')

    if (templateName) {
      wpReadme = wpReadme.split(templateName).join(config.name)
    }
    if (shortDescription) {
      wpReadme = wpReadme.replace(shortDescription, () => config.description)
    }
    if (authorSlug) {
      wpReadme = wpReadme.replace(/^Contributors:.*$/m, `Contributors: ${authorSlug}`)
    }

    await fs.writeFile(wpReadmePath, wpReadme)
  }

  // Update package.json with user's info
  const packageJsonPath = path.join(themePath, 'package.json')
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath)
    packageJson.name = config.slug
    packageJson.description = config.description
    packageJson.author = config.author

    // Add StrataWP metadata for update tracking
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    const cliPackageJson = await fs.readJson(path.join(__dirname, '..', 'package.json'))

    // Replace workspace: deps with the npm versions this CLI release was built
    // against — templateDependencies is stamped by scripts/sync-template-vendor.mjs
    // at pack time, so it can't drift the way a hardcoded pin did.
    for (const group of ['dependencies', 'devDependencies']) {
      const deps = packageJson[group]
      if (!deps) continue
      for (const [dep, range] of Object.entries(deps)) {
        if (typeof range === 'string' && range.startsWith('workspace:')) {
          deps[dep] = cliPackageJson.templateDependencies?.[dep] ?? 'latest'
        }
      }
    }
    packageJson.stratawp = {
      createdWith: cliPackageJson.version,
      template: config.template,
      createdAt: new Date().toISOString(),
    }

    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 })
  }

  // Update README.md
  const readmePath = path.join(themePath, 'README.md')
  if (await fs.pathExists(readmePath)) {
    let readmeContent = await fs.readFile(readmePath, 'utf-8')
    // Replace the first heading with the new theme name
    readmeContent = readmeContent.replace(/^#\s+.*$/m, `# ${config.name}`)
    await fs.writeFile(readmePath, readmeContent)
  }

  // Update vite.config.ts namespace if it exists
  const viteConfigPath = path.join(themePath, 'vite.config.ts')
  if (await fs.pathExists(viteConfigPath)) {
    let viteConfig = await fs.readFile(viteConfigPath, 'utf-8')
    viteConfig = viteConfig.replace(/namespace:\s*['"][\w-]+['"]/, `namespace: '${config.slug}'`)
    await fs.writeFile(viteConfigPath, viteConfig)
  }
}
