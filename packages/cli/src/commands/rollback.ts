// packages/cli/src/commands/rollback.ts
import chalk from 'chalk'
import ora from 'ora'
import { SnapshotManager, DiffEngine } from '@stratawp/sync'

export async function rollbackListCommand(options: { environment?: string; limit?: string }) {
  const manager = new SnapshotManager()
  const snapshots = await manager.listSnapshots(options.environment)
  const limit = parseInt(options.limit || '10', 10)
  const limited = snapshots.slice(0, limit)

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
    const status =
      snapshot.status === 'current'
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
}

export async function rollbackDiffCommand(id1: string, id2: string) {
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
  console.log(
    `Row changes: ${chalk.green('+' + sqlDiff.rowsAdded)} ${chalk.red('-' + sqlDiff.rowsDeleted)}`
  )
  console.log()
}

export async function rollbackMarkStableCommand(id: string) {
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
  console.log(chalk.green(`Marked snapshot ${snapshot.id} as stable`))
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
