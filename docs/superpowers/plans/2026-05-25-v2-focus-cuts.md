# v2.0 Focus Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship StrataWP v2.0.0 — a "focus release" that removes `@stratawp/studio`, `@stratawp/registry`, and `@stratawp/ai` from the monorepo, strips Registry+AI from the CLI, rewrites docs, adds `ROADMAP.md`, bumps versions, and prepares the publish/tag/deprecate commands.

**Architecture:** Single feature branch `feat/v2-focus-cuts` off `main` with six ordered, independently-revertable commits. Each cut runs as its own commit; docs rewrite, ROADMAP add, and release prep are separate commits. PR opened from the feature branch; tag/release/npm-publish/npm-deprecate steps execute by hand after merge.

**Tech Stack:** TypeScript monorepo (pnpm + Turborepo), Vitest tests, tsup for CLI build, `gh` CLI for GitHub operations, `npm` for publish/deprecate.

**Source spec:** [docs/superpowers/specs/2026-05-25-v2-focus-cuts-design.md](../specs/2026-05-25-v2-focus-cuts-design.md)

**Repo root for all commands:** `/Users/jon.imms/Local Sites/stratawp/strataWP` (note the space; quote in shell). The harness resets `cwd` between bash calls, so every shell command in this plan is prefixed with the absolute `cd "..."`.

---

## File Structure

Files modified or deleted across the six commits:

