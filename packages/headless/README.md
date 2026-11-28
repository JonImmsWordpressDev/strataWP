# @stratawp/headless

Headless WordPress utilities for StrataWP. Build decoupled WordPress applications with TypeScript, React, and Next.js.

## Features

- **TypeScript-First**: Complete type definitions for WordPress REST API
- **REST API Client**: Fully-featured client with authentication support
- **React Hooks**: SWR-powered hooks for data fetching
- **Next.js Integration**: Static generation, ISR, and preview mode
- **Authentication**: Support for Basic Auth, JWT, Application Passwords, OAuth
- **SEO Utilities**: Generate metadata for posts and pages
- **Image Optimization**: Responsive images and Next.js Image integration
- **Preview Mode**: Full preview mode support for draft content
- **Revalidation**: On-demand revalidation with tags and paths

## Installation

```bash
pnpm add @stratawp/headless
```

For React hooks:

```bash
pnpm add @stratawp/headless swr react
```

For Next.js integration:

```bash
pnpm add @stratawp/headless next
```

## Quick Start

### Basic Usage

```typescript
import { WordPressClient } from '@stratawp/headless'

// Create client
const client = new WordPressClient({
  baseUrl: 'https://your-wordpress-site.com',
})

// Fetch posts
const { data: posts } = await client.getPosts()

// Fetch single post by slug
const post = await client.getPostBySlug('hello-world')

// Fetch pages
const { data: pages } = await client.getPages()
```

### With Authentication

```typescript
import { WordPressClient } from '@stratawp/headless'

const client = new WordPressClient({
  baseUrl: 'https://your-wordpress-site.com',
  auth: {
    type: 'application-password',
    username: 'your-username',
    password: 'your-application-password',
  },
})
```

### React Hooks

```tsx
import { usePosts, usePost } from '@stratawp/headless/react'
import { WordPressClient } from '@stratawp/headless'

const client = new WordPressClient({
  baseUrl: 'https://your-wordpress-site.com',
})

function BlogIndex() {
  const { data, error, isLoading } = usePosts({
    client,
    params: { per_page: 10, _embed: true },
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error loading posts</div>

  return (
    <div>
      {data?.data.map((post) => (
        <article key={post.id}>
          <h2>{post.title.rendered}</h2>
          <div dangerouslySetInnerHTML={{ __html: post.excerpt.rendered }} />
        </article>
      ))}
    </div>
  )
}

function BlogPost({ slug }: { slug: string }) {
  const {
    data: post,
    error,
    isLoading,
  } = usePost({
    client,
    slug,
    params: { _embed: true },
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error loading post</div>
  if (!post) return <div>Post not found</div>

  return (
    <article>
      <h1>{post.title.rendered}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content.rendered }} />
    </article>
  )
}
```

### Next.js App Router

```tsx
// app/blog/page.tsx
import { WordPressClient } from '@stratawp/headless'
import { getAllPosts } from '@stratawp/headless/next'

const client = new WordPressClient({
  baseUrl: process.env.WORDPRESS_URL!,
})

export const revalidate = 60 // Revalidate every 60 seconds

export default async function BlogPage() {
  const posts = await getAllPosts(client, { per_page: 10, _embed: true })

  return (
    <div>
      <h1>Blog</h1>
      {posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title.rendered}</h2>
          <div dangerouslySetInnerHTML={{ __html: post.excerpt.rendered }} />
        </article>
      ))}
    </div>
  )
}
```

```tsx
// app/blog/[slug]/page.tsx
import { WordPressClient } from '@stratawp/headless'
import { generatePostParams } from '@stratawp/headless/next'
import { notFound } from 'next/navigation'

const client = new WordPressClient({
  baseUrl: process.env.WORDPRESS_URL!,
})

export async function generateStaticParams() {
  return await generatePostParams(client)
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await client.getPostBySlug(params.slug, { _embed: true })

  if (!post) {
    notFound()
  }

  return (
    <article>
      <h1>{post.title.rendered}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content.rendered }} />
    </article>
  )
}
```

## API Client

### WordPressClient

