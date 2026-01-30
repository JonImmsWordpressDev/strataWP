<?php
/**
 * Patterns REST API Controller
 *
 * @package StrataWP\Studio
 */

namespace StrataWP\Studio\RestApi;

use WP_REST_Controller;
use WP_REST_Server;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use WP_Post;
use WP_Block_Patterns_Registry;
use StrataWP\Studio\PostTypes\PatternPostType;
use StrataWP\Studio\Services\PatternExporter;

/**
 * Patterns REST API Controller
 */
class PatternsController extends WP_REST_Controller {
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
    protected $rest_base = 'patterns';

    /**
     * Register routes
     */
    public function register_routes(): void {
        // GET/POST patterns collection
        register_rest_route($this->namespace, '/' . $this->rest_base, [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_patterns'],
                'permission_callback' => [$this, 'get_permission_check'],
                'args'                => $this->get_collection_params(),
            ],
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [$this, 'create_pattern'],
                'permission_callback' => [$this, 'edit_permission_check'],
                'args'                => $this->get_create_args(),
            ],
        ]);

        // GET/PUT/DELETE single pattern
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<id>[\d]+)', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_pattern'],
                'permission_callback' => [$this, 'get_permission_check'],
                'args'                => [
                    'id' => [
                        'required'          => true,
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ],
            [
                'methods'             => WP_REST_Server::EDITABLE,
                'callback'            => [$this, 'update_pattern'],
                'permission_callback' => [$this, 'edit_permission_check'],
                'args'                => $this->get_update_args(),
            ],
            [
                'methods'             => WP_REST_Server::DELETABLE,
                'callback'            => [$this, 'delete_pattern'],
                'permission_callback' => [$this, 'edit_permission_check'],
                'args'                => [
                    'id' => [
                        'required'          => true,
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ],
        ]);

        // POST export pattern to theme
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<id>[\d]+)/export', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [$this, 'export_pattern'],
            'permission_callback' => [$this, 'edit_permission_check'],
            'args'                => [
                'id' => [
                    'required'          => true,
                    'type'              => 'integer',
                    'sanitize_callback' => 'absint',
                ],
            ],
        ]);

        // POST duplicate pattern
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<id>[\d]+)/duplicate', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [$this, 'duplicate_pattern'],
            'permission_callback' => [$this, 'edit_permission_check'],
            'args'                => [
                'id' => [
                    'required'          => true,
                    'type'              => 'integer',
                    'sanitize_callback' => 'absint',
                ],
            ],
        ]);

        // GET theme patterns from registry
        register_rest_route($this->namespace, '/' . $this->rest_base . '/theme', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_theme_patterns'],
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
     * Get patterns list with optional filtering
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response|WP_Error
     */
    public function get_patterns(WP_REST_Request $request) {
        $source   = $request->get_param('source');
        $category = $request->get_param('category');
        $tag      = $request->get_param('tag');
        $search   = $request->get_param('search');
        $per_page = $request->get_param('per_page') ?? 100;
        $page     = $request->get_param('page') ?? 1;

        $patterns       = [];
        $database_total = 0;
        $theme_total    = 0;

        // Get database patterns unless filtering by theme source only
        if ($source !== 'theme') {
            $query_args = [
                'post_type'      => PatternPostType::POST_TYPE,
                'post_status'    => 'publish',
                'posts_per_page' => $per_page,
                'paged'          => $page,
            ];

            if ($search) {
                $query_args['s'] = $search;
            }

            if ($category) {
                $query_args['tax_query'] = [
                    [
                        'taxonomy' => PatternPostType::TAXONOMY_CATEGORY,
                        'field'    => 'slug',
                        'terms'    => $category,
                    ],
                ];
            }

            if ($tag) {
                $tax_query = $query_args['tax_query'] ?? [];
                $tax_query[] = [
                    'taxonomy' => PatternPostType::TAXONOMY_TAG,
                    'field'    => 'slug',
                    'terms'    => $tag,
                ];
                $query_args['tax_query'] = $tax_query;

                if (count($tax_query) > 1) {
                    $query_args['tax_query']['relation'] = 'AND';
                }
            }

            $query = new \WP_Query($query_args);
            $database_total = $query->found_posts;

            // Prime the term cache to avoid N+1 queries
            // This loads all terms for all posts in 1 query instead of 2N queries
            $post_ids = wp_list_pluck($query->posts, 'ID');
            if (!empty($post_ids)) {
                update_object_term_cache($post_ids, PatternPostType::POST_TYPE);
            }

            foreach ($query->posts as $post) {
                $patterns[] = $this->prepare_pattern_response($post, 'database');
            }
        }

        // Get theme patterns unless filtering by database source only
        if ($source !== 'database') {
            $registry        = WP_Block_Patterns_Registry::get_instance();
            $theme_patterns  = $registry->get_all_registered();
            $theme_slug      = get_stylesheet();

            foreach ($theme_patterns as $pattern) {
                // Only include patterns from current theme
                if (!isset($pattern['name']) || strpos($pattern['name'], $theme_slug) !== 0) {
                    continue;
                }

                // Apply category filter
                if ($category && (!isset($pattern['categories']) || !in_array($category, $pattern['categories'], true))) {
                    continue;
                }

                // Apply search filter
                if ($search) {
                    $search_lower = strtolower($search);
                    $title_match  = isset($pattern['title']) && strpos(strtolower($pattern['title']), $search_lower) !== false;
                    $desc_match   = isset($pattern['description']) && strpos(strtolower($pattern['description']), $search_lower) !== false;
                    $keyword_match = false;

                    if (isset($pattern['keywords']) && is_array($pattern['keywords'])) {
                        foreach ($pattern['keywords'] as $keyword) {
                            if (strpos(strtolower($keyword), $search_lower) !== false) {
                                $keyword_match = true;
                                break;
                            }
                        }
                    }

                    if (!$title_match && !$desc_match && !$keyword_match) {
                        continue;
                    }
                }

                $theme_total++;
                $patterns[] = $this->prepare_theme_pattern_response($pattern);
            }
        }

        // Calculate pagination metadata
        $total       = $database_total + $theme_total;
        $total_pages = $per_page > 0 ? (int) ceil($total / $per_page) : 1;

        // Generate ETag based on content hash for caching
        $etag_data = [
            'total'    => $total,
            'page'     => $page,
            'per_page' => $per_page,
            'filters'  => [$source, $category, $tag, $search],
            'hash'     => md5(wp_json_encode(array_column($patterns, 'id'))),
        ];
        $etag = '"patterns-' . md5(wp_json_encode($etag_data)) . '"';

        // Check for conditional request
        $if_none_match = $request->get_header('If-None-Match');
        if ($if_none_match && $if_none_match === $etag) {
            return new WP_REST_Response(null, 304);
        }

        $response = new WP_REST_Response([
            'items'       => $patterns,
            'total'       => $total,
            'total_pages' => $total_pages,
            'page'        => (int) $page,
            'per_page'    => (int) $per_page,
        ]);

        // Add caching headers - short cache since patterns can be modified
        $response->header('ETag', $etag);
        $response->header('Cache-Control', 'private, max-age=30');

        return $response;
    }

    /**
     * Get single pattern by ID
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response|WP_Error
     */
    public function get_pattern(WP_REST_Request $request) {
        $id = $request->get_param('id');

        $post = get_post($id);

        if (!$post || $post->post_type !== PatternPostType::POST_TYPE) {
            return new WP_Error(
                'pattern_not_found',
                __('Pattern not found.', 'stratawp'),
                ['status' => 404]
            );
        }

        return new WP_REST_Response($this->prepare_pattern_response($post, 'database'));
    }

    /**
     * Create a new pattern
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response|WP_Error
     */
    public function create_pattern(WP_REST_Request $request) {
        $title      = $request->get_param('title');
        $content    = $request->get_param('content');
        $categories = $request->get_param('categories') ?? [];
        $tags       = $request->get_param('tags') ?? [];
        $keywords   = $request->get_param('keywords') ?? [];
        $viewport   = $request->get_param('viewport') ?? 'desktop';

        $post_data = [
            'post_type'    => PatternPostType::POST_TYPE,
            'post_title'   => sanitize_text_field($title),
            'post_content' => wp_kses_post($content),
            'post_status'  => 'publish',
        ];

        $post_id = wp_insert_post($post_data, true);

        if (is_wp_error($post_id)) {
            return new WP_Error(
                'pattern_create_failed',
                __('Failed to create pattern.', 'stratawp'),
                ['status' => 500]
            );
        }

        // Set categories
        if (!empty($categories)) {
            wp_set_object_terms($post_id, $categories, PatternPostType::TAXONOMY_CATEGORY);
        }

        // Set tags
        if (!empty($tags)) {
            wp_set_object_terms($post_id, $tags, PatternPostType::TAXONOMY_TAG);
        }

        // Set meta
        update_post_meta($post_id, '_stratawp_pattern_keywords', $keywords);
        update_post_meta($post_id, '_stratawp_pattern_viewport', $viewport);
        update_post_meta($post_id, '_stratawp_pattern_sync_status', 'local');

        // Extract and store block types
        $block_types = $this->extract_block_types($content);
        update_post_meta($post_id, '_stratawp_pattern_block_types', $block_types);

        $post = get_post($post_id);

        return new WP_REST_Response([
            'success' => true,
            'data'    => $this->prepare_pattern_response($post, 'database'),
        ], 201);
    }

    /**
     * Update an existing pattern
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response|WP_Error
     */
    public function update_pattern(WP_REST_Request $request) {
        $id = $request->get_param('id');

        $post = get_post($id);

        if (!$post || $post->post_type !== PatternPostType::POST_TYPE) {
            return new WP_Error(
                'pattern_not_found',
                __('Pattern not found.', 'stratawp'),
                ['status' => 404]
            );
        }

        $post_data = [
            'ID' => $id,
        ];

        if ($request->has_param('title')) {
            $post_data['post_title'] = sanitize_text_field($request->get_param('title'));
        }

        if ($request->has_param('content')) {
            $content = $request->get_param('content');
            $post_data['post_content'] = wp_kses_post($content);

            // Update block types when content changes
            $block_types = $this->extract_block_types($content);
            update_post_meta($id, '_stratawp_pattern_block_types', $block_types);
        }

        $result = wp_update_post($post_data, true);

        if (is_wp_error($result)) {
            return new WP_Error(
                'pattern_update_failed',
                __('Failed to update pattern.', 'stratawp'),
                ['status' => 500]
            );
        }

        // Update categories if provided
        if ($request->has_param('categories')) {
            wp_set_object_terms($id, $request->get_param('categories'), PatternPostType::TAXONOMY_CATEGORY);
        }

        // Update tags if provided
        if ($request->has_param('tags')) {
            wp_set_object_terms($id, $request->get_param('tags'), PatternPostType::TAXONOMY_TAG);
        }

        // Update meta fields
        if ($request->has_param('keywords')) {
            update_post_meta($id, '_stratawp_pattern_keywords', $request->get_param('keywords'));
        }

        if ($request->has_param('viewport')) {
            update_post_meta($id, '_stratawp_pattern_viewport', $request->get_param('viewport'));
        }

        // Update sync status - mark as modified if was exported
        $current_sync_status = get_post_meta($id, '_stratawp_pattern_sync_status', true);
        if ($current_sync_status === 'exported') {
            update_post_meta($id, '_stratawp_pattern_sync_status', 'modified');
        }

        $post = get_post($id);

        return new WP_REST_Response([
            'success' => true,
            'data'    => $this->prepare_pattern_response($post, 'database'),
        ]);
    }

    /**
     * Delete a pattern
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response|WP_Error
     */
    public function delete_pattern(WP_REST_Request $request) {
        $id = $request->get_param('id');

        $post = get_post($id);

        if (!$post || $post->post_type !== PatternPostType::POST_TYPE) {
            return new WP_Error(
                'pattern_not_found',
                __('Pattern not found.', 'stratawp'),
                ['status' => 404]
            );
        }

        $deleted = wp_delete_post($id, true);

        if (!$deleted) {
            return new WP_Error(
                'pattern_delete_failed',
                __('Failed to delete pattern.', 'stratawp'),
                ['status' => 500]
            );
        }

        return new WP_REST_Response([
            'success' => true,
            'message' => __('Pattern deleted successfully.', 'stratawp'),
        ]);
    }

    /**
     * Export pattern to theme file
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response|WP_Error
     */
    public function export_pattern(WP_REST_Request $request) {
        $id = $request->get_param('id');

        $post = get_post($id);

        if (!$post || $post->post_type !== PatternPostType::POST_TYPE) {
            return new WP_Error(
                'pattern_not_found',
                __('Pattern not found.', 'stratawp'),
                ['status' => 404]
            );
        }

        // Use PatternExporter service (will be created in Task 3)
        $exporter = new PatternExporter();
        $result   = $exporter->export($post);

        if (is_wp_error($result)) {
            return $result;
        }

        // Update sync status and export path
        update_post_meta($id, '_stratawp_pattern_sync_status', 'exported');
        update_post_meta($id, '_stratawp_pattern_export_path', $result['path']);

        $post = get_post($id);

        return new WP_REST_Response([
            'success' => true,
            'pattern' => $this->prepare_pattern_response($post, 'database'),
            'path'    => $result['path'],
        ]);
    }

    /**
     * Duplicate a pattern
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response|WP_Error
     */
    public function duplicate_pattern(WP_REST_Request $request) {
        $id = $request->get_param('id');

        $post = get_post($id);

        if (!$post || $post->post_type !== PatternPostType::POST_TYPE) {
            return new WP_Error(
                'pattern_not_found',
                __('Pattern not found.', 'stratawp'),
                ['status' => 404]
            );
        }

        // Create duplicate post
        $new_post_data = [
            'post_type'    => PatternPostType::POST_TYPE,
            'post_title'   => $post->post_title . ' ' . __('(Copy)', 'stratawp'),
            'post_content' => $post->post_content,
            'post_status'  => 'publish',
        ];

        $new_post_id = wp_insert_post($new_post_data, true);

        if (is_wp_error($new_post_id)) {
            return new WP_Error(
                'pattern_duplicate_failed',
                __('Failed to duplicate pattern.', 'stratawp'),
                ['status' => 500]
            );
        }

        // Copy taxonomies
        $categories = wp_get_object_terms($id, PatternPostType::TAXONOMY_CATEGORY, ['fields' => 'slugs']);
        if (!is_wp_error($categories) && !empty($categories)) {
            wp_set_object_terms($new_post_id, $categories, PatternPostType::TAXONOMY_CATEGORY);
        }

        $tags = wp_get_object_terms($id, PatternPostType::TAXONOMY_TAG, ['fields' => 'slugs']);
        if (!is_wp_error($tags) && !empty($tags)) {
            wp_set_object_terms($new_post_id, $tags, PatternPostType::TAXONOMY_TAG);
        }

        // Copy meta (except sync status and export path)
        $keywords    = get_post_meta($id, '_stratawp_pattern_keywords', true);
        $viewport    = get_post_meta($id, '_stratawp_pattern_viewport', true);
        $block_types = get_post_meta($id, '_stratawp_pattern_block_types', true);

        if ($keywords) {
            update_post_meta($new_post_id, '_stratawp_pattern_keywords', $keywords);
        }
        if ($viewport) {
            update_post_meta($new_post_id, '_stratawp_pattern_viewport', $viewport);
        }
        if ($block_types) {
            update_post_meta($new_post_id, '_stratawp_pattern_block_types', $block_types);
        }

        // Set sync status to local for duplicate
        update_post_meta($new_post_id, '_stratawp_pattern_sync_status', 'local');

        $new_post = get_post($new_post_id);

        return new WP_REST_Response([
            'success' => true,
            'data'    => $this->prepare_pattern_response($new_post, 'database'),
        ], 201);
    }

    /**
     * Get theme patterns from WP_Block_Patterns_Registry
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response
     */
    public function get_theme_patterns(WP_REST_Request $request) {
        $registry       = WP_Block_Patterns_Registry::get_instance();
        $all_patterns   = $registry->get_all_registered();
        $theme_slug     = get_stylesheet();
        $theme_patterns = [];

        foreach ($all_patterns as $pattern) {
            // Only include patterns from current theme
            if (!isset($pattern['name']) || strpos($pattern['name'], $theme_slug) !== 0) {
                continue;
            }

            $theme_patterns[] = $this->prepare_theme_pattern_response($pattern);
        }

        $total = count($theme_patterns);

        // Generate ETag based on theme patterns content
        $etag = '"theme-patterns-' . md5(wp_json_encode(array_column($theme_patterns, 'name'))) . '"';

        // Check for conditional request
        $if_none_match = $request->get_header('If-None-Match');
        if ($if_none_match && $if_none_match === $etag) {
            return new WP_REST_Response(null, 304);
        }

        $response = new WP_REST_Response([
            'items'       => $theme_patterns,
            'total'       => $total,
            'total_pages' => 1,
            'page'        => 1,
            'per_page'    => $total,
        ]);

        // Theme patterns are file-based, cache for longer
        $response->header('ETag', $etag);
        $response->header('Cache-Control', 'private, max-age=300');

        return $response;
    }

    /**
     * Prepare pattern response from WP_Post
     *
     * Note: For best performance when processing multiple patterns, call
     * update_object_term_cache() before this method to prime the term cache.
     *
     * @param WP_Post $post   Post object.
     * @param string  $source Source type ('database' or 'theme').
     * @return array
     */
    private function prepare_pattern_response(WP_Post $post, string $source): array {
        // These will use cached data if update_object_term_cache() was called
        $categories = wp_get_object_terms($post->ID, PatternPostType::TAXONOMY_CATEGORY, ['fields' => 'all']);
        $tags       = wp_get_object_terms($post->ID, PatternPostType::TAXONOMY_TAG, ['fields' => 'all']);

        $category_data = [];
        if (!is_wp_error($categories)) {
            foreach ($categories as $term) {
                $category_data[] = [
                    'id'   => $term->term_id,
                    'name' => $term->name,
                    'slug' => $term->slug,
                ];
            }
        }

        $tag_data = [];
        if (!is_wp_error($tags)) {
            foreach ($tags as $term) {
                $tag_data[] = [
                    'id'   => $term->term_id,
                    'name' => $term->name,
                    'slug' => $term->slug,
                ];
            }
        }

        $keywords    = get_post_meta($post->ID, '_stratawp_pattern_keywords', true) ?: [];
        $viewport    = get_post_meta($post->ID, '_stratawp_pattern_viewport', true) ?: 'desktop';
        $sync_status = get_post_meta($post->ID, '_stratawp_pattern_sync_status', true) ?: 'local';
        $export_path = get_post_meta($post->ID, '_stratawp_pattern_export_path', true) ?: '';
        $block_types = get_post_meta($post->ID, '_stratawp_pattern_block_types', true) ?: [];

        return [
            'id'          => $post->ID,
            'title'       => $post->post_title,
            'content'     => $post->post_content,
            'categories'  => $category_data,
            'tags'        => $tag_data,
            'keywords'    => $keywords,
            'viewport'    => $viewport,
            'syncStatus'  => $sync_status,
            'exportPath'  => $export_path,
            'blockTypes'  => $block_types,
            'source'      => $source,
            'dateCreated' => $post->post_date,
            'dateModified' => $post->post_modified,
        ];
    }

    /**
     * Prepare theme pattern response from registry data
     *
     * @param array $pattern Pattern data from registry.
     * @return array
     */
    private function prepare_theme_pattern_response(array $pattern): array {
        return [
            'id'          => 0,
            'name'        => $pattern['name'] ?? '',
            'title'       => $pattern['title'] ?? '',
            'content'     => $pattern['content'] ?? '',
            'description' => $pattern['description'] ?? '',
            'categories'  => $pattern['categories'] ?? [],
            'keywords'    => $pattern['keywords'] ?? [],
            'blockTypes'  => $pattern['blockTypes'] ?? [],
            'viewportWidth' => $pattern['viewportWidth'] ?? null,
            'source'      => 'theme',
        ];
    }

    /**
     * Extract block types from pattern content
     *
     * @param string $content Pattern content.
     * @return array
     */
    private function extract_block_types(string $content): array {
        $blocks      = parse_blocks($content);
        $block_types = [];

        $this->collect_block_types($blocks, $block_types);

        return array_unique($block_types);
    }

    /**
     * Recursively collect block types from blocks array
     *
     * @param array $blocks      Blocks array.
     * @param array $block_types Block types array (passed by reference).
     */
    private function collect_block_types(array $blocks, array &$block_types): void {
        foreach ($blocks as $block) {
            if (!empty($block['blockName'])) {
                $block_types[] = $block['blockName'];
            }

            if (!empty($block['innerBlocks'])) {
                $this->collect_block_types($block['innerBlocks'], $block_types);
            }
        }
    }

    /**
     * Get collection params for list endpoint
     *
     * @return array
     */
    public function get_collection_params(): array {
        return [
            'source' => [
                'type'              => 'string',
                'enum'              => ['database', 'theme'],
                'sanitize_callback' => 'sanitize_text_field',
                'description'       => __('Filter by pattern source.', 'stratawp'),
            ],
            'category' => [
                'type'              => 'string',
                'sanitize_callback' => 'sanitize_text_field',
                'description'       => __('Filter by category slug.', 'stratawp'),
            ],
            'tag' => [
                'type'              => 'string',
                'sanitize_callback' => 'sanitize_text_field',
                'description'       => __('Filter by tag slug.', 'stratawp'),
            ],
            'search' => [
                'type'              => 'string',
                'sanitize_callback' => 'sanitize_text_field',
                'description'       => __('Search patterns by title, description, or keywords.', 'stratawp'),
            ],
            'per_page' => [
                'type'              => 'integer',
                'default'           => 100,
                'minimum'           => 1,
                'maximum'           => 100,
                'sanitize_callback' => 'absint',
                'description'       => __('Maximum number of patterns to return.', 'stratawp'),
            ],
            'page' => [
                'type'              => 'integer',
                'default'           => 1,
                'minimum'           => 1,
                'sanitize_callback' => 'absint',
                'description'       => __('Current page of the collection.', 'stratawp'),
            ],
        ];
    }

    /**
     * Get create endpoint arguments
     *
     * @return array
     */
    public function get_create_args(): array {
        return [
            'title' => [
                'required'          => true,
                'type'              => 'string',
                'sanitize_callback' => 'sanitize_text_field',
                'description'       => __('Pattern title.', 'stratawp'),
            ],
            'content' => [
                'required'          => true,
                'type'              => 'string',
                'description'       => __('Pattern block content.', 'stratawp'),
            ],
            'categories' => [
                'type'        => 'array',
                'default'     => [],
                'items'       => ['type' => 'string'],
                'description' => __('Array of category slugs.', 'stratawp'),
            ],
            'tags' => [
                'type'        => 'array',
                'default'     => [],
                'items'       => ['type' => 'string'],
                'description' => __('Array of tag slugs.', 'stratawp'),
            ],
            'keywords' => [
                'type'        => 'array',
                'default'     => [],
                'items'       => ['type' => 'string'],
                'description' => __('Array of searchable keywords.', 'stratawp'),
            ],
            'viewport' => [
                'type'              => 'string',
                'default'           => 'desktop',
                'enum'              => ['desktop', 'tablet', 'mobile'],
                'sanitize_callback' => 'sanitize_text_field',
                'description'       => __('Preferred viewport for preview.', 'stratawp'),
            ],
        ];
    }

    /**
     * Get update endpoint arguments
     *
     * @return array
     */
    public function get_update_args(): array {
        return [
            'id' => [
                'required'          => true,
                'type'              => 'integer',
                'sanitize_callback' => 'absint',
            ],
            'title' => [
                'type'              => 'string',
                'sanitize_callback' => 'sanitize_text_field',
                'description'       => __('Pattern title.', 'stratawp'),
            ],
            'content' => [
                'type'        => 'string',
                'description' => __('Pattern block content.', 'stratawp'),
            ],
            'categories' => [
                'type'        => 'array',
                'items'       => ['type' => 'string'],
                'description' => __('Array of category slugs.', 'stratawp'),
            ],
            'tags' => [
                'type'        => 'array',
                'items'       => ['type' => 'string'],
                'description' => __('Array of tag slugs.', 'stratawp'),
            ],
            'keywords' => [
                'type'        => 'array',
                'items'       => ['type' => 'string'],
                'description' => __('Array of searchable keywords.', 'stratawp'),
            ],
            'viewport' => [
                'type'              => 'string',
                'enum'              => ['desktop', 'tablet', 'mobile'],
                'sanitize_callback' => 'sanitize_text_field',
                'description'       => __('Preferred viewport for preview.', 'stratawp'),
            ],
        ];
    }
}
