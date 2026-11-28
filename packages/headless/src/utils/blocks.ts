/**
 * Helpers for the `blocks` REST field from the StrataWP core `Headless`
 * component.
 */

import type { WPBlock } from '../types/wordpress.js'

/** A block narrowed to one name, with that block's attribute type. */
export type TypedBlock<M, N extends keyof M & string> = WPBlock & { name: N; attributes: M[N] }

/** The parsed blocks of a post or page, or `[]` when the field is absent. */
export function getBlocks(item: { blocks?: WPBlock[] } | null | undefined): WPBlock[] {
  return Array.isArray(item?.blocks) ? item.blocks : []
}

/** Every block in the tree, depth first, parents before their inner blocks. */
export function flattenBlocks(blocks: WPBlock[]): WPBlock[] {
  const out: WPBlock[] = []
  const walk = (list: WPBlock[]) => {
    for (const block of list) {
      out.push(block)
      walk(block.innerBlocks ?? [])
    }
  }
  walk(blocks)
  return out
}

/**
 * Build a type guard from a map of block name to attribute type, such as the
 * `BlockAttributesMap` the vite plugin writes with `blocks.exportTypes`.
 *
 * ```ts
 * import type { BlockAttributesMap } from './theme/block-attributes'
 * const isBlock = createBlockGuard<BlockAttributesMap>()
 * if (isBlock(block, 'strata-basic/hero')) block.attributes.title
 * ```
 */
export function createBlockGuard<M>() {
  return <N extends keyof M & string>(block: WPBlock, name: N): block is TypedBlock<M, N> =>
    block.name === name
}