```typescript
import { WordPressClient } from '@stratawp/headless'

const client = new WordPressClient({
  baseUrl: 'https://your-site.com',
  auth: {
    type: 'application-password',
    username: 'admin',
    password: 'xxxx xxxx xxxx xxxx',
  },
})
```

### Methods

#### Posts

```typescript
// Get all posts
const { data, headers } = await client.getPosts({
  per_page: 10,
  page: 1,
  _embed: true,
})

// Get single post
const post = await client.getPost(123)

// Get post by slug
const post = await client.getPostBySlug('my-post')
```

#### Pages

```typescript
// Get all pages
const { data, headers } = await client.getPages()

// Get single page
const page = await client.getPage(456)

// Get page by slug
const page = await client.getPageBySlug('about')
```

#### Categories & Tags

```typescript
// Get categories
const { data } = await client.getCategories()

// Get single category
const category = await client.getCategory(1)

// Get tags
const { data } = await client.getTags()

// Get single tag
const tag = await client.getTag(2)
```

#### Media

```typescript
// Get media
const { data } = await client.getMedia()

// Get single media item
const media = await client.getMediaItem(789)
```

#### Generic Requests

```typescript
// Custom GET request
const data = await client.get<CustomType>('custom-endpoint')

// POST request
const result = await client.post('custom-endpoint', { field: 'value' })

// PUT request
const updated = await client.put('custom-endpoint/123', { field: 'new-value' })

// DELETE request
await client.delete('custom-endpoint/123')
```

## React Hooks

### usePosts

```tsx
import { usePosts } from '@stratawp/headless/react'

function BlogList() {
  const { data, error, isLoading, mutate } = usePosts({
    client,
    params: { per_page: 10, _embed: true },
    // SWR options
    revalidateOnFocus: false,
    refreshInterval: 60000,
  })

  return (
    <div>
      {data?.data.map((post) => (
        <div key={post.id}>{post.title.rendered}</div>
      ))}
    </div>
  )
}
```

### usePost

```tsx
import { usePost } from '@stratawp/headless/react'

function PostDetail({ slug }: { slug: string }) {
  const {
    data: post,
    error,
    isLoading,
  } = usePost({
    client,
    slug,
    params: { _embed: true },
  })

  if (!post) return null

  return <article>{post.title.rendered}</article>
}
```

### usePages

```tsx
import { usePages, usePage } from '@stratawp/headless/react'

function PagesList() {
  const { data } = usePages({ client })
  return <div>{/* ... */}</div>
}

function PageDetail({ slug }: { slug: string }) {
  const { data: page } = usePage({ client, slug })
  return <article>{page?.title.rendered}</article>
}
```

### useCategories

```tsx
import { useCategories, useCategory } from '@stratawp/headless/react'

function CategoriesList() {
  const { data } = useCategories({ client })
  return <div>{/* ... */}</div>
}

function CategoryDetail({ id }: { id: number }) {
  const { data: category } = useCategory({ client, id })
  return <div>{category?.name}</div>
}
```

## Next.js Integration

### Static Generation

```tsx
import { getAllPosts, generatePostParams } from '@stratawp/headless/next'

// Generate static params for all posts
export async function generateStaticParams() {
  return await generatePostParams(client)
}

// Or manually
export async function generateStaticParams() {
  const posts = await getAllPosts(client)
  return posts.map((post) => ({ slug: post.slug }))
}
```

### Incremental Static Regeneration (ISR)

```tsx
// app/blog/[slug]/page.tsx
export const revalidate = 60 // Revalidate every 60 seconds

export default async function Page({ params }: { params: { slug: string } }) {
  const post = await client.getPostBySlug(params.slug)
  return <article>{post?.title.rendered}</article>
}
```

### Preview and On-Publish Revalidation (App Router)

With the StrataWP core `Headless` component connected to your frontend (frontend URL and shared secret, see the core README), WordPress points the Preview button at your draft route and sends a signed webhook when content is published, updated, unpublished or trashed. Add the matching routes:

