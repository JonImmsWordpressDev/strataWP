/**
 * WordPress REST API Client
 */

import ky, { type KyInstance, type Options } from 'ky'
import type {
  WPPost,
  WPPage,
  WPCategory,
  WPTag,
  WPUser,
  WPMedia,
  WPQueryParams,
  WPResponse,
} from '../types/wordpress.js'
import type { HeadlessConfig, FetchOptions } from '../types/config.js'

export class WordPressClient {
  private api: KyInstance
  private baseUrl: string
  private config: HeadlessConfig

  constructor(config: HeadlessConfig) {
    this.config = config
    this.baseUrl = config.baseUrl.replace(/\/$/, '')

    const options: Options = {
      prefixUrl: `${this.baseUrl}/wp-json/wp/v2`,
      headers: this.getAuthHeaders(),
    }

    this.api = ky.create(options)
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}

    if (!this.config.auth) {
      return headers
    }

    switch (this.config.auth.type) {
      case 'basic':
        if (this.config.auth.username && this.config.auth.password) {
          const credentials = btoa(
            `${this.config.auth.username}:${this.config.auth.password}`
          )
          headers['Authorization'] = `Basic ${credentials}`
        }
        break

      case 'jwt':
      case 'oauth':
        if (this.config.auth.token) {
          headers['Authorization'] = `Bearer ${this.config.auth.token}`
        }
        break

      case 'application-password':
        if (this.config.auth.username && this.config.auth.password) {
          const credentials = btoa(
            `${this.config.auth.username}:${this.config.auth.password}`
          )
          headers['Authorization'] = `Basic ${credentials}`
        }
        break
    }

