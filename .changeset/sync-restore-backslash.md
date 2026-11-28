---
'@stratawp/sync': patch
---

Database restore no longer splits a statement inside a string literal when an earlier value ends in an escaped backslash (for example a Windows upload path), which made `sync:db:push` and `sync:db:pull` abort with a syntax error.
