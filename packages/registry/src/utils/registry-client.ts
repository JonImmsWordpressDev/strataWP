/**
 * NPM Registry Client
 * Handles communication with npm registry API
 */

import fetch from 'node-fetch'
import type { ComponentInfo, RegistrySearchResult } from '../types'

const NPM_REGISTRY = 'https://registry.npmjs.org'
const NPM_SEARCH_API = 'https://registry.npmjs.com/-/v1/search'

export class RegistryClient {
  private registryUrl: string

  constructor(registryUrl: string = NPM_REGISTRY) {
    this.registryUrl = registryUrl
  }

  /**
   * Search for components in the registry
   */
  async search(query: string, options?: {
    type?: string
    size?: number
  }): Promise<RegistrySearchResult[]> {
    const searchQuery = `@stratawp ${query}`
    const size = options?.size || 20

    const params = new URLSearchParams({
      text: searchQuery,
      size: size.toString(),
    })

    const response = await fetch(`${NPM_SEARCH_API}?${params}`)

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`)
    }

    const data = await response.json() as any

    return data.objects.map((obj: any) => ({
      name: obj.package.name,
      version: obj.package.version,
      description: obj.package.description || '',
      type: this.extractComponentType(obj.package.keywords || []),
      author: obj.package.author?.name,
      keywords: obj.package.keywords || [],
      downloads: obj.package.downloads?.weekly,
      modified: obj.package.date,
    })).filter((result: RegistrySearchResult) => {
      // Filter by type if specified
      if (options?.type && result.type !== options.type) {
        return false
      }
      return true
    })
  }

  /**
   * Get detailed information about a component
   */
  async getInfo(packageName: string): Promise<ComponentInfo> {
    const response = await fetch(`${this.registryUrl}/${packageName}`)

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Component '${packageName}' not found`)
      }
      throw new Error(`Failed to fetch component info: ${response.statusText}`)
    }

    const data = await response.json() as any
    const latest = data['dist-tags'].latest
    const latestVersion = data.versions[latest]

    return {
      name: data.name,
      version: latest,
      description: latestVersion.description || '',
      type: this.extractComponentType(latestVersion.keywords || []),
      author: latestVersion.author?.name,
      homepage: latestVersion.homepage,
      repository: typeof latestVersion.repository === 'string'
        ? latestVersion.repository
        : latestVersion.repository?.url,
      license: latestVersion.license,
      keywords: latestVersion.keywords || [],
      category: latestVersion.stratawp?.category,
      tags: latestVersion.stratawp?.tags,
      wordpress: latestVersion.stratawp?.wordpress,
      dependencies: latestVersion.dependencies,
      versions: Object.keys(data.versions),
      downloads: {
        total: 0, // Would need separate API call to get download stats
        weekly: 0,
      },
      created: data.time.created,
      modified: data.time.modified,
    }
  }

  /**
   * Get the tarball URL for a specific version
   */
  async getTarballUrl(packageName: string, version?: string): Promise<string> {
    const info = await this.getInfo(packageName)
    const targetVersion = version || info.version

    const response = await fetch(`${this.registryUrl}/${packageName}`)
    const data = await response.json() as any

    if (!data.versions[targetVersion]) {
      throw new Error(`Version ${targetVersion} not found for ${packageName}`)
    }

    return data.versions[targetVersion].dist.tarball
  }

  /**
   * Extract component type from keywords
   */
  private extractComponentType(keywords: string[]): any {
    const typeKeywords = [
      'block',
      'component',
      'pattern',
      'template',
      'part',
      'integration',
      'theme',
      'plugin',
    ]

    for (const keyword of keywords) {
      if (typeKeywords.includes(keyword)) {
        return keyword
      }
    }

    return 'component'
  }
}
