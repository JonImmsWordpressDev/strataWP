#!/usr/bin/env node

// This package is a thin wrapper that runs the create-stratawp binary from @stratawp/cli
// The actual create logic is in @stratawp/cli/dist/create.js

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

try {
  // Import and run the create script from @stratawp/cli
  const cliPath = require.resolve('@stratawp/cli/dist/create.js')
  await import(cliPath)
} catch (error) {
  console.error('Failed to run create-stratawp:', error.message)
  process.exit(1)
}
