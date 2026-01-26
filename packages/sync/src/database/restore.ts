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
    const statements: string[] = []
    let current = ''
    let inString = false
    let stringChar = ''
    let i = 0

    while (i < sql.length) {
      const char = sql[i]

      if (!inString) {
        // Not in a string - look for string start or statement end
        if (char === "'" || char === '"') {
          inString = true
          stringChar = char
          current += char
        } else if (char === ';') {
          if (current.trim()) {
            statements.push(current.trim())
          }
          current = ''
        } else {
          current += char
        }
      } else {
        // Inside a string
        if (char === stringChar) {
          // Check for doubled quote escape (MySQL convention)
          if (sql[i + 1] === stringChar) {
            // Doubled quote - part of string, not terminator
            current += char + sql[i + 1]
            i++ // Skip next quote
          } else {
            // End of string
            current += char
            inString = false
          }
        } else if (char === '\\' && sql[i + 1] === stringChar) {
          // Backslash escape (also valid in MySQL)
          current += char + sql[i + 1]
          i++ // Skip escaped character
        } else {
          current += char
        }
      }
      i++
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
