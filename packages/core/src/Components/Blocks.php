<?php
/**
 * Blocks Component
 *
 * @package WPForge
 */

namespace WPForge\Components;

use WPForge\ComponentInterface;

/**
 * Block registration and management
 */
class Blocks implements ComponentInterface {
	/**
	 * {@inheritdoc}
	 */
	public function get_slug(): string {
		return 'blocks';
	}

	/**
	 * {@inheritdoc}
	 */
	public function initialize(): void {
		add_action( 'init', [ $this, 'register_blocks' ] );
	}

	/**
	 * Register blocks
	 *
	 * Loads auto-generated block registration from Vite plugin
	 */
	public function register_blocks(): void {
		$blocks_file = get_template_directory() . '/inc/blocks-generated.php';

		if ( file_exists( $blocks_file ) ) {
			require_once $blocks_file;
		}
	}
}
