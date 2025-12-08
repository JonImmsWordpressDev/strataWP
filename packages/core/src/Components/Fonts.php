<?php
/**
 * Font Component
 *
 * Manages Google Font pairings and typography settings
 *
 * @package StrataWP
 */

namespace StrataWP\Components;

use StrataWP\ComponentInterface;

/**
 * Font Management Component
 */
class Fonts implements ComponentInterface
{
    /**
     * Curated Google Font pairings
     *
     * @var array
     */
    private array $font_pairings = [];

    /**
     * Get component slug
     *
     * @return string
     */
    public function get_slug(): string
    {
        return 'fonts';
    }

    /**
     * Initialize the component
     */
    public function initialize(): void
    {
        $this->font_pairings = $this->get_font_pairings();

        add_action('admin_menu', [$this, 'register_admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_google_fonts']);
        add_action('wp_head', [$this, 'output_font_css_variables'], 999);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_styles']);
    }

    /**
     * Get curated Google Font pairings
     *
     * @return array
     */
    private function get_font_pairings(): array
    {
        return [
            'playfair-source' => [
                'name' => 'Classic Elegance',
                'description' => 'Playfair Display + Source Sans Pro',
                'heading' => [
                    'family' => 'Playfair Display',
                    'weights' => [400, 600, 700, 900],
                    'category' => 'serif',
                ],
                'body' => [
                    'family' => 'Source Sans Pro',
                    'weights' => [300, 400, 600, 700],
                    'category' => 'sans-serif',
                ],
            ],
            'montserrat-merriweather' => [
                'name' => 'Modern Editorial',
                'description' => 'Montserrat + Merriweather',
                'heading' => [
                    'family' => 'Montserrat',
                    'weights' => [400, 600, 700, 800],
                    'category' => 'sans-serif',
                ],
                'body' => [
                    'family' => 'Merriweather',
                    'weights' => [300, 400, 700],
                    'category' => 'serif',
                ],
            ],
            'raleway-lato' => [
                'name' => 'Clean Professional',
                'description' => 'Raleway + Lato',
                'heading' => [
                    'family' => 'Raleway',
                    'weights' => [400, 600, 700, 800],
                    'category' => 'sans-serif',
                ],
                'body' => [
                    'family' => 'Lato',
                    'weights' => [300, 400, 700],
                    'category' => 'sans-serif',
                ],
            ],
            'poppins-open' => [
                'name' => 'Modern Friendly',
                'description' => 'Poppins + Open Sans',
                'heading' => [
                    'family' => 'Poppins',
                    'weights' => [400, 600, 700, 800],
                    'category' => 'sans-serif',
                ],
                'body' => [
                    'family' => 'Open Sans',
                    'weights' => [300, 400, 600, 700],
                    'category' => 'sans-serif',
                ],
            ],
            'libre-roboto' => [
                'name' => 'Bold & Clear',
                'description' => 'Libre Baskerville + Roboto',
                'heading' => [
                    'family' => 'Libre Baskerville',
                    'weights' => [400, 700],
                    'category' => 'serif',
                ],
                'body' => [
                    'family' => 'Roboto',
                    'weights' => [300, 400, 500, 700],
                    'category' => 'sans-serif',
                ],
            ],
            'space-work' => [
                'name' => 'Tech Modern',
                'description' => 'Space Grotesk + Work Sans',
                'heading' => [
                    'family' => 'Space Grotesk',
                    'weights' => [400, 500, 600, 700],
                    'category' => 'sans-serif',
                ],
                'body' => [
                    'family' => 'Work Sans',
                    'weights' => [300, 400, 500, 600],
                    'category' => 'sans-serif',
                ],
            ],
            'cormorant-proza' => [
                'name' => 'Refined Literary',
                'description' => 'Cormorant Garamond + Proza Libre',
                'heading' => [
                    'family' => 'Cormorant Garamond',
                    'weights' => [400, 600, 700],
                    'category' => 'serif',
                ],
                'body' => [
                    'family' => 'Proza Libre',
                    'weights' => [400, 500, 600],
                    'category' => 'sans-serif',
                ],
            ],
            'inter-system' => [
                'name' => 'System Default',
                'description' => 'Inter + System UI Stack',
                'heading' => [
                    'family' => 'Inter',
                    'weights' => [400, 600, 700, 800],
                    'category' => 'sans-serif',
                ],
                'body' => [
                    'family' => '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell',
                    'weights' => [],
                    'category' => 'sans-serif',
                    'system' => true,
                ],
            ],
        ];
    }

