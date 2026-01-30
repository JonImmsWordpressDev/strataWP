# Production Suite Phase 1: Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the core sync package with database operations, snapshots, and rollback functionality that integrates with the existing deploy command.

**Architecture:** Create `@stratawp/sync` package with modular components for database dump/restore, URL replacement, snapshot management, and diff visualization. Snapshots stored locally in `.stratawp-snapshots/` with SQLite index. CLI commands added to existing `@stratawp/cli` package.

**Tech Stack:** TypeScript, better-sqlite3, mysql2, ssh2, tar, php-serialize, chalk, ora, prompts

---

## Task 1: Create Package Structure

**Files:**
- Create: `packages/sync/package.json`
- Create: `packages/sync/tsconfig.json`
- Create: `packages/sync/tsup.config.ts`
- Create: `packages/sync/src/index.ts`
- Modify: `pnpm-workspace.yaml` (verify sync is included)

**Step 1: Create package.json**

```json
{
  "name": "@stratawp/sync",
  "version": "0.1.0",
  "description": "Environment sync, snapshots, and rollback for StrataWP",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./database": {
      "import": "./dist/database/index.mjs",
      "require": "./dist/database/index.js",
      "types": "./dist/database/index.d.ts"
    },
    "./snapshots": {
      "import": "./dist/snapshots/index.mjs",
      "require": "./dist/snapshots/index.js",
      "types": "./dist/snapshots/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  },
  "dependencies": {
    "better-sqlite3": "^9.4.0",
    "mysql2": "^3.9.0",
    "ssh2": "^1.15.0",
    "tar": "^6.2.0",
    "php-serialize": "^5.0.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.8",
    "@types/ssh2": "^1.11.0",
    "@types/tar": "^6.1.11",
    "tsup": "^8.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.6.0"
  },
  "peerDependencies": {
    "typescript": "^5.0.0"
  },
  "keywords": [
    "stratawp",
    "wordpress",
    "sync",
    "database",
    "rollback",
    "snapshots"
  ],
  "license": "GPL-3.0-or-later",
  "repository": {
    "type": "git",
    "url": "https://github.com/JonImmsWordpressDev/StrataWP.git",
    "directory": "packages/sync"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Step 3: Create tsup.config.ts**

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'database/index': 'src/database/index.ts',
    'snapshots/index': 'src/snapshots/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['better-sqlite3'],
})
```

**Step 4: Create src/index.ts**

```typescript
// @stratawp/sync - Environment sync, snapshots, and rollback

export * from './database/index.js'
export * from './snapshots/index.js'
export * from './types.js'
```

**Step 5: Create placeholder files**

Create these empty placeholder files:
- `packages/sync/src/database/index.ts` with `export {}`
- `packages/sync/src/snapshots/index.ts` with `export {}`
- `packages/sync/src/types.ts` with `export {}`

**Step 6: Install dependencies and verify build**

Run:
```bash
cd /Users/jon.imms/Local\ Sites/stratawp/strataWP/.worktrees/production-suite
pnpm install
pnpm --filter @stratawp/sync build
```

Expected: Build succeeds with dist/ folder created

**Step 7: Commit**

```bash
git add packages/sync/
git commit -m "feat(sync): initialize @stratawp/sync package structure"
```

---

## Task 2: Define Core Types

**Files:**
- Create: `packages/sync/src/types.ts`

**Step 1: Write the types file**

```typescript
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
```

**Step 2: Verify types compile**

Run:
```bash
pnpm --filter @stratawp/sync build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add packages/sync/src/types.ts
git commit -m "feat(sync): add core type definitions"
```

---

## Task 3: Database Dump Functionality

**Files:**
- Create: `packages/sync/src/database/dump.ts`
- Create: `packages/sync/src/database/index.ts`
- Create: `packages/sync/src/database/__tests__/dump.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/sync/src/database/__tests__/dump.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DatabaseDumper } from '../dump.js'
import type { DatabaseConfig } from '../../types.js'

// Mock mysql2
vi.mock('mysql2/promise', () => ({
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
      vi.mocked(mysql.createConnection).mockResolvedValue(mockConnection as any)

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
      vi.mocked(mysql.createConnection).mockResolvedValue(mockConnection as any)

      const dumper = new DatabaseDumper(mockConfig)
      const sql = await dumper.generateDumpSQL({ tables: ['wp_options'] })

      expect(sql).toContain('CREATE TABLE')
      expect(sql).toContain('INSERT INTO')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
pnpm --filter @stratawp/sync test -- dump.test.ts
```

Expected: FAIL - DatabaseDumper not found

**Step 3: Write the implementation**

