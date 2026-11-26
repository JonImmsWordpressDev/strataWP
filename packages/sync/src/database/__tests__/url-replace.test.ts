// packages/sync/src/database/__tests__/url-replace.test.ts
import { describe, it, expect } from 'vitest'
import { UrlReplacer } from '../url-replace.js'

describe('UrlReplacer', () => {
  const replacer = new UrlReplacer([
    { from: 'https://production.com', to: 'http://local.test' },
    { from: 'https://cdn.production.com', to: 'http://local.test/wp-content' },
  ])

  describe('replaceInString', () => {
    it('should replace simple URLs', () => {
      const input = 'Visit https://production.com for more info'
      const result = replacer.replaceInString(input)
      expect(result).toBe('Visit http://local.test for more info')
    })

    it('should replace multiple URLs', () => {
      const input = 'Site: https://production.com, CDN: https://cdn.production.com/image.jpg'
      const result = replacer.replaceInString(input)
      expect(result).toBe('Site: http://local.test, CDN: http://local.test/wp-content/image.jpg')
    })
  })

  describe('replaceInSerialized', () => {
    it('should handle serialized PHP strings', () => {
      // Serialized: a:1:{s:3:"url";s:22:"https://production.com";}
      const input = 'a:1:{s:3:"url";s:22:"https://production.com";}'
      const result = replacer.replaceInSerialized(input)
      // After replacement, URL is "http://local.test" (17 chars)
      expect(result).toBe('a:1:{s:3:"url";s:17:"http://local.test";}')
    })

    it('should handle nested serialized data', () => {
      const input =
        'a:2:{s:4:"site";s:22:"https://production.com";s:3:"cdn";s:26:"https://cdn.production.com";}'
      const result = replacer.replaceInSerialized(input)
      expect(result).toContain('http://local.test')
      expect(result).toContain('http://local.test/wp-content')
    })

    // Expected values below are PHP serialize() of the replaced data
    it('should replace URLs in values that contain double quotes', () => {
      const input = 'a:1:{s:1:"v";s:43:"<a href="https://production.com/page">x</a>";}'
      expect(replacer.replaceInSerialized(input)).toBe(
        'a:1:{s:1:"v";s:38:"<a href="http://local.test/page">x</a>";}'
      )
    })

    it('should handle HTML values in nested arrays', () => {
      const input =
        'a:2:{s:1:"w";a:2:{s:5:"title";s:2:"Hi";s:4:"text";s:61:"<p class="x">See <a href="https://production.com/a">a</a></p>";}s:1:"n";i:3;}'
      expect(replacer.replaceInSerialized(input)).toBe(
        'a:2:{s:1:"w";a:2:{s:5:"title";s:2:"Hi";s:4:"text";s:56:"<p class="x">See <a href="http://local.test/a">a</a></p>";}s:1:"n";i:3;}'
      )
    })

    it('should count multibyte values in bytes', () => {
      const input = 'a:1:{s:1:"v";s:47:"Café <img src="https://production.com/é.png">";}'
      expect(replacer.replaceInSerialized(input)).toBe(
        'a:1:{s:1:"v";s:42:"Café <img src="http://local.test/é.png">";}'
      )
    })

    it('should fix lengths in serialized data stored inside a string', () => {
      const input =
        'a:1:{s:5:"inner";s:55:"a:1:{s:1:"u";s:33:"<a href="https://production.com">";}";}'
      expect(replacer.replaceInSerialized(input)).toBe(
        'a:1:{s:5:"inner";s:50:"a:1:{s:1:"u";s:28:"<a href="http://local.test">";}";}'
      )
    })

    it('should fall back to pattern matching when a length is wrong', () => {
      const input = 'a:1:{s:3:"url";s:99:"https://production.com";}'
      expect(replacer.replaceInSerialized(input)).toBe('a:1:{s:3:"url";s:17:"http://local.test";}')
    })
  })

  describe('replaceInSQL with serialized HTML', () => {
    it('should replace URLs in serialized HTML inside an INSERT', () => {
      const sql = `INSERT INTO wp_options VALUES (1,'widget_text','a:1:{s:1:"v";s:43:"<a href="https://production.com/page">x</a>";}','yes');`
      expect(replacer.replaceInSQL(sql)).toBe(
        `INSERT INTO wp_options VALUES (1,'widget_text','a:1:{s:1:"v";s:38:"<a href="http://local.test/page">x</a>";}','yes');`
      )
    })
  })

  describe('replaceInJSON', () => {
    it('should handle JSON encoded strings', () => {
      const input = '{"url":"https:\\/\\/production.com\\/page"}'
      const result = replacer.replaceInJSON(input)
      expect(result).toBe('{"url":"http:\\/\\/local.test\\/page"}')
    })
  })

  describe('replaceInSQL', () => {
    it('should detect and handle different encoding types', () => {
      const sql = `INSERT INTO wp_options VALUES ('siteurl', 'https://production.com');`
      const result = replacer.replaceInSQL(sql)
      expect(result).toContain('http://local.test')
    })

    describe('escaped values', () => {
      // Escape a stored value the way DatabaseDumper does
      const dumpEscape = (v: string) => v.replace(/'/g, "''").replace(/\\/g, '\\\\')
      const serialize = (v: string) => `s:${Buffer.byteLength(v, 'utf8')}:"${v}";`
      const insert = (v: string) =>
        `INSERT INTO \`wp_options\` (\`option_name\`, \`option_value\`) VALUES ('x', '${dumpEscape(v)}');`
      const storedValue = (line: string) =>
        line
          .slice(line.lastIndexOf(", '") + 3, line.lastIndexOf("');"))
          .replace(/''|\\\\/g, (m) => m[0])

      it.each([
        ['plain', 'https://production.com/page'],
        ['apostrophe', "Jon's site https://production.com"],
        ['backslash', 'C:\\uploads https://production.com'],
        ['both', "it's C:\\a\\b https://production.com/x"],
      ])('keeps serialized lengths correct with %s', (_name, original) => {
        const result = replacer.replaceInSQL(insert(serialize(original)))
        const expected = original.split('https://production.com').join('http://local.test')
        expect(storedValue(result)).toBe(serialize(expected))
      })

      it('keeps the statement a single SQL literal per value', () => {
        const result = replacer.replaceInSQL(insert(serialize("Jon's https://production.com")))
        expect(result).toBe(insert(serialize("Jon's http://local.test")))
      })

      it('reads backslash-escaped quotes as mysqldump writes them', () => {
        const sql = `INSERT INTO t VALUES ('Jon\\'s https://production.com');`
        const result = replacer.replaceInSQL(sql)
        expect(result).toBe(`INSERT INTO t VALUES ('Jon''s http://local.test');`)
      })

      it('leaves literals without a match untouched', () => {
        const sql = `INSERT INTO t VALUES ('Jon\\'s \\n site');`
        expect(replacer.replaceInSQL(sql)).toBe(sql)
      })
    })
  })
})
