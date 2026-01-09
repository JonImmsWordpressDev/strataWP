# StrataWP v1.0.0 Release Notes 🚀

**Release Date:** January 9, 2026

We're thrilled to announce **StrataWP v1.0.0** - the first production-ready release! This major milestone introduces comprehensive deployment capabilities, making StrataWP a complete solution for modern WordPress theme development from local development to production deployment.

## 🎉 What's New

### Production Deployment System

StrataWP 1.0 introduces a powerful, battle-tested deployment system that makes deploying WordPress themes effortless.

#### Key Features

- **One-Command Deployment** - Deploy to production with `pnpm stratawp deploy production`
- **Interactive Setup Wizard** - Configure deployment in minutes with guided prompts
- **Multiple Hosting Support**
  - ✅ SFTP (Secure FTP) - Ideal for shared hosting
  - ✅ FTP - Standard file transfer
  - 🔜 SSH/rsync - Coming in Phase 2
  - 🔜 Git-based - Coming in Phase 2
- **Smart File Filtering** - Automatically excludes development files (node_modules, src/, etc.)
- **Change Detection** - Only uploads modified files for faster deployments
- **Automatic Backups** - Creates backups before each deployment for safe rollbacks
- **Environment Management** - Support for multiple environments (production, staging, development)
- **Secure Credentials** - Environment variable support keeps passwords out of git
- **Database Migration** - URL replacement for local → production migrations
- **Progress Tracking** - Real-time upload progress with detailed summaries

#### New Commands

```bash
stratawp deploy:setup              # Interactive deployment configuration
stratawp deploy <environment>      # Deploy to an environment
stratawp deploy:list               # List configured environments
stratawp deploy:test <environment> # Test connection without deploying
```

#### Deployment Options

```bash
--dry-run      # Preview what would be deployed without deploying
--no-build     # Skip the build step
--force        # Deploy without confirmation prompt
--no-backup    # Skip creating a backup
```

### What Gets Deployed

**Included:**
- ✅ `dist/` - Built JavaScript and CSS
- ✅ `*.php` - All PHP theme files
- ✅ `theme.json`, `style.css` - Theme configuration
- ✅ `templates/`, `parts/`, `patterns/` - FSE templates
- ✅ `vendor/` - PHP dependencies
- ✅ `assets/` - Images and static files

**Excluded:**
- ❌ `node_modules/` - Node.js dependencies
- ❌ `src/` - Source TypeScript files
- ❌ `.git/` - Git repository
- ❌ Build configuration files
- ❌ `.env` files and development files

### Configuration

**Global Configuration:** `~/.stratawp/deploy-config.json`
- Stores all deployment environments
- Can be shared across multiple projects

**Project Configuration:** `.stratawp-deploy.json`
- Project-specific overrides
- Kept out of git for security

**Environment Variables:** `.env` file
- Secure credential storage
- Variable substitution with `${VAR_NAME}` syntax

**Custom Exclusions:** `.deployignore`
- Similar to .gitignore
- Customize what gets deployed

### Security Features

- **SFTP Support** - Encrypted file transfer (recommended)
- **Environment Variables** - Keep credentials out of version control
- **Connection Testing** - Verify connection before deployment
- **Automatic .gitignore** - Deployment configs excluded from git

## 📦 Installation

### New Projects

```bash
npx create-stratawp my-theme
cd my-theme
pnpm stratawp deploy:setup
```

### Existing Projects

```bash
# Update strataWP
pnpm install @stratawp/cli@latest

# Configure deployment
pnpm stratawp deploy:setup

# Deploy
pnpm stratawp deploy production
```

## 🚀 Quick Start

1. **Configure Deployment:**
   ```bash
   pnpm stratawp deploy:setup
   ```

2. **Deploy to Production:**
   ```bash
   pnpm stratawp deploy production
   ```

That's it! StrataWP handles the build, file filtering, upload, and backup automatically.

## 📚 Documentation

- [Deployment Getting Started Guide](./docs/deployment/getting-started.md)
- [Main README](./README.md)
- [Getting Started Guide](./GETTING_STARTED.md)

## 🔧 Technical Details

### Architecture

The deployment system is built with:
- **Modular Design** - Base deployer interface with adapter pattern
- **Type-Safe** - Full TypeScript support throughout
- **Extensible** - Easy to add new deployment methods
- **Tested** - Production-ready with error handling

### New Packages

- `basic-ftp@^5.0.5` - FTP client
- `ssh2-sftp-client@^10.0.3` - SFTP client
- `node-ssh@^13.1.0` - SSH operations
- `simple-git@^3.22.0` - Git operations
- `minimatch@^9.0.3` - File pattern matching
- `p-limit@^5.0.0` - Concurrency control
- `dotenv@^16.4.5` - Environment variables

### Files Added

```
packages/cli/
├── src/
│   ├── utils/
│   │   ├── deploy-config.ts       # Configuration management
│   │   ├── file-filter.ts         # File filtering
│   │   └── manifest.ts            # Deployment history
│   ├── deployers/
│   │   ├── base.ts                # Base deployer interface
│   │   └── ftp.ts                 # FTP/SFTP implementation
│   └── commands/deploy/
│       ├── setup.ts               # Setup wizard
│       └── index.ts               # Deploy commands
└── templates/deploy/
    └── .deployignore.template     # Default ignore patterns
```

## 🔮 What's Next

### Phase 2 (Coming Soon)
- SSH/rsync deployer for VPS/cloud servers
- Git-based deployer for WP Engine, Flywheel
- Full database migration with WP-CLI integration
- Rollback command for quick recovery
- Post-deploy hooks and scripts

### Phase 3 (Future)
- GitHub Actions templates for CI/CD
- Multi-server deployments
- Blue-green deployment strategy
- Health checks and automatic rollback
- Deployment notifications (Slack, Discord)

## 🙏 Acknowledgments

Thank you to everyone who has contributed to StrataWP and provided feedback. This 1.0 release represents months of development and is ready for production use.

## 🐛 Bug Reports

Found a bug? Please report it on [GitHub Issues](https://github.com/JonImmsWordpressDev/strataWP/issues).

## 💬 Community

- **GitHub**: [github.com/JonImmsWordpressDev/strataWP](https://github.com/JonImmsWordpressDev/strataWP)
- **Issues**: [Report bugs and request features](https://github.com/JonImmsWordpressDev/strataWP/issues)

## 📄 License

StrataWP is open source software licensed under GPL v3.

---

**Happy Deploying! 🚀**

The StrataWP Team
