/**
 * WordPress REST API Types
 */

export interface WPPost {
  id: number
  date: string
  date_gmt: string
  modified: string
  modified_gmt: string
  slug: string
  status: 'publish' | 'future' | 'draft' | 'pending' | 'private'
  type: string
  link: string
  title: WPRendered
  content: WPRendered
  excerpt: WPRendered
  author: number
  featured_media: number
  comment_status: 'open' | 'closed'
  ping_status: 'open' | 'closed'
  sticky: boolean
  template: string
  format: string
  meta: Record<string, any>
  categories: number[]
  tags: number[]
  _links: WPLinks
  _embedded?: WPEmbedded
}

export interface WPPage {
  id: number
  date: string
  date_gmt: string
  modified: string
  modified_gmt: string
  slug: string
  status: 'publish' | 'future' | 'draft' | 'pending' | 'private'
  type: string
  link: string
  title: WPRendered
  content: WPRendered
  excerpt: WPRendered
  author: number
  featured_media: number
  parent: number
  menu_order: number
  comment_status: 'open' | 'closed'
  ping_status: 'open' | 'closed'
  template: string
  meta: Record<string, any>
  _links: WPLinks
  _embedded?: WPEmbedded
}

export interface WPCategory {
  id: number
  count: number
  description: string
  link: string
  name: string
  slug: string
  taxonomy: string
  parent: number
  meta: Record<string, any>
  _links: WPLinks
}

export interface WPTag {
  id: number
  count: number
  description: string
  link: string
  name: string
  slug: string
  taxonomy: string
  meta: Record<string, any>
  _links: WPLinks
}

export interface WPUser {
  id: number
  name: string
  url: string
  description: string
  link: string
  slug: string
  avatar_urls: Record<string, string>
  meta: Record<string, any>
  _links: WPLinks
}

export interface WPMedia {
  id: number
  date: string
  date_gmt: string
  modified: string
  modified_gmt: string
  slug: string
  status: 'publish' | 'future' | 'draft' | 'pending' | 'private'
  type: string
  link: string
  title: WPRendered
  author: number
  comment_status: 'open' | 'closed'
  ping_status: 'open' | 'closed'
  template: string
  meta: Record<string, any>
  description: WPRendered
  caption: WPRendered
  alt_text: string
  media_type: 'image' | 'file' | 'video' | 'audio'
  mime_type: string
  media_details: WPMediaDetails
  post: number | null
  source_url: string
  _links: WPLinks
  _embedded?: WPEmbedded
}

export interface WPMediaDetails {
  width: number
  height: number
  file: string
  filesize?: number
  sizes: Record<string, WPMediaSize>
  image_meta: Record<string, any>
}

export interface WPMediaSize {
  file: string
  width: number
  height: number
  mime_type: string
  source_url: string
}

export interface WPRendered {
  rendered: string
  protected?: boolean
}

export interface WPLinks {
  self: WPLink[]
  collection: WPLink[]
  about: WPLink[]
  author?: WPLink[]
  replies?: WPLink[]
  'version-history'?: WPLink[]
  'predecessor-version'?: WPLink[]
  'wp:attachment'?: WPLink[]
  'wp:term'?: WPLink[]
  'wp:featuredmedia'?: WPLink[]
  curies?: WPLink[]
  [key: string]: WPLink[] | undefined
}

export interface WPLink {
  href: string
  embeddable?: boolean
  count?: number
  taxonomy?: string
  name?: string
  templated?: boolean
}

export interface WPEmbedded {
  author?: WPUser[]
  'wp:featuredmedia'?: WPMedia[]
  'wp:term'?: WPCategory[][] | WPTag[][]
  [key: string]: any
}

export interface WPError {
  code: string
  message: string
  data: {
    status: number
    [key: string]: any
  }
}

export interface WPQueryParams {
  context?: 'view' | 'embed' | 'edit'
  page?: number
  per_page?: number
  search?: string
  after?: string
  author?: number | number[]
  author_exclude?: number | number[]
  before?: string
  exclude?: number | number[]
  include?: number | number[]
  offset?: number
  order?: 'asc' | 'desc'
  orderby?: string
  slug?: string | string[]
  status?: string | string[]
  categories?: number | number[]
  categories_exclude?: number | number[]
  tags?: number | number[]
  tags_exclude?: number | number[]
  sticky?: boolean
  _embed?: boolean
  _fields?: string | string[]
}

export interface WPResponse<T> {
  data: T
  headers: {
    'x-wp-total': string
    'x-wp-totalpages': string
    link?: string
  }
}
