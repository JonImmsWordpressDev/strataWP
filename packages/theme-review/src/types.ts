export type ThemeType = 'block' | 'classic' | 'hybrid'
export type Severity = 'error' | 'warning' | 'info'
export type SeverityOverride = Severity | 'off'

export interface Finding {
  ruleId: string
  severity: Severity
  message: string
  file?: string
  line?: number
}

/** What a rule returns. `severity` overrides the rule's default for this finding. */
export interface RuleResult {
  message: string
  file?: string
  line?: number
  severity?: Severity
}

export interface ThemeContext {
  themeDir: string
  themeType: ThemeType
  /** `Text Domain` from style.css, if declared. */
  textDomain: string | undefined
  /** style.css header fields, keys lowercased (e.g. `theme name`). */
  styleHeader: Record<string, string>
  /** Theme-relative POSIX paths, after ignores are applied. */
  files: string[]
  exists(rel: string): boolean
  read(rel: string): string | undefined
  readBytes(rel: string): Buffer | undefined
}

export interface Rule {
  id: string
  description: string
  /** Default severity for findings that do not set their own. */
  severity: Severity
  appliesTo: ThemeType[]
  check(ctx: ThemeContext): RuleResult[]
}

export interface Report {
  themeDir: string
  themeType: ThemeType
  typeSource: 'detected' | 'override'
  summary: { errors: number; warnings: number; infos: number }
  findings: Finding[]
  disclaimer: string
}
