/**
 * WordPress package type declarations
 *
 * These declarations supplement packages that don't have their own types
 */

declare module '@wordpress/block-editor' {
  import { ComponentType, ReactNode } from 'react'

  interface BlockControlsProps {
    group?: string
    children?: ReactNode
  }

  export const BlockControls: ComponentType<BlockControlsProps>
}

declare module '@wordpress/blocks' {
  interface Block {
    clientId: string
    name: string
    attributes: Record<string, unknown>
    innerBlocks: Block[]
  }

  export function serialize(blocks: Block | Block[]): string
}

declare module '@wordpress/plugins' {
  import { ComponentType } from 'react'

  interface PluginOptions {
    render: ComponentType
    icon?: string | ComponentType
    scope?: string
  }

  export function registerPlugin(name: string, options: PluginOptions): void
}
