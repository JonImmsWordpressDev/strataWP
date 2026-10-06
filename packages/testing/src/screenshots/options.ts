export const DEFAULT_BASE_URL = 'http://localhost:8888'
export const DEFAULT_ROUTES: readonly string[] = ['/', '/this-page-does-not-exist-404/']
export const DEFAULT_WIDTHS: readonly number[] = [1280, 390]
export const DEFAULT_OUT_DIR = '.stratawp/screenshots'

const MIN_WIDTH = 200
const MAX_WIDTH = 3840
const MAX_ROUTE_LENGTH = 200

/** Bad user input: the CLI maps this to exit code 2, the MCP tool to an error result. */
export class ScreenshotOptionsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScreenshotOptionsError'
  }
}

export interface CaptureOptions {
  baseUrl: string
  routes: string[]
  widths: number[]
}

export function parseList(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

function dedupe<T>(items: T[]): T[] {
  return [...new Set(items)]
}

/**
 * Routes are site paths, appended to the base URL by plain concatenation.
 * Anything that could change the host (a scheme, `//host`) is rejected.
 */
export function parseRoutes(input: unknown, source = 'routes'): string[] {
  const items = typeof input === 'string' ? parseList(input) : input
  if (!Array.isArray(items) || items.length === 0) {
    throw new ScreenshotOptionsError(
      `${source} must be a non-empty list of paths such as "/" or "/blog"`
    )
  }
  const routes = items.map((item) => {
    if (
      typeof item !== 'string' ||
      !item.startsWith('/') ||
      item.startsWith('//') ||
      /\s/.test(item) ||
      item.length > MAX_ROUTE_LENGTH
    ) {
      throw new ScreenshotOptionsError(
        `${source}: "${String(item)}" is not a site path. Use a path that starts with a single "/", for example "/blog"; full URLs are not accepted`
      )
    }
    return item
  })
  return dedupe(routes)
}

export function parseWidths(input: unknown, source = 'widths'): number[] {
  const items = typeof input === 'string' ? parseList(input) : input
  if (!Array.isArray(items) || items.length === 0) {
    throw new ScreenshotOptionsError(`${source} must be a non-empty list of pixel widths`)
  }
  const widths = items.map((item) => {
    const value = typeof item === 'string' && /^\d+$/.test(item) ? Number(item) : item
    if (
      typeof value !== 'number' ||
      !Number.isInteger(value) ||
      value < MIN_WIDTH ||
      value > MAX_WIDTH
    ) {
      throw new ScreenshotOptionsError(
        `${source}: "${String(item)}" is not a width between ${MIN_WIDTH} and ${MAX_WIDTH} pixels`
      )
    }
    return value
  })
  return dedupe(widths)
}

export function normalizeBaseUrl(input: string): string {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new ScreenshotOptionsError(`base URL "${input}" is not a valid URL`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ScreenshotOptionsError(`base URL "${input}" must start with http:// or https://`)
  }
  if (url.username || url.password) {
    throw new ScreenshotOptionsError('base URL must not contain credentials')
  }
  return url.origin + url.pathname.replace(/\/+$/, '')
}

function asObject(value: unknown, label: string): Record<string, unknown> | undefined {
  if (value === undefined) return undefined
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ScreenshotOptionsError(`package.json ${label} must be an object`)
  }
  return value as Record<string, unknown>
}

/** Reads `stratawp.screenshots` from a parsed package.json. Wrong shapes name the field. */
export function readScreenshotConfig(pkg: unknown): { routes?: string[]; widths?: number[] } {
  if (pkg === null || typeof pkg !== 'object') return {}
  const stratawp = asObject((pkg as Record<string, unknown>).stratawp, '"stratawp"')
  const screenshots = asObject(stratawp?.screenshots, '"stratawp.screenshots"')
  if (!screenshots) return {}

  const result: { routes?: string[]; widths?: number[] } = {}
  if (screenshots.routes !== undefined) {
    if (!Array.isArray(screenshots.routes)) {
      throw new ScreenshotOptionsError('stratawp.screenshots.routes must be an array')
    }
    result.routes = parseRoutes(screenshots.routes, 'stratawp.screenshots.routes')
  }
  if (screenshots.widths !== undefined) {
    if (!Array.isArray(screenshots.widths)) {
      throw new ScreenshotOptionsError('stratawp.screenshots.widths must be an array')
    }
    result.widths = parseWidths(screenshots.widths, 'stratawp.screenshots.widths')
  }
  return result
}

export interface CaptureInput {
  baseUrl?: string
  routes?: string | string[]
  widths?: string | number[]
}

/** Precedence: explicit input, then package.json config, then env (base URL only), then defaults. */
export function resolveCaptureOptions(
  input: CaptureInput,
  env: NodeJS.ProcessEnv,
  config: { routes?: string[]; widths?: number[] } = {}
): CaptureOptions {
  return {
    baseUrl: normalizeBaseUrl(input.baseUrl ?? env.WP_BASE_URL ?? DEFAULT_BASE_URL),
    routes:
      input.routes !== undefined
        ? parseRoutes(input.routes)
        : (config.routes ?? [...DEFAULT_ROUTES]),
    widths:
      input.widths !== undefined
        ? parseWidths(input.widths)
        : (config.widths ?? [...DEFAULT_WIDTHS]),
  }
}
