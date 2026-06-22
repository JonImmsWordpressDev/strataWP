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
  })
})
