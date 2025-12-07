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
     * Initialize the component
     */
    public function initialize(): void
    {
        $this->font_pairings = $this->get_font_pairings();

        add_action('customize_register', [$this, 'register_customizer_settings']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_google_fonts']);
        add_action('wp_head', [$this, 'output_font_css_variables'], 5);
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
     * Register Customizer settings
     *
     * @param \WP_Customize_Manager $wp_customize Customizer manager
     */
    public function register_customizer_settings(\WP_Customize_Manager $wp_customize): void
    {
        // Add Typography Section
        $wp_customize->add_section('stratawp_typography', [
            'title' => __('Typography', 'stratawp'),
            'description' => __('Choose a font pairing for your site', 'stratawp'),
            'priority' => 30,
        ]);

        // Font Pairing Setting
        $wp_customize->add_setting('stratawp_font_pairing', [
            'default' => 'playfair-source',
            'transport' => 'refresh',
            'sanitize_callback' => [$this, 'sanitize_font_pairing'],
        ]);

        // Font Pairing Control
        $wp_customize->add_control('stratawp_font_pairing', [
            'label' => __('Font Pairing', 'stratawp'),
            'description' => __('Select a pre-curated font combination', 'stratawp'),
            'section' => 'stratawp_typography',
            'type' => 'select',
            'choices' => $this->get_font_pairing_choices(),
        ]);

        // Base Font Size
        $wp_customize->add_setting('stratawp_base_font_size', [
            'default' => '16',
            'transport' => 'postMessage',
            'sanitize_callback' => 'absint',
        ]);

        $wp_customize->add_control('stratawp_base_font_size', [
            'label' => __('Base Font Size (px)', 'stratawp'),
            'description' => __('Base font size for body text', 'stratawp'),
            'section' => 'stratawp_typography',
            'type' => 'number',
            'input_attrs' => [
                'min' => 12,
                'max' => 24,
                'step' => 1,
            ],
        ]);

        // Line Height
        $wp_customize->add_setting('stratawp_line_height', [
            'default' => '1.6',
            'transport' => 'postMessage',
            'sanitize_callback' => [$this, 'sanitize_line_height'],
        ]);

        $wp_customize->add_control('stratawp_line_height', [
            'label' => __('Line Height', 'stratawp'),
            'description' => __('Line height for body text', 'stratawp'),
            'section' => 'stratawp_typography',
            'type' => 'number',
            'input_attrs' => [
                'min' => 1.2,
                'max' => 2.0,
                'step' => 0.1,
            ],
        ]);
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
        $pairing_key = get_theme_mod('stratawp_font_pairing', 'playfair-source');
        $pairing = $this->font_pairings[$pairing_key] ?? $this->font_pairings['playfair-source'];

        $fonts_to_load = [];

        // Add heading font
        if (!isset($pairing['heading']['system'])) {
            $heading_family = $pairing['heading']['family'];
            $heading_weights = implode(',', $pairing['heading']['weights']);
            $fonts_to_load[] = "{$heading_family}:wght@{$heading_weights}";
        }

        // Add body font
        if (!isset($pairing['body']['system'])) {
            $body_family = $pairing['body']['family'];
            $body_weights = implode(',', $pairing['body']['weights']);
            $fonts_to_load[] = "{$body_family}:wght@{$body_weights}";
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
        $pairing_key = get_theme_mod('stratawp_font_pairing', 'playfair-source');
        $pairing = $this->font_pairings[$pairing_key] ?? $this->font_pairings['playfair-source'];

        $base_font_size = get_theme_mod('stratawp_base_font_size', 16);
        $line_height = get_theme_mod('stratawp_line_height', '1.6');

        $heading_family = $pairing['heading']['family'];
        $body_family = $pairing['body']['family'];

        echo "<style id='stratawp-font-variables'>\n";
        echo ":root {\n";
        echo "  --font-heading: '{$heading_family}', {$pairing['heading']['category']};\n";
        echo "  --font-body: '{$body_family}', {$pairing['body']['category']};\n";
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
        $pairing_key = get_theme_mod('stratawp_font_pairing', 'playfair-source');
        return $this->font_pairings[$pairing_key] ?? null;
    }
}
