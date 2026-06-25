# Phase 4 WS-A — `@stratawp/mcp` MCP server — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a first-party stdio **MCP server** (`@stratawp/mcp`) that exposes StrataWP's four CLI generators as zod-typed `scaffold_*` tools and the explorer's component catalog as read-only resources — with a snapshot-gated tool contract enforced by a new CI job. No hosted LLM, no provider keys: a deterministic protocol surface the user's own editor agent drives.

**Architecture:** Refactor each CLI generator's core into a **pure, value-returning** function (`(input) => { files: {path,content}[]; messages: string[] }`) shared by the Commander command and the MCP tool — the core never touches `process.exit`/`console`/`fs`/`cwd`. A new `packages/mcp` (built with `tsup`, cloned from `packages/cli`) registers the tools (which call the pure cores and write files into an explicit input dir) + resources (from `ComponentDiscovery.discoverAll()`), served over stdio with all logging to stderr. The emitted JSON-Schema tool contract is snapshotted and `git diff --exit-code`-gated by a new single-runner `contracts` CI job.

**Tech Stack:** `@modelcontextprotocol/sdk ^1.29.0` (stable v1.x — deep imports `…/server/mcp.js`, `…/server/stdio.js`, `…/inMemory.js`; **NOT** the v2 alpha), `zod ^3.25` (single hoisted copy), `tsup`, `vitest`, pnpm + Turbo 1.x, Node 18–24.

**Codename discipline:** competitor = **Triple XXX** in every committed artifact; never the real name. **Explicit `git add <path>` only — never `git add -A`/`git add .`** (untracked, non-ignored `.mcp.json`/`.claude*`/`*.rvf`/`*.db`/`.stratawp-snapshots/` and a stray `docs/superpowers/plans/2026-04-26-*.md` whose filename embeds the competitor name would be swept in). `@stratawp/mcp` is a SHIPPED PRODUCT — unrelated to the repo's `.mcp.json` dev harness.

**Reference:** Spec `docs/superpowers/specs/2026-06-25-ai-readiness-design.md`.

---

## File structure

**Create:**
- `packages/mcp/package.json`, `tsconfig.json`, `tsup.config.ts`
- `packages/mcp/src/index.ts` — bin entry (stdio transport)
- `packages/mcp/src/server.ts` — `createServer()` building the McpServer (tools + resources)
- `packages/mcp/src/tools.ts` — the four `scaffold_*` tool registrations (zod schemas)
- `packages/mcp/src/resources.ts` — the read resources (explorer discovery)
- `packages/mcp/src/snapshot.ts` — emits `contracts/tools.snapshot.json`
- `packages/mcp/contracts/tools.snapshot.json` — committed tool contract (draft-07)
- `packages/mcp/src/*.test.ts` — vitest (InMemoryTransport) + a spawned-bin stdout test
- `packages/cli/src/generators/*.ts` (or extend `packages/cli/src/utils/templates.ts`) — the pure cores
- `scripts/check-contracts.mjs` — regen-and-diff helper for `contracts:check`

**Modify:**
- `packages/cli/src/commands/{block,component,template,part}.ts` — call the pure cores; keep IO/cwd/prompts/exit/existence-guard/inference
- root `package.json` — add `"contracts:check"` script
- `.github/workflows/ci.yml` — add the `contracts` job
- `pnpm-lock.yaml` — regenerated (new deps)
- `CHANGELOG.md:549` — one-line annotation that the v0.4.0 AI feature was removed in v2.0

---

## Task 0: Commit this plan

- [ ] **Step 1:** `git branch --show-current` → expect `feat/ai-readiness`.
- [ ] **Step 2:** Commit the plan (the spec is already committed):
```bash
git add docs/superpowers/plans/2026-06-25-ai-readiness-ws-a-implementation.md
git commit -m "docs(ai-readiness): WS-A (MCP server) implementation plan"
```
Expected: `git status` shows only pre-existing untracked tooling artifacts (none staged).

---

## Task 1: Scaffold `packages/mcp` (deps + build wiring)

**Files:** create `packages/mcp/{package.json,tsconfig.json,tsup.config.ts,src/index.ts}`; modify `pnpm-lock.yaml`.

