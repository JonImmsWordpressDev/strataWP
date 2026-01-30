# Pattern Library - Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full pattern management system with browse, create, edit, delete, and export-to-theme capabilities.

**Architecture:** PHP backend with CPT + taxonomies for storage, REST API for CRUD operations, React frontend for Pattern Library page, and Gutenberg plugin for "Save as Pattern" feature.

**Tech Stack:** PHP 8.1+, WordPress REST API, TypeScript, React, @wordpress/components, @wordpress/data, @wordpress/plugins

---

## Prerequisites

**Worktree:** `/Users/jon.imms/Local Sites/stratawp/strataWP/.worktrees/phase2-patterns`
**Branch:** `phase2-patterns`

**Commands to verify setup:**
```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP/.worktrees/phase2-patterns"
pnpm install --ignore-scripts
pnpm build
```

---

## Task 1: Register Pattern CPT and Taxonomies

**Files:**
- Create: `packages/studio/php/PostTypes/PatternPostType.php`
- Modify: `packages/studio/php/Studio.php`

### Step 1: Create PatternPostType.php

```php
<?php
/**
 * Pattern Post Type Registration
 *
 * @package StrataWP\Studio
 */

namespace StrataWP\Studio\PostTypes;

/**
 * Registers the stratawp_pattern custom post type and taxonomies
 */
class PatternPostType {
    /**
     * Post type name
     */
    public const POST_TYPE = 'stratawp_pattern';

    /**
     * Category taxonomy name
     */
    public const TAXONOMY_CATEGORY = 'stratawp_pattern_category';

    /**
     * Tag taxonomy name
     */
    public const TAXONOMY_TAG = 'stratawp_pattern_tag';

    /**
     * Initialize the post type
     */
    public function initialize(): void {
        add_action('init', [$this, 'register_post_type']);
        add_action('init', [$this, 'register_taxonomies']);
        add_action('init', [$this, 'register_default_categories']);
    }

    /**
     * Register the custom post type
     */
    public function register_post_type(): void {
        $labels = [
            'name'               => __('Patterns', 'stratawp'),
            'singular_name'      => __('Pattern', 'stratawp'),
            'menu_name'          => __('Patterns', 'stratawp'),
            'add_new'            => __('Add New', 'stratawp'),
            'add_new_item'       => __('Add New Pattern', 'stratawp'),
            'edit_item'          => __('Edit Pattern', 'stratawp'),
            'new_item'           => __('New Pattern', 'stratawp'),
            'view_item'          => __('View Pattern', 'stratawp'),
            'search_items'       => __('Search Patterns', 'stratawp'),
            'not_found'          => __('No patterns found', 'stratawp'),
            'not_found_in_trash' => __('No patterns found in Trash', 'stratawp'),
        ];

        $args = [
            'labels'              => $labels,
            'public'              => false,
            'publicly_queryable'  => false,
            'show_ui'             => true,
            'show_in_menu'        => false,
            'show_in_rest'        => true,
            'rest_base'           => 'stratawp-patterns',
            'capability_type'     => 'post',
            'has_archive'         => false,
            'hierarchical'        => false,
            'supports'            => ['title', 'editor', 'custom-fields', 'revisions'],
            'rewrite'             => false,
        ];

        register_post_type(self::POST_TYPE, $args);
    }

    /**
     * Register taxonomies
     */
    public function register_taxonomies(): void {
        // Pattern Category (hierarchical)
        register_taxonomy(self::TAXONOMY_CATEGORY, self::POST_TYPE, [
            'labels' => [
                'name'          => __('Pattern Categories', 'stratawp'),
                'singular_name' => __('Pattern Category', 'stratawp'),
                'search_items'  => __('Search Categories', 'stratawp'),
                'all_items'     => __('All Categories', 'stratawp'),
                'edit_item'     => __('Edit Category', 'stratawp'),
                'add_new_item'  => __('Add New Category', 'stratawp'),
            ],
            'hierarchical'      => true,
            'public'            => false,
            'show_ui'           => true,
            'show_in_rest'      => true,
            'rest_base'         => 'stratawp-pattern-categories',
            'show_admin_column' => true,
        ]);

        // Pattern Tag (non-hierarchical)
        register_taxonomy(self::TAXONOMY_TAG, self::POST_TYPE, [
            'labels' => [
                'name'          => __('Pattern Tags', 'stratawp'),
                'singular_name' => __('Pattern Tag', 'stratawp'),
                'search_items'  => __('Search Tags', 'stratawp'),
                'all_items'     => __('All Tags', 'stratawp'),
                'edit_item'     => __('Edit Tag', 'stratawp'),
                'add_new_item'  => __('Add New Tag', 'stratawp'),
            ],
            'hierarchical'      => false,
            'public'            => false,
            'show_ui'           => true,
            'show_in_rest'      => true,
            'rest_base'         => 'stratawp-pattern-tags',
            'show_admin_column' => true,
        ]);
    }

    /**
     * Register default pattern categories
     */
    public function register_default_categories(): void {
        $default_categories = [
            'hero'         => __('Hero', 'stratawp'),
            'features'     => __('Features', 'stratawp'),
            'testimonials' => __('Testimonials', 'stratawp'),
            'cta'          => __('Call to Action', 'stratawp'),
            'team'         => __('Team', 'stratawp'),
            'pricing'      => __('Pricing', 'stratawp'),
            'faq'          => __('FAQ', 'stratawp'),
            'gallery'      => __('Gallery', 'stratawp'),
            'contact'      => __('Contact', 'stratawp'),
            'footer'       => __('Footer', 'stratawp'),
            'header'       => __('Header', 'stratawp'),
        ];

        foreach ($default_categories as $slug => $name) {
            if (!term_exists($slug, self::TAXONOMY_CATEGORY)) {
                wp_insert_term($name, self::TAXONOMY_CATEGORY, ['slug' => $slug]);
            }
        }
    }

    /**
     * Register pattern meta fields
     */
    public static function register_meta(): void {
        $meta_fields = [
            '_stratawp_pattern_keywords' => [
                'type'         => 'array',
                'single'       => true,
                'show_in_rest' => [
                    'schema' => [
                        'type'  => 'array',
                        'items' => ['type' => 'string'],
                    ],
                ],
            ],
            '_stratawp_pattern_viewport' => [
                'type'         => 'string',
                'single'       => true,
                'show_in_rest' => true,
                'default'      => 'full',
            ],
            '_stratawp_pattern_sync_status' => [
                'type'         => 'string',
                'single'       => true,
                'show_in_rest' => true,
                'default'      => 'local',
            ],
            '_stratawp_pattern_export_path' => [
                'type'         => 'string',
                'single'       => true,
                'show_in_rest' => true,
                'default'      => '',
            ],
            '_stratawp_pattern_block_types' => [
                'type'         => 'array',
                'single'       => true,
                'show_in_rest' => [
                    'schema' => [
                        'type'  => 'array',
                        'items' => ['type' => 'string'],
                    ],
                ],
            ],
        ];

        foreach ($meta_fields as $key => $args) {
            register_post_meta(self::POST_TYPE, $key, $args);
        }
    }
}
```

### Step 2: Update Studio.php to initialize PatternPostType

Add to the `initialize()` method in Studio.php after REST API registration:

```php
// In initialize() method, add:
$pattern_post_type = new PostTypes\PatternPostType();
$pattern_post_type->initialize();
PostTypes\PatternPostType::register_meta();
```

### Step 3: Verify PHP syntax

Run: `php -l packages/studio/php/PostTypes/PatternPostType.php`
Expected: No syntax errors

Run: `php -l packages/studio/php/Studio.php`
Expected: No syntax errors

### Step 4: Commit

