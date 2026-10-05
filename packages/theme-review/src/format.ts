import type { Report } from './types'

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`

export function formatReport(report: Report): string {
  const lines = [
    `StrataWP theme review: ${report.themeDir}`,
    `Theme type: ${report.themeType} (${report.typeSource})`,
    '',
  ]

  if (report.findings.length === 0) {
    lines.push('No findings.')
  }
  for (const finding of report.findings) {
    const where = finding.file ? `  (${finding.file}${finding.line ? `:${finding.line}` : ''})` : ''
    lines.push(
      `${finding.severity.padEnd(7)} ${finding.ruleId.padEnd(9)} ${finding.message}${where}`
    )
  }

  lines.push(
    '',
    `${plural(report.summary.errors, 'error')}, ${plural(report.summary.warnings, 'warning')}, ${plural(report.summary.infos, 'info')}`,
    '',
    report.disclaimer
  )
  return lines.join('\n')
}
