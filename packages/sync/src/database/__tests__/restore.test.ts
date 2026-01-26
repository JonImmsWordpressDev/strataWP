// packages/sync/src/database/__tests__/restore.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DatabaseRestorer } from '../restore.js'
import type { DatabaseConfig } from '../../types.js'

vi.mock('mysql2/promise', () => ({
  default: {
    createConnection: vi.fn(),
  },
  createConnection: vi.fn(),
}))

describe('DatabaseRestorer', () => {
  const mockConfig: DatabaseConfig = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'password',
    database: 'test_db',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create instance with valid config', () => {
      const restorer = new DatabaseRestorer(mockConfig)
      expect(restorer).toBeInstanceOf(DatabaseRestorer)
    })
  })

  describe('restoreFromSQL', () => {
    it('should execute SQL statements', async () => {
      const mysql = await import('mysql2/promise')
      const mockConnection = {
        query: vi.fn().mockResolvedValue([]),
        end: vi.fn(),
      }
      vi.mocked(mysql.default.createConnection).mockResolvedValue(mockConnection as any)

      const restorer = new DatabaseRestorer(mockConfig)
      const sql = `
        DROP TABLE IF EXISTS wp_test;
        CREATE TABLE wp_test (id INT);
        INSERT INTO wp_test VALUES (1);
      `

      await restorer.restoreFromSQL(sql)

      // Should have executed multiple statements
      expect(mockConnection.query).toHaveBeenCalled()
      expect(mockConnection.end).toHaveBeenCalled()
    })

    it('should handle empty SQL gracefully', async () => {
      const mysql = await import('mysql2/promise')
      const mockConnection = {
        query: vi.fn().mockResolvedValue([]),
        end: vi.fn(),
      }
      vi.mocked(mysql.default.createConnection).mockResolvedValue(mockConnection as any)

      const restorer = new DatabaseRestorer(mockConfig)
      await restorer.restoreFromSQL('')

      expect(mockConnection.end).toHaveBeenCalled()
    })

    it('should handle dry run option', async () => {
      const mysql = await import('mysql2/promise')
      const mockConnection = {
        query: vi.fn().mockResolvedValue([]),
        end: vi.fn(),
      }
      vi.mocked(mysql.default.createConnection).mockResolvedValue(mockConnection as any)

      const restorer = new DatabaseRestorer(mockConfig)
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await restorer.restoreFromSQL('SELECT 1;', { dryRun: true })

      expect(consoleSpy).toHaveBeenCalled()
      expect(mockConnection.query).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('restoreFromSQL with URL replacement', () => {
    it('should replace URLs during restore', async () => {
      const mysql = await import('mysql2/promise')
      const executedQueries: string[] = []
      const mockConnection = {
        query: vi.fn().mockImplementation((sql) => {
          executedQueries.push(sql)
          return Promise.resolve([])
        }),
        end: vi.fn(),
      }
      vi.mocked(mysql.default.createConnection).mockResolvedValue(mockConnection as any)

      const restorer = new DatabaseRestorer(mockConfig)
      const sql = `INSERT INTO wp_options VALUES ('siteurl', 'https://production.com');`

      await restorer.restoreFromSQL(sql, {
        urlReplacements: [
          { from: 'https://production.com', to: 'http://local.test' },
        ],
      })

      const insertQuery = executedQueries.find((q) => q.includes('INSERT'))
      expect(insertQuery).toContain('http://local.test')
    })

    it('should handle multiple URL replacements', async () => {
      const mysql = await import('mysql2/promise')
      const executedQueries: string[] = []
      const mockConnection = {
        query: vi.fn().mockImplementation((sql) => {
          executedQueries.push(sql)
          return Promise.resolve([])
        }),
        end: vi.fn(),
      }
      vi.mocked(mysql.default.createConnection).mockResolvedValue(mockConnection as any)

      const restorer = new DatabaseRestorer(mockConfig)
      const sql = `INSERT INTO wp_options VALUES ('siteurl', 'https://production.com', 'https://cdn.production.com');`

      await restorer.restoreFromSQL(sql, {
        urlReplacements: [
          { from: 'https://production.com', to: 'http://local.test' },
          { from: 'https://cdn.production.com', to: 'http://cdn.local.test' },
        ],
      })

      const insertQuery = executedQueries.find((q) => q.includes('INSERT'))
      expect(insertQuery).toContain('http://local.test')
      expect(insertQuery).toContain('http://cdn.local.test')
    })
  })

  describe('splitStatements', () => {
    it('should split multiple SQL statements', async () => {
      const mysql = await import('mysql2/promise')
      const executedQueries: string[] = []
      const mockConnection = {
        query: vi.fn().mockImplementation((sql) => {
          executedQueries.push(sql)
          return Promise.resolve([])
        }),
        end: vi.fn(),
      }
      vi.mocked(mysql.default.createConnection).mockResolvedValue(mockConnection as any)

      const restorer = new DatabaseRestorer(mockConfig)
      const sql = `
        DROP TABLE IF EXISTS wp_test;
        CREATE TABLE wp_test (id INT);
        INSERT INTO wp_test VALUES (1);
      `

      await restorer.restoreFromSQL(sql)

      expect(executedQueries.length).toBe(3)
    })

    it('should handle strings containing semicolons', async () => {
      const mysql = await import('mysql2/promise')
      const executedQueries: string[] = []
      const mockConnection = {
        query: vi.fn().mockImplementation((sql) => {
          executedQueries.push(sql)
          return Promise.resolve([])
        }),
        end: vi.fn(),
      }
      vi.mocked(mysql.default.createConnection).mockResolvedValue(mockConnection as any)

      const restorer = new DatabaseRestorer(mockConfig)
      const sql = `INSERT INTO wp_posts VALUES ('post with; semicolon');`

      await restorer.restoreFromSQL(sql)

      expect(executedQueries.length).toBe(1)
      expect(executedQueries[0]).toContain('post with; semicolon')
    })
  })
})