```bash
git add packages/studio/php/PostTypes/ packages/studio/php/Studio.php
git commit -m "feat(studio): register pattern CPT and taxonomies

- Add stratawp_pattern custom post type
- Add stratawp_pattern_category taxonomy (hierarchical)
- Add stratawp_pattern_tag taxonomy (non-hierarchical)
- Register default pattern categories
- Register pattern meta fields

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create Pattern REST API Controller

**Files:**
- Create: `packages/studio/php/RestApi/PatternsController.php`
- Modify: `packages/studio/php/Studio.php`

### Step 1: Create PatternsController.php

```php
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
use WP_Query;
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
        // GET patterns (list) / POST pattern (create)
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
            ],
        ]);

        // POST export pattern to theme
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<id>[\d]+)/export', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [$this, 'export_pattern'],
            'permission_callback' => [$this, 'edit_permission_check'],
        ]);

        // POST duplicate pattern
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<id>[\d]+)/duplicate', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [$this, 'duplicate_pattern'],
            'permission_callback' => [$this, 'edit_permission_check'],
        ]);

        // GET theme patterns (read-only)
        register_rest_route($this->namespace, '/' . $this->rest_base . '/theme', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_theme_patterns'],
            'permission_callback' => [$this, 'get_permission_check'],
        ]);
    }

    /**
     * Permission check for reading
     */
    public function get_permission_check(): bool|WP_Error {
        if (!current_user_can('edit_theme_options')) {
            return new WP_Error(
                'rest_forbidden',
                __('You do not have permission to access patterns.', 'stratawp'),
                ['status' => 403]
            );
        }
        return true;
    }

    /**
     * Permission check for editing
     */
    public function edit_permission_check(): bool|WP_Error {
        if (!current_user_can('edit_theme_options')) {
            return new WP_Error(
                'rest_forbidden',
                __('You do not have permission to modify patterns.', 'stratawp'),
                ['status' => 403]
            );
        }
        return true;
    }

    /**
     * Get patterns list
     */
    public function get_patterns(WP_REST_Request $request): WP_REST_Response|WP_Error {
        $source = $request->get_param('source') ?? 'all';
        $results = [];

        // Get user patterns from database
        if ($source === 'all' || $source === 'user') {
            $args = [
                'post_type'      => PatternPostType::POST_TYPE,
                'post_status'    => 'publish',
                'posts_per_page' => $request->get_param('per_page') ?? 20,
                'paged'          => $request->get_param('page') ?? 1,
                'orderby'        => 'title',
                'order'          => 'ASC',
            ];

            // Filter by category
            if ($category = $request->get_param('category')) {
                $args['tax_query'] = [
                    [
                        'taxonomy' => PatternPostType::TAXONOMY_CATEGORY,
                        'field'    => 'slug',
                        'terms'    => $category,
                    ],
                ];
            }

            // Filter by tag
            if ($tag = $request->get_param('tag')) {
                $args['tax_query'] = $args['tax_query'] ?? [];
                $args['tax_query'][] = [
                    'taxonomy' => PatternPostType::TAXONOMY_TAG,
                    'field'    => 'slug',
                    'terms'    => $tag,
                ];
            }

            // Search
            if ($search = $request->get_param('search')) {
                $args['s'] = $search;
            }

            $query = new WP_Query($args);

            foreach ($query->posts as $post) {
                $results[] = $this->prepare_pattern_response($post, 'user');
            }
        }

        // Get theme patterns
        if ($source === 'all' || $source === 'theme') {
            $theme_patterns = $this->get_theme_patterns_data();

            // Apply filters to theme patterns
            $category = $request->get_param('category');
            $search = $request->get_param('search');

            foreach ($theme_patterns as $pattern) {
                // Filter by category
                if ($category && !in_array($category, $pattern['categories'], true)) {
                    continue;
                }

                // Filter by search
                if ($search && stripos($pattern['title'], $search) === false) {
                    continue;
                }

                $results[] = $pattern;
            }
        }

        return new WP_REST_Response([
            'items' => $results,
            'total' => count($results),
        ]);
    }

    /**
     * Get single pattern
     */
    public function get_pattern(WP_REST_Request $request): WP_REST_Response|WP_Error {
        $id = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== PatternPostType::POST_TYPE) {
            return new WP_Error(
                'pattern_not_found',
                __('Pattern not found.', 'stratawp'),
                ['status' => 404]
            );
        }

        return new WP_REST_Response($this->prepare_pattern_response($post, 'user'));
    }

    /**
     * Create pattern
     */
    public function create_pattern(WP_REST_Request $request): WP_REST_Response|WP_Error {
        $title = sanitize_text_field($request->get_param('title'));
        $content = $request->get_param('content');
        $categories = $request->get_param('categories') ?? [];
        $tags = $request->get_param('tags') ?? [];
        $keywords = $request->get_param('keywords') ?? [];

        if (empty($title)) {
            return new WP_Error(
                'missing_title',
                __('Pattern title is required.', 'stratawp'),
                ['status' => 400]
            );
        }

        $post_id = wp_insert_post([
            'post_type'    => PatternPostType::POST_TYPE,
            'post_title'   => $title,
            'post_content' => $content,
            'post_status'  => 'publish',
        ]);

        if (is_wp_error($post_id)) {
            return $post_id;
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
        update_post_meta($post_id, '_stratawp_pattern_sync_status', 'local');

        // Extract block types from content
        $block_types = $this->extract_block_types($content);
        update_post_meta($post_id, '_stratawp_pattern_block_types', $block_types);

        $post = get_post($post_id);

        return new WP_REST_Response([
            'success' => true,
            'data'    => $this->prepare_pattern_response($post, 'user'),
        ], 201);
    }

    /**
     * Update pattern
     */
    public function update_pattern(WP_REST_Request $request): WP_REST_Response|WP_Error {
        $id = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== PatternPostType::POST_TYPE) {
            return new WP_Error(
                'pattern_not_found',
                __('Pattern not found.', 'stratawp'),
                ['status' => 404]
            );
        }

        $update_args = ['ID' => $id];

        if ($request->has_param('title')) {
            $update_args['post_title'] = sanitize_text_field($request->get_param('title'));
        }

        if ($request->has_param('content')) {
            $update_args['post_content'] = $request->get_param('content');

            // Update block types
            $block_types = $this->extract_block_types($request->get_param('content'));
            update_post_meta($id, '_stratawp_pattern_block_types', $block_types);
        }

        $result = wp_update_post($update_args);

        if (is_wp_error($result)) {
            return $result;
        }

        // Update categories
        if ($request->has_param('categories')) {
            wp_set_object_terms($id, $request->get_param('categories'), PatternPostType::TAXONOMY_CATEGORY);
        }

        // Update tags
        if ($request->has_param('tags')) {
            wp_set_object_terms($id, $request->get_param('tags'), PatternPostType::TAXONOMY_TAG);
        }

        // Update keywords
        if ($request->has_param('keywords')) {
            update_post_meta($id, '_stratawp_pattern_keywords', $request->get_param('keywords'));
        }

        // Check if pattern was exported and mark as modified
        $sync_status = get_post_meta($id, '_stratawp_pattern_sync_status', true);
        if ($sync_status === 'exported') {
            update_post_meta($id, '_stratawp_pattern_sync_status', 'modified');
        }

        $post = get_post($id);

        return new WP_REST_Response([
            'success' => true,
            'data'    => $this->prepare_pattern_response($post, 'user'),
        ]);
    }

    /**
     * Delete pattern
     */
    public function delete_pattern(WP_REST_Request $request): WP_REST_Response|WP_Error {
        $id = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== PatternPostType::POST_TYPE) {
            return new WP_Error(
                'pattern_not_found',
                __('Pattern not found.', 'stratawp'),
                ['status' => 404]
            );
        }

        $result = wp_delete_post($id, true);

        if (!$result) {
            return new WP_Error(
                'delete_failed',
                __('Failed to delete pattern.', 'stratawp'),
                ['status' => 500]
            );
        }

        return new WP_REST_Response([
            'success' => true,
            'message' => __('Pattern deleted.', 'stratawp'),
        ]);
    }

    /**
     * Export pattern to theme
     */
    public function export_pattern(WP_REST_Request $request): WP_REST_Response|WP_Error {
        $id = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== PatternPostType::POST_TYPE) {
            return new WP_Error(
                'pattern_not_found',
                __('Pattern not found.', 'stratawp'),
                ['status' => 404]
            );
        }

        $exporter = new PatternExporter();
        $result = $exporter->export($post);

        if (is_wp_error($result)) {
            return $result;
        }

        // Update sync status
        update_post_meta($id, '_stratawp_pattern_sync_status', 'exported');
        update_post_meta($id, '_stratawp_pattern_export_path', $result);

        return new WP_REST_Response([
            'success' => true,
            'data'    => [
                'path' => $result,
            ],
            'message' => __('Pattern exported to theme.', 'stratawp'),
        ]);
    }

    /**
     * Duplicate pattern
     */
    public function duplicate_pattern(WP_REST_Request $request): WP_REST_Response|WP_Error {
        $id = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== PatternPostType::POST_TYPE) {
            return new WP_Error(
                'pattern_not_found',
                __('Pattern not found.', 'stratawp'),
                ['status' => 404]
            );
        }

        // Create duplicate
        $new_post_id = wp_insert_post([
            'post_type'    => PatternPostType::POST_TYPE,
            'post_title'   => sprintf(__('%s (Copy)', 'stratawp'), $post->post_title),
            'post_content' => $post->post_content,
            'post_status'  => 'publish',
        ]);

        if (is_wp_error($new_post_id)) {
            return $new_post_id;
        }

        // Copy taxonomies
        $categories = wp_get_object_terms($id, PatternPostType::TAXONOMY_CATEGORY, ['fields' => 'slugs']);
        $tags = wp_get_object_terms($id, PatternPostType::TAXONOMY_TAG, ['fields' => 'slugs']);

        wp_set_object_terms($new_post_id, $categories, PatternPostType::TAXONOMY_CATEGORY);
        wp_set_object_terms($new_post_id, $tags, PatternPostType::TAXONOMY_TAG);

        // Copy meta (but reset sync status)
        $keywords = get_post_meta($id, '_stratawp_pattern_keywords', true);
        $viewport = get_post_meta($id, '_stratawp_pattern_viewport', true);
        $block_types = get_post_meta($id, '_stratawp_pattern_block_types', true);

        update_post_meta($new_post_id, '_stratawp_pattern_keywords', $keywords);
        update_post_meta($new_post_id, '_stratawp_pattern_viewport', $viewport);
        update_post_meta($new_post_id, '_stratawp_pattern_block_types', $block_types);
        update_post_meta($new_post_id, '_stratawp_pattern_sync_status', 'local');

        $new_post = get_post($new_post_id);

        return new WP_REST_Response([
            'success' => true,
            'data'    => $this->prepare_pattern_response($new_post, 'user'),
        ], 201);
    }

    /**
     * Get theme patterns
     */
    public function get_theme_patterns(WP_REST_Request $request): WP_REST_Response {
        return new WP_REST_Response([
            'items' => $this->get_theme_patterns_data(),
        ]);
    }

    /**
     * Get theme patterns data
     */
    private function get_theme_patterns_data(): array {
        $patterns = [];
        $registered = \WP_Block_Patterns_Registry::get_instance()->get_all_registered();

        foreach ($registered as $pattern) {
            // Only include theme patterns (not core or plugin)
            if (!isset($pattern['source']) || $pattern['source'] !== 'theme') {
                continue;
            }

            $patterns[] = [
                'id'          => 0,
                'title'       => $pattern['title'] ?? '',
                'slug'        => $pattern['name'] ?? '',
                'content'     => $pattern['content'] ?? '',
                'categories'  => $pattern['categories'] ?? [],
                'keywords'    => $pattern['keywords'] ?? [],
                'source'      => 'theme',
                'syncStatus'  => null,
                'exportPath'  => null,
                'createdAt'   => null,
                'modifiedAt'  => null,
            ];
        }

        return $patterns;
    }

    /**
     * Prepare pattern response
     */
    private function prepare_pattern_response(\WP_Post $post, string $source): array {
        $categories = wp_get_object_terms($post->ID, PatternPostType::TAXONOMY_CATEGORY, ['fields' => 'slugs']);
        $tags = wp_get_object_terms($post->ID, PatternPostType::TAXONOMY_TAG, ['fields' => 'slugs']);

        return [
            'id'          => $post->ID,
            'title'       => $post->post_title,
            'slug'        => $post->post_name,
            'content'     => $post->post_content,
            'categories'  => is_array($categories) ? $categories : [],
            'tags'        => is_array($tags) ? $tags : [],
            'keywords'    => get_post_meta($post->ID, '_stratawp_pattern_keywords', true) ?: [],
            'viewport'    => get_post_meta($post->ID, '_stratawp_pattern_viewport', true) ?: 'full',
            'source'      => $source,
            'syncStatus'  => get_post_meta($post->ID, '_stratawp_pattern_sync_status', true) ?: 'local',
            'exportPath'  => get_post_meta($post->ID, '_stratawp_pattern_export_path', true) ?: null,
            'blockTypes'  => get_post_meta($post->ID, '_stratawp_pattern_block_types', true) ?: [],
            'createdAt'   => $post->post_date,
            'modifiedAt'  => $post->post_modified,
        ];
    }

    /**
     * Extract block types from content
     */
    private function extract_block_types(string $content): array {
        $blocks = parse_blocks($content);
        $types = [];

        $this->collect_block_types($blocks, $types);

        return array_unique($types);
    }

    /**
     * Recursively collect block types
     */
    private function collect_block_types(array $blocks, array &$types): void {
        foreach ($blocks as $block) {
            if (!empty($block['blockName'])) {
                $types[] = $block['blockName'];
            }
            if (!empty($block['innerBlocks'])) {
                $this->collect_block_types($block['innerBlocks'], $types);
            }
        }
    }

    /**
     * Get collection params
     */
    public function get_collection_params(): array {
        return [
            'source' => [
                'type'    => 'string',
                'enum'    => ['all', 'theme', 'user'],
                'default' => 'all',
            ],
            'category' => [
                'type' => 'string',
            ],
            'tag' => [
                'type' => 'string',
            ],
            'search' => [
                'type' => 'string',
            ],
            'per_page' => [
                'type'    => 'integer',
                'default' => 20,
                'minimum' => 1,
                'maximum' => 100,
            ],
            'page' => [
                'type'    => 'integer',
                'default' => 1,
                'minimum' => 1,
            ],
        ];
    }

    /**
     * Get create args
     */
    private function get_create_args(): array {
        return [
            'title' => [
                'required' => true,
                'type'     => 'string',
            ],
            'content' => [
                'required' => true,
                'type'     => 'string',
            ],
            'categories' => [
                'type'  => 'array',
                'items' => ['type' => 'string'],
            ],
            'tags' => [
                'type'  => 'array',
                'items' => ['type' => 'string'],
            ],
            'keywords' => [
                'type'  => 'array',
                'items' => ['type' => 'string'],
            ],
        ];
    }

    /**
     * Get update args
     */
    private function get_update_args(): array {
        return [
            'title' => [
                'type' => 'string',
            ],
            'content' => [
                'type' => 'string',
            ],
            'categories' => [
                'type'  => 'array',
                'items' => ['type' => 'string'],
            ],
            'tags' => [
                'type'  => 'array',
                'items' => ['type' => 'string'],
            ],
            'keywords' => [
                'type'  => 'array',
                'items' => ['type' => 'string'],
            ],
        ];
    }
}
```

### Step 2: Update Studio.php to register pattern routes

Add to `register_rest_routes()` method:

```php
$this->controllers['patterns'] = new RestApi\PatternsController();
$this->controllers['patterns']->register_routes();
```

### Step 3: Verify PHP syntax

Run: `php -l packages/studio/php/RestApi/PatternsController.php`
Expected: No syntax errors

### Step 4: Commit

```bash
git add packages/studio/php/RestApi/PatternsController.php packages/studio/php/Studio.php
git commit -m "feat(studio): add patterns REST API controller

