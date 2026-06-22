# @stratawp/sync

Environment sync, snapshots, and rollback for StrataWP WordPress themes.

## Installation

```bash
pnpm add @stratawp/sync
```

## Features

- **Database Dump/Restore**: Export and import MySQL databases with proper handling of WordPress data
- **URL Replacement**: Intelligent URL replacement that correctly handles PHP serialized strings
- **Snapshot Management**: Create, list, compare, and restore deployment snapshots
- **Diff Engine**: Compare snapshots to see what changed between deployments

## CLI Commands

The sync package integrates with `@stratawp/cli` to provide these commands:

### Database Sync

```bash
# Pull remote database to local
stratawp sync:db:pull production

# Push local database to remote
stratawp sync:db:push staging

# Options
--tables=wp_posts,wp_postmeta   # Sync specific tables only
--no-url-replace                # Skip automatic URL replacement
--dry-run                       # Preview without making changes
--force                         # Skip confirmation for production
```

### Rollback Commands

```bash
# List all snapshots
stratawp rollback:list
stratawp rollback:list --environment=production
stratawp rollback:list --limit=20

# Compare two snapshots
stratawp rollback:diff 1 2              # By index
stratawp rollback:diff snapshot-id-1 snapshot-id-2  # By ID

# Mark a snapshot as stable (won't be auto-cleaned)
stratawp rollback:mark-stable 1
```

## Configuration

Create `.stratawp-sync.json` in your project root.

### SSH Configuration (Recommended)

Most production databases only allow connections from localhost (`127.0.0.1`), making direct MySQL connections impossible. Use SSH-based sync instead:

```json
{
  "environments": {
    "local": {
      "name": "local",
      "url": "http://local.test",
      "database": {
        "host": "localhost",
        "port": 3306,
        "user": "root",
        "password": "",
        "database": "wordpress"
      }
    },
    "production": {
      "name": "production",
      "url": "https://example.com",
      "ssh": {
        "host": "ssh.example.com",
        "port": 22,
        "user": "deploy",
        "key": "~/.ssh/id_rsa"
      },
      "wpPath": "/var/www/html",
      "database": {
        "host": "127.0.0.1",
        "user": "prod_user",
        "password": "prod_pass",
        "database": "wp_production"
      }
    }
  }
}
```

**SSH Configuration Options:**

| Option           | Description                                     |
| ---------------- | ----------------------------------------------- |
| `ssh.host`       | SSH server hostname                             |
| `ssh.port`       | SSH port (default: 22)                          |
| `ssh.user`       | SSH username                                    |
| `ssh.key`        | Path to private key (supports `~` expansion)    |
| `ssh.passphrase` | Passphrase for encrypted keys (optional)        |
| `wpPath`         | WordPress installation path on remote server    |
| `wpCliPath`      | Custom WP-CLI path (optional, defaults to `wp`) |

**Passphrase Handling:**

For encrypted SSH keys, you can:

1. Set `STRATAWP_SSH_PASSPHRASE` environment variable (recommended for CI/CD)
2. Include `passphrase` in the config (not recommended - use env var instead)
3. Enter it when prompted

### Direct MySQL Configuration

For databases with public access (development/staging servers):

```json
{
  "environments": {
    "staging": {
      "name": "staging",
      "url": "https://staging.example.com",
      "database": {
        "host": "db.staging.example.com",
        "user": "staging_user",
        "password": "staging_pass",
        "database": "wp_staging"
      }
    }
  }
}
```

## Programmatic API

### SSHDatabaseDumper (Recommended for Production)

Export databases via SSH - works with databases that only allow local connections:

```typescript
import { SSHDatabaseDumper } from '@stratawp/sync'

const dumper = new SSHDatabaseDumper({
  ssh: {
    host: 'ssh.example.com',
    port: 22,
    username: 'deploy',
    privateKey: '~/.ssh/id_rsa',
    passphrase: process.env.SSH_PASSPHRASE, // Optional
  },
  wpPath: '/var/www/html',
  wpCliPath: 'wp', // Optional custom WP-CLI path
})

// Generate full database dump
const sql = await dumper.generateDumpSQL()

// Dump specific tables
const sql = await dumper.generateDumpSQL({
  tables: ['wp_posts', 'wp_postmeta'],
})

// Dump to file
await dumper.dumpToFile('/path/to/dump.sql')

// Test connection and WP-CLI availability
const result = await dumper.testConnection()
console.log(result.success, result.message)
```

### DatabaseDumper (Direct MySQL)

Export MySQL databases to SQL (requires direct database access):

```typescript
import { DatabaseDumper } from '@stratawp/sync'

const dumper = new DatabaseDumper({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'wordpress',
})

// Generate full database dump
const sql = await dumper.generateDumpSQL()

// Dump specific tables
const sql = await dumper.generateDumpSQL({
  tables: ['wp_posts', 'wp_postmeta'],
})

// Exclude tables
const sql = await dumper.generateDumpSQL({
  excludeTables: ['wp_sessions', 'wp_actionscheduler_logs'],
})

// Schema only (no data)
const sql = await dumper.generateDumpSQL({
  noData: true,
})
```

