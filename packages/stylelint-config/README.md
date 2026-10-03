# @stratawp/stylelint-config

Strict, performance-minded Stylelint preset for StrataWP themes.

```bash
pnpm add -D stylelint @stratawp/stylelint-config
```

```js
// stylelint.config.js
export { default } from '@stratawp/stylelint-config'
```

## Rules

| Rule                       | Default                                        | Why                                                  |
| -------------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| `max-nesting-depth`        | 3 levels (pseudo-classes and at-rules ignored) | Deep nesting compiles to long, brittle selectors     |
| `selector-max-specificity` | `0,3,1`                                        | Low specificity keeps overrides cheap; blocks ids    |
| `custom-property-pattern`  | kebab-case, WordPress `--` ok                  | Consistent token names, compatible with `theme.json` |

Nested selectors are resolved before `selector-max-specificity` is applied, so a deeply nested rule can trigger both rules.

Files matching `*woocommerce*.{css,scss}` use a higher `selector-max-specificity` cap of `0,5,2`. Overrides of WooCommerce core selectors must match WooCommerce's own specificity to win the cascade, so they cannot stay under the global cap. The exception applies only to those files.

`.scss` files are parsed with `postcss-scss`.

## Overriding

```js
export default {
  extends: ['@stratawp/stylelint-config'],
  rules: { 'max-nesting-depth': [4] },
}
```
