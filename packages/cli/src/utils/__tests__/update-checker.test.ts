import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import {
  fetchLatestVersion,
  loadCache,
  saveCache,
  checkPackageUpdates,
  readInstalledPackages,
  clearCache,
  formatVersionStatus,
} from '../update-checker.js'

// Mock fetch
global.fetch = vi.fn()

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    ensureDirSync: vi.fn(),
    pathExists: vi.fn(),
    readJson: vi.fn(),
    remove: vi.fn(),
  },
}))

describe('update-checker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchLatestVersion', () => {
    it('should fetch latest version from npm registry', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            'dist-tags': { latest: '1.2.3' },
          }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as Response)

      const version = await fetchLatestVersion('@stratawp/cli')
      expect(version).toBe('1.2.3')
      expect(fetch).toHaveBeenCalledWith(
        'https://registry.npmjs.org/@stratawp%2Fcli',
        expect.any(Object)
      )
    })

    it('should return null on fetch error', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const version = await fetchLatestVersion('@stratawp/cli')
      expect(version).toBeNull()
    })

    it('should return null on non-ok response', async () => {
      const mockResponse = { ok: false }
      vi.mocked(fetch).mockResolvedValue(mockResponse as Response)

      const version = await fetchLatestVersion('@stratawp/nonexistent')
      expect(version).toBeNull()
    })
  })

  describe('loadCache', () => {
    it('should return null if cache file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const cache = loadCache()
      expect(cache).toBeNull()
    })

    it('should load and parse cache file', () => {
      const mockCache = {
        packages: {
          '@stratawp/cli': { version: '1.0.0', fetchedAt: Date.now() },
        },
        lastCheck: Date.now(),
      }
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockCache))

      const cache = loadCache()
      expect(cache).toEqual(mockCache)
    })

    it('should return null on parse error', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json')

      const cache = loadCache()
      expect(cache).toBeNull()
    })
  })

  describe('saveCache', () => {
    it('should write cache to file', () => {
      const cache = {
        packages: {
          '@stratawp/cli': { version: '1.0.0', fetchedAt: Date.now() },
        },
        lastCheck: Date.now(),
      }

      saveCache(cache)

      expect(fs.ensureDirSync).toHaveBeenCalled()
      expect(fs.writeFileSync).toHaveBeenCalled()
    })
  })

  describe('readInstalledPackages', () => {
    it('should read @stratawp packages from package.json', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true as never)
      vi.mocked(fs.readJson).mockResolvedValue({
        dependencies: {
          '@stratawp/cli': '^1.0.0',
          lodash: '^4.17.21',
        },
        devDependencies: {
          '@stratawp/vite-plugin': '~0.2.0',
          typescript: '^5.0.0',
        },
      } as never)

      const packages = await readInstalledPackages('/test/package.json')

      expect(packages).toEqual({
        '@stratawp/cli': '1.0.0',
        '@stratawp/vite-plugin': '0.2.0',
      })
    })

    it('should return empty object if package.json does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false as never)

      const packages = await readInstalledPackages('/nonexistent/package.json')

      expect(packages).toEqual({})
    })
  })

  describe('formatVersionStatus', () => {
    it('should return "Update available" when update exists', () => {
      const pkg = {
        name: '@stratawp/cli',
        current: '1.0.0',
        latest: '1.1.0',
        hasUpdate: true,
      }

      expect(formatVersionStatus(pkg)).toBe('Update available')
    })

    it('should return "Up to date" when no update', () => {
      const pkg = {
        name: '@stratawp/cli',
        current: '1.0.0',
        latest: '1.0.0',
        hasUpdate: false,
      }

      expect(formatVersionStatus(pkg)).toBe('Up to date')
    })
  })
})
