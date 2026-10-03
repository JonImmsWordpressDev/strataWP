import type { FullConfig } from '@playwright/test'

/**
 * Fail fast, once, with an actionable message if WordPress is not answering,
 * instead of letting every test time out separately.
 */
export async function checkSiteReachable(
  url: string,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  let detail: string
  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(10_000) })
    if (response.ok) {
      return
    }
    detail = `HTTP ${response.status}`
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const code = (error as { cause?: { code?: string } }).cause?.code
    detail = code ? `${message}, ${code}` : message
  }
  throw new Error(
    `StrataWP smoke tests: ${url} is not reachable (${detail}). ` +
      `Start WordPress first (for example: pnpm exec wp-env start) or set WP_BASE_URL.`
  )
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL
  if (baseURL) {
    await checkSiteReachable(baseURL)
  }
}
