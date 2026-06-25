/**
 * Pure template generator core.
 * No process.exit, console.*, ora, fs, or process.cwd() calls.
 */
import { generateTemplateHTML } from '../utils/templates'
import { slugify } from '../utils/validation'
import type { GenerateResult } from './types'

export interface GenerateTemplateOptions {
  name: string
  type: 'page' | 'single' | 'archive' | '404' | 'home' | 'search' | 'custom'
  themeSlug: string
  description?: string
}

export function generateTemplate(options: GenerateTemplateOptions): GenerateResult {
  const { name, type, themeSlug, description } = options

  const slug = slugify(name)
  const content = generateTemplateHTML(type, themeSlug)

  const messages = [
    `Template: templates/${slug}.html`,
    `Type: ${type}`,
    ...(description ? [`Description: ${description}`] : []),
    `Next: Edit templates/${slug}.html to add your custom blocks and content`,
  ]

  return {
    files: [
      {
        path: `templates/${slug}.html`,
        content,
      },
    ],
    messages,
  }
}
