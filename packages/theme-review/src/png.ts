const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** Reads the dimensions from a PNG's IHDR chunk without decoding the image. */
export function readPngSize(buf: Buffer): { width: number; height: number } | undefined {
  if (buf.length < 24) return undefined
  if (!buf.subarray(0, 8).equals(SIGNATURE)) return undefined
  if (buf.toString('ascii', 12, 16) !== 'IHDR') return undefined
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}