```typescript
// packages/sync/src/database/dump.ts
import mysql from 'mysql2/promise'
import type { DatabaseConfig, DumpOptions } from '../types.js'

export class DatabaseDumper {
  private config: DatabaseConfig

  constructor(config: DatabaseConfig) {
    this.config = config
  }

  private async getConnection() {
    return mysql.createConnection({
      host: this.config.host,
      port: this.config.port || 3306,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
    })
  }

  async getTables(): Promise<string[]> {
    const connection = await this.getConnection()
    try {
      const [rows] = await connection.query('SHOW TABLES')
      const key = `Tables_in_${this.config.database}`
      return (rows as any[]).map((row) => row[key])
    } finally {
      await connection.end()
    }
  }

  async generateDumpSQL(options: DumpOptions = {}): Promise<string> {
    const connection = await this.getConnection()
    try {
      let tables = options.tables || await this.getTables()

      if (options.excludeTables) {
        tables = tables.filter((t) => !options.excludeTables!.includes(t))
      }

      const output: string[] = [
        '-- StrataWP Database Dump',
        `-- Generated: ${new Date().toISOString()}`,
        `-- Database: ${this.config.database}`,
        '',
        'SET NAMES utf8mb4;',
        'SET FOREIGN_KEY_CHECKS = 0;',
        '',
      ]

      for (const table of tables) {
        // Get CREATE TABLE statement
        const [createResult] = await connection.query(`SHOW CREATE TABLE \`${table}\``)
        const createStatement = (createResult as any[])[0]['Create Table']

        output.push(`-- Table: ${table}`)
        output.push(`DROP TABLE IF EXISTS \`${table}\`;`)
        output.push(createStatement + ';')
        output.push('')

        if (!options.noData) {
          // Get table data
          const [rows] = await connection.query(`SELECT * FROM \`${table}\``)

          if ((rows as any[]).length > 0) {
            const columns = Object.keys((rows as any[])[0])
            const columnList = columns.map((c) => `\`${c}\``).join(', ')

            for (const row of rows as any[]) {
              const values = columns.map((col) => {
                const value = row[col]
                if (value === null) return 'NULL'
                if (typeof value === 'number') return value.toString()
                // Escape string values
                return `'${String(value).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`
              }).join(', ')

              output.push(`INSERT INTO \`${table}\` (${columnList}) VALUES (${values});`)
            }
            output.push('')
          }
        }
      }

      output.push('SET FOREIGN_KEY_CHECKS = 1;')
      output.push('')

      return output.join('\n')
    } finally {
      await connection.end()
    }
  }

  async dumpToFile(filepath: string, options: DumpOptions = {}): Promise<void> {
    const fs = await import('fs/promises')
    const zlib = await import('zlib')
    const { promisify } = await import('util')
    const gzip = promisify(zlib.gzip)

    const sql = await this.generateDumpSQL(options)

    if (options.compress || filepath.endsWith('.gz')) {
      const compressed = await gzip(Buffer.from(sql, 'utf8'))
      await fs.writeFile(filepath, compressed)
    } else {
      await fs.writeFile(filepath, sql, 'utf8')
    }
  }
}
```

**Step 4: Update database/index.ts**

```typescript
// packages/sync/src/database/index.ts
export { DatabaseDumper } from './dump.js'
```

**Step 5: Run test to verify it passes**

Run:
```bash
pnpm --filter @stratawp/sync test -- dump.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add packages/sync/src/database/
git commit -m "feat(sync): add database dump functionality"
```

---

## Task 4: URL Replacement Engine

**Files:**
- Create: `packages/sync/src/database/url-replace.ts`
- Create: `packages/sync/src/database/__tests__/url-replace.test.ts`
- Modify: `packages/sync/src/database/index.ts`

**Step 1: Write the failing test**

```typescript
// packages/sync/src/database/__tests__/url-replace.test.ts
import { describe, it, expect } from 'vitest'
import { UrlReplacer } from '../url-replace.js'