- GET/POST /patterns - list and create patterns
- GET/PUT/DELETE /patterns/{id} - single pattern CRUD
- POST /patterns/{id}/export - export to theme file
- POST /patterns/{id}/duplicate - duplicate pattern
- GET /patterns/theme - list theme patterns
- Support filtering by source, category, tag, search

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create Pattern Exporter Service

**Files:**
- Create: `packages/studio/php/Services/PatternExporter.php`

### Step 1: Create PatternExporter.php

```php
<?php
/**
 * Pattern Exporter Service
 *
 * @package StrataWP\Studio
 */

namespace StrataWP\Studio\Services;

use WP_Error;
use WP_Post;
use StrataWP\Studio\PostTypes\PatternPostType;

/**
 * Service for exporting patterns to theme files
 */
class PatternExporter {
    /**
     * Export a pattern to theme directory
     *
     * @param WP_Post $post Pattern post object.
     * @return string|WP_Error Export path on success, WP_Error on failure.
     */
    public function export(WP_Post $post): string|WP_Error {
        $patterns_dir = get_stylesheet_directory() . '/patterns';

        // Create patterns directory if it doesn't exist
        if (!file_exists($patterns_dir)) {
            if (!wp_mkdir_p($patterns_dir)) {
                return new WP_Error(
                    'directory_create_failed',
                    __('Failed to create patterns directory.', 'stratawp')
                );
            }
        }

        // Check if directory is writable
        if (!is_writable($patterns_dir)) {
            return new WP_Error(
                'directory_not_writable',
                __('Patterns directory is not writable.', 'stratawp')
            );
        }

        // Generate filename from slug
        $slug = $post->post_name ?: sanitize_title($post->post_title);
        $filename = $slug . '.php';
        $filepath = $patterns_dir . '/' . $filename;

        // Get pattern metadata
        $categories = wp_get_object_terms($post->ID, PatternPostType::TAXONOMY_CATEGORY, ['fields' => 'slugs']);
        $keywords = get_post_meta($post->ID, '_stratawp_pattern_keywords', true) ?: [];
        $viewport = get_post_meta($post->ID, '_stratawp_pattern_viewport', true) ?: 'full';

        // Generate pattern file content
        $content = $this->generate_pattern_file($post, $categories, $keywords, $viewport);

        // Write file
        $result = file_put_contents($filepath, $content);

        if ($result === false) {
            return new WP_Error(
                'file_write_failed',
                __('Failed to write pattern file.', 'stratawp')
            );
        }

        return 'patterns/' . $filename;
    }

    /**
     * Generate pattern file content
     *
     * @param WP_Post $post       Pattern post object.
     * @param array   $categories Pattern categories.
     * @param array   $keywords   Pattern keywords.
     * @param string  $viewport   Pattern viewport.
     * @return string
     */
    private function generate_pattern_file(
        WP_Post $post,
        array $categories,
        array $keywords,
        string $viewport
    ): string {
        $theme_slug = get_stylesheet();
        $pattern_slug = $post->post_name ?: sanitize_title($post->post_title);

        $header = "<?php\n";
        $header .= "/**\n";
        $header .= " * Title: " . esc_html($post->post_title) . "\n";
        $header .= " * Slug: " . $theme_slug . '/' . $pattern_slug . "\n";

        if (!empty($categories)) {
            $header .= " * Categories: " . implode(', ', $categories) . "\n";
        }

        if (!empty($keywords)) {
            $header .= " * Keywords: " . implode(', ', $keywords) . "\n";
        }

        if ($viewport !== 'full') {
            $header .= " * Viewport Width: " . $this->get_viewport_width($viewport) . "\n";
        }

        $header .= " */\n";
        $header .= "?>\n";

        return $header . $post->post_content;
    }

    /**
     * Get viewport width value
     *
     * @param string $viewport Viewport name.
     * @return int
     */
    private function get_viewport_width(string $viewport): int {
        $widths = [
            'mobile'  => 375,
            'tablet'  => 768,
            'desktop' => 1200,
            'full'    => 1400,
        ];

        return $widths[$viewport] ?? 1400;
    }

    /**
     * Delete exported pattern file
     *
     * @param string $export_path Relative path to pattern file.
     * @return bool
     */
    public function delete_export(string $export_path): bool {
        $filepath = get_stylesheet_directory() . '/' . $export_path;

        if (file_exists($filepath)) {
            return unlink($filepath);
        }

        return true;
    }
}
```

