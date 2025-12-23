<?php
/**
 * StrataWP Advanced Theme
 *
 * An advanced theme with custom post types and extended functionality.
 *
 * @package StrataAdvanced
 */

// Minimum PHP version check
if ( version_compare( PHP_VERSION, '8.1', '<' ) ) {
    wp_die(
        esc_html__( 'This theme requires PHP 8.1 or higher.', 'strata-advanced' ),
        esc_html__( 'PHP Version Error', 'strata-advanced' )
    );
}

// Load Composer autoloader
require_once __DIR__ . '/vendor/autoload.php';

use StrataWP\Theme;
use StrataWP\Components\Setup;
use StrataWP\Components\Assets;
use StrataWP\Components\Blocks;
use StrataWP\Components\Performance;
use StrataWP\Components\Fonts;
use StrataBasic\Components\Navigation;
use StrataBasic\Components\Customizer;
use StrataBasic\Components\CustomPostTypes;
use StrataBasic\Components\AdvancedLayouts;
use StrataBasic\Components\MetaBoxes;

/**
 * Initialize the theme
 */
function strata_advanced_init(): void {
    // Create theme with custom components
    $theme = new Theme([
        new Setup(),
        new Assets(),
        new Blocks(),
        new Performance(),
        new Fonts(),
        new Navigation(),
        new Customizer(),
        new CustomPostTypes(),
        new AdvancedLayouts(),
        new MetaBoxes(),
    ]);

    // Initialize theme
    $theme->initialize();

    // Store in global for easy access
    $GLOBALS['strata_advanced_theme'] = $theme;
}

add_action( 'after_setup_theme', 'strata_advanced_init', 1 );

/**
 * Get theme instance
 *
 * @return Theme
 */
function strata_advanced(): Theme {
    return $GLOBALS['strata_advanced_theme'] ?? Theme::instance();
}

/**
 * Load Vite dev server in development
 */
function strata_advanced_vite_dev_server(): void {
    if ( ! defined( 'WP_ENVIRONMENT_TYPE' ) || 'local' !== WP_ENVIRONMENT_TYPE ) {
        return;
    }

    // In local development, always inject Vite client
    // Browser will connect to localhost:3000
    $vite_server = 'http://localhost:3000';

    echo sprintf(
        '<script type="module" src="%s/@vite/client"></script>',
        esc_url( $vite_server )
    );
    echo sprintf(
        '<script type="module" src="%s/src/js/main.ts"></script>',
        esc_url( $vite_server )
    );
}

add_action( 'wp_head', 'strata_advanced_vite_dev_server', 1 );

/**
 * Theme activation
 */
function strata_advanced_activate(): void {
    // Set default theme mods
    if ( ! get_theme_mod( 'strata_advanced_setup_complete' ) ) {
        set_theme_mod( 'strata_advanced_setup_complete', true );

        // Flush rewrite rules to register custom post types
        flush_rewrite_rules();
    }
}

add_action( 'after_switch_theme', 'strata_advanced_activate' );
