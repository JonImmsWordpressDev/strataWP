/**
 * Shared types for pure generator cores
 */

export interface GeneratedFile {
  /** Path relative to the target theme directory */
  path: string
  content: string
}

export interface GenerateResult {
  files: GeneratedFile[]
  /** Notes for the CLI layer to print; core never writes stdout */
  messages: string[]
}
