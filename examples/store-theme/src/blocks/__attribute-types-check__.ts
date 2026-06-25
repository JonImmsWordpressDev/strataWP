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
import type { FeaturedProductsAttributes } from './featured-products/block-attributes'
import type { HeroAttributes } from './hero/block-attributes'
import type { ProductCategoriesAttributes } from './product-categories/block-attributes'

// Each generated interface must satisfy the shape `edit.tsx` consumes.
type FeatureCardEditProps = BlockEditProps<FeatureCardAttributes>
type FeaturedProductsEditProps = BlockEditProps<FeaturedProductsAttributes>
type HeroEditProps = BlockEditProps<HeroAttributes>
type ProductCategoriesEditProps = BlockEditProps<ProductCategoriesAttributes>

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

function assertFeaturedProducts(props: FeaturedProductsEditProps): void {
  const columns: number = props.attributes.columns
  const limit: number = props.attributes.limit
  const order: string = props.attributes.order
  const orderBy: string = props.attributes.orderBy
  void columns
  void limit
  void order
  void orderBy
  props.setAttributes({ columns: 4 })
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

function assertProductCategories(props: ProductCategoriesEditProps): void {
  const columns: number = props.attributes.columns
  const limit: number = props.attributes.limit
  const showCount: boolean = props.attributes.showCount
  const showEmpty: boolean = props.attributes.showEmpty
  void columns
  void limit
  void showCount
  void showEmpty
  props.setAttributes({ showCount: false })
}

// Reference the assertions so `noUnusedLocals` stays happy.
export const __attributeTypeChecks = [
  assertFeatureCard,
  assertFeaturedProducts,
  assertHero,
  assertProductCategories,
]
