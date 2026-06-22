# StrataWP Production Suite Design

**Date:** 2026-01-26
**Status:** Draft
**Author:** Jon Imms + Claude

## Overview

The Production Suite extends StrataWP with comprehensive production operations tooling: monitoring, rollbacks, environment sync, and performance tracking. It builds on the existing deployment system to provide a complete production-grade workflow.

## Goals

1. **Self-hosted first** - Works out of the box without external dependencies
2. **Optional integrations** - Connect to third-party services when needed
3. **Full state management** - Track and restore theme files, database, and configuration
4. **Actionable insights** - Performance data that helps identify and fix issues

## Non-Goals

- Replacing WordPress hosting (this is tooling, not infrastructure)
- Real-time log streaming (focus on metrics and snapshots)
- Multi-site management (future phase)

---

## Package Structure

```
packages/
├── monitor/                    # @stratawp/monitor
│   ├── src/
│   │   ├── collectors/
│   │   │   ├── rum.ts              # Real User Monitoring script
│   │   │   ├── synthetic.ts        # Lighthouse/scheduled tests
│   │   │   ├── wordpress.ts        # PHP metrics collection
│   │   │   └── uptime.ts           # HTTP health checks
│   │   ├── dashboard/
│   │   │   ├── server.ts           # Express server
│   │   │   ├── api/                # Dashboard REST API
│   │   │   └── ui/                 # React dashboard app
│   │   ├── integrations/
│   │   │   ├── sentry.ts
│   │   │   ├── slack.ts
│   │   │   ├── uptimerobot.ts
│   │   │   └── index.ts
│   │   ├── alerts/
│   │   │   ├── engine.ts           # Threshold evaluation
│   │   │   └── notifiers.ts        # Alert delivery
│   │   └── php/
│   │       └── stratawp-monitor/   # WordPress plugin
│   │           ├── stratawp-monitor.php
│   │           ├── includes/
│   │           │   ├── class-collector.php
│   │           │   ├── class-database.php
│   │           │   └── class-rest-api.php
│   │           └── assets/
│   │               └── rum.min.js
│   └── package.json
│
├── sync/                       # @stratawp/sync
│   ├── src/
│   │   ├── database/
│   │   │   ├── dump.ts             # Export database
│   │   │   ├── restore.ts          # Import database
│   │   │   ├── url-replace.ts      # Search/replace with serialization support
│   │   │   └── selective.ts        # Table-level operations
│   │   ├── media/
│   │   │   ├── sync.ts             # Upload folder sync
│   │   │   ├── cloud/
│   │   │   │   ├── s3.ts
│   │   │   │   ├── r2.ts
│   │   │   │   └── spaces.ts
│   │   │   └── delta.ts            # Change detection
│   │   ├── config/
│   │   │   ├── export.ts           # Settings → files
│   │   │   ├── import.ts           # Files → settings
│   │   │   └── schemas.ts          # Config file definitions
│   │   ├── snapshots/
│   │   │   ├── create.ts           # Capture full state
│   │   │   ├── restore.ts          # Apply snapshot
│   │   │   ├── storage.ts          # Local/remote storage
│   │   │   └── index.ts            # SQLite index management
│   │   └── diff/
│   │       ├── files.ts            # File comparison
│   │       ├── database.ts         # Table/row comparison
│   │       └── renderer.ts         # CLI diff output
│   └── package.json
│
└── cli/                        # Existing - extended
    └── src/commands/
        ├── monitor.ts              # stratawp monitor:*
        ├── sync.ts                 # stratawp sync:*
        ├── rollback.ts             # stratawp rollback:*
        └── perf.ts                 # stratawp perf:*
```

---

## Monitoring System

### Data Collection Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Visitor     │────▶│ RUM Script   │────▶│ WordPress DB    │
│ (browser)   │     │ (Core Vitals)│     │ (wp_strata_*)   │
└─────────────┘     └──────────────┘     └─────────────────┘
                                                  │
┌─────────────┐     ┌──────────────┐              │
│ WP Runtime  │────▶│ PHP Agent    │──────────────┤
│ (queries,   │     │ (hooks,      │              │
│  memory)    │     │  timing)     │              ▼
└─────────────┘     └──────────────┘     ┌─────────────────┐
                                         │ Local Dashboard │
