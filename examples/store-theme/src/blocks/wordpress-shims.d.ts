/**
 * Minimal ambient declaration for `@wordpress/blocks`.
 *
 * The WordPress runtime version pinned by this theme ships no bundled
 * TypeScript declarations and the DefinitelyTyped stub is empty, so the
 * `BlockEditProps<T>` type that block `edit.tsx` files consume is undeclared.
 *
 * This shim declares just that type — typing `attributes` as the generated
 * attribute interface `T` — so the typecheck gate proves that the generated
 * `block-attributes.ts` types are well-formed and correctly consumed. It is not
 * a full typing of the WordPress editor surface.
 */

declare module '@wordpress/blocks' {
  /** Editor props for a block whose attributes are described by `T`. */
  export interface BlockEditProps<T> {
    attributes: T
    setAttributes: (attrs: Partial<T>) => void
    clientId: string
    isSelected: boolean
  }
}
