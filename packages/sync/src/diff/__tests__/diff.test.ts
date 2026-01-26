// packages/sync/src/diff/__tests__/diff.test.ts
import { describe, it, expect } from 'vitest'
import { DiffEngine } from '../index.js'

describe('DiffEngine', () => {
  describe('compareFileLists', () => {
    it('should detect added files', () => {
      const before = ['a.php', 'b.php']
      const after = ['a.php', 'b.php', 'c.php']

      const result = DiffEngine.compareFileLists(before, after)

      expect(result.added).toEqual(['c.php'])
      expect(result.deleted).toEqual([])
      expect(result.unchanged).toEqual(['a.php', 'b.php'])
    })

    it('should detect deleted files', () => {
      const before = ['a.php', 'b.php', 'c.php']
      const after = ['a.php', 'b.php']

      const result = DiffEngine.compareFileLists(before, after)

      expect(result.added).toEqual([])
      expect(result.deleted).toEqual(['c.php'])
    })
  })

  describe('compareSQLDumps', () => {
    it('should detect table changes', () => {
      const before = `
        CREATE TABLE wp_posts (id INT);
        INSERT INTO wp_posts VALUES (1);
        CREATE TABLE wp_options (id INT);
      `
      const after = `
        CREATE TABLE wp_posts (id INT, title VARCHAR(255));
        INSERT INTO wp_posts VALUES (1, 'Hello');
        INSERT INTO wp_posts VALUES (2, 'World');
        CREATE TABLE wp_options (id INT);
        CREATE TABLE wp_users (id INT);
      `

      const result = DiffEngine.compareSQLDumps(before, after)

      expect(result.tablesAdded).toContain('wp_users')
      expect(result.tablesModified).toContain('wp_posts')
    })
  })
})