### Step 2: Verify PHP syntax

Run: `php -l packages/studio/php/Services/PatternExporter.php`
Expected: No syntax errors

### Step 3: Commit

```bash
git add packages/studio/php/Services/PatternExporter.php
git commit -m "feat(studio): add pattern exporter service

- Export patterns to theme/patterns/*.php
- Generate WordPress-compatible pattern header
- Include title, slug, categories, keywords, viewport
- Handle directory creation and permissions

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Create Pattern TypeScript Types

**Files:**
- Modify: `packages/studio/src/types/api.ts`
- Create: `packages/studio/src/types/patterns.ts`
- Modify: `packages/studio/src/types/index.ts`

### Step 1: Create patterns.ts

```typescript
/**
 * Pattern types for Pattern Library
 */

export type PatternSource = 'theme' | 'user'
export type PatternSyncStatus = 'local' | 'exported' | 'modified'

export interface Pattern {
  id: number
  title: string
  slug: string
  content: string
  categories: string[]
  tags: string[]
  keywords: string[]
  viewport: string
  source: PatternSource
  syncStatus: PatternSyncStatus | null
  exportPath: string | null
  blockTypes: string[]
  createdAt: string | null
  modifiedAt: string | null
}

export interface PatternCategory {
  id: number
  name: string
  slug: string
  count: number
}

export interface PatternTag {
  id: number
  name: string
  slug: string
  count: number
}

export interface CreatePatternRequest {
  title: string
  content: string
  categories?: string[]
  tags?: string[]
  keywords?: string[]
}

export interface UpdatePatternRequest {
  title?: string
  content?: string
  categories?: string[]
  tags?: string[]
  keywords?: string[]
}

export interface PatternFilters {
  source: 'all' | 'theme' | 'user'
  category: string | null
  tag: string | null
  search: string
  page: number
  perPage: number
}

export interface PatternsResponse {
  items: Pattern[]
  total: number
}

export interface PatternExportResponse {
  path: string
}
```

### Step 2: Update types/index.ts

Add at the end:

```typescript
export * from './patterns'
```

### Step 3: Run typecheck

Run: `pnpm typecheck --filter @stratawp/studio`
Expected: No errors

### Step 4: Commit

```bash
git add packages/studio/src/types/
git commit -m "feat(studio): add pattern TypeScript types

- Add Pattern, PatternCategory, PatternTag interfaces
- Add request/response types for pattern API
- Add PatternFilters for filtering patterns
- Export from types/index.ts

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create Pattern API Client

**Files:**
- Create: `packages/studio/src/api/patterns.ts`
- Modify: `packages/studio/src/api/index.ts`

### Step 1: Create patterns.ts

