// Core types for @stratawp/sync

export interface DatabaseConfig {
  host: string
  port?: number
  user: string
  password: string
  database: string
}

export interface SSHConfig {
  host: string
  port?: number
  username: string
  privateKey?: string
  password?: string
  passphrase?: string // Passphrase for encrypted private keys
}

export interface EnvironmentConfig {
  name: string
  url: string
  ssh?: SSHConfig
  database: DatabaseConfig
  paths: {
    wordpress: string
    uploads: string
    theme?: string
  }
}

export interface SyncConfig {
  environments: Record<string, EnvironmentConfig>
  cloud?: CloudStorageConfig
}

export interface CloudStorageConfig {
  provider: 's3' | 'r2' | 'spaces'
  bucket: string
  region?: string
  accessKey: string
  secretKey: string
  endpoint?: string // For R2/Spaces
}

export interface SnapshotManifest {
  id: string
  environment: string
  createdAt: string
  gitRef?: string
  gitBranch?: string
  themeVersion?: string
  wordpressVersion?: string
  phpVersion?: string
  files: {
    count: number
    sizeBytes: number
    hash: string
  }
  database: {
    tables: number
    sizeBytes: number
    hash: string
  }
  status: 'current' | 'stable' | 'archived'
  previousSnapshot?: string
}

export interface DiffResult {
  files: {
    added: string[]
    modified: string[]
    deleted: string[]
  }
  database: {
    tablesChanged: string[]
    rowsAdded: number
    rowsModified: number
    rowsDeleted: number
  }
}

export interface UrlReplacement {
  from: string
  to: string
}

export interface DumpOptions {
  tables?: string[]
  excludeTables?: string[]
  noData?: boolean
  compress?: boolean
}

export interface RestoreOptions {
  tables?: string[]
  urlReplacements?: UrlReplacement[]
  dryRun?: boolean
}

export interface SyncResult {
  success: boolean
  message: string
  details?: {
    filesTransferred?: number
    bytesTransferred?: number
    duration?: number
    errors?: string[]
  }
}
