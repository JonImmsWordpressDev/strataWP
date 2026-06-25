/**
 * Type-level consumption assertion for the generated block attribute types.
 *
 * This file is compiled by the `typecheck` gate (`tsconfig.typecheck.json`). It
 * is not bundled or shipped — it exists purely so `tsc` verifies that:
 *   1. each generated `block-attributes.ts` is valid, importable TypeScript, and
 *   2. each interface is usable as the attribute type of `BlockEditProps<T>`,
 *      the same way each block's `edit.tsx` consumes it.
 *
 * It deliberately mirrors the real consumption in `edit.tsx` (which also imports
 * `BlockEditProps` and the generated interface) while staying free of JSX, so
 * the gate does not depend on the theme's untyped WordPress editor surface.
 */

import type { BlockEditProps } from '@wordpress/blocks'
import type { HeroAttributes } from './hero/block-attributes'
import type { FeatureCardAttributes } from './feature-card/block-attributes'

// Each generated interface must satisfy the shape `edit.tsx` consumes.
type HeroEditProps = BlockEditProps<HeroAttributes>
type FeatureCardEditProps = BlockEditProps<FeatureCardAttributes>

// Reading attributes proves the generated fields exist with their mapped types.
function assertHero(props: HeroEditProps): void {
  const title: string = props.attributes.title
  const overlayOpacity: number = props.attributes.overlayOpacity
  // `backgroundImage` has no default in block.json, so it is optional.
  const background: string | undefined = props.attributes.backgroundImage
  void title
  void overlayOpacity
  void background
  props.setAttributes({ title: 'updated' })
}

function assertFeatureCard(props: FeatureCardEditProps): void {
  const title: string = props.attributes.title
  const iconBackgroundColor: string = props.attributes.iconBackgroundColor
  void title
  void iconBackgroundColor
  props.setAttributes({ icon: '★' })
}

// Reference the assertions so `noUnusedLocals` stays happy.
export const __attributeTypeChecks = [assertHero, assertFeatureCard]