```typescript
import apiFetch from '@wordpress/api-fetch'
import type {
  Pattern,
  PatternCategory,
  PatternTag,
  CreatePatternRequest,
  UpdatePatternRequest,
  PatternFilters,
  PatternsResponse,
  PatternExportResponse,
  ApiResponse,
} from '../types'

const API_BASE = '/stratawp/v1'

/**
 * Fetch patterns with filters
 */
export async function fetchPatterns(
  filters: Partial<PatternFilters> = {}
): Promise<PatternsResponse> {
  const params = new URLSearchParams()

  if (filters.source) params.append('source', filters.source)
  if (filters.category) params.append('category', filters.category)
  if (filters.tag) params.append('tag', filters.tag)
  if (filters.search) params.append('search', filters.search)
  if (filters.page) params.append('page', String(filters.page))
  if (filters.perPage) params.append('per_page', String(filters.perPage))

  const query = params.toString()
  const path = `${API_BASE}/patterns${query ? `?${query}` : ''}`

  return apiFetch<PatternsResponse>({ path, method: 'GET' })
}

/**
 * Fetch single pattern
 */
export async function fetchPattern(id: number): Promise<Pattern> {
  return apiFetch<Pattern>({
    path: `${API_BASE}/patterns/${id}`,
    method: 'GET',
  })
}

/**
 * Create pattern
 */
export async function createPattern(
  data: CreatePatternRequest
): Promise<ApiResponse<Pattern>> {
  return apiFetch<ApiResponse<Pattern>>({
    path: `${API_BASE}/patterns`,
    method: 'POST',
    data,
  })
}

/**
 * Update pattern
 */
export async function updatePattern(
  id: number,
  data: UpdatePatternRequest
): Promise<ApiResponse<Pattern>> {
  return apiFetch<ApiResponse<Pattern>>({
    path: `${API_BASE}/patterns/${id}`,
    method: 'PUT',
    data,
  })
}

/**
 * Delete pattern
 */
export async function deletePattern(
  id: number
): Promise<ApiResponse<{ message: string }>> {
  return apiFetch<ApiResponse<{ message: string }>>({
    path: `${API_BASE}/patterns/${id}`,
    method: 'DELETE',
  })
}

/**
 * Export pattern to theme
 */
export async function exportPattern(
  id: number
): Promise<ApiResponse<PatternExportResponse>> {
  return apiFetch<ApiResponse<PatternExportResponse>>({
    path: `${API_BASE}/patterns/${id}/export`,
    method: 'POST',
  })
}

/**
 * Duplicate pattern
 */
export async function duplicatePattern(
  id: number
): Promise<ApiResponse<Pattern>> {
  return apiFetch<ApiResponse<Pattern>>({
    path: `${API_BASE}/patterns/${id}/duplicate`,
    method: 'POST',
  })
}

/**
 * Fetch theme patterns only
 */
export async function fetchThemePatterns(): Promise<PatternsResponse> {
  return apiFetch<PatternsResponse>({
    path: `${API_BASE}/patterns/theme`,
    method: 'GET',
  })
}

/**
 * Fetch pattern categories
 */
export async function fetchPatternCategories(): Promise<PatternCategory[]> {
  return apiFetch<PatternCategory[]>({
    path: '/wp/v2/stratawp-pattern-categories',
    method: 'GET',
  })
}

/**
 * Fetch pattern tags
 */
export async function fetchPatternTags(): Promise<PatternTag[]> {
  return apiFetch<PatternTag[]>({
    path: '/wp/v2/stratawp-pattern-tags',
    method: 'GET',
  })
}
```

### Step 2: Update api/index.ts

```typescript
export * from './designSystem'
export * from './patterns'
```

### Step 3: Run typecheck

Run: `pnpm typecheck --filter @stratawp/studio`
Expected: No errors

### Step 4: Commit

```bash
git add packages/studio/src/api/
git commit -m "feat(studio): add pattern API client

- fetchPatterns with filters (source, category, tag, search)
- fetchPattern, createPattern, updatePattern, deletePattern
- exportPattern, duplicatePattern
- fetchPatternCategories, fetchPatternTags

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Create usePatterns Hook

**Files:**
- Create: `packages/studio/src/hooks/usePatterns.ts`
- Modify: `packages/studio/src/hooks/index.ts`

### Step 1: Create usePatterns.ts

```typescript
import { useState, useEffect, useCallback, useMemo } from '@wordpress/element'
import type {
  Pattern,
  PatternCategory,
  PatternTag,
  PatternFilters,
  CreatePatternRequest,
  UpdatePatternRequest,
} from '../types'
import * as api from '../api/patterns'

interface UsePatternsReturn {
  // State
  patterns: Pattern[]
  categories: PatternCategory[]
  tags: PatternTag[]
  total: number
  isLoading: boolean
  error: Error | null

  // Filters
  filters: PatternFilters
  setFilters: (filters: Partial<PatternFilters>) => void
  resetFilters: () => void

  // Actions
  createPattern: (data: CreatePatternRequest) => Promise<Pattern | null>
  updatePattern: (id: number, data: UpdatePatternRequest) => Promise<Pattern | null>
  deletePattern: (id: number) => Promise<boolean>
  exportPattern: (id: number) => Promise<string | null>
  duplicatePattern: (id: number) => Promise<Pattern | null>
  refetch: () => Promise<void>
}

const DEFAULT_FILTERS: PatternFilters = {
  source: 'all',
  category: null,
  tag: null,
  search: '',
  page: 1,
  perPage: 20,
}

export function usePatterns(): UsePatternsReturn {
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [categories, setCategories] = useState<PatternCategory[]>([])
  const [tags, setTags] = useState<PatternTag[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [filters, setFiltersState] = useState<PatternFilters>(DEFAULT_FILTERS)

  // Load patterns
  const loadPatterns = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await api.fetchPatterns(filters)
      setPatterns(response.items)
      setTotal(response.total)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load patterns'))
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  // Load categories and tags
  const loadTaxonomies = useCallback(async () => {
    try {
      const [categoriesData, tagsData] = await Promise.all([
        api.fetchPatternCategories(),
        api.fetchPatternTags(),
      ])
      setCategories(categoriesData)
      setTags(tagsData)
    } catch (err) {
      console.error('Failed to load taxonomies:', err)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadPatterns()
  }, [loadPatterns])

  useEffect(() => {
    loadTaxonomies()
  }, [loadTaxonomies])

  // Set filters
  const setFilters = useCallback((newFilters: Partial<PatternFilters>) => {
    setFiltersState((prev) => ({
      ...prev,
      ...newFilters,
      // Reset page when changing filters (except page itself)
      page: newFilters.page ?? 1,
    }))
  }, [])

  // Reset filters
  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS)
  }, [])

  // Create pattern
  const createPattern = useCallback(async (data: CreatePatternRequest): Promise<Pattern | null> => {
    try {
      setError(null)
      const response = await api.createPattern(data)
      if (response.success) {
        await loadPatterns()
        await loadTaxonomies()
        return response.data
      }
      return null
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create pattern'))
      return null
    }
  }, [loadPatterns, loadTaxonomies])

  // Update pattern
  const updatePattern = useCallback(async (
    id: number,
    data: UpdatePatternRequest
  ): Promise<Pattern | null> => {
    try {
      setError(null)
      const response = await api.updatePattern(id, data)
      if (response.success) {
        setPatterns((prev) =>
          prev.map((p) => (p.id === id ? response.data : p))
        )
        return response.data
      }
      return null
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update pattern'))
      return null
    }
  }, [])

  // Delete pattern
  const deletePattern = useCallback(async (id: number): Promise<boolean> => {
    try {
      setError(null)
      const response = await api.deletePattern(id)
      if (response.success) {
        setPatterns((prev) => prev.filter((p) => p.id !== id))
        setTotal((prev) => prev - 1)
        await loadTaxonomies()
        return true
      }
      return false
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete pattern'))
      return false
    }
  }, [loadTaxonomies])

  // Export pattern
  const exportPattern = useCallback(async (id: number): Promise<string | null> => {
    try {
      setError(null)
      const response = await api.exportPattern(id)
      if (response.success) {
        // Update local state with new sync status
        setPatterns((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, syncStatus: 'exported' as const, exportPath: response.data.path }
              : p
          )
        )
        return response.data.path
      }
      return null
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to export pattern'))
      return null
    }
  }, [])

  // Duplicate pattern
  const duplicatePattern = useCallback(async (id: number): Promise<Pattern | null> => {
    try {
      setError(null)
      const response = await api.duplicatePattern(id)
      if (response.success) {
        await loadPatterns()
        return response.data
      }
      return null
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to duplicate pattern'))
      return null
    }
  }, [loadPatterns])

  // Refetch
  const refetch = useCallback(async () => {
    await Promise.all([loadPatterns(), loadTaxonomies()])
  }, [loadPatterns, loadTaxonomies])

  return {
    patterns,
    categories,
    tags,
    total,
    isLoading,
    error,
    filters,
    setFilters,
    resetFilters,
    createPattern,
    updatePattern,
    deletePattern,
    exportPattern,
    duplicatePattern,
    refetch,
  }
}
```

### Step 2: Update hooks/index.ts

```typescript
export { useLivePreview } from './useLivePreview'
export { useDesignTokens } from './useDesignTokens'
export { usePatterns } from './usePatterns'
```

### Step 3: Run typecheck

Run: `pnpm typecheck --filter @stratawp/studio`
Expected: No errors

### Step 4: Commit

```bash
git add packages/studio/src/hooks/
git commit -m "feat(studio): add usePatterns hook

