<?php
/**
 * Theme JSON Writer Service
 *
 * @package StrataWP\Studio
 */

namespace StrataWP\Studio\Services;

use WP_Error;

/**
 * Service for writing design tokens to theme.json
 */
class ThemeJsonWriter {
    /**
     * Theme JSON path
     *
     * @var string
     */
    private string $theme_json_path;

    /**
     * Constructor
     */
    public function __construct() {
        $this->theme_json_path = get_stylesheet_directory() . '/theme.json';
    }

    /**
     * Write tokens to theme.json
     *
     * @param array $tokens Design tokens.
     * @return true|WP_Error
     */
    public function write_tokens(array $tokens) {
        if (!file_exists($this->theme_json_path)) {
            return new WP_Error(
                'theme_json_not_found',
                __('theme.json file not found in active theme.', 'stratawp')
            );
        }

        if (!is_writable($this->theme_json_path)) {
            return new WP_Error(
                'theme_json_not_writable',
                __('theme.json file is not writable. Check file permissions.', 'stratawp')
            );
        }

        // Read current theme.json
        $content = file_get_contents($this->theme_json_path);
        $theme_json = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return new WP_Error(
                'theme_json_parse_error',
                __('Failed to parse existing theme.json file.', 'stratawp')
            );
        }

        // Merge tokens into settings
        $theme_json = $this->merge_tokens($theme_json, $tokens);

        // Write back
        $result = file_put_contents(
            $this->theme_json_path,
            json_encode($theme_json, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );

        if ($result === false) {
            return new WP_Error(
                'theme_json_write_error',
                __('Failed to write theme.json file.', 'stratawp')
            );
        }

        return true;
    }

    /**
     * Merge tokens into theme.json structure
     *
     * @param array $theme_json Current theme.json data.
     * @param array $tokens Design tokens to merge.
     * @return array
     */
    private function merge_tokens(array $theme_json, array $tokens): array {
        if (!isset($theme_json['settings'])) {
            $theme_json['settings'] = [];
        }

        // Colors
        if (isset($tokens['colors'])) {
            if (!isset($theme_json['settings']['color'])) {
                $theme_json['settings']['color'] = [];
            }

            if (isset($tokens['colors']['palette'])) {
                $theme_json['settings']['color']['palette'] = $tokens['colors']['palette'];
            }
            if (isset($tokens['colors']['gradients'])) {
                $theme_json['settings']['color']['gradients'] = $tokens['colors']['gradients'];
            }
            if (isset($tokens['colors']['duotone'])) {
                $theme_json['settings']['color']['duotone'] = $tokens['colors']['duotone'];
            }
        }

        // Typography
        if (isset($tokens['typography'])) {
            if (!isset($theme_json['settings']['typography'])) {
                $theme_json['settings']['typography'] = [];
            }

            if (isset($tokens['typography']['fontFamilies'])) {
                $theme_json['settings']['typography']['fontFamilies'] = $tokens['typography']['fontFamilies'];
            }
            if (isset($tokens['typography']['fontSizes'])) {
                $theme_json['settings']['typography']['fontSizes'] = $tokens['typography']['fontSizes'];
            }
        }

        // Spacing
        if (isset($tokens['spacing'])) {
            if (!isset($theme_json['settings']['spacing'])) {
                $theme_json['settings']['spacing'] = [];
            }

            if (isset($tokens['spacing']['spacingSizes'])) {
                $theme_json['settings']['spacing']['spacingSizes'] = $tokens['spacing']['spacingSizes'];
            }
            if (isset($tokens['spacing']['units'])) {
                $theme_json['settings']['spacing']['units'] = $tokens['spacing']['units'];
            }
        }

        // Layout
        if (isset($tokens['layout'])) {
            if (!isset($theme_json['settings']['layout'])) {
                $theme_json['settings']['layout'] = [];
            }

            if (isset($tokens['layout']['contentSize'])) {
                $theme_json['settings']['layout']['contentSize'] = $tokens['layout']['contentSize'];
            }
            if (isset($tokens['layout']['wideSize'])) {
                $theme_json['settings']['layout']['wideSize'] = $tokens['layout']['wideSize'];
            }
        }

        // Shadow
        if (isset($tokens['shadow'])) {
            if (!isset($theme_json['settings']['shadow'])) {
                $theme_json['settings']['shadow'] = [];
            }

            if (isset($tokens['shadow']['presets'])) {
                $theme_json['settings']['shadow']['presets'] = $tokens['shadow']['presets'];
            }
        }

        // Custom
        if (isset($tokens['custom'])) {
            $theme_json['settings']['custom'] = array_merge(
                $theme_json['settings']['custom'] ?? [],
                $tokens['custom']
            );
        }

        return $theme_json;
    }
}