┌─────────────┐     ┌──────────────┐     │ (localhost:4200)│
│ Cron/CLI    │────▶│ Lighthouse   │────▶│                 │
│ (scheduled) │     │ Synthetic    │     └─────────────────┘
└─────────────┘     └──────────────┘              │
                                                  ▼ (optional)
                                         ┌─────────────────┐
                                         │ Third-party     │
                                         │ (Sentry, etc.)  │
                                         └─────────────────┘
```

### Metrics Collected

| Category        | Metrics                                                           |
| --------------- | ----------------------------------------------------------------- |
| Core Web Vitals | LCP, FID, CLS, INP, TTFB                                          |
| WordPress       | Query count/time, memory peak, active hooks, slow queries (>50ms) |
| Assets          | JS/CSS size, render-blocking resources, unused code percentage    |
| Errors          | PHP errors/warnings, JS exceptions, failed REST API calls         |
| Uptime          | Response time, HTTP status codes, SSL certificate expiry          |

### Database Schema

```sql
-- Core metrics table (partitioned by date for pruning)
CREATE TABLE wp_strata_metrics (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    metric_type VARCHAR(50) NOT NULL,      -- 'rum', 'wordpress', 'synthetic', 'uptime'
    metric_name VARCHAR(100) NOT NULL,     -- 'lcp', 'query_count', etc.
    metric_value DECIMAL(10,3) NOT NULL,
    page_url VARCHAR(500),
    page_template VARCHAR(100),
    device_type VARCHAR(20),               -- 'mobile', 'tablet', 'desktop'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type_created (metric_type, created_at),
    INDEX idx_name_created (metric_name, created_at)
);

-- Error log
CREATE TABLE wp_strata_errors (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    error_type VARCHAR(50) NOT NULL,       -- 'php', 'javascript', 'rest'
    error_message TEXT NOT NULL,
    error_file VARCHAR(500),
    error_line INT,
    error_context TEXT,                    -- JSON: stack trace, request data
    occurrence_count INT DEFAULT 1,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    INDEX idx_type_last (error_type, last_seen)
);

