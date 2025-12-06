<?php
/**
 * Template Tags Class
 *
 * @package StrataWP
 */

namespace StrataWP;

use BadMethodCallException;

/**
 * Template tags entry point
 *
 * Provides access to all template tag methods from components
 */
class TemplateTags {
	/**
	 * Template tags
	 *
	 * @var array<string, callable>
	 */
	protected array $tags = [];

	/**
	 * Constructor
	 *
	 * @param TemplatingComponentInterface[] $components Templating components.
	 */
	public function __construct( array $components ) {
		foreach ( $components as $component ) {
			$this->register_component_tags( $component );
		}
	}

	/**
	 * Register template tags from a component
	 *
	 * @param TemplatingComponentInterface $component Component.
	 */
	protected function register_component_tags( TemplatingComponentInterface $component ): void {
		foreach ( $component->template_tags() as $method => $callback ) {
			if ( isset( $this->tags[ $method ] ) ) {
				_doing_it_wrong(
					__METHOD__,
					sprintf(
						'Template tag "%s" is already registered',
						esc_html( $method )
					),
					'1.0.0'
				);
				continue;
			}

			$this->tags[ $method ] = $callback;
		}
	}

	/**
	 * Magic method to call template tags
	 *
	 * @param string $method Method name.
	 * @param array  $args   Arguments.
	 * @return mixed
	 * @throws BadMethodCallException If method doesn't exist.
	 */
	public function __call( string $method, array $args ) {
		if ( ! isset( $this->tags[ $method ] ) ) {
			throw new BadMethodCallException(
				sprintf( 'Template tag "%s" does not exist', $method )
			);
		}

		return call_user_func_array( $this->tags[ $method ], $args );
	}
}
