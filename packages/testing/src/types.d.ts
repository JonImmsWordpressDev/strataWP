/**
 * WordPress Type Declarations
 */

declare global {
  const wp: {
    blocks: {
      registerBlockType: (name: string, settings: any) => any
      getBlockType: (name: string) => any
      [key: string]: any
    }
    data: any
    i18n: any
    components: any
    blockEditor: any
    element: any
    apiFetch: any
  }

  const vi: any
}

declare module '@wordpress/blocks' {
  export interface BlockConfiguration {
    name?: string
    title?: string
    description?: string
    category?: string
    icon?: string | Record<string, any>
    keywords?: string[]
    attributes?: Record<string, any>
    supports?: Record<string, any>
    [key: string]: any
  }

  export function registerBlockType(
    name: string,
    settings: BlockConfiguration
  ): any
  export function getBlockType(name: string): any
}

export {}
