<?php
/**
 * Plugin Name:       StrataWP Advanced Content
 * Plugin URI:        https://github.com/JonImmsWordpressDev/StrataWP
 * Description:       Portfolio, team, testimonial and case-study content types for the StrataWP Advanced theme.
 * Version:           1.0.0
 * Requires at least: 6.5
 * Requires PHP:      8.1
 * Author:            Jon Imms
 * License:           GPL-3.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-3.0.html
 * Text Domain:       strata-advanced-content
 *
 * @package StrataAdvancedContent
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register Portfolio post type
 */
function strata_advanced_content_register_portfolio(): void {
	$labels = array(
		'name'               => __( 'Portfolio', 'strata-advanced-content' ),
		'singular_name'      => __( 'Portfolio Item', 'strata-advanced-content' ),
		'menu_name'          => __( 'Portfolio', 'strata-advanced-content' ),
		'add_new'            => __( 'Add New', 'strata-advanced-content' ),
		'add_new_item'       => __( 'Add New Portfolio Item', 'strata-advanced-content' ),
		'edit_item'          => __( 'Edit Portfolio Item', 'strata-advanced-content' ),
		'new_item'           => __( 'New Portfolio Item', 'strata-advanced-content' ),
		'view_item'          => __( 'View Portfolio Item', 'strata-advanced-content' ),
		'search_items'       => __( 'Search Portfolio', 'strata-advanced-content' ),
		'not_found'          => __( 'No portfolio items found', 'strata-advanced-content' ),
		'not_found_in_trash' => __( 'No portfolio items found in trash', 'strata-advanced-content' ),
		'all_items'          => __( 'All Portfolio Items', 'strata-advanced-content' ),
		'archives'           => __( 'Portfolio Archives', 'strata-advanced-content' ),
	);

	$args = array(
		'labels'             => $labels,
		'public'             => true,
		'publicly_queryable' => true,
		'show_ui'            => true,
		'show_in_menu'       => true,
		'show_in_rest'       => true,
		'query_var'          => true,
		'rewrite'            => array( 'slug' => 'portfolio' ),
		'capability_type'    => 'post',
		'has_archive'        => true,
		'hierarchical'       => false,
		'menu_position'      => 5,
		'menu_icon'          => 'dashicons-portfolio',
		'supports'           => array( 'title', 'editor', 'thumbnail', 'excerpt', 'custom-fields' ),
		'taxonomies'         => array( 'portfolio_category', 'portfolio_tag' ),
	);

	register_post_type( 'portfolio', $args );

	// Register custom taxonomies
	register_taxonomy(
		'portfolio_category',
		'portfolio',
		array(
			'label'        => __( 'Portfolio Categories', 'strata-advanced-content' ),
			'hierarchical' => true,
			'show_in_rest' => true,
			'rewrite'      => array( 'slug' => 'portfolio-category' ),
		)
	);

	register_taxonomy(
		'portfolio_tag',
		'portfolio',
		array(
			'label'        => __( 'Portfolio Tags', 'strata-advanced-content' ),
			'hierarchical' => false,
			'show_in_rest' => true,
			'rewrite'      => array( 'slug' => 'portfolio-tag' ),
		)
	);
}

/**
 * Register Team Members post type
 */
function strata_advanced_content_register_team(): void {
	$labels = array(
		'name'               => __( 'Team Members', 'strata-advanced-content' ),
		'singular_name'      => __( 'Team Member', 'strata-advanced-content' ),
		'menu_name'          => __( 'Team', 'strata-advanced-content' ),
		'add_new'            => __( 'Add New', 'strata-advanced-content' ),
		'add_new_item'       => __( 'Add New Team Member', 'strata-advanced-content' ),
		'edit_item'          => __( 'Edit Team Member', 'strata-advanced-content' ),
		'new_item'           => __( 'New Team Member', 'strata-advanced-content' ),
		'view_item'          => __( 'View Team Member', 'strata-advanced-content' ),
		'search_items'       => __( 'Search Team Members', 'strata-advanced-content' ),
		'not_found'          => __( 'No team members found', 'strata-advanced-content' ),
		'not_found_in_trash' => __( 'No team members found in trash', 'strata-advanced-content' ),
		'all_items'          => __( 'All Team Members', 'strata-advanced-content' ),
	);

	$args = array(
		'labels'             => $labels,
		'public'             => true,
		'publicly_queryable' => true,
		'show_ui'            => true,
		'show_in_menu'       => true,
		'show_in_rest'       => true,
		'query_var'          => true,
		'rewrite'            => array( 'slug' => 'team' ),
		'capability_type'    => 'post',
		'has_archive'        => true,
		'hierarchical'       => false,
		'menu_position'      => 6,
		'menu_icon'          => 'dashicons-groups',
		'supports'           => array( 'title', 'editor', 'thumbnail', 'excerpt', 'custom-fields' ),
		'taxonomies'         => array( 'team_department' ),
	);

	register_post_type( 'team', $args );

	// Register department taxonomy
	register_taxonomy(
		'team_department',
		'team',
		array(
			'label'        => __( 'Departments', 'strata-advanced-content' ),
			'hierarchical' => true,
			'show_in_rest' => true,
			'rewrite'      => array( 'slug' => 'department' ),
		)
	);
}

