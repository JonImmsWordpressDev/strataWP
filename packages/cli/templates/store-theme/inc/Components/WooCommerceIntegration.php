<?php
/**
 * WooCommerce Integration Component
 *
 * Handles WooCommerce-specific functionality and customizations.
 *
 * @package StrataStore
 */

namespace StrataBasic\Components;

use StrataWP\ComponentInterface;

/**
 * WooCommerce Integration Manager
 */
class WooCommerceIntegration implements ComponentInterface {
    /**
     * {@inheritdoc}
     */
    public function get_slug(): string {
        return 'woocommerce-integration';
    }

    /**
     * {@inheritdoc}
     */
    public function initialize(): void {
        // Theme support hooks
        add_action( 'after_setup_theme', [ $this, 'add_woocommerce_support' ] );

        // Customization hooks
        add_filter( 'woocommerce_product_thumbnails_columns', [ $this, 'thumbnail_columns' ] );
        add_filter( 'woocommerce_product_related_products_args', [ $this, 'related_products_args' ] );

        // Product loop customization
        add_filter( 'loop_shop_columns', [ $this, 'loop_columns' ] );
        add_filter( 'loop_shop_per_page', [ $this, 'products_per_page' ] );

        // Cart customization
        add_action( 'woocommerce_before_cart', [ $this, 'cart_notice' ] );

        // Checkout customization
        add_filter( 'woocommerce_checkout_fields', [ $this, 'customize_checkout_fields' ] );

        // Enqueue WooCommerce styles
        add_action( 'wp_enqueue_scripts', [ $this, 'woocommerce_scripts' ], 20 );
    }

    /**
     * Add WooCommerce theme support
     */
    public function add_woocommerce_support(): void {
        add_theme_support( 'woocommerce', [
            'thumbnail_image_width' => 600,
            'single_image_width'    => 800,
            'product_grid'          => [
                'default_rows'    => 4,
                'min_rows'        => 2,
                'max_rows'        => 8,
                'default_columns' => 3,
                'min_columns'     => 2,
                'max_columns'     => 5,
            ],
        ] );

        // Product gallery features
        add_theme_support( 'wc-product-gallery-zoom' );
        add_theme_support( 'wc-product-gallery-lightbox' );
        add_theme_support( 'wc-product-gallery-slider' );
    }

    /**
     * Set thumbnail columns
     *
     * @return int Number of columns.
     */
    public function thumbnail_columns(): int {
        return 4;
    }

    /**
     * Modify related products arguments
     *
     * @param array $args Related products args.
     * @return array Modified args.
     */
    public function related_products_args( array $args ): array {
        $args['posts_per_page'] = 4;
        $args['columns']        = 4;
        return $args;
    }

    /**
     * Set product loop columns
     *
     * @return int Number of columns.
     */
    public function loop_columns(): int {
        return 3;
    }

    /**
     * Set products per page
     *
     * @return int Products per page.
     */
    public function products_per_page(): int {
        return 12;
    }

    /**
     * Display cart notice
     */
    public function cart_notice(): void {
        if ( is_cart() && WC()->cart->get_cart_contents_count() === 0 ) {
            return;
        }

        $free_shipping_threshold = 100; // Set your threshold
        $current_total = WC()->cart->get_subtotal();
        $remaining = $free_shipping_threshold - $current_total;

        if ( $remaining > 0 ) {
            wc_print_notice(
                sprintf(
                    /* translators: %s: Remaining amount for free shipping */
                    __( 'Add %s more to get FREE shipping!', 'strata-store' ),
                    wc_price( $remaining )
                ),
                'notice'
            );
        } else {
            wc_print_notice(
                __( 'You qualify for FREE shipping!', 'strata-store' ),
                'success'
            );
        }
    }

    /**
     * Customize checkout fields
     *
     * @param array $fields Checkout fields.
     * @return array Modified fields.
     */
    public function customize_checkout_fields( array $fields ): array {
        // Make phone optional
        $fields['billing']['billing_phone']['required'] = false;

        // Add placeholder text
        $fields['billing']['billing_email']['placeholder'] = __( 'you@example.com', 'strata-store' );

        // Reorder fields (optional)
        $fields['billing']['billing_email']['priority'] = 25;

        return $fields;
    }

    /**
     * Enqueue WooCommerce styles
     */
    public function woocommerce_scripts(): void {
        if ( ! class_exists( 'WooCommerce' ) ) {
            return;
        }

        // Add custom WooCommerce styles
        $custom_css = $this->get_custom_woocommerce_css();
        if ( ! empty( $custom_css ) ) {
            wp_add_inline_style( 'woocommerce-general', $custom_css );
        }
    }

    /**
     * Get custom WooCommerce CSS
     *
     * @return string Custom CSS.
     */
    private function get_custom_woocommerce_css(): string {
        return '
            /* Product Grid Enhancements */
            .woocommerce ul.products li.product {
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }

            .woocommerce ul.products li.product:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }

            /* Product Image Styling */
            .woocommerce ul.products li.product img {
                transition: opacity 0.3s ease;
            }

            .woocommerce ul.products li.product:hover img {
                opacity: 0.9;
            }

            /* Button Styling */
            .woocommerce a.button,
            .woocommerce button.button,
            .woocommerce input.button,
            .woocommerce #respond input#submit {
                border-radius: 4px;
                padding: 12px 24px;
                font-weight: 600;
                transition: all 0.3s ease;
            }

            .woocommerce a.button:hover,
            .woocommerce button.button:hover,
            .woocommerce input.button:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }

            /* Price Styling */
            .woocommerce div.product p.price,
            .woocommerce div.product span.price {
                font-size: 1.5em;
                font-weight: 700;
            }

            /* Sale Badge */
            .woocommerce span.onsale {
                min-height: 3em;
                min-width: 3em;
                padding: 0.5em;
                font-size: 1em;
                font-weight: 700;
                border-radius: 50%;
            }

            /* Cart Table */
            .woocommerce-cart table.cart td.actions .coupon {
                margin-bottom: 1em;
            }

            /* Checkout Form */
            .woocommerce form.checkout {
                padding: 2em;
                background: #f9f9f9;
                border-radius: 8px;
            }

            /* Mobile Optimizations */
            @media (max-width: 768px) {
                .woocommerce ul.products[class*="columns-"] li.product {
                    width: 100% !important;
                    margin: 0 0 2em !important;
                }
            }
        ';
    }

    /**
     * Get product count by category
     *
     * @param string $category_slug Category slug.
     * @return int Product count.
     */
    public static function get_category_product_count( string $category_slug ): int {
        $term = get_term_by( 'slug', $category_slug, 'product_cat' );
        return $term ? $term->count : 0;
    }

    /**
     * Check if product is on sale
     *
     * @param int $product_id Product ID.
     * @return bool Whether product is on sale.
     */
    public static function is_on_sale( int $product_id ): bool {
        $product = wc_get_product( $product_id );
        return $product ? $product->is_on_sale() : false;
    }

    /**
     * Get featured products
     *
     * @param int $limit Number of products to get.
     * @return array Product IDs.
     */
    public static function get_featured_products( int $limit = 8 ): array {
        $args = [
            'post_type'      => 'product',
            'posts_per_page' => $limit,
            'tax_query'      => [
                [
                    'taxonomy' => 'product_visibility',
                    'field'    => 'name',
                    'terms'    => 'featured',
                ],
            ],
        ];

        $query = new \WP_Query( $args );
        return wp_list_pluck( $query->posts, 'ID' );
    }
}
