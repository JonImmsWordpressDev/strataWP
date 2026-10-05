/**
 * MCP tool registrations for @stratawp/mcp.
 *
 * Each `scaffold_*` tool is backed by a pure CLI generator core
 * (`@stratawp/cli/generators`). The core produces in-memory files; this layer
 * is the only place that touches the filesystem: it writes each file under the
 * caller-provided absolute `targetDir`.
 *
 * The review tools (`review_theme`, `detect_theme_type`) are read-only wrappers over
 * `@stratawp/theme-review`.
 *
 * Tools never call process.exit and never write to stdout (the JSON-RPC
 * channel) — diagnostics, if any, go to stderr.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  generateBlock,
  generateComponent,
  generatePart,
  generateTemplate,
  type GenerateResult,
} from '@stratawp/cli/generators'
import {
  detectTheme,
  exitCodeFor,
  formatReport,
  reviewTheme,
  THEME_TYPES,
} from '@stratawp/theme-review'
import { z } from 'zod'

/**
 * Shared output shape for every scaffold tool. `written` lists the
 * theme-relative paths that were created; `messages` are the generator's
 * human-readable notes.
 */
const outputSchema = {
  written: z.array(z.string()),
  messages: z.array(z.string()),
} as const

/**
 * Writes each generated file under `targetDir` (mkdir -p, then writeFile) and
 * returns the standard tool result: machine-readable `structuredContent` plus a
 * text summary for clients that don't read structured output.
 */
async function writeAndReport(targetDir: string, generated: GenerateResult) {
  const written: string[] = []

  for (const file of generated.files) {
    const absolutePath = join(targetDir, file.path)
    await mkdir(dirname(absolutePath), { recursive: true })
    await writeFile(absolutePath, file.content, 'utf8')
    written.push(file.path)
  }

  const summary = [
    `Wrote ${written.length} file(s) to ${targetDir}:`,
    ...written.map((p) => `  ${p}`),
    ...generated.messages,
  ].join('\n')

  return {
    structuredContent: { written, messages: generated.messages },
    content: [{ type: 'text' as const, text: summary }],
  }
}

const targetDir = z.string().describe('Absolute path to the theme directory to write files into')

/**
 * Registers the four `scaffold_*` tools on the given server.
 */