- [ ] **Step 1: package.json.** Create `packages/mcp/package.json` (mirror `packages/cli`'s build shape; **declare `build`/`typecheck`/`test` or turbo skips them**):
```json
{
  "name": "@stratawp/mcp",
  "version": "0.1.0",
  "description": "StrataWP MCP server — exposes the framework's generators and component catalog to AI agents",
  "license": "GPL-3.0-or-later",
  "type": "module",
  "bin": { "stratawp-mcp": "./dist/index.js" },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "snapshot": "node ./dist/snapshot.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.29.0",
    "@stratawp/cli": "workspace:*",
    "@stratawp/explorer": "workspace:*",
    "zod": "^3.25"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.3.3",
    "vitest": "^1.0.4"
  },
  "engines": { "node": ">=18.18" }
}
```
(Match the exact `tsup`/`typescript`/`vitest` versions used by `packages/cli` — read its package.json and align.)

- [ ] **Step 2: tsconfig + tsup.** Clone `packages/cli/tsconfig.json` and `packages/cli/tsup.config.ts` into `packages/mcp` (esm, `dts: true`, `clean: true`, `sourcemap: true`, `shims: true`, `#!/usr/bin/env node` banner; `external: ['@modelcontextprotocol/sdk']`). Entries: `src/index.ts` and `src/snapshot.ts`.

- [ ] **Step 3: placeholder src/index.ts** so the package builds:
```ts
#!/usr/bin/env node
// eslint-disable-next-line no-console -- stderr is allowed; stdout is the protocol channel
console.error('stratawp-mcp: not yet implemented')
```

- [ ] **Step 4: install + verify single zod + build.**
```bash
pnpm install
node -e "console.log(require('node:child_process').execSync('pnpm why zod', {encoding:'utf8'}))" | head -40
```
Expected: install succeeds; **exactly one** `zod` version resolved (3.25.x) — if the SDK forces a second copy, reconcile to one (two copies break the SDK's zod `instanceof`). Then `pnpm --filter @stratawp/mcp build && pnpm --filter @stratawp/mcp typecheck` → both succeed.

- [ ] **Step 5: commit** (lockfile included — `--frozen-lockfile` reds otherwise):
```bash
git add packages/mcp/package.json packages/mcp/tsconfig.json packages/mcp/tsup.config.ts packages/mcp/src/index.ts pnpm-lock.yaml
git commit -m "feat(mcp): scaffold @stratawp/mcp package (tsup build, SDK + zod deps)"
```

---

## Task 2: Pure generator cores for component/template/part (TDD)

These three already delegate string-generation to `packages/cli/src/utils/templates.ts` — extract a pure orchestration core that returns files instead of writing them.

**Files:** create `packages/cli/src/generators/{component,template,part}.ts` (+ a shared `types.ts`); modify the matching commands; create `packages/cli/src/generators/*.test.ts`.

- [ ] **Step 1: shared result type.** Create `packages/cli/src/generators/types.ts`:
```ts
export interface GeneratedFile {
  /** Path relative to the target theme directory. */
  path: string
  content: string
}
export interface GenerateResult {
  files: GeneratedFile[]
  /** Human-readable notes for the CLI layer to print; never written to stdout by the core. */
  messages: string[]
}
```

- [ ] **Step 2: write the failing test** for the component core — `packages/cli/src/generators/component.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { generateComponent } from './component'

describe('generateComponent', () => {
  it('returns a PHP component file with the given namespace and slug', () => {
    const res = generateComponent({ name: 'Analytics', type: 'feature', namespace: 'StrataBasic' })
    expect(res.files).toHaveLength(1)
    const file = res.files[0]
    expect(file.path).toBe('inc/Components/Analytics.php')
    expect(file.content).toContain('namespace StrataBasic\\Components;')
    expect(file.content).toContain('class Analytics')
    expect(file.content).toContain('implements ComponentInterface')
  })
})
```

- [ ] **Step 3: run it — expect FAIL** (module missing): `pnpm --filter @stratawp/cli exec vitest run src/generators/component.test.ts` → FAIL.

- [ ] **Step 4: implement the pure core** `packages/cli/src/generators/component.ts`. Move the string-building from `packages/cli/src/commands/component.ts` (it already calls `generateComponentClass` in `utils/templates.ts`) into a pure function:
```ts
import { generateComponentClass } from '../utils/templates'
import type { GenerateResult } from './types'

export interface ComponentInput {
  name: string // PascalCase class name
  type: 'service' | 'feature' | 'integration' | 'custom'
  namespace: string // e.g. StrataBasic
}

export function generateComponent(input: ComponentInput): GenerateResult {
  const content = generateComponentClass(input.name, input.type, input.namespace)
  return {
    files: [{ path: `inc/Components/${input.name}.php`, content }],
    messages: [`Component ${input.name} (${input.type})`],
  }
}
```
(Adjust to the real `generateComponentClass` signature — read `utils/templates.ts`.)

- [ ] **Step 5: run the test — expect PASS.**

- [ ] **Step 6: rewire the command** `packages/cli/src/commands/component.ts` to call `generateComponent(...)` for the content, then keep its existing IO: cwd-resolution, namespace inference (it reads existing component files), the "already exists" guard, `ora` spinner, `fs` writes of `res.files`, `console.log` of `res.messages`, and `process.exit(1)` on failure. **The core must stay free of those.** Build the CLI (`pnpm --filter @stratawp/cli build`) and smoke-test `stratawp component:new` still produces the same output.

- [ ] **Step 7: repeat Steps 2–6 for `template` and `part`** (they delegate to `generateTemplateHTML` / `generatePartHTML`/`generatePartPHP`). Each gets a pure `generateTemplate`/`generatePart` core + test + command rewire. `generatePart` returns either an `.html` or `.php` file per its `markup` input.

- [ ] **Step 8: commit:**
```bash
git add packages/cli/src/generators packages/cli/src/commands/component.ts packages/cli/src/commands/template.ts packages/cli/src/commands/part.ts
git commit -m "refactor(cli): extract pure component/template/part generator cores (shared with MCP)"
```

---

## Task 3: Pure generator core for `block` (heaviest; parameterize namespace) (TDD)

`block.ts` inlines its four generators and hardcodes `stratawp/<slug>`. Extract them and make the namespace an input.

**Files:** create `packages/cli/src/generators/block.ts` + test; modify `packages/cli/src/commands/block.ts`.

- [ ] **Step 1: failing test** `packages/cli/src/generators/block.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { generateBlock } from './block'

describe('generateBlock', () => {
  it('emits block.json/edit.tsx/style + render.php for a dynamic block under the given namespace', () => {
    const res = generateBlock({ name: 'hero', namespace: 'strata-basic', type: 'dynamic', category: 'design', styleFramework: 'none' })
    const paths = res.files.map((f) => f.path).sort()
    expect(paths).toContain('src/blocks/hero/block.json')
    expect(paths).toContain('src/blocks/hero/render.php')
    const blockJson = JSON.parse(res.files.find((f) => f.path.endsWith('block.json'))!.content)
    expect(blockJson.name).toBe('strata-basic/hero') // namespace parameterized, not hardcoded stratawp/
    expect(blockJson.apiVersion).toBe(3)
  })
  it('omits render.php for a static block', () => {
    const res = generateBlock({ name: 'card', namespace: 'strata-basic', type: 'static', category: 'design', styleFramework: 'none' })
    expect(res.files.some((f) => f.path.endsWith('render.php'))).toBe(false)
  })
})
```

- [ ] **Step 2: run — expect FAIL.**

- [ ] **Step 3: implement** `packages/cli/src/generators/block.ts` — move `generateBlockConfig/Edit/Render/Styles` out of `commands/block.ts`, take `{ name, namespace, type, category, styleFramework }`, set `name: \`${namespace}/${slug}\``, return the file set (render.php only when `type === 'dynamic'`).

- [ ] **Step 4: run — expect PASS.**

- [ ] **Step 5: rewire `commands/block.ts`** to call `generateBlock(...)` then do its IO (the command derives the namespace from the theme slug as today — pass it into the core). Build CLI; smoke-test `stratawp block:new`.

- [ ] **Step 6: commit:**
```bash
git add packages/cli/src/generators/block.ts packages/cli/src/generators/block.test.ts packages/cli/src/commands/block.ts
git commit -m "refactor(cli): extract pure block generator core, parameterize namespace"
```

---

## Task 4: MCP tools (`scaffold_*`) (TDD)

**Files:** create `packages/mcp/src/{server.ts,tools.ts}`, replace `src/index.ts`, create `src/server.test.ts`.

- [ ] **Step 1: tools.ts — register the four tools.** Each declares a zod **ZodRawShape** `inputSchema` + `outputSchema`, calls the pure core, writes `res.files` under the input `targetDir`, returns `structuredContent`. Example shape:
```ts
import { z } from 'zod'
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { generateBlock } from '@stratawp/cli/generators/block' // export these from cli's package exports
// ...generateComponent, generateTemplate, generatePart

const writtenFiles = z.object({ written: z.array(z.string()), messages: z.array(z.string()) })

export function registerTools(server: McpServer): void {
  server.registerTool(
    'scaffold_block',
    {
      title: 'Scaffold a Gutenberg block',
      description: 'Create a block.json + edit/render files under src/blocks of the target theme.',
      inputSchema: {
        targetDir: z.string().describe('Absolute path to the theme directory'),
        name: z.string(),
        namespace: z.string().describe('Block namespace = theme slug, e.g. strata-basic'),
        type: z.enum(['static', 'dynamic']).default('dynamic'),
        category: z.string().default('design'),
        styleFramework: z.enum(['none', 'tailwind', 'unocss']).default('none'),
      },
      outputSchema: writtenFiles.shape,
    },
    async ({ targetDir, ...input }) => {
      const res = generateBlock(input)
      const written: string[] = []
      for (const f of res.files) {
        const abs = join(targetDir, f.path)
        await mkdir(dirname(abs), { recursive: true })
        await writeFile(abs, f.content, 'utf8')
        written.push(f.path)
      }
      const structuredContent = { written, messages: res.messages }
      return { structuredContent, content: [{ type: 'text', text: `Created ${written.length} files` }] }
    }
  )
  // scaffold_component / scaffold_template / scaffold_part — same pattern
}
```
(Verify the exact `registerTool` signature against the installed SDK — `inputSchema`/`outputSchema` are raw shapes, not `z.object()`.)

- [ ] **Step 2: server.ts:**
```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerTools } from './tools'
import { registerResources } from './resources' // Task 5

export function createServer(): McpServer {
  const server = new McpServer({ name: '@stratawp/mcp', version: '0.1.0' })
  registerTools(server)
  registerResources(server)
  return server
}
```

- [ ] **Step 3: index.ts (bin):**
```ts
#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createServer } from './server'

async function main() {
  const server = createServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
  // NEVER console.log here — stdout is the JSON-RPC channel. Use console.error for diagnostics.
}
main().catch((err) => {
  console.error('stratawp-mcp fatal:', err)
  process.exit(1)
})
```

- [ ] **Step 4: failing test** `packages/mcp/src/server.test.ts` (in-process via InMemoryTransport):
```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js'
import { createServer } from './server'

async function connect() {
  const [clientT, serverT] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: 'test', version: '0' })
  await Promise.all([createServer().connect(serverT), client.connect(clientT)])
  return client
}

describe('@stratawp/mcp server', () => {
  it('negotiates the latest protocol version', async () => {
    const client = await connect()
    expect(client.getServerVersion()).toBeDefined()
    // negotiated protocol equals the SDK's current latest (tripwire on silent SDK bump)
    expect(LATEST_PROTOCOL_VERSION).toBe('2025-11-25')
  })
  it('lists the four scaffold tools with schemas', async () => {
    const client = await connect()
    const { tools } = await client.listTools()
    expect(tools.map((t) => t.name).sort()).toEqual(
      ['scaffold_block', 'scaffold_component', 'scaffold_part', 'scaffold_template']
    )
    expect(tools.find((t) => t.name === 'scaffold_block')!.inputSchema).toBeTruthy()
  })
  it('scaffold_block writes files into the target dir and returns structuredContent', async () => {
    const client = await connect()
    const dir = await mkdtemp(join(tmpdir(), 'mcp-'))
    const res = await client.callTool({
      name: 'scaffold_block',
      arguments: { targetDir: dir, name: 'hero', namespace: 'strata-basic', type: 'dynamic' },
    })
    expect(res.structuredContent).toMatchObject({ written: expect.arrayContaining(['src/blocks/hero/block.json']) })
    const bj = JSON.parse(await readFile(join(dir, 'src/blocks/hero/block.json'), 'utf8'))
    expect(bj.name).toBe('strata-basic/hero')
  })
  it('rejects invalid input', async () => {
    const client = await connect()
    await expect(
      client.callTool({ name: 'scaffold_block', arguments: { targetDir: 1 as unknown as string, name: 'x' } })
    ).rejects.toThrow()
  })
})
```
(Verify import paths `…/client/index.js` and `…/types.js` against the installed SDK; adjust the protocol-version accessor to the real negotiated-value API if `getServerVersion` isn't it.)

- [ ] **Step 5: run — expect FAIL, then implement until PASS.** Export the pure cores from `@stratawp/cli` (add subpath exports or a `generators` index to `packages/cli/package.json` `exports`). Build cli + mcp. Run `pnpm --filter @stratawp/mcp test` → green.

- [ ] **Step 6: commit:**
```bash
git add packages/mcp/src/server.ts packages/mcp/src/tools.ts packages/mcp/src/index.ts packages/mcp/src/server.test.ts packages/cli/package.json
git commit -m "feat(mcp): scaffold_* tools backed by the pure CLI generator cores"
```

---

## Task 5: MCP resources (explorer catalog) (TDD)

**Files:** create `packages/mcp/src/resources.ts` + test additions.

- [ ] **Step 1: resources.ts** — register read-only resources backed by `ComponentDiscovery.discoverAll()`:
```ts
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ComponentDiscovery } from '@stratawp/explorer' // confirm the export path

export function registerResources(server: McpServer): void {
  server.registerResource(
    'components',
    'stratawp://components',
    { title: 'Component catalog', description: 'All blocks/components/patterns/templates/parts in the theme.' },
    async () => {
      const components = await new ComponentDiscovery(process.cwd()).discoverAll()
      return { contents: [{ uri: 'stratawp://components', mimeType: 'application/json', text: JSON.stringify(components, null, 2) }] }
    }
  )
  // get_component / get_component_source — by id; verify ComponentDiscovery's real constructor/API first.
}
```
(Read `packages/explorer/src/utils/component-discovery.ts` for the real constructor + `ComponentInfo` shape, and confirm `@stratawp/explorer` exports it; adjust accordingly.)

- [ ] **Step 2: test** — add to `server.test.ts`: `client.listResources()` includes the components resource; reading it returns a JSON array. Run → green (point discovery at an example theme fixture dir).

- [ ] **Step 3: commit:**
```bash
git add packages/mcp/src/resources.ts packages/mcp/src/server.ts packages/mcp/src/server.test.ts
git commit -m "feat(mcp): read-only component-catalog resources from explorer discovery"
```

---

## Task 6: Contract snapshot + `contracts` CI job + stdout-hygiene + CHANGELOG note

**Files:** create `packages/mcp/src/snapshot.ts`, `packages/mcp/contracts/tools.snapshot.json`, `scripts/check-contracts.mjs`, a spawned-bin test; modify root `package.json`, `.github/workflows/ci.yml`, `CHANGELOG.md`.

- [ ] **Step 1: snapshot.ts** — connect a client over InMemoryTransport, `listTools()`, write the sorted tool name→`{inputSchema,outputSchema}` map to `packages/mcp/contracts/tools.snapshot.json` (stable key order, trailing newline). Assert in a test that the emitted schema's dialect is **draft-07** (the `$schema` of the emitted JSON Schema), so the dialect can't silently change.

- [ ] **Step 2: generate + commit the snapshot.** `pnpm --filter @stratawp/mcp build && pnpm --filter @stratawp/mcp snapshot` → writes the snapshot. Inspect it (draft-07). Prettier-format it.

- [ ] **Step 3: root `contracts:check` + helper.** Add to root `package.json` scripts: `"contracts:check": "node scripts/check-contracts.mjs"`. Create `scripts/check-contracts.mjs` that runs the mcp snapshot regeneration then `git diff --exit-code -- packages/mcp/contracts/tools.snapshot.json` (non-zero exit if drift). It must build mcp first (or assume `pnpm build` ran — document the order).

- [ ] **Step 4: stdout-hygiene test** — spawn the built `stratawp-mcp` bin, send an `initialize` then `tools/list` JSON-RPC line over stdin, and assert **every** stdout line parses as JSON-RPC (no stray `console.log`). (This needs the real stdio transport, not InMemoryTransport.)

- [ ] **Step 5: add the `contracts` CI job** to `.github/workflows/ci.yml` (single runner, Node 20):
```yaml
  contracts:
    name: Contracts (MCP tool schema)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - name: Tool-contract snapshot is in sync
        run: pnpm contracts:check
```
(WS-B will extend this job with `contracts:validate` + `contracts:types:check`.)

- [ ] **Step 6: annotate the stale CHANGELOG line.** On `CHANGELOG.md:549` (the v0.4.0 "AI-Assisted Development" entry), add a one-line note, e.g. `> Note: the bundled AI provider package was removed in v2.0; AI assistance is now via the editor's own agent (see @stratawp/mcp).` Run `pnpm format` (CHANGELOG is prettier-checked).

- [ ] **Step 7: validate ci.yml + commit:**
```bash
node -e "const s=require('fs').readFileSync('.github/workflows/ci.yml','utf8');console.log(/^  contracts:/m.test(s)?'ok':'CHECK')"
git add packages/mcp/src/snapshot.ts packages/mcp/contracts/tools.snapshot.json packages/mcp/src/*.test.ts scripts/check-contracts.mjs package.json .github/workflows/ci.yml CHANGELOG.md
git commit -m "ci(mcp): snapshot-gated tool contract + stdout-hygiene test; annotate stale AI changelog"
```

---

## Task 7: Full local gate + push + PR

- [ ] **Step 1: lockfile + JS gate.**
```bash
pnpm install --frozen-lockfile   # must resolve (lockfile committed in Task 1)
pnpm build && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
pnpm contracts:check
```
Expected: all green (the new mcp `build`/`typecheck`/`test` run via turbo; `contracts:check` clean).

- [ ] **Step 2: prior gates intact.**
```bash
pnpm lint:php && ( cd packages/core && composer phpcs && composer phpstan && composer test )
```
Expected: green. (axe/perf run only in CI — Docker-bound; not part of the local gate here.)

- [ ] **Step 3: codename + scope check.**
```bash
git diff main..HEAD | grep -inE 'wp.?rig' || echo "CLEAN"
git status -sb   # only untracked tooling artifacts unstaged; nothing stray committed
```

- [ ] **Step 4: push + PR.**
```bash
git push -u origin feat/ai-readiness
```
PR title: `Phase 4 WS-A: @stratawp/mcp server — the AI capability Triple XXX never ships`. Body: the MCP server (generators-as-typed-tools via shared pure cores, explorer resources), the snapshot-gated `contracts` CI job, no-embedded-LLM framing, the pure-core refactor. Watch CI; the new `contracts` + `js`/`php`/`php-themes`/`axe`/`perf` checks must be green. Jon merges.

---

## Self-review checklist (completed by plan author)

- **Spec coverage:** pure value-returning cores no `process.exit`/`console`/`fs` (Tasks 2–3) ✓; `block` namespace parameterized (Task 3) ✓; SDK v1.x stable + deep imports + ZodRawShape + `/inMemory.js` (Tasks 1,4) ✓; stdio + stderr-only logging (Task 4) ✓; resources from `discoverAll()` (Task 5) ✓; snapshot draft-07 + dialect assertion + `git diff` gate (Task 6) ✓; real `contracts` ci.yml job, single Node-20 runner (Task 6) ✓; package declares build/typecheck/test (Task 1) ✓; lockfile committed (Tasks 1,7) ✓; single zod copy verified (Task 1) ✓; spawned-bin stdout-hygiene test (Task 6) ✓; stale CHANGELOG annotated (Task 6) ✓.
- **Out of scope (per spec):** no LLM/keys; headless tools, registry, studio UI, changesets publish, BlockMetadata unification all excluded.
- **Placeholders:** none — concrete code/commands per step; SDK signatures flagged to verify against the installed package, with the verified facts baked in.
- **Codename:** explicit `git add` only; "Triple XXX"; product-vs-dev-harness distinction kept.