/**
 * Register Testimonials post type
 */
function strata_advanced_content_register_testimonials(): void {
	$labels = array(
		'name'               => __( 'Testimonials', 'strata-advanced-content' ),
		'singular_name'      => __( 'Testimonial', 'strata-advanced-content' ),
		'menu_name'          => __( 'Testimonials', 'strata-advanced-content' ),
		'add_new'            => __( 'Add New', 'strata-advanced-content' ),
		'add_new_item'       => __( 'Add New Testimonial', 'strata-advanced-content' ),
		'edit_item'          => __( 'Edit Testimonial', 'strata-advanced-content' ),
		'new_item'           => __( 'New Testimonial', 'strata-advanced-content' ),
		'view_item'          => __( 'View Testimonial', 'strata-advanced-content' ),
		'search_items'       => __( 'Search Testimonials', 'strata-advanced-content' ),
		'not_found'          => __( 'No testimonials found', 'strata-advanced-content' ),
		'not_found_in_trash' => __( 'No testimonials found in trash', 'strata-advanced-content' ),
		'all_items'          => __( 'All Testimonials', 'strata-advanced-content' ),
	);

	$args = array(
		'labels'             => $labels,
		'public'             => true,
		'publicly_queryable' => true,
		'show_ui'            => true,
		'show_in_menu'       => true,
		'show_in_rest'       => true,
		'query_var'          => true,
		'rewrite'            => array( 'slug' => 'testimonials' ),
		'capability_type'    => 'post',
		'has_archive'        => true,
		'hierarchical'       => false,
		'menu_position'      => 7,
		'menu_icon'          => 'dashicons-format-quote',
		'supports'           => array( 'title', 'editor', 'thumbnail', 'custom-fields' ),
	);

	register_post_type( 'testimonial', $args );
}

/**
 * Register Case Studies post type
 */
function strata_advanced_content_register_case_studies(): void {
	$labels = array(
		'name'               => __( 'Case Studies', 'strata-advanced-content' ),
		'singular_name'      => __( 'Case Study', 'strata-advanced-content' ),
		'menu_name'          => __( 'Case Studies', 'strata-advanced-content' ),
		'add_new'            => __( 'Add New', 'strata-advanced-content' ),
		'add_new_item'       => __( 'Add New Case Study', 'strata-advanced-content' ),
		'edit_item'          => __( 'Edit Case Study', 'strata-advanced-content' ),
		'new_item'           => __( 'New Case Study', 'strata-advanced-content' ),
		'view_item'          => __( 'View Case Study', 'strata-advanced-content' ),
		'search_items'       => __( 'Search Case Studies', 'strata-advanced-content' ),
		'not_found'          => __( 'No case studies found', 'strata-advanced-content' ),
		'not_found_in_trash' => __( 'No case studies found in trash', 'strata-advanced-content' ),
		'all_items'          => __( 'All Case Studies', 'strata-advanced-content' ),
		'archives'           => __( 'Case Study Archives', 'strata-advanced-content' ),
	);

	$args = array(
		'labels'             => $labels,
		'public'             => true,
		'publicly_queryable' => true,
		'show_ui'            => true,
		'show_in_menu'       => true,
		'show_in_rest'       => true,
		'query_var'          => true,
		'rewrite'            => array( 'slug' => 'case-studies' ),
		'capability_type'    => 'post',
		'has_archive'        => true,
		'hierarchical'       => false,
		'menu_position'      => 8,
		'menu_icon'          => 'dashicons-analytics',
		'supports'           => array( 'title', 'editor', 'thumbnail', 'excerpt', 'custom-fields' ),
		'taxonomies'         => array( 'case_study_industry', 'case_study_service' ),
	);

	register_post_type( 'case_study', $args );

	// Register custom taxonomies
	register_taxonomy(
		'case_study_industry',
		'case_study',
		array(
			'label'        => __( 'Industries', 'strata-advanced-content' ),
			'hierarchical' => true,
			'show_in_rest' => true,
			'rewrite'      => array( 'slug' => 'industry' ),
		)
	);

	register_taxonomy(
		'case_study_service',
		'case_study',
		array(
			'label'        => __( 'Services', 'strata-advanced-content' ),
			'hierarchical' => true,
			'show_in_rest' => true,
			'rewrite'      => array( 'slug' => 'service' ),
		)
	);
}

/**
 * Register every content type and taxonomy.
 */
function strata_advanced_content_register(): void {
	strata_advanced_content_register_portfolio();
	strata_advanced_content_register_team();
	strata_advanced_content_register_testimonials();
	strata_advanced_content_register_case_studies();
}

add_action( 'init', 'strata_advanced_content_register' );

/**
 * Register the content types, then flush rewrite rules so their URLs resolve.
 */
function strata_advanced_content_activate(): void {
	strata_advanced_content_register();
	flush_rewrite_rules();
}

register_activation_hook( __FILE__, 'strata_advanced_content_activate' );

/**
 * Flush rewrite rules so the content type URLs are removed.
 */
function strata_advanced_content_deactivate(): void {
	flush_rewrite_rules();
}

register_deactivation_hook( __FILE__, 'strata_advanced_content_deactivate' );
