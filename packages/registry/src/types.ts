/**
 * Component Registry Types
 */

export interface ComponentMetadata {
  name: string
  version: string
  description: string
  type: ComponentType
  author?: string
  homepage?: string
  repository?: string
  license?: string
  keywords?: string[]
  category?: string
  tags?: string[]
  wordpress?: {
    requires?: string
    tested?: string
    requiresPHP?: string
  }
  dependencies?: Record<string, string>
  files?: {
    include?: string[]
    exclude?: string[]
  }
  installation?: {
    targetDir?: string
    hooks?: {
      preInstall?: string
      postInstall?: string
    }
  }
  screenshots?: string[]
  demo?: string
}

export type ComponentType =
  | 'block'
  | 'component'
  | 'pattern'
  | 'template'
  | 'part'
  | 'integration'
  | 'theme'
  | 'plugin'

export interface RegistrySearchResult {
  name: string
  version: string
  description: string
  type: ComponentType
  author?: string
  keywords?: string[]
  downloads?: number
  rating?: number
  modified?: string
}

export interface ComponentInfo extends ComponentMetadata {
  versions: string[]
  downloads: {
    total: number
    weekly: number
  }
  created: string
  modified: string
}

export interface InstallOptions {
  version?: string
  force?: boolean
  dev?: boolean
  targetDir?: string
}

export interface PublishOptions {
  tag?: string
  access?: 'public' | 'restricted'
  dryRun?: boolean
}
