import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'fs'
import { checkForUpdates } from '../update-checker.js'

// Mock fetch
global.fetch = vi.fn()

// Mock fs
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  },
}))

describe('vite-plugin update-checker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkForUpdates', () => {
    it('should return null when no @stratawp packages installed', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          dependencies: { lodash: '^4.17.21' },
        })
      )

      const result = await checkForUpdates('/test/project')
      expect(result).toBeNull()
    })

    it('should return null when package.json does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const result = await checkForUpdates('/test/project')
      expect(result).toBeNull()
    })

    it('should return updates when newer versions available', async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return String(path).includes('package.json')
      })
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          devDependencies: { '@stratawp/vite-plugin': '^0.1.0' },
        })
      )

      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            'dist-tags': { latest: '0.2.0' },
          }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as Response)

      const result = await checkForUpdates('/test/project')

      expect(result).toBeDefined()
      expect(result).toHaveLength(1)
      expect(result?.[0]).toEqual({
        name: '@stratawp/vite-plugin',
        current: '0.1.0',
        latest: '0.2.0',
      })
    })

    it('should return null when all packages up to date', async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return String(path).includes('package.json')
      })
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          devDependencies: { '@stratawp/vite-plugin': '^0.2.0' },
        })
      )

      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            'dist-tags': { latest: '0.2.0' },
          }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as Response)

      const result = await checkForUpdates('/test/project')
      expect(result).toBeNull()
    })
  })
})
