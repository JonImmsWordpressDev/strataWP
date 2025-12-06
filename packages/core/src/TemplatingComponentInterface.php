<?php
/**
 * Templating Component Interface
 *
 * @package StrataWP
 */

namespace StrataWP;

/**
 * Interface for components that provide template tags
 */
interface TemplatingComponentInterface extends ComponentInterface {
	/**
	 * Get template tags
	 *
	 * @return array<string, callable> Template tag methods
	 */
	public function template_tags(): array;
}
