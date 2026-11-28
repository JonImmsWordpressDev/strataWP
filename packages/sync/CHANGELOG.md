# @stratawp/sync

## 0.1.2

### Patch Changes

- 14e6129: Snapshots now keep `src` directories below the theme root, such as `vendor/stratawp/core/src`, and skip only the theme's own `src` and `e2e`.
- 207404a: Database dumps now write DATE, DATETIME and TIMESTAMP columns as the stored text (for example `2026-11-27 10:30:00`, and WordPress zero dates as `0000-00-00 00:00:00`) instead of JavaScript date strings that MySQL rejects, so `sync:db:push` and pre-restore backups import cleanly.
- d1cdfdf: URL replacement in synced databases now keeps PHP serialized lengths correct for values that contain an apostrophe or a backslash.
- 40d4488: Database restore no longer splits a statement inside a string literal when an earlier value ends in an escaped backslash (for example a Windows upload path), which made `sync:db:push` and `sync:db:pull` abort with a syntax error.
- 3bb469c: URL replacement in synced databases now finds URLs inside PHP serialized strings that contain double quotes (HTML in widgets, block and theme options), and fixes lengths in serialized data stored inside a string.
- afef176: Upgrade tar to 7.5 and mysql2 to 3.23 to pick up fixes for published security advisories (tar extraction path traversal and parse denial of service, mysql2 auth-plugin downgrade that could leak the database password).

## 0.1.1

### Patch Changes

- Republish `@stratawp/sync` as 0.1.1 — 0.1.0 was burned by an earlier unpublish and npm forbids reusing it, which left `@stratawp/cli@2.0.2`'s exact pin unresolvable. Internal workspace pins now publish as caret ranges (`workspace:^`) so a single republished dependency no longer forces a lockstep chain.
