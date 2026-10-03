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

| Rule                       | Default                       | Why                                                  |
| -------------------------- | ----------------------------- | ---------------------------------------------------- |
| `max-nesting-depth`        | 3 (blockless-at-rules ignored) | Deep nesting compiles to long, brittle selectors     |
| `selector-max-specificity` | `0,3,1`                       | Low specificity keeps overrides cheap; blocks ids    |
| `custom-property-pattern`  | kebab-case, WordPress `--` ok | Consistent token names, compatible with `theme.json` |

`.scss` files are parsed with `postcss-scss`.

## Overriding

```js
export default {
  extends: ['@stratawp/stylelint-config'],
  rules: { 'max-nesting-depth': [4] },
}
```
