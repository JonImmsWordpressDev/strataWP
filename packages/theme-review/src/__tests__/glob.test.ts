import { describe, expect, it } from 'vitest'
import { globToRegExp } from '../glob'

describe('globToRegExp', () => {
  it('matches generated files at any depth with **/*-generated.*', () => {
    const re = globToRegExp('**/*-generated.*')
    expect(re.test('inc/blocks-generated.php')).toBe(true)
    expect(re.test('x-generated.php')).toBe(true)
    expect(re.test('inc/blocks.php')).toBe(false)
  })

  it('matches everything below a folder with folder/**', () => {
    const re = globToRegExp('legacy/**')
    expect(re.test('legacy/a/b.php')).toBe(true)
    expect(re.test('other/legacy/a.php')).toBe(false)
  })

  it('keeps * inside one path segment', () => {
    const re = globToRegExp('*.txt')
    expect(re.test('readme.txt')).toBe(true)
    expect(re.test('a/readme.txt')).toBe(false)
  })

  it('escapes regex metacharacters', () => {
    expect(globToRegExp('a.b').test('axb')).toBe(false)
    expect(globToRegExp('a.b').test('a.b')).toBe(true)
  })
})
