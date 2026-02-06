# Advanced Deployment Guide

This guide covers advanced deployment scenarios including SSH with passphrase-protected keys, WordPress FSE database template synchronization, post-deploy automation, and plugin deployment workflows.

## Table of Contents

- [SSH Deployment with Passphrase-Protected Keys](#ssh-deployment-with-passphrase-protected-keys)
- [Post-Deploy Automation](#post-deploy-automation)
- [WordPress FSE Template Sync](#wordpress-fse-template-sync)
- [Plugin Deployment](#plugin-deployment)
- [Complete Deployment Workflow](#complete-deployment-workflow)
- [Helper Scripts](#helper-scripts)
- [Troubleshooting](#troubleshooting)

---

## SSH Deployment with Passphrase-Protected Keys

### Configuration

The passphrase field supports environment variable syntax (`${VAR_NAME}`), making it secure to use in config files.

Add SSH configuration to `~/.stratawp/deploy-config.json`:

```json
{
  "version": "1.0",
  "environments": {
    "production": {
      "type": "ssh",
      "host": "ssh.example.com",
      "port": 22,
      "username": "your-username",
      "privateKey": "~/.ssh/your-key",
      "passphrase": "${STRATAWP_SSH_PASSPHRASE}",
      "remotePath": "/var/www/html/wp-content/themes/your-theme",
      "buildBefore": true,
      "backup": {
        "enabled": true,
        "keepLast": 1
      },
      "postDeploy": {
        "clearCache": true,
        "resetOpcache": true,
        "wpCliCommands": []
      },
      "rsync": {
        "enabled": true,
        "deleteOrphaned": false
      },
      "database": {
        "enabled": true,
        "localUrl": "https://yoursite.local",
        "remoteUrl": "https://yoursite.com"
      }
    }
  }
}
```

> **Security Note:** Use environment variables for the passphrase: `export STRATAWP_SSH_PASSPHRASE="your-passphrase"`. Ensure `~/.stratawp/` has proper permissions (`chmod 700`).

### Alternative: SSH Agent

For better security, load your key into ssh-agent before deployment:

```bash
# Start ssh-agent if not running
eval "$(ssh-agent -s)"

# Add your key (enter passphrase once)
ssh-add ~/.ssh/your-key

# Now deploy (no passphrase needed in config)
pnpm stratawp deploy production
```

### Testing Connection

```bash
# Test SSH connection manually
ssh -p 22 -i ~/.ssh/your-key username@ssh.example.com "echo 'Connected!'"

# Test StrataWP connection
pnpm stratawp deploy:test production
```

---

## Post-Deploy Automation

SSH deployments now include automatic post-deploy actions that run while still connected to the server.

### What Happens After File Upload

1. **WordPress Cache Flush** — Runs `wp cache flush` and `wp transient delete --all` via WP-CLI
2. **PHP OPcache Reset** — Creates and executes a temporary PHP script to invalidate OPcache
3. **Backup Cleanup** — Removes old backup folders, keeping only the most recent N (configurable)
4. **Custom WP-CLI Commands** — Runs any commands specified in `postDeploy.wpCliCommands`
5. **Validation** — Checks critical files exist, WP-CLI health check, HTTP health check

### Configuration

```json
{
  "postDeploy": {
    "clearCache": true,
    "resetOpcache": true,
    "wpCliCommands": ["wp rewrite flush"],
    "wpRootPath": "/custom/path/to/wordpress"
  },
  "backup": {
    "enabled": true,
    "keepLast": 1
  }
}
```

- **clearCache**: Run `wp cache flush` + `wp transient delete --all` (default: true)
- **resetOpcache**: Invalidate PHP OPcache (default: true)
- **wpCliCommands**: Additional WP-CLI commands to run after deployment
- **wpRootPath**: WordPress root path (auto-detected from `remotePath` if not set)
- **backup.keepLast**: Number of backups to retain (default: 1, 0 = keep all)

### Deployment Output

After a successful SSH deployment, you'll see:

```
✓ Deployment complete!

✓ Deployment Summary:
  Deployed: 42 files (1.2 MB)
  Backup: /path/to/backup-2026-02-05T10-30-00
  Duration: 8.2s

🔧 Post-Deploy Actions:
  ✓ WordPress cache flushed
  ✓ PHP OPcache reset
  ✓ Cleaned up 2 old backup(s)

✅ Validation:
  ✓ File: style.css — exists
  ✓ File: theme.json — exists
  ✓ WordPress loads — OK
  ✓ Site responds — HTTP 200

✓ Deployment successful!
```

---

## WordPress FSE Template Sync

### The Problem

WordPress Full Site Editing (FSE) stores template customizations in the **database**, not in files. When you edit templates in the WordPress Site Editor, those changes are saved to the `wp_posts` table with `post_type = 'wp_template'`.

**This means:**
- `pnpm stratawp deploy` only syncs **files** (patterns, parts, theme.json)
- Template customizations made in Site Editor are **not deployed**
- Production will use file-based templates unless database is synced

### Solution: Built-in Template Sync (Recommended)

StrataWP now includes a built-in `sync:templates` command that handles everything automatically:

```bash
# Sync all templates from local to production
stratawp sync:templates production --all

# Sync a specific template
stratawp sync:templates production --template=home

# List templates on local and remote
stratawp sync:templates:list production

# Preview without making changes
stratawp sync:templates production --all --dry-run
```

**How it works:**
1. Detects local WP-CLI (including Local by Flywheel path)
2. Exports template content from local WordPress database
3. Uploads to remote server via SCP
4. Updates remote database using `wp eval-file` (safe PHP execution)
5. Flushes WordPress caches on remote

**Options:**
- `--template=<slug>` — Sync a specific template by slug
- `--all` — Sync all templates
- `--dry-run` — Preview without making changes
- `--wp-cli=<path>` — Custom local WP-CLI path
- `--wp-path=<path>` — Custom local WordPress root path
- `--verbose` — Show debug output

### Manual Template Export/Import (Alternative)

If you prefer manual control, you can export and import templates directly:

#### Step 1: Find Template IDs

**On Local:**
```bash
# List all templates
wp post list --post_type=wp_template --fields=ID,post_title,post_name

# Example output:
# +-----+------------------+-----------------+
# | ID  | post_title       | post_name       |
# +-----+------------------+-----------------+
# | 481 | Index            | index           |
# | 482 | Single           | single          |
# | 483 | Page             | page            |
# +-----+------------------+-----------------+
```

**On Production (via SSH):**
```bash
ssh -p PORT user@host "cd /path/to/wordpress && wp post list --post_type=wp_template --fields=ID,post_title,post_name"
```

#### Step 2: Export Template Content

```bash
# Export local template to file
wp post get 481 --field=post_content > /tmp/template-index.html
```

#### Step 3: Copy to Production

```bash
# Using SCP
scp -P 22 /tmp/template-index.html user@host:/tmp/

# Or using rsync
rsync -avz -e "ssh -p 22" /tmp/template-index.html user@host:/tmp/
```

#### Step 4: Import on Production

```bash
# Update production template (replace 716 with production template ID)
ssh -p 22 user@host "cd /path/to/wordpress && wp post update 716 --post_content=\"\$(cat /tmp/template-index.html)\""

# Flush cache
ssh -p 22 user@host "cd /path/to/wordpress && wp cache flush && wp transient delete --all"
```

### Automated Template Sync Script

Create `scripts/sync-templates.sh` in your theme directory:

```bash
#!/bin/bash
# sync-templates.sh - Sync WordPress FSE templates from local to production
#
# Usage: ./scripts/sync-templates.sh <template_name>
# Example: ./scripts/sync-templates.sh index

set -e

# Configuration - Update these for your environment
LOCAL_WP_PATH="/Users/yourname/Local Sites/yoursite/app/public"
REMOTE_HOST="ssh.example.com"
REMOTE_PORT="22"
REMOTE_USER="your-username"
REMOTE_KEY="~/.ssh/your-key"
REMOTE_WP_PATH="/home/customer/www/yoursite.com/public_html"
PASSPHRASE="your-passphrase"  # Or use ssh-agent

TEMPLATE_NAME="${1:-index}"

echo "=== Template Sync: $TEMPLATE_NAME ==="

# 1. Get local template ID
echo "Finding local template ID..."
LOCAL_ID=$(cd "$LOCAL_WP_PATH" && wp post list --post_type=wp_template --post_name="$TEMPLATE_NAME" --field=ID 2>/dev/null)

if [ -z "$LOCAL_ID" ]; then
    echo "Error: Template '$TEMPLATE_NAME' not found locally"
    exit 1
fi
echo "Local template ID: $LOCAL_ID"

# 2. Export local template
echo "Exporting local template..."
cd "$LOCAL_WP_PATH"
wp post get "$LOCAL_ID" --field=post_content > /tmp/template-sync.html
echo "Exported to /tmp/template-sync.html"

# 3. Get remote template ID (using expect for passphrase)
echo "Finding remote template ID..."
REMOTE_ID=$(expect << EOF
spawn ssh -p $REMOTE_PORT -i $REMOTE_KEY $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_WP_PATH && wp post list --post_type=wp_template --post_name=$TEMPLATE_NAME --field=ID"
expect "passphrase" { send "$PASSPHRASE\r"; exp_continue }
expect eof
EOF
)
REMOTE_ID=$(echo "$REMOTE_ID" | grep -o '^[0-9]*$' | tail -1)

if [ -z "$REMOTE_ID" ]; then
    echo "Error: Template '$TEMPLATE_NAME' not found on remote"
    exit 1
fi
echo "Remote template ID: $REMOTE_ID"

# 4. Copy template to remote
echo "Copying template to remote..."
expect << EOF
spawn scp -P $REMOTE_PORT -i $REMOTE_KEY /tmp/template-sync.html $REMOTE_USER@$REMOTE_HOST:/tmp/
expect "passphrase" { send "$PASSPHRASE\r"; exp_continue }
expect eof
EOF

# 5. Update remote template
echo "Updating remote template..."
expect << EOF
spawn ssh -p $REMOTE_PORT -i $REMOTE_KEY $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_WP_PATH && wp post update $REMOTE_ID --post_content=\"\\\$(cat /tmp/template-sync.html)\""
expect "passphrase" { send "$PASSPHRASE\r"; exp_continue }
expect eof
EOF

# 6. Flush remote cache
echo "Flushing remote cache..."
expect << EOF
spawn ssh -p $REMOTE_PORT -i $REMOTE_KEY $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_WP_PATH && wp cache flush && wp transient delete --all"
expect "passphrase" { send "$PASSPHRASE\r"; exp_continue }
expect eof
EOF

echo "=== Template sync complete! ==="
```

Make it executable:
```bash
chmod +x scripts/sync-templates.sh
```

Usage:
```bash
./scripts/sync-templates.sh index    # Sync index template
./scripts/sync-templates.sh single   # Sync single template
./scripts/sync-templates.sh page     # Sync page template
```

---

## Plugin Deployment

StrataWP's deployment system focuses on themes. For custom plugins, use rsync directly.

### Basic Plugin Deployment

```bash
# From your plugin directory
cd wp-content/plugins/your-plugin

rsync -avz --delete \
  --exclude node_modules/ \
  --exclude .git/ \
  --exclude *.log \
  --exclude .DS_Store \
  -e "ssh -p 22 -i ~/.ssh/your-key" \
  . user@host:/path/to/wp-content/plugins/your-plugin/
```

### Plugin Deployment with Passphrase (using expect)

Create `scripts/deploy-plugin.sh`:

```bash
#!/bin/bash
# deploy-plugin.sh - Deploy a WordPress plugin to production
#
# Usage: ./scripts/deploy-plugin.sh <plugin-directory>
# Example: ./scripts/deploy-plugin.sh wp-content/plugins/my-plugin

set -e

# Configuration
REMOTE_HOST="ssh.example.com"
REMOTE_PORT="22"
REMOTE_USER="your-username"
REMOTE_KEY="~/.ssh/your-key"
REMOTE_WP_PATH="/home/customer/www/yoursite.com/public_html"
PASSPHRASE="your-passphrase"

PLUGIN_PATH="${1:-.}"
PLUGIN_NAME=$(basename "$PLUGIN_PATH")

echo "=== Deploying Plugin: $PLUGIN_NAME ==="

# Verify plugin exists
if [ ! -d "$PLUGIN_PATH" ]; then
    echo "Error: Plugin directory not found: $PLUGIN_PATH"
    exit 1
fi

# Deploy using expect for passphrase
expect << EOF
spawn rsync -avz --delete \
  --exclude node_modules/ \
  --exclude .git/ \
  --exclude "*.log" \
  --exclude .DS_Store \
  --exclude .turbo/ \
  --exclude src/ \
  -e "ssh -p $REMOTE_PORT -i $REMOTE_KEY" \
  $PLUGIN_PATH/ $REMOTE_USER@$REMOTE_HOST:$REMOTE_WP_PATH/wp-content/plugins/$PLUGIN_NAME/
expect "passphrase" { send "$PASSPHRASE\r"; exp_continue }
expect eof
EOF

echo "=== Plugin deployment complete! ==="

# Flush cache on production
echo "Flushing remote cache..."
expect << EOF
spawn ssh -p $REMOTE_PORT -i $REMOTE_KEY $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_WP_PATH && wp cache flush"
expect "passphrase" { send "$PASSPHRASE\r"; exp_continue }
expect eof
EOF

echo "Done!"
```

Usage:
```bash
chmod +x scripts/deploy-plugin.sh
./scripts/deploy-plugin.sh wp-content/plugins/my-custom-plugin
```

---

## Complete Deployment Workflow

For a complete local-to-production deployment including theme files, database templates, and plugins:

### Full Deployment Checklist

1. **Build and deploy theme files** (includes automatic cache flush, OPcache reset, backup cleanup, and validation)
   ```bash
   pnpm build
   pnpm stratawp deploy production
   ```

2. **Deploy custom plugins** (if any)
   ```bash
   ./scripts/deploy-plugin.sh wp-content/plugins/your-plugin
   ```

3. **Sync database templates** (if using Site Editor customizations)
   ```bash
   pnpm stratawp sync:templates production --all
   ```

4. **Verify deployment**
   - Check the site visually
   - Test block rendering
   - Verify custom blocks work

> **Note:** Steps 1 includes automatic cache flushing, OPcache invalidation, backup cleanup, and validation when using SSH deployment. No manual cache flush needed!

### One-Command Full Deploy Script

Create `scripts/full-deploy.sh`:

```bash
#!/bin/bash
# full-deploy.sh - Complete deployment: theme + plugins + templates
set -e

echo "=== Starting Full Deployment ==="

# 1. Build
echo "Building theme..."
pnpm build

# 2. Deploy theme files (auto: cache flush, OPcache, backup cleanup, validation)
echo "Deploying theme files..."
pnpm stratawp deploy production --force

# 3. Deploy plugins (add your plugins here)
# echo "Deploying plugins..."
# ./scripts/deploy-plugin.sh wp-content/plugins/your-plugin

# 4. Sync FSE templates from Site Editor
echo "Syncing database templates..."
pnpm stratawp sync:templates production --all

echo "=== Full deployment complete! ==="
```

---

## Helper Scripts

### scripts/ssh-test.sh

Test SSH connection with passphrase:

```bash
#!/bin/bash
REMOTE_HOST="ssh.example.com"
REMOTE_PORT="22"
REMOTE_USER="your-username"
REMOTE_KEY="~/.ssh/your-key"
PASSPHRASE="your-passphrase"

expect << EOF
spawn ssh -p $REMOTE_PORT -i $REMOTE_KEY $REMOTE_USER@$REMOTE_HOST "echo 'SSH Connection Successful!'"
expect "passphrase" { send "$PASSPHRASE\r"; exp_continue }
expect eof
EOF
```

### scripts/list-templates.sh

List all templates on local and remote:

```bash
#!/bin/bash
LOCAL_WP_PATH="/Users/yourname/Local Sites/yoursite/app/public"

echo "=== Local Templates ==="
cd "$LOCAL_WP_PATH" && wp post list --post_type=wp_template --fields=ID,post_title,post_name

echo ""
echo "=== Remote Templates ==="
# Add SSH command to list remote templates
```

---

## Troubleshooting

### "Encrypted private OpenSSH key detected, but no passphrase given"

**Cause:** SSH key is passphrase-protected but passphrase not provided.

**Solution:** Add `passphrase` field to your deploy config:
```json
{
  "privateKey": "~/.ssh/your-key",
  "passphrase": "your-passphrase"
}
```

Or use ssh-agent:
```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/your-key
```

### "Invalid content" in Site Editor after deployment

**Cause:** Custom blocks from plugins not deployed, or database templates not synced.

**Solutions:**
1. Deploy the plugin containing the custom block
2. Flush WordPress cache: `wp cache flush && wp transient delete --all`
3. If using Site Editor customizations, sync database templates

### Production looks different from local

**Cause:** Template customizations are stored in database, not files.

**Solution:** Sync database templates using the sync script or manually:
```bash
# Export from local
wp post get <local_id> --field=post_content > /tmp/template.html

# Import to production
wp post update <prod_id> --post_content="$(cat /tmp/template.html)"
wp cache flush
```

### rsync permission denied

**Cause:** Passphrase-protected key not loaded.

**Solution:** Use expect script (shown above) or ssh-agent.

### "Block recovery" buttons appearing

**Cause:** Block markup changed or custom blocks not registered.

**Solutions:**
1. Ensure all custom block plugins are deployed
2. Clear browser cache
3. Re-save the template in Site Editor

---

## Security Considerations

1. **Never commit credentials** - Keep `~/.stratawp/deploy-config.json` out of version control
2. **Use environment variables** where supported (password field)
3. **Restrict file permissions**: `chmod 600 ~/.stratawp/deploy-config.json`
4. **Consider ssh-agent** for passphrase management
5. **Use separate SSH keys** for deployment (not your personal key)

---

## Related Documentation

- [Getting Started with Deployment](./getting-started.md)
- [Cheat Sheet — Deployment Commands](../../CHEAT_SHEET.md#deployment)
- [Cheat Sheet — FSE Template Sync](../../CHEAT_SHEET.md#fse-template-sync)
- [Cheat Sheet — Database Sync](../../CHEAT_SHEET.md#database-sync)
- [Cheat Sheet — Rollback & Snapshots](../../CHEAT_SHEET.md#rollback--snapshots)
