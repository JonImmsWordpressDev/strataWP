import { describe, it, expect } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'

// The guard lives in scripts/ (plain .mjs run by `prepack`), outside this
// package's tsc rootDir, so it is loaded dynamically rather than imported.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.join(__dirname, '..', '..', 'scripts', 'template-deps.mjs')
const { assertPublishableVersion } = (await import(/* @vite-ignore */ modulePath)) as {
  assertPublishableVersion: (name: string, version: string) => void
}

describe('assertPublishableVersion', () => {
  it('rejects an unversioned 0.0.0 package, naming it and the fix', () => {
    expect(() => assertPublishableVersion('@stratawp/stylelint-config', '0.0.0')).toThrow(
      /@stratawp\/stylelint-config.*version-packages/s
    )
  })

  it.each(['0.1.0', '2.1.1'])('accepts %s', (version) => {
    expect(() => assertPublishableVersion('@stratawp/testing', version)).not.toThrow()
  })
})
