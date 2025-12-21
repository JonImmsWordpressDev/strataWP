<?php
/**
 * Featured Products Block Render
 *
 * @package StrataStore
 * @var array    $attributes Block attributes.
 * @var string   $content    Block content.
 * @var WP_Block $block      Block instance.
 */

if ( ! class_exists( 'WooCommerce' ) ) {
    return;
}

$columns = $attributes['columns'] ?? 4;
$limit = $attributes['limit'] ?? 8;
$orderby = $attributes['orderBy'] ?? 'date';
$order = $attributes['order'] ?? 'DESC';

// Get featured products
$args = [
    'post_type'      => 'product',
    'posts_per_page' => $limit,
    'orderby'        => $orderby,
    'order'          => $order,
    'tax_query'      => [
        [
            'taxonomy' => 'product_visibility',
            'field'    => 'name',
            'terms'    => 'featured',
        ],
    ],
];

// Handle special orderby cases
if ( 'price' === $orderby ) {
    $args['meta_key'] = '_price';
    $args['orderby']  = 'meta_value_num';
} elseif ( 'popularity' === $orderby ) {
    $args['meta_key'] = 'total_sales';
    $args['orderby']  = 'meta_value_num';
} elseif ( 'rating' === $orderby ) {
    $args['meta_key'] = '_wc_average_rating';
    $args['orderby']  = 'meta_value_num';
}

$query = new WP_Query( $args );

if ( ! $query->have_posts() ) {
    return;
}

$wrapper_attributes = get_block_wrapper_attributes([
    'class' => 'strata-featured-products columns-' . esc_attr( $columns ),
]);
?>

<div <?php echo $wrapper_attributes; ?>>
    <div class="products">
        <?php while ( $query->have_posts() ) : $query->the_post(); ?>
            <?php
            global $product;

            if ( empty( $product ) || ! $product->is_visible() ) {
                continue;
            }
            ?>

            <div class="product-item">
                <a href="<?php the_permalink(); ?>" class="product-link">
                    <?php if ( has_post_thumbnail() ) : ?>
                        <div class="product-image">
                            <?php the_post_thumbnail( 'woocommerce_thumbnail' ); ?>

                            <?php if ( $product->is_on_sale() ) : ?>
                                <span class="sale-badge"><?php esc_html_e( 'Sale', 'strata-store' ); ?></span>
                            <?php endif; ?>
                        </div>
                    <?php endif; ?>

                    <div class="product-info">
                        <h3 class="product-title"><?php the_title(); ?></h3>

                        <?php if ( $rating_html = wc_get_rating_html( $product->get_average_rating() ) ) : ?>
                            <div class="product-rating">
                                <?php echo $rating_html; ?>
                            </div>
                        <?php endif; ?>

                        <div class="product-price">
                            <?php echo $product->get_price_html(); ?>
                        </div>
                    </div>
                </a>

                <div class="product-actions">
                    <?php woocommerce_template_loop_add_to_cart(); ?>
                </div>
            </div>
        <?php endwhile; ?>
    </div>
</div>

<?php
wp_reset_postdata();
