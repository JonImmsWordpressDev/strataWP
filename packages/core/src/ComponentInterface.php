<?php
/**
 * Component Interface
 *
 * @package WPForge
 */

namespace WPForge;

/**
 * Interface for theme components
 *
 * All theme components must implement this interface
 */
interface ComponentInterface {
	/**
	 * Get component slug
	 *
	 * @return string Component identifier
	 */
	public function get_slug(): string;

	/**
	 * Initialize component
	 *
	 * Hook into WordPress actions and filters
	 */
	public function initialize(): void;
}
