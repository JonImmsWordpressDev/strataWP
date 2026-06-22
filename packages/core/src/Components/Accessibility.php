<?php
/**
 * Accessibility Component
 *
 * Provides accessibility enhancements inspired by WPRig:
 * - Skip link focus fix for older browsers
 * - aria-current="page" on navigation items
 * - Screen reader text CSS class
 *
 * @package StrataWP
 */

namespace StrataWP\Components;

use StrataWP\ComponentInterface;

/**
 * Accessibility enhancements
 */
class Accessibility implements ComponentInterface {
	/**
	 * {@inheritdoc}
	 */
	public function get_slug(): string {
		return 'accessibility';
	}

	/**
	 * {@inheritdoc}
	 */
	public function initialize(): void {
		add_action( 'wp_print_footer_scripts', array( $this, 'print_skip_link_focus_fix' ) );
		add_filter( 'nav_menu_link_attributes', array( $this, 'add_nav_aria_current' ), 10, 2 );
		add_filter( 'page_menu_link_attributes', array( $this, 'add_nav_aria_current' ), 10, 2 );
		add_action( 'wp_head', array( $this, 'print_screen_reader_styles' ), 5 );
	}

	/**
	 * Print skip link focus fix script
	 *
	 * Ensures skip links work correctly in IE/Edge by managing focus
	 * when the URL hash changes. Inlined to avoid an extra HTTP request.
	 */
	public function print_skip_link_focus_fix(): void {
		?>
		<script>
		/(trident|msie)/i.test(navigator.userAgent)&&document.getElementById&&window.addEventListener&&window.addEventListener("hashchange",function(){var t,e=location.hash.substring(1);/^[A-z0-9_-]+$/.test(e)&&(t=document.getElementById(e))&&(/^(?:a|select|input|button|textarea)$/i.test(t.tagName)||(t.tabIndex=-1),t.focus())},!1);
		</script>
		<?php
	}

	/**
	 * Add aria-current="page" to current navigation menu items
	 *
	 * @param array    $atts HTML attributes for the menu item link.
	 * @param \WP_Post $item The current menu item object.
	 * @return array
	 */
	public function add_nav_aria_current( array $atts, \WP_Post $item ): array {
		if ( in_array( 'current-menu-item', (array) $item->classes, true ) ) {
			$atts['aria-current'] = 'page';
		}

		return $atts;
	}

	/**
	 * Print screen reader text styles
	 *
	 * Outputs the .screen-reader-text utility class inline so it is
	 * available even before stylesheets load.
	 */
	public function print_screen_reader_styles(): void {
		?>
		<style>
		.screen-reader-text{border:0;clip:rect(1px,1px,1px,1px);clip-path:inset(50%);height:1px;margin:-1px;overflow:hidden;padding:0;position:absolute;width:1px;word-wrap:normal!important}
		.screen-reader-text:focus{background-color:#f1f1f1;border-radius:3px;box-shadow:0 0 2px 2px rgba(0,0,0,.6);clip:auto!important;clip-path:none;color:#21759b;display:block;font-size:.875rem;font-weight:700;height:auto;left:5px;line-height:normal;padding:15px 23px 14px;text-decoration:none;top:5px;width:auto;z-index:100000}
		</style>
		<?php
	}
}