describe('UrlReplacer', () => {
  const replacer = new UrlReplacer([
    { from: 'https://production.com', to: 'http://local.test' },
    { from: 'https://cdn.production.com', to: 'http://local.test/wp-content' },
  ])

  describe('replaceInString', () => {
    it('should replace simple URLs', () => {
      const input = 'Visit https://production.com for more info'
      const result = replacer.replaceInString(input)
      expect(result).toBe('Visit http://local.test for more info')
    })

    it('should replace multiple URLs', () => {
      const input = 'Site: https://production.com, CDN: https://cdn.production.com/image.jpg'
      const result = replacer.replaceInString(input)
      expect(result).toBe('Site: http://local.test, CDN: http://local.test/wp-content/image.jpg')
    })
  })

  describe('replaceInSerialized', () => {
    it('should handle serialized PHP strings', () => {
      // Serialized: a:1:{s:3:"url";s:23:"https://production.com";}
      const input = 'a:1:{s:3:"url";s:22:"https://production.com";}'
      const result = replacer.replaceInSerialized(input)
      // After replacement, URL is "http://local.test" (17 chars)
      expect(result).toBe('a:1:{s:3:"url";s:17:"http://local.test";}')
    })

    it('should handle nested serialized data', () => {
      const input = 'a:2:{s:4:"site";s:22:"https://production.com";s:3:"cdn";s:26:"https://cdn.production.com";}'
      const result = replacer.replaceInSerialized(input)
      expect(result).toContain('http://local.test')
      expect(result).toContain('http://local.test/wp-content')
    })
  })

  describe('replaceInJSON', () => {
    it('should handle JSON encoded strings', () => {
      const input = '{"url":"https:\\/\\/production.com\\/page"}'
      const result = replacer.replaceInJSON(input)
      expect(result).toBe('{"url":"http:\\/\\/local.test\\/page"}')
    })
  })

  describe('replaceInSQL', () => {
    it('should detect and handle different encoding types', () => {
      const sql = `INSERT INTO wp_options VALUES ('siteurl', 'https://production.com');`
      const result = replacer.replaceInSQL(sql)
      expect(result).toContain('http://local.test')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
pnpm --filter @stratawp/sync test -- url-replace.test.ts
```

Expected: FAIL - UrlReplacer not found

**Step 3: Write the implementation**

```typescript
// packages/sync/src/database/url-replace.ts
import type { UrlReplacement } from '../types.js'

export class UrlReplacer {
  private replacements: UrlReplacement[]

  constructor(replacements: UrlReplacement[]) {
    // Sort by length descending to replace longer URLs first
    this.replacements = [...replacements].sort(
      (a, b) => b.from.length - a.from.length
    )
  }

  /**
   * Simple string replacement
   */
  replaceInString(input: string): string {
    let result = input
    for (const { from, to } of this.replacements) {
      result = result.split(from).join(to)
    }
    return result
  }

  /**
   * Replace URLs in PHP serialized strings, updating string lengths
   */
  replaceInSerialized(input: string): string {
    // Check if it looks like serialized PHP
    if (!this.isSerializedPHP(input)) {
      return this.replaceInString(input)
    }

    let result = input

    for (const { from, to } of this.replacements) {
      // Match serialized string pattern: s:LENGTH:"VALUE";
      const regex = new RegExp(
        `s:(\\d+):"([^"]*${this.escapeRegex(from)}[^"]*)";`,
        'g'
      )

      result = result.replace(regex, (match, length, value) => {
        const newValue = value.split(from).join(to)
        const newLength = Buffer.byteLength(newValue, 'utf8')
        return `s:${newLength}:"${newValue}";`
      })
    }

    return result
  }

  /**
   * Replace URLs in JSON strings (handles escaped slashes)
   */
  replaceInJSON(input: string): string {
    let result = input

    for (const { from, to } of this.replacements) {
      // Handle JSON-escaped URLs (forward slashes escaped as \/)
      const escapedFrom = from.replace(/\//g, '\\/')
      const escapedTo = to.replace(/\//g, '\\/')

      result = result.split(escapedFrom).join(escapedTo)
      // Also do regular replacement for non-escaped
      result = result.split(from).join(to)
    }

    return result
  }

  /**
   * Smart replacement that detects encoding type
   */
  replaceInSQL(sql: string): string {
    // Process line by line to handle different value types
    return sql.split('\n').map((line) => {
      if (!line.includes('INSERT') && !line.includes('UPDATE')) {
        return line
      }

      // Extract values from INSERT/UPDATE statements
      return this.processLine(line)
    }).join('\n')
  }

  private processLine(line: string): string {
    // Match string values in SQL: 'value'
    return line.replace(/'([^'\\]|\\.)*'/g, (match) => {
      const value = match.slice(1, -1) // Remove quotes

      // Detect type and process accordingly
      if (this.isSerializedPHP(value)) {
        return `'${this.replaceInSerialized(value)}'`
      } else if (this.isJSON(value)) {
        return `'${this.replaceInJSON(value)}'`
      } else {
        return `'${this.replaceInString(value)}'`
      }
    })
  }

  private isSerializedPHP(str: string): boolean {
    // Check for common PHP serialization patterns
    return /^[aOsidbN]:\d+/.test(str) || /^[aO]:\d+:\{/.test(str)
  }

  private isJSON(str: string): boolean {
    if (!str.startsWith('{') && !str.startsWith('[')) {
      return false
    }
    try {
      JSON.parse(str.replace(/\\'/g, "'"))
      return true
    } catch {
      return false
    }
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Detect URLs in content and suggest replacements
   */
  static detectUrls(content: string): string[] {
    const urlRegex = /https?:\/\/[^\s"'<>]+/g
    const matches = content.match(urlRegex) || []
    return [...new Set(matches)]
  }
}
```

**Step 4: Update database/index.ts**

```typescript
// packages/sync/src/database/index.ts
export { DatabaseDumper } from './dump.js'
export { UrlReplacer } from './url-replace.js'
```

**Step 5: Run test to verify it passes**

Run:
```bash
pnpm --filter @stratawp/sync test -- url-replace.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add packages/sync/src/database/
git commit -m "feat(sync): add URL replacement engine with serialization support"
```

---

## Task 5: Database Restore Functionality

**Files:**
- Create: `packages/sync/src/database/restore.ts`
- Create: `packages/sync/src/database/__tests__/restore.test.ts`
- Modify: `packages/sync/src/database/index.ts`

**Step 1: Write the failing test**

```typescript
// packages/sync/src/database/__tests__/restore.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DatabaseRestorer } from '../restore.js'
import type { DatabaseConfig } from '../../types.js'

vi.mock('mysql2/promise', () => ({
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

  describe('restoreFromSQL', () => {
    it('should execute SQL statements', async () => {
      const mysql = await import('mysql2/promise')
      const mockConnection = {
        query: vi.fn().mockResolvedValue([]),
        end: vi.fn(),
      }
      vi.mocked(mysql.createConnection).mockResolvedValue(mockConnection as any)

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
      vi.mocked(mysql.createConnection).mockResolvedValue(mockConnection as any)

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
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
pnpm --filter @stratawp/sync test -- restore.test.ts
```

Expected: FAIL - DatabaseRestorer not found

**Step 3: Write the implementation**

```typescript
// packages/sync/src/database/restore.ts
import mysql from 'mysql2/promise'
import type { DatabaseConfig, RestoreOptions } from '../types.js'
import { UrlReplacer } from './url-replace.js'

export class DatabaseRestorer {
  private config: DatabaseConfig

  constructor(config: DatabaseConfig) {
    this.config = config
  }

  private async getConnection() {
    return mysql.createConnection({
      host: this.config.host,
      port: this.config.port || 3306,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      multipleStatements: true,
    })
  }

  async restoreFromSQL(sql: string, options: RestoreOptions = {}): Promise<void> {
    let processedSQL = sql

    // Apply URL replacements if provided
    if (options.urlReplacements && options.urlReplacements.length > 0) {
      const replacer = new UrlReplacer(options.urlReplacements)
      processedSQL = replacer.replaceInSQL(sql)
    }

    if (options.dryRun) {
      console.log('Dry run - SQL to execute:')
      console.log(processedSQL.slice(0, 1000) + '...')
      return
    }

    const connection = await this.getConnection()
    try {
      // Split into statements and execute
      const statements = this.splitStatements(processedSQL)

      for (const statement of statements) {
        if (statement.trim()) {
          await connection.query(statement)
        }
      }
    } finally {
      await connection.end()
    }
  }

  async restoreFromFile(filepath: string, options: RestoreOptions = {}): Promise<void> {
    const fs = await import('fs/promises')
    const zlib = await import('zlib')
    const { promisify } = await import('util')
    const gunzip = promisify(zlib.gunzip)

    let content: string

    if (filepath.endsWith('.gz')) {
      const compressed = await fs.readFile(filepath)
      const decompressed = await gunzip(compressed)
      content = decompressed.toString('utf8')
    } else {
      content = await fs.readFile(filepath, 'utf8')
    }

    await this.restoreFromSQL(content, options)
  }

  private splitStatements(sql: string): string[] {
    // Simple statement splitter - handles basic cases
    // For complex cases, consider using a proper SQL parser
    const statements: string[] = []
    let current = ''
    let inString = false
    let stringChar = ''

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i]
      const prevChar = sql[i - 1]

      // Track string state
      if ((char === "'" || char === '"') && prevChar !== '\\') {
        if (!inString) {
          inString = true
          stringChar = char
        } else if (char === stringChar) {
          inString = false
        }
      }

      // Statement delimiter
      if (char === ';' && !inString) {
        statements.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    if (current.trim()) {
      statements.push(current.trim())
    }

    return statements.filter((s) => s.length > 0)
  }

  /**
   * Backup current database before restore
   */
  async createBackup(): Promise<string> {
    const { DatabaseDumper } = await import('./dump.js')
    const dumper = new DatabaseDumper(this.config)

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = `.stratawp-snapshots/backup-${timestamp}.sql.gz`

    const fs = await import('fs/promises')
    await fs.mkdir('.stratawp-snapshots', { recursive: true })

    await dumper.dumpToFile(backupPath, { compress: true })
    return backupPath
  }
}
```

**Step 4: Update database/index.ts**

```typescript
// packages/sync/src/database/index.ts
export { DatabaseDumper } from './dump.js'
export { DatabaseRestorer } from './restore.js'
export { UrlReplacer } from './url-replace.js'
```

**Step 5: Run test to verify it passes**

Run:
```bash
pnpm --filter @stratawp/sync test -- restore.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add packages/sync/src/database/
git commit -m "feat(sync): add database restore with URL replacement"
```

---

## Task 6: Snapshot Manager

**Files:**
- Create: `packages/sync/src/snapshots/manager.ts`
- Create: `packages/sync/src/snapshots/index.ts`
- Create: `packages/sync/src/snapshots/__tests__/manager.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/sync/src/snapshots/__tests__/manager.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SnapshotManager } from '../manager.js'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

describe('SnapshotManager', () => {
  let tempDir: string
  let manager: SnapshotManager

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stratawp-test-'))
    manager = new SnapshotManager(tempDir)
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('createSnapshot', () => {
    it('should create a snapshot with manifest', async () => {
      // Create a mock theme directory
      const themePath = path.join(tempDir, 'theme')
      await fs.mkdir(themePath, { recursive: true })
      await fs.writeFile(path.join(themePath, 'style.css'), '/* Theme */')
      await fs.writeFile(path.join(themePath, 'functions.php'), '<?php')

      const snapshot = await manager.createSnapshot({
        environment: 'production',
        themePath,
        databaseDump: 'CREATE TABLE test;',
      })

      expect(snapshot.id).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(snapshot.environment).toBe('production')
      expect(snapshot.files.count).toBeGreaterThan(0)
    })
  })

  describe('listSnapshots', () => {
    it('should return empty array when no snapshots', async () => {
      const snapshots = await manager.listSnapshots()
      expect(snapshots).toEqual([])
    })

    it('should return snapshots sorted by date descending', async () => {
      // Create mock snapshots
      const themePath = path.join(tempDir, 'theme')
      await fs.mkdir(themePath, { recursive: true })
      await fs.writeFile(path.join(themePath, 'style.css'), '/* Theme */')

      await manager.createSnapshot({
        environment: 'production',
        themePath,
        databaseDump: 'SQL1',
      })

      // Wait a bit to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10))

      await manager.createSnapshot({
        environment: 'production',
        themePath,
        databaseDump: 'SQL2',
      })

      const snapshots = await manager.listSnapshots()
      expect(snapshots.length).toBe(2)
      // Most recent first
      expect(new Date(snapshots[0].createdAt).getTime())
        .toBeGreaterThan(new Date(snapshots[1].createdAt).getTime())
    })
  })

  describe('getSnapshot', () => {
    it('should retrieve snapshot by id', async () => {
      const themePath = path.join(tempDir, 'theme')
      await fs.mkdir(themePath, { recursive: true })
      await fs.writeFile(path.join(themePath, 'style.css'), '/* Theme */')

      const created = await manager.createSnapshot({
        environment: 'production',
        themePath,
        databaseDump: 'SQL',
      })

      const retrieved = await manager.getSnapshot(created.id)
      expect(retrieved?.id).toBe(created.id)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
pnpm --filter @stratawp/sync test -- manager.test.ts
```

Expected: FAIL - SnapshotManager not found

**Step 3: Write the implementation**

```typescript
// packages/sync/src/snapshots/manager.ts
import * as fs from 'fs/promises'
import * as path from 'path'
import * as crypto from 'crypto'
import tar from 'tar'
import type { SnapshotManifest } from '../types.js'

export interface CreateSnapshotOptions {
  environment: string
  themePath: string
  databaseDump: string
  gitRef?: string
  gitBranch?: string
  themeVersion?: string
  wordpressVersion?: string
  phpVersion?: string
}

export class SnapshotManager {
  private basePath: string
  private indexPath: string

  constructor(basePath: string = '.stratawp-snapshots') {
    this.basePath = basePath
    this.indexPath = path.join(basePath, 'snapshots.json')
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.basePath, { recursive: true })

    try {
      await fs.access(this.indexPath)
    } catch {
      await fs.writeFile(this.indexPath, '[]', 'utf8')
    }
  }

  async createSnapshot(options: CreateSnapshotOptions): Promise<SnapshotManifest> {
    await this.initialize()

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const id = `${timestamp}_${options.environment}`
    const snapshotDir = path.join(this.basePath, id)

    await fs.mkdir(snapshotDir, { recursive: true })

    // Archive theme files
    const themeArchive = path.join(snapshotDir, 'theme.tar.gz')
    const themeFiles = await this.getFileList(options.themePath)

    await tar.create(
      {
        gzip: true,
        file: themeArchive,
        cwd: path.dirname(options.themePath),
      },
      [path.basename(options.themePath)]
    )

    const themeStats = await fs.stat(themeArchive)
    const themeHash = await this.hashFile(themeArchive)

    // Save database dump
    const dbPath = path.join(snapshotDir, 'database.sql.gz')
    const zlib = await import('zlib')
    const { promisify } = await import('util')
    const gzip = promisify(zlib.gzip)

    const compressedDb = await gzip(Buffer.from(options.databaseDump, 'utf8'))
    await fs.writeFile(dbPath, compressedDb)

    const dbStats = await fs.stat(dbPath)
    const dbHash = await this.hashFile(dbPath)

    // Create manifest
    const manifest: SnapshotManifest = {
      id,
      environment: options.environment,
      createdAt: new Date().toISOString(),
      gitRef: options.gitRef,
      gitBranch: options.gitBranch,
      themeVersion: options.themeVersion,
      wordpressVersion: options.wordpressVersion,
      phpVersion: options.phpVersion,
      files: {
        count: themeFiles.length,
        sizeBytes: themeStats.size,
        hash: themeHash,
      },
      database: {
        tables: this.countTables(options.databaseDump),
        sizeBytes: dbStats.size,
        hash: dbHash,
      },
      status: 'current',
    }

    // Save manifest
    await fs.writeFile(
      path.join(snapshotDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    )

    // Update index
    await this.addToIndex(manifest)

    // Mark previous current as not current
    await this.updatePreviousStatus(id, options.environment)

    return manifest
  }

  async listSnapshots(environment?: string): Promise<SnapshotManifest[]> {
    await this.initialize()

    const indexContent = await fs.readFile(this.indexPath, 'utf8')
    let snapshots: SnapshotManifest[] = JSON.parse(indexContent)

    if (environment) {
      snapshots = snapshots.filter((s) => s.environment === environment)
    }

    // Sort by date descending
    return snapshots.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  async getSnapshot(id: string): Promise<SnapshotManifest | null> {
    const snapshots = await this.listSnapshots()
    return snapshots.find((s) => s.id === id) || null
  }

  async deleteSnapshot(id: string): Promise<void> {
    const snapshotDir = path.join(this.basePath, id)

    await fs.rm(snapshotDir, { recursive: true, force: true })

    // Update index
    const snapshots = await this.listSnapshots()
    const filtered = snapshots.filter((s) => s.id !== id)
    await fs.writeFile(this.indexPath, JSON.stringify(filtered, null, 2), 'utf8')
  }

  async markStable(id: string): Promise<void> {
    const snapshots = await this.listSnapshots()
    const snapshot = snapshots.find((s) => s.id === id)

    if (snapshot) {
      snapshot.status = 'stable'
      await fs.writeFile(this.indexPath, JSON.stringify(snapshots, null, 2), 'utf8')

      // Update manifest file too
      const manifestPath = path.join(this.basePath, id, 'manifest.json')
      await fs.writeFile(manifestPath, JSON.stringify(snapshot, null, 2), 'utf8')
    }
  }

  async extractTheme(id: string, targetPath: string): Promise<void> {
    const archivePath = path.join(this.basePath, id, 'theme.tar.gz')

    await tar.extract({
      file: archivePath,
      cwd: targetPath,
    })
  }

  async getDatabaseDump(id: string): Promise<string> {
    const dbPath = path.join(this.basePath, id, 'database.sql.gz')

    const zlib = await import('zlib')
    const { promisify } = await import('util')
    const gunzip = promisify(zlib.gunzip)

    const compressed = await fs.readFile(dbPath)
    const decompressed = await gunzip(compressed)

    return decompressed.toString('utf8')
  }

  private async getFileList(dirPath: string): Promise<string[]> {
    const files: string[] = []

    async function walk(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(fullPath)
        } else {
          files.push(fullPath)
        }
      }
    }

    await walk(dirPath)
    return files
  }

  private async hashFile(filepath: string): Promise<string> {
    const content = await fs.readFile(filepath)
    return crypto.createHash('sha256').update(content).digest('hex')
  }

  private countTables(sql: string): number {
    const matches = sql.match(/CREATE TABLE/gi)
    return matches ? matches.length : 0
  }

  private async addToIndex(manifest: SnapshotManifest): Promise<void> {
    const snapshots = await this.listSnapshots()
    snapshots.unshift(manifest)
    await fs.writeFile(this.indexPath, JSON.stringify(snapshots, null, 2), 'utf8')
  }

  private async updatePreviousStatus(
    currentId: string,
    environment: string
  ): Promise<void> {
    const snapshots = await this.listSnapshots()

    for (const snapshot of snapshots) {
      if (snapshot.environment === environment && snapshot.id !== currentId) {
        if (snapshot.status === 'current') {
          snapshot.status = 'archived'
        }
      }
    }

    await fs.writeFile(this.indexPath, JSON.stringify(snapshots, null, 2), 'utf8')
  }
}
```

**Step 4: Update snapshots/index.ts**

```typescript
// packages/sync/src/snapshots/index.ts
export { SnapshotManager } from './manager.js'
export type { CreateSnapshotOptions } from './manager.js'
```

**Step 5: Run test to verify it passes**

Run:
```bash
pnpm --filter @stratawp/sync test -- manager.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add packages/sync/src/snapshots/
git commit -m "feat(sync): add snapshot manager for backup/restore"
```

---

## Task 7: Diff Engine

**Files:**
- Create: `packages/sync/src/diff/index.ts`
- Create: `packages/sync/src/diff/__tests__/diff.test.ts`
- Modify: `packages/sync/src/index.ts`

**Step 1: Write the failing test**

```typescript
// packages/sync/src/diff/__tests__/diff.test.ts
import { describe, it, expect } from 'vitest'
import { DiffEngine } from '../index.js'

describe('DiffEngine', () => {
  describe('compareFiles', () => {
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
```

**Step 2: Run test to verify it fails**

Run:
```bash
pnpm --filter @stratawp/sync test -- diff.test.ts
```

Expected: FAIL - DiffEngine not found

**Step 3: Write the implementation**

```typescript
// packages/sync/src/diff/index.ts
export interface FileListDiff {
  added: string[]
  deleted: string[]
  unchanged: string[]
}

export interface SQLDiff {
  tablesAdded: string[]
  tablesDeleted: string[]
  tablesModified: string[]
  rowsAdded: number
  rowsDeleted: number
}

export class DiffEngine {
  static compareFileLists(before: string[], after: string[]): FileListDiff {
    const beforeSet = new Set(before)
    const afterSet = new Set(after)

    const added = after.filter((f) => !beforeSet.has(f))
    const deleted = before.filter((f) => !afterSet.has(f))
    const unchanged = before.filter((f) => afterSet.has(f))

    return { added, deleted, unchanged }
  }

  static compareSQLDumps(before: string, after: string): SQLDiff {
    const beforeTables = this.extractTables(before)
    const afterTables = this.extractTables(after)

    const beforeTableNames = new Set(Object.keys(beforeTables))
    const afterTableNames = new Set(Object.keys(afterTables))

    const tablesAdded = [...afterTableNames].filter((t) => !beforeTableNames.has(t))
    const tablesDeleted = [...beforeTableNames].filter((t) => !afterTableNames.has(t))

    const tablesModified: string[] = []
    for (const table of beforeTableNames) {
      if (afterTableNames.has(table)) {
        if (beforeTables[table] !== afterTables[table]) {
          tablesModified.push(table)
        }
      }
    }

    const beforeInserts = this.countInserts(before)
    const afterInserts = this.countInserts(after)

    return {
      tablesAdded,
      tablesDeleted,
      tablesModified,
      rowsAdded: Math.max(0, afterInserts - beforeInserts),
      rowsDeleted: Math.max(0, beforeInserts - afterInserts),
    }
  }

  private static extractTables(sql: string): Record<string, string> {
    const tables: Record<string, string> = {}
    const regex = /CREATE TABLE `?(\w+)`?\s*\([^;]+\);/gi
    let match

    while ((match = regex.exec(sql)) !== null) {
      tables[match[1]] = match[0]
    }

    return tables
  }

  private static countInserts(sql: string): number {
    const matches = sql.match(/INSERT INTO/gi)
    return matches ? matches.length : 0
  }

  static formatDiff(
    filesDiff: FileListDiff,
    sqlDiff?: SQLDiff
  ): string {
    const lines: string[] = []

    if (filesDiff.added.length > 0) {
      lines.push('Files added:')
      filesDiff.added.forEach((f) => lines.push(`  + ${f}`))
    }

    if (filesDiff.deleted.length > 0) {
      lines.push('Files deleted:')
      filesDiff.deleted.forEach((f) => lines.push(`  - ${f}`))
    }

    if (sqlDiff) {
      if (sqlDiff.tablesAdded.length > 0) {
        lines.push('Tables added:')
        sqlDiff.tablesAdded.forEach((t) => lines.push(`  + ${t}`))
      }

      if (sqlDiff.tablesDeleted.length > 0) {
        lines.push('Tables deleted:')
        sqlDiff.tablesDeleted.forEach((t) => lines.push(`  - ${t}`))
      }

      if (sqlDiff.tablesModified.length > 0) {
        lines.push('Tables modified:')
        sqlDiff.tablesModified.forEach((t) => lines.push(`  ~ ${t}`))
      }

      if (sqlDiff.rowsAdded > 0 || sqlDiff.rowsDeleted > 0) {
        lines.push(`Row changes: +${sqlDiff.rowsAdded} -${sqlDiff.rowsDeleted}`)
      }
    }

    return lines.join('\n')
  }
}
```

**Step 4: Update main index.ts**

```typescript
// packages/sync/src/index.ts
export * from './database/index.js'
export * from './snapshots/index.js'
export * from './diff/index.js'
export * from './types.js'
```

**Step 5: Run test to verify it passes**

Run:
```bash
pnpm --filter @stratawp/sync test -- diff.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add packages/sync/src/
git commit -m "feat(sync): add diff engine for comparing snapshots"
```

---

## Task 8: CLI Commands - Rollback List

**Files:**
- Create: `packages/cli/src/commands/rollback.ts`
- Modify: `packages/cli/src/index.ts` (add rollback command)
- Modify: `packages/cli/package.json` (add @stratawp/sync dependency)

**Step 1: Add dependency to CLI package**

In `packages/cli/package.json`, add to dependencies:
```json
"@stratawp/sync": "workspace:*"
```

**Step 2: Create rollback command**

```typescript
// packages/cli/src/commands/rollback.ts
import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { SnapshotManager } from '@stratawp/sync'

export function registerRollbackCommands(program: Command) {
  const rollback = program
    .command('rollback')
    .description('Manage deployment snapshots and rollbacks')

  // List snapshots
  rollback
    .command('list')
    .alias('ls')
    .description('List available snapshots')
    .option('-e, --environment <env>', 'Filter by environment')
    .option('-n, --limit <number>', 'Limit results', '10')
    .action(async (options) => {
      const manager = new SnapshotManager()
      const snapshots = await manager.listSnapshots(options.environment)
      const limited = snapshots.slice(0, parseInt(options.limit))

      if (limited.length === 0) {
        console.log(chalk.yellow('No snapshots found.'))
        console.log(chalk.dim('Snapshots are created automatically during deployment.'))
        return
      }

      console.log(chalk.bold('\nDeployment Snapshots:\n'))

      // Table header
      console.log(
        chalk.dim('  #  ') +
        chalk.dim('Date                 ') +
        chalk.dim('Environment  ') +
        chalk.dim('Size      ') +
        chalk.dim('Status')
      )
      console.log(chalk.dim('─'.repeat(70)))

      limited.forEach((snapshot, index) => {
        const date = new Date(snapshot.createdAt).toLocaleString()
        const size = formatBytes(snapshot.files.sizeBytes + snapshot.database.sizeBytes)
        const status = snapshot.status === 'current'
          ? chalk.green('current')
          : snapshot.status === 'stable'
            ? chalk.blue('stable')
            : chalk.dim('archived')

        console.log(
          `  ${String(index + 1).padStart(2)}  ` +
          `${date.padEnd(20)} ` +
          `${snapshot.environment.padEnd(12)} ` +
          `${size.padEnd(9)} ` +
          status
        )
      })

      console.log()
    })

  // Show diff between snapshots
  rollback
    .command('diff <snapshot1> <snapshot2>')
    .description('Compare two snapshots')
    .action(async (id1: string, id2: string) => {
      const { DiffEngine } = await import('@stratawp/sync')
      const manager = new SnapshotManager()

      const spinner = ora('Loading snapshots...').start()

      const snapshots = await manager.listSnapshots()

      // Support numeric indices
      const s1 = isNaN(parseInt(id1))
        ? snapshots.find((s) => s.id === id1)
        : snapshots[parseInt(id1) - 1]
      const s2 = isNaN(parseInt(id2))
        ? snapshots.find((s) => s.id === id2)
        : snapshots[parseInt(id2) - 1]

      if (!s1 || !s2) {
        spinner.fail('Snapshot not found')
        return
      }

      spinner.text = 'Comparing snapshots...'

      const db1 = await manager.getDatabaseDump(s1.id)
      const db2 = await manager.getDatabaseDump(s2.id)

      const sqlDiff = DiffEngine.compareSQLDumps(db1, db2)

      spinner.succeed('Comparison complete')

      console.log(chalk.bold('\nChanges from snapshot ' + id1 + ' to ' + id2 + ':\n'))

      if (sqlDiff.tablesAdded.length > 0) {
        console.log(chalk.green('Tables added:'))
        sqlDiff.tablesAdded.forEach((t) => console.log(chalk.green(`  + ${t}`)))
      }

      if (sqlDiff.tablesDeleted.length > 0) {
        console.log(chalk.red('Tables deleted:'))
        sqlDiff.tablesDeleted.forEach((t) => console.log(chalk.red(`  - ${t}`)))
      }

      if (sqlDiff.tablesModified.length > 0) {
        console.log(chalk.yellow('Tables modified:'))
        sqlDiff.tablesModified.forEach((t) => console.log(chalk.yellow(`  ~ ${t}`)))
      }

      console.log()
      console.log(`Row changes: ${chalk.green('+' + sqlDiff.rowsAdded)} ${chalk.red('-' + sqlDiff.rowsDeleted)}`)
      console.log()
    })

  // Mark snapshot as stable
  rollback
    .command('mark-stable <snapshot>')
    .description('Mark a snapshot as known-good (stable)')
    .action(async (id: string) => {
      const manager = new SnapshotManager()
      const snapshots = await manager.listSnapshots()

      const snapshot = isNaN(parseInt(id))
        ? snapshots.find((s) => s.id === id)
        : snapshots[parseInt(id) - 1]

      if (!snapshot) {
        console.log(chalk.red('Snapshot not found'))
        return
      }

      await manager.markStable(snapshot.id)
      console.log(chalk.green(`✓ Marked snapshot ${snapshot.id} as stable`))
    })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
```

**Step 3: Register command in CLI index**

Add to `packages/cli/src/index.ts`:
```typescript
import { registerRollbackCommands } from './commands/rollback.js'

// ... in the main function where commands are registered:
registerRollbackCommands(program)
```

**Step 4: Build and test**

Run:
```bash
pnpm install
pnpm --filter @stratawp/cli build
```

Expected: Build succeeds

**Step 5: Commit**

```bash
git add packages/cli/
git commit -m "feat(cli): add rollback:list, rollback:diff, rollback:mark-stable commands"
```

---

## Task 9: CLI Commands - Sync Database

**Files:**
- Create: `packages/cli/src/commands/sync.ts`
- Modify: `packages/cli/src/index.ts` (add sync command)

**Step 1: Create sync command**

```typescript
// packages/cli/src/commands/sync.ts
import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import prompts from 'prompts'
import { DatabaseDumper, DatabaseRestorer, UrlReplacer } from '@stratawp/sync'
import * as fs from 'fs/promises'
import * as path from 'path'

export function registerSyncCommands(program: Command) {
  const sync = program
    .command('sync')
    .description('Sync environments (database, media, config)')

  // Database sync subcommands
  const db = sync
    .command('db')
    .description('Database sync operations')

  // Pull database from remote
  db
    .command('pull <environment>')
    .description('Pull database from remote environment to local')
    .option('--tables <tables>', 'Only sync specific tables (comma-separated)')
    .option('--no-url-replace', 'Skip URL replacement')
    .option('--dry-run', 'Show what would be done without doing it')
    .action(async (environment: string, options) => {
      const config = await loadSyncConfig()

      if (!config) {
        console.log(chalk.red('No sync configuration found.'))
        console.log(chalk.dim('Run `stratawp sync:setup` to configure environments.'))
        return
      }

      const remoteEnv = config.environments[environment]
      const localEnv = config.environments['local']

      if (!remoteEnv) {
        console.log(chalk.red(`Environment "${environment}" not found in config.`))
        return
      }

      if (!localEnv) {
        console.log(chalk.red('Local environment not configured.'))
        return
      }

      const spinner = ora(`Connecting to ${environment}...`).start()

      try {
        // Dump remote database
        spinner.text = `Dumping database from ${environment}...`

        const dumper = new DatabaseDumper(remoteEnv.database)
        const dumpOptions = options.tables
          ? { tables: options.tables.split(',') }
          : {}

        const sql = await dumper.generateDumpSQL(dumpOptions)

        spinner.text = 'Detecting URLs to replace...'

        // Detect and show URL replacements
        const detectedUrls = UrlReplacer.detectUrls(sql)
        const relevantUrls = detectedUrls.filter((url) =>
          url.includes(remoteEnv.url.replace(/^https?:\/\//, ''))
        )

        spinner.stop()

        if (!options.noUrlReplace && relevantUrls.length > 0) {
          console.log(chalk.bold('\nURL replacements:'))
          console.log(chalk.dim(`  ${remoteEnv.url} → ${localEnv.url}`))

          const { confirmed } = await prompts({
            type: 'confirm',
            name: 'confirmed',
            message: 'Proceed with database import?',
            initial: true,
          })

          if (!confirmed) {
            console.log(chalk.yellow('Cancelled.'))
            return
          }
        }

        if (options.dryRun) {
          console.log(chalk.yellow('\nDry run - no changes made.'))
          console.log(chalk.dim(`Would import ${sql.length} bytes of SQL`))
          return
        }

        spinner.start('Backing up local database...')

        const restorer = new DatabaseRestorer(localEnv.database)
        const backupPath = await restorer.createBackup()

        spinner.text = 'Importing database...'

        await restorer.restoreFromSQL(sql, {
          urlReplacements: options.noUrlReplace
            ? []
            : [{ from: remoteEnv.url, to: localEnv.url }],
        })

        spinner.succeed(`Database synced from ${environment}`)
        console.log(chalk.dim(`  Backup saved to: ${backupPath}`))
      } catch (error) {
        spinner.fail('Sync failed')
        console.error(chalk.red(error instanceof Error ? error.message : String(error)))
      }
    })

  // Push database to remote
  db
    .command('push <environment>')
    .description('Push local database to remote environment')
    .option('--tables <tables>', 'Only sync specific tables (comma-separated)')
    .option('--no-url-replace', 'Skip URL replacement')
    .option('--dry-run', 'Show what would be done without doing it')
    .option('--force', 'Skip confirmation prompt')
    .action(async (environment: string, options) => {
      const config = await loadSyncConfig()

      if (!config) {
        console.log(chalk.red('No sync configuration found.'))
        return
      }

      const remoteEnv = config.environments[environment]
      const localEnv = config.environments['local']

      if (!remoteEnv || !localEnv) {
        console.log(chalk.red('Environment not found in config.'))
        return
      }

      if (environment === 'production' && !options.force) {
        console.log(chalk.bold.red('\n⚠️  WARNING: Pushing to production!'))

        const { confirmed } = await prompts({
          type: 'confirm',
          name: 'confirmed',
          message: 'Are you sure you want to overwrite the production database?',
          initial: false,
        })

        if (!confirmed) {
          console.log(chalk.yellow('Cancelled.'))
          return
        }
      }

      const spinner = ora('Dumping local database...').start()

      try {
        const dumper = new DatabaseDumper(localEnv.database)
        const sql = await dumper.generateDumpSQL(
          options.tables ? { tables: options.tables.split(',') } : {}
        )

        if (options.dryRun) {
          spinner.stop()
          console.log(chalk.yellow('\nDry run - no changes made.'))
          console.log(chalk.dim(`Would push ${sql.length} bytes of SQL`))
          return
        }

        spinner.text = `Pushing to ${environment}...`

        const restorer = new DatabaseRestorer(remoteEnv.database)

        await restorer.restoreFromSQL(sql, {
          urlReplacements: options.noUrlReplace
            ? []
            : [{ from: localEnv.url, to: remoteEnv.url }],
        })

        spinner.succeed(`Database pushed to ${environment}`)
      } catch (error) {
        spinner.fail('Push failed')
        console.error(chalk.red(error instanceof Error ? error.message : String(error)))
      }
    })

  // Config export
  sync
    .command('config')
    .description('Export/import theme configuration')

  sync
    .command('config:export')
    .description('Export theme settings to portable files')
    .option('-o, --output <dir>', 'Output directory', '.stratawp-config')
    .action(async (options) => {
      console.log(chalk.yellow('Config export coming in Phase 2'))
    })

  sync
    .command('config:import')
    .description('Import theme settings from files')
    .option('-i, --input <dir>', 'Input directory', '.stratawp-config')
    .action(async (options) => {
      console.log(chalk.yellow('Config import coming in Phase 2'))
    })
}

async function loadSyncConfig() {
  try {
    const configPath = path.join(process.cwd(), '.stratawp-sync.json')
    const content = await fs.readFile(configPath, 'utf8')
    return JSON.parse(content)
  } catch {
    return null
  }
}
```

**Step 2: Register in CLI index**

Add to `packages/cli/src/index.ts`:
```typescript
import { registerSyncCommands } from './commands/sync.js'

// ... in the main function:
registerSyncCommands(program)
```

**Step 3: Build and verify**

Run:
```bash
pnpm --filter @stratawp/cli build
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add packages/cli/src/commands/sync.ts packages/cli/src/index.ts
git commit -m "feat(cli): add sync:db pull/push commands"
```

---

## Task 10: Integration with Deploy Command

**Files:**
- Modify: `packages/cli/src/commands/deploy/index.ts` (add snapshot creation)

**Step 1: Add snapshot creation to deploy**

Find the deploy command implementation and add snapshot creation before deployment starts.

Add near the top of the deploy action:
```typescript
import { SnapshotManager, DatabaseDumper } from '@stratawp/sync'

// Inside the deploy action, before files are uploaded:
if (!options.noBackup) {
  spinner.text = 'Creating pre-deploy snapshot...'

  try {
    const manager = new SnapshotManager()

    // Get database dump if possible
    let databaseDump = ''
    if (deployConfig.database) {
      const dumper = new DatabaseDumper(deployConfig.database)
      databaseDump = await dumper.generateDumpSQL()
    }

    const snapshot = await manager.createSnapshot({
      environment: environment,
      themePath: process.cwd(),
      databaseDump,
      gitRef: await getGitRef(),
      gitBranch: await getGitBranch(),
    })

    console.log(chalk.dim(`  Snapshot saved: ${snapshot.id}`))
  } catch (error) {
    console.log(chalk.yellow(`  Warning: Could not create snapshot: ${error}`))
  }
}
```

Add helper functions:
```typescript
async function getGitRef(): Promise<string | undefined> {
  try {
    const { execSync } = await import('child_process')
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return undefined
  }
}

async function getGitBranch(): Promise<string | undefined> {
  try {
    const { execSync } = await import('child_process')
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return undefined
  }
}
```

**Step 2: Add --no-backup option**

Add to deploy command options:
```typescript
.option('--no-backup', 'Skip creating pre-deploy snapshot')
```

**Step 3: Build and verify**

Run:
```bash
pnpm --filter @stratawp/cli build
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add packages/cli/src/commands/deploy/
git commit -m "feat(deploy): automatically create snapshot before deployment"
```

---

## Task 11: Final Integration Test

**Files:**
- Create: `packages/sync/src/__tests__/integration.test.ts`

**Step 1: Write integration test**

```typescript
// packages/sync/src/__tests__/integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { SnapshotManager, DiffEngine } from '../index.js'

describe('Integration: Snapshot workflow', () => {
  let tempDir: string
  let manager: SnapshotManager
  let themePath: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stratawp-integration-'))
    manager = new SnapshotManager(path.join(tempDir, 'snapshots'))

    // Create mock theme
    themePath = path.join(tempDir, 'theme')
    await fs.mkdir(themePath, { recursive: true })
    await fs.writeFile(path.join(themePath, 'style.css'), '/* Theme v1 */')
    await fs.writeFile(path.join(themePath, 'functions.php'), '<?php // v1')
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('should create snapshot, modify theme, create another, and diff them', async () => {
    // Create first snapshot
    const snapshot1 = await manager.createSnapshot({
      environment: 'production',
      themePath,
      databaseDump: 'CREATE TABLE wp_posts (id INT); INSERT INTO wp_posts VALUES (1);',
    })

    expect(snapshot1.status).toBe('current')

    // Modify theme
    await fs.writeFile(path.join(themePath, 'style.css'), '/* Theme v2 - updated */')
    await fs.writeFile(path.join(themePath, 'new-file.php'), '<?php // new')

    // Create second snapshot
    const snapshot2 = await manager.createSnapshot({
      environment: 'production',
      themePath,
      databaseDump: 'CREATE TABLE wp_posts (id INT); INSERT INTO wp_posts VALUES (1); INSERT INTO wp_posts VALUES (2);',
    })

    expect(snapshot2.status).toBe('current')

    // List snapshots
    const snapshots = await manager.listSnapshots()
    expect(snapshots.length).toBe(2)
    expect(snapshots[0].id).toBe(snapshot2.id) // Most recent first

    // Compare database dumps
    const db1 = await manager.getDatabaseDump(snapshot1.id)
    const db2 = await manager.getDatabaseDump(snapshot2.id)

    const diff = DiffEngine.compareSQLDumps(db1, db2)
    expect(diff.rowsAdded).toBe(1)

    // Mark first as stable
    await manager.markStable(snapshot1.id)
    const updated = await manager.getSnapshot(snapshot1.id)
    expect(updated?.status).toBe('stable')
  })
})
```

**Step 2: Run integration test**

Run:
```bash
pnpm --filter @stratawp/sync test -- integration.test.ts
```

Expected: PASS

**Step 3: Run all tests**

Run:
```bash
pnpm --filter @stratawp/sync test
```

Expected: All tests pass

**Step 4: Build entire project**

Run:
```bash
pnpm build
```

Expected: All packages build successfully

**Step 5: Final commit**

```bash
git add packages/sync/src/__tests__/integration.test.ts
git commit -m "test(sync): add integration test for snapshot workflow"
```

---

## Summary

Phase 1 delivers:

1. **@stratawp/sync package** with:
   - Database dump/restore functionality
   - URL replacement engine (handles serialized PHP, JSON)
   - Snapshot manager for backup/restore
   - Diff engine for comparing snapshots

2. **CLI commands**:
   - `stratawp rollback:list` - View deployment snapshots
   - `stratawp rollback:diff` - Compare two snapshots
   - `stratawp rollback:mark-stable` - Mark known-good state
   - `stratawp sync:db pull` - Pull database from remote
   - `stratawp sync:db push` - Push database to remote

3. **Deploy integration**:
   - Automatic snapshot creation before deployment
   - `--no-backup` flag to skip snapshot

**Next phases** will add:
- Phase 2: Media sync, cloud storage, config export/import
- Phase 3: Monitoring PHP plugin and RUM
- Phase 4: Dashboard UI and Lighthouse
- Phase 5: Third-party integrations and alerts
