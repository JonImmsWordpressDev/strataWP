import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

export type Files = Record<string, string | Buffer>

const created: string[] = []

/** Writes `files` into a fresh temp directory and returns its path. */
export function makeTheme(files: Files): string {
  const dir = mkdtempSync(join(tmpdir(), 'sw-review-'))
  created.push(dir)
  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, content)
  }
  return dir
}

export function cleanupThemes(): void {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** A minimal valid PNG header (signature + IHDR) of the given size. */
export function pngBuffer(width: number, height: number): Buffer {
  const buf = Buffer.alloc(33)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0)
  buf.writeUInt32BE(13, 8)
  buf.write('IHDR', 12, 'ascii')
  buf.writeUInt32BE(width, 16)
  buf.writeUInt32BE(height, 20)
  return buf
}

export function without(files: Files, ...keys: string[]): Files {
  const copy: Files = { ...files }
  for (const key of keys) delete copy[key]
  return copy
}

const STYLE_CSS = `/*
Theme Name: Fixture Theme
Description: A fixture theme
Author: Tester
Version: 1.0.0
License: GNU General Public License v2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Text Domain: fixture-theme
Tested up to: 6.9
Requires at least: 6.5
Requires PHP: 8.1
*/
`

/** A theme with both PHP and block templates that passes every rule. */
export function goodHybridFiles(): Files {
  return {
    'style.css': STYLE_CSS,
    'screenshot.png': pngBuffer(1200, 900),
    'readme.txt': '=== Fixture Theme ===\n',
    'index.php': '<?php\n// Silence is golden.\n',
    'header.php': '<!doctype html><html><head><?php wp_head(); ?></head><body>\n',
    'footer.php': '<?php wp_footer(); ?></body></html>\n',
    'functions.php': `<?php
function fixture_theme_setup() {
	add_theme_support( 'title-tag' );
}
add_action( 'after_setup_theme', 'fixture_theme_setup' );
`,
    'templates/index.html': '<!-- wp:post-content /-->\n',
    'theme.json': JSON.stringify({
      $schema: 'https://schemas.wp.org/trunk/theme.json',
      version: 3,
    }),
    'patterns/hero.php': `<?php
/**
 * Title: Hero
 * Slug: fixture-theme/hero
 * Categories: featured
 */
?>
<p><?php echo esc_html__( 'Hello', 'fixture-theme' ); ?></p>
`,
  }
}

/** A block theme: no classic template markers (index.php alone does not count). */
export function goodBlockFiles(): Files {
  return without(goodHybridFiles(), 'header.php', 'footer.php')
}

/** A classic theme: no block templates, theme.json, or patterns. */
export function goodClassicFiles(): Files {
  return without(goodHybridFiles(), 'templates/index.html', 'theme.json', 'patterns/hero.php')
}
