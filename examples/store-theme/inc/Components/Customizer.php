<?php
/**
 * Customizer Component
 *
 * @package StrataBasic
 */

namespace StrataBasic\Components;

use StrataWP\ComponentInterface;
use WP_Customize_Manager;

/**
 * Theme Customizer settings
 */
class Customizer implements ComponentInterface {
	/**
	 * {@inheritdoc}
	 */
	public function get_slug(): string {
		return 'customizer';
	}

	/**
	 * {@inheritdoc}
	 */
	public function initialize(): void {
		add_action( 'customize_register', array( $this, 'register_settings' ) );
	}

	/**
	 * Register customizer settings
	 *
	 * @param WP_Customize_Manager $wp_customize Customizer manager.
	 */
	public function register_settings( WP_Customize_Manager $wp_customize ): void {
		// Add theme section
		$wp_customize->add_section(
			'strata_basic_theme_options',
			array(
				'title'    => __( 'Theme Options', 'strata-store' ),
				'priority' => 30,
			)
		);

		// Header text color
		$wp_customize->add_setting(
			'strata_basic_header_color',
			array(
				'default'           => '#000000',
				'sanitize_callback' => 'sanitize_hex_color',
				'transport'         => 'postMessage',
			)
		);

		$wp_customize->add_control(
			new \WP_Customize_Color_Control(
				$wp_customize,
				'strata_basic_header_color',
				array(
					'label'   => __( 'Header Text Color', 'strata-store' ),
					'section' => 'strata_basic_theme_options',
				)
			)
		);

		// Show/hide tagline
		$wp_customize->add_setting(
			'strata_basic_show_tagline',
			array(
				'default'           => true,
				'sanitize_callback' => 'wp_validate_boolean',
			)
		);

		$wp_customize->add_control(
			'strata_basic_show_tagline',
			array(
				'label'   => __( 'Show Site Tagline', 'strata-store' ),
				'section' => 'strata_basic_theme_options',
				'type'    => 'checkbox',
			)
		);
	}
}
