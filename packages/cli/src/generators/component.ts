/**
 * Pure component generator core.
 * No process.exit, console.*, ora, fs, or process.cwd() calls.
 */
import { generateComponentClass } from '../utils/templates'
import type { GenerateResult } from './types'

export interface GenerateComponentOptions {
  /** PascalCase component name */
  name: string
  type: 'service' | 'feature' | 'integration' | 'custom'
  namespace: string
}

export function generateComponent(options: GenerateComponentOptions): GenerateResult {
  const { name, type, namespace } = options

  const content = generateComponentClass(name, namespace, type)

  return {
    files: [
      {
        path: `inc/Components/${name}.php`,
        content,
      },
    ],
    messages: [
      `Component: inc/Components/${name}.php`,
      `Namespace: ${namespace}\\Components`,
      `Type: ${type}`,
      `Next: Register in functions.php: new ${namespace}\\Components\\${name}(),`,
    ],
  }
}
