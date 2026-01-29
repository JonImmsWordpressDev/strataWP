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

        // Add type="module" to studio scripts (required for ES modules)
        add_filter('script_loader_tag', [$this, 'add_module_type_to_scripts'], 10, 3);
    }

    /**
     * Add type="module" to studio scripts
     *
     * @param string $tag    The script tag.
     * @param string $handle The script handle.
     * @param string $src    The script source.
     * @return string Modified script tag.
     */
    public function add_module_type_to_scripts(string $tag, string $handle, string $src): string {
        if (in_array($handle, ['stratawp-studio', 'stratawp-studio-gutenberg'], true)) {
            // Replace the script tag to add type="module"
            $tag = str_replace(' src=', ' type="module" src=', $tag);
        }
        return $tag;
    }

    /**
     * Register REST API routes
     */
    public function register_rest_routes(): void {
        $this->controllers['design_system'] = new RestApi\DesignSystemController();
        $this->controllers['design_system']->register_routes();

        $this->controllers['patterns'] = new RestApi\PatternsController();
        $this->controllers['patterns']->register_routes();

        $this->controllers['blocks'] = new RestApi\BlocksController();
        $this->controllers['blocks']->register_routes();
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

        // Determine asset paths - check if in theme or plugin context
        $studio_dir = dirname(__DIR__);
        $asset_path = $studio_dir . '/dist/index.js';
        $style_path = $studio_dir . '/dist/style.css';

        // Detect if we're in a theme by checking the path
        $theme_dir = get_template_directory();
        if (strpos($studio_dir, $theme_dir) !== false) {
            // In theme - use theme URL
            $relative_path = str_replace($theme_dir, '', $studio_dir);
            $asset_url = get_template_directory_uri() . $relative_path . '/dist/index.js';
            $style_url = get_template_directory_uri() . $relative_path . '/dist/style.css';
        } else {
            // In plugin - use plugins_url
            $asset_url = plugins_url('dist/index.js', dirname(__FILE__));
            $style_url = plugins_url('dist/style.css', dirname(__FILE__));
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
            $style_url,
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
        $studio_dir = dirname(__DIR__);
        $asset_path = $studio_dir . '/dist/gutenberg.js';

        // Only enqueue if the file exists
        if (!file_exists($asset_path)) {
            return;
        }

        // Detect if we're in a theme by checking the path
        $theme_dir = get_template_directory();
        if (strpos($studio_dir, $theme_dir) !== false) {
            // In theme - use theme URL
            $relative_path = str_replace($theme_dir, '', $studio_dir);
            $asset_url = get_template_directory_uri() . $relative_path . '/dist/gutenberg.js';
        } else {
            // In plugin - use plugins_url
            $asset_url = plugins_url('dist/gutenberg.js', dirname(__FILE__));
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
        ?>
        <script id="stratawp-preview-script">
        (function() {
            var adminOrigin = <?php echo wp_json_encode(admin_url()); ?>;
            var expectedOrigin = new URL(adminOrigin).origin;
            var verifiedParentOrigin = null;

            // Signal ready to parent - try configured admin URL first
            // In reverse proxy setups, we also try the referrer origin
            function sendReady() {
                var message = { type: 'stratawp_ready' };

                // Try sending to configured admin origin
                try {
                    window.parent.postMessage(message, expectedOrigin);
                } catch (e) {
                    console.warn('[StrataWP] Failed to send ready to configured origin:', expectedOrigin);
                }

                // If referrer exists and differs, also try that (reverse proxy scenario)
                if (document.referrer) {
                    try {
                        var referrerOrigin = new URL(document.referrer).origin;
                        if (referrerOrigin !== expectedOrigin) {
                            window.parent.postMessage(message, referrerOrigin);
                        }
                    } catch (e) {
                        // Referrer URL parsing failed, ignore
                    }
                }
            }

            sendReady();

            // Listen for design updates
            window.addEventListener('message', function(event) {
                // Validate this looks like a StrataWP message
                var data = event.data;
                if (!data || typeof data !== 'object' || !data.type || data.type.indexOf('stratawp_') !== 0) {
                    return;
                }

                // First message from parent: verify and store origin
                if (!verifiedParentOrigin) {
                    if (event.origin !== expectedOrigin) {
                        // Log mismatch but accept valid StrataWP messages (reverse proxy scenario)
                        console.warn('[StrataWP] Parent origin mismatch - expected:', expectedOrigin, 'received:', event.origin);
                    }
                    verifiedParentOrigin = event.origin;
                } else if (event.origin !== verifiedParentOrigin) {
                    // Subsequent messages must come from same origin
                    return;
                }

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
