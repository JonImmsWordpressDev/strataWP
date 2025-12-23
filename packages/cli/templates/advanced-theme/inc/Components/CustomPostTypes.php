<?php
/**
 * Custom Post Types Component
 *
 * Registers custom post types for advanced functionality.
 *
 * @package StrataAdvanced
 */

namespace StrataBasic\Components;

use StrataWP\ComponentInterface;

/**
 * Custom Post Types Registration
 */
class CustomPostTypes implements ComponentInterface {
    /**
     * {@inheritdoc}
     */
    public function get_slug(): string {
        return 'custom-post-types';
    }

    /**
     * {@inheritdoc}
     */
    public function initialize(): void {
        add_action( 'init', [ $this, 'register_portfolio' ] );
        add_action( 'init', [ $this, 'register_team' ] );
        add_action( 'init', [ $this, 'register_testimonials' ] );
        add_action( 'init', [ $this, 'register_case_studies' ] );
    }

    /**
     * Register Portfolio post type
     */
    public function register_portfolio(): void {
        $labels = [
            'name'                  => __( 'Portfolio', 'strata-advanced' ),
            'singular_name'         => __( 'Portfolio Item', 'strata-advanced' ),
            'menu_name'             => __( 'Portfolio', 'strata-advanced' ),
            'add_new'               => __( 'Add New', 'strata-advanced' ),
            'add_new_item'          => __( 'Add New Portfolio Item', 'strata-advanced' ),
            'edit_item'             => __( 'Edit Portfolio Item', 'strata-advanced' ),
            'new_item'              => __( 'New Portfolio Item', 'strata-advanced' ),
            'view_item'             => __( 'View Portfolio Item', 'strata-advanced' ),
            'search_items'          => __( 'Search Portfolio', 'strata-advanced' ),
            'not_found'             => __( 'No portfolio items found', 'strata-advanced' ),
            'not_found_in_trash'    => __( 'No portfolio items found in trash', 'strata-advanced' ),
            'all_items'             => __( 'All Portfolio Items', 'strata-advanced' ),
            'archives'              => __( 'Portfolio Archives', 'strata-advanced' ),
        ];

        $args = [
            'labels'              => $labels,
            'public'              => true,
            'publicly_queryable'  => true,
            'show_ui'             => true,
            'show_in_menu'        => true,
            'show_in_rest'        => true,
            'query_var'           => true,
            'rewrite'             => [ 'slug' => 'portfolio' ],
            'capability_type'     => 'post',
            'has_archive'         => true,
            'hierarchical'        => false,
            'menu_position'       => 5,
            'menu_icon'           => 'dashicons-portfolio',
            'supports'            => [ 'title', 'editor', 'thumbnail', 'excerpt', 'custom-fields' ],
            'taxonomies'          => [ 'portfolio_category', 'portfolio_tag' ],
        ];

        register_post_type( 'portfolio', $args );

        // Register custom taxonomies
        register_taxonomy( 'portfolio_category', 'portfolio', [
            'label'        => __( 'Portfolio Categories', 'strata-advanced' ),
            'hierarchical' => true,
            'show_in_rest' => true,
            'rewrite'      => [ 'slug' => 'portfolio-category' ],
        ] );

        register_taxonomy( 'portfolio_tag', 'portfolio', [
            'label'        => __( 'Portfolio Tags', 'strata-advanced' ),
            'hierarchical' => false,
            'show_in_rest' => true,
            'rewrite'      => [ 'slug' => 'portfolio-tag' ],
        ] );
    }

    /**
     * Register Team Members post type
     */
    public function register_team(): void {
        $labels = [
            'name'                  => __( 'Team Members', 'strata-advanced' ),
            'singular_name'         => __( 'Team Member', 'strata-advanced' ),
            'menu_name'             => __( 'Team', 'strata-advanced' ),
            'add_new'               => __( 'Add New', 'strata-advanced' ),
            'add_new_item'          => __( 'Add New Team Member', 'strata-advanced' ),
            'edit_item'             => __( 'Edit Team Member', 'strata-advanced' ),
            'new_item'              => __( 'New Team Member', 'strata-advanced' ),
            'view_item'             => __( 'View Team Member', 'strata-advanced' ),
            'search_items'          => __( 'Search Team Members', 'strata-advanced' ),
            'not_found'             => __( 'No team members found', 'strata-advanced' ),
            'not_found_in_trash'    => __( 'No team members found in trash', 'strata-advanced' ),
            'all_items'             => __( 'All Team Members', 'strata-advanced' ),
        ];

        $args = [
            'labels'              => $labels,
            'public'              => true,
            'publicly_queryable'  => true,
            'show_ui'             => true,
            'show_in_menu'        => true,
            'show_in_rest'        => true,
            'query_var'           => true,
            'rewrite'             => [ 'slug' => 'team' ],
            'capability_type'     => 'post',
            'has_archive'         => true,
            'hierarchical'        => false,
            'menu_position'       => 6,
            'menu_icon'           => 'dashicons-groups',
            'supports'            => [ 'title', 'editor', 'thumbnail', 'excerpt', 'custom-fields' ],
            'taxonomies'          => [ 'team_department' ],
        ];

        register_post_type( 'team', $args );

        // Register department taxonomy
        register_taxonomy( 'team_department', 'team', [
            'label'        => __( 'Departments', 'strata-advanced' ),
            'hierarchical' => true,
            'show_in_rest' => true,
            'rewrite'      => [ 'slug' => 'department' ],
        ] );
    }

