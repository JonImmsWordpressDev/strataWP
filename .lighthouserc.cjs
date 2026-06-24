/**
 * Lighthouse CI budget for StrataWP.
 *
 * The comparison target (codename "Triple XXX") ships a budget
 * (perf/a11y/bp/seo >= 0.9, LCP <= 2500ms, CLS <= 0.1, TBT <= 300ms) but
 * never runs it in CI. StrataWP runs it as a gate, and tightens it where
 * the example theme's measured scores give headroom.
 *
 * The CI workflow boots wp-env and activates the example theme before this runs.
 */
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:8888/'],
      numberOfRuns: 3,
      settings: { preset: 'desktop' },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }], // theirs: 0.90
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2000 }], // theirs: 2500
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }], // theirs: 300
        // Audits their budget omits — warn now, ratchet to error later.
        'modern-image-formats': ['warn', { maxLength: 0 }],
        'uses-responsive-images': ['warn', { maxLength: 0 }],
        'unused-css-rules': ['warn', { maxLength: 0 }],
      },
    },
    upload: { target: 'filesystem', outputDir: './.lighthouseci' },
  },
};
