import chalk from 'chalk'
import ora from 'ora'
import fs from 'fs-extra'
import path from 'path'

interface BlockOptions {
  type: 'static' | 'dynamic'
  category: string
  styleFramework?: 'none' | 'tailwind' | 'unocss'
}

export async function blockCommand(name: string, options: BlockOptions) {
  console.log(chalk.bold.cyan('⚒️  Creating Block\n'))
  console.log(chalk.dim(`Name: ${name}`))
  console.log(chalk.dim(`Type: ${options.type}`))
  console.log(chalk.dim(`Category: ${options.category}\n`))

  const spinner = ora('Generating block...').start()

  try {
    const slug = name.toLowerCase().replace(/\s+/g, '-')
    const blockDir = path.join(process.cwd(), 'src/blocks', slug)

    await fs.ensureDir(blockDir)

    // Generate block files
    await generateBlockConfig(blockDir, name, slug, options)
    await generateBlockEdit(blockDir, name, slug, options.styleFramework || 'none')
    await generateBlockRender(blockDir, name, slug, options.type, options.styleFramework || 'none')
    await generateBlockStyles(blockDir, slug, options.styleFramework || 'none')

    spinner.succeed(chalk.green(`Block "${name}" created!`))

    console.log()
    console.log(chalk.cyan('📁 Files created:'))
    console.log(chalk.dim(`  src/blocks/${slug}/block.json`))
    console.log(chalk.dim(`  src/blocks/${slug}/edit.tsx`))
    console.log(chalk.dim(`  src/blocks/${slug}/render.${options.type === 'dynamic' ? 'php' : 'tsx'}`))
    console.log(chalk.dim(`  src/blocks/${slug}/style.css`))
    console.log()
  } catch (error) {
    spinner.fail('Failed to create block')
    console.error(error)
    process.exit(1)
  }
}

async function generateBlockConfig(
  blockDir: string,
  name: string,
  slug: string,
  options: BlockOptions
) {
  const config = {
    $schema: 'https://schemas.wp.org/trunk/block.json',
    apiVersion: 3,
    name: `wp-forge/${slug}`,
    title: name,
    category: options.category,
    icon: 'smiley',
    description: `${name} block`,
    supports: {
      html: false,
      align: true,
    },
    attributes: {},
    editorScript: 'file:./edit.tsx',
    ...(options.type === 'dynamic' && { render: 'file:./render.php' }),
    style: 'file:./style.css',
  }

  await fs.writeJson(path.join(blockDir, 'block.json'), config, { spaces: 2 })
}

async function generateBlockEdit(blockDir: string, name: string, slug: string, framework: string) {
  const useTailwind = framework === 'tailwind'
  const useUno = framework === 'unocss'

  const classes = useTailwind || useUno
    ? 'className="p-4 bg-gray-100 rounded-lg"'
    : ''

  const headingClasses = useTailwind || useUno
    ? 'className="text-2xl font-bold mb-2"'
    : ''

  const content = `import { useBlockProps } from '@wordpress/block-editor'

export default function Edit() {
  const blockProps = useBlockProps(${useTailwind || useUno ? '{ className: \'p-4 bg-gray-100 rounded-lg\' }' : ''})

  return (
    <div {...blockProps}>
      <h3 ${headingClasses}>${name}</h3>
      <p>Edit your block here...</p>
    </div>
  )
}
`

  await fs.writeFile(path.join(blockDir, 'edit.tsx'), content)
}

async function generateBlockRender(
  blockDir: string,
  name: string,
  slug: string,
  type: 'static' | 'dynamic',
  framework: string
) {
  if (type === 'dynamic') {
    const useTailwind = framework === 'tailwind'
    const useUno = framework === 'unocss'
    const classes = useTailwind || useUno ? ' class="p-4 bg-gray-100 rounded-lg"' : ''
    const headingClasses = useTailwind || useUno ? ' class="text-2xl font-bold mb-2"' : ''

    const content = `<?php
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
  <h3${headingClasses}><?php echo esc_html__( '${name}', 'wp-forge' ); ?></h3>
  <!-- Add your dynamic content here -->
</div>
`

    await fs.writeFile(path.join(blockDir, 'render.php'), content)
  }
}

async function generateBlockStyles(blockDir: string, slug: string, framework: string) {
  let content: string

  if (framework === 'tailwind' || framework === 'unocss') {
    content = `/*
 * ${framework === 'tailwind' ? 'Tailwind CSS' : 'UnoCSS'} utilities are used inline.
 * Add custom styles here only if needed.
 */

.wp-block-wp-forge-${slug} {
  /* Custom styles */
}
`
  } else {
    content = `.wp-block-wp-forge-${slug} {
  padding: 1rem;
  background-color: #f3f4f6;
  border-radius: 0.5rem;
}

.wp-block-wp-forge-${slug} h3 {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}
`
  }

  await fs.writeFile(path.join(blockDir, 'style.css'), content)
}