```ts
// app/api/draft/route.ts
import { createDraftModeRoute } from '@stratawp/headless/next'

// Verifies the signed token, enables draft mode, redirects to the post's own path.
export const GET = createDraftModeRoute({ secret: process.env.STRATAWP_HEADLESS_SECRET! })
```

```ts
// app/api/exit-draft/route.ts
import { createExitDraftModeRoute } from '@stratawp/headless/next'

export const GET = createExitDraftModeRoute()
```

```ts
// app/api/revalidate/route.ts
import { createRevalidateRoute } from '@stratawp/headless/next'

// Default: revalidatePath(payload.path) plus tags `wp:<type>` and `wp:<type>:<id>`.
export const POST = createRevalidateRoute({ secret: process.env.STRATAWP_HEADLESS_SECRET! })
```

In a page, check `await isDraftMode()` and fetch the draft by id with an authenticated client (for example `getPreviewPost(client, id)`). Pass `resolvePath` to `createDraftModeRoute()` if your routes don't mirror WordPress permalinks, and `onRevalidate` to `createRevalidateRoute()` to choose your own paths and tags. Webhooks older than `maxAge` seconds (default 300) are rejected.

The signing helpers are exported from the main entry too: `verifyPreviewToken`, `verifyWebhookSignature`, `signPreviewToken`, `signWebhookBody`, `timingSafeEqual`.

### On-Demand Revalidation

```tsx
import { revalidateTag, revalidatePath } from '@stratawp/headless/next'

// In API route or Server Action
export async function POST(request: Request) {
  const { tag } = await request.json()

  // Revalidate by tag
  await revalidateTag(tag)

  // Or revalidate by path
  await revalidatePath('/blog')

  return Response.json({ revalidated: true })
}
```

`revalidateTag` and `revalidatePath` load `next/cache` with a dynamic `import()` and return a promise.

### Preview Mode (Pages Router)

```tsx
// pages/api/preview.ts
import { verifyPreviewSecret } from '@stratawp/headless'

export default function handler(req, res) {
  const { secret, slug } = req.query

  // Constant-time compare; an empty configured secret never matches.
  if (!verifyPreviewSecret(String(secret ?? ''), process.env.PREVIEW_SECRET ?? '')) {
    return res.status(401).json({ message: 'Invalid secret' })
  }

  res.setPreviewData({})
  res.redirect(`/blog/${slug}`)
}
```

## SEO Utilities

### Generate SEO Metadata

```tsx
import { generatePostSEO, generatePageSEO } from '@stratawp/headless'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const post = await client.getPostBySlug(params.slug, { _embed: true })

  if (!post) return {}

  const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0]
  const seo = generatePostSEO(post, 'https://your-site.com', 'Your Site Name', featuredMedia)

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      title: seo.openGraph?.title,
      description: seo.openGraph?.description,
      url: seo.openGraph?.url,
      images: seo.openGraph?.image ? [seo.openGraph.image] : [],
      type: seo.openGraph?.type,
    },
    twitter: {
      card: seo.twitter?.card,
      title: seo.twitter?.title,
      description: seo.twitter?.description,
      images: seo.twitter?.image ? [seo.twitter.image] : [],
    },
  }
}
```

### Extract Excerpt

```typescript
import { extractExcerpt } from '@stratawp/headless'

const excerpt = extractExcerpt(post.excerpt.rendered, 160)
```

## Block Data

When the theme enables the StrataWP core `Headless` component, posts and pages carry a `blocks` field: each block's `name`, `attributes`, `innerBlocks` and server `rendered` HTML. With `blocks.exportTypes` in the theme's vite plugin config, the theme build also writes `block-attributes.d.ts`, which types those attributes.

```typescript
import { createBlockGuard, getBlocks, flattenBlocks } from '@stratawp/headless'
import type { BlockAttributesMap } from './theme/block-attributes'

const isBlock = createBlockGuard<BlockAttributesMap>()

for (const block of getBlocks(post)) {
  if (isBlock(block, 'strata-basic/hero')) {
    renderHero(block.attributes) // typed as HeroAttributes
  } else {
    renderHtml(block.rendered)
  }
}

const heroes = flattenBlocks(getBlocks(post)).filter((b) => isBlock(b, 'strata-basic/hero'))
```

