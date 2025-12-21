/**
 * Preview Mode Utilities
 */

import type { WordPressClient } from '../client/wordpress-client.js'
import type { WPPost, WPPage } from '../types/wordpress.js'

export interface PreviewData {
  id: number
  type: 'post' | 'page'
  status: string
}

/**
 * Enable preview mode
 */
export async function enablePreview(secret: string, previewData: PreviewData) {
  if (typeof window === 'undefined') {
    console.warn('enablePreview should be called on the client')
    return
  }

  try {
    const response = await fetch('/api/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ secret, ...previewData }),
    })

    if (response.ok) {
      const data = await response.json()
      window.location.href = data.url
    }
  } catch (error) {
    console.error('Failed to enable preview:', error)
  }
}

/**
 * Exit preview mode
 */
export async function exitPreview() {
  if (typeof window === 'undefined') {
    console.warn('exitPreview should be called on the client')
    return
  }

  try {
    await fetch('/api/exit-preview', {
      method: 'POST',
    })

    window.location.reload()
  } catch (error) {
    console.error('Failed to exit preview:', error)
  }
}

/**
 * Get preview post
 */
export async function getPreviewPost(
  client: WordPressClient,
  id: number
): Promise<WPPost | null> {
  try {
    return await client.getPost(id, {
      status: ['publish', 'draft', 'pending', 'future', 'private'],
    })
  } catch (error) {
    console.error('Failed to get preview post:', error)
    return null
  }
}

/**
 * Get preview page
 */
export async function getPreviewPage(
  client: WordPressClient,
  id: number
): Promise<WPPage | null> {
  try {
    return await client.getPage(id, {
      status: ['publish', 'draft', 'pending', 'future', 'private'],
    })
  } catch (error) {
    console.error('Failed to get preview page:', error)
    return null
  }
}

/**
 * Verify preview secret
 */
export function verifyPreviewSecret(
  providedSecret: string,
  configSecret: string
): boolean {
  return providedSecret === configSecret
}
