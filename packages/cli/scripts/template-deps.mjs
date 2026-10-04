/**
 * Guard for stamping template dependency pins.
 *
 * A workspace package still at 0.0.0 has never been versioned by changesets,
 * so it is not on npm and a `^0.0.0` pin would make every scaffolded theme's
 * `pnpm install` fail.
 */
export function assertPublishableVersion(name, version) {
  if (version === '0.0.0') {
    throw new Error(
      `${name} is still at version 0.0.0 and has not been published. ` +
        'Run `pnpm version-packages` (changesets) before packing or publishing the CLI.'
    )
  }
}
