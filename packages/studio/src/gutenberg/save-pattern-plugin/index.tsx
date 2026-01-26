/**
 * Save Pattern Gutenberg Plugin
 *
 * Adds "Save as Pattern" button to block editor toolbar
 */

import { registerPlugin } from '@wordpress/plugins'
import { SavePatternButton } from './SavePatternButton'

registerPlugin('stratawp-save-pattern', {
  render: SavePatternButton,
})
