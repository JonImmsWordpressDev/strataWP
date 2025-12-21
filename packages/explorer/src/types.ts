/**
 * Component Explorer Types
 */

export interface ComponentInfo {
  id: string
  name: string
  title: string
  type: ComponentType
  description?: string
  category?: string
  path: string
  attributes?: Record<string, AttributeDefinition>
  examples?: ComponentExample[]
  tags?: string[]
}

export type ComponentType = 'block' | 'component' | 'pattern' | 'template' | 'part'

export interface AttributeDefinition {
  type: string
  default?: any
  enum?: any[]
  source?: string
  selector?: string
  attribute?: string
}

export interface ComponentExample {
  name: string
  description?: string
  attributes: Record<string, any>
  code?: string
}

export interface BlockMetadata {
  apiVersion?: number
  name: string
  title: string
  category?: string
  icon?: string
  description?: string
  keywords?: string[]
  version?: string
  textdomain?: string
  attributes?: Record<string, AttributeDefinition>
  supports?: Record<string, any>
  styles?: Array<{ name: string; label: string }>
  example?: {
    attributes?: Record<string, any>
    innerBlocks?: any[]
  }
  editorScript?: string
  editorStyle?: string
  style?: string
}

export interface PatternMetadata {
  slug: string
  title: string
  description?: string
  categories?: string[]
  keywords?: string[]
  blockTypes?: string[]
  content: string
}

export interface DiscoveryOptions {
  rootDir?: string
  includeBlocks?: boolean
  includeComponents?: boolean
  includePatterns?: boolean
  includeTemplates?: boolean
  includeParts?: boolean
}

export interface ExplorerConfig {
  port?: number
  host?: string
  open?: boolean
  rootDir?: string
  discovery?: DiscoveryOptions
}

export interface ServerMessage {
  type: 'component-updated' | 'component-added' | 'component-removed' | 'refresh'
  component?: ComponentInfo
}

export interface ViewportSize {
  name: string
  width: number
  height: number
}