## Image Utilities

### Responsive Images

```tsx
import { getImageSrcSet, getImageSizes, getImageAlt } from '@stratawp/headless'

function PostImage({ media }: { media: WPMedia }) {
  return (
    <img
      src={media.source_url}
      srcSet={getImageSrcSet(media)}
      sizes={getImageSizes(800)}
      alt={getImageAlt(media)}
    />
  )
}
```

### Next.js Image Component

```tsx
import Image from 'next/image'
import { getNextImageProps } from '@stratawp/headless'

function PostFeaturedImage({ media }: { media: WPMedia }) {
  const imageProps = getNextImageProps(media, {
    width: 1200,
    height: 630,
    quality: 85,
  })

  return <Image {...imageProps} />
}
```

### Optimized Image URL

```typescript
import { getOptimizedImageUrl } from '@stratawp/headless'

const optimizedUrl = getOptimizedImageUrl(media, {
  width: 800,
  height: 600,
})
```

## Authentication

### Basic Authentication

```typescript
const client = new WordPressClient({
  baseUrl: 'https://your-site.com',
  auth: {
    type: 'basic',
    username: 'admin',
    password: 'password',
  },
})
```

### Application Passwords

```typescript
const client = new WordPressClient({
  baseUrl: 'https://your-site.com',
  auth: {
    type: 'application-password',
    username: 'admin',
    password: 'xxxx xxxx xxxx xxxx', // From WordPress Application Passwords
  },
})
```

### JWT Authentication

```typescript
const client = new WordPressClient({
  baseUrl: 'https://your-site.com',
  auth: {
    type: 'jwt',
    token: 'your-jwt-token',
  },
})
```

### OAuth

```typescript
const client = new WordPressClient({
  baseUrl: 'https://your-site.com',
  auth: {
    type: 'oauth',
    token: 'your-oauth-token',
  },
})
```

## TypeScript Types

All WordPress REST API types are fully typed:

```typescript
import type {
  WPPost,
  WPPage,
  WPCategory,
  WPTag,
  WPUser,
  WPMedia,
  WPQueryParams,
  WPResponse,
} from '@stratawp/headless'
```

## Environment Variables

```env
# .env.local
WORDPRESS_URL=https://your-wordpress-site.com
WORDPRESS_AUTH_USERNAME=admin
WORDPRESS_AUTH_PASSWORD=xxxx xxxx xxxx xxxx
PREVIEW_SECRET=your-preview-secret
```

## Examples

### Complete Next.js App Router Example

```tsx
// lib/wordpress.ts
import { WordPressClient } from '@stratawp/headless'

export const wordpress = new WordPressClient({
  baseUrl: process.env.WORDPRESS_URL!,
  auth: {
    type: 'application-password',
    username: process.env.WORDPRESS_AUTH_USERNAME!,
    password: process.env.WORDPRESS_AUTH_PASSWORD!,
  },
})
```

```tsx
// app/blog/page.tsx
import { wordpress } from '@/lib/wordpress'

export const revalidate = 60

export default async function BlogPage() {
  const { data: posts } = await wordpress.getPosts({
    per_page: 10,
    _embed: true,
  })

  return (
    <div>
      <h1>Blog</h1>
      {posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title.rendered}</h2>
          <div dangerouslySetInnerHTML={{ __html: post.excerpt.rendered }} />
          <a href={`/blog/${post.slug}`}>Read more</a>
        </article>
      ))}
    </div>
  )
}
```

## Contributing

Contributions are welcome! Please see the [main StrataWP repository](https://github.com/JonImmsWordpressDev/StrataWP) for contribution guidelines.

## License

GPL-3.0-or-later

## Support

- **Issues**: https://github.com/JonImmsWordpressDev/StrataWP/issues
- **Discussions**: https://github.com/JonImmsWordpressDev/StrataWP/discussions
- **Documentation**: https://github.com/JonImmsWordpressDev/StrataWP#readme

---

**Go Headless!** Build modern, decoupled WordPress applications with StrataWP.
