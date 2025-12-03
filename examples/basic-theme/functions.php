<?php
/**
 * WP-Forge Basic Theme
 *
 * A demonstration of the WP-Forge framework in action.
 *
 * @package ForgeBasic
 */

// Minimum PHP version check
if ( version_compare( PHP_VERSION, '8.1', '<' ) ) {
    wp_die(
        esc_html__( 'This theme requires PHP 8.1 or higher.', 'forge-basic' ),
        esc_html__( 'PHP Version Error', 'forge-basic' )
    );
}

// Load Composer autoloader
require_once __DIR__ . '/vendor/autoload.php';

use WPForge\Theme;
use WPForge\Components\Setup;
use WPForge\Components\Assets;
use WPForge\Components\Blocks;
use WPForge\Components\Performance;
use ForgeBasic\Components\Navigation;
use ForgeBasic\Components\Customizer;

/**
 * Initialize the theme
 */
function forge_basic_init(): void {
    // Create theme with custom components
    $assets = new Assets();

    $theme = new Theme([
        new Setup(),
        $assets,
        new Blocks(),
        new Performance(),
        new Navigation(),
        new Customizer(),
    ]);

    // Configure Google Fonts
    $assets->set_google_fonts([
        'Inter:wght@400;500;600;700',
        'Roboto:wght@300;400;500',
    ]);

    // Initialize theme
    $theme->initialize();

    // Store in global for easy access
    $GLOBALS['forge_basic_theme'] = $theme;
}

add_action( 'after_setup_theme', 'forge_basic_init', 1 );

/**
 * Get theme instance
 *
 * @return Theme
 */
function forge_basic(): Theme {
    return $GLOBALS['forge_basic_theme'] ?? Theme::instance();
}

/**
 * Load Vite dev server in development
 */
function forge_basic_vite_dev_server(): void {
    if ( ! defined( 'WP_ENVIRONMENT_TYPE' ) || 'local' !== WP_ENVIRONMENT_TYPE ) {
        return;
    }

    // Check if Vite dev server is running
    $vite_server = 'http://localhost:3000';
    $response    = wp_remote_get( $vite_server, [ 'timeout' => 1 ] );

    if ( ! is_wp_error( $response ) ) {
        // Inject Vite client
        add_action(
            'wp_head',
            function () use ( $vite_server ) {
                echo sprintf(
                    '<script type="module" src="%s/@vite/client"></script>',
                    esc_url( $vite_server )
                );
                echo sprintf(
                    '<script type="module" src="%s/src/js/main.ts"></script>',
                    esc_url( $vite_server )
                );
            },
            1
        );
    }
}

add_action( 'wp_head', 'forge_basic_vite_dev_server', 1 );

/**
 * Theme activation
 */
function forge_basic_activate(): void {
    // Set default theme mods
    if ( ! get_theme_mod( 'forge_basic_setup_complete' ) ) {
        set_theme_mod( 'forge_basic_setup_complete', true );

        // Flush rewrite rules
        flush_rewrite_rules();
    }
}

add_action( 'after_switch_theme', 'forge_basic_activate' );
