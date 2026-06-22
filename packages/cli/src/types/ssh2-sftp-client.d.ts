declare module 'ssh2-sftp-client' {
  interface ConnectOptions {
    host?: string
    port?: number
    username?: string
    password?: string
    privateKey?: string | Buffer
    passphrase?: string
  }

  interface FileInfo {
    type: string
    name: string
    size: number
    modifyTime: number
    accessTime: number
    rights: { user: string; group: string; other: string }
    owner: number
    group: number
  }

  interface StatResult {
    mode: number
    uid: number
    gid: number
    size: number
    accessTime: number
    modifyTime: number
    isDirectory: () => boolean
    isFile: () => boolean
    isSymbolicLink: () => boolean
  }

  class SFTPClient {
    connect(config: ConnectOptions): Promise<void>
    put(localPath: string, remotePath: string): Promise<void>
    fastPut(localPath: string, remotePath: string): Promise<void>
    mkdir(remotePath: string, recursive?: boolean): Promise<void>
    list(remotePath: string): Promise<FileInfo[]>
    stat(remotePath: string): Promise<StatResult>
    delete(remotePath: string): Promise<void>
    end(): Promise<void>
  }

  export default SFTPClient
}
