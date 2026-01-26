<?php
/**
 * StrataWP Studio Main Class
 *
 * @package StrataWP\Studio
 */

namespace StrataWP\Studio;

/**
 * Main Studio class
 */
class Studio {
    /**
     * Plugin version
     */
    public const VERSION = '1.0.0';

    /**
     * Instance
     *
     * @var Studio|null
     */
    private static ?Studio $instance = null;

    /**
     * REST controllers
     *
     * @var array
     */
    private array $controllers = [];

    /**
     * Get instance
     *
     * @return Studio
     */
    public static function instance(): Studio {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Initialize Studio
     */
    public function initialize(): void {
        // Register REST API
        add_action('rest_api_init', [$this, 'register_rest_routes']);

        // Register Pattern Post Type and Taxonomies
        $pattern_post_type = new PostTypes\PatternPostType();
        $pattern_post_type->initialize();
        PostTypes\PatternPostType::register_meta();

        // Register admin pages
        add_action('admin_menu', [$this, 'register_admin_menu']);

        // Enqueue admin scripts
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_scripts']);

        // Enqueue block editor scripts
        add_action('enqueue_block_editor_assets', [$this, 'enqueue_block_editor_scripts']);

        // Add preview mode support
        add_action('wp_head', [$this, 'inject_preview_script']);
    }

    /**
     * Register REST API routes
     */
    public function register_rest_routes(): void {
        $this->controllers['design_system'] = new RestApi\DesignSystemController();
        $this->controllers['design_system']->register_routes();

        $this->controllers['patterns'] = new RestApi\PatternsController();
        $this->controllers['patterns']->register_routes();
    }

    /**
     * Register admin menu
     */
    public function register_admin_menu(): void {
        add_menu_page(
            __('StrataWP Studio', 'stratawp'),
            __('StrataWP Studio', 'stratawp'),
            'manage_options',
            'stratawp-studio',
            [$this, 'render_admin_page'],
            'dashicons-art',
            59
        );

        add_submenu_page(
            'stratawp-studio',
            __('Design System', 'stratawp'),
            __('Design System', 'stratawp'),
            'manage_options',
            'stratawp-studio',
            [$this, 'render_admin_page']
        );

        add_submenu_page(
            'stratawp-studio',
            __('Block Library', 'stratawp'),
            __('Block Library', 'stratawp'),
            'manage_options',
            'stratawp-studio-blocks',
            [$this, 'render_admin_page']
        );

        add_submenu_page(
            'stratawp-studio',
            __('Pattern Library', 'stratawp'),
            __('Pattern Library', 'stratawp'),
            'manage_options',
            'stratawp-studio-patterns',
            [$this, 'render_admin_page']
        );

        add_submenu_page(
            'stratawp-studio',
            __('Template Builder', 'stratawp'),
            __('Template Builder', 'stratawp'),
            'manage_options',
            'stratawp-studio-templates',
            [$this, 'render_admin_page']
        );

        add_submenu_page(
            'stratawp-studio',
            __('Starter Sites', 'stratawp'),
            __('Starter Sites', 'stratawp'),
            'manage_options',
            'stratawp-studio-starters',
            [$this, 'render_admin_page']
        );
    }

    /**
     * Render admin page
     */
    public function render_admin_page(): void {
        $page = isset($_GET['page']) ? sanitize_text_field($_GET['page']) : 'stratawp-studio';
        ?>
        <div id="stratawp-studio-root" data-page="<?php echo esc_attr($page); ?>"></div>
        <?php
    }

    /**
     * Enqueue admin scripts
     *
     * @param string $hook Admin page hook.
     */
    public function enqueue_admin_scripts(string $hook): void {
        // Only load on Studio pages
        if (strpos($hook, 'stratawp-studio') === false) {
            return;
        }

        $asset_path = dirname(__DIR__) . '/dist/index.js';
        $asset_url = plugins_url('dist/index.js', dirname(__FILE__));

        // For theme integration, check theme path
        if (!file_exists($asset_path)) {
            $asset_path = get_template_directory() . '/vendor/stratawp/studio/dist/index.js';
            $asset_url = get_template_directory_uri() . '/vendor/stratawp/studio/dist/index.js';
        }

        wp_enqueue_script(
            'stratawp-studio',
            $asset_url,
            ['wp-element', 'wp-components', 'wp-i18n', 'wp-api-fetch'],
            self::VERSION,
            true
        );

        wp_localize_script('stratawp-studio', 'stratawpStudio', [
            'apiBase' => rest_url('stratawp/v1'),
            'nonce' => wp_create_nonce('wp_rest'),
            'previewUrl' => home_url('/?stratawp_preview=1'),
            'themeSlug' => get_stylesheet(),
            'version' => self::VERSION,
            'adminUrl' => admin_url(),
        ]);

        wp_enqueue_style(
            'stratawp-studio',
            plugins_url('dist/style.css', dirname(__FILE__)),
            ['wp-components'],
            self::VERSION
        );
    }

    /**
     * Enqueue block editor scripts
     *
     * Adds "Save as Pattern" functionality to the block editor
     */
    public function enqueue_block_editor_scripts(): void {
        $asset_path = dirname(__DIR__) . '/dist/gutenberg.js';
        $asset_url = plugins_url('dist/gutenberg.js', dirname(__FILE__));

        // For theme integration, check theme path
        if (!file_exists($asset_path)) {
            $asset_path = get_template_directory() . '/vendor/stratawp/studio/dist/gutenberg.js';
            $asset_url = get_template_directory_uri() . '/vendor/stratawp/studio/dist/gutenberg.js';
        }

        // Only enqueue if the file exists
        if (!file_exists($asset_path)) {
            return;
        }

        wp_enqueue_script(
            'stratawp-studio-gutenberg',
            $asset_url,
            [
                'wp-plugins',
                'wp-element',
                'wp-components',
                'wp-data',
                'wp-blocks',
                'wp-block-editor',
                'wp-i18n',
                'wp-api-fetch',
                'wp-notices',
                'wp-icons',
            ],
            self::VERSION,
            true
        );
    }

    /**
     * Inject preview script for live preview mode
     */
    public function inject_preview_script(): void {
        if (!isset($_GET['stratawp_preview'])) {
            return;
        }

        // Verify user can edit theme options
        if (!current_user_can('edit_theme_options')) {
            return;
        }

        $admin_origin = esc_js(admin_url());
        ?>
        <script id="stratawp-preview-script">
        (function() {
            var adminOrigin = <?php echo wp_json_encode(admin_url()); ?>;

            // Signal ready to parent
            window.parent.postMessage({ type: 'stratawp_ready' }, adminOrigin);

            // Listen for design updates
            window.addEventListener('message', function(event) {
                // Validate origin matches admin (extract origin from full admin URL)
                var expectedOrigin = new URL(adminOrigin).origin;
                if (event.origin !== expectedOrigin) {
                    return;
                }

                var data = event.data;

                if (data.type === 'stratawp_design_update' && data.tokens) {
                    Object.keys(data.tokens).forEach(function(key) {
                        document.documentElement.style.setProperty(key, data.tokens[key]);
                    });
                }

                if (data.type === 'stratawp_navigate' && data.url) {
                    window.location.href = data.url + (data.url.includes('?') ? '&' : '?') + 'stratawp_preview=1';
                }
            });
        })();
        </script>
        <?php
    }
}