    /**
     * Get list of popular Google Fonts
     *
     * @return array
     */
    private function get_available_fonts(): array
    {
        return [
            // Sans-serif fonts
            'Inter' => 'sans-serif',
            'Roboto' => 'sans-serif',
            'Open Sans' => 'sans-serif',
            'Lato' => 'sans-serif',
            'Montserrat' => 'sans-serif',
            'Poppins' => 'sans-serif',
            'Raleway' => 'sans-serif',
            'Work Sans' => 'sans-serif',
            'Nunito' => 'sans-serif',
            'DM Sans' => 'sans-serif',
            'Manrope' => 'sans-serif',
            'Space Grotesk' => 'sans-serif',
            'Plus Jakarta Sans' => 'sans-serif',
            'Outfit' => 'sans-serif',
            'Karla' => 'sans-serif',
            'Archivo' => 'sans-serif',

            // Serif fonts
            'Playfair Display' => 'serif',
            'Merriweather' => 'serif',
            'Libre Baskerville' => 'serif',
            'Cormorant Garamond' => 'serif',
            'Lora' => 'serif',
            'Crimson Text' => 'serif',
            'EB Garamond' => 'serif',
            'Spectral' => 'serif',
            'Source Serif Pro' => 'serif',
            'Bitter' => 'serif',
            'Fraunces' => 'serif',

            // Display fonts
            'Bebas Neue' => 'sans-serif',
            'Righteous' => 'sans-serif',
            'Oswald' => 'sans-serif',
            'Anton' => 'sans-serif',
            'Abril Fatface' => 'serif',
        ];
    }

    /**
     * Get available font weights
     *
     * @return array
     */
    private function get_available_weights(): array
    {
        return [
            100 => 'Thin',
            200 => 'Extra Light',
            300 => 'Light',
            400 => 'Regular',
            500 => 'Medium',
            600 => 'Semi Bold',
            700 => 'Bold',
            800 => 'Extra Bold',
            900 => 'Black',
        ];
    }

    /**
     * Register admin menu page
     */
    public function register_admin_menu(): void
    {
        add_options_page(
            __('StrataWP Typography', 'stratawp'),
            __('StrataWP Typography', 'stratawp'),
            'manage_options',
            'stratawp-typography',
            [$this, 'render_admin_page']
        );
    }

    /**
     * Register settings
     */
    public function register_settings(): void
    {
        // Font mode: 'pairing' or 'custom'
        register_setting('stratawp_typography', 'stratawp_font_mode', [
            'type' => 'string',
            'default' => 'pairing',
            'sanitize_callback' => [$this, 'sanitize_font_mode'],
        ]);

        // Recommended pairing selection
        register_setting('stratawp_typography', 'stratawp_font_pairing', [
            'type' => 'string',
            'default' => 'playfair-source',
            'sanitize_callback' => [$this, 'sanitize_font_pairing'],
        ]);

        // Custom heading font
        register_setting('stratawp_typography', 'stratawp_custom_heading_font', [
            'type' => 'string',
            'default' => 'Montserrat',
            'sanitize_callback' => 'sanitize_text_field',
        ]);

        // Custom heading font weights
        register_setting('stratawp_typography', 'stratawp_custom_heading_weights', [
            'type' => 'array',
            'default' => [400, 600, 700],
            'sanitize_callback' => [$this, 'sanitize_font_weights'],
        ]);

        // Custom body font
        register_setting('stratawp_typography', 'stratawp_custom_body_font', [
            'type' => 'string',
            'default' => 'Open Sans',
            'sanitize_callback' => 'sanitize_text_field',
        ]);

        // Custom body font weights
        register_setting('stratawp_typography', 'stratawp_custom_body_weights', [
            'type' => 'array',
            'default' => [300, 400, 600],
            'sanitize_callback' => [$this, 'sanitize_font_weights'],
        ]);

        // Base font size
        register_setting('stratawp_typography', 'stratawp_base_font_size', [
            'type' => 'integer',
            'default' => 16,
            'sanitize_callback' => 'absint',
        ]);

        // Line height
        register_setting('stratawp_typography', 'stratawp_line_height', [
            'type' => 'string',
            'default' => '1.6',
            'sanitize_callback' => [$this, 'sanitize_line_height'],
        ]);
    }

