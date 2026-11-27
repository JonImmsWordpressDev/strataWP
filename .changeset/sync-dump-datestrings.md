---
'@stratawp/sync': patch
---

Database dumps now write DATE, DATETIME and TIMESTAMP columns as the stored text (for example `2026-11-27 10:30:00`, and WordPress zero dates as `0000-00-00 00:00:00`) instead of JavaScript date strings that MySQL rejects, so `sync:db:push` and pre-restore backups import cleanly.