- Load patterns with filtering and pagination
- Load categories and tags
- CRUD operations: create, update, delete
- Export and duplicate actions
- Filter management with reset

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Create Pattern Library UI Components

**Files:**
- Create: `packages/studio/src/pages/PatternLibrary/index.tsx`
- Create: `packages/studio/src/pages/PatternLibrary/PatternGrid.tsx`
- Create: `packages/studio/src/pages/PatternLibrary/PatternCard.tsx`
- Create: `packages/studio/src/pages/PatternLibrary/PatternFilters.tsx`

### Step 1: Create PatternFilters.tsx

```typescript
import { TextControl, SelectControl, CheckboxControl } from '@wordpress/components'
import { __ } from '@wordpress/i18n'
import type { PatternCategory, PatternTag, PatternFilters as Filters } from '../../types'

interface PatternFiltersProps {
  filters: Filters
  categories: PatternCategory[]
  tags: PatternTag[]
  onFilterChange: (filters: Partial<Filters>) => void
  onReset: () => void
}

export function PatternFilters({
  filters,
  categories,
  tags,
  onFilterChange,
  onReset,
}: PatternFiltersProps) {
  return (
    <div className="stratawp-pattern-filters">
      {/* Search */}
      <div className="stratawp-pattern-filters__section">
        <TextControl
          label={__('Search', 'stratawp')}
          value={filters.search}
          onChange={(value) => onFilterChange({ search: value })}
          placeholder={__('Search patterns...', 'stratawp')}
        />
      </div>

      {/* Source */}
      <div className="stratawp-pattern-filters__section">
        <p className="stratawp-pattern-filters__label">{__('Source', 'stratawp')}</p>
        <SelectControl
          value={filters.source}
          options={[
            { label: __('All Patterns', 'stratawp'), value: 'all' },
            { label: __('Theme Patterns', 'stratawp'), value: 'theme' },
            { label: __('User Patterns', 'stratawp'), value: 'user' },
          ]}
          onChange={(value) => onFilterChange({ source: value as Filters['source'] })}
        />
      </div>

      {/* Categories */}
      <div className="stratawp-pattern-filters__section">
        <p className="stratawp-pattern-filters__label">{__('Categories', 'stratawp')}</p>
        <div className="stratawp-pattern-filters__checkboxes">
          {categories.map((category) => (
            <CheckboxControl
              key={category.slug}
              label={`${category.name} (${category.count})`}
              checked={filters.category === category.slug}
              onChange={(checked) =>
                onFilterChange({ category: checked ? category.slug : null })
              }
            />
          ))}
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="stratawp-pattern-filters__section">
          <p className="stratawp-pattern-filters__label">{__('Tags', 'stratawp')}</p>
          <div className="stratawp-pattern-filters__tags">
            {tags.map((tag) => (
              <button
                key={tag.slug}
                type="button"
                className={`stratawp-pattern-filters__tag ${
                  filters.tag === tag.slug ? 'is-selected' : ''
                }`}
                onClick={() =>
                  onFilterChange({ tag: filters.tag === tag.slug ? null : tag.slug })
                }
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reset */}
      <div className="stratawp-pattern-filters__section">
        <button
          type="button"
          className="stratawp-pattern-filters__reset"
          onClick={onReset}
        >
          {__('Reset Filters', 'stratawp')}
        </button>
      </div>
    </div>
  )
}
```

### Step 2: Create PatternCard.tsx

```typescript
import { useState } from '@wordpress/element'
import { Button, DropdownMenu, MenuGroup, MenuItem } from '@wordpress/components'
import { moreVertical, edit, copy, download, trash } from '@wordpress/icons'
import { __ } from '@wordpress/i18n'
import type { Pattern } from '../../types'

interface PatternCardProps {
  pattern: Pattern
  onEdit: (pattern: Pattern) => void
  onDuplicate: (pattern: Pattern) => void
  onExport: (pattern: Pattern) => void
  onDelete: (pattern: Pattern) => void
}

export function PatternCard({
  pattern,
  onEdit,
  onDuplicate,
  onExport,
  onDelete,
}: PatternCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const isUserPattern = pattern.source === 'user'

  const getSyncStatusLabel = () => {
    if (!pattern.syncStatus) return null
    switch (pattern.syncStatus) {
      case 'exported':
        return __('Exported', 'stratawp')
      case 'modified':
        return __('Modified', 'stratawp')
      default:
        return null
    }
  }

  const syncStatusLabel = getSyncStatusLabel()

  return (
    <div
      className="stratawp-pattern-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Preview */}
      <div className="stratawp-pattern-card__preview">
        <div
          className="stratawp-pattern-card__content"
          dangerouslySetInnerHTML={{ __html: pattern.content }}
        />
      </div>

      {/* Info */}
      <div className="stratawp-pattern-card__info">
        <h3 className="stratawp-pattern-card__title">{pattern.title}</h3>
        <div className="stratawp-pattern-card__meta">
          <span className={`stratawp-pattern-card__source stratawp-pattern-card__source--${pattern.source}`}>
            {pattern.source === 'theme' ? __('Theme', 'stratawp') : __('User', 'stratawp')}
          </span>
          {syncStatusLabel && (
            <span className={`stratawp-pattern-card__sync stratawp-pattern-card__sync--${pattern.syncStatus}`}>
              {syncStatusLabel}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {isHovered && (
        <div className="stratawp-pattern-card__actions">
          {isUserPattern && (
            <Button
              icon={edit}
              label={__('Edit', 'stratawp')}
              onClick={() => onEdit(pattern)}
            />
          )}
          <DropdownMenu
            icon={moreVertical}
            label={__('More actions', 'stratawp')}
          >
            {({ onClose }) => (
              <>
                <MenuGroup>
                  {isUserPattern && (
                    <MenuItem
                      icon={edit}
                      onClick={() => {
                        onEdit(pattern)
                        onClose()
                      }}
                    >
                      {__('Edit in Block Editor', 'stratawp')}
                    </MenuItem>
                  )}
                  <MenuItem
                    icon={copy}
                    onClick={() => {
                      onDuplicate(pattern)
                      onClose()
                    }}
                  >
                    {__('Duplicate', 'stratawp')}
                  </MenuItem>
                  {isUserPattern && (
                    <MenuItem
                      icon={download}
                      onClick={() => {
                        onExport(pattern)
                        onClose()
                      }}
                    >
                      {__('Export to Theme', 'stratawp')}
                    </MenuItem>
                  )}
                </MenuGroup>
                {isUserPattern && (
                  <MenuGroup>
                    <MenuItem
                      icon={trash}
                      isDestructive
                      onClick={() => {
                        onDelete(pattern)
                        onClose()
                      }}
                    >
                      {__('Delete', 'stratawp')}
                    </MenuItem>
                  </MenuGroup>
                )}
              </>
            )}
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}
```

### Step 3: Create PatternGrid.tsx