    /**
     * Render admin page
     */
    public function render_admin_page(): void
    {
        if (!current_user_can('manage_options')) {
            return;
        }

        $font_mode = get_option('stratawp_font_mode', 'pairing');
        $current_pairing = get_option('stratawp_font_pairing', 'playfair-source');
        $custom_heading_font = get_option('stratawp_custom_heading_font', 'Montserrat');
        $custom_heading_weights = get_option('stratawp_custom_heading_weights', [400, 600, 700]);
        $custom_body_font = get_option('stratawp_custom_body_font', 'Open Sans');
        $custom_body_weights = get_option('stratawp_custom_body_weights', [300, 400, 600]);
        $base_font_size = get_option('stratawp_base_font_size', 16);
        $line_height = get_option('stratawp_line_height', '1.6');

        $available_fonts = $this->get_available_fonts();
        $available_weights = $this->get_available_weights();

        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            <p class="description"><?php _e('Choose how to configure your fonts: use our recommended pairings or select custom fonts.', 'stratawp'); ?></p>

            <form method="post" action="options.php">
                <?php
                settings_fields('stratawp_typography');
                do_settings_sections('stratawp_typography');
                ?>

                <table class="form-table" role="presentation">
                    <!-- Font Mode Selection -->
                    <tr>
                        <th scope="row">
                            <?php _e('Font Selection Mode', 'stratawp'); ?>
                        </th>
                        <td>
                            <fieldset>
                                <label>
                                    <input type="radio" name="stratawp_font_mode" value="pairing" <?php checked($font_mode, 'pairing'); ?>>
                                    <strong><?php _e('Recommended Pairings', 'stratawp'); ?></strong>
                                    <span class="description" style="display: block; margin-left: 25px;">
                                        <?php _e('Choose from expertly curated font combinations', 'stratawp'); ?>
                                    </span>
                                </label>
                                <br><br>
                                <label>
                                    <input type="radio" name="stratawp_font_mode" value="custom" <?php checked($font_mode, 'custom'); ?>>
                                    <strong><?php _e('Custom Fonts', 'stratawp'); ?></strong>
                                    <span class="description" style="display: block; margin-left: 25px;">
                                        <?php _e('Select any Google Font with custom weights', 'stratawp'); ?>
                                    </span>
                                </label>
                            </fieldset>
                        </td>
                    </tr>
                </table>

                <!-- Recommended Pairings Section -->
                <div id="pairing-section" style="display: <?php echo $font_mode === 'pairing' ? 'block' : 'none'; ?>;">
                    <h2><?php _e('Recommended Font Pairings', 'stratawp'); ?></h2>
                    <table class="form-table" role="presentation">
                        <tr>
                            <th scope="row">
                                <label for="stratawp_font_pairing"><?php _e('Font Pairing', 'stratawp'); ?></label>
                            </th>
                            <td>
                                <select name="stratawp_font_pairing" id="stratawp_font_pairing" class="regular-text">
                                    <?php foreach ($this->font_pairings as $key => $pairing): ?>
                                        <option value="<?php echo esc_attr($key); ?>" <?php selected($current_pairing, $key); ?>>
                                            <?php echo esc_html($pairing['name'] . ' — ' . $pairing['description']); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                                <p class="description">
                                    <?php _e('Select a pre-curated font combination', 'stratawp'); ?>
                                </p>

                                <?php if (isset($this->font_pairings[$current_pairing])): ?>
                                    <div class="stratawp-font-preview">
                                        <h3><?php _e('Preview', 'stratawp'); ?></h3>
                                        <div class="font-preview-heading" style="font-family: <?php echo esc_attr($this->font_pairings[$current_pairing]['heading']['family']); ?>;">
                                            <?php echo esc_html($this->font_pairings[$current_pairing]['heading']['family']); ?> (Headings)
                                        </div>
                                        <div class="font-preview-body" style="font-family: <?php echo esc_attr($this->font_pairings[$current_pairing]['body']['family']); ?>;">
                                            <?php echo esc_html($this->font_pairings[$current_pairing]['body']['family']); ?> (Body Text)
                                        </div>
                                    </div>
                                <?php endif; ?>
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Custom Fonts Section -->
                <div id="custom-section" style="display: <?php echo $font_mode === 'custom' ? 'block' : 'none'; ?>;">
                    <h2><?php _e('Custom Font Selection', 'stratawp'); ?></h2>
                    <table class="form-table" role="presentation">
                        <!-- Heading Font -->
                        <tr>
                            <th scope="row">
                                <label for="stratawp_custom_heading_font"><?php _e('Heading Font', 'stratawp'); ?></label>
                            </th>
                            <td>
                                <select name="stratawp_custom_heading_font" id="stratawp_custom_heading_font" class="regular-text">
                                    <?php foreach ($available_fonts as $font => $category): ?>
                                        <option value="<?php echo esc_attr($font); ?>" <?php selected($custom_heading_font, $font); ?>>
                                            <?php echo esc_html($font); ?> (<?php echo esc_html($category); ?>)
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                                <p class="description"><?php _e('Font family for headings (h1-h6)', 'stratawp'); ?></p>

                                <fieldset style="margin-top: 10px;">
                                    <legend><?php _e('Font Weights:', 'stratawp'); ?></legend>
                                    <!-- Hidden field to ensure array is sent even if no boxes checked -->
                                    <input type="hidden" name="stratawp_custom_heading_weights[]" value="">
                                    <?php foreach ($available_weights as $weight => $label): ?>
                                        <label style="display: inline-block; margin-right: 15px;">
                                            <input type="checkbox" name="stratawp_custom_heading_weights[]" value="<?php echo esc_attr($weight); ?>"
                                                   <?php checked(in_array($weight, $custom_heading_weights)); ?>>
                                            <?php echo esc_html($weight . ' - ' . $label); ?>
                                        </label>
                                    <?php endforeach; ?>
                                    <p class="description"><?php _e('Select which font weights to load (affects page performance)', 'stratawp'); ?></p>
                                </fieldset>
                            </td>
                        </tr>

                        <!-- Body Font -->
                        <tr>
                            <th scope="row">
                                <label for="stratawp_custom_body_font"><?php _e('Body Font', 'stratawp'); ?></label>
                            </th>
                            <td>
                                <select name="stratawp_custom_body_font" id="stratawp_custom_body_font" class="regular-text">
                                    <?php foreach ($available_fonts as $font => $category): ?>
                                        <option value="<?php echo esc_attr($font); ?>" <?php selected($custom_body_font, $font); ?>>
                                            <?php echo esc_html($font); ?> (<?php echo esc_html($category); ?>)
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                                <p class="description"><?php _e('Font family for body text and paragraphs', 'stratawp'); ?></p>

                                <fieldset style="margin-top: 10px;">
                                    <legend><?php _e('Font Weights:', 'stratawp'); ?></legend>
                                    <!-- Hidden field to ensure array is sent even if no boxes checked -->
                                    <input type="hidden" name="stratawp_custom_body_weights[]" value="">
                                    <?php foreach ($available_weights as $weight => $label): ?>
                                        <label style="display: inline-block; margin-right: 15px;">
                                            <input type="checkbox" name="stratawp_custom_body_weights[]" value="<?php echo esc_attr($weight); ?>"
                                                   <?php checked(in_array($weight, $custom_body_weights)); ?>>
                                            <?php echo esc_html($weight . ' - ' . $label); ?>
                                        </label>
                                    <?php endforeach; ?>
                                    <p class="description"><?php _e('Select which font weights to load (affects page performance)', 'stratawp'); ?></p>
                                </fieldset>
                            </td>
                        </tr>

                        <!-- Custom Font Preview -->
                        <tr>
                            <th scope="row"><?php _e('Preview', 'stratawp'); ?></th>
                            <td>
                                <div class="stratawp-font-preview" id="custom-preview">
                                    <div class="font-preview-heading" style="font-family: '<?php echo esc_attr($custom_heading_font); ?>';">
                                        <?php echo esc_html($custom_heading_font); ?> (Headings)
                                    </div>
                                    <div class="font-preview-body" style="font-family: '<?php echo esc_attr($custom_body_font); ?>';">
                                        <?php echo esc_html($custom_body_font); ?> (Body Text)
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Common Settings -->
                <h2><?php _e('Typography Settings', 'stratawp'); ?></h2>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row">
                            <label for="stratawp_base_font_size"><?php _e('Base Font Size (px)', 'stratawp'); ?></label>
                        </th>
                        <td>
                            <input type="number" name="stratawp_base_font_size" id="stratawp_base_font_size"
                                   value="<?php echo esc_attr($base_font_size); ?>"
                                   min="12" max="24" step="1" class="small-text">
                            <p class="description">
                                <?php _e('Base font size for body text (12-24px)', 'stratawp'); ?>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <th scope="row">
                            <label for="stratawp_line_height"><?php _e('Line Height', 'stratawp'); ?></label>
                        </th>
                        <td>
                            <input type="number" name="stratawp_line_height" id="stratawp_line_height"
                                   value="<?php echo esc_attr($line_height); ?>"
                                   min="1.2" max="2.0" step="0.1" class="small-text">
                            <p class="description">
                                <?php _e('Line height for body text (1.2-2.0)', 'stratawp'); ?>
                            </p>
                        </td>
                    </tr>
                </table>

                <?php submit_button(__('Save Typography Settings', 'stratawp')); ?>
            </form>
        </div>

        <script>
        jQuery(document).ready(function($) {
            // Toggle sections based on font mode
            $('input[name="stratawp_font_mode"]').on('change', function() {
                if ($(this).val() === 'pairing') {
                    $('#pairing-section').show();
                    $('#custom-section').hide();
                } else {
                    $('#pairing-section').hide();
                    $('#custom-section').show();
                }
            });

            // Update custom font preview
            $('#stratawp_custom_heading_font, #stratawp_custom_body_font').on('change', function() {
                var headingFont = $('#stratawp_custom_heading_font').val();
                var bodyFont = $('#stratawp_custom_body_font').val();

                $('#custom-preview .font-preview-heading')
                    .css('font-family', "'" + headingFont + "'")
                    .text(headingFont + ' (Headings)');

                $('#custom-preview .font-preview-body')
                    .css('font-family', "'" + bodyFont + "'")
                    .text(bodyFont + ' (Body Text)');
            });
        });
        </script>
        <?php
    }

