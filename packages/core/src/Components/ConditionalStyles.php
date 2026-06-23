<?php
/**
 * Conditional Styles Component
 *
 * Implements conditional CSS loading. Each stylesheet declares a preload
 * callback that determines whether it should load on the current page.
 * Matching sheets get <link rel="preload"> tags; non-matching ones load
 * asynchronously.
 *
 * @package StrataWP
 */

namespace StrataWP\Components;

use StrataWP\ComponentInterface;
use StrataWP\TemplatingComponentInterface;

/**
 * Conditional CSS loading with preload callbacks
 */
class ConditionalStyles implements ComponentInterface, TemplatingComponentInterface {
	/**
	 * {@inheritdoc}
	 */
	public function get_slug(): string {
		return 'conditional-styles';
	}

	/**
	 * {@inheritdoc}
	 */
	public function initialize(): void {
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_styles' ) );
		add_action( 'wp_head', array( $this, 'preload_styles' ), 2 );
	}

	/**
	 * {@inheritdoc}
	 */
	public function template_tags(): array {
		return array(
			'print_conditional_styles' => array( $this, 'print_preload_tags' ),
		);
	}

	/**
	 * Get conditional CSS files
	 *
	 * Each entry has:
	 * - 'file': path relative to the theme's dist/css/ directory
	 * - 'global': (bool) if true, always loaded as render-blocking CSS
	 * - 'preload_callback': (callable) returns true if the file should preload on this page
	 *
	 * Themes should filter 'stratawp_conditional_css_files' to register their own.
	 *
	 * @return array<string, array{file: string, global?: bool, preload_callback?: callable}>
	 */
	public function get_css_files(): array {
		$css_files = array(
			'stratawp-comments' => array(
				'file'             => 'comments.css',
				'preload_callback' => static function (): bool {
					return is_singular() && comments_open();
				},
			),
			'stratawp-sidebar'  => array(
				'file'             => 'sidebar.css',
				'preload_callback' => static function (): bool {
					return is_active_sidebar( 'sidebar-1' );
				},
			),
			'stratawp-widgets'  => array(
				'file'             => 'widgets.css',
				'preload_callback' => static function (): bool {
					return is_active_sidebar( 'sidebar-1' );
				},
			),
		);

		/**
		 * Filter conditional CSS files.
		 *
		 * @param array $css_files Associative array of handle => file config.
		 */
		$css_files = apply_filters( 'stratawp_conditional_css_files', $css_files );

		$normalized = array();
		foreach ( $css_files as $handle => $data ) {
			$normalized[ $handle ] = array_merge(
				array(
					'global'           => false,
					'preload_callback' => null,
				),
				$data
			);
		}

		return $normalized;
	}

	/**
	 * Enqueue conditional stylesheets
	 */
	public function enqueue_styles(): void {
		$css_files = $this->get_css_files();
		$css_dir   = get_template_directory() . '/dist/css/';
		$css_uri   = get_template_directory_uri() . '/dist/css/';

		foreach ( $css_files as $handle => $data ) {
			$file_path = $css_dir . $data['file'];

			if ( ! file_exists( $file_path ) ) {
				continue;
			}

			$version = (string) filemtime( $file_path );
			$src     = $css_uri . $data['file'];

			if ( ! empty( $data['global'] ) ) {
				wp_enqueue_style( $handle, $src, array(), $version );
			} else {
				// Register only; preload_styles() injects it asynchronously.
				wp_register_style( $handle, $src, array(), $version );
			}

			// 'precache' is a PWA service-worker convention, not in core stubs.
			// @phpstan-ignore-next-line
			wp_style_add_data( $handle, 'precache', true );
		}
	}

	/**
	 * Print preload tags for conditional styles
	 *
	 * Emits rel=preload as=style with onload swap + noscript fallback for
	 * stylesheets whose preload_callback returns true on this page.
	 */
	public function preload_styles(): void {
		if ( ! apply_filters( 'stratawp_preloading_styles_enabled', true ) ) {
			return;
		}

		$wp_styles = wp_styles();
		$css_files = $this->get_css_files();

		foreach ( $css_files as $handle => $data ) {
			if ( ! empty( $data['global'] ) ) {
				continue;
			}

			if ( ! isset( $data['preload_callback'] ) || ! is_callable( $data['preload_callback'] ) ) {
				continue;
			}

			if ( ! call_user_func( $data['preload_callback'] ) ) {
				continue;
			}

			if ( ! isset( $wp_styles->registered[ $handle ] ) ) {
				continue;
			}

			$href = $wp_styles->registered[ $handle ]->src . '?ver=' . $wp_styles->registered[ $handle ]->ver;

			printf(
				'<link rel="preload" id="%1$s-preload" href="%2$s" as="style" onload="this.rel=\'stylesheet\'">' . "\n",
				esc_attr( $handle ),
				esc_url( $href )
			);
			printf(
				'<noscript><link rel="stylesheet" href="%s"></noscript>' . "\n",
				esc_url( $href )
			);
		}
	}

	/**
	 * Print preload tags (template tag alias)
	 */
	public function print_preload_tags(): void {
		$this->preload_styles();
	}
}
