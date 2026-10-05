import { describe, expect, it } from 'vitest'
import { readPngSize } from '../png'
import { pngBuffer } from './helpers'

describe('readPngSize', () => {
  it('reads width and height from the IHDR chunk', () => {
    expect(readPngSize(pngBuffer(1200, 900))).toEqual({ width: 1200, height: 900 })
  })

  it('returns undefined for a non-PNG', () => {
    expect(readPngSize(Buffer.from('definitely not a png file at all'))).toBeUndefined()
  })

  it('returns undefined for a truncated buffer', () => {
    expect(readPngSize(pngBuffer(10, 10).subarray(0, 12))).toBeUndefined()
  })
})
