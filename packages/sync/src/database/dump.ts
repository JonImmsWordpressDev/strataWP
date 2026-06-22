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
      let tables = options.tables || (await this.getTables())

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
              const values = columns
                .map((col) => {
                  const value = row[col]
                  if (value === null) return 'NULL'
                  if (typeof value === 'number') return value.toString()
                  // Escape string values
                  return `'${String(value).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`
                })
                .join(', ')

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