### DatabaseRestorer

Import SQL into MySQL with URL replacement:

```typescript
import { DatabaseRestorer } from '@stratawp/sync'

const restorer = new DatabaseRestorer({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'wordpress',
})

// Create backup before restoring
const backupPath = await restorer.createBackup()

// Restore with URL replacement
await restorer.restoreFromSQL(sql, {
  urlReplacements: [{ from: 'https://production.com', to: 'http://local.test' }],
})

// Restore from file (supports .gz)
await restorer.restoreFromFile('/path/to/dump.sql.gz', {
  urlReplacements: [{ from: 'https://production.com', to: 'http://local.test' }],
})

// Dry run (no changes made)
await restorer.restoreFromSQL(sql, {
  dryRun: true,
})
```

### UrlReplacer

Replace URLs in SQL, correctly handling PHP serialized strings:

```typescript
import { UrlReplacer } from '@stratawp/sync'

// Replace URLs (handles serialized strings)
const newSql = UrlReplacer.replace(sql, 'https://old-domain.com', 'http://new-domain.test')

// Detect URLs in SQL
const urls = UrlReplacer.detectUrls(sql)
console.log(urls)
// ['https://example.com', 'http://local.test', ...]
```

**PHP Serialized String Handling:**

WordPress stores serialized PHP data in the database. When you change a URL, the string length changes, breaking serialization. UrlReplacer correctly recalculates lengths:

```
Before: s:24:"https://old-domain.com/path"
After:  s:27:"http://new-domain.test/path"
```

### SnapshotManager

Create and manage deployment snapshots:

```typescript
import { SnapshotManager } from '@stratawp/sync'

const manager = new SnapshotManager()

// Create a snapshot
const snapshot = await manager.createSnapshot({
  environment: 'production',
  themePath: '/path/to/theme',
  databaseDump: sql,
  gitRef: 'abc123', // Optional
  gitBranch: 'main', // Optional
  themeVersion: '1.0.0', // Optional
})

// List snapshots
const snapshots = await manager.listSnapshots()
const prodSnapshots = await manager.listSnapshots('production')

// Get a specific snapshot
const snapshot = await manager.getSnapshot('2024-01-15T10-30-00-000Z_production')

// Extract theme files from snapshot
await manager.extractTheme(snapshotId, '/target/path')

// Get database dump from snapshot
const sql = await manager.getDatabaseDump(snapshotId)

// Mark as stable (prevents auto-cleanup)
await manager.markStable(snapshotId)

// Delete a snapshot
await manager.deleteSnapshot(snapshotId)
```

### DiffEngine

Compare files and SQL dumps:

```typescript
import { DiffEngine } from '@stratawp/sync'

// Compare file lists
const filesDiff = DiffEngine.compareFileLists(beforeFiles, afterFiles)
console.log(filesDiff)
// { added: ['new.php'], deleted: ['old.php'], unchanged: ['index.php'] }

// Compare SQL dumps
const sqlDiff = DiffEngine.compareSQLDumps(beforeSql, afterSql)
console.log(sqlDiff)
// {
//   tablesAdded: ['wp_new_table'],
//   tablesDeleted: [],
//   tablesModified: ['wp_posts'],
//   rowsAdded: 42,
//   rowsDeleted: 3
// }

// Format diff for display
const formatted = DiffEngine.formatDiff(filesDiff, sqlDiff)
console.log(formatted)
```

## Types

```typescript
interface DatabaseConfig {
  host: string
  port?: number
  user: string
  password: string
  database: string
}

interface UrlReplacement {
  from: string
  to: string
}

interface DumpOptions {
  tables?: string[]
  excludeTables?: string[]
  noData?: boolean
  compress?: boolean
}

interface RestoreOptions {
  tables?: string[]
  urlReplacements?: UrlReplacement[]
  dryRun?: boolean
}

interface SnapshotManifest {
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
```

## Storage

Snapshots are stored in `.stratawp-snapshots/` by default:

```
.stratawp-snapshots/
├── snapshots.json           # Index of all snapshots
├── 2024-01-15T10-30-00_production/
│   ├── manifest.json        # Snapshot metadata
│   ├── theme.tar.gz         # Compressed theme files
│   └── database.sql.gz      # Compressed database dump
└── 2024-01-14T15-00-00_production/
    └── ...
```

## Integration with Deploy

The sync package automatically integrates with `stratawp deploy`:

- **Pre-deploy snapshots**: A snapshot is created before every deployment (unless `--no-backup` is used)
- **Git information**: Current commit hash and branch are stored with each snapshot
- **Rollback capability**: Use snapshots to restore previous deployments

## License

GPL-3.0-or-later
