/**
 * WP-Forge Plugin Options
 */
export interface WpForgePluginOptions {
  /**
   * Block discovery and registration options
   */
  blocks?: BlockOptions

  /**
   * Asset manifest generation options
   */
  manifest?: ManifestOptions

  /**
   * PHP hot module replacement options
   */
  phpHmr?: PhpHmrOptions

  /**
   * Asset handling options
   */
  assets?: AssetOptions
}

/**
 * Block Options
 */
export interface BlockOptions {
  /**
   * Directory to search for blocks
   * @default 'src/blocks'
   */
  dir?: string

  /**
   * Auto-register blocks in WordPress
   * @default true
   */
  autoRegister?: boolean

  /**
   * Block namespace
   * @default 'wp-forge'
   */
  namespace?: string

  /**
   * Pattern to match block directories
   * @default '* /block.json'
   */
  pattern?: string
}

/**
 * Manifest Options
 */
export interface ManifestOptions {
  /**
   * Enable manifest generation
   * @default true
   */
  enabled?: boolean

  /**
   * Output path for manifest
   * @default 'dist/.vite/manifest.json'
   */
  output?: string

  /**
   * Include WordPress-specific metadata
   * @default true
   */
  wordpress?: boolean
}

/**
 * PHP HMR Options
 */
export interface PhpHmrOptions {
  /**
   * Enable PHP file watching
   * @default true
   */
  enabled?: boolean

  /**
   * File patterns to watch
   * @default ['** /*.php', 'theme.json']
   */
  watch?: string[]

  /**
   * Debounce delay in ms
   * @default 100
   */
  debounce?: number
}

/**
 * Asset Options
 */
export interface AssetOptions {
  /**
   * Public directory for assets
   * @default 'dist'
   */
  publicDir?: string

  /**
   * WordPress assets URL
   */
  baseUrl?: string
}

/**
 * Block Metadata (from block.json)
 */
export interface BlockMetadata {
  apiVersion?: number
  name: string
  title: string
  category: string
  icon?: string
  description?: string
  keywords?: string[]
  attributes?: Record<string, unknown>
  supports?: Record<string, unknown>
  editorScript?: string
  editorStyle?: string
  script?: string
  style?: string
  render?: string
}

/**
 * WordPress Asset Manifest Entry
 */
export interface ManifestEntry {
  file: string
  src?: string
  isEntry?: boolean
  css?: string[]
  assets?: string[]
  dependencies?: string[]
  version?: string
}

/**
 * WordPress Asset Manifest
 */
export interface WordPressManifest {
  [key: string]: ManifestEntry
}
