<?php
/**
 * StrataWP Basic Theme
 *
 * A demonstration of the StrataWP framework in action.
 *
 * @package StrataBasic
 */

// Minimum PHP version check
if ( version_compare( PHP_VERSION, '8.1', '<' ) ) {
    wp_die(
        esc_html__( 'This theme requires PHP 8.1 or higher.', 'strata-basic' ),
        esc_html__( 'PHP Version Error', 'strata-basic' )
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

/**
 * Initialize the theme
 */
function strata_basic_init(): void {
    // Create theme with custom components
    $theme = new Theme([
        new Setup(),
        new Assets(),
        new Blocks(),
        new Performance(),
        new Fonts(),
        new Navigation(),
        new Customizer(),
    ]);

    // Initialize theme
    $theme->initialize();

    // Store in global for easy access
    $GLOBALS['strata_basic_theme'] = $theme;
}

add_action( 'after_setup_theme', 'strata_basic_init', 1 );

/**
 * Get theme instance
 *
 * @return Theme
 */
function strata_basic(): Theme {
    return $GLOBALS['strata_basic_theme'] ?? Theme::instance();
}

/**
 * Check if Vite dev server is running
 */
function strata_basic_is_vite_running(): bool {
    static $is_running = null;

    if ( null !== $is_running ) {
        return $is_running;
    }

    if ( ! defined( 'WP_ENVIRONMENT_TYPE' ) || 'local' !== WP_ENVIRONMENT_TYPE ) {
        $is_running = false;
        return false;
    }

    // Check if Vite dev server is accessible
    $vite_server = 'http://localhost:3000';
    $response = wp_remote_get( $vite_server . '/@vite/client', [
        'timeout' => 1,
        'sslverify' => false,
    ] );

    $is_running = ! is_wp_error( $response ) && wp_remote_retrieve_response_code( $response ) === 200;
    return $is_running;
}

/**
 * Load Vite dev server in development
 */
function strata_basic_vite_dev_server(): void {
    if ( ! strata_basic_is_vite_running() ) {
        return;
    }

    // Inject Vite client and main entry for HMR
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

add_action( 'wp_head', 'strata_basic_vite_dev_server', 1 );

/**
 * Prevent loading compiled assets when Vite dev server is running
 */
function strata_basic_maybe_dequeue_assets(): void {
    if ( strata_basic_is_vite_running() ) {
        // Dequeue compiled assets since Vite will serve them
        wp_dequeue_style( 'stratawp-styles' );
        wp_dequeue_script( 'stratawp-main' );
    }
}

add_action( 'wp_enqueue_scripts', 'strata_basic_maybe_dequeue_assets', 999 );

/**
 * Theme activation
 */
function strata_basic_activate(): void {
    // Set default theme mods
    if ( ! get_theme_mod( 'strata_basic_setup_complete' ) ) {
        set_theme_mod( 'strata_basic_setup_complete', true );

        // Flush rewrite rules
        flush_rewrite_rules();
    }
}

add_action( 'after_switch_theme', 'strata_basic_activate' );
