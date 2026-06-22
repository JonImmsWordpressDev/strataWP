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
    expect(snapshot1.environment).toBe('production')

    // Modify theme
    await fs.writeFile(path.join(themePath, 'style.css'), '/* Theme v2 - updated */')
    await fs.writeFile(path.join(themePath, 'new-file.php'), '<?php // new')

    // Wait a bit to ensure different timestamp
    await new Promise((r) => setTimeout(r, 10))

    // Create second snapshot
    const snapshot2 = await manager.createSnapshot({
      environment: 'production',
      themePath,
      databaseDump:
        'CREATE TABLE wp_posts (id INT); INSERT INTO wp_posts VALUES (1); INSERT INTO wp_posts VALUES (2);',
    })

    expect(snapshot2.status).toBe('current')

    // List snapshots
    const snapshots = await manager.listSnapshots()
    expect(snapshots.length).toBe(2)
    expect(snapshots[0].id).toBe(snapshot2.id) // Most recent first

    // First snapshot should now be archived
    const updatedSnapshot1 = await manager.getSnapshot(snapshot1.id)
    expect(updatedSnapshot1?.status).toBe('archived')

    // Compare database dumps
    const db1 = await manager.getDatabaseDump(snapshot1.id)
    const db2 = await manager.getDatabaseDump(snapshot2.id)

    const diff = DiffEngine.compareSQLDumps(db1, db2)
    expect(diff.rowsAdded).toBe(1) // One new INSERT

    // Mark first as stable
    await manager.markStable(snapshot1.id)
    const stableSnapshot = await manager.getSnapshot(snapshot1.id)
    expect(stableSnapshot?.status).toBe('stable')
  })

  it('should filter snapshots by environment', async () => {
    await manager.createSnapshot({
      environment: 'production',
      themePath,
      databaseDump: 'SQL1',
    })

    await new Promise((r) => setTimeout(r, 10))

    await manager.createSnapshot({
      environment: 'staging',
      themePath,
      databaseDump: 'SQL2',
    })

    const allSnapshots = await manager.listSnapshots()
    expect(allSnapshots.length).toBe(2)

    const prodSnapshots = await manager.listSnapshots('production')
    expect(prodSnapshots.length).toBe(1)
    expect(prodSnapshots[0].environment).toBe('production')

    const stagingSnapshots = await manager.listSnapshots('staging')
    expect(stagingSnapshots.length).toBe(1)
    expect(stagingSnapshots[0].environment).toBe('staging')
  })

  it('should delete snapshots and update index', async () => {
    const snapshot = await manager.createSnapshot({
      environment: 'production',
      themePath,
      databaseDump: 'SQL',
    })

    let snapshots = await manager.listSnapshots()
    expect(snapshots.length).toBe(1)

    await manager.deleteSnapshot(snapshot.id)

    snapshots = await manager.listSnapshots()
    expect(snapshots.length).toBe(0)
  })
})

describe('Integration: DiffEngine', () => {
  it('should format diff output correctly', () => {
    const filesDiff = {
      added: ['new.php', 'added.css'],
      deleted: ['old.php'],
      unchanged: ['keep.php'],
    }

    const sqlDiff = {
      tablesAdded: ['wp_new'],
      tablesDeleted: ['wp_old'],
      tablesModified: ['wp_posts'],
      rowsAdded: 10,
      rowsDeleted: 5,
    }

    const output = DiffEngine.formatDiff(filesDiff, sqlDiff)

    expect(output).toContain('Files added:')
    expect(output).toContain('+ new.php')
    expect(output).toContain('Files deleted:')
    expect(output).toContain('- old.php')
    expect(output).toContain('Tables added:')
    expect(output).toContain('+ wp_new')
    expect(output).toContain('Row changes: +10 -5')
  })
})
