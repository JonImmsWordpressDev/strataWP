<?php
/**
 * Assets Component
 *
 * @package StrataWP
 */

namespace StrataWP\Components;

use StrataWP\ComponentInterface;

/**
 * Asset management for Vite-built assets and web fonts
 */
class Assets implements ComponentInterface {
	/**
	 * Vite manifest
	 *
	 * @var array|null
	 */
	protected ?array $manifest = null;

	/**
	 * Google Fonts to load
	 *
	 * @var array
	 */
	protected array $google_fonts = [];

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
		add_action( 'wp_head', [ $this, 'add_font_preconnect' ], 1 );
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_assets' ] );
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_fonts' ] );
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
			$this->enqueue_from_manifest( 'stratawp-main', 'src/js/main.ts' );
		}

		// Enqueue main theme styles
		if ( isset( $manifest['src/css/main.css'] ) ) {
			$this->enqueue_from_manifest( 'stratawp-styles', 'src/css/main.css', 'style' );
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

		$this->enqueue_from_manifest( 'stratawp-editor', 'src/css/editor.css', 'style' );
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

	/**
	 * Add preconnect hints for Google Fonts
	 */
	public function add_font_preconnect(): void {
		if ( empty( $this->google_fonts ) ) {
			return;
		}

		echo '<link rel="preconnect" href="https://fonts.googleapis.com">' . "\n";
		echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' . "\n";
	}

	/**
	 * Enqueue Google Fonts
	 */
	public function enqueue_fonts(): void {
		if ( empty( $this->google_fonts ) ) {
			return;
		}

		$font_url = $this->build_google_fonts_url();

		if ( $font_url ) {
			wp_enqueue_style(
				'stratawp-fonts',
				$font_url,
				[],
				null // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion
			);
		}
	}

	/**
	 * Build Google Fonts URL
	 *
	 * @return string|false
	 */
	protected function build_google_fonts_url() {
		if ( empty( $this->google_fonts ) ) {
			return false;
		}

		$families = implode( '&family=', $this->google_fonts );

		return add_query_arg(
			[
				'family'  => $families,
				'display' => 'swap',
			],
			'https://fonts.googleapis.com/css2'
		);
	}

	/**
	 * Set Google Fonts to load
	 *
	 * @param array $fonts Array of font strings (e.g., ['Inter:wght@400;700']).
	 * @return self
	 */
	public function set_google_fonts( array $fonts ): self {
		$this->google_fonts = $fonts;
		return $this;
	}

	/**
	 * Add a Google Font
	 *
	 * @param string $font Font string (e.g., 'Inter:wght@400;700').
	 * @return self
	 */
	public function add_google_font( string $font ): self {
		if ( ! in_array( $font, $this->google_fonts, true ) ) {
			$this->google_fonts[] = $font;
		}
		return $this;
	}
}

