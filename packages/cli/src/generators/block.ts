/**
 * Pure block generator core.
 * No process.exit, console.*, ora, fs, or process.cwd() calls.
 *
 * Every StrataWP block is dynamic: it renders on the front end via a
 * server-side `render.php` callback (declared as `render` in block.json). The
 * framework ships no static (save.js / save.tsx) blocks, so the generator
 * always emits a render.php and never a save component.
 */
import type { GeneratedFile, GenerateResult } from './types'

export interface GenerateBlockOptions {
  name: string
  namespace: string
  category: string
  styleFramework: 'none' | 'tailwind' | 'unocss'
}

// ---------------------------------------------------------------------------
// Internal content builders (no I/O)
// ---------------------------------------------------------------------------

function buildBlockConfig(name: string, slug: string, namespace: string, category: string): string {
  const config: Record<string, unknown> = {
    $schema: 'https://schemas.wp.org/trunk/block.json',
    apiVersion: 3,
    name: `${namespace}/${slug}`,
    title: name,
    category,
    icon: 'smiley',
    description: `${name} block`,
    supports: {
      html: false,
      align: true,
    },
    attributes: {},
    editorScript: 'file:./edit.tsx',
    render: 'file:./render.php',
    style: 'file:./style.css',
  }
  return JSON.stringify(config, null, 2)
}

function buildBlockEdit(name: string, framework: string): string {
  const useTailwind = framework === 'tailwind'
  const useUno = framework === 'unocss'
  const headingClasses = useTailwind || useUno ? 'className="text-2xl font-bold mb-2"' : ''

  return `import { useBlockProps } from '@wordpress/block-editor'

export default function Edit() {
  const blockProps = useBlockProps(${useTailwind || useUno ? "{ className: 'p-4 bg-gray-100 rounded-lg' }" : ''})

  return (
    <div {...blockProps}>
      <h3 ${headingClasses}>${name}</h3>
      <p>Edit your block here...</p>
    </div>
  )
}
`
}

function buildBlockRender(name: string, namespace: string, framework: string): string {
  const useTailwind = framework === 'tailwind'
  const useUno = framework === 'unocss'
  const classes = useTailwind || useUno ? ' class="p-4 bg-gray-100 rounded-lg"' : ''
  const headingClasses = useTailwind || useUno ? ' class="text-2xl font-bold mb-2"' : ''

  return `<?php
/**
 * ${name} Block Render
 *
 * @param array $attributes Block attributes
 * @param string $content Block content
 * @return string Rendered block
 */

$block_wrapper_attributes = get_block_wrapper_attributes();
?>

<div <?php echo $block_wrapper_attributes; ?>${classes}>
  <h3${headingClasses}><?php echo esc_html__( '${name}', '${namespace}' ); ?></h3>
  <!-- Add your dynamic content here -->
</div>
`
}

function buildBlockStyles(slug: string, namespace: string, framework: string): string {
  const cssClass = `wp-block-${namespace}-${slug}`

  if (framework === 'tailwind' || framework === 'unocss') {
    return `/*
 * ${framework === 'tailwind' ? 'Tailwind CSS' : 'UnoCSS'} utilities are used inline.
 * Add custom styles here only if needed.
 */

.${cssClass} {
  /* Custom styles */
}
`
  }

  return `.${cssClass} {
  padding: 1rem;
  background-color: #f3f4f6;
  border-radius: 0.5rem;
}

.${cssClass} h3 {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}
`
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateBlock(options: GenerateBlockOptions): GenerateResult {
  const { name, namespace, category, styleFramework } = options

  const slug = name.toLowerCase().replace(/\s+/g, '-')
  const dir = `src/blocks/${slug}`

  const files: GeneratedFile[] = [
    {
      path: `${dir}/block.json`,
      content: buildBlockConfig(name, slug, namespace, category),
    },
    {
      path: `${dir}/edit.tsx`,
      content: buildBlockEdit(name, styleFramework),
    },
    {
      path: `${dir}/render.php`,
      content: buildBlockRender(name, namespace, styleFramework),
    },
    {
      path: `${dir}/style.css`,
      content: buildBlockStyles(slug, namespace, styleFramework),
    },
  ]

  const messages = [
    `Block "${name}" created!`,
    `  ${dir}/block.json`,
    `  ${dir}/edit.tsx`,
    `  ${dir}/render.php`,
    `  ${dir}/style.css`,
  ]

  return { files, messages }
}
