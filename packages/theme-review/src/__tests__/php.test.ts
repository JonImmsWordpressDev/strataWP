import { describe, expect, it } from 'vitest'
import { extractCalls, lineOf, phpOnly } from '../php'

describe('phpOnly', () => {
  it('blanks HTML outside PHP tags, including apostrophes in text', () => {
    const out = phpOnly(`<p>Don't panic</p>\n<?php echo 1; ?>\n<p>won't</p>`)
    expect(out).not.toContain("Don't")
    expect(out).not.toContain("won't")
    expect(out).toContain('echo 1;')
  })

  it('blanks comments but keeps newlines so line numbers stay stable', () => {
    const src = `<?php\n// __( 'x', 'frost' );\n/* __( 'y', 'frost' ); */\n# __( 'z', 'frost' );\necho 1;`
    const out = phpOnly(src)
    expect(out).not.toContain('frost')
    expect(out.split('\n')).toHaveLength(src.split('\n').length)
  })

  it('keeps string literals, including // inside URLs', () => {
    const out = phpOnly(`<?php $u = 'https://example.com/a'; $v = "http://x.test";`)
    expect(out).toContain('https://example.com/a')
    expect(out).toContain('http://x.test')
  })

  it('does not treat PHP 8 attributes as comments', () => {
    expect(phpOnly(`<?php #[Attr]\nfunction foo() {}`)).toContain('#[Attr]')
  })

  it('stops a line comment at a closing tag', () => {
    const out = phpOnly(`<?php // note ?><p>visible</p><?php echo 2;`)
    expect(out).toContain('echo 2;')
    expect(out).not.toContain('visible')
  })

  it('treats <?= as PHP', () => {
    expect(phpOnly(`<b><?= esc_html__( 'a', 'd' ) ?></b>`)).toContain("esc_html__( 'a', 'd' )")
  })
})

describe('extractCalls', () => {
  const code = (s: string) => phpOnly(`<?php ${s}`)

  it('extracts top-level arguments, respecting quotes and nesting', () => {
    const calls = extractCalls(code(`echo __( 'a, b', 'dom' );`), ['__'])
    expect(calls).toHaveLength(1)
    expect(calls[0]?.args).toEqual(["'a, b'", "'dom'"])
  })

  it('handles nested calls and arrays', () => {
    const calls = extractCalls(code(`esc_html__( sprintf( 'x %s', array( 1, 2 ) ), 'dom' );`), [
      'esc_html__',
    ])
    expect(calls[0]?.args).toEqual(["sprintf( 'x %s', array( 1, 2 ) )", "'dom'"])
  })

  it('handles multi-line calls', () => {
    const calls = extractCalls(code(`_e(\n\t'hello',\n\t'dom'\n);`), ['_e'])
    expect(calls[0]?.args).toEqual(["'hello'", "'dom'"])
  })

  it('ignores method calls and function declarations', () => {
    const calls = extractCalls(
      code(`$this->__( 'a', 'b' ); Foo::__( 'c', 'd' ); function __( $a ) {}`),
      ['__']
    )
    expect(calls).toHaveLength(0)
  })

  it('does not match a name that is the tail of a longer identifier', () => {
    expect(extractCalls(code(`esc_html__( 'a', 'd' );`), ['__'])).toHaveLength(0)
  })
})

describe('lineOf', () => {
  it('returns the 1-based line of an index', () => {
    expect(lineOf('a\nb\nc', 0)).toBe(1)
    expect(lineOf('a\nb\nc', 2)).toBe(2)
    expect(lineOf('a\nb\nc', 4)).toBe(3)
  })
})
