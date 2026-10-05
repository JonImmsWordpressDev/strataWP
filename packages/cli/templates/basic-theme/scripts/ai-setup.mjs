#!/usr/bin/env node
// Generates instruction files for AI coding agents so they discover and
// follow this theme's agent protocol (AGENTS.md + .ai/). Zero dependencies.
//
// Usage:
//   pnpm ai:setup                 # interactive agent selection
//   pnpm ai:setup --all           # generate for every supported agent
//   pnpm ai:setup --agents=claude,cursor
//   pnpm ai:setup --force         # overwrite existing files

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline/promises'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const CORE_INSTRUCTIONS = `# AI Agent Instructions

This WordPress theme is built on the StrataWP framework and uses a structured AI-assisted development workflow.

**Read \`AGENTS.md\` at the theme root and follow its protocol before making any changes.**

Core rules (full detail in AGENTS.md):

1. **Onboarding & state:** Check \`.ai/agent-state.md\`. If onboarding is pending, follow \`.ai/ONBOARDING.md\`. Always read \`.ai/PROJECT_RULES.md\` for learned theme conventions.
2. **pnpm only.** Never use npm or yarn.
3. **Source files only.** Never edit \`dist/\`, \`inc/blocks-generated.php\`, or \`vendor/stratawp/core/\` (the vendored framework — replaced wholesale on updates).
4. **Contract-first.** Non-trivial features require an approved spec in \`.ai/plans/\` (copy \`SPEC-TEMPLATE.md\`).
5. **Pre-flight check.** Run \`pnpm ai:check\` before submitting work.

Skill recipes live in \`.ai/skills/\` (see \`.ai/SKILLS.md\`).
`

const AGENTS = {
  claude: {
    label: 'Claude Code',
    file: 'CLAUDE.md',
    content: CORE_INSTRUCTIONS,
  },
  cursor: {
    label: 'Cursor',
    file: '.cursor/rules/theme.mdc',
    content: `---
description: Theme rules for AI-assisted development
alwaysApply: true
---

${CORE_INSTRUCTIONS}`,
  },
  copilot: {
    label: 'GitHub Copilot',
    file: '.github/copilot-instructions.md',
    content: CORE_INSTRUCTIONS,
  },
  gemini: {
    label: 'Gemini CLI',
    file: 'GEMINI.md',
    content: CORE_INSTRUCTIONS,
  },
  windsurf: {
    label: 'Windsurf',
    file: '.windsurf/rules/theme.md',
    content: CORE_INSTRUCTIONS,
  },
}

// Agents that read AGENTS.md natively and need no generated file.
const NATIVE = [{ label: 'Codex / OpenCode / Jules', note: 'read AGENTS.md natively' }]

function parseArgs(argv) {
  const opts = { all: false, force: false, agents: [] }
  for (const arg of argv) {
    if (arg === '--all' || arg === '-a') opts.all = true
    else if (arg === '--force' || arg === '-f') opts.force = true
    else if (arg.startsWith('--agents=')) {
      opts.agents = arg
        .slice('--agents='.length)
        .split(',')
        .map((a) => a.trim().toLowerCase())
        .filter(Boolean)
    }
  }
  return opts
}

async function selectInteractive() {
  const keys = Object.keys(AGENTS)
  console.log('\nWhich AI coding agents should be configured?\n')
  keys.forEach((key, i) => {
    const configured = existsSync(resolve(root, AGENTS[key].file)) ? ' (already configured)' : ''
    console.log(`  ${i + 1}. ${AGENTS[key].label}${configured}`)
  })
  console.log(`  ${keys.length + 1}. All of the above\n`)
  for (const n of NATIVE) console.log(`  — ${n.label}: ${n.note}, no setup needed`)

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(
    '\nEnter numbers separated by commas (or press Enter to cancel): '
  )
  rl.close()

  const picks = answer
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= keys.length + 1)
  if (picks.includes(keys.length + 1)) return keys
  return picks.map((n) => keys[n - 1])
}

function writeAgentFile(key, force) {
  const agent = AGENTS[key]
  const target = resolve(root, agent.file)
  if (existsSync(target) && !force) {
    console.log(
      `  • ${agent.label}: ${agent.file} already exists — skipped (use --force to overwrite)`
    )
    return
  }
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, agent.content)
  console.log(`  ✓ ${agent.label}: wrote ${agent.file}`)
}

// Records the theme type (block, classic or hybrid) in .ai/agent-state.md so
// agents know which review rules apply. Detection lives in
// @stratawp/theme-review; without it this step is skipped.
async function recordThemeType() {
  const statePath = resolve(root, '.ai/agent-state.md')
  if (!existsSync(statePath)) return

  let detectTheme
  try {
    ;({ detectTheme } = await import('@stratawp/theme-review'))
  } catch {
    console.log(
      '  • Theme type: @stratawp/theme-review is not installed — run `pnpm install` to enable detection'
    )
    return
  }

  let result
  try {
    result = detectTheme(root)
  } catch (error) {
    console.log(`  ! Theme type: ${error.message}`)
    return
  }

  const line = `- **Theme type**: ${result.themeType} (${result.typeSource})`
  const state = readFileSync(statePath, 'utf8')
  const existing = /^- \*\*Theme type\*\*:.*$/m
  const lastUpdated = /^(- \*\*Last Updated\*\*:.*)$/m

  let next
  if (existing.test(state)) next = state.replace(existing, line)
  else if (lastUpdated.test(state)) next = state.replace(lastUpdated, `$1\n${line}`)
  else next = `${state.trimEnd()}\n\n${line}\n`

  if (next !== state) writeFileSync(statePath, next)
  console.log(
    `  ✓ Theme type: ${result.themeType} (${result.typeSource}) recorded in .ai/agent-state.md`
  )
}

const opts = parseArgs(process.argv.slice(2))
await recordThemeType()
let selected = []
if (opts.all) selected = Object.keys(AGENTS)
else if (opts.agents.length) {
  selected = opts.agents.filter((a) => {
    if (!AGENTS[a]) {
      console.error(`  ! Unknown agent "${a}". Supported: ${Object.keys(AGENTS).join(', ')}`)
      return false
    }
    return true
  })
} else {
  selected = await selectInteractive()
}

if (!selected.length) {
  console.log('Nothing selected — no files written.')
  process.exit(0)
}

console.log('')
for (const key of selected) writeAgentFile(key, opts.force)
console.log(
  '\nDone. Agents should now read AGENTS.md and follow the onboarding protocol in .ai/ONBOARDING.md.'
)
