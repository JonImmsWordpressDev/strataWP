import { afterEach, describe, expect, it } from 'vitest'
import { THEME_008, THEME_009, THEME_010, THEME_011, THEME_012 } from '../rules/php-scan'
import { cleanupThemes, goodHybridFiles } from './helpers'
import { runRule } from './rule-helpers'

afterEach(cleanupThemes)

const php = (body: string) => `<?php\n${body}\n`
const withFile = (name: string, content: string) => ({ ...goodHybridFiles(), [name]: content })
const messages = (results: { message: string }[]) => results.map((r) => r.message)

describe('THEME-008 text domain', () => {
  it('passes on a good theme', () => {
    expect(runRule(THEME_008, goodHybridFiles())).toEqual([])
  })

  it('groups wrong-domain calls per file and domain, with the first line and a count', () => {
    const files = withFile('inc/a.php', php(`echo __( 'x', 'frost' );\necho __( 'y', 'frost' );`))
    const results = runRule(THEME_008, files)
    expect(results).toHaveLength(1)
    expect(results[0]?.message).toBe(
      `Text domain "frost" does not match the theme's "fixture-theme" (2 calls)`
    )
    expect(results[0]?.file).toBe('inc/a.php')
    expect(results[0]?.line).toBe(2)
  })

  it('reads the domain from the right argument for _x, _n and _nx', () => {
    const files = withFile(
      'inc/a.php',
      php(
        `_x( 'a', 'ctx', 'bad1' );\n_n( 'a', 'b', 3, 'bad2' );\n_nx( 'a', 'b', 3, 'ctx', 'bad3' );`
      )
    )
    const out = messages(runRule(THEME_008, files)).join('\n')
    expect(out).toContain('"bad1"')
    expect(out).toContain('"bad2"')
    expect(out).toContain('"bad3"')
  })

  it('ignores non-literal domains, method calls, and commented-out calls', () => {
    const files = withFile(
      'inc/a.php',
      php(
        `__( 'x', $domain );\n$this->__( 'x', 'frost' );\n// __( 'x', 'frost' );\n/* _e( 'x', 'frost' ); */`
      )
    )
    expect(runRule(THEME_008, files)).toEqual([])
  })

  it('does nothing when style.css declares no text domain', () => {
    const files = {
      ...withFile('inc/a.php', php(`__( 'x', 'frost' );`)),
      'style.css': '/* Theme Name: X */',
    }
    expect(runRule(THEME_008, files)).toEqual([])
  })
})

describe('THEME-009 performance', () => {
  it('reviews a 20,000 line HTML-heavy PHP file quickly', () => {
    const html = '<div class="x">\n  <p>text</p>\n</div>\n'.repeat(6667)
    const files = withFile('inc/big.php', html)
    const start = performance.now()
    runRule(THEME_009, files)
    expect(performance.now() - start).toBeLessThan(2000)
  })

  it('does not let a namespace declaration be matched across blank lines', () => {
    const files = withFile('inc/a.php', php(`\n\n\nfunction other_thing() {}`))
    expect(messages(runRule(THEME_009, files))).toContain(
      'Function "other_thing" is not prefixed with "fixture_theme_"'
    )
  })
})