```typescript
import { __ } from '@wordpress/i18n'
import { Spinner } from '@wordpress/components'
import { PatternCard } from './PatternCard'
import type { Pattern } from '../../types'

interface PatternGridProps {
  patterns: Pattern[]
  isLoading: boolean
  total: number
  onEdit: (pattern: Pattern) => void
  onDuplicate: (pattern: Pattern) => void
  onExport: (pattern: Pattern) => void
  onDelete: (pattern: Pattern) => void
  onLoadMore?: () => void
  hasMore: boolean
}

export function PatternGrid({
  patterns,
  isLoading,
  total,
  onEdit,
  onDuplicate,
  onExport,
  onDelete,
  onLoadMore,
  hasMore,
}: PatternGridProps) {
  if (isLoading && patterns.length === 0) {
    return (
      <div className="stratawp-pattern-grid__loading">
        <Spinner />
        <p>{__('Loading patterns...', 'stratawp')}</p>
      </div>
    )
  }

  if (patterns.length === 0) {
    return (
      <div className="stratawp-pattern-grid__empty">
        <p>{__('No patterns found.', 'stratawp')}</p>
      </div>
    )
  }

  return (
    <div className="stratawp-pattern-grid">
      <div className="stratawp-pattern-grid__items">
        {patterns.map((pattern) => (
          <PatternCard
            key={`${pattern.source}-${pattern.id || pattern.slug}`}
            pattern={pattern}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onExport={onExport}
            onDelete={onDelete}
          />
        ))}
      </div>

      <div className="stratawp-pattern-grid__footer">
        <p className="stratawp-pattern-grid__count">
          {__('Showing', 'stratawp')} {patterns.length} {__('of', 'stratawp')} {total} {__('patterns', 'stratawp')}
        </p>
        {hasMore && onLoadMore && (
          <button
            type="button"
            className="stratawp-pattern-grid__load-more"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? __('Loading...', 'stratawp') : __('Load More', 'stratawp')}
          </button>
        )}
      </div>
    </div>
  )
}
```

### Step 4: Create index.tsx (main page)

```typescript
import { useState, useCallback } from '@wordpress/element'
import { Button, Modal, TextControl, SelectControl, Notice } from '@wordpress/components'
import { plus } from '@wordpress/icons'
import { __ } from '@wordpress/i18n'
import { usePatterns } from '../../hooks/usePatterns'
import { PatternFilters } from './PatternFilters'
import { PatternGrid } from './PatternGrid'
import type { Pattern } from '../../types'

declare const stratawpStudio: {
  adminUrl: string
}

export function PatternLibraryPage() {
  const {
    patterns,
    categories,
    tags,
    total,
    isLoading,
    error,
    filters,
    setFilters,
    resetFilters,
    createPattern,
    deletePattern,
    exportPattern,
    duplicatePattern,
  } = usePatterns()

  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [newPatternTitle, setNewPatternTitle] = useState('')
  const [newPatternCategory, setNewPatternCategory] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Pattern | null>(null)

  // Handle edit - redirect to block editor
  const handleEdit = useCallback((pattern: Pattern) => {
    if (pattern.source === 'user' && pattern.id) {
      window.location.href = `${stratawpStudio.adminUrl}post.php?post=${pattern.id}&action=edit`
    }
  }, [])

  // Handle duplicate
  const handleDuplicate = useCallback(async (pattern: Pattern) => {
    if (pattern.source === 'user' && pattern.id) {
      await duplicatePattern(pattern.id)
    }
  }, [duplicatePattern])

  // Handle export
  const handleExport = useCallback(async (pattern: Pattern) => {
    if (pattern.source === 'user' && pattern.id) {
      const path = await exportPattern(pattern.id)
      if (path) {
        // Show success notification (could use WordPress notices)
        alert(__('Pattern exported to: ', 'stratawp') + path)
      }
    }
  }, [exportPattern])

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (confirmDelete && confirmDelete.id) {
      await deletePattern(confirmDelete.id)
      setConfirmDelete(null)
    }
  }, [confirmDelete, deletePattern])

  // Handle create new pattern
  const handleCreatePattern = useCallback(async () => {
    if (!newPatternTitle.trim()) return

    setIsCreating(true)
    const pattern = await createPattern({
      title: newPatternTitle,
      content: '<!-- wp:paragraph --><p>Start building your pattern...</p><!-- /wp:paragraph -->',
      categories: newPatternCategory ? [newPatternCategory] : [],
    })

    setIsCreating(false)

    if (pattern) {
      setIsNewModalOpen(false)
      setNewPatternTitle('')
      setNewPatternCategory('')
      // Redirect to edit the new pattern
      window.location.href = `${stratawpStudio.adminUrl}post.php?post=${pattern.id}&action=edit`
    }
  }, [newPatternTitle, newPatternCategory, createPattern])

  // Load more
  const handleLoadMore = useCallback(() => {
    setFilters({ page: filters.page + 1 })
  }, [filters.page, setFilters])

  const hasMore = patterns.length < total

  return (
    <div className="stratawp-pattern-library">
      {/* Header */}
      <div className="stratawp-pattern-library__header">
        <h2>{__('Pattern Library', 'stratawp')}</h2>
        <Button
          variant="primary"
          icon={plus}
          onClick={() => setIsNewModalOpen(true)}
        >
          {__('New Pattern', 'stratawp')}
        </Button>
      </div>

      {/* Error notice */}
      {error && (
        <Notice status="error" isDismissible={false}>
          {error.message}
        </Notice>
      )}

      {/* Main layout */}
      <div className="stratawp-pattern-library__layout">
        {/* Filters sidebar */}
        <aside className="stratawp-pattern-library__sidebar">
          <PatternFilters
            filters={filters}
            categories={categories}
            tags={tags}
            onFilterChange={setFilters}
            onReset={resetFilters}
          />
        </aside>

        {/* Pattern grid */}
        <main className="stratawp-pattern-library__main">
          <PatternGrid
            patterns={patterns}
            isLoading={isLoading}
            total={total}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onExport={handleExport}
            onDelete={setConfirmDelete}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
          />
        </main>
      </div>

      {/* New Pattern Modal */}
      {isNewModalOpen && (
        <Modal
          title={__('Create New Pattern', 'stratawp')}
          onRequestClose={() => setIsNewModalOpen(false)}
        >
          <div className="stratawp-new-pattern-modal">
            <TextControl
              label={__('Pattern Name', 'stratawp')}
              value={newPatternTitle}
              onChange={setNewPatternTitle}
              placeholder={__('Enter pattern name...', 'stratawp')}
            />
            <SelectControl
              label={__('Category', 'stratawp')}
              value={newPatternCategory}
              options={[
                { label: __('Select a category...', 'stratawp'), value: '' },
                ...categories.map((cat) => ({
                  label: cat.name,
                  value: cat.slug,
                })),
              ]}
              onChange={setNewPatternCategory}
            />
            <div className="stratawp-new-pattern-modal__actions">
              <Button
                variant="secondary"
                onClick={() => setIsNewModalOpen(false)}
              >
                {__('Cancel', 'stratawp')}
              </Button>
              <Button
                variant="primary"
                onClick={handleCreatePattern}
                disabled={!newPatternTitle.trim() || isCreating}
                isBusy={isCreating}
              >
                {__('Create Pattern', 'stratawp')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <Modal
          title={__('Delete Pattern', 'stratawp')}
          onRequestClose={() => setConfirmDelete(null)}
        >
          <p>
            {__('Are you sure you want to delete', 'stratawp')} "{confirmDelete.title}"?
            {__(' This action cannot be undone.', 'stratawp')}
          </p>
          <div className="stratawp-delete-modal__actions">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
              {__('Cancel', 'stratawp')}
            </Button>
            <Button variant="primary" isDestructive onClick={handleDeleteConfirm}>
              {__('Delete', 'stratawp')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
```

### Step 5: Run typecheck

Run: `pnpm typecheck --filter @stratawp/studio`
Expected: No errors

### Step 6: Commit

