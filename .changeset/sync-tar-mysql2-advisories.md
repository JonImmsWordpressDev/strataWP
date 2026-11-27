---
'@stratawp/sync': patch
---

Upgrade tar to 7.5 and mysql2 to 3.23 to pick up fixes for published security advisories (tar extraction path traversal and parse denial of service, mysql2 auth-plugin downgrade that could leak the database password).