describe('THEME-009 prefixing', () => {
  it('passes on a good theme', () => {
    expect(runRule(THEME_009, goodHybridFiles())).toEqual([])
  })

  it('flags unprefixed top-level functions and names the expected prefix', () => {
    const out = messages(
      runRule(THEME_009, withFile('inc/a.php', php(`function add_resource_hints() {}`)))
    )
    expect(out).toEqual(['Function "add_resource_hints" is not prefixed with "fixture_theme_"'])
  })

  it('accepts prefixed functions, classes, and constants', () => {
    const files = withFile(
      'inc/a.php',
      php(
        `function fixture_theme_x() {}\nclass FixtureThemeThing {}\ndefine( 'FIXTURE_THEME_VERSION', '1' );`
      )
    )
    expect(runRule(THEME_009, files)).toEqual([])
  })

  it('flags unprefixed classes and constants', () => {
    const files = withFile('inc/a.php', php(`class Foo_Bar {}\ndefine( 'MY_CONST', 1 );`))
    const out = messages(runRule(THEME_009, files))
    expect(out.some((m) => m.includes('Class "Foo_Bar"'))).toBe(true)
    expect(out.some((m) => m.includes('Constant "MY_CONST"'))).toBe(true)
  })

  it('skips files that declare a namespace', () => {
    const files = withFile(
      'inc/a.php',
      php(`namespace Foo;\nfunction anything() {}\nclass Whatever {}`)
    )
    expect(runRule(THEME_009, files)).toEqual([])
  })

  it('does not skip a file whose multi-line string contains a namespace line', () => {
    const files = withFile(
      'inc/a.php',
      php(`$t = 'intro\nnamespace Foo;\nend';\nfunction add_hints() {}`)
    )
    expect(messages(runRule(THEME_009, files))).toEqual([
      'Function "add_hints" is not prefixed with "fixture_theme_"',
    ])
  })

  it('does not flag indented methods inside a prefixed class', () => {
    const files = withFile('inc/a.php', php(`class FixtureThemeThing {\n\tfunction run() {}\n}`))
    expect(runRule(THEME_009, files)).toEqual([])
  })

  it('ignores declarations inside comments', () => {
    const files = withFile('inc/a.php', php(`// function bad_name() {}\n/* class Bad {} */`))
    expect(runRule(THEME_009, files)).toEqual([])
  })

  it('ignores column-0 declarations inside a multi-line block comment', () => {
    const files = withFile(
      'inc/a.php',
      php(`/*\nfunction bad_name() {}\nclass Bad {}\ndefine( 'BAD', 1 );\n*/`)
    )
    expect(runRule(THEME_009, files)).toEqual([])
  })
})

describe('THEME-010 plugin territory', () => {
  it('passes on a good theme', () => {
    expect(runRule(THEME_010, goodHybridFiles())).toEqual([])
  })

  it.each(['register_post_type', 'register_taxonomy', 'add_shortcode'])('flags %s()', (fn) => {
    const results = runRule(THEME_010, withFile('inc/a.php', php(`${fn}( 'x', array() );`)))
    expect(results).toHaveLength(1)
    expect(results[0]?.message).toContain(`${fn}()`)
    expect(results[0]?.line).toBe(2)
  })

  it('ignores commented-out calls', () => {
    expect(runRule(THEME_010, withFile('inc/a.php', php(`// register_post_type( 'x' );`)))).toEqual(
      []
    )
  })

  it('ignores register_post_type( inside a string but still flags a real call', () => {
    const files = withFile(
      'inc/a.php',
      php(`$d = 'call register_post_type( now )';\nregister_post_type( 'x', array() );`)
    )
    const results = runRule(THEME_010, files)
    expect(results).toHaveLength(1)
    expect(results[0]?.line).toBe(3)
  })

  it('flags calls written directly after => (array value)', () => {
    const files = withFile('inc/a.php', php(`$x = array('k'=>register_post_type( 'a', array() ));`))
    const results = runRule(THEME_010, files)
    expect(results).toHaveLength(1)
    expect(results[0]?.message).toContain('register_post_type()')
  })

  it('does not flag method or static calls, including nullsafe', () => {
    const files = withFile(
      'inc/a.php',
      php(
        `$o->register_post_type( 'a' );\n$o?->register_post_type( 'a' );\nFoo::register_post_type( 'a' );`
      )
    )
    expect(runRule(THEME_010, files)).toEqual([])
  })
})

