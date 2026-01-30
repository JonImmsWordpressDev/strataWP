<?php
/**
 * Pattern Post Type Registration
 *
 * @package StrataWP\Studio\PostTypes
 */

namespace StrataWP\Studio\PostTypes;

/**
 * Handles registration of the Pattern custom post type and related taxonomies.
 */
class PatternPostType {
    /**
     * Post type slug.
     */
    public const POST_TYPE = 'stratawp_pattern';

    /**
     * Category taxonomy slug.
     */
    public const TAXONOMY_CATEGORY = 'stratawp_pattern_category';

    /**
     * Tag taxonomy slug.
     */
    public const TAXONOMY_TAG = 'stratawp_pattern_tag';

    /**
     * Default categories for patterns.
     *
     * @var array<string, string>
     */
    private const DEFAULT_CATEGORIES = [
        'hero'         => 'Hero',
        'features'     => 'Features',
        'testimonials' => 'Testimonials',
        'cta'          => 'Call to Action',
        'team'         => 'Team',
        'pricing'      => 'Pricing',
        'faq'          => 'FAQ',
        'gallery'      => 'Gallery',
        'contact'      => 'Contact',
        'footer'       => 'Footer',
        'header'       => 'Header',
    ];

    /**
     * Initialize the post type registration.
     */
    public function initialize(): void {
        add_action('init', [$this, 'register_post_type']);
        add_action('init', [$this, 'register_taxonomies']);
        add_action('init', [$this, 'register_default_categories'], 20);
    }

    /**
     * Register the pattern custom post type.
     */
    public function register_post_type(): void {
        $labels = [
            'name'                  => _x('Patterns', 'Post type general name', 'stratawp'),
            'singular_name'         => _x('Pattern', 'Post type singular name', 'stratawp'),
            'menu_name'             => _x('Patterns', 'Admin Menu text', 'stratawp'),
            'name_admin_bar'        => _x('Pattern', 'Add New on Toolbar', 'stratawp'),
            'add_new'               => __('Add New', 'stratawp'),
            'add_new_item'          => __('Add New Pattern', 'stratawp'),
            'new_item'              => __('New Pattern', 'stratawp'),
            'edit_item'             => __('Edit Pattern', 'stratawp'),
            'view_item'             => __('View Pattern', 'stratawp'),
            'all_items'             => __('All Patterns', 'stratawp'),
            'search_items'          => __('Search Patterns', 'stratawp'),
            'parent_item_colon'     => __('Parent Patterns:', 'stratawp'),
            'not_found'             => __('No patterns found.', 'stratawp'),
            'not_found_in_trash'    => __('No patterns found in Trash.', 'stratawp'),
            'featured_image'        => _x('Pattern Cover Image', 'Overrides the "Featured Image" phrase', 'stratawp'),
            'set_featured_image'    => _x('Set cover image', 'Overrides the "Set featured image" phrase', 'stratawp'),
            'remove_featured_image' => _x('Remove cover image', 'Overrides the "Remove featured image" phrase', 'stratawp'),
            'use_featured_image'    => _x('Use as cover image', 'Overrides the "Use as featured image" phrase', 'stratawp'),
            'archives'              => _x('Pattern archives', 'The post type archive label', 'stratawp'),
            'insert_into_item'      => _x('Insert into pattern', 'Overrides the "Insert into post" phrase', 'stratawp'),
            'uploaded_to_this_item' => _x('Uploaded to this pattern', 'Overrides the "Uploaded to this post" phrase', 'stratawp'),
            'filter_items_list'     => _x('Filter patterns list', 'Screen reader text', 'stratawp'),
            'items_list_navigation' => _x('Patterns list navigation', 'Screen reader text', 'stratawp'),
            'items_list'            => _x('Patterns list', 'Screen reader text', 'stratawp'),
        ];

        $args = [
            'labels'             => $labels,
            'public'             => false,
            'publicly_queryable' => false,
            'show_ui'            => true,
            'show_in_menu'       => false,
            'query_var'          => false,
            'rewrite'            => false,
            'capability_type'    => 'post',
            'has_archive'        => false,
            'hierarchical'       => false,
            'menu_position'      => null,
            'show_in_rest'       => true,
            'rest_base'          => 'stratawp-patterns',
            'supports'           => ['title', 'editor', 'custom-fields', 'revisions'],
        ];

        register_post_type(self::POST_TYPE, $args);
    }