    /**
     * Enqueue admin styles
     */
    public function enqueue_admin_styles($hook): void
    {
        if ('settings_page_stratawp-typography' !== $hook) {
            return;
        }

        // Load ALL available fonts for preview (both pairings and custom selection)
        $all_fonts = [];

        // Add fonts from pairings
        foreach ($this->font_pairings as $pairing) {
            if (!isset($pairing['heading']['system'])) {
                $heading_family = $pairing['heading']['family'];
                $heading_weights = implode(';', $pairing['heading']['weights']);
                $all_fonts[] = "{$heading_family}:wght@{$heading_weights}";
            }
            if (!isset($pairing['body']['system'])) {
                $body_family = $pairing['body']['family'];
                $body_weights = implode(';', $pairing['body']['weights']);
                $all_fonts[] = "{$body_family}:wght@{$body_weights}";
            }
        }

        // Add all available fonts for custom selection with common weights
        $available_fonts = $this->get_available_fonts();
        foreach ($available_fonts as $font => $category) {
            // Load with common weights for preview
            $all_fonts[] = "{$font}:wght@300;400;600;700";
        }

        // Remove duplicates
        $all_fonts = array_unique($all_fonts);

        if (!empty($all_fonts)) {
            $fonts_url = 'https://fonts.googleapis.com/css2?family=' .
                         implode('&family=', array_map('urlencode', $all_fonts)) .
                         '&display=swap';

            wp_enqueue_style('stratawp-google-fonts-preview', $fonts_url, [], null);
        } else {
            // Fallback: register empty style for inline styles
            wp_register_style('stratawp-typography-admin', false);
            wp_enqueue_style('stratawp-typography-admin');
        }

        // Add inline styles for preview
        $style_handle = !empty($all_fonts) ? 'stratawp-google-fonts-preview' : 'stratawp-typography-admin';
        wp_add_inline_style($style_handle, '
            .stratawp-font-preview {
                margin-top: 20px;
                padding: 20px;
                background: #f0f0f1;
                border-radius: 4px;
            }
            .stratawp-font-preview h3 {
                margin-top: 0;
                margin-bottom: 15px;
            }
            .font-preview-heading {
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 15px;
                padding: 15px;
                background: white;
                border-radius: 4px;
            }
            .font-preview-body {
                font-size: 16px;
                padding: 15px;
                background: white;
                border-radius: 4px;
            }
        ');

        // Add JavaScript for dynamic preview
        wp_add_inline_script('jquery', '
            jQuery(document).ready(function($) {
                var fontPairings = ' . json_encode($this->font_pairings) . ';

                $("#stratawp_font_pairing").on("change", function() {
                    var selectedPairing = $(this).val();
                    var pairing = fontPairings[selectedPairing];

                    if (pairing) {
                        $(".font-preview-heading")
                            .css("font-family", "\'" + pairing.heading.family + "\', " + pairing.heading.category)
                            .text(pairing.heading.family + " (Headings)");

                        $(".font-preview-body")
                            .css("font-family", "\'" + pairing.body.family + "\', " + pairing.body.category)
                            .text(pairing.body.family + " (Body Text)");
                    }
                });
            });
        ');
    }

    /**
     * Get font pairing choices for Customizer
     *
     * @return array
     */
    private function get_font_pairing_choices(): array
    {
        $choices = [];
        foreach ($this->font_pairings as $key => $pairing) {
            $choices[$key] = sprintf(
                '%s — %s',
                $pairing['name'],
                $pairing['description']
            );
        }
        return $choices;
    }

    /**
     * Sanitize font mode selection
     *
     * @param string $value Font mode
     * @return string
     */
    public function sanitize_font_mode(string $value): string
    {
        return in_array($value, ['pairing', 'custom']) ? $value : 'pairing';
    }

    /**
     * Sanitize font pairing selection
     *
     * @param string $value Selected pairing key
     * @return string
     */
    public function sanitize_font_pairing(string $value): string
    {
        return array_key_exists($value, $this->font_pairings) ? $value : 'playfair-source';
    }

    /**
     * Sanitize font weights array
     *
     * @param mixed $value Font weights array
     * @return array
     */
    public function sanitize_font_weights($value): array
    {
        if (!is_array($value)) {
            return [400];
        }

        // Filter out empty strings (from hidden field) and validate
        $valid_weights = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        $weights = array_filter($value, function($weight) use ($valid_weights) {
            return $weight !== '' && in_array((int)$weight, $valid_weights);
        });

        return !empty($weights) ? array_map('intval', $weights) : [400];
    }

    /**
     * Sanitize line height value
     *
     * @param string $value Line height value
     * @return string
     */
    public function sanitize_line_height(string $value): string
    {
        $value = floatval($value);
        return ($value >= 1.2 && $value <= 2.0) ? strval($value) : '1.6';
    }

    /**
     * Enqueue Google Fonts
     */
    public function enqueue_google_fonts(): void
    {
        $font_mode = get_option('stratawp_font_mode', 'pairing');
        $fonts_to_load = [];

        if ($font_mode === 'pairing') {
            // Load fonts from recommended pairing
            $pairing_key = get_option('stratawp_font_pairing', 'playfair-source');
            $pairing = $this->font_pairings[$pairing_key] ?? $this->font_pairings['playfair-source'];

            // Add heading font
            if (!isset($pairing['heading']['system'])) {
                $heading_family = $pairing['heading']['family'];
                $heading_weights = implode(';', $pairing['heading']['weights']);
                $fonts_to_load[] = "{$heading_family}:wght@{$heading_weights}";
            }

            // Add body font
            if (!isset($pairing['body']['system'])) {
                $body_family = $pairing['body']['family'];
                $body_weights = implode(';', $pairing['body']['weights']);
                $fonts_to_load[] = "{$body_family}:wght@{$body_weights}";
            }
        } else {
            // Load custom fonts
            $available_fonts = $this->get_available_fonts();

            // Heading font
            $heading_font = get_option('stratawp_custom_heading_font', 'Montserrat');
            $heading_weights = get_option('stratawp_custom_heading_weights', [400, 600, 700]);

            if (isset($available_fonts[$heading_font])) {
                $heading_weights_str = implode(';', $heading_weights);
                $fonts_to_load[] = "{$heading_font}:wght@{$heading_weights_str}";
            }

            // Body font
            $body_font = get_option('stratawp_custom_body_font', 'Open Sans');
            $body_weights = get_option('stratawp_custom_body_weights', [300, 400, 600]);

            if (isset($available_fonts[$body_font]) && $body_font !== $heading_font) {
                $body_weights_str = implode(';', $body_weights);
                $fonts_to_load[] = "{$body_font}:wght@{$body_weights_str}";
            } elseif ($body_font === $heading_font) {
                // If same font, combine weights
                $all_weights = array_unique(array_merge($heading_weights, $body_weights));
                sort($all_weights);
                $fonts_to_load = ["{$heading_font}:wght@" . implode(';', $all_weights)];
            }
        }

        if (!empty($fonts_to_load)) {
            $fonts_url = 'https://fonts.googleapis.com/css2?family=' .
                         implode('&family=', array_map('urlencode', $fonts_to_load)) .
                         '&display=swap';

            wp_enqueue_style(
                'stratawp-google-fonts',
                $fonts_url,
                [],
                null
            );
        }
    }

    /**
     * Output font CSS variables in <head>
     */
    public function output_font_css_variables(): void
    {
        $font_mode = get_option('stratawp_font_mode', 'pairing');
        $base_font_size = get_option('stratawp_base_font_size', 16);
        $line_height = get_option('stratawp_line_height', '1.6');

        if ($font_mode === 'pairing') {
            // Use recommended pairing
            $pairing_key = get_option('stratawp_font_pairing', 'playfair-source');
            $pairing = $this->font_pairings[$pairing_key] ?? $this->font_pairings['playfair-source'];

            $heading_family = $pairing['heading']['family'];
            $heading_category = $pairing['heading']['category'];
            $body_family = $pairing['body']['family'];
            $body_category = $pairing['body']['category'];
        } else {
            // Use custom fonts
            $available_fonts = $this->get_available_fonts();

            $heading_family = get_option('stratawp_custom_heading_font', 'Montserrat');
            $heading_category = $available_fonts[$heading_family] ?? 'sans-serif';

            $body_family = get_option('stratawp_custom_body_font', 'Open Sans');
            $body_category = $available_fonts[$body_family] ?? 'sans-serif';
        }

        echo "<style id='stratawp-font-variables'>\n";
        echo ":root {\n";
        echo "  --font-heading: '{$heading_family}', {$heading_category};\n";
        echo "  --font-body: '{$body_family}', {$body_category};\n";
        echo "  --font-size-base: {$base_font_size}px;\n";
        echo "  --line-height-base: {$line_height};\n";
        echo "}\n";
        echo "</style>\n";
    }

    /**
     * Get current font pairing
     *
     * @return array|null
     */
    public function get_current_pairing(): ?array
    {
        $pairing_key = get_option('stratawp_font_pairing', 'playfair-source');
        return $this->font_pairings[$pairing_key] ?? null;
    }
}