```bash
git add packages/studio/src/pages/PatternLibrary/
git commit -m "feat(studio): add Pattern Library UI components

- PatternFilters: search, source, category, tag filters
- PatternCard: preview, metadata, actions dropdown
- PatternGrid: responsive grid with load more
- PatternLibraryPage: main page with modals

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Add Pattern Library Styles

**Files:**
- Modify: `packages/studio/src/styles/admin.css`

### Step 1: Add Pattern Library CSS

Append to admin.css:

```css
/* Pattern Library */
.stratawp-pattern-library__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.stratawp-pattern-library__header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.stratawp-pattern-library__layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  min-height: 600px;
}

/* Pattern Filters */
.stratawp-pattern-filters {
  background: #f6f7f7;
  border-radius: 8px;
  padding: 16px;
}

.stratawp-pattern-filters__section {
  margin-bottom: 20px;
}

.stratawp-pattern-filters__section:last-child {
  margin-bottom: 0;
}

.stratawp-pattern-filters__label {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #1e1e1e;
}

.stratawp-pattern-filters__checkboxes {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stratawp-pattern-filters__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.stratawp-pattern-filters__tag {
  padding: 4px 12px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.stratawp-pattern-filters__tag:hover {
  border-color: #2271b1;
}

.stratawp-pattern-filters__tag.is-selected {
  background: #2271b1;
  border-color: #2271b1;
  color: #fff;
}

.stratawp-pattern-filters__reset {
  width: 100%;
  padding: 8px;
  background: none;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  color: #757575;
}

.stratawp-pattern-filters__reset:hover {
  border-color: #2271b1;
  color: #2271b1;
}

/* Pattern Grid */
.stratawp-pattern-grid__loading,
.stratawp-pattern-grid__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: #757575;
}

.stratawp-pattern-grid__items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.stratawp-pattern-grid__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
}

.stratawp-pattern-grid__count {
  margin: 0;
  font-size: 13px;
  color: #757575;
}

.stratawp-pattern-grid__load-more {
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #2271b1;
  border-radius: 4px;
  color: #2271b1;
  font-size: 13px;
  cursor: pointer;
}

.stratawp-pattern-grid__load-more:hover {
  background: #2271b1;
  color: #fff;
}

.stratawp-pattern-grid__load-more:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Pattern Card */
.stratawp-pattern-card {
  position: relative;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.stratawp-pattern-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stratawp-pattern-card__preview {
  height: 180px;
  overflow: hidden;
  background: #f6f7f7;
  border-bottom: 1px solid #e0e0e0;
}

.stratawp-pattern-card__content {
  transform: scale(0.4);
  transform-origin: top left;
  width: 250%;
  pointer-events: none;
}

.stratawp-pattern-card__info {
  padding: 12px;
}

.stratawp-pattern-card__title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stratawp-pattern-card__meta {
  display: flex;
  gap: 8px;
}

.stratawp-pattern-card__source {
  padding: 2px 8px;
  font-size: 11px;
  border-radius: 4px;
  text-transform: uppercase;
}

.stratawp-pattern-card__source--theme {
  background: #e8f4ea;
  color: #2e7d32;
}

.stratawp-pattern-card__source--user {
  background: #e3f2fd;
  color: #1565c0;
}

.stratawp-pattern-card__sync {
  padding: 2px 8px;
  font-size: 11px;
  border-radius: 4px;
}

.stratawp-pattern-card__sync--exported {
  background: #e8f5e9;
  color: #388e3c;
}

.stratawp-pattern-card__sync--modified {
  background: #fff3e0;
  color: #f57c00;
}

.stratawp-pattern-card__actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 4px;
  padding: 4px;
}

/* Modals */
.stratawp-new-pattern-modal,
.stratawp-delete-modal {
  min-width: 400px;
}

.stratawp-new-pattern-modal__actions,
.stratawp-delete-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
}
```

### Step 2: Commit

```bash
git add packages/studio/src/styles/admin.css
git commit -m "feat(studio): add Pattern Library CSS styles

- Filter sidebar styles
- Pattern grid responsive layout
- Pattern card with preview and metadata
- Modal styles for create and delete

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Wire Up Pattern Library Page

**Files:**
- Modify: `packages/studio/src/pages/StudioApp.tsx`
- Modify: `packages/studio/php/Studio.php`

### Step 1: Update StudioApp.tsx

Replace the placeholder PatternLibraryPage import with the real one:

```typescript
import { render } from '@wordpress/element'
import { AdminLayout } from '../components/AdminLayout'
import { DesignSystemPage } from './DesignSystem'
import { PatternLibraryPage } from './PatternLibrary'

// Placeholder components for other pages
function BlockLibraryPage() {
  return <div>Block Library - Coming Soon</div>
}

function TemplateBuilderPage() {
  return <div>Template Builder - Coming Soon</div>
}

function StarterSitesPage() {
  return <div>Starter Sites - Coming Soon</div>
}

const PAGE_COMPONENTS: Record<string, React.ComponentType> = {
  'stratawp-studio': DesignSystemPage,
  'stratawp-studio-blocks': BlockLibraryPage,
  'stratawp-studio-patterns': PatternLibraryPage,
  'stratawp-studio-templates': TemplateBuilderPage,
  'stratawp-studio-starters': StarterSitesPage,
}

// ... rest of file unchanged
```

### Step 2: Update Studio.php to add adminUrl to localized script

In the `enqueue_admin_scripts` method, update the `wp_localize_script` call:

```php
wp_localize_script('stratawp-studio', 'stratawpStudio', [
    'apiBase'    => rest_url('stratawp/v1'),
    'nonce'      => wp_create_nonce('wp_rest'),
    'previewUrl' => home_url('/?stratawp_preview=1'),
    'themeSlug'  => get_stylesheet(),
    'version'    => self::VERSION,
    'adminUrl'   => admin_url(),
]);
```

### Step 3: Run build

Run: `pnpm build --filter @stratawp/studio`
Expected: Build succeeds

### Step 4: Commit

```bash
git add packages/studio/src/pages/StudioApp.tsx packages/studio/php/Studio.php
git commit -m "feat(studio): wire up Pattern Library page

- Import PatternLibraryPage in StudioApp
- Add adminUrl to localized script data
- Pattern Library now accessible from nav

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Final Build and Verification

**Files:**
- None (verification only)

### Step 1: Full build

Run:
```bash
cd "/Users/jon.imms/Local Sites/stratawp/strataWP/.worktrees/phase2-patterns"
pnpm install --ignore-scripts
pnpm build
```

Expected: All packages build successfully.

### Step 2: Typecheck

Run: `pnpm typecheck --filter @stratawp/studio`
Expected: No errors

### Step 3: PHP lint

Run:
```bash
php -l packages/studio/php/PostTypes/PatternPostType.php
php -l packages/studio/php/RestApi/PatternsController.php
php -l packages/studio/php/Services/PatternExporter.php
php -l packages/studio/php/Studio.php
```

Expected: No syntax errors in any file.

### Step 4: Final commit

```bash
git add .
git commit -m "feat(studio): complete Phase 2 Pattern Library

Phase 2 delivers:
- Pattern CPT with categories and tags taxonomies
- Full REST API for pattern CRUD operations
- Pattern export to theme files
- usePatterns hook for state management
- Pattern Library UI with filters and grid
- Block Editor integration ready (Task 11)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

**Phase 2 delivers:**

| Component | Status |
|-----------|--------|
| Pattern CPT + Taxonomies | Task 1 |
| Patterns REST API | Task 2 |
| Pattern Exporter Service | Task 3 |
| Pattern Types | Task 4 |
| Pattern API Client | Task 5 |
| usePatterns Hook | Task 6 |
| Pattern Library UI | Task 7 |
| Pattern Library Styles | Task 8 |
| Page Wiring | Task 9 |
| Build Verification | Task 10 |

**Next Phase (2B):** Block Editor Integration
- Gutenberg plugin for "Save as Pattern"
- Save Pattern modal
- Integration with REST API
