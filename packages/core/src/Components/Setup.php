<?php
/**
 * Setup Component
 *
 * @package StrataWP
 */

namespace StrataWP\Components;

use StrataWP\ComponentInterface;

/**
 * Theme setup and configuration
 */
class Setup implements ComponentInterface {
	/**
	 * {@inheritdoc}
	 */
	public function get_slug(): string {
		return 'setup';
	}

	/**
	 * {@inheritdoc}
	 */
	public function initialize(): void {
		add_action( 'after_setup_theme', [ $this, 'setup_theme' ] );
		add_action( 'after_setup_theme', [ $this, 'setup_content_width' ] );
	}

	/**
	 * Setup theme features
	 */
	public function setup_theme(): void {
		// Text domain
		load_theme_textdomain( 'stratawp', get_template_directory() . '/languages' );

		// Editor styles
		add_theme_support( 'editor-styles' );
		add_editor_style( 'dist/css/editor.css' );

		// Post thumbnails
		add_theme_support( 'post-thumbnails' );

		// HTML5 support
		add_theme_support(
			'html5',
			[
				'search-form',
				'comment-form',
				'comment-list',
				'gallery',
				'caption',
				'style',
				'script',
			]
		);

		// Title tag
		add_theme_support( 'title-tag' );

		// Custom logo
		add_theme_support(
			'custom-logo',
			[
				'height'      => 250,
				'width'       => 250,
				'flex-width'  => true,
				'flex-height' => true,
			]
		);

		// Responsive embeds
		add_theme_support( 'responsive-embeds' );

		// Block styles
		add_theme_support( 'wp-block-styles' );

		// Wide alignment
		add_theme_support( 'align-wide' );
	}

	/**
	 * Set content width
	 */
	public function setup_content_width(): void {
		$GLOBALS['content_width'] = apply_filters( 'stratawp_content_width', 1200 );
	}
}