    /**
     * Register Testimonials post type
     */
    public function register_testimonials(): void {
        $labels = [
            'name'                  => __( 'Testimonials', 'strata-advanced' ),
            'singular_name'         => __( 'Testimonial', 'strata-advanced' ),
            'menu_name'             => __( 'Testimonials', 'strata-advanced' ),
            'add_new'               => __( 'Add New', 'strata-advanced' ),
            'add_new_item'          => __( 'Add New Testimonial', 'strata-advanced' ),
            'edit_item'             => __( 'Edit Testimonial', 'strata-advanced' ),
            'new_item'              => __( 'New Testimonial', 'strata-advanced' ),
            'view_item'             => __( 'View Testimonial', 'strata-advanced' ),
            'search_items'          => __( 'Search Testimonials', 'strata-advanced' ),
            'not_found'             => __( 'No testimonials found', 'strata-advanced' ),
            'not_found_in_trash'    => __( 'No testimonials found in trash', 'strata-advanced' ),
            'all_items'             => __( 'All Testimonials', 'strata-advanced' ),
        ];

        $args = [
            'labels'              => $labels,
            'public'              => true,
            'publicly_queryable'  => true,
            'show_ui'             => true,
            'show_in_menu'        => true,
            'show_in_rest'        => true,
            'query_var'           => true,
            'rewrite'             => [ 'slug' => 'testimonials' ],
            'capability_type'     => 'post',
            'has_archive'         => true,
            'hierarchical'        => false,
            'menu_position'       => 7,
            'menu_icon'           => 'dashicons-format-quote',
            'supports'            => [ 'title', 'editor', 'thumbnail', 'custom-fields' ],
        ];

        register_post_type( 'testimonial', $args );
    }

    /**
     * Register Case Studies post type
     */
    public function register_case_studies(): void {
        $labels = [
            'name'                  => __( 'Case Studies', 'strata-advanced' ),
            'singular_name'         => __( 'Case Study', 'strata-advanced' ),
            'menu_name'             => __( 'Case Studies', 'strata-advanced' ),
            'add_new'               => __( 'Add New', 'strata-advanced' ),
            'add_new_item'          => __( 'Add New Case Study', 'strata-advanced' ),
            'edit_item'             => __( 'Edit Case Study', 'strata-advanced' ),
            'new_item'              => __( 'New Case Study', 'strata-advanced' ),
            'view_item'             => __( 'View Case Study', 'strata-advanced' ),
            'search_items'          => __( 'Search Case Studies', 'strata-advanced' ),
            'not_found'             => __( 'No case studies found', 'strata-advanced' ),
            'not_found_in_trash'    => __( 'No case studies found in trash', 'strata-advanced' ),
            'all_items'             => __( 'All Case Studies', 'strata-advanced' ),
            'archives'              => __( 'Case Study Archives', 'strata-advanced' ),
        ];

        $args = [
            'labels'              => $labels,
            'public'              => true,
            'publicly_queryable'  => true,
            'show_ui'             => true,
            'show_in_menu'        => true,
            'show_in_rest'        => true,
            'query_var'           => true,
            'rewrite'             => [ 'slug' => 'case-studies' ],
            'capability_type'     => 'post',
            'has_archive'         => true,
            'hierarchical'        => false,
            'menu_position'       => 8,
            'menu_icon'           => 'dashicons-analytics',
            'supports'            => [ 'title', 'editor', 'thumbnail', 'excerpt', 'custom-fields' ],
            'taxonomies'          => [ 'case_study_industry', 'case_study_service' ],
        ];

        register_post_type( 'case_study', $args );

        // Register custom taxonomies
        register_taxonomy( 'case_study_industry', 'case_study', [
            'label'        => __( 'Industries', 'strata-advanced' ),
            'hierarchical' => true,
            'show_in_rest' => true,
            'rewrite'      => [ 'slug' => 'industry' ],
        ] );

        register_taxonomy( 'case_study_service', 'case_study', [
            'label'        => __( 'Services', 'strata-advanced' ),
            'hierarchical' => true,
            'show_in_rest' => true,
            'rewrite'      => [ 'slug' => 'service' ],
        ] );
    }
}
