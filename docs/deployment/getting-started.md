# Getting Started with StrataWP Deployment

StrataWP includes a powerful deployment system that makes it easy to deploy your WordPress themes from local development to production servers.

## Quick Start

### 1. Configure Your Deployment Environment

Run the interactive setup wizard from your theme directory:

```bash
cd /path/to/your-theme
pnpm stratawp deploy:setup
```

The wizard will guide you through:
- Choosing an environment name (production, staging, etc.)
- Selecting deployment type (FTP, SFTP, SSH, or Git)
- Entering connection details (host, port, username, password)
- Configuring build and database migration settings

### 2. Deploy Your Theme

Once configured, deploy with a single command:

```bash
pnpm stratawp deploy production
```

That's it! StrataWP will:
- Build your theme automatically
- Upload only the necessary files
- Create a backup on the remote server
- Show you a detailed deployment summary

## Deployment Types

### SFTP (Recommended for Shared Hosting)

SFTP provides secure, encrypted file transfer and is perfect for shared hosting environments like cPanel, Plesk, etc.

**Example Configuration:**
```bash
Environment: production
Type: SFTP
Host: ftp.example.com
Port: 22
Username: your-username
Remote Path: /public_html/wp-content/themes/my-theme
```

### FTP (Basic File Transfer)

Standard FTP is less secure but widely supported. Use SFTP when possible.

### SSH/rsync (VPS/Cloud Servers)

Coming soon in Phase 2. Ideal for VPS and cloud servers with SSH access.

### Git (Managed WordPress Hosting)

Coming soon in Phase 2. Perfect for WP Engine, Flywheel, and other managed hosts with Git deployment.

## What Gets Deployed

### Included Files ✅
- `dist/` - Built JavaScript and CSS
- `*.php` - All PHP files (functions.php, templates, etc.)
- `theme.json` - Block theme configuration
- `style.css` - Theme stylesheet
- `templates/`, `parts/`, `patterns/` - FSE templates
- `vendor/` - PHP dependencies
- `assets/` - Images and other static assets

### Excluded Files ❌
- `node_modules/` - Node.js dependencies
- `src/` - Source TypeScript/JavaScript files
- `.git/` - Git repository
- `package.json`, `tsconfig.json`, `vite.config.ts` - Build configs
- `.env` files and logs
- Development and IDE files

You can customize what gets deployed using a `.deployignore` file (similar to `.gitignore`).

## Environment Variables (Recommended)

For security, store credentials in environment variables rather than config files:

**Create a `.env` file:**
```env
STRATAWP_DEPLOY_PROD_PASSWORD=your_secure_password
STRATAWP_DEPLOY_LOCAL_URL=http://localhost:8888
STRATAWP_DEPLOY_REMOTE_URL=https://example.com
```

**Reference in config using `${VAR_NAME}` syntax:**
```json
{
  "password": "${STRATAWP_DEPLOY_PROD_PASSWORD}"
}
```

**Important:** Add `.env` to your `.gitignore` to keep credentials out of version control!

## Command Reference

### Setup and Configuration

```bash
# Interactive setup wizard
pnpm stratawp deploy:setup

# List configured environments
pnpm stratawp deploy:list

# Test connection without deploying
pnpm stratawp deploy:test production
```

### Deployment

```bash
# Deploy to an environment
pnpm stratawp deploy production

# Deploy without building first
pnpm stratawp deploy production --no-build

# Dry run (see what would be deployed)
pnpm stratawp deploy production --dry-run

# Deploy without confirmation prompt
pnpm stratawp deploy production --force

# Deploy without creating a backup
pnpm stratawp deploy production --no-backup
```

## Configuration Files

### Global Configuration
Located at: `~/.stratawp/deploy-config.json`

Contains all your deployment environments and can be shared across projects.

### Project-Specific Configuration
Located at: `.stratawp-deploy.json` (in your theme directory)

Overrides global configuration for project-specific settings.

### Example Configuration

```json
{
  "version": "1.0",
  "environments": {
    "production": {
      "type": "sftp",
      "host": "ftp.example.com",
      "port": 22,
      "username": "username",
      "password": "${STRATAWP_DEPLOY_PROD_PASSWORD}",
      "remotePath": "/public_html/wp-content/themes/my-theme",
      "buildBefore": true,
      "database": {
        "enabled": true,
        "localUrl": "http://localhost:8888",
        "remoteUrl": "https://example.com"
      }
    },
    "staging": {
      "type": "sftp",
      "host": "staging.example.com",
      "port": 22,
      "username": "username",
      "password": "${STRATAWP_DEPLOY_STAGING_PASSWORD}",
      "remotePath": "/var/www/html/wp-content/themes/my-theme",
      "buildBefore": true
    }
  }
}
```

## Database Migration

When deploying from local to production, WordPress stores the site URL in the database. StrataWP can handle URL replacement automatically.

**Enable in setup wizard or config:**
```json
{
  "database": {
    "enabled": true,
    "localUrl": "http://localhost:8888",
    "remoteUrl": "https://example.com"
  }
}
```

**Note:** Full database migration with WP-CLI integration is coming in Phase 2.

## Deployment Workflow

1. **Develop locally** - Work on your theme with hot reload
2. **Build** - StrataWP builds your theme automatically
3. **Deploy** - Upload to production with one command
4. **Verify** - Check your live site

## Troubleshooting

### Deploy Commands Not Found

If you get an error like `unknown command 'deploy'`, the CLI needs to be updated:

```bash
# From the StrataWP repository root
cd packages/cli

# Build the updated CLI
pnpm build

# Install globally
npm install -g .

# Verify deploy commands are now available
stratawp --help
```

**Why this happens:** After pulling the latest code from the repository, your globally installed `stratawp` command still points to the old build. You need to rebuild and reinstall to use new features.

### Connection Failed

- Verify your host, port, and credentials
- Check if SFTP is enabled on your server
- Try using port 21 for FTP or 22 for SFTP
- Contact your hosting provider if issues persist

### Build Failed

- Ensure you have a valid `vite.config.ts` in your theme
- Check that all dependencies are installed (`pnpm install`)
- Verify your build command works: `pnpm build`

### Permission Denied

- Check that your FTP user has write permissions
- Verify the remote path exists
- Some hosts require specific directory permissions

### Files Not Deploying

- Check your `.deployignore` file
- Ensure files exist in your build output (`dist/`)
- Use `--dry-run` to see what would be deployed

## Next Steps

- Learn about [deployment configuration](./configuration.md)
- Set up [GitHub Actions for CI/CD](./github-actions.md)
- Read about [shared hosting specifics](./hosting-providers/shared-hosting.md)

## Need Help?

- [GitHub Issues](https://github.com/JonImmsWordpressDev/strataWP/issues)
- [Documentation](https://github.com/JonImmsWordpressDev/strataWP)
