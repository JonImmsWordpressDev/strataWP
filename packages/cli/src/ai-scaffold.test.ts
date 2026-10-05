import { describe, it, expect } from 'vitest'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

/**
 * Every bundled theme template must ship the AI-assisted development
 * scaffold, so every theme created with the CLI is agent-ready out of the
 * box. A template missing any of these files silently produces themes
 * where AI agents have no protocol to follow.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const templatesDir = path.join(__dirname, '..', 'templates')

const TEMPLATES = ['basic-theme', 'advanced-theme', 'store-theme']

const REQUIRED_FILES = [
  'AGENTS.md',
  '.aiignore',
  '.ai/ONBOARDING.md',
  '.ai/PROJECT_RULES.md',
  '.ai/SKILLS.md',
  '.ai/agent-state.md',
  '.ai/developer-directions.md',
  '.ai/plans/SPEC-TEMPLATE.md',
  '.ai/skills/architecture/SKILL.md',
  '.ai/skills/gutenberg-blocks/SKILL.md',
  '.ai/skills/deployment/SKILL.md',
  '.ai/skills/theme-review/SKILL.md',
  'scripts/ai-setup.mjs',
]

describe.each(TEMPLATES)('%s AI scaffold', (templateName) => {
  const templatePath = path.join(templatesDir, templateName)

  it.each(REQUIRED_FILES)('ships %s', (file) => {
    expect(fs.existsSync(path.join(templatePath, file))).toBe(true)
  })

  it('wires ai:setup and ai:check into package.json', () => {
    const pkg = fs.readJsonSync(path.join(templatePath, 'package.json'))
    expect(pkg.scripts['ai:setup']).toBe('node scripts/ai-setup.mjs')
    expect(pkg.scripts['ai:check']).toBeTruthy()
  })

  it('agent-state starts as pending (no pre-completed onboarding)', () => {
    const state = fs.readFileSync(path.join(templatePath, '.ai/agent-state.md'), 'utf8')
    expect(state).not.toMatch(/\*\*Status\*\*:\s*Completed/i)
  })
})
