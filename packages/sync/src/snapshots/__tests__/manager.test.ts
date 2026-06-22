// packages/sync/src/snapshots/__tests__/manager.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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
      expect(new Date(snapshots[0].createdAt).getTime()).toBeGreaterThan(
        new Date(snapshots[1].createdAt).getTime()
      )
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

  describe('getDatabaseDump', () => {
    it('should retrieve the database dump from a snapshot', async () => {
      const themePath = path.join(tempDir, 'theme')
      await fs.mkdir(themePath, { recursive: true })
      await fs.writeFile(path.join(themePath, 'style.css'), '/* Theme */')

      const databaseDump = 'CREATE TABLE wp_posts (id INT);'
      const snapshot = await manager.createSnapshot({
        environment: 'production',
        themePath,
        databaseDump,
      })

      const retrieved = await manager.getDatabaseDump(snapshot.id)
      expect(retrieved).toBe(databaseDump)
    })

    it('should throw error for non-existent snapshot', async () => {
      await expect(manager.getDatabaseDump('non-existent')).rejects.toThrow('Snapshot not found')
    })
  })
})
