<?php
/**
 * Assets Component
 *
 * @package WPForge
 */

namespace WPForge\Components;

use WPForge\ComponentInterface;

/**
 * Asset management for Vite-built assets
 */
class Assets implements ComponentInterface {
	/**
	 * Vite manifest
	 *
	 * @var array|null
	 */
	protected ?array $manifest = null;

	/**
	 * {@inheritdoc}
	 */
	public function get_slug(): string {
		return 'assets';
	}

	/**
	 * {@inheritdoc}
	 */
	public function initialize(): void {
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_assets' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_editor_assets' ] );
	}

	/**
	 * Enqueue front-end assets
	 */
	public function enqueue_assets(): void {
		$manifest = $this->get_manifest();

		if ( ! $manifest ) {
			return;
		}

		// Enqueue main theme script
		if ( isset( $manifest['src/js/main.ts'] ) ) {
			$this->enqueue_from_manifest( 'wp-forge-main', 'src/js/main.ts' );
		}

		// Enqueue main theme styles
		if ( isset( $manifest['src/css/main.css'] ) ) {
			$this->enqueue_from_manifest( 'wp-forge-styles', 'src/css/main.css', 'style' );
		}
	}

	/**
	 * Enqueue editor assets
	 */
	public function enqueue_editor_assets(): void {
		$manifest = $this->get_manifest();

		if ( ! $manifest || ! isset( $manifest['src/css/editor.css'] ) ) {
			return;
		}

		$this->enqueue_from_manifest( 'wp-forge-editor', 'src/css/editor.css', 'style' );
	}

	/**
	 * Enqueue asset from manifest
	 *
	 * @param string $handle Asset handle.
	 * @param string $src    Source path in manifest.
	 * @param string $type   Asset type (script|style).
	 */
	protected function enqueue_from_manifest( string $handle, string $src, string $type = 'script' ): void {
		$manifest = $this->get_manifest();

		if ( ! isset( $manifest[ $src ] ) ) {
			return;
		}

		$entry = $manifest[ $src ];
		$url   = get_template_directory_uri() . '/dist/' . $entry['file'];
		$path  = get_template_directory() . '/dist/' . $entry['file'];

		// Get version from file modification time
		$version = file_exists( $path ) ? filemtime( $path ) : '1.0.0';

		// Get WordPress dependencies
		$deps = $entry['dependencies'] ?? [];

		if ( 'script' === $type ) {
			wp_enqueue_script( $handle, $url, $deps, $version, true );
		} else {
			wp_enqueue_style( $handle, $url, $deps, $version );

			// Enqueue associated CSS files
			if ( ! empty( $entry['css'] ) ) {
				foreach ( $entry['css'] as $index => $css_file ) {
					$css_url = get_template_directory_uri() . '/dist/' . $css_file;
					wp_enqueue_style( $handle . '-' . $index, $css_url, [], $version );
				}
			}
		}
	}

	/**
	 * Get Vite manifest
	 *
	 * @return array|null
	 */
	protected function get_manifest(): ?array {
		if ( null !== $this->manifest ) {
			return $this->manifest;
		}

		$manifest_path = get_template_directory() . '/dist/.vite/manifest.json';

		if ( ! file_exists( $manifest_path ) ) {
			return null;
		}

		$manifest_content = file_get_contents( $manifest_path );
		$this->manifest   = json_decode( $manifest_content, true );

		return $this->manifest;
	}
}