export function registerTools(server: McpServer): void {
  server.registerTool(
    'scaffold_block',
    {
      title: 'Scaffold a Gutenberg block',
      description:
        'Generates a custom dynamic Gutenberg block (block.json, edit.tsx, render.php, style.css) under src/blocks/<slug> in the target theme. All StrataWP blocks are dynamic — they render on the front end via a server-side render.php callback; there is no static/save.js variant.',
      inputSchema: {
        targetDir,
        name: z.string().describe('Human-readable block name, e.g. "Hero"'),
        namespace: z
          .string()
          .describe('Block namespace, usually the theme slug, e.g. "strata-basic"'),
        category: z.string().default('common').describe('Block category, e.g. "common", "media"'),
        styleFramework: z
          .enum(['none', 'tailwind', 'unocss'])
          .default('none')
          .describe('CSS utility framework to scaffold against'),
      },
      outputSchema,
    },
    async ({ targetDir, name, namespace, category, styleFramework }) => {
      const generated = generateBlock({ name, namespace, category, styleFramework })
      return writeAndReport(targetDir, generated)
    }
  )

  server.registerTool(
    'scaffold_component',
    {
      title: 'Scaffold a PHP component',
      description:
        'Generates a StrataWP PHP component class implementing ComponentInterface under inc/Components/<Name>.php.',
      inputSchema: {
        targetDir,
        name: z.string().describe('PascalCase component name, e.g. "Analytics"'),
        type: z
          .enum(['service', 'feature', 'integration', 'custom'])
          .describe('Component archetype'),
        namespace: z.string().describe('PHP root namespace, e.g. "StrataBasic"'),
      },
      outputSchema,
    },
    async ({ targetDir, name, type, namespace }) => {
      const generated = generateComponent({ name, type, namespace })
      return writeAndReport(targetDir, generated)
    }
  )

  server.registerTool(
    'scaffold_template',
    {
      title: 'Scaffold an FSE template',
      description: 'Generates a Full Site Editing block template under templates/<slug>.html.',
      inputSchema: {
        targetDir,
        name: z.string().describe('Template name, e.g. "About"'),
        type: z
          .enum(['page', 'single', 'archive', '404', 'home', 'search', 'custom'])
          .describe('WordPress template type'),
        themeSlug: z.string().describe('Theme slug used for text-domain annotations'),
        description: z.string().optional().describe('Optional template description'),
      },
      outputSchema,
    },
    async ({ targetDir, name, type, themeSlug, description }) => {
      const generated = generateTemplate({ name, type, themeSlug, description })
      return writeAndReport(targetDir, generated)
    }
  )

  server.registerTool(
    'scaffold_part',
    {
      title: 'Scaffold a template part',
      description: 'Generates a reusable FSE template part under parts/<slug>.(html|php).',
      inputSchema: {
        targetDir,
        name: z.string().describe('Part name, e.g. "Sidebar"'),
        type: z
          .enum(['header', 'footer', 'sidebar', 'content', 'custom'])
          .describe('Template part area'),
        markup: z.enum(['html', 'php']).describe('Emit an HTML part or a PHP part'),
        themeSlug: z
          .string()
          .optional()
          .describe('Theme slug used as the @package annotation for PHP parts'),
      },
      outputSchema,
    },
    async ({ targetDir, name, type, markup, themeSlug }) => {
      const generated = generatePart({ name, type, markup, themeSlug })
      return writeAndReport(targetDir, generated)
    }
  )

  const themeTypeSchema = z.enum([...THEME_TYPES] as [string, ...string[]])

  server.registerTool(
    'review_theme',
    {
      title: 'Review a theme against the WordPress.org theme guidelines',
      description:
        'Runs the StrataWP theme review (read-only) on a theme directory and returns structured findings. It approximates the WordPress.org theme guidelines with static checks and is not a certification. `passed` is false when there are errors, or warnings when `strict` is true.',
      inputSchema: {
        themeDir: z.string().describe('Absolute path to the theme directory to review'),
        type: themeTypeSchema
          .optional()
          .describe('Override the detected theme type: block, classic or hybrid'),
        strict: z.boolean().optional().describe('Treat warnings as failures in `passed`'),
      },
      outputSchema: {
        themeType: themeTypeSchema,
        typeSource: z.enum(['detected', 'override']),
        passed: z.boolean(),
        summary: z.object({ errors: z.number(), warnings: z.number(), infos: z.number() }),
        findings: z.array(
          z.object({
            ruleId: z.string(),
            severity: z.enum(['error', 'warning', 'info']),
            message: z.string(),
            file: z.string().optional(),
            line: z.number().optional(),
          })
        ),
        disclaimer: z.string(),
      },
    },
    async ({ themeDir, type, strict }) => {
      try {
        const report = reviewTheme(themeDir, {
          type: type as (typeof THEME_TYPES)[number] | undefined,
        })
        const passed = exitCodeFor(report, strict ?? false) === 0
        return {
          structuredContent: {
            themeType: report.themeType,
            typeSource: report.typeSource,
            passed,
            summary: report.summary,
            findings: report.findings,
            disclaimer: report.disclaimer,
          },
          content: [{ type: 'text' as const, text: formatReport(report) }],
        }
      } catch (error) {
        return {
          isError: true,
          content: [
            { type: 'text' as const, text: error instanceof Error ? error.message : String(error) },
          ],
        }
      }
    }
  )

  server.registerTool(
    'detect_theme_type',
    {
      title: 'Detect whether a theme is block, classic, or hybrid',
      description:
        'Read-only. Classifies a theme directory as block, classic or hybrid (both block templates and PHP templates) and says whether the answer was detected or came from a stratawp.themeType override in package.json.',
      inputSchema: {
        themeDir: z.string().describe('Absolute path to the theme directory'),
      },
      outputSchema: {
        themeType: themeTypeSchema,
        typeSource: z.enum(['detected', 'override']),
      },
    },
    async ({ themeDir }) => {
      try {
        const result = detectTheme(themeDir)
        return {
          structuredContent: { themeType: result.themeType, typeSource: result.typeSource },
          content: [{ type: 'text' as const, text: `${result.themeType} (${result.typeSource})` }],
        }
      } catch (error) {
        return {
          isError: true,
          content: [
            { type: 'text' as const, text: error instanceof Error ? error.message : String(error) },
          ],
        }
      }
    }
  )
}