-- Lighthouse reports
CREATE TABLE wp_strata_lighthouse (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    url VARCHAR(500) NOT NULL,
    device VARCHAR(20) NOT NULL,           -- 'mobile', 'desktop'
    performance_score INT,
    accessibility_score INT,
    best_practices_score INT,
    seo_score INT,
    lcp_ms INT,
    fid_ms INT,
    cls DECIMAL(5,3),
    ttfb_ms INT,
    full_report JSON,                      -- Complete Lighthouse JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_url_created (url, created_at)
);
```

### RUM Script

Lightweight (~2KB gzipped) script injected in production:

```javascript
// rum.min.js (source version)
;(function () {
  const endpoint = window.__STRATA_RUM_ENDPOINT__
  const beacon = (data) => {
    navigator.sendBeacon(
      endpoint,
      JSON.stringify({
        ...data,
        url: location.pathname,
        template: document.body.dataset.template,
        device:
          window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
        connection: navigator.connection?.effectiveType,
        timestamp: Date.now(),
      })
    )
  }

  // Core Web Vitals via web-vitals library (inlined)
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'largest-contentful-paint') {
        beacon({ metric: 'lcp', value: entry.startTime })
      }
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true })

  // ... FID, CLS, INP, TTFB collection
})()
```

### Dashboard UI

React-based dashboard served by CLI:

```bash
stratawp monitor                    # Launch at localhost:4200
stratawp monitor --port 4500        # Custom port
stratawp monitor:status             # CLI summary without UI
```

Dashboard sections:

- **Overview**: Health score, key metrics, alerts
- **Vitals**: Core Web Vitals trends with device breakdown
- **WordPress**: Query times, memory, slow hooks, plugin impact
- **Errors**: Grouped errors with occurrence count, resolution tracking
- **Lighthouse**: Historical audit scores, trend visualization
- **Alerts**: Configuration and history

### Third-Party Integrations

Configuration via interactive CLI:

```bash
stratawp monitor:connect sentry
stratawp monitor:connect slack
stratawp monitor:connect uptimerobot
stratawp monitor:disconnect sentry
```

Stored in `.stratawp-monitor.json`:

```json
{
  "retention": {
    "metrics": 30,
    "errors": 90,
    "lighthouse": 90
  },
  "rum": {
    "enabled": true,
    "sampleRate": 1.0
  },
  "integrations": {
    "sentry": {
      "dsn": "${SENTRY_DSN}",
      "environment": "production"
    },
    "slack": {
      "webhook": "${SLACK_WEBHOOK}",
      "channel": "#alerts"
    }
  },
  "alerts": {
    "errorThreshold": {
      "count": 10,
      "period": "1h"
    },
    "uptimeThreshold": 99.5,
    "vitals": {
      "lcp": 2500,
      "fid": 100,
      "cls": 0.1
    }
  }
}
```

---

## Rollback & Versioning System

### Snapshot Architecture

Every deployment creates a snapshot automatically:

```
.stratawp-snapshots/
├── 2026-01-26T14-30-00_production/
│   ├── manifest.json              # Metadata
│   ├── theme.tar.gz               # Theme files
│   ├── database.sql.gz            # Full DB dump
│   ├── options.json               # wp_options subset
│   └── diff-from-previous.json    # Changes from last deploy
│
├── 2026-01-25T09-15-00_production/
│   └── ...
│
└── snapshots.db                   # SQLite index
```

### Manifest Schema

```json
{
  "id": "2026-01-26T14-30-00_production",
  "environment": "production",
  "created_at": "2026-01-26T14:30:00Z",
  "git_ref": "abc123f",
  "git_branch": "main",
  "theme_version": "1.2.0",
  "wordpress_version": "6.4.2",
  "php_version": "8.2.0",
  "files": {
    "count": 234,
    "size_bytes": 12400000,
    "hash": "sha256:..."
  },
  "database": {
    "tables": 45,
    "size_bytes": 8500000,
    "hash": "sha256:..."
  },
  "status": "current",
  "previous_snapshot": "2026-01-25T09-15-00_production"
}
```

### CLI Commands

```bash
# View deployment history
stratawp rollback:list
┌────┬─────────────────────┬────────────┬──────────┬───────────┐
│ #  │ Date                │ Env        │ Size     │ Status    │
├────┼─────────────────────┼────────────┼──────────┼───────────┤
│ 1  │ 2026-01-26 14:30    │ production │ 12.4 MB  │ current   │
│ 2  │ 2026-01-25 09:15    │ production │ 12.1 MB  │ stable    │
│ 3  │ 2026-01-23 16:45    │ production │ 11.8 MB  │           │
└────┴─────────────────────┴────────────┴──────────┴───────────┘

# View changes between versions
stratawp rollback:diff 1 2
┌─────────────────────────────────┬────────────┐
│ File                            │ Change     │
├─────────────────────────────────┼────────────┤
│ dist/main.css                   │ modified   │
│ templates/single.html           │ modified   │
│ inc/Components/NewFeature.php   │ added      │
│ patterns/old-hero.php           │ deleted    │
└─────────────────────────────────┴────────────┘
+ 3 database tables changed (wp_options, wp_posts, wp_postmeta)

# Restore operations
stratawp rollback 2                    # Full restore
stratawp rollback 2 --only=theme       # Theme files only
stratawp rollback 2 --only=database    # Database only
stratawp rollback 2 --only=options     # wp_options only
stratawp rollback 2 --dry-run          # Preview changes

# Management
stratawp rollback:mark-stable 2        # Flag known-good state
stratawp rollback:prune --keep=10      # Remove old snapshots
```

### Safety Features

1. **Pre-rollback snapshot**: Creates snapshot of current state before any restore
2. **Dry-run mode**: Preview all changes without applying
3. **Confirmation prompts**: Summary of changes with explicit confirmation
4. **Database backup**: Always backs up database before restore
5. **Selective restore**: Choose specific components to roll back

### Integration with Deploy

Existing `stratawp deploy` command gains automatic snapshot creation:

```bash
stratawp deploy production

