/**
 * Configuration Types
 */

export interface HeadlessConfig {
  baseUrl: string
  auth?: AuthConfig
  cache?: CacheConfig
  preview?: PreviewConfig
}

export interface AuthConfig {
  type: 'basic' | 'jwt' | 'application-password' | 'oauth'
  username?: string
  password?: string
  token?: string
  clientId?: string
  clientSecret?: string
}

export interface CacheConfig {
  enabled?: boolean
  ttl?: number
  revalidate?: number
}

export interface PreviewConfig {
  enabled?: boolean
  secret?: string
}

export interface FetchOptions {
  cache?: RequestCache
  revalidate?: number | false
  tags?: string[]
}

export interface RevalidateOptions {
  tags?: string[]
  path?: string
}
