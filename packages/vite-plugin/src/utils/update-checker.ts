/**
 * Update Checker for Vite Plugin
 *
 * Lightweight update checking for dev server notifications.
 * Designed to be non-blocking and not import the full CLI package.
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import semver from 'semver'
import type { Logger } from 'vite'

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const STRATAWP_SCOPE = '@stratawp/'
const REGISTRY_URL = 'https://registry.npmjs.org'

interface PackageUpdate {
  name: string
  current: string
  latest: string
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
 * Get the cache file path
 */
function getCachePath(): string {
  return path.join(os.homedir(), '.stratawp', 'update-cache.json')
}

/**
 * Load the update cache from disk
 */
function loadCache(): UpdateCache | null {
  try {
    const cachePath = getCachePath()
    if (!fs.existsSync(cachePath)) {
      return null
    }

    const cacheContent = fs.readFileSync(cachePath, 'utf-8')
    return JSON.parse(cacheContent) as UpdateCache
  } catch {
    return null
  }
}

/**
 * Save the update cache to disk
 */
function saveCache(cache: UpdateCache): void {
  try {
    const cachePath = getCachePath()
    const cacheDir = path.dirname(cachePath)
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
    }
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2))
  } catch {
    // Ignore cache write errors
  }
}

/**
 * Fetch the latest version of a package from npm registry
 */
async function fetchLatestVersion(packageName: string): Promise<string | null> {
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
  } catch {
    return null
  }
}

/**
 * Read installed @stratawp/* packages from package.json
 */
function readInstalledPackages(packageJsonPath: string): Record<string, string> {
  if (!fs.existsSync(packageJsonPath)) {
    return {}
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    const installed: Record<string, string> = {}

    // Check dependencies
    if (packageJson.dependencies) {
      for (const [name, version] of Object.entries(packageJson.dependencies)) {
        if (name.startsWith(STRATAWP_SCOPE) && typeof version === 'string') {
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
  } catch {
    return {}
  }
}

/**
 * Check for updates (async, non-blocking)
 * Returns available updates or null if all up-to-date
 */
export async function checkForUpdates(root: string): Promise<PackageUpdate[] | null> {
  const packageJsonPath = path.join(root, 'package.json')
  const installedPackages = readInstalledPackages(packageJsonPath)
  const packageNames = Object.keys(installedPackages)

  if (packageNames.length === 0) {
    return null
  }

  const cache = loadCache()
  const newCache: UpdateCache = {
    packages: cache?.packages || {},
    lastCheck: Date.now(),
  }

  const updates: PackageUpdate[] = []

  // Check all packages in parallel
  await Promise.all(
    packageNames.map(async (name) => {
      const current = installedPackages[name]
      let latest: string | null = null

      // Check cache first
      const cached = cache?.packages[name]
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        latest = cached.version
      } else {
        // Fetch from registry
        latest = await fetchLatestVersion(name)
        if (latest) {
          newCache.packages[name] = {
            version: latest,
            fetchedAt: Date.now(),
          }
        }
      }

      if (latest && semver.lt(current, latest)) {
        updates.push({ name, current, latest })
      }
    })
  )

  // Save updated cache
  saveCache(newCache)

  return updates.length > 0 ? updates : null
}

/**
 * Log update notification to console (non-blocking)
 */
export function checkForUpdatesAsync(logger: Logger, root: string): void {
  // Run check in background without blocking
  checkForUpdates(root)
    .then((updates) => {
      if (updates && updates.length > 0) {
        logger.info('')
        logger.info('  \x1b[33m📦 Updates available:\x1b[0m')
        for (const update of updates) {
          logger.info(`     ${update.name}: ${update.current} -> \x1b[32m${update.latest}\x1b[0m`)
        }
        logger.info('     Run `stratawp update` to update')
        logger.info('')
      }
    })
    .catch(() => {
      // Silently ignore errors - don't disrupt dev server
    })
}
