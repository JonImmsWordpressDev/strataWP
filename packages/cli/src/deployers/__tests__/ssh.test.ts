import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { EnvironmentConfig } from '../../utils/deploy-config'

// Create hoisted mock functions - these are created before any imports
const { mockConnect, mockDispose, mockIsConnected, mockExecCommand, mockPutFile } = vi.hoisted(() => ({
  mockConnect: vi.fn(),
  mockDispose: vi.fn(),
  mockIsConnected: vi.fn(),
  mockExecCommand: vi.fn(),
  mockPutFile: vi.fn(),
}))

// Mock node-ssh using hoisted mocks
vi.mock('node-ssh', () => {
  class MockNodeSSH {
    connect = mockConnect
    dispose = mockDispose
    isConnected = mockIsConnected
    execCommand = mockExecCommand
    putFile = mockPutFile
  }
  return { NodeSSH: MockNodeSSH }
})

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn().mockRejectedValue(new Error('rsync not available')),
}))

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn().mockResolvedValue(true),
    writeFile: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}))

// Import after mocks
import { SSHDeployer } from '../ssh.js'

describe('SSHDeployer', () => {
  let deployer: SSHDeployer
  let config: EnvironmentConfig

  beforeEach(() => {
    vi.clearAllMocks()

    config = {
      type: 'ssh',
      host: 'example.com',
      port: 22,
      username: 'deploy',
      password: 'secret',
      remotePath: '/var/www/html/wp-content/themes/my-theme',
      buildBefore: false,
    }

    deployer = new SSHDeployer(config)

    // Default mock implementations
    mockConnect.mockResolvedValue(undefined)
    mockIsConnected.mockReturnValue(true)
    mockExecCommand.mockResolvedValue({ code: 0, stdout: '', stderr: '' })
    mockPutFile.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('connect', () => {
    it('should connect with password authentication', async () => {
      await deployer.connect()

      expect(mockConnect).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'example.com',
          port: 22,
          username: 'deploy',
          password: 'secret',
        })
      )
    })

    it('should connect with private key authentication', async () => {
      const keyConfig: EnvironmentConfig = {
        ...config,
        password: undefined,
        privateKey: '/home/user/.ssh/id_rsa',
      }
      const keyDeployer = new SSHDeployer(keyConfig)

      await keyDeployer.connect()

      expect(mockConnect).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'example.com',
          username: 'deploy',
          privateKeyPath: '/home/user/.ssh/id_rsa',
        })
      )
    })

    it('should throw error on connection failure', async () => {
      mockConnect.mockRejectedValue(new Error('Connection refused'))

      await expect(deployer.connect()).rejects.toThrow(
        'Failed to connect to SSH server: Connection refused'
      )
    })
  })

  describe('disconnect', () => {
    it('should dispose SSH connection', async () => {
      await deployer.connect()
      mockIsConnected.mockReturnValue(true)

      await deployer.disconnect()

      expect(mockDispose).toHaveBeenCalled()
    })

    it('should handle disconnect when not connected', async () => {
      mockIsConnected.mockReturnValue(false)

      await expect(deployer.disconnect()).resolves.not.toThrow()
    })
  })

  describe('testConnection', () => {
    it('should return true when connection succeeds and path exists', async () => {
      mockExecCommand.mockResolvedValue({
        code: 0,
        stdout: 'exists',
        stderr: '',
      })

      const result = await deployer.testConnection()

      expect(result).toBe(true)
    })

    it('should return false when connection fails', async () => {
      mockConnect.mockRejectedValue(new Error('Connection failed'))

      const result = await deployer.testConnection()

      expect(result).toBe(false)
    })
  })

  describe('uploadFile', () => {
    it('should create directory and upload file', async () => {
      await deployer.connect()
      await deployer.uploadFile(
        '/local/file.php',
        '/var/www/html/wp-content/themes/my-theme/file.php'
      )

      expect(mockExecCommand).toHaveBeenCalledWith(
        'mkdir -p "/var/www/html/wp-content/themes/my-theme"'
      )
      expect(mockPutFile).toHaveBeenCalledWith(
        '/local/file.php',
        '/var/www/html/wp-content/themes/my-theme/file.php'
      )
    })
  })

  describe('uploadFiles', () => {
    it('should upload multiple files via SFTP', async () => {
      await deployer.connect()

      const files = [
        {
          localPath: '/local/file1.php',
          remotePath: '/remote/file1.php',
          relativePath: 'file1.php',
          size: 100,
          hash: 'abc123',
        },
        {
          localPath: '/local/file2.php',
          remotePath: '/remote/file2.php',
          relativePath: 'file2.php',
          size: 200,
          hash: 'def456',
        },
      ]

      await deployer.uploadFiles(files)

      expect(mockPutFile).toHaveBeenCalledTimes(2)
    })

    it('should handle empty file list', async () => {
      await deployer.connect()
      await deployer.uploadFiles([])

      expect(mockPutFile).not.toHaveBeenCalled()
    })
  })

  describe('deleteFile', () => {
    it('should delete file using rm command', async () => {
      await deployer.connect()
      await deployer.deleteFile('/remote/file.php')

      expect(mockExecCommand).toHaveBeenCalledWith('rm -f "/remote/file.php"')
    })
  })

  describe('deleteFiles', () => {
    it('should delete multiple files', async () => {
      await deployer.connect()
      await deployer.deleteFiles(['/remote/file1.php', '/remote/file2.php'])

      expect(mockExecCommand).toHaveBeenCalledWith(
        'rm -f "/remote/file1.php" "/remote/file2.php"'
      )
    })

    it('should handle empty file list', async () => {
      await deployer.connect()
      mockExecCommand.mockClear() // Clear the rsync check call
      await deployer.deleteFiles([])

      // Should not call rm for empty list
      expect(mockExecCommand).not.toHaveBeenCalled()
    })
  })

  describe('createDirectory', () => {
    it('should create directory with parents', async () => {
      await deployer.connect()
      await deployer.createDirectory('/var/www/new/dir')

      expect(mockExecCommand).toHaveBeenCalledWith(
        'mkdir -p "/var/www/new/dir"'
      )
    })
  })

  describe('pathExists', () => {
    it('should return true when path exists', async () => {
      await deployer.connect()
      mockExecCommand.mockResolvedValue({ code: 0, stdout: '', stderr: '' })

      const exists = await deployer.pathExists('/var/www/html')

      expect(exists).toBe(true)
      expect(mockExecCommand).toHaveBeenCalledWith('test -e "/var/www/html"')
    })

    it('should return false when path does not exist', async () => {
      await deployer.connect()
      mockExecCommand.mockResolvedValue({ code: 1, stdout: '', stderr: '' })

      const exists = await deployer.pathExists('/nonexistent')

      expect(exists).toBe(false)
    })
  })

  describe('createBackup', () => {
    it('should create backup using cp command', async () => {
      await deployer.connect()

      mockExecCommand
        .mockResolvedValueOnce({ code: 0, stdout: '', stderr: '' }) // test -e
        .mockResolvedValueOnce({ code: 0, stdout: '', stderr: '' }) // cp -r

      const backupPath = await deployer.createBackup()

      expect(backupPath).toMatch(/backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)
      expect(mockExecCommand).toHaveBeenCalledWith(
        expect.stringContaining('cp -r'),
        expect.any(Object)
      )
    })

    it('should throw error when backup fails', async () => {
      await deployer.connect()

      mockExecCommand
        .mockResolvedValueOnce({ code: 0, stdout: '', stderr: '' }) // test -e
        .mockResolvedValueOnce({
          code: 1,
          stdout: '',
          stderr: 'Permission denied',
        }) // cp -r fails

      await expect(deployer.createBackup()).rejects.toThrow(
        'Failed to create backup'
      )
    })
  })

  describe('restoreBackup', () => {
    it('should restore from backup', async () => {
      await deployer.connect()
      mockExecCommand.mockResolvedValue({ code: 0, stdout: '', stderr: '' })

      await deployer.restoreBackup('/var/www/html/backup-2024-01-01')

      expect(mockExecCommand).toHaveBeenCalledWith(
        expect.stringContaining('rm -rf')
      )
      expect(mockExecCommand).toHaveBeenCalledWith(
        expect.stringContaining('cp -r "/var/www/html/backup-2024-01-01"')
      )
    })

    it('should throw error when backup does not exist', async () => {
      await deployer.connect()
      mockExecCommand.mockResolvedValue({ code: 1, stdout: '', stderr: '' })

      await expect(
        deployer.restoreBackup('/nonexistent/backup')
      ).rejects.toThrow('Backup not found')
    })
  })

  describe('listBackups', () => {
    it('should list backup directories', async () => {
      await deployer.connect()
      mockExecCommand.mockResolvedValue({
        code: 0,
        stdout:
          '1704067200 /var/www/html/backup-2024-01-01\n1704153600 /var/www/html/backup-2024-01-02',
        stderr: '',
      })

      const backups = await deployer.listBackups()

      expect(backups).toHaveLength(2)
      expect(backups[0].id).toBe('backup-2024-01-02')
      expect(backups[1].id).toBe('backup-2024-01-01')
    })

    it('should return empty array when no backups exist', async () => {
      await deployer.connect()
      mockExecCommand.mockResolvedValue({ code: 0, stdout: '', stderr: '' })

      const backups = await deployer.listBackups()

      expect(backups).toEqual([])
    })
  })

  describe('executeCommand', () => {
    it('should execute command on remote server', async () => {
      await deployer.connect()
      mockExecCommand.mockResolvedValue({
        code: 0,
        stdout: 'command output',
        stderr: '',
      })

      const output = await deployer.executeCommand('wp cache flush')

      expect(output).toBe('command output')
      expect(mockExecCommand).toHaveBeenCalledWith('wp cache flush', {
        cwd: config.remotePath,
      })
    })

    it('should throw error when not connected', async () => {
      // Don't call connect - deployer is not connected
      await expect(deployer.executeCommand('ls')).rejects.toThrow(
        'Not connected to SSH server'
      )
    })

    it('should throw error when command fails', async () => {
      await deployer.connect()
      mockExecCommand.mockResolvedValue({
        code: 1,
        stdout: '',
        stderr: 'Command not found',
      })

      await expect(deployer.executeCommand('invalid-cmd')).rejects.toThrow(
        'Command not found'
      )
    })
  })

  describe('getType', () => {
    it('should return ssh', () => {
      expect(deployer.getType()).toBe('ssh')
    })
  })

  describe('getConnectionInfo', () => {
    it('should return connection details', () => {
      const info = deployer.getConnectionInfo()

      expect(info).toEqual({
        type: 'ssh',
        host: 'example.com',
        port: 22,
        remotePath: '/var/www/html/wp-content/themes/my-theme',
      })
    })
  })
})
