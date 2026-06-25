<?php
/**
 * Critical CSS Component
 *
 * Inlines above-the-fold critical CSS into <head> and makes the main
 * stylesheet non-render-blocking (rel=preload + onload swap). The async
 * swap only happens when critical CSS is present, so themes without a
 * generated critical file keep their render-blocking (FOUC-safe) stylesheet.
 *
 * Generate the critical file with the `extract-critical` tooling (beasties)
 * into the theme's dist/critical/critical.css.
 *
 * @package StrataWP
 */

namespace StrataWP\Components;

use StrataWP\ComponentInterface;

/**
 * Inline critical CSS and asynchronously load the full stylesheet.
 */
class CriticalCss implements ComponentInterface {
	/**
	 * Critical CSS path relative to the theme root.
	 *
	 * @var string
	 */
	protected string $critical_path;

	/**
	 * Constructor.
	 *
	 * @param string $critical_path Path to the critical CSS file, relative to the theme root.
	 */
	public function __construct( string $critical_path = 'dist/critical/critical.css' ) {
		$this->critical_path = $critical_path;
	}

	/**
	 * {@inheritdoc}
	 */
	public function get_slug(): string {
		return 'critical-css';
	}

	/**
	 * {@inheritdoc}
	 */
	public function initialize(): void {
		if ( ! apply_filters( 'stratawp_critical_css_enabled', true ) ) {
			return;
		}

		add_action( 'wp_head', array( $this, 'inline_critical_css' ), 2 );
		add_filter( 'style_loader_tag', array( $this, 'async_stylesheet' ), 10, 2 );
	}

	/**
	 * Absolute path to the critical CSS file.
	 *
	 * @return string
	 */
	protected function critical_file(): string {
		return get_template_directory() . '/' . ltrim( $this->critical_path, '/' );
	}

	/**
	 * Whether a non-empty critical CSS file exists.
	 *
	 * @return bool
	 */
	protected function has_critical(): bool {
		return file_exists( $this->critical_file() );
	}

	/**
	 * Inline the critical CSS into <head>.
	 */
	public function inline_critical_css(): void {
		if ( ! $this->has_critical() ) {
			return;
		}

		$css = file_get_contents( $this->critical_file() ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- reading a local build artifact.

		if ( false === $css || '' === trim( $css ) ) {
			return;
		}

		// $css is trusted, build-generated CSS; escaping it would corrupt it.
		echo '<style id="stratawp-critical-css">' . $css . '</style>' . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	/**
	 * Rewrite the main stylesheet link to load asynchronously.
	 *
	 * Only fires when critical CSS is present (otherwise the full stylesheet
	 * stays render-blocking to avoid a flash of unstyled content).
	 *
	 * @param string $tag    The <link> tag for the enqueued stylesheet.
	 * @param string $handle The stylesheet handle.
	 * @return string
	 */
	public function async_stylesheet( string $tag, string $handle ): string {
		if ( ! $this->has_critical() ) {
			return $tag;
		}

		$handles = apply_filters( 'stratawp_async_stylesheets', array( 'stratawp-main-0' ) );

		if ( ! in_array( $handle, $handles, true ) ) {
			return $tag;
		}

		if ( ! preg_match( '/href=([\'"])(.*?)\1/', $tag, $matches ) ) {
			return $tag;
		}

		$href = $matches[2];

		$preload = sprintf(
			'<link rel="preload" as="style" href="%s" onload="this.onload=null;this.rel=\'stylesheet\'">',
			esc_url( $href )
		);

		return $preload . '<noscript>' . $tag . '</noscript>';
	}
}
