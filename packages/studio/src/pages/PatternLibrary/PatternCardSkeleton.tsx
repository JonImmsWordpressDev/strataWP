/**
 * PatternCardSkeleton component
 *
 * Skeleton placeholder that matches PatternCard layout for smooth loading experience.
 */

/**
 * Skeleton placeholder for pattern cards during loading
 */
export function PatternCardSkeleton() {
  return (
    <div className="stratawp-pattern-card stratawp-pattern-card--skeleton">
      {/* Preview Area Skeleton */}
      <div className="stratawp-pattern-card__preview">
        <div className="stratawp-pattern-card__skeleton-preview" />
      </div>

      {/* Footer Skeleton */}
      <div className="stratawp-pattern-card__footer">
        <div className="stratawp-pattern-card__info">
          <div className="stratawp-pattern-card__skeleton-title" />
          <div className="stratawp-pattern-card__skeleton-meta" />
        </div>
      </div>
    </div>
  )
}

/**
 * Renders multiple skeleton cards
 */
export function PatternGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="stratawp-pattern-grid">
      <div className="stratawp-pattern-grid__items">
        {Array.from({ length: count }, (_, i) => (
          <PatternCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