| File                                              | Action                             | Notes                                                                                                                                            |
| ------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/registry/` (entire dir)                 | Delete (commit 1)                  | 13 src files                                                                                                                                     |
| `packages/cli/src/index.ts`                       | Modify (commits 1, 2, 6)           | Remove Registry imports + 5 commands (1); Remove AI imports + 4 commands (2); bump `.version()` (6)                                              |
| `packages/cli/package.json`                       | Modify (commits 1, 2, 6)           | Remove `@stratawp/registry` (1) and `@stratawp/ai` (2) deps; bump version to 2.0.0 (6)                                                           |
| `pnpm-lock.yaml`                                  | Auto-regenerated (commits 1, 2, 3) | `pnpm install` rewrites after each removal                                                                                                       |
| `packages/ai/` (entire dir)                       | Delete (commit 2)                  | 13 src files                                                                                                                                     |
| `packages/studio/` (entire dir)                   | Delete (commit 3)                  | 54 src files                                                                                                                                     |
| `docs/STUDIO.md`                                  | Delete (commit 3)                  | Studio guide                                                                                                                                     |
| `docs/plans/2026-01-26-save-pattern-plugin.md`    | Delete (commit 3)                  | Studio implementation plan                                                                                                                       |
| `docs/plans/2026-01-26-pattern-library-design.md` | Delete (commit 3)                  | Studio design doc                                                                                                                                |
| `docs/plans/2026-01-26-pattern-library-phase2.md` | Delete (commit 3)                  | Studio plan                                                                                                                                      |
| `docs/plans/2026-01-26-block-library-design.md`   | Delete (commit 3)                  | Studio plan                                                                                                                                      |
| `README.md`                                       | Modify (commit 4)                  | Drop Studio Guide row, three feature bullets, project-structure entries, CLI examples, three published-packages bullets                          |
| `CHEAT_SHEET.md`                                  | Modify (commit 4)                  | Delete AI Commands section and Registry section                                                                                                  |
| `GETTING_STARTED.md`                              | Modify (commit 4)                  | Delete AI-Assisted Development section, Component Registry section, registry references in summaries                                             |
| `CLAUDE.md`                                       | Modify (commit 4)                  | Remove `packages/ai`/`packages/registry` bullets, `@stratawp/ai`/`@stratawp/registry` bullets, and the entire Studio Package section (~80 lines) |
| `DEVELOPMENT_NOTES.md`                            | Modify (commit 4)                  | Remove "Component registry for reusability" bullet                                                                                               |
| `ROADMAP.md`                                      | Create (commit 5)                  | New file                                                                                                                                         |
| `package.json` (root)                             | Modify (commit 6)                  | Bump `"version": "1.2.0"` → `"2.0.0"`                                                                                                            |
| `CHANGELOG.md`                                    | Modify (commit 6)                  | Prepend v2.0.0 entry                                                                                                                             |

**Files explicitly NOT modified** (verified during planning):

- `packages/core/` — has zero references to cut packages.
- `packages/explorer/`, `packages/headless/`, `packages/sync/`, `packages/testing/`, `packages/vite-plugin/` — no references to cut packages.
- `examples/basic-theme/`, `examples/advanced-theme/`, `examples/store-theme/` — no references.
- `packages/cli/templates/` — no references.
- `packages/create-stratawp/` — README + index.js only; no references.
- `pnpm-workspace.yaml` — uses `packages/*` glob; no edit needed when dirs are deleted.
- `turbo.json` — pipeline-only; no per-package references.
- `.github/workflows/release-theme.yml` — only builds basic-theme; no references.
- `CONTRIBUTING.md` — no references.
- `packages/cli/src/utils/update-checker.ts` — references "npm registry" (the public registry), not `@stratawp/registry`. Keep.

---

## Task 0: Branch setup

**Files:**

- No file changes; verifies clean working tree and creates the feature branch.

- [ ] **Step 0.1: Confirm clean working tree on main**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && git status -sb
```

Expected: `## main...origin/main` with no `M`/`A`/`D` lines. Untracked entries (`.claude/`, `.claude-flow/`, `.mcp.json`, `.stratawp-snapshots/`, `docs/superpowers/`) are pre-existing personal tooling and OK to leave. If there are modified/staged files you don't recognise, stop and investigate before continuing.

- [ ] **Step 0.2: Create feature branch**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && git checkout -b feat/v2-focus-cuts
```

Expected: `Switched to a new branch 'feat/v2-focus-cuts'`.

- [ ] **Step 0.3: Capture baseline `--help` output for later comparison**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && pnpm -F @stratawp/cli build 2>&1 | tail -5 && node packages/cli/dist/index.js --help > /tmp/stratawp-help-baseline.txt && grep -cE "^\s+(registry|ai):" /tmp/stratawp-help-baseline.txt
```

Expected: `9` (5 registry: + 4 ai: commands present before the cuts). If the count differs, the file shape changed since this plan was written — inspect `/tmp/stratawp-help-baseline.txt` before proceeding.

---

## Task 1: Remove @stratawp/registry

**Files:**

- Modify: `packages/cli/src/index.ts` (remove import block + 5 commands)
- Modify: `packages/cli/package.json` (remove dep)
- Delete: `packages/registry/` (whole directory)
- Auto-update: `pnpm-lock.yaml`

- [ ] **Step 1.1: Remove the registry import block from packages/cli/src/index.ts**

Edit `packages/cli/src/index.ts` and remove this exact block (use the Edit tool with `old_string` = the block below and `new_string` = empty string):

```typescript
import {
  searchCommand,
  installCommand,
  infoCommand,
  publishCommand,
  listCommand,
} from '@stratawp/registry'
```

(Note: the trailing blank line is part of the deletion — it preserves a single blank line between the remaining `@stratawp/ai` import and the next import.)

- [ ] **Step 1.2: Remove the registry commands block from packages/cli/src/index.ts**

Edit `packages/cli/src/index.ts` and remove this exact block (Edit tool, `old_string` = block below, `new_string` = empty string):

```typescript
// Component Registry commands
program
  .command('registry:search <query>')
  .description('Search for components in the registry')
  .option('-t, --type <type>', 'Filter by component type (block|component|pattern|template)')
  .option('-l, --limit <number>', 'Maximum number of results', '20')
  .action((query: string, options: any) => {
    searchCommand(query, {
      type: options.type,
      limit: parseInt(options.limit, 10),
    })
  })

program
  .command('registry:install <component>')
  .description('Install a component from the registry')
  .option('-v, --version <version>', 'Specific version to install')
  .option('-f, --force', 'Overwrite if component already exists')
  .option('-d, --dev', 'Install as dev dependency')
  .option('--target-dir <dir>', 'Custom target directory')
  .action((component: string, options: any) => {
    installCommand(component, options)
  })

program
  .command('registry:info <component>')
  .description('Get detailed information about a component')
  .action(infoCommand)

program
  .command('registry:publish')
  .description('Publish current component to the registry')
  .option('--tag <tag>', 'Publish with a specific tag')
  .option('--access <access>', 'Public or restricted access', 'public')
  .option('--dry-run', 'Test publication without actually publishing')
  .action(publishCommand)

program
  .command('registry:list')
  .description('List installed StrataWP components')
  .action(listCommand)
```

(Trailing blank line included so the result keeps a single blank line before `// Deployment commands`.)

- [ ] **Step 1.3: Remove the @stratawp/registry dependency from packages/cli/package.json**

Edit `packages/cli/package.json` and remove this exact line (Edit tool, `old_string` = below, `new_string` = empty string):

```json
    "@stratawp/registry": "workspace:*",
```

- [ ] **Step 1.4: Delete the packages/registry/ directory**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && git rm -r packages/registry
```

Expected: lines reading `rm 'packages/registry/...'` for each file in the directory (13 src files plus build artefacts if any are tracked).

- [ ] **Step 1.5: Refresh the lockfile**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && pnpm install 2>&1 | tail -10
```

Expected: ends with `Done in <time>` and no error. `pnpm-lock.yaml` is rewritten to drop the registry workspace entry.

- [ ] **Step 1.6: Verify CLI build still succeeds**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && pnpm -F @stratawp/cli build 2>&1 | tail -10
```

Expected: build completes, no TypeScript errors. If there's a "Cannot find module '@stratawp/registry'" error, you missed a removal in step 1.1 or 1.2 — grep `packages/cli/src/index.ts` for `registry` to locate.

- [ ] **Step 1.7: Verify registry commands no longer in --help**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && node packages/cli/dist/index.js --help | grep -cE "^\s+registry:" || echo "0 (none — good)"
```

Expected: `0 (none — good)`.

- [ ] **Step 1.8: Verify ai: commands still present (sanity check that we didn't accidentally cut them)**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && node packages/cli/dist/index.js --help | grep -cE "^\s+ai:"
```

Expected: `4` (`ai:setup`, `ai:generate`, `ai:review`, `ai:document` — these are removed in Task 2, not Task 1).

- [ ] **Step 1.9: Commit**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && git add -A && git status -sb | head -20
```

Verify staged: `packages/cli/src/index.ts`, `packages/cli/package.json`, deleted `packages/registry/...`, modified `pnpm-lock.yaml`. Then:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && git commit -m "chore: remove @stratawp/registry package

Drops the unused Component Registry package. Source has been at 0.1.0
with no adoption; npm + private packages already cover the use case.

- Removes packages/registry/
- Removes @stratawp/registry workspace dep from @stratawp/cli
- Removes the 5 registry:* CLI commands and their import block
- Regenerates pnpm-lock.yaml

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Remove @stratawp/ai

**Files:**

- Modify: `packages/cli/src/index.ts` (remove import block + 4 commands)
- Modify: `packages/cli/package.json` (remove dep)
- Delete: `packages/ai/` (whole directory)
- Auto-update: `pnpm-lock.yaml`

- [ ] **Step 2.1: Remove the AI import block from packages/cli/src/index.ts**

Edit `packages/cli/src/index.ts` and remove this exact block (Edit tool, `old_string` = below, `new_string` = empty string):

```typescript
import { setupCommand, generateCommand, reviewCommand, documentCommand } from '@stratawp/ai'
```

- [ ] **Step 2.2: Remove the AI commands block from packages/cli/src/index.ts**

Edit `packages/cli/src/index.ts` and remove this exact block (Edit tool, `old_string` = below, `new_string` = empty string):

```typescript
// AI-powered commands
program.command('ai:setup').description('Configure AI providers and API keys').action(setupCommand)

program
  .command('ai:generate <type>')
  .description('Generate code with AI (block|component|pattern)')
  .option('-o, --output <path>', 'Output file path')
  .action((type: string, options: any) => {
    generateCommand({ type: type as 'block' | 'component' | 'pattern', ...options })
  })

program
  .command('ai:review <file>')
  .description('Review code for best practices and security')
  .option('-f, --focus <focus>', 'Focus area (security|performance|best-practices|all)', 'all')
  .action((file: string, options: any) => {
    reviewCommand({ file, ...options })
  })

program
  .command('ai:document <file>')
  .description('Generate documentation for code')
  .option('-o, --output <path>', 'Output file path')
  .option('-f, --format <format>', 'Documentation format (markdown|phpdoc|jsdoc)')
  .action((file: string, options: any) => {
    documentCommand({ file, ...options })
  })
```

- [ ] **Step 2.3: Remove the @stratawp/ai dependency from packages/cli/package.json**

Edit `packages/cli/package.json` and remove this exact line:

```json
    "@stratawp/ai": "workspace:*",
```

- [ ] **Step 2.4: Delete the packages/ai/ directory**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && git rm -r packages/ai
```

- [ ] **Step 2.5: Refresh the lockfile**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && pnpm install 2>&1 | tail -10
```

Expected: `Done in <time>` with no errors.

- [ ] **Step 2.6: Verify CLI build still succeeds**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && pnpm -F @stratawp/cli build 2>&1 | tail -10
```

Expected: build succeeds. If "Cannot find module '@stratawp/ai'" — you missed a removal in 2.1 or 2.2.

- [ ] **Step 2.7: Verify ai: commands no longer in --help**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && node packages/cli/dist/index.js --help | grep -cE "^\s+ai:" || echo "0 (none — good)"
```

Expected: `0 (none — good)`.

- [ ] **Step 2.8: Commit**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && git add -A && git status -sb | head -20
```

Verify staged: `packages/cli/src/index.ts`, `packages/cli/package.json`, deleted `packages/ai/...`, modified `pnpm-lock.yaml`. Then:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && git commit -m "chore: remove @stratawp/ai package

Drops the AI helper package. Every editor now has AI built in
(MCP, Claude Code, Copilot, Cursor) — a framework-embedded AI SDK is
a shrinking-value commitment, not a differentiator.

- Removes packages/ai/
- Removes @stratawp/ai workspace dep from @stratawp/cli
- Removes the 4 ai:* CLI commands and their import block
- Regenerates pnpm-lock.yaml

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Remove @stratawp/studio and Studio docs

**Files:**

- Delete: `packages/studio/` (whole directory)
- Delete: `docs/STUDIO.md`
- Delete: `docs/plans/2026-01-26-save-pattern-plugin.md`
- Delete: `docs/plans/2026-01-26-pattern-library-design.md`
- Delete: `docs/plans/2026-01-26-pattern-library-phase2.md`
- Delete: `docs/plans/2026-01-26-block-library-design.md`
- Auto-update: `pnpm-lock.yaml`

Studio is not imported by the CLI or by `packages/core` (verified during planning). No source edits to other packages are needed — only directory + doc deletions.

- [ ] **Step 3.1: Delete the packages/studio/ directory**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && git rm -r packages/studio
```

Expected: many `rm 'packages/studio/...'` lines (54 src files + build artefacts).

- [ ] **Step 3.2: Delete the Studio docs**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && git rm docs/STUDIO.md docs/plans/2026-01-26-save-pattern-plugin.md docs/plans/2026-01-26-pattern-library-design.md docs/plans/2026-01-26-pattern-library-phase2.md docs/plans/2026-01-26-block-library-design.md
```

Expected: 5 `rm '...'` lines.

- [ ] **Step 3.3: Refresh the lockfile**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && pnpm install 2>&1 | tail -10
```

Expected: `Done in <time>` with no errors.

- [ ] **Step 3.4: Verify the full monorepo builds**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && pnpm build 2>&1 | tail -20
```

Expected: all remaining packages build without error. If a package fails because it imported something from Studio, that's an undocumented dependency — stop and bring the build output back before continuing.

- [ ] **Step 3.5: Verify the full test suite passes**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && pnpm test 2>&1 | tail -20
```

Expected: all tests pass. If a test fails due to a now-missing module, that's an undocumented dependency — stop and surface the output.

- [ ] **Step 3.6: Commit**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && git add -A && git status -sb | head -20
```

Verify staged: deleted `packages/studio/...`, deleted `docs/STUDIO.md`, deleted 4× `docs/plans/2026-01-26-*.md`, modified `pnpm-lock.yaml`. Then:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && git commit -m "chore: remove @stratawp/studio package and Studio docs

Drops the Studio admin UI. Admin UIs duplicate what the Site Editor
and your IDE already do well; maintaining a custom React admin app
outweighs the value for the framework's target audience.

- Removes packages/studio/ (54 src files)
- Removes docs/STUDIO.md
- Removes 4 docs/plans/2026-01-26-* Studio implementation plans
- Regenerates pnpm-lock.yaml

Studio's REST controllers and admin page registration lived inside
packages/studio/, so packages/core needs no edits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Rewrite documentation

**Files:**

- Modify: `README.md`
- Modify: `CHEAT_SHEET.md`
- Modify: `GETTING_STARTED.md`
- Modify: `CLAUDE.md`
- Modify: `DEVELOPMENT_NOTES.md`

Each edit uses the Edit tool with `old_string` = exact existing text and `new_string` = the replacement (often empty for deletions).

### README.md edits

- [ ] **Step 4.1: README — remove the Studio Guide row from the documentation table**

In `README.md`, replace:

```markdown
| **[Studio Guide](./docs/STUDIO.md)** | Design System, Block Library & Pattern Management |
| **[Deployment Guide](./docs/deployment/getting-started.md)** | Basic deployment with SFTP/FTP/SSH |
```

with:

```markdown
| **[Deployment Guide](./docs/deployment/getting-started.md)** | Basic deployment with SFTP/FTP/SSH |
```

- [ ] **Step 4.2: README — remove three "Why StrataWP?" bullets**

In `README.md`, replace:

```markdown
- **Design Systems**: Tailwind CSS or UnoCSS with WordPress preset mappings
- **Studio Admin**: Visual design tokens editor and pattern library management
- **AI-Assisted Dev**: OpenAI GPT-4 and Anthropic Claude integration
- **Component Registry**: npm-powered registry for sharing components
- **Comprehensive Testing**: Vitest unit tests, Playwright E2E
```

with:

```markdown
- **Design Systems**: Tailwind CSS or UnoCSS with WordPress preset mappings
- **Comprehensive Testing**: Vitest unit tests, Playwright E2E
```

- [ ] **Step 4.3: README — update the Project Structure tree**

In `README.md`, replace:

```markdown
├── packages/
│ ├── ai/ # AI-assisted development (OpenAI, Anthropic)
│ ├── cli/ # CLI tool (create-stratawp, stratawp commands)
│ ├── core/ # PHP framework core
│ ├── explorer/ # Interactive component browser
│ ├── headless/ # REST API client, React hooks, Next.js
│ ├── registry/ # Component registry
│ ├── studio/ # Visual design system & pattern management
│ ├── sync/ # Environment sync, snapshots, rollback
│ ├── testing/ # Vitest and Playwright testing utilities
│ └── vite-plugin/ # Vite integration for WordPress
```

with:

```markdown
├── packages/
│ ├── cli/ # CLI tool (create-stratawp, stratawp commands)
│ ├── core/ # PHP framework core
│ ├── explorer/ # Interactive component browser
│ ├── headless/ # REST API client, React hooks, Next.js
│ ├── sync/ # Environment sync, snapshots, rollback
│ ├── testing/ # Vitest and Playwright testing utilities
│ └── vite-plugin/ # Vite integration for WordPress
```

- [ ] **Step 4.4: README — remove the AI + Component Registry CLI examples**

In `README.md`, replace:

```markdown
# AI-assisted development

stratawp ai:setup
stratawp ai:generate block
stratawp ai:review functions.php --focus security

# Component registry

stratawp registry:search hero
stratawp registry:install @stratawp/hero-block

# Deployment
```

with:

```markdown
# Deployment
```

- [ ] **Step 4.5: README — remove three Published Packages list entries**

In `README.md`, replace:

```markdown
- [@stratawp/ai](https://www.npmjs.com/package/@stratawp/ai) - AI tools
- [@stratawp/registry](https://www.npmjs.com/package/@stratawp/registry) - Component registry
- [@stratawp/studio](https://www.npmjs.com/package/@stratawp/studio) - Visual design system & pattern management
- [@stratawp/sync](https://www.npmjs.com/package/@stratawp/sync) - Environment sync
```

with:

```markdown
- [@stratawp/sync](https://www.npmjs.com/package/@stratawp/sync) - Environment sync
```

### CHEAT_SHEET.md edits

- [ ] **Step 4.6: CHEAT_SHEET — remove the AI Commands section**

In `CHEAT_SHEET.md`, replace:

````markdown
### AI Commands

```bash
stratawp ai:setup                           # Configure AI provider
stratawp ai:generate <type>                 # Generate code (block|component|pattern)
stratawp ai:review <file> [options]         # Code review
  --focus <focus>                           # security|performance|best-practices|all
stratawp ai:document <file> [options]       # Generate docs
  --format <format>                         # markdown|phpdoc|jsdoc
```

### Registry

```bash
stratawp registry:search <query> [options]
  --type <type>              # Filter by type
  --limit <number>           # Max results (default: 20)

stratawp registry:install <component> [options]
  --version <version>        # Specific version
  --force                    # Overwrite existing
  --target-dir <dir>         # Custom directory

stratawp registry:info <component>         # Component details
stratawp registry:list                     # List installed
stratawp registry:publish [options]        # Publish component
  --tag <tag>                # Publish tag
  --dry-run                  # Test without publishing
```

### Testing
````

with:

```markdown
### Testing
```

### GETTING_STARTED.md edits

- [ ] **Step 4.7: GETTING_STARTED — find exact bounds of the AI section**

Run (to confirm the section's current line range before editing):

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && awk '/^### AI-Assisted Development/{start=NR} start && /^### /{ if (NR > start) { print start" - "(NR-1); exit }} END { if (start && !done) print start" - "NR }' GETTING_STARTED.md
```

Expected: a range like `688 - 706`. The section begins with `### AI-Assisted Development` and ends just before the next `###` heading (Component Registry).

- [ ] **Step 4.8: GETTING_STARTED — delete the AI-Assisted Development section**

Read `GETTING_STARTED.md` at the line range found in 4.7 to copy the exact section text, then delete it. The section starts with `### AI-Assisted Development` and includes the heading plus the code block(s) under it. Stop one line before the next `### ` heading (`### Component Registry`).

Using the Edit tool: `old_string` = the full section text (heading + body + the blank line that separates it from the next heading); `new_string` = empty string.

- [ ] **Step 4.9: GETTING_STARTED — find exact bounds of the Component Registry section**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && awk '/^### Component Registry/{start=NR} start && /^### /{ if (NR > start) { print start" - "(NR-1); exit }} END { if (start && !done) print start" - "NR }' GETTING_STARTED.md
```

Expected: a range like `707 - 720` (was 707-720 before AI section was removed; after step 4.8 the line numbers shift down by however many lines AI took).

- [ ] **Step 4.10: GETTING_STARTED — delete the Component Registry section**

Same approach as 4.8: Read the section to capture exact text, then Edit with `old_string` = section text, `new_string` = empty string. The section starts at `### Component Registry` and ends one line before the next `### ` heading.

- [ ] **Step 4.11: GETTING_STARTED — remove the "publish components" step and renumber the Advanced list**

In `GETTING_STARTED.md`, replace this exact block:

```markdown
**Advanced:**

1. Build headless apps with `@stratawp/headless`
2. Create and publish components to registry
3. Contribute to StrataWP core
4. Build custom Vite plugins
5. Create advanced block patterns
```

with:

```markdown
**Advanced:**

1. Build headless apps with `@stratawp/headless`
2. Contribute to StrataWP core
3. Build custom Vite plugins
4. Create advanced block patterns
```

(Removes the registry item and renumbers 3-5 down to 2-4.)

- [ ] **Step 4.12: GETTING_STARTED — remove the Component Registry README link**

In `GETTING_STARTED.md`, replace:

```markdown
- [Component Registry](./packages/registry/README.md)
```

with empty string.

- [ ] **Step 4.13: GETTING_STARTED — remove the bottom-of-file registry CLI summary**

In `GETTING_STARTED.md`, replace:

```markdown
# Component Registry

npx stratawp registry:search <query>
npx stratawp registry:install <package>
```

with empty string. (If there's a surrounding blank line, include it so the file doesn't end up with two consecutive blank lines.)

### CLAUDE.md edits

- [ ] **Step 4.14: CLAUDE — remove packages/ai and packages/registry from the monorepo list**

In `CLAUDE.md`, replace:

```markdown
- **packages/ai**: AI-assisted development (OpenAI GPT-4, Anthropic Claude)
- **packages/registry**: npm-powered component registry
- **packages/explorer**: Interactive component browser (Storybook-like)
```

with:

```markdown
- **packages/explorer**: Interactive component browser (Storybook-like)
```

- [ ] **Step 4.15: CLAUDE — remove @stratawp/ai and @stratawp/registry from the published-packages list**

In `CLAUDE.md`, replace (around lines 609-610):

```markdown
- `@stratawp/ai` - AI tools
- `@stratawp/registry` - Component registry
```

with empty string. (If the next line is `- @stratawp/studio`, that's also removed in step 4.16 below — keep this step focused on ai and registry only.)

- [ ] **Step 4.16: CLAUDE — locate the Studio Package section and confirm its bounds**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && awk '/^## Studio Package/{start=NR} start && /^## /{ if (NR > start) { print start" - "(NR-1); exit }} END { if (start && !done) print start" - "NR }' CLAUDE.md
```

Expected: a range like `617 - 700` (a section of ~80 lines covering Building Studio, Installing Studio in a Theme, Troubleshooting Studio, Studio REST API Performance, ending before the next `## ` heading or EOF). The exact end line will depend on where the next `## ` heading sits.

- [ ] **Step 4.17: CLAUDE — delete the entire Studio Package section**

Read `CLAUDE.md` at the range from 4.16 to capture the exact text. Use the Edit tool with `old_string` = the full section (starting with `## Studio Package` and ending one line before the next `## ` heading, or to EOF if the section is last); `new_string` = empty string.

If the section also contains a `- @stratawp/studio` entry in a list that wasn't removed in step 4.15, it will be removed as part of this whole-section deletion. After this edit, verify with:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && grep -c -iE "studio" CLAUDE.md
```

Expected: `0`. If non-zero, grep again to find what was missed.

### DEVELOPMENT_NOTES.md edit

- [ ] **Step 4.18: DEVELOPMENT_NOTES — remove the "Component registry" bullet**

In `DEVELOPMENT_NOTES.md`, replace:

```markdown
- PHP Hot Module Replacement
- Component registry for reusability
```

with:

```markdown
- PHP Hot Module Replacement
```

### Verify and commit

- [ ] **Step 4.19: Verify no remaining stale references in docs**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && grep -rn -iE "@stratawp/(ai|registry|studio)|packages/(ai|registry|studio)|stratawp ai:|stratawp registry:|StrataWP\\\\Studio|docs/STUDIO\.md" README.md CHEAT_SHEET.md GETTING_STARTED.md CLAUDE.md DEVELOPMENT_NOTES.md CONTRIBUTING.md 2>/dev/null
```

Expected: zero output (no matches). If any line prints, investigate and remove with another targeted Edit before committing.

- [ ] **Step 4.20: Commit**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && git add -A && git status -sb | head -20
```

Verify staged: `README.md`, `CHEAT_SHEET.md`, `GETTING_STARTED.md`, `CLAUDE.md`, `DEVELOPMENT_NOTES.md`. Then:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && git commit -m "docs: update README, CHEAT_SHEET, GETTING_STARTED, CLAUDE, DEVELOPMENT_NOTES for v2 scope

Strips all references to the three cut packages from the top-level
documentation:

- README.md: dropped Studio Guide doc-table row, three 'Why StrataWP?'
  feature bullets, three project-structure tree entries, the AI and
  Registry CLI examples, and three published-packages bullets.
- CHEAT_SHEET.md: deleted AI Commands and Registry sections.
- GETTING_STARTED.md: deleted AI-Assisted Development section,
  Component Registry section, and trailing registry summary.
- CLAUDE.md: dropped packages/ai and packages/registry from the
  monorepo list, dropped two published-package bullets, and removed
  the entire ~80-line Studio Package section.
- DEVELOPMENT_NOTES.md: removed the 'Component registry for
  reusability' feature bullet.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Add ROADMAP.md

**Files:**

- Create: `ROADMAP.md`

- [ ] **Step 5.1: Create ROADMAP.md with the agreed content**

Use the Write tool to create `ROADMAP.md` at the repo root with this exact content:

```markdown
# StrataWP Roadmap

## What StrataWP is (and isn't)

A modern, type-safe scaffolding + dev server + deploy pipeline for WordPress block themes, with a small library of opt-in PHP Components for the boring stuff every theme needs.

**Not an admin UI. Not an AI SDK. Not a component registry.** The framework is **CLI + Vite plugin + PHP Components + Sync.**

## v2.0 — Focus (this release)

### Removed

- **`@stratawp/studio`** — Admin UIs duplicate what the Site Editor and your IDE already do well. A custom React admin app is a large maintenance commitment that doesn't fit the audience StrataWP serves (developers building production block themes).
- **`@stratawp/registry`** — A custom component registry needs critical mass to be useful, and we don't have it. npm + private packages already solve the "share components between projects" problem without locking anyone into our ecosystem.
- **`@stratawp/ai`** — Every editor now ships AI (MCP, Claude Code, Copilot, Cursor). A framework-embedded AI SDK is a shrinking-value commitment that adds maintenance burden without differentiating.

### Under review for v2.1

These packages aren't being cut now, but warrant an honest look:

- **`@stratawp/explorer`** — Storybook is widely understood and works fine for the niche audience that wants a component browser. If `explorer` isn't actively used or maintained, recommending Storybook in its place removes a package we'd otherwise have to keep building.
- **`@stratawp/headless`** — The typed REST client carries ongoing cost as WordPress core changes shape. If headless WP isn't actively being built on, it's worth removing rather than letting it drift out of date.

Decision criterion for both: real usage signal (downloads, issues, recent commits) and active maintenance interest.

## What we're investing in (ranked by leverage)

1. **Git-based deployer.** The v1.0 CHANGELOG advertised "SFTP, FTP, SSH/rsync (coming soon), Git (coming soon)." SSH/rsync landed in v1.6; Git is the last unshipped promise. Finishing it gives push-to-deploy workflows that fit the deployment arc.
2. **`stratawp doctor`.** A diagnostic CLI command that finds broken symlinks (common in Local by Flywheel setups), invalid `theme.json` schemas, missing PHP Components the theme expects, deploy config mistakes, and PHP/Node version mismatches. Cheap to build, dramatically reduces support overhead.
3. **Type-safe `block.json` codegen.** The Vite plugin generates TypeScript types from each block's `block.json` so attributes are typed in `edit.tsx` / `save.tsx`. Nothing else in the WP ecosystem does this well — it's the kind of feature that becomes a talking-point.
4. **`stratawp adopt`.** A retrofit command for existing themes, not just greenfield. Removes the biggest current adoption barrier: developers with running themes who'd otherwise have to migrate from scratch.
5. **New PHP Components.** Candidate list, picked one at a time based on demand: **Errors** (Sentry/Bugsnag), **Cookies/Consent** (pairs with `Analytics`), **Forms** (lightweight, no Gravity Forms dependency), **Cache** (object cache helpers with WP-CLI integration).
6. **Performance budgets in `build`.** Fail the build if JS or CSS exceeds thresholds in `stratawp.config.ts`. One day of work, lifelong payoff for any team that ships to production.

## What we're explicitly not building

- **Admin UIs.** The Site Editor handles design tokens, templates, and patterns. Your IDE handles code. We don't need a third surface.
- **AI SDK lock-in.** MCP, Claude Code, Copilot, and Cursor are where AI lives now. Recommending them in the docs beats baking in a wrapper.
- **A component registry.** Use npm. If you need privacy, use private npm packages or a private registry like Verdaccio. We don't need to be in that business.
```

(That's the literal file contents. Note this uses ``` ` `` `` `` ` `` ``` fences inside markdown — when the engineer uses Write, they pass the markdown as-is; nothing about the surrounding fenced block in this plan is part of the file.)

- [ ] **Step 5.2: Verify the file rendered correctly**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && wc -l ROADMAP.md && head -5 ROADMAP.md && tail -3 ROADMAP.md
```

Expected: line count around 45–50; first line `# StrataWP Roadmap`; last line ends with a period (or blank line) — no accidental fence remnants.

- [ ] **Step 5.3: Commit**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && git add ROADMAP.md && git commit -m "docs: add ROADMAP.md

Captures the sharpened v2 scope, the rationale for the three cuts
(Studio / Registry / AI), the v2.1 candidates under review (Explorer
/ Headless), and the ranked investment list for what we are building.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Release prep — version bumps + CHANGELOG + final verification

**Files:**

- Modify: `package.json` (root) — bump version 1.2.0 → 2.0.0
- Modify: `packages/cli/package.json` — bump version 1.2.0 → 2.0.0
- Modify: `packages/cli/src/index.ts` — bump hardcoded `.version('1.0.0')` → `'2.0.0'`
- Modify: `CHANGELOG.md` — prepend v2.0.0 entry

- [ ] **Step 6.1: Bump root version**

In `/Users/jon.imms/Local Sites/stratawp/strataWP/package.json`, replace:

```json
  "version": "1.2.0",
```

with:

```json
  "version": "2.0.0",
```

- [ ] **Step 6.2: Bump CLI package version**

In `packages/cli/package.json`, replace:

```json
  "version": "1.2.0",
```

with:

```json
  "version": "2.0.0",
```

- [ ] **Step 6.3: Bump the hardcoded `.version()` in the CLI entry point**

This is a bug-fix-while-we're-here: `packages/cli/src/index.ts` line 51 has `program.version('1.0.0')` hardcoded — stale from before the v1.2 era. Edit the file and replace:

```typescript
  .version('1.0.0')
```

with:

```typescript
  .version('2.0.0')
```

- [ ] **Step 6.4: Prepend the v2.0.0 CHANGELOG entry**

In `CHANGELOG.md`, find the line:

```markdown
## v1.6.0 - Deployment Overhaul
```

and replace it with:

```markdown
## v2.0.0 - Focus

**Sharpen the scope. Cut what doesn't fit.**

This release deletes three packages from the monorepo so the framework stops trying to be everything. The deletions are the feature.

### Removed

- **`@stratawp/studio`** — admin UI for design tokens, block library, and pattern management. Removed: admin UIs duplicate what the Site Editor and your IDE already do well, and the maintenance burden of a React admin app doesn't fit StrataWP's audience.
- **`@stratawp/registry`** — npm-powered component registry. Removed: a custom registry needs critical mass we don't have, and npm + private packages already cover the use case.
- **`@stratawp/ai`** — AI helper SDK (OpenAI, Anthropic). Removed: every editor now ships AI (MCP, Claude Code, Copilot, Cursor), making a framework-embedded SDK a shrinking-value commitment.

### CLI changes

- `stratawp ai:setup`, `ai:generate`, `ai:review`, `ai:document` removed.
- `stratawp registry:search`, `registry:install`, `registry:info`, `registry:publish`, `registry:list` removed.
- CLI binary now reports the correct version (was hardcoded to `1.0.0`; now reads as `2.0.0`).

### Docs

- New `ROADMAP.md` at the repo root captures the sharpened scope, the rationale for the cuts, and the ranked investment list for upcoming work.
- README, CHEAT_SHEET, GETTING_STARTED, CLAUDE.md, and DEVELOPMENT_NOTES.md rewritten to match.

### Migration

- If you were using `@stratawp/cli` registry or AI commands, drop them from your scripts and use `npm` directly or your editor's AI features.
- If you embedded `@stratawp/studio` in a theme via `vendor/stratawp/studio/`, that integration will continue to work against the last published 1.x release (now `npm deprecate`d) but receives no further updates. To migrate off it, use the Site Editor for design tokens, templates, and patterns.

### What's still here

`@stratawp/cli`, `@stratawp/vite-plugin`, `@stratawp/core` (PHP), `@stratawp/sync`, `@stratawp/testing`, `@stratawp/headless`, `@stratawp/explorer`. The last two are under review for v2.1.

See [`ROADMAP.md`](./ROADMAP.md) for the full picture.

---

## v1.6.0 - Deployment Overhaul
```

(I.e. the new `## v2.0.0 - Focus` section is inserted directly above the existing `## v1.6.0 - Deployment Overhaul` heading, separated by a single horizontal rule and blank line.)

- [ ] **Step 6.5: Final cross-repo grep for orphaned references**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && grep -rn -iE "@stratawp/(ai|registry|studio)|packages/(ai|registry|studio)|StrataWP\\\\Studio" packages/ examples/ docs/ README.md CHEAT_SHEET.md GETTING_STARTED.md CLAUDE.md DEVELOPMENT_NOTES.md CONTRIBUTING.md ROADMAP.md CHANGELOG.md 2>/dev/null | grep -v node_modules | grep -vE "(CHANGELOG\.md|ROADMAP\.md):"
```

Expected: zero output. The `grep -vE` excludes intentional historical mentions in CHANGELOG.md and ROADMAP.md. If anything else prints, investigate before committing.

- [ ] **Step 6.6: Full build**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && pnpm install && pnpm build 2>&1 | tail -20
```

Expected: clean install, all remaining packages build.

- [ ] **Step 6.7: Full test suite**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && pnpm test 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 6.8: Verify CLI binary shows the new version**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && node packages/cli/dist/index.js --version
```

Expected: `2.0.0`.

- [ ] **Step 6.9: Verify CLI --help is clean**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && node packages/cli/dist/index.js --help | grep -cE "^\s+(registry|ai):" || echo "0 (none — good)"
```

Expected: `0 (none — good)`.

- [ ] **Step 6.10: Commit**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && git add -A && git status -sb | head -10
```

Verify staged: `package.json`, `packages/cli/package.json`, `packages/cli/src/index.ts`, `CHANGELOG.md`. Then:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && git commit -m "chore(release): bump root + @stratawp/cli to 2.0.0, CHANGELOG entry

- Root package.json: 1.2.0 → 2.0.0
- packages/cli/package.json: 1.2.0 → 2.0.0
- packages/cli/src/index.ts: .version('1.0.0') → .version('2.0.0')
  (was hardcoded and stale — pre-dates the v1.2 era)
- CHANGELOG.md: prepended v2.0.0 'Focus' entry with cut rationale,
  CLI changes, docs updates, and migration notes

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Open the PR

**Files:** none directly — uses `gh` CLI.

- [ ] **Step 7.1: Push the feature branch**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && git push -u origin feat/v2-focus-cuts 2>&1 | tail -5
```

Expected: `* [new branch]      feat/v2-focus-cuts -> feat/v2-focus-cuts` and a "Create a pull request" hint.

- [ ] **Step 7.2: Open the PR with `gh`**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && gh pr create \
  --title "v2.0 — Focus release: remove Studio, Registry, AI" \
  --body "$(cat <<'EOF'
## Summary

StrataWP v2.0 sharpens scope by deleting three packages that don't fit the framework's audience or pull their weight:

- **\`@stratawp/studio\`** — admin UI duplicating Site Editor + IDE
- **\`@stratawp/registry\`** — cold-start problem; npm covers the use case
- **\`@stratawp/ai\`** — every editor has AI now (MCP, Claude Code, Copilot)

See the new \`ROADMAP.md\` for the sharpened pitch and the ranked investment list.

## Commits

Per-commit, ordered so each cut is independently revertable:

1. \`chore: remove @stratawp/registry package\`
2. \`chore: remove @stratawp/ai package\`
3. \`chore: remove @stratawp/studio package and Studio docs\`
4. \`docs: update README, CHEAT_SHEET, GETTING_STARTED, CLAUDE, DEVELOPMENT_NOTES for v2 scope\`
5. \`docs: add ROADMAP.md\`
6. \`chore(release): bump root + @stratawp/cli to 2.0.0, CHANGELOG entry\`

## After merge (manual)

- \`git tag -a v2.0.0\` + push
- \`gh release create v2.0.0\`
- \`npm publish\` for \`@stratawp/cli@2.0.0\`
- \`npm deprecate\` the three retired packages with a pointer to ROADMAP

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL printed. Capture it for the post-merge tasks.

- [ ] **Step 7.3: Self-review the PR diff**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && gh pr view --web
```

This opens the PR in the browser. Scroll the Files Changed tab and confirm:

- The three package directories are entirely deleted (just the `--- /dev/null` and `+++ b/dev/null` style entries, no surprise content).
- The CLI `index.ts` diff shows only the targeted import + command removals plus the version bump (no other functional changes).
- The README/CHEAT_SHEET/GETTING_STARTED/CLAUDE.md edits match what's described in Task 4.
- The CHANGELOG entry reads cleanly.
- `pnpm-lock.yaml` churn is large but expected.

Stop here if the diff doesn't look right and fix before merging.

---

## Task 8: Post-merge — tag, release, npm publish, npm deprecate (MANUAL)

**Context:** These commands need npm auth and human judgement on timing. They run after the PR is merged to `main`. Claude cannot execute the `npm` commands — print them ready-to-paste and let the human run them.

- [ ] **Step 8.1: Merge the PR (in GitHub UI or via gh)**

In the GitHub UI: choose "Create a merge commit" (NOT squash) so the six-commit narrative is preserved on `main`. Alternatively:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && gh pr merge --merge --delete-branch
```

(`--merge` = create a merge commit; `--delete-branch` removes the feature branch after merge.)

- [ ] **Step 8.2: Pull main locally**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && git checkout main && git pull origin main
```

Expected: clean fast-forward including the six new commits.

- [ ] **Step 8.3: Tag v2.0.0**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && git tag -a v2.0.0 -m "v2.0 — Focus release: remove Studio, Registry, AI" && git push origin v2.0.0
```

Expected: tag pushed; output shows `* [new tag]         v2.0.0 -> v2.0.0`.

- [ ] **Step 8.4: Create the GitHub Release**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && gh release create v2.0.0 \
  --title "v2.0 — Focus" \
  --notes-file <(awk '/^## v2\.0\.0/{flag=1} flag && /^## v1\.6\.0/{exit} flag' CHANGELOG.md)
```

Expected: release URL printed. The `awk` pipe extracts the v2.0.0 section from CHANGELOG.md (everything from `## v2.0.0` up to but not including the next `## v1.6.0`).

- [ ] **Step 8.5: Publish @stratawp/cli@2.0.0**

Run:

```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP" && pnpm -F @stratawp/cli build && cd packages/cli && npm publish --access public
```

Expected: `npm notice` block followed by `+ @stratawp/cli@2.0.0`. If you hit `ENEEDAUTH`, run `npm login` first.

- [ ] **Step 8.6: Deprecate the three retired npm packages**

Run each in turn (the trailing URL points at ROADMAP.md on `main`):

```bash
npm deprecate "@stratawp/studio@*"   "Removed in StrataWP v2.0 to sharpen scope. See https://github.com/JonImmsWordpressDev/strataWP/blob/main/ROADMAP.md"

npm deprecate "@stratawp/registry@*" "Removed in StrataWP v2.0 to sharpen scope. See https://github.com/JonImmsWordpressDev/strataWP/blob/main/ROADMAP.md"

npm deprecate "@stratawp/ai@*"       "Removed in StrataWP v2.0 to sharpen scope. See https://github.com/JonImmsWordpressDev/strataWP/blob/main/ROADMAP.md"
```

Expected: each command exits with no output on success. Verify with:

```bash
npm view @stratawp/studio deprecated
npm view @stratawp/registry deprecated
npm view @stratawp/ai deprecated
```

Each should print the deprecation message.

- [ ] **Step 8.7: Done**

Smoke-test the published CLI from a scratch directory:

```bash
cd /tmp && mkdir stratawp-v2-smoketest && cd stratawp-v2-smoketest && npm install @stratawp/cli@2.0.0 && npx stratawp --version
```

Expected: `2.0.0`.

Tear down:

```bash
rm -rf /tmp/stratawp-v2-smoketest
```

If the smoke test passes, v2.0.0 is live.

---

## Rollback notes

- **Inside the feature branch:** any single commit can be reverted with `git revert <sha>` before pushing. The per-commit structure was chosen specifically to make this trivial.
- **After PR open, pre-merge:** force-push fixes to the branch, or close the PR and start over.
- **After merge, pre-tag:** revert specific commits on `main` via PR; nothing is published yet.
- **After tag + GitHub Release, pre-npm-publish:** `git tag -d v2.0.0 && git push origin :refs/tags/v2.0.0` to remove the tag; `gh release delete v2.0.0` to delete the release.
- **After npm publish:** publish a `2.0.1` patch with whatever needs fixing. To restore a deleted package, `git revert` the removal commit on a new branch and re-publish. Source for all deleted code remains in git history indefinitely.
- **`npm deprecate` is reversible:** `npm deprecate "@stratawp/studio@*" ""` (empty string) removes the deprecation.
