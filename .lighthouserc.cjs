/**
 * Lighthouse CI budget for StrataWP.
 *
 * Target: 100 in all four categories, on mobile and desktop, for every
 * example theme right after `wp theme activate` (default content, logged out).
 * LCP/CLS/TBT budgets stay on top of the category scores.
 *
 * The CI workflow (.github/workflows/perf.yml) boots wp-env, activates one
 * theme per matrix job and runs this config once per preset:
 *
 *   STRATAWP_LH_PRESET=mobile  pnpm test:perf
 *   STRATAWP_LH_PRESET=desktop pnpm test:perf
 *
 * Reports land in lighthouse-reports/<preset>/ and
 * scripts/lighthouse-report.mjs turns them into the gap report.
 */

const PRESETS = ['mobile', 'desktop']
const preset = PRESETS.includes(process.env.STRATAWP_LH_PRESET)
  ? process.env.STRATAWP_LH_PRESET
  : 'desktop'

/**
 * Audits that cannot reach a passing score for a reason outside our control.
 * Keep this short and give every entry a reason a reviewer can check.
 *
 * Each entry turns that audit's own assertion off and lowers its category's
 * floor to `minScore` (the category stays at 1 when it has no entry).
 * `presets` limits the entry to some presets; it applies to all when omitted.
 *
 * Example:
 *   {
 *     audit: 'meta-description',
 *     category: 'seo',
 *     minScore: 0.92,
 *     presets: ['mobile', 'desktop'],
 *     reason: 'Meta descriptions come from an SEO plugin, which a fresh theme does not ship.',
 *   },
 */
const ALLOWLIST = []

const activeAllowlist = ALLOWLIST.filter(
  (entry) => !entry.presets || entry.presets.includes(preset)
)

function categoryFloor(category) {
  return activeAllowlist
    .filter((entry) => entry.category === category)
    .reduce((floor, entry) => Math.min(floor, entry.minScore), 1)
}

const assertions = {
  'categories:performance': ['error', { minScore: categoryFloor('performance') }],
  'categories:accessibility': ['error', { minScore: categoryFloor('accessibility') }],
  'categories:best-practices': ['error', { minScore: categoryFloor('best-practices') }],
  'categories:seo': ['error', { minScore: categoryFloor('seo') }],
  'largest-contentful-paint': ['error', { maxNumericValue: 2000 }],
  'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
  'total-blocking-time': ['error', { maxNumericValue: 200 }],
  // Not part of a category score: warn now, ratchet to error later.
  'modern-image-formats': ['warn', { maxLength: 0 }],
  'uses-responsive-images': ['warn', { maxLength: 0 }],
  'unused-css-rules': ['warn', { maxLength: 0 }],
}
for (const entry of activeAllowlist) assertions[entry.audit] = 'off'

module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:8888/'],
      numberOfRuns: 3,
      // Lighthouse defaults to mobile emulation and throttling.
      settings: preset === 'desktop' ? { preset: 'desktop' } : {},
    },
    assert: { assertions },
    upload: { target: 'filesystem', outputDir: `./lighthouse-reports/${preset}` },
  },
  PRESETS,
  ALLOWLIST,
}
