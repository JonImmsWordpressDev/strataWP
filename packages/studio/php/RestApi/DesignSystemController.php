<?php
/**
 * Design System REST API Controller
 *
 * @package StrataWP\Studio
 */

namespace StrataWP\Studio\RestApi;

use WP_REST_Controller;
use WP_REST_Server;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use StrataWP\Studio\Services\ThemeJsonWriter;

/**
 * Design System REST API Controller
 */
class DesignSystemController extends WP_REST_Controller {
    /**
     * Namespace
     *
     * @var string
     */
    protected $namespace = 'stratawp/v1';

    /**
     * Resource name
     *
     * @var string
     */
    protected $rest_base = 'design-system';

    /**
     * Register routes
     */
    public function register_routes(): void {
        // GET/POST design system
        register_rest_route($this->namespace, '/' . $this->rest_base, [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [$this, 'get_design_system'],
                'permission_callback' => [$this, 'get_permission_check'],
            ],
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'save_design_system'],
                'permission_callback' => [$this, 'edit_permission_check'],
                'args' => $this->get_save_args(),
            ],
        ]);

        // GET presets
        register_rest_route($this->namespace, '/' . $this->rest_base . '/presets', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [$this, 'get_presets'],
            'permission_callback' => [$this, 'get_permission_check'],
        ]);

        // POST apply preset
        register_rest_route($this->namespace, '/' . $this->rest_base . '/presets/(?P<id>[a-z0-9-]+)/apply', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [$this, 'apply_preset'],
            'permission_callback' => [$this, 'edit_permission_check'],
            'args' => [
                'id' => [
                    'required' => true,
                    'type' => 'string',
                ],
            ],
        ]);

        // GET export
        register_rest_route($this->namespace, '/' . $this->rest_base . '/export', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [$this, 'export_design_system'],
            'permission_callback' => [$this, 'get_permission_check'],
        ]);

        // POST import
        register_rest_route($this->namespace, '/' . $this->rest_base . '/import', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [$this, 'import_design_system'],
            'permission_callback' => [$this, 'edit_permission_check'],
        ]);
    }

    /**
     * Permission check for reading
     *
     * @return bool|WP_Error
     */
    public function get_permission_check() {
        if (!current_user_can('edit_theme_options')) {
            return new WP_Error(
                'rest_forbidden',
                __('You do not have permission to access this resource.', 'stratawp'),
                ['status' => 403]
            );
        }
        return true;
    }

    /**
     * Permission check for editing
     *
     * @return bool|WP_Error
     */
    public function edit_permission_check() {
        if (!current_user_can('edit_theme_options')) {
            return new WP_Error(
                'rest_forbidden',
                __('You do not have permission to modify this resource.', 'stratawp'),
                ['status' => 403]
            );
        }
        return true;
    }

    /**
     * Get design system
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response|WP_Error
     */
    public function get_design_system(WP_REST_Request $request) {
        $theme_json_path = get_stylesheet_directory() . '/theme.json';

        if (!file_exists($theme_json_path)) {
            return new WP_Error(
                'theme_json_not_found',
                __('theme.json file not found in active theme.', 'stratawp'),
                ['status' => 404]
            );
        }

        $file_mtime = filemtime($theme_json_path);
        $etag = '"' . md5($theme_json_path . $file_mtime) . '"';

        // Check for conditional request (If-None-Match)
        $if_none_match = $request->get_header('If-None-Match');
        if ($if_none_match && $if_none_match === $etag) {
            return new WP_REST_Response(null, 304);
        }

        $theme_json = json_decode(file_get_contents($theme_json_path), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return new WP_Error(
                'theme_json_parse_error',
                __('Failed to parse theme.json file.', 'stratawp'),
                ['status' => 500]
            );
        }

        $tokens = $this->extract_tokens_from_theme_json($theme_json);
        $active_preset = get_option('stratawp_active_preset', null);

        $response = new WP_REST_Response([
            'tokens' => $tokens,
            'activePreset' => $active_preset,
            'lastModified' => date('c', $file_mtime),
        ]);

        // Add caching headers
        $response->header('ETag', $etag);
        $response->header('Last-Modified', gmdate('D, d M Y H:i:s', $file_mtime) . ' GMT');
        $response->header('Cache-Control', 'private, max-age=60');

        return $response;
    }

    /**
     * Save design system
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response|WP_Error
     */
    public function save_design_system(WP_REST_Request $request) {
        $tokens = $request->get_param('tokens');
        $write_to_theme_json = $request->get_param('writeToThemeJson') ?? true;

        // Validate token structure
        if (!$this->validate_tokens_structure($tokens)) {
            return new WP_Error(
                'invalid_token_structure',
                __('Invalid token structure.', 'stratawp'),
                ['status' => 400]
            );
        }

        if ($write_to_theme_json) {
            $writer = new ThemeJsonWriter();
            $result = $writer->write_tokens($tokens);

            if (is_wp_error($result)) {
                return $result;
            }
        }

        // Store in options as backup
        update_option('stratawp_design_tokens', $tokens);
        update_option('stratawp_active_preset', null);

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'tokens' => $tokens,
                'activePreset' => null,
                'lastModified' => date('c'),
            ],
        ]);
    }

    /**
     * Get presets
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response
     */
    public function get_presets(WP_REST_Request $request) {
        $presets = $this->get_bundled_presets();

        // Generate ETag based on preset content (static, so use version)
        $etag = '"presets-' . md5(wp_json_encode($presets)) . '"';

        // Check for conditional request
        $if_none_match = $request->get_header('If-None-Match');
        if ($if_none_match && $if_none_match === $etag) {
            return new WP_REST_Response(null, 304);
        }

        $response = new WP_REST_Response($presets);

        // Presets are static, cache for longer
        $response->header('ETag', $etag);
        $response->header('Cache-Control', 'private, max-age=3600');

        return $response;
    }

    /**
     * Apply preset
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response|WP_Error
     */
    public function apply_preset(WP_REST_Request $request) {
        $preset_id = $request->get_param('id');
        $presets = $this->get_bundled_presets();

        $preset = null;
        foreach ($presets as $p) {
            if ($p['id'] === $preset_id) {
                $preset = $p;
                break;
            }
        }

        if (!$preset) {
            return new WP_Error(
                'preset_not_found',
                __('Preset not found.', 'stratawp'),
                ['status' => 404]
            );
        }

        // Get current tokens from theme.json to merge with preset
        $theme_json_path = get_stylesheet_directory() . '/theme.json';
        $current_tokens = [];
        if (file_exists($theme_json_path)) {
            $theme_json = json_decode(file_get_contents($theme_json_path), true);
            if ($theme_json) {
                $current_tokens = $this->extract_tokens_from_theme_json($theme_json);
            }
        }

        // Merge preset tokens with current tokens (preset overrides current)
        $merged_tokens = $this->merge_tokens($current_tokens, $preset['tokens']);

        // Write merged tokens to theme.json
        $writer = new ThemeJsonWriter();
        $result = $writer->write_tokens($merged_tokens);

        if (is_wp_error($result)) {
            return $result;
        }

        update_option('stratawp_active_preset', $preset_id);
        update_option('stratawp_design_tokens', $merged_tokens);

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'tokens' => $merged_tokens,
                'activePreset' => $preset_id,
                'lastModified' => date('c'),
            ],
        ]);
    }

    /**
     * Deep merge tokens arrays
     *
     * @param array $current Current tokens.
     * @param array $preset  Preset tokens to merge in.
     * @return array Merged tokens.
     */
    private function merge_tokens(array $current, array $preset): array {
        $merged = $current;

        foreach ($preset as $key => $value) {
            if (is_array($value) && isset($merged[$key]) && is_array($merged[$key])) {
                $merged[$key] = $this->merge_tokens($merged[$key], $value);
            } else {
                $merged[$key] = $value;
            }
        }

        return $merged;
    }

    /**
     * Export design system
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response|WP_Error
     */
    public function export_design_system(WP_REST_Request $request) {
        $theme_json_path = get_stylesheet_directory() . '/theme.json';

        if (!file_exists($theme_json_path)) {
            return new WP_Error(
                'theme_json_not_found',
                __('theme.json file not found.', 'stratawp'),
                ['status' => 404]
            );
        }

        $theme_json = json_decode(file_get_contents($theme_json_path), true);
        $tokens = $this->extract_tokens_from_theme_json($theme_json);

        return new WP_REST_Response($tokens);
    }

    /**
     * Import design system
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response|WP_Error
     */
    public function import_design_system(WP_REST_Request $request) {
        $files = $request->get_file_params();

        if (empty($files['file'])) {
            return new WP_Error(
                'no_file',
                __('No file uploaded.', 'stratawp'),
                ['status' => 400]
            );
        }

        $file = $files['file'];

        // Validate file size (1MB max)
        if ($file['size'] > 1048576) {
            return new WP_Error(
                'file_too_large',
                __('File exceeds maximum size of 1MB.', 'stratawp'),
                ['status' => 400]
            );
        }

        // Validate file extension
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        if (strtolower($extension) !== 'json') {
            return new WP_Error(
                'invalid_file_type',
                __('Only JSON files are allowed.', 'stratawp'),
                ['status' => 400]
            );
        }

        $content = file_get_contents($file['tmp_name']);
        $tokens = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return new WP_Error(
                'invalid_json',
                __('Invalid JSON file.', 'stratawp'),
                ['status' => 400]
            );
        }

        // Validate token structure
        if (!$this->validate_tokens_structure($tokens)) {
            return new WP_Error(
                'invalid_token_structure',
                __('Invalid token structure in JSON file.', 'stratawp'),
                ['status' => 400]
            );
        }

        $writer = new ThemeJsonWriter();
        $result = $writer->write_tokens($tokens);

        if (is_wp_error($result)) {
            return $result;
        }

        update_option('stratawp_design_tokens', $tokens);
        update_option('stratawp_active_preset', null);

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'tokens' => $tokens,
                'activePreset' => null,
                'lastModified' => date('c'),
            ],
        ]);
    }

    /**
     * Extract tokens from theme.json
     *
     * @param array $theme_json Theme JSON data.
     * @return array
     */
    private function extract_tokens_from_theme_json(array $theme_json): array {
        $settings = $theme_json['settings'] ?? [];

        return [
            'colors' => [
                'palette' => $settings['color']['palette'] ?? [],
                'gradients' => $settings['color']['gradients'] ?? [],
                'duotone' => $settings['color']['duotone'] ?? [],
            ],
            'typography' => [
                'fontFamilies' => $settings['typography']['fontFamilies'] ?? [],
                'fontSizes' => $settings['typography']['fontSizes'] ?? [],
            ],
            'spacing' => [
                'spacingSizes' => $settings['spacing']['spacingSizes'] ?? [],
                'units' => $settings['spacing']['units'] ?? ['px', 'em', 'rem', 'vh', 'vw', '%'],
            ],
            'layout' => [
                'contentSize' => $settings['layout']['contentSize'] ?? '640px',
                'wideSize' => $settings['layout']['wideSize'] ?? '1200px',
            ],
            'shadow' => [
                'presets' => $settings['shadow']['presets'] ?? [],
            ],
            'custom' => $settings['custom'] ?? [],
        ];
    }

    /**
     * Get bundled presets
     *
     * @return array
     */
    private function get_bundled_presets(): array {
        return [
            [
                'id' => 'modern-minimal',
                'name' => 'Modern Minimal',
                'description' => 'Clean, whitespace-heavy design with neutral tones',
                'tokens' => [
                    'colors' => [
                        'palette' => [
                            ['slug' => 'base', 'name' => 'Base', 'color' => '#ffffff'],
                            ['slug' => 'contrast', 'name' => 'Contrast', 'color' => '#1a1a1a'],
                            ['slug' => 'primary', 'name' => 'Primary', 'color' => '#2563eb'],
                            ['slug' => 'secondary', 'name' => 'Secondary', 'color' => '#64748b'],
                            ['slug' => 'neutral', 'name' => 'Neutral', 'color' => '#f1f5f9'],
                        ],
                    ],
                    'layout' => [
                        'contentSize' => '680px',
                        'wideSize' => '1200px',
                    ],
                ],
            ],
            [
                'id' => 'bold-editorial',
                'name' => 'Bold Editorial',
                'description' => 'High contrast, dramatic design',
                'tokens' => [
                    'colors' => [
                        'palette' => [
                            ['slug' => 'base', 'name' => 'Base', 'color' => '#ffffff'],
                            ['slug' => 'contrast', 'name' => 'Contrast', 'color' => '#000000'],
                            ['slug' => 'primary', 'name' => 'Primary', 'color' => '#dc2626'],
                            ['slug' => 'secondary', 'name' => 'Secondary', 'color' => '#1e293b'],
                            ['slug' => 'neutral', 'name' => 'Neutral', 'color' => '#e2e8f0'],
                        ],
                    ],
                    'layout' => [
                        'contentSize' => '720px',
                        'wideSize' => '1280px',
                    ],
                ],
            ],
        ];
    }

    /**
     * Get save arguments
     *
     * @return array
     */
    private function get_save_args(): array {
        return [
            'tokens' => [
                'required' => true,
                'type' => 'object',
            ],
            'writeToThemeJson' => [
                'type' => 'boolean',
                'default' => true,
            ],
        ];
    }

    /**
     * Validate token structure
     *
     * @param array $tokens Tokens to validate.
     * @return bool
     */
    private function validate_tokens_structure(array $tokens): bool {
        $valid_keys = ['colors', 'typography', 'spacing', 'layout', 'shadow', 'custom'];

        foreach (array_keys($tokens) as $key) {
            if (!in_array($key, $valid_keys, true)) {
                return false;
            }
        }

        // Validate colors structure if present
        if (isset($tokens['colors']) && !is_array($tokens['colors'])) {
            return false;
        }

        // Validate typography structure if present
        if (isset($tokens['typography']) && !is_array($tokens['typography'])) {
            return false;
        }

        return true;
    }
}
