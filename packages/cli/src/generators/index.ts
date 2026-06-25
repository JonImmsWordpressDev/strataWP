/**
 * Pure generator cores — importable by the MCP server and other consumers.
 */
export type { GeneratedFile, GenerateResult } from './types'

export { generateComponent } from './component'
export type { GenerateComponentOptions } from './component'

export { generateTemplate } from './template'
export type { GenerateTemplateOptions } from './template'

export { generatePart } from './part'
export type { GeneratePartOptions } from './part'

export { generateBlock } from './block'
export type { GenerateBlockOptions } from './block'
