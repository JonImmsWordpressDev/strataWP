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
import type { FeatureCardAttributes } from './feature-card/block-attributes'
import type { HeroAttributes } from './hero/block-attributes'
import type { PortfolioGridAttributes } from './portfolio-grid/block-attributes'
import type { TeamMembersAttributes } from './team-members/block-attributes'

// Each generated interface must satisfy the shape `edit.tsx` consumes.
type FeatureCardEditProps = BlockEditProps<FeatureCardAttributes>
type HeroEditProps = BlockEditProps<HeroAttributes>
type PortfolioGridEditProps = BlockEditProps<PortfolioGridAttributes>
type TeamMembersEditProps = BlockEditProps<TeamMembersAttributes>

// Reading attributes proves the generated fields exist with their mapped types.
function assertFeatureCard(props: FeatureCardEditProps): void {
  const title: string = props.attributes.title
  const description: string = props.attributes.description
  const icon: string = props.attributes.icon
  const iconBackgroundColor: string = props.attributes.iconBackgroundColor
  void title
  void description
  void icon
  void iconBackgroundColor
  props.setAttributes({ icon: '★' })
}

function assertHero(props: HeroEditProps): void {
  const title: string = props.attributes.title
  const buttonText: string = props.attributes.buttonText
  const buttonUrl: string = props.attributes.buttonUrl
  const description: string = props.attributes.description
  const overlayOpacity: number = props.attributes.overlayOpacity
  // `backgroundImage` has no default in block.json, so it is optional.
  const background: string | undefined = props.attributes.backgroundImage
  void title
  void buttonText
  void buttonUrl
  void description
  void overlayOpacity
  void background
  props.setAttributes({ title: 'updated' })
}

function assertPortfolioGrid(props: PortfolioGridEditProps): void {
  const category: string = props.attributes.category
  const columns: number = props.attributes.columns
  const postsPerPage: number = props.attributes.postsPerPage
  const order: string = props.attributes.order
  const orderBy: string = props.attributes.orderBy
  void category
  void columns
  void postsPerPage
  void order
  void orderBy
  props.setAttributes({ columns: 3 })
}

function assertTeamMembers(props: TeamMembersEditProps): void {
  const columns: number = props.attributes.columns
  const department: string = props.attributes.department
  const postsPerPage: number = props.attributes.postsPerPage
  const showBio: boolean = props.attributes.showBio
  void columns
  void department
  void postsPerPage
  void showBio
  props.setAttributes({ showBio: true })
}

// Reference the assertions so `noUnusedLocals` stays happy.
export const __attributeTypeChecks = [
  assertFeatureCard,
  assertHero,
  assertPortfolioGrid,
  assertTeamMembers,
]
