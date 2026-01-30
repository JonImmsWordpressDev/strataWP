/**
 * BlockCardSkeleton component
 *
 * Skeleton placeholder that matches BlockCard layout for smooth loading experience.
 */

/**
 * Skeleton placeholder for block cards during loading
 */
export function BlockCardSkeleton() {
  return (
    <div className="stratawp-block-card stratawp-block-card--skeleton">
      {/* Icon Area Skeleton */}
      <div className="stratawp-block-card__icon">
        <div className="stratawp-block-card__skeleton-icon" />
      </div>

      {/* Content Skeleton */}
      <div className="stratawp-block-card__content">
        <div className="stratawp-block-card__skeleton-title" />
        <div className="stratawp-block-card__skeleton-description" />
        <div className="stratawp-block-card__skeleton-meta" />
      </div>
    </div>
  )
}

/**
 * Renders multiple skeleton cards
 */
export function BlockGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="stratawp-block-grid">
      <div className="stratawp-block-grid__items">
        {Array.from({ length: count }, (_, i) => (
          <BlockCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
