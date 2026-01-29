<?php
/**
 * Blocks REST API Controller
 *
 * @package StrataWP\Studio
 */

namespace StrataWP\Studio\RestApi;

use WP_REST_Controller;
use WP_REST_Server;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use WP_Block_Type_Registry;

/**
 * Blocks REST API Controller
 *
 * Provides endpoints for browsing registered Gutenberg blocks.
 */
class BlocksController extends WP_REST_Controller {
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
    protected $rest_base = 'blocks';

    /**
     * Register routes
     */
    public function register_routes(): void {
        // GET /blocks - list all registered blocks
        register_rest_route($this->namespace, '/' . $this->rest_base, [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_blocks'],
            'permission_callback' => [$this, 'get_permission_check'],
            'args'                => $this->get_collection_params(),
        ]);

        // GET /blocks/categories - list block categories
        register_rest_route($this->namespace, '/' . $this->rest_base . '/categories', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_categories'],
            'permission_callback' => [$this, 'get_permission_check'],
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
     * Get blocks list with optional filtering
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response|WP_Error
     */
    public function get_blocks(WP_REST_Request $request) {
        $search   = $request->get_param('search');
        $category = $request->get_param('category');
        $source   = $request->get_param('source');

        $registry     = WP_Block_Type_Registry::get_instance();
        $all_blocks   = $registry->get_all_registered();
        $theme_slug   = get_stylesheet();
        $blocks       = [];
        $categories   = [];

        foreach ($all_blocks as $block_name => $block_type) {
            // Determine source
            $block_source = $this->determine_block_source($block_name, $theme_slug);

            // Apply source filter
            if ($source && $source !== 'all' && $block_source !== $source) {
                continue;
            }

            // Apply category filter
            if ($category && $block_type->category !== $category) {
                continue;
            }

            // Apply search filter
            if ($search) {
                $search_lower = strtolower($search);
                $title_match  = stripos($block_type->title ?? '', $search_lower) !== false;
                $desc_match   = stripos($block_type->description ?? '', $search_lower) !== false;
                $name_match   = stripos($block_name, $search_lower) !== false;
                $keyword_match = false;

                if (is_array($block_type->keywords)) {
                    foreach ($block_type->keywords as $keyword) {
                        if (stripos($keyword, $search_lower) !== false) {
                            $keyword_match = true;
                            break;
                        }
                    }
                }

                if (!$title_match && !$desc_match && !$name_match && !$keyword_match) {
                    continue;
                }
            }

            // Track categories
            if (!empty($block_type->category) && !isset($categories[$block_type->category])) {
                $categories[$block_type->category] = $block_type->category;
            }

            $blocks[] = $this->prepare_block_response($block_name, $block_type, $block_source);
        }

        // Sort blocks: theme blocks first, then by title
        usort($blocks, function ($a, $b) {
            // Theme blocks come first
            if ($a['source'] === 'theme' && $b['source'] !== 'theme') {
                return -1;
            }
            if ($b['source'] === 'theme' && $a['source'] !== 'theme') {
                return 1;
            }
            // Then sort alphabetically by title
            return strcasecmp($a['title'], $b['title']);
        });

        $total = count($blocks);

        // Get all block categories with proper titles
        $block_categories = $this->get_block_categories_with_titles($categories);

        // Generate ETag based on content hash for caching
        $etag_data = [
            'total'   => $total,
            'filters' => [$search, $category, $source],
            'hash'    => md5(wp_json_encode(array_column($blocks, 'name'))),
        ];
        $etag = '"blocks-' . md5(wp_json_encode($etag_data)) . '"';

        // Check for conditional request
        $if_none_match = $request->get_header('If-None-Match');
        if ($if_none_match && $if_none_match === $etag) {
            return new WP_REST_Response(null, 304);
        }

        $response = new WP_REST_Response([
            'items'      => $blocks,
            'total'      => $total,
            'categories' => $block_categories,
        ]);

        // Add caching headers - blocks are relatively stable
        $response->header('ETag', $etag);
        $response->header('Cache-Control', 'private, max-age=60');

        return $response;
    }

    /**
     * Get block categories
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response
     */
    public function get_categories(WP_REST_Request $request) {
        $block_categories = get_block_categories(get_post(0));

        $categories = [];
        foreach ($block_categories as $category) {
            $categories[] = [
                'slug'  => $category['slug'],
                'title' => $category['title'],
                'icon'  => $category['icon'] ?? null,
            ];
        }

        // Generate ETag
        $etag = '"block-categories-' . md5(wp_json_encode($categories)) . '"';

        // Check for conditional request
        $if_none_match = $request->get_header('If-None-Match');
        if ($if_none_match && $if_none_match === $etag) {
            return new WP_REST_Response(null, 304);
        }

        $response = new WP_REST_Response($categories);

        // Categories are very stable, cache longer
        $response->header('ETag', $etag);
        $response->header('Cache-Control', 'private, max-age=300');

        return $response;
    }

    /**
     * Determine block source based on block name
     *
     * @param string $block_name Block name (e.g., "core/paragraph", "theme-slug/hero").
     * @param string $theme_slug Current theme slug.
     * @return string Source type: 'theme', 'core', or 'plugin'.
     */
    private function determine_block_source(string $block_name, string $theme_slug): string {
        // Theme blocks are prefixed with theme slug
        if (strpos($block_name, $theme_slug . '/') === 0) {
            return 'theme';
        }

        // Core blocks are prefixed with "core/"
        if (strpos($block_name, 'core/') === 0) {
            return 'core';
        }

        // Everything else is a plugin block
        return 'plugin';
    }

    /**
     * Prepare block response data
     *
     * @param string         $block_name Block name.
     * @param \WP_Block_Type $block_type Block type object.
     * @param string         $source     Block source.
     * @return array
     */
    private function prepare_block_response(string $block_name, $block_type, string $source): array {
        // Prepare icon - can be string (dashicon) or array with src/background/foreground
        $icon = null;
        if (!empty($block_type->icon)) {
            if (is_string($block_type->icon)) {
                $icon = $block_type->icon;
            } elseif (is_array($block_type->icon)) {
                $icon = $block_type->icon;
            }
        }

        return [
            'name'        => $block_name,
            'title'       => $block_type->title ?? $block_name,
            'description' => $block_type->description ?? '',
            'category'    => $block_type->category ?? 'common',
            'icon'        => $icon,
            'keywords'    => $block_type->keywords ?? [],
            'supports'    => $block_type->supports ?? [],
            'attributes'  => $block_type->attributes ?? [],
            'example'     => $block_type->example ?? null,
            'parent'      => $block_type->parent ?? null,
            'ancestor'    => $block_type->ancestor ?? null,
            'source'      => $source,
            'textdomain'  => $block_type->textdomain ?? null,
        ];
    }

    /**
     * Get block categories with proper titles
     *
     * @param array $category_slugs Array of category slugs.
     * @return array
     */
    private function get_block_categories_with_titles(array $category_slugs): array {
        $all_categories = get_block_categories(get_post(0));
        $category_map = [];

        foreach ($all_categories as $cat) {
            $category_map[$cat['slug']] = $cat['title'];
        }

        $categories = [];
        foreach ($category_slugs as $slug) {
            $categories[] = [
                'slug'  => $slug,
                'title' => $category_map[$slug] ?? ucfirst(str_replace('-', ' ', $slug)),
            ];
        }

        // Sort alphabetically by title
        usort($categories, function ($a, $b) {
            return strcasecmp($a['title'], $b['title']);
        });

        return $categories;
    }

    /**
     * Get collection params for list endpoint
     *
     * @return array
     */
    public function get_collection_params(): array {
        return [
            'search' => [
                'type'              => 'string',
                'sanitize_callback' => 'sanitize_text_field',
                'description'       => __('Search blocks by name, title, description, or keywords.', 'stratawp'),
            ],
            'category' => [
                'type'              => 'string',
                'sanitize_callback' => 'sanitize_text_field',
                'description'       => __('Filter by block category slug.', 'stratawp'),
            ],
            'source' => [
                'type'              => 'string',
                'enum'              => ['all', 'theme', 'core', 'plugin'],
                'default'           => 'all',
                'sanitize_callback' => 'sanitize_text_field',
                'description'       => __('Filter by block source.', 'stratawp'),
            ],
        ];
    }
}
