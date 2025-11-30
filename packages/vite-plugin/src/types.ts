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

  /**
   * Design system integration options
   */
  designSystem?: DesignSystemOptions

  /**
   * Performance optimization options
   */
  performance?: PerformanceOptions
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

/**
 * Design System Options
 */
export interface DesignSystemOptions {
  /**
   * Enable design system integration
   * @default false
   */
  enabled?: boolean

  /**
   * CSS framework to use
   * @default 'none'
   */
  framework?: 'none' | 'tailwind' | 'unocss'

  /**
   * Path to framework config file
   */
  configPath?: string

  /**
   * Enable WordPress preset integration
   * Maps theme.json values to framework
   * @default true
   */
  wordpressPresets?: boolean

  /**
   * Custom theme configuration
   */
  theme?: Record<string, unknown>
}

/**
 * Performance Options
 */
export interface PerformanceOptions {
  /**
   * Critical CSS extraction options
   * @default true
   */
  criticalCSS?: boolean | CriticalCSSOptions

  /**
   * Lazy loading options
   * @default true
   */
  lazyLoading?: boolean | LazyLoadingOptions

  /**
   * Asset preloading options
   * @default true
   */
  preload?: boolean | PreloadOptions
}

/**
 * Critical CSS Options
 */
export interface CriticalCSSOptions {
  /**
   * Enable critical CSS extraction
   * @default true
   */
  enabled?: boolean

  /**
   * Templates to process (without .html extension)
   * @default ['index', 'single', 'page', 'archive']
   */
  templates?: string[]

  /**
   * Viewport dimensions for extraction
   * @default { width: 1300, height: 900 }
   */
  dimensions?: {
    width: number
    height: number
  }

  /**
   * Inline critical CSS in HTML
   * @default true
   */
  inline?: boolean

  /**
   * Output path for critical CSS files
   * @default 'dist/critical'
   */
  output?: string

  /**
   * Minimum size in bytes to extract
   * @default 0
   */
  minSize?: number
}

/**
 * Lazy Loading Options
 */
export interface LazyLoadingOptions {
  /**
   * Enable lazy loading
   * @default true
   */
  enabled?: boolean

  /**
   * Image lazy loading strategy
   * @default 'native'
   */
  images?: 'native' | 'intersection-observer' | 'none'

  /**
   * Enable CSS lazy loading
   * @default true
   */
  css?: boolean

  /**
   * Enable chunk lazy loading
   * @default true
   */
  chunks?: boolean

  /**
   * Placeholder type for images
   * @default 'none'
   */
  placeholder?: 'blur' | 'color' | 'none'
}

/**
 * Preload Options
 */
export interface PreloadOptions {
  /**
   * Enable asset preloading
   * @default true
   */
  enabled?: boolean

  /**
   * Asset types to preload
   * @default ['fonts', 'critical-css']
   */
  assets?: Array<'fonts' | 'critical-css' | 'critical-js' | 'images'>

  /**
   * Preload strategy
   * @default 'link-tag'
   */
  strategy?: 'link-tag' | 'http2-push'
}