    return headers
  }

  /**
   * Build query string from params
   */
  private buildQueryString(params?: WPQueryParams): string {
    if (!params) return ''

    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return

      if (Array.isArray(value)) {
        searchParams.set(key, value.join(','))
      } else if (typeof value === 'boolean') {
        searchParams.set(key, value ? '1' : '0')
      } else {
        searchParams.set(key, String(value))
      }
    })

    return searchParams.toString()
  }

  /**
   * Get posts
   */
  async getPosts(
    params?: WPQueryParams,
    options?: FetchOptions
  ): Promise<WPResponse<WPPost[]>> {
    const query = this.buildQueryString(params)
    const response = await this.api.get(`posts?${query}`, {
      cache: options?.cache,
    })

    const data = await response.json<WPPost[]>()
    const headers = {
      'x-wp-total': response.headers.get('x-wp-total') || '0',
      'x-wp-totalpages': response.headers.get('x-wp-totalpages') || '0',
      link: response.headers.get('link') || undefined,
    }

    return { data, headers }
  }

  /**
   * Get single post
   */
  async getPost(
    id: number,
    params?: WPQueryParams,
    options?: FetchOptions
  ): Promise<WPPost> {
    const query = this.buildQueryString(params)
    const response = await this.api.get(`posts/${id}?${query}`, {
      cache: options?.cache,
    })
    return response.json<WPPost>()
  }

  /**
   * Get post by slug
   */
  async getPostBySlug(
    slug: string,
    params?: WPQueryParams,
    options?: FetchOptions
  ): Promise<WPPost | null> {
    const response = await this.getPosts({ ...params, slug }, options)
    return response.data[0] || null
  }

  /**
   * Get pages
   */
  async getPages(
    params?: WPQueryParams,
    options?: FetchOptions
  ): Promise<WPResponse<WPPage[]>> {
    const query = this.buildQueryString(params)
    const response = await this.api.get(`pages?${query}`, {
      cache: options?.cache,
    })

    const data = await response.json<WPPage[]>()
    const headers = {
      'x-wp-total': response.headers.get('x-wp-total') || '0',
      'x-wp-totalpages': response.headers.get('x-wp-totalpages') || '0',
      link: response.headers.get('link') || undefined,
    }

    return { data, headers }
  }

  /**
   * Get single page
   */
  async getPage(
    id: number,
    params?: WPQueryParams,
    options?: FetchOptions
  ): Promise<WPPage> {
    const query = this.buildQueryString(params)
    const response = await this.api.get(`pages/${id}?${query}`, {
      cache: options?.cache,
    })
    return response.json<WPPage>()
  }

  /**
   * Get page by slug
   */
  async getPageBySlug(
    slug: string,
    params?: WPQueryParams,
    options?: FetchOptions
  ): Promise<WPPage | null> {
    const response = await this.getPages({ ...params, slug }, options)
    return response.data[0] || null
  }

  /**
   * Get categories
   */
  async getCategories(
    params?: WPQueryParams,
    options?: FetchOptions
  ): Promise<WPResponse<WPCategory[]>> {
    const query = this.buildQueryString(params)
    const response = await this.api.get(`categories?${query}`, {
      cache: options?.cache,
    })

    const data = await response.json<WPCategory[]>()
    const headers = {
      'x-wp-total': response.headers.get('x-wp-total') || '0',
      'x-wp-totalpages': response.headers.get('x-wp-totalpages') || '0',
      link: response.headers.get('link') || undefined,
    }

    return { data, headers }
  }

  /**
   * Get single category
   */
  async getCategory(
    id: number,
    params?: WPQueryParams,
    options?: FetchOptions
  ): Promise<WPCategory> {
    const query = this.buildQueryString(params)
    const response = await this.api.get(`categories/${id}?${query}`, {
      cache: options?.cache,
    })
    return response.json<WPCategory>()
  }

  /**
   * Get tags
   */
  async getTags(
    params?: WPQueryParams,
    options?: FetchOptions
  ): Promise<WPResponse<WPTag[]>> {
    const query = this.buildQueryString(params)
    const response = await this.api.get(`tags?${query}`, {
      cache: options?.cache,
    })

    const data = await response.json<WPTag[]>()
    const headers = {
      'x-wp-total': response.headers.get('x-wp-total') || '0',
      'x-wp-totalpages': response.headers.get('x-wp-totalpages') || '0',
      link: response.headers.get('link') || undefined,
    }

    return { data, headers }
  }

  /**
   * Get single tag
   */
  async getTag(
    id: number,
    params?: WPQueryParams,
    options?: FetchOptions
  ): Promise<WPTag> {
    const query = this.buildQueryString(params)
    const response = await this.api.get(`tags/${id}?${query}`, {
      cache: options?.cache,
    })
    return response.json<WPTag>()
  }

  /**
   * Get users
   */
  async getUsers(
    params?: WPQueryParams,
    options?: FetchOptions
  ): Promise<WPResponse<WPUser[]>> {
    const query = this.buildQueryString(params)
    const response = await this.api.get(`users?${query}`, {
      cache: options?.cache,
    })

    const data = await response.json<WPUser[]>()
    const headers = {
      'x-wp-total': response.headers.get('x-wp-total') || '0',
      'x-wp-totalpages': response.headers.get('x-wp-totalpages') || '0',
      link: response.headers.get('link') || undefined,
    }

    return { data, headers }
  }

  /**
   * Get single user
   */
  async getUser(
    id: number,
    params?: WPQueryParams,
    options?: FetchOptions
  ): Promise<WPUser> {
    const query = this.buildQueryString(params)
    const response = await this.api.get(`users/${id}?${query}`, {
      cache: options?.cache,
    })
    return response.json<WPUser>()
  }

  /**
   * Get media
   */
  async getMedia(
    params?: WPQueryParams,
    options?: FetchOptions
  ): Promise<WPResponse<WPMedia[]>> {
    const query = this.buildQueryString(params)
    const response = await this.api.get(`media?${query}`, {
      cache: options?.cache,
    })

    const data = await response.json<WPMedia[]>()
    const headers = {
      'x-wp-total': response.headers.get('x-wp-total') || '0',
      'x-wp-totalpages': response.headers.get('x-wp-totalpages') || '0',
      link: response.headers.get('link') || undefined,
    }

    return { data, headers }
  }

  /**
   * Get single media item
   */
  async getMediaItem(
    id: number,
    params?: WPQueryParams,
    options?: FetchOptions
  ): Promise<WPMedia> {
    const query = this.buildQueryString(params)
    const response = await this.api.get(`media/${id}?${query}`, {
      cache: options?.cache,
    })
    return response.json<WPMedia>()
  }

  /**
   * Generic GET request
   */
  async get<T>(endpoint: string, options?: FetchOptions): Promise<T> {
    const response = await this.api.get(endpoint, {
      cache: options?.cache,
    })
    return response.json<T>()
  }

  /**
   * Generic POST request
   */
  async post<T>(endpoint: string, data: any, options?: FetchOptions): Promise<T> {
    const response = await this.api.post(endpoint, {
      json: data,
      cache: options?.cache,
    })
    return response.json<T>()
  }

  /**
   * Generic PUT request
   */
  async put<T>(endpoint: string, data: any, options?: FetchOptions): Promise<T> {
    const response = await this.api.put(endpoint, {
      json: data,
      cache: options?.cache,
    })
    return response.json<T>()
  }

  /**
   * Generic DELETE request
   */
  async delete<T>(endpoint: string, options?: FetchOptions): Promise<T> {
    const response = await this.api.delete(endpoint, {
      cache: options?.cache,
    })
    return response.json<T>()
  }
}
