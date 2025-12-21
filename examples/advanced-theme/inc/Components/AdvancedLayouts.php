<?php
/**
 * Advanced Layouts Component
 *
 * Provides advanced layout functionality and helper methods.
 *
 * @package StrataAdvanced
 */

namespace StrataBasic\Components;

use StrataWP\ComponentInterface;

/**
 * Advanced Layout Manager
 */
class AdvancedLayouts implements ComponentInterface {
    /**
     * {@inheritdoc}
     */
    public function get_slug(): string {
        return 'advanced-layouts';
    }

    /**
     * {@inheritdoc}
     */
    public function initialize(): void {
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_layout_styles' ] );
        add_filter( 'body_class', [ $this, 'add_layout_body_classes' ] );

        // Register layout settings
        add_action( 'customize_register', [ $this, 'register_layout_settings' ] );
    }

    /**
     * Enqueue layout-specific styles
     */
    public function enqueue_layout_styles(): void {
        // Layouts will be handled by Vite, but we can add inline styles if needed
        $custom_css = $this->get_custom_layout_css();

        if ( ! empty( $custom_css ) ) {
            wp_add_inline_style( 'strata-advanced-main', $custom_css );
        }
    }

    /**
     * Add layout body classes
     *
     * @param array $classes Existing body classes.
     * @return array Modified body classes.
     */
    public function add_layout_body_classes( array $classes ): array {
        $layout = get_theme_mod( 'strata_layout_type', 'full-width' );
        $classes[] = 'layout-' . sanitize_html_class( $layout );

        // Add sidebar classes
        if ( is_active_sidebar( 'primary-sidebar' ) ) {
            $classes[] = 'has-sidebar';
        }

        // Add custom post type classes
        if ( is_singular() ) {
            $post_type = get_post_type();
            $classes[] = 'single-' . sanitize_html_class( $post_type );
        }

        return $classes;
    }

    /**
     * Register layout settings in the customizer
     *
     * @param \WP_Customize_Manager $wp_customize Customizer manager.
     */
    public function register_layout_settings( $wp_customize ): void {
        // Add layout section
        $wp_customize->add_section( 'strata_layout_settings', [
            'title'    => __( 'Layout Settings', 'strata-advanced' ),
            'priority' => 30,
        ] );

        // Layout type setting
        $wp_customize->add_setting( 'strata_layout_type', [
            'default'           => 'full-width',
            'sanitize_callback' => 'sanitize_text_field',
        ] );

        $wp_customize->add_control( 'strata_layout_type', [
            'label'   => __( 'Default Layout', 'strata-advanced' ),
            'section' => 'strata_layout_settings',
            'type'    => 'select',
            'choices' => [
                'full-width' => __( 'Full Width', 'strata-advanced' ),
                'boxed'      => __( 'Boxed', 'strata-advanced' ),
                'sidebar'    => __( 'With Sidebar', 'strata-advanced' ),
            ],
        ] );

        // Container width setting
        $wp_customize->add_setting( 'strata_container_width', [
            'default'           => '1200',
            'sanitize_callback' => 'absint',
        ] );

        $wp_customize->add_control( 'strata_container_width', [
            'label'       => __( 'Container Max Width (px)', 'strata-advanced' ),
            'section'     => 'strata_layout_settings',
            'type'        => 'number',
            'input_attrs' => [
                'min'  => 960,
                'max'  => 1920,
                'step' => 20,
            ],
        ] );
    }

    /**
     * Get custom layout CSS based on theme settings
     *
     * @return string Custom CSS.
     */
    private function get_custom_layout_css(): string {
        $container_width = get_theme_mod( 'strata_container_width', 1200 );

        $css = sprintf(
            ':root { --container-max-width: %dpx; }',
            absint( $container_width )
        );

        return $css;
    }

    /**
     * Get portfolio grid HTML
     *
     * @param array $args Query arguments.
     * @return string Portfolio grid HTML.
     */
    public static function get_portfolio_grid( array $args = [] ): string {
        $defaults = [
            'post_type'      => 'portfolio',
            'posts_per_page' => 9,
            'orderby'        => 'date',
            'order'          => 'DESC',
        ];

        $args = wp_parse_args( $args, $defaults );
        $query = new \WP_Query( $args );

        if ( ! $query->have_posts() ) {
            return '';
        }

        ob_start();
        ?>
        <div class="portfolio-grid">
            <?php while ( $query->have_posts() ) : $query->the_post(); ?>
                <article id="post-<?php the_ID(); ?>" <?php post_class( 'portfolio-item' ); ?>>
                    <?php if ( has_post_thumbnail() ) : ?>
                        <div class="portfolio-thumbnail">
                            <a href="<?php the_permalink(); ?>">
                                <?php the_post_thumbnail( 'large' ); ?>
                            </a>
                        </div>
                    <?php endif; ?>

                    <div class="portfolio-content">
                        <h3 class="portfolio-title">
                            <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                        </h3>

                        <?php if ( has_excerpt() ) : ?>
                            <div class="portfolio-excerpt">
                                <?php the_excerpt(); ?>
                            </div>
                        <?php endif(); ?>

                        <div class="portfolio-meta">
                            <?php
                            $categories = get_the_terms( get_the_ID(), 'portfolio_category' );
                            if ( $categories && ! is_wp_error( $categories ) ) :
                                ?>
                                <span class="portfolio-categories">
                                    <?php
                                    $category_names = array_map( function( $cat ) {
                                        return $cat->name;
                                    }, $categories );
                                    echo esc_html( implode( ', ', $category_names ) );
                                    ?>
                                </span>
                            <?php endif; ?>
                        </div>
                    </div>
                </article>
            <?php endwhile; ?>
        </div>
        <?php
        wp_reset_postdata();

        return ob_get_clean();
    }

    /**
     * Get team members grid HTML
     *
     * @param array $args Query arguments.
     * @return string Team grid HTML.
     */
    public static function get_team_grid( array $args = [] ): string {
        $defaults = [
            'post_type'      => 'team',
            'posts_per_page' => -1,
            'orderby'        => 'menu_order',
            'order'          => 'ASC',
        ];

        $args = wp_parse_args( $args, $defaults );
        $query = new \WP_Query( $args );

        if ( ! $query->have_posts() ) {
            return '';
        }

        ob_start();
        ?>
        <div class="team-grid">
            <?php while ( $query->have_posts() ) : $query->the_post(); ?>
                <article id="post-<?php the_ID(); ?>" <?php post_class( 'team-member' ); ?>>
                    <?php if ( has_post_thumbnail() ) : ?>
                        <div class="team-photo">
                            <?php the_post_thumbnail( 'medium' ); ?>
                        </div>
                    <?php endif; ?>

                    <div class="team-info">
                        <h3 class="team-name"><?php the_title(); ?></h3>

                        <?php
                        $position = get_post_meta( get_the_ID(), '_team_position', true );
                        if ( $position ) :
                            ?>
                            <p class="team-position"><?php echo esc_html( $position ); ?></p>
                        <?php endif; ?>

                        <?php if ( has_excerpt() ) : ?>
                            <div class="team-bio">
                                <?php the_excerpt(); ?>
                            </div>
                        <?php endif; ?>
                    </div>
                </article>
            <?php endwhile; ?>
        </div>
        <?php
        wp_reset_postdata();

        return ob_get_clean();
    }
}