# Output:
✓ Building theme...
✓ Creating pre-deploy snapshot (#12)...
✓ Uploading 23 changed files...
✓ Deployment complete!

  Snapshot saved. To rollback: stratawp rollback 11
  View deployment: stratawp rollback:diff 11 12
```

---

## Environment Sync

### Command Overview

```bash
# Database
stratawp sync:db pull production           # Pull to local
stratawp sync:db push staging              # Push to remote
stratawp sync:db pull production --tables=wp_posts,wp_postmeta

# Media
stratawp sync:media pull production        # Download uploads
stratawp sync:media push staging           # Upload local media
stratawp sync:media pull production --since="2026-01-01"
stratawp sync:media copy production staging # Cloud-to-cloud

# Configuration
stratawp sync:config export                # Export to files
stratawp sync:config import                # Import from files
stratawp sync:config pull production       # Pull remote config

# Full clone
stratawp sync:clone production local       # Complete clone
stratawp sync:clone production staging --no-media
```

### URL Replacement Engine

Intelligent search/replace that handles:

- Serialized PHP data (safe unserialize/reserialize)
- JSON encoded URLs in post content
- Gutenberg block attributes
- Escaped URLs in various formats

```bash
stratawp sync:db pull production

# Detected URLs to replace:
#   https://mysite.com → http://mysite.local
#   https://mysite.com/wp-content → http://mysite.local/wp-content
#
# Also handling:
#   - 1,234 serialized strings
#   - 567 JSON encoded values
#   - 89 Gutenberg blocks
#
# Proceed? [Y/n]
```

### Environment Configuration

`.stratawp-sync.json`:

```json
{
  "environments": {
    "local": {
      "url": "http://mysite.local",
      "ssh": null,
      "database": {
        "host": "localhost",
        "name": "wordpress",
        "user": "root",
        "password": "${LOCAL_DB_PASSWORD}"
      },
      "paths": {
        "wordpress": "/Users/me/Sites/mysite",
        "uploads": "/Users/me/Sites/mysite/wp-content/uploads"
      }
    },
    "staging": {
      "url": "https://staging.mysite.com",
      "ssh": "user@staging.mysite.com",
      "database": {
        "host": "localhost",
        "name": "staging_wp",
        "user": "staging",
        "password": "${STAGING_DB_PASSWORD}"
      },
      "paths": {
        "wordpress": "/var/www/staging",
        "uploads": "/var/www/staging/wp-content/uploads"
      }
    },
    "production": {
      "url": "https://mysite.com",
      "ssh": "user@mysite.com",
      "database": {
        "host": "localhost",
        "name": "production_wp",
        "user": "production",
        "password": "${PRODUCTION_DB_PASSWORD}"
      },
      "paths": {
        "wordpress": "/var/www/html",
        "uploads": "/var/www/html/wp-content/uploads"
      }
    }
  },
  "cloud": {
    "provider": "s3",
    "bucket": "mysite-media",
    "region": "us-east-1",
    "accessKey": "${AWS_ACCESS_KEY}",
    "secretKey": "${AWS_SECRET_KEY}"
  }
}
```

### Media Sync with Cloud Storage

Optional cloud storage for efficient media sync:

```bash
stratawp sync:media:setup

? Select storage provider:
  › Amazon S3
    Cloudflare R2
    DigitalOcean Spaces
    Local only (no cloud backup)
```

Benefits:

- **Cloud-to-cloud copy**: No local download needed for staging↔production
- **Delta sync**: Only changed files transferred
- **Backup**: Automatic cloud backup of media library

### Config Export Structure

```
.stratawp-config/
├── theme-settings.json      # Customizer values
├── theme-mods.json          # Theme modifications
├── block-patterns.json      # Registered patterns
├── reusable-blocks.json     # wp_block post type content
├── navigation.json          # Nav menus structure
├── widgets.json             # Widget areas & configuration
└── options.json             # Selected wp_options
```

Version-controllable, environment-independent configuration files.

---

## Performance Tracking

### Real User Monitoring (RUM)

Lightweight script (~2KB gzipped) auto-injected in production:

```php
// WordPress plugin auto-injection
add_action('wp_footer', function() {
    if (stratawp_rum_enabled()) {
        $endpoint = rest_url('stratawp-monitor/v1/rum');
        echo '<script>window.__STRATA_RUM_ENDPOINT__="' . esc_url($endpoint) . '";</script>';
        echo '<script src="' . STRATAWP_MONITOR_URL . '/rum.min.js" defer></script>';
    }
});
```

Data captured:

- Core Web Vitals (LCP, FID/INP, CLS, TTFB)
- Device type, viewport, connection speed
- Page template, post type, taxonomies
- Browser, OS (for debugging)

### Synthetic Monitoring with Lighthouse

```bash
# One-off audits
stratawp perf:audit https://mysite.com
stratawp perf:audit https://mysite.com/shop --device=mobile
stratawp perf:audit https://mysite.com --format=html --output=report.html

# Scheduled audits
stratawp perf:schedule https://mysite.com --every=6h
stratawp perf:schedule https://mysite.com/shop --every=12h --device=mobile
stratawp perf:schedule:list
stratawp perf:schedule:remove 1
```

Lighthouse runs via Puppeteer/Chrome headless, results stored in database.

### Build-Time Performance Budgets

`.stratawp-perf.json`:

```json
{
  "budgets": {
    "javascript": {
      "max": "150kb",
      "warn": "120kb"
    },
    "css": {
      "max": "50kb",
      "warn": "40kb"
    },
    "images": {
      "max": "500kb",
      "warn": "400kb"
    },
    "total": {
      "max": "800kb",
      "warn": "650kb"
    },
    "lighthouse": {
      "performance": { "min": 90, "warn": 95 },
      "accessibility": { "min": 90 },
      "bestPractices": { "min": 90 },
      "seo": { "min": 90 }
    }
  },
  "auditOnBuild": true,
  "failOnBudgetExceeded": false
}
```

Build output:

```bash
pnpm build

✓ Built in 1.2s
✓ JavaScript: 98kb (budget: 150kb)
✓ CSS: 32kb (budget: 50kb)
⚠ Images: 420kb (warn: 400kb, budget: 500kb)

Running Lighthouse audit...
✓ Performance: 94 (min: 90)
✓ Accessibility: 100 (min: 90)
✓ Best Practices: 95 (min: 90)
✓ SEO: 92 (min: 90)
```

### WordPress-Specific Metrics

Dashboard tab for WordPress internals:

- **Database queries**: Count, total time, slow queries (>50ms)
- **Memory usage**: Peak, average, limit
- **Hook execution**: Slowest hooks with timing
- **Plugin impact**: Per-plugin query count and time added (experimental)

PHP agent collects via:

```php
// Hooks into WordPress lifecycle
add_action('shutdown', function() {
    global $wpdb;

    $metrics = [
        'query_count' => $wpdb->num_queries,
        'query_time' => array_sum(array_column($wpdb->queries, 1)),
        'memory_peak' => memory_get_peak_usage(true),
        'hooks_fired' => count($GLOBALS['wp_actions']),
    ];

    // Store in database for dashboard
    StrataWP_Monitor::record_metrics($metrics);
});
```

---

## CLI Command Reference

```bash
# ─────────────────────────────────────────────────────────────────
# MONITORING
# ─────────────────────────────────────────────────────────────────
stratawp monitor                       # Launch dashboard UI
stratawp monitor --port 4500           # Custom port
stratawp monitor:status                # CLI health summary
stratawp monitor:connect <service>     # Setup integration (sentry, slack, uptimerobot)
stratawp monitor:disconnect <service>  # Remove integration
stratawp monitor:alerts                # View/configure thresholds
stratawp monitor:export                # Export data (JSON/CSV)
stratawp monitor:prune                 # Clean old data per retention policy

# ─────────────────────────────────────────────────────────────────
# ROLLBACK & SNAPSHOTS
# ─────────────────────────────────────────────────────────────────
stratawp rollback:list                 # View deployment history
stratawp rollback:diff <a> <b>         # Compare snapshots
stratawp rollback <id>                 # Full restore
stratawp rollback <id> --only=theme    # Theme files only
stratawp rollback <id> --only=database # Database only
stratawp rollback <id> --only=options  # wp_options only
stratawp rollback <id> --dry-run       # Preview changes
stratawp rollback:mark-stable <id>     # Flag known-good state
stratawp rollback:prune --keep=10      # Remove old snapshots

# ─────────────────────────────────────────────────────────────────
# ENVIRONMENT SYNC
# ─────────────────────────────────────────────────────────────────
stratawp sync:db pull <env>            # Pull database
stratawp sync:db push <env>            # Push database
stratawp sync:db pull <env> --tables=  # Selective tables
stratawp sync:media pull <env>         # Pull uploads
stratawp sync:media push <env>         # Push uploads
stratawp sync:media pull <env> --since # Recent files only
stratawp sync:media copy <from> <to>   # Cloud-to-cloud
stratawp sync:media:setup              # Configure cloud storage
stratawp sync:config export            # Export settings to files
stratawp sync:config import            # Import from files
stratawp sync:config pull <env>        # Pull remote config
stratawp sync:clone <from> <to>        # Full environment clone
stratawp sync:clone <from> <to> --no-media

# ─────────────────────────────────────────────────────────────────
# PERFORMANCE
# ─────────────────────────────────────────────────────────────────
stratawp perf:audit <url>              # Run Lighthouse
stratawp perf:audit <url> --device=    # mobile/desktop
stratawp perf:audit <url> --format=    # html/json
stratawp perf:schedule <url> --every=  # Setup recurring
stratawp perf:schedule:list            # View scheduled
stratawp perf:schedule:remove <id>     # Remove schedule
stratawp perf:budget                   # Check against budgets
stratawp perf:report                   # Generate report
```

---

## Configuration Files

```
project/
├── .stratawp-deploy.json      # Existing - deployment config
├── .stratawp-monitor.json     # Monitoring, alerts, integrations
├── .stratawp-perf.json        # Performance budgets
├── .stratawp-sync.json        # Environment definitions
├── .stratawp-snapshots/       # Local snapshot storage
│   ├── */                     # Individual snapshots
│   └── snapshots.db           # SQLite index
└── .stratawp-config/          # Exportable settings
    ├── theme-settings.json
    ├── theme-mods.json
    ├── block-patterns.json
    ├── reusable-blocks.json
    ├── navigation.json
    └── widgets.json
```

---

## Dependencies

### @stratawp/monitor

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "ws": "^8.16.0",
    "better-sqlite3": "^9.4.0",
    "lighthouse": "^11.0.0",
    "puppeteer-core": "^22.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.12.0",
    "@tanstack/react-query": "^5.0.0"
  }
}
```

### @stratawp/sync

```json
{
  "dependencies": {
    "ssh2": "^1.15.0",
    "mysql2": "^3.9.0",
    "@aws-sdk/client-s3": "^3.500.0",
    "tar": "^6.2.0",
    "better-sqlite3": "^9.4.0",
    "php-serialize": "^5.0.0"
  }
}
```

---

## Implementation Phases

### Phase 1: Foundation (Sync Package)

- Database dump/restore with URL replacement
- Snapshot creation and storage
- Basic rollback:list and rollback commands
- Integration with existing deploy command

### Phase 2: Environment Management

- Full environment sync (db + media + config)
- Cloud storage integration (S3, R2)
- Config export/import
- Environment cloning

### Phase 3: Monitoring Core

- WordPress PHP plugin for metrics collection
- RUM script and beacon endpoint
- Local SQLite storage for metrics
- CLI status command

### Phase 4: Dashboard & Lighthouse

- React dashboard UI
- Lighthouse integration
- Scheduled synthetic tests
- Performance budgets in build

### Phase 5: Integrations & Alerts

- Third-party service connections
- Alert threshold engine
- Notification delivery (Slack, email)
- Historical reporting

---

## Open Questions

1. **Snapshot storage limits**: Should we enforce a max snapshot size or count by default?
2. **Remote snapshot storage**: Should snapshots sync to cloud for disaster recovery?
3. **Multi-site support**: Should sync commands work across WordPress multisite?
4. **CI/CD integration**: Should we provide GitHub Actions / GitLab CI templates?

---

## Success Criteria

1. Deploy + rollback works reliably with full state restoration
2. Environment sync handles serialized data correctly
3. Dashboard loads in <2 seconds with 30 days of data
4. RUM script adds <50ms to page load
5. Lighthouse audits complete in <60 seconds

---

## References

- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [WordPress Database Schema](https://codex.wordpress.org/Database_Description)
- Existing StrataWP deployment system in `packages/cli/src/deployers/`
