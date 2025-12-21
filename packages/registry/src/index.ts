/**
 * StrataWP Registry Package
 * Component registry for sharing and discovering components
 */

// Export commands
export { searchCommand } from './commands/search'
export { installCommand } from './commands/install'
export { infoCommand } from './commands/info'
export { publishCommand } from './commands/publish'
export { listCommand } from './commands/list'

// Export utilities
export { RegistryClient } from './utils/registry-client'
export { ComponentInstaller } from './utils/installer'

// Export types
export type {
  ComponentMetadata,
  ComponentType,
  RegistrySearchResult,
  ComponentInfo,
  InstallOptions,
  PublishOptions,
} from './types'
