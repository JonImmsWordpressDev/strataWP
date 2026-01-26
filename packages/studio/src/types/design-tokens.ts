/**
 * Design token types for theme.json integration
 */

export interface ColorToken {
  slug: string
  name: string
  color: string
}

export interface FontFamily {
  slug: string
  name: string
  fontFamily: string
  fontFace?: FontFace[]
}

export interface FontFace {
  fontFamily: string
  fontWeight: string | number
  fontStyle: string
  fontDisplay: string
  src: string[]
}

export interface FontSize {
  slug: string
  name: string
  size: string
  fluid?: {
    min: string
    max: string
  } | false
}

export interface SpacingSize {
  slug: string
  name: string
  size: string
}

export interface ShadowPreset {
  slug: string
  name: string
  shadow: string
}

export interface DesignTokens {
  colors: {
    palette: ColorToken[]
    gradients?: Array<{
      slug: string
      name: string
      gradient: string
    }>
    duotone?: Array<{
      slug: string
      name: string
      colors: [string, string]
    }>
  }
  typography: {
    fontFamilies: FontFamily[]
    fontSizes: FontSize[]
  }
  spacing: {
    spacingSizes: SpacingSize[]
    units: string[]
  }
  layout: {
    contentSize: string
    wideSize: string
  }
  shadow: {
    presets: ShadowPreset[]
  }
  custom: {
    fontWeight: Record<string, number>
    lineHeight: Record<string, number>
    spacing: Record<string, string>
  }
}

export interface DesignPreset {
  id: string
  name: string
  description: string
  tokens: Partial<DesignTokens>
  preview?: string
}
