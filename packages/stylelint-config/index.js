import postcssScss from 'postcss-scss'

/**
 * Default thresholds. Override a rule in your own config to change one:
 *   { extends: ['@stratawp/stylelint-config'], rules: { 'max-nesting-depth': [4] } }
 */
export const thresholds = {
  // Deep nesting compiles to long, brittle selectors.
  maxNestingDepth: 3,
  // 0 ids, 3 classes, 1 type. Low specificity keeps overrides cheap and
  // cascade layers predictable.
  maxSpecificity: '0,3,1',
}

// Overrides of WooCommerce core selectors (e.g. `.woocommerce table.cart
// .actions .coupon input[type="text"]`) must match WooCommerce's own
// specificity to win, so WooCommerce override files get a higher cap.
// Measured maximum across the shipped store theme stylesheets.
const woocommerceMaxSpecificity = '0,5,2'

export default {
  rules: {
    'max-nesting-depth': [
      thresholds.maxNestingDepth,
      {
        ignore: ['blockless-at-rules', 'pseudo-classes'],
        ignoreAtRules: ['media', 'supports', 'container', 'include'],
      },
    ],
    'selector-max-specificity': thresholds.maxSpecificity,
    // kebab-case, with the double-dash segments WordPress generates
    // (--wp--preset--color--primary).
    'custom-property-pattern': [
      '^[a-z][a-z0-9]*(?:-{1,2}[a-z0-9]+)*$',
      { message: 'Custom properties must be kebab-case (WordPress "--" segments allowed)' },
    ],
  },
  overrides: [
    {
      files: ['**/*.scss'],
      customSyntax: postcssScss,
    },
    {
      files: ['**/*woocommerce*.{css,scss}'],
      rules: { 'selector-max-specificity': woocommerceMaxSpecificity },
    },
  ],
}