describe('THEME-011 remote assets', () => {
  it('passes on a good theme', () => {
    expect(runRule(THEME_011, goodHybridFiles())).toEqual([])
  })

  it('flags remote URLs passed to enqueue/register functions', () => {
    const files = withFile(
      'inc/a.php',
      php(`wp_enqueue_script( 'x', 'https://cdn.example.com/x.js' );`)
    )
    const results = runRule(THEME_011, files)
    expect(results).toHaveLength(1)
    expect(results[0]?.message).toContain('wp_enqueue_script()')
    expect(results[0]?.message).toContain('https://cdn.example.com/x.js')
  })

  it('does not flag local asset helpers', () => {
    const files = withFile(
      'inc/a.php',
      php(`wp_enqueue_style( 'y', get_theme_file_uri( 'a.css' ) );`)
    )
    expect(runRule(THEME_011, files)).toEqual([])
  })

  it('flags remote script tags and remote stylesheet links, including protocol-relative ones', () => {
    const files = withFile(
      'header.php',
      `<?php wp_head(); ?><script src="https://cdn.example.com/a.js"></script>\n<link rel="stylesheet" href="//fonts.example.com/a.css">`
    )
    expect(runRule(THEME_011, files)).toHaveLength(2)
  })

  it('does not flag preconnect links or relative scripts', () => {
    const files = withFile(
      'header.php',
      `<?php wp_head(); ?><link rel="preconnect" href="https://fonts.googleapis.com"><script src="/js/a.js"></script>`
    )
    expect(runRule(THEME_011, files)).toEqual([])
  })
})

describe('THEME-012 risky functions', () => {
  it('passes on a good theme', () => {
    expect(runRule(THEME_012, goodHybridFiles())).toEqual([])
  })

  it('reports eval() and create_function() as errors', () => {
    const files = withFile('inc/a.php', php(`eval( '1' );\n$f = create_function( '', '' );`))
    const results = runRule(THEME_012, files)
    expect(results).toHaveLength(2)
    expect(results.every((r) => r.severity === 'error')).toBe(true)
  })

  it('ignores eval( inside heredoc and nowdoc bodies but still flags real calls after them', () => {
    const clean = withFile(
      'inc/a.php',
      php(
        `$js = <<<JS\nwindow.x = eval("1+1");\nJS;\n$n = <<<'EOT'\nit's text\nEOT;\n$a = 'never call eval( here';`
      )
    )
    expect(runRule(THEME_012, clean)).toEqual([])

    const real = withFile('inc/a.php', php(`$js = <<<JS\nx\nJS;\neval( '1' );`))
    expect(runRule(THEME_012, real)).toHaveLength(1)
  })

  it('reports base64_decode() as a warning', () => {
    const [finding] = runRule(
      THEME_012,
      withFile('inc/a.php', php(`$x = base64_decode( 'eA==' );`))
    )
    expect(finding?.severity).toBe('warning')
  })

  it('ignores method calls and comments', () => {
    const files = withFile('inc/a.php', php(`$this->eval( 1 );\n// eval( 'x' );`))
    expect(runRule(THEME_012, files)).toEqual([])
  })

  it('flags eval() written directly after : (ternary)', () => {
    const results = runRule(THEME_012, withFile('inc/a.php', php(`$c ? 1 :eval( 'x' );`)))
    expect(results).toHaveLength(1)
    expect(results[0]?.severity).toBe('error')
  })

  it('ignores eval( inside string literals but still flags a real call', () => {
    const files = withFile(
      'inc/a.php',
      php(`$m = 'Never call eval( ) here'; echo "<script>eval( x )</script>";\neval( '1' );`)
    )
    const results = runRule(THEME_012, files)
    expect(results).toHaveLength(1)
    expect(results[0]?.severity).toBe('error')
    expect(results[0]?.line).toBe(3)
  })

  it('does not flag base64_decode( inside a string', () => {
    expect(
      runRule(THEME_012, withFile('inc/a.php', php(`$m = 'use base64_decode( x )';`)))
    ).toEqual([])
  })

  it('does not flag instance, nullsafe or static eval()', () => {
    const files = withFile('inc/a.php', php(`$o->eval( 1 ); $o?->eval( 1 ); Foo::eval( 1 );`))
    expect(runRule(THEME_012, files)).toEqual([])
  })
})

describe('HTML text and URLs do not confuse the PHP scanners', () => {
  it('produces no findings for apostrophes in HTML, // in URLs, and commented-out code', () => {
    const files = withFile(
      'inc/mixed.php',
      `<p>Don't <?php echo 1; ?> won't</p>\n<?php // __( 'x', 'frost' );\n$u = 'https://example.com/a'; function fixture_theme_ok() {}\n`
    )
    for (const rule of [THEME_008, THEME_009, THEME_010, THEME_012]) {
      expect(runRule(rule, files)).toEqual([])
    }
  })
})