    /**
     * Register pattern taxonomies.
     */
    public function register_taxonomies(): void {
        // Register hierarchical category taxonomy.
        $category_labels = [
            'name'                       => _x('Pattern Categories', 'taxonomy general name', 'stratawp'),
            'singular_name'              => _x('Pattern Category', 'taxonomy singular name', 'stratawp'),
            'search_items'               => __('Search Pattern Categories', 'stratawp'),
            'popular_items'              => __('Popular Pattern Categories', 'stratawp'),
            'all_items'                  => __('All Pattern Categories', 'stratawp'),
            'parent_item'                => __('Parent Pattern Category', 'stratawp'),
            'parent_item_colon'          => __('Parent Pattern Category:', 'stratawp'),
            'edit_item'                  => __('Edit Pattern Category', 'stratawp'),
            'update_item'                => __('Update Pattern Category', 'stratawp'),
            'add_new_item'               => __('Add New Pattern Category', 'stratawp'),
            'new_item_name'              => __('New Pattern Category Name', 'stratawp'),
            'separate_items_with_commas' => __('Separate pattern categories with commas', 'stratawp'),
            'add_or_remove_items'        => __('Add or remove pattern categories', 'stratawp'),
            'choose_from_most_used'      => __('Choose from the most used pattern categories', 'stratawp'),
            'not_found'                  => __('No pattern categories found.', 'stratawp'),
            'menu_name'                  => __('Categories', 'stratawp'),
            'back_to_items'              => __('&larr; Back to Pattern Categories', 'stratawp'),
        ];

        $category_args = [
            'labels'            => $category_labels,
            'hierarchical'      => true,
            'public'            => false,
            'show_ui'           => true,
            'show_admin_column' => true,
            'show_in_nav_menus' => false,
            'show_tagcloud'     => false,
            'show_in_rest'      => true,
            'rest_base'         => 'stratawp-pattern-categories',
            'query_var'         => false,
            'rewrite'           => false,
        ];

        register_taxonomy(self::TAXONOMY_CATEGORY, self::POST_TYPE, $category_args);

        // Register non-hierarchical tag taxonomy.
        $tag_labels = [
            'name'                       => _x('Pattern Tags', 'taxonomy general name', 'stratawp'),
            'singular_name'              => _x('Pattern Tag', 'taxonomy singular name', 'stratawp'),
            'search_items'               => __('Search Pattern Tags', 'stratawp'),
            'popular_items'              => __('Popular Pattern Tags', 'stratawp'),
            'all_items'                  => __('All Pattern Tags', 'stratawp'),
            'parent_item'                => null,
            'parent_item_colon'          => null,
            'edit_item'                  => __('Edit Pattern Tag', 'stratawp'),
            'update_item'                => __('Update Pattern Tag', 'stratawp'),
            'add_new_item'               => __('Add New Pattern Tag', 'stratawp'),
            'new_item_name'              => __('New Pattern Tag Name', 'stratawp'),
            'separate_items_with_commas' => __('Separate pattern tags with commas', 'stratawp'),
            'add_or_remove_items'        => __('Add or remove pattern tags', 'stratawp'),
            'choose_from_most_used'      => __('Choose from the most used pattern tags', 'stratawp'),
            'not_found'                  => __('No pattern tags found.', 'stratawp'),
            'menu_name'                  => __('Tags', 'stratawp'),
            'back_to_items'              => __('&larr; Back to Pattern Tags', 'stratawp'),
        ];

        $tag_args = [
            'labels'            => $tag_labels,
            'hierarchical'      => false,
            'public'            => false,
            'show_ui'           => true,
            'show_admin_column' => true,
            'show_in_nav_menus' => false,
            'show_tagcloud'     => true,
            'show_in_rest'      => true,
            'rest_base'         => 'stratawp-pattern-tags',
            'query_var'         => false,
            'rewrite'           => false,
        ];

        register_taxonomy(self::TAXONOMY_TAG, self::POST_TYPE, $tag_args);
    }

    /**
     * Register default pattern categories.
     */
    public function register_default_categories(): void {
        // Only run on admin or during REST requests.
        if (!is_admin() && !defined('REST_REQUEST')) {
            return;
        }

        foreach (self::DEFAULT_CATEGORIES as $slug => $name) {
            if (!term_exists($slug, self::TAXONOMY_CATEGORY)) {
                wp_insert_term(
                    $name,
                    self::TAXONOMY_CATEGORY,
                    [
                        'slug' => $slug,
                    ]
                );
            }
        }
    }

    /**
     * Register pattern meta fields.
     */
    public static function register_meta(): void {
        // Keywords meta - array of searchable keywords.
        register_post_meta(
            self::POST_TYPE,
            '_stratawp_pattern_keywords',
            [
                'type'          => 'array',
                'description'   => __('Searchable keywords for the pattern', 'stratawp'),
                'single'        => true,
                'show_in_rest'  => [
                    'schema' => [
                        'type'  => 'array',
                        'items' => [
                            'type' => 'string',
                        ],
                    ],
                ],
                'auth_callback' => function () {
                    return current_user_can('edit_posts');
                },
            ]
        );

        // Viewport meta - preferred viewport for the pattern (desktop, tablet, mobile).
        register_post_meta(
            self::POST_TYPE,
            '_stratawp_pattern_viewport',
            [
                'type'          => 'string',
                'description'   => __('Preferred viewport for pattern preview', 'stratawp'),
                'single'        => true,
                'default'       => 'desktop',
                'show_in_rest'  => true,
                'auth_callback' => function () {
                    return current_user_can('edit_posts');
                },
            ]
        );

        // Sync status meta - tracks sync state with filesystem.
        register_post_meta(
            self::POST_TYPE,
            '_stratawp_pattern_sync_status',
            [
                'type'          => 'string',
                'description'   => __('Sync status with filesystem', 'stratawp'),
                'single'        => true,
                'default'       => 'draft',
                'show_in_rest'  => true,
                'auth_callback' => function () {
                    return current_user_can('edit_posts');
                },
            ]
        );

        // Export path meta - file path for exported pattern.
        register_post_meta(
            self::POST_TYPE,
            '_stratawp_pattern_export_path',
            [
                'type'          => 'string',
                'description'   => __('File path for exported pattern', 'stratawp'),
                'single'        => true,
                'default'       => '',
                'show_in_rest'  => true,
                'auth_callback' => function () {
                    return current_user_can('edit_posts');
                },
            ]
        );

        // Block types meta - array of block types this pattern is suitable for.
        register_post_meta(
            self::POST_TYPE,
            '_stratawp_pattern_block_types',
            [
                'type'          => 'array',
                'description'   => __('Block types this pattern is suitable for', 'stratawp'),
                'single'        => true,
                'show_in_rest'  => [
                    'schema' => [
                        'type'  => 'array',
                        'items' => [
                            'type' => 'string',
                        ],
                    ],
                ],
                'auth_callback' => function () {
                    return current_user_can('edit_posts');
                },
            ]
        );
    }
}
