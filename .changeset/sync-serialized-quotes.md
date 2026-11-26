---
'@stratawp/sync': patch
---

URL replacement in synced databases now finds URLs inside PHP serialized strings that contain double quotes (HTML in widgets, block and theme options), and fixes lengths in serialized data stored inside a string.
