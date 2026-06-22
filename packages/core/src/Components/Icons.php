<?php
/**
 * Icons Component
 *
 * Manages icon font loading and provides template tag helpers for rendering icons.
 * Auto-detects icon CSS files in dist/icons/ (production) or src/icons/ (dev).
 * Parses .flaticon-* class names from CSS to build an icon list.
 *
 * @package StrataWP
 */

namespace StrataWP\Components;

use StrataWP\ComponentInterface;
use StrataWP\TemplatingComponentInterface;

/**
 * Icon Font Management Component
 */
class Icons implements ComponentInterface, TemplatingComponentInterface {

	/**
	 * Custom CSS file path (relative to theme root)
	 *
	 * @var string
	 */
	protected string $css_path;

	/**
	 * Cached list of icon names parsed from CSS
	 *
	 * @var string[]|null
	 */
	protected ?array $icon_list = null;

	/**
	 * Constructor
	 *
	 * @param string $css_path Optional custom CSS file path relative to theme root.
	 */
	public function __construct( string $css_path = '' ) {
		$this->css_path = $css_path;
	}

	/**
	 * {@inheritdoc}
	 */
	public function get_slug(): string {
		return 'icons';
	}

	/**
	 * {@inheritdoc}
	 */
	public function initialize(): void {
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_icon_styles' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_icon_styles' ) );
	}

	/**
	 * {@inheritdoc}
	 *
	 * @return array<string, callable>
	 */
	public function template_tags(): array {
		return array(
			'icon'      => array( $this, 'render' ),
			'get_icon'  => array( $this, 'get' ),
			'icon_list' => array( $this, 'get_icon_list' ),
		);
	}

	/**
	 * Render an icon (echoes HTML)
	 *
	 * @param string $name Icon name (without flaticon- prefix).
	 * @param array  $args {
	 *     Optional. Icon rendering arguments.
	 *
	 *     @type string $size       Icon size: sm, md, lg, xl. Default empty.
	 *     @type string $class      Additional CSS classes. Default empty.
	 *     @type string $aria-label Accessible label. If provided, uses role="img". Default empty.
	 * }
	 */
	public function render( string $name, array $args = array() ): void {
		echo $this->get( $name, $args ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	/**
	 * Get icon HTML markup
	 *
	 * @param string $name Icon name (without flaticon- prefix).
	 * @param array  $args {
	 *     Optional. Icon rendering arguments.
	 *
	 *     @type string $size       Icon size: sm, md, lg, xl. Default empty.
	 *     @type string $class      Additional CSS classes. Default empty.
	 *     @type string $aria-label Accessible label. If provided, uses role="img". Default empty.
	 * }
	 * @return string Icon HTML markup.
	 */
	public function get( string $name, array $args = array() ): string {
		$defaults = array(
			'size'       => '',
			'class'      => '',
			'aria-label' => '',
		);

		$args = wp_parse_args( $args, $defaults );

		// Build CSS classes.
		$classes = array( 'flaticon-' . sanitize_html_class( $name ) );

		$valid_sizes = array( 'sm', 'md', 'lg', 'xl' );
		if ( ! empty( $args['size'] ) && in_array( $args['size'], $valid_sizes, true ) ) {
			$classes[] = 'strata-icon--' . $args['size'];
		}

		if ( ! empty( $args['class'] ) ) {
			$extra_classes = explode( ' ', $args['class'] );
			foreach ( $extra_classes as $extra_class ) {
				$sanitized = sanitize_html_class( $extra_class );
				if ( ! empty( $sanitized ) ) {
					$classes[] = $sanitized;
				}
			}
		}

		$class_attr = esc_attr( implode( ' ', $classes ) );

		// Build accessibility attributes.
		if ( ! empty( $args['aria-label'] ) ) {
			$aria_label = esc_attr( $args['aria-label'] );
			return sprintf(
				'<i class="%s" role="img" aria-label="%s"></i>',
				$class_attr,
				$aria_label
			);
		}

		return sprintf(
			'<i class="%s" aria-hidden="true"></i>',
			$class_attr
		);
	}

	/**
	 * Get list of available icon names
	 *
	 * Parses the icon CSS file for .flaticon-* class names.
	 * Results are cached for the duration of the request.
	 *
	 * @return string[] Array of icon names (without flaticon- prefix).
	 */
	public function get_icon_list(): array {
		if ( null !== $this->icon_list ) {
			return $this->icon_list;
		}

		$this->icon_list = array();

		$css_file = $this->get_css_file_path();

		if ( empty( $css_file ) || ! file_exists( $css_file ) ) {
			return $this->icon_list;
		}

		$css_content = file_get_contents( $css_file ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents

		if ( false === $css_content ) {
			return $this->icon_list;
		}

		// Match .flaticon-{name} class selectors.
		if ( preg_match_all( '/\.flaticon-([a-zA-Z0-9_-]+)/', $css_content, $matches ) ) {
			$this->icon_list = array_unique( $matches[1] );
			sort( $this->icon_list );
		}

		return $this->icon_list;
	}

	/**
	 * Enqueue icon font stylesheet and inline size utilities
	 */
	public function enqueue_icon_styles(): void {
		$css_url = $this->get_css_url();

		if ( empty( $css_url ) ) {
			return;
		}

		$css_file = $this->get_css_file_path();
		$version  = ! empty( $css_file ) && file_exists( $css_file ) ? filemtime( $css_file ) : '1.0.0';

		wp_enqueue_style( 'stratawp-icons', $css_url, array(), $version );

		// Add inline size utility classes.
		$size_css = $this->get_size_utilities_css();
		wp_add_inline_style( 'stratawp-icons', $size_css );
	}

	/**
	 * Get the URL to the icon CSS file
	 *
	 * @return string CSS file URL, or empty string if not found.
	 */
	protected function get_css_url(): string {
		if ( ! empty( $this->css_path ) ) {
			$full_path = get_template_directory() . '/' . ltrim( $this->css_path, '/' );
			if ( file_exists( $full_path ) ) {
				return get_template_directory_uri() . '/' . ltrim( $this->css_path, '/' );
			}
			return '';
		}

		// Auto-detect: check dist/ first (production), then src/ (development).
		$candidates = array(
			'dist/icons/flaticon.css',
			'src/icons/flaticon.css',
		);

		foreach ( $candidates as $candidate ) {
			$full_path = get_template_directory() . '/' . $candidate;
			if ( file_exists( $full_path ) ) {
				return get_template_directory_uri() . '/' . $candidate;
			}
		}

		return '';
	}

	/**
	 * Get the filesystem path to the icon CSS file
	 *
	 * @return string CSS file path, or empty string if not found.
	 */
	protected function get_css_file_path(): string {
		if ( ! empty( $this->css_path ) ) {
			$full_path = get_template_directory() . '/' . ltrim( $this->css_path, '/' );
			if ( file_exists( $full_path ) ) {
				return $full_path;
			}
			return '';
		}

		// Auto-detect: check dist/ first (production), then src/ (development).
		$candidates = array(
			'dist/icons/flaticon.css',
			'src/icons/flaticon.css',
		);

		foreach ( $candidates as $candidate ) {
			$full_path = get_template_directory() . '/' . $candidate;
			if ( file_exists( $full_path ) ) {
				return $full_path;
			}
		}

		return '';
	}

	/**
	 * Get inline CSS for icon size utility classes
	 *
	 * @return string CSS string with size utility rules.
	 */
	protected function get_size_utilities_css(): string {
		return <<<CSS
.strata-icon--sm { font-size: 0.875rem; }
.strata-icon--md { font-size: 1.25rem; }
.strata-icon--lg { font-size: 1.75rem; }
.strata-icon--xl { font-size: 2.5rem; }
CSS;
	}
}
