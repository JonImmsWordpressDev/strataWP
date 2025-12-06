<?php
/**
 * Navigation Component
 *
 * @package StrataBasic
 */

namespace StrataBasic\Components;

use StrataWP\ComponentInterface;

/**
 * Navigation menus and walker
 */
class Navigation implements ComponentInterface {
    /**
     * {@inheritdoc}
     */
    public function get_slug(): string {
        return 'navigation';
    }

    /**
     * {@inheritdoc}
     */
    public function initialize(): void {
        add_action( 'after_setup_theme', [ $this, 'register_menus' ] );
    }

    /**
     * Register navigation menus
     */
    public function register_menus(): void {
        register_nav_menus([
            'primary' => __( 'Primary Menu', 'strata-basic' ),
            'footer'  => __( 'Footer Menu', 'strata-basic' ),
        ]);
    }
}
