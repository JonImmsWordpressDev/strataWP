/**
 * Pure template-part generator core.
 * No process.exit, console.*, ora, fs, or process.cwd() calls.
 */
import { generatePartHTML, generatePartPHP } from '../utils/templates'
import { slugify } from '../utils/validation'
import type { GenerateResult } from './types'

export interface GeneratePartOptions {
  name: string
  type: 'header' | 'footer' | 'sidebar' | 'content' | 'custom'
  markup: 'html' | 'php'
  /** Required when markup === 'php'; used as @package annotation */
  themeSlug?: string
}

export function generatePart(options: GeneratePartOptions): GenerateResult {
  const { name, type, markup, themeSlug = 'theme' } = options

  const slug = slugify(name)
  const ext = markup === 'html' ? 'html' : 'php'

  const content = markup === 'html' ? generatePartHTML(type) : generatePartPHP(type, themeSlug)

  return {
    files: [
      {
        path: `parts/${slug}.${ext}`,
        content,
      },
    ],
    messages: [
      `Part: parts/${slug}.${ext}`,
      `Type: ${type}`,
      `Markup: ${markup}`,
      `Next: Use in templates with <!-- wp:template-part {"slug":"${slug}"} /-->`,
    ],
  }
}
