// packages/sync/src/database/__tests__/dump.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DatabaseDumper } from '../dump.js'
import type { DatabaseConfig } from '../../types.js'

// Mock mysql2
vi.mock('mysql2/promise', () => ({
  default: {
    createConnection: vi.fn(),
  },
  createConnection: vi.fn(),
}))

describe('DatabaseDumper', () => {
  const mockConfig: DatabaseConfig = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'password',
    database: 'test_db',
  }

  describe('constructor', () => {
    it('should create instance with valid config', () => {
      const dumper = new DatabaseDumper(mockConfig)
      expect(dumper).toBeInstanceOf(DatabaseDumper)
    })
  })

  describe('getTables', () => {
    it('should return list of tables', async () => {
      const mysql = await import('mysql2/promise')
      const mockConnection = {
        query: vi.fn().mockResolvedValue([[
          { Tables_in_test_db: 'wp_posts' },
          { Tables_in_test_db: 'wp_options' },
        ]]),
        end: vi.fn(),
      }
      vi.mocked(mysql.default.createConnection).mockResolvedValue(mockConnection as any)

      const dumper = new DatabaseDumper(mockConfig)
      const tables = await dumper.getTables()

      expect(tables).toEqual(['wp_posts', 'wp_options'])
      expect(mockConnection.end).toHaveBeenCalled()
    })
  })

  describe('generateDumpSQL', () => {
    it('should generate CREATE TABLE and INSERT statements', async () => {
      const mysql = await import('mysql2/promise')
      const mockConnection = {
        query: vi.fn()
          .mockResolvedValueOnce([[{ Tables_in_test_db: 'wp_options' }]]) // getTables
          .mockResolvedValueOnce([[{ 'Create Table': 'CREATE TABLE `wp_options` (id INT)' }]]) // SHOW CREATE
          .mockResolvedValueOnce([[
            { option_id: 1, option_name: 'siteurl', option_value: 'http://example.com' },
          ]]), // SELECT *
        end: vi.fn(),
      }
      vi.mocked(mysql.default.createConnection).mockResolvedValue(mockConnection as any)

      const dumper = new DatabaseDumper(mockConfig)
      const sql = await dumper.generateDumpSQL({ tables: ['wp_options'] })

      expect(sql).toContain('CREATE TABLE')
      expect(sql).toContain('INSERT INTO')
    })
  })
})
