/**
 * Component Discovery System
 * Discovers blocks, components, patterns, and templates in the theme
 */

import fg from 'fast-glob'
import fs from 'fs-extra'
import path from 'path'
import type {
  ComponentInfo,
  BlockMetadata,
  DiscoveryOptions,
} from '../types.js'

export class ComponentDiscovery {
  private rootDir: string
  private options: DiscoveryOptions

  constructor(rootDir: string, options: DiscoveryOptions = {}) {
    this.rootDir = rootDir
    this.options = {
      includeBlocks: true,
      includeComponents: true,
      includePatterns: true,
      includeTemplates: true,
      includeParts: true,
      ...options,
    }
  }

  /**
   * Discover all components in the theme
   */
  async discoverAll(): Promise<ComponentInfo[]> {
    const components: ComponentInfo[] = []

    if (this.options.includeBlocks) {
      components.push(...(await this.discoverBlocks()))
    }

    if (this.options.includeComponents) {
      components.push(...(await this.discoverReactComponents()))
    }

    if (this.options.includePatterns) {
      components.push(...(await this.discoverPatterns()))
    }

    if (this.options.includeTemplates) {
      components.push(...(await this.discoverTemplates()))
    }

    if (this.options.includeParts) {
      components.push(...(await this.discoverTemplateParts()))
    }

    return components
  }

  /**
   * Discover Gutenberg blocks
   */
  async discoverBlocks(): Promise<ComponentInfo[]> {
    const blockJsonFiles = await fg('src/blocks/**/block.json', {
      cwd: this.rootDir,
      absolute: true,
    })

    const blocks: ComponentInfo[] = []

    for (const jsonPath of blockJsonFiles) {
      try {
        const metadata: BlockMetadata = await fs.readJSON(jsonPath)
        const blockDir = path.dirname(jsonPath)

        blocks.push({
          id: metadata.name,
          name: metadata.name,
          title: metadata.title,
          type: 'block',
          description: metadata.description,
          category: metadata.category,
          path: blockDir,
          attributes: metadata.attributes,
          examples: metadata.example
            ? [
                {
                  name: 'Default',
                  attributes: metadata.example.attributes || {},
                },
              ]
            : [],
          tags: metadata.keywords,
        })
      } catch (error) {
        console.warn(`Failed to parse block.json at ${jsonPath}:`, error)
      }
    }

    return blocks
  }

  /**
   * Discover React components
   */
  async discoverReactComponents(): Promise<ComponentInfo[]> {
    const componentFiles = await fg('src/components/**/*.tsx', {
      cwd: this.rootDir,
      absolute: true,
      ignore: ['**/*.test.tsx', '**/*.stories.tsx'],
    })

    const components: ComponentInfo[] = []

    for (const filePath of componentFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        const componentName = path.basename(filePath, '.tsx')

        // Extract component info from comments or exports
        const titleMatch = content.match(/@title\s+(.+)/)
        const descMatch = content.match(/@description\s+(.+)/)

        components.push({
          id: componentName,
          name: componentName,
          title: titleMatch?.[1] || componentName,
          type: 'component',
          description: descMatch?.[1],
          path: filePath,
          examples: [],
        })
      } catch (error) {
        console.warn(`Failed to parse component at ${filePath}:`, error)
      }
    }

    return components
  }

  /**
   * Discover block patterns
   */
  async discoverPatterns(): Promise<ComponentInfo[]> {
    const patternFiles = await fg('patterns/**/*.php', {
      cwd: this.rootDir,
      absolute: true,
    })

    const patterns: ComponentInfo[] = []

    for (const filePath of patternFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        const slug = path.basename(filePath, '.php')

        // Extract pattern metadata from PHP comments
        const titleMatch = content.match(/\*\s*Title:\s*(.+)/)
        const descMatch = content.match(/\*\s*Description:\s*(.+)/)
        const categoriesMatch = content.match(/\*\s*Categories:\s*(.+)/)

        patterns.push({
          id: slug,
          name: slug,
          title: titleMatch?.[1]?.trim() || slug,
          type: 'pattern',
          description: descMatch?.[1]?.trim(),
          category: categoriesMatch?.[1]?.trim().split(',')[0]?.trim(),
          path: filePath,
          tags: categoriesMatch?.[1]
            ?.trim()
            .split(',')
            .map((c: string) => c.trim()),
        })
      } catch (error) {
        console.warn(`Failed to parse pattern at ${filePath}:`, error)
      }
    }

    return patterns
  }

  /**
   * Discover FSE templates
   */
  async discoverTemplates(): Promise<ComponentInfo[]> {
    const templateFiles = await fg('templates/**/*.html', {
      cwd: this.rootDir,
      absolute: true,
    })

    const templates: ComponentInfo[] = []

    for (const filePath of templateFiles) {
      const slug = path.basename(filePath, '.html')

      templates.push({
        id: slug,
        name: slug,
        title: this.slugToTitle(slug),
        type: 'template',
        path: filePath,
      })
    }

    return templates
  }

  /**
   * Discover template parts
   */
  async discoverTemplateParts(): Promise<ComponentInfo[]> {
    const partFiles = await fg('parts/**/*.html', {
      cwd: this.rootDir,
      absolute: true,
    })

    const parts: ComponentInfo[] = []

    for (const filePath of partFiles) {
      const slug = path.basename(filePath, '.html')

      parts.push({
        id: slug,
        name: slug,
        title: this.slugToTitle(slug),
        type: 'part',
        path: filePath,
      })
    }

    return parts
  }

  /**
   * Watch for component changes
   */
  async watch(
    onChange: (component: ComponentInfo) => void,
    onDelete: (id: string) => void
  ): Promise<void> {
    const chokidar = await import('chokidar')

    const watcher = chokidar.watch(
      [
        'src/blocks/**/block.json',
        'src/components/**/*.tsx',
        'patterns/**/*.php',
        'templates/**/*.html',
        'parts/**/*.html',
      ],
      {
        cwd: this.rootDir,
        ignoreInitial: true,
      }
    )

    watcher.on('add', async (filePath) => {
      const components = await this.discoverAll()
      const component = components.find((c) => c.path.includes(filePath))
      if (component) {
        onChange(component)
      }
    })

    watcher.on('change', async (filePath) => {
      const components = await this.discoverAll()
      const component = components.find((c) => c.path.includes(filePath))
      if (component) {
        onChange(component)
      }
    })

    watcher.on('unlink', (filePath) => {
      onDelete(filePath)
    })
  }

  /**
   * Convert slug to title
   */
  private slugToTitle(slug: string): string {
    return slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
}
