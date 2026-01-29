/**
 * Block types for Block Library
 */

export type BlockSource = 'theme' | 'core' | 'plugin'

export interface BlockType {
  name: string // e.g., "forge-basic/hero"
  title: string
  description: string
  category: string
  icon: string | BlockIcon
  keywords: string[]
  supports: Record<string, unknown>
  attributes: Record<string, BlockAttribute>
  example?: BlockExample
  parent?: string[]
  ancestor?: string[]
  source: BlockSource
  textdomain?: string
}

export interface BlockIcon {
  src: string
  background?: string
  foreground?: string
}

export interface BlockAttribute {
  type: string
  default?: unknown
  source?: string
  selector?: string
  attribute?: string
  enum?: unknown[]
}

export interface BlockExample {
  attributes?: Record<string, unknown>
  innerBlocks?: BlockExampleInnerBlock[]
  viewportWidth?: number
}

export interface BlockExampleInnerBlock {
  name: string
  attributes?: Record<string, unknown>
  innerBlocks?: BlockExampleInnerBlock[]
}

export interface BlockCategory {
  slug: string
  title: string
  icon?: string
}

export interface BlockFilters {
  search: string
  category: string | null
  source: 'all' | BlockSource
}

export interface BlocksResponse {
  items: BlockType[]
  total: number
  categories: BlockCategory[]
}
