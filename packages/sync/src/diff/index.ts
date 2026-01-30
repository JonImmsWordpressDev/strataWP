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
