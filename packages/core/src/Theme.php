<?php
/**
 * Main Theme Class
 *
 * @package StrataWP
 */

namespace StrataWP;

use InvalidArgumentException;

/**
 * Main theme class for StrataWP
 *
 * Manages theme initialization, components, and template tags.
 */
class Theme {
	/**
	 * Theme components
	 *
	 * @var ComponentInterface[]
	 */
	protected array $components = [];

	/**
	 * Template tags instance
	 *
	 * @var TemplateTags
	 */
	protected TemplateTags $template_tags;

	/**
	 * Theme instance
	 *
	 * @var Theme|null
	 */
	private static ?Theme $instance = null;

	/**
	 * Constructor
	 *
	 * @param ComponentInterface[] $components Theme components.
	 */
	public function __construct( array $components = [] ) {
		if ( empty( $components ) ) {
			$components = $this->get_default_components();
		}

		// Validate and register components
		foreach ( $components as $component ) {
			if ( ! $component instanceof ComponentInterface ) {
				throw new InvalidArgumentException(
					sprintf(
						'Component must implement ComponentInterface, %s given',
						get_class( $component )
					)
				);
			}

			$this->components[ $component->get_slug() ] = $component;
		}

		// Initialize template tags
		$templating_components = array_filter(
			$this->components,
			fn( $component ) => $component instanceof TemplatingComponentInterface
		);

		$this->template_tags = new TemplateTags( $templating_components );

		self::$instance = $this;
	}

	/**
	 * Get theme instance
	 *
	 * @return Theme
	 */
	public static function instance(): Theme {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Initialize the theme
	 *
	 * Hooks all components into WordPress
	 */
	public function initialize(): void {
		foreach ( $this->components as $component ) {
			$component->initialize();
		}

		/**
		 * Fires after theme initialization
		 *
		 * @param Theme $theme Theme instance
		 */
		do_action( 'stratawp_initialized', $this );
	}

	/**
	 * Get template tags
	 *
	 * @return TemplateTags
	 */
	public function template_tags(): TemplateTags {
		return $this->template_tags;
	}

	/**
	 * Get a component by slug
	 *
	 * @param string $slug Component slug.
	 * @return ComponentInterface
	 * @throws InvalidArgumentException If component doesn't exist.
	 */
	public function component( string $slug ): ComponentInterface {
		if ( ! isset( $this->components[ $slug ] ) ) {
			throw new InvalidArgumentException(
				sprintf( 'Component "%s" not found', $slug )
			);
		}

		return $this->components[ $slug ];
	}

	/**
	 * Get all components
	 *
	 * @return ComponentInterface[]
	 */
	public function components(): array {
		return $this->components;
	}

	/**
	 * Get default theme components
	 *
	 * @return ComponentInterface[]
	 */
	protected function get_default_components(): array {
		return [
			new Components\Setup(),
			new Components\Assets(),
			new Components\Blocks(),
			new Components\Performance(),
		];
	}
}
