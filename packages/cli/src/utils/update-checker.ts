/**
 * Update Checker Utilities
 *
 * Provides npm registry fetching, version comparison, and caching
 * for checking @stratawp/* package updates.
 */

import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import semver from 'semver'

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const STRATAWP_SCOPE = '@stratawp/'
const REGISTRY_URL = 'https://registry.npmjs.org'

export interface PackageVersion {
  name: string
  current: string
  latest: string
  hasUpdate: boolean
}

export interface UpdateCheckResult {
  packages: PackageVersion[]
  hasUpdates: boolean
  updatesCount: number
  checkedAt: string
}

interface CacheEntry {
  version: string
  fetchedAt: number
}

interface UpdateCache {
  packages: Record<string, CacheEntry>
  lastCheck: number
}

/**
 * Fetch the latest version of a package from npm registry
 */
export async function fetchLatestVersion(packageName: string): Promise<string | null> {
  try {
    const encodedName = packageName.replace('/', '%2F')
    const url = `${REGISTRY_URL}/${encodedName}`

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data['dist-tags']?.latest || null
  } catch (error) {
    return null
  }
}

/**
 * Get the cache file path
 */
function getCachePath(): string {
  return path.join(os.homedir(), '.stratawp', 'update-cache.json')
}

/**
 * Load the update cache from disk
 */
export function loadCache(): UpdateCache | null {
  try {
    const cachePath = getCachePath()
    if (!fs.existsSync(cachePath)) {
      return null
    }

    const cacheContent = fs.readFileSync(cachePath, 'utf-8')
    return JSON.parse(cacheContent) as UpdateCache
  } catch (error) {
    return null
  }
}

/**
 * Save the update cache to disk
 */
export function saveCache(cache: UpdateCache): void {
  try {
    const cachePath = getCachePath()
    fs.ensureDirSync(path.dirname(cachePath))
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2))
  } catch (error) {
    // Ignore cache write errors
  }
}

/**
 * Check if a cached version is still valid (within TTL)
 */
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS
}

/**
 * Get latest version for a package, using cache if valid
 */
async function getLatestVersionWithCache(
  packageName: string,
  cache: UpdateCache | null
): Promise<{ version: string | null; fromCache: boolean }> {
  // Check cache first
  if (cache?.packages[packageName] && isCacheValid(cache.packages[packageName])) {
    return {
      version: cache.packages[packageName].version,
      fromCache: true,
    }
  }

  // Fetch from registry
  const version = await fetchLatestVersion(packageName)
  return { version, fromCache: false }
}

/**
 * Read installed @stratawp/* packages from package.json
 */
export async function readInstalledPackages(
  packageJsonPath?: string
): Promise<Record<string, string>> {
  const pkgPath = packageJsonPath || path.join(process.cwd(), 'package.json')

  if (!(await fs.pathExists(pkgPath))) {
    return {}
  }

  try {
    const packageJson = await fs.readJson(pkgPath)
    const installed: Record<string, string> = {}

    // Check dependencies
    if (packageJson.dependencies) {
      for (const [name, version] of Object.entries(packageJson.dependencies)) {
        if (name.startsWith(STRATAWP_SCOPE) && typeof version === 'string') {
          // Clean up version string (remove ^, ~, etc.)
          installed[name] = version.replace(/^[\^~>=<]+/, '')
        }
      }
    }

    // Check devDependencies
    if (packageJson.devDependencies) {
      for (const [name, version] of Object.entries(packageJson.devDependencies)) {
        if (name.startsWith(STRATAWP_SCOPE) && typeof version === 'string') {
          installed[name] = version.replace(/^[\^~>=<]+/, '')
        }
      }
    }

    return installed
  } catch (error) {
    return {}
  }
}

/**
 * Check all @stratawp/* packages for updates
 */
export async function checkPackageUpdates(packageJsonPath?: string): Promise<UpdateCheckResult> {
  const installedPackages = await readInstalledPackages(packageJsonPath)
  const packageNames = Object.keys(installedPackages)

  if (packageNames.length === 0) {
    return {
      packages: [],
      hasUpdates: false,
      updatesCount: 0,
      checkedAt: new Date().toISOString(),
    }
  }

  const cache = loadCache()
  const newCache: UpdateCache = {
    packages: cache?.packages || {},
    lastCheck: Date.now(),
  }

  const packages: PackageVersion[] = []

  // Check all packages in parallel
  const results = await Promise.all(
    packageNames.map(async (name) => {
      const current = installedPackages[name]
      const { version: latest, fromCache } = await getLatestVersionWithCache(name, cache)

      // Update cache if we fetched from registry
      if (!fromCache && latest) {
        newCache.packages[name] = {
          version: latest,
          fetchedAt: Date.now(),
        }
      }

      if (!latest) {
        return {
          name,
          current,
          latest: current,
          hasUpdate: false,
        }
      }

      const hasUpdate = semver.lt(current, latest)
      return {
        name,
        current,
        latest,
        hasUpdate,
      }
    })
  )

  packages.push(...results)

  // Save updated cache
  saveCache(newCache)

  const updatesCount = packages.filter((p) => p.hasUpdate).length

  return {
    packages,
    hasUpdates: updatesCount > 0,
    updatesCount,
    checkedAt: new Date().toISOString(),
  }
}

/**
 * Clear the update cache
 */
export async function clearCache(): Promise<void> {
  const cachePath = getCachePath()
  if (await fs.pathExists(cachePath)) {
    await fs.remove(cachePath)
  }
}

/**
 * Format package version info for display
 */
export function formatVersionStatus(pkg: PackageVersion): string {
  if (pkg.hasUpdate) {
    return 'Update available'
  }
  return 'Up to date'
}
